const repo    = require('../db/payment.repo');
const stcpay  = require('../gateways/stcpay.gateway');
const audit   = require('../services/audit.service');
const { stcpayInitiateSchema, validate } = require('../validators/payment.validator');

const FRONTEND_URL       = process.env.FRONTEND_URL ?? 'http://frontend:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/** Fire-and-forget: send push notification via frontend API */
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

// ─── POST /api/payments/initiate ─────────────────────────────────────────────

async function initiate(req, res, next) {
  try {
    const { error, value } = validate(stcpayInitiateSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { bookingId, amount, currency, successUrl, failureUrl } = value;

    // 1. Create pending payment record in DB
    const payment = await repo.createPayment({ bookingId, amount, currency, method: 'stcpay' });

    await audit.log({
      paymentId: payment.id,
      bookingId,
      event:     'initiate',
      gateway:   'stcpay',
      amount,
      currency,
      status:    'pending',
      meta:      { orderId: bookingId },
    });

    // 2. Call STC Pay API
    let stcResult;
    try {
      stcResult = await stcpay.initiatePayment({ bookingId, amount, currency, successUrl, failureUrl });
    } catch (err) {
      // Mark payment as failed and propagate
      await repo.updatePayment(payment.id, {
        status:         'failed',
        gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'stcpay', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    // 3. Store gateway reference
    await repo.updatePayment(payment.id, {
      gateway_ref:     stcResult.stcPayRef,
      gateway_payload: stcResult.raw,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'stcpay', amount, currency, status: 'pending',
      meta: { stcPayRef: stcResult.stcPayRef },
    });

    return res.status(201).json({
      paymentId:  payment.id,
      stcPayRef:  stcResult.stcPayRef,
      paymentUrl: stcResult.paymentUrl,
      status:     'pending',
      message:    'Payment session created. Direct the customer to complete payment in the STC Pay app.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Signature already verified by stcpayWebhookAuth middleware.
// req.webhookPayload is the parsed JSON body.

async function webhook(req, res, next) {
  try {
    const payload = req.webhookPayload;

    // Extract STC Pay reference — adjust field name after reviewing actual spec
    const stcPayRef     = payload.STCPayPmtRef || payload.stcPayRef;
    const stcPayStatus  = payload.PaymentStatus || payload.paymentStatus;

    if (!stcPayRef) {
      console.warn('[stcpay-webhook] missing STCPayPmtRef in payload');
      return res.status(200).json({ received: true }); // 200 to stop retries
    }

    const payment = await repo.findByGatewayRef(stcPayRef);
    if (!payment) {
      console.warn('[stcpay-webhook] unknown gateway_ref:', stcPayRef);
      return res.status(200).json({ received: true });
    }

    const newStatus = stcpay.mapStatus(stcPayStatus);
    const paidAt    = newStatus === 'completed' ? new Date() : null;

    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: payload,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id,
      bookingId: payment.booking_id,
      event:     'webhook_received',
      gateway:   'stcpay',
      amount:    payment.amount,
      currency:  payment.currency,
      status:    newStatus,
      meta:      payload,
    });

    if (newStatus === 'completed') {
      triggerPushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch((err) => console.error('[stcpay-webhook] push failed:', err));
    }

    // Always respond 200 quickly — STC Pay may retry on non-2xx
    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, webhook };
