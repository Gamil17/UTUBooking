const repo   = require('../db/payment.repo');
const stripe = require('../gateways/stripe.gateway');
const audit  = require('../services/audit.service');
const { stripeInitiateSchema, stripeElementSchema, validate } = require('../validators/payment.validator');
const FRONTEND_URL        = process.env.FRONTEND_URL ?? 'http://frontend:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

async function triggerPushNotification({ userId, trigger, vars, deepLink }) {
  if (!userId || !INTERNAL_API_SECRET) return;
  await fetch(`${FRONTEND_URL}/api/notifications/push`, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': INTERNAL_API_SECRET,
    },
    body:   JSON.stringify({ userId, trigger, vars, deepLink }),
    signal: AbortSignal.timeout(5000),
  });
}


// ─── POST /api/payments/stripe/initiate ──────────────────────────────────────

async function initiate(req, res, next) {
  try {
    const { error, value } = validate(stripeInitiateSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { bookingId, amount, currency, description } = value;

    // 1. Create pending payment record
    const payment = await repo.createPayment({
      bookingId,
      amount,
      currency,
      method: 'visa', // stored as 'visa' until webhook confirms actual card brand
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'stripe', amount, currency, status: 'pending', meta: {},
    });

    // 2. Create Stripe PaymentIntent
    let intent;
    try {
      intent = await stripe.createPaymentIntent({
        amount,
        currency,
        bookingId,
        description: description || `UTUBooking — ${bookingId}`,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status:          'failed',
        gateway_payload: { error: err.message, type: err.type },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'stripe', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    // 3. Store PaymentIntent ID as gateway_ref
    await repo.updatePayment(payment.id, {
      gateway_ref:     intent.paymentIntentId,
      gateway_payload: { id: intent.paymentIntentId, status: intent.status },
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'stripe', amount, currency, status: 'pending',
      meta: { paymentIntentId: intent.paymentIntentId },
    });

    // 4. Return clientSecret to frontend — stripe.js uses it to confirm + handle 3DS
    return res.status(201).json({
      paymentId:       payment.id,
      paymentIntentId: intent.paymentIntentId,
      clientSecret:    intent.clientSecret,
      status:          'pending',
      message:         'Use clientSecret with stripe.js confirmCardPayment() on the frontend. Stripe handles 3DS automatically.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/stripe/webhook ───────────────────────────────────────
// Signature + event construction already done by stripeWebhookAuth middleware.
// req.stripeEvent is the verified Stripe.Event object.

async function webhook(req, res, next) {
  try {
    const event = req.stripeEvent;

    await audit.log({
      paymentId: null, bookingId: null,
      event:     `stripe_event:${event.type}`,
      gateway:   'stripe',
      amount:    null, currency: 'SAR', status: null,
      meta:      { eventId: event.id, type: event.type },
    });

    // Only handle the event types that affect payment state
    const handled = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.processing',
    ];

    if (!handled.includes(event.type)) {
      return res.json({ received: true }); // acknowledge unhandled events
    }

    const intent     = event.data.object;
    const paymentRef = intent.id; // matches gateway_ref stored on initiate

    const payment = await repo.findByGatewayRef(paymentRef);
    if (!payment) {
      console.warn('[stripe-webhook] unknown PaymentIntent:', paymentRef);
      return res.json({ received: true });
    }

    // Derive status from event type (more reliable than intent.status field)
    const statusMap = {
      'payment_intent.succeeded':       'completed',
      'payment_intent.payment_failed':  'failed',
      'payment_intent.canceled':        'failed',
      'payment_intent.processing':      'pending',
    };
    const newStatus = statusMap[event.type] || 'pending';
    const paidAt    = newStatus === 'completed' ? new Date() : null;

    // Determine actual card brand from payment method details for records
    const cardBrand = intent.charges?.data?.[0]?.payment_method_details?.card?.brand;
    const BRAND_MAP = { visa: 'visa', mastercard: 'mastercard', amex: 'amex', discover: 'visa', diners: 'visa', jcb: 'visa', unionpay: 'visa', mada: 'visa' };
    const method    = BRAND_MAP[cardBrand] ?? 'visa';

    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: intent,
      ...(paidAt && { paid_at: paidAt }),
    });

    // Update method if we now know the actual card brand
    if (cardBrand) {
      // Direct query to update method (not in dynamic update builder)
      const { pool } = require('../db/pg');
      await pool.query(
        `UPDATE payments SET method = $1::payment_method WHERE id = $2`,
        [method, payment.id]
      ).catch(() => {}); // non-critical
    }

    await audit.log({
      paymentId: payment.id,
      bookingId: payment.booking_id,
      event:     'webhook_received',
      gateway:   'stripe',
      amount:    payment.amount,
      currency:  payment.currency,
      status:    newStatus,
      meta:      { eventType: event.type, intentId: intent.id, cardBrand },
    });


    if (newStatus === 'completed') {
      triggerPushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch((err) => console.error('[stripe-webhook] push failed:', err));
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/stripe/element/initiate ──────────────────────────────
// Payment Element flow for European markets.
// Returns clientSecret for Stripe.js `Elements` provider + `PaymentElement` mount.
// Frontend must call stripe.confirmPayment({ elements, confirmParams: { return_url } }).

async function initiateElement(req, res, next) {
  try {
    const { error, value } = validate(stripeElementSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { bookingId, amount, currency, description, countryCode } = value;

    const payment = await repo.createPayment({
      bookingId,
      amount,
      currency,
      method: 'stripe_element', // real method resolved from webhook (sepa_debit, ideal, etc.)
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'element_initiate',
      gateway: 'stripe', amount, currency, status: 'pending',
      meta: { countryCode },
    });

    let intent;
    try {
      intent = await stripe.createPaymentElementIntent({
        amount, currency, bookingId, description, countryCode,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status:          'failed',
        gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'element_initiate_failed',
        gateway: 'stripe', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    await repo.updatePayment(payment.id, {
      gateway_ref:     intent.paymentIntentId,
      gateway_payload: { id: intent.paymentIntentId, status: intent.status },
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'element_initiate_success',
      gateway: 'stripe', amount, currency, status: 'pending',
      meta: { paymentIntentId: intent.paymentIntentId, countryCode },
    });

    return res.status(201).json({
      paymentId:       payment.id,
      paymentIntentId: intent.paymentIntentId,
      clientSecret:    intent.clientSecret,
      status:          'pending',
      // Frontend: pass clientSecret to Stripe Elements provider, mount PaymentElement,
      // then call stripe.confirmPayment({ elements, confirmParams: { return_url } })
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, initiateElement, webhook };
