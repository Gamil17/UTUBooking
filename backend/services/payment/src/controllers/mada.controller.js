const repo    = require('../db/payment.repo');
const moyasar = require('../gateways/moyasar.gateway');
const audit   = require('../services/audit.service');
const { madaChargeSchema, validate } = require('../validators/payment.validator');

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

// ─── POST /api/payments/mada/charge ──────────────────────────────────────────

async function charge(req, res, next) {
  try {
    const { error, value } = validate(madaChargeSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { bookingId, amount, currency, description, source } = value;

    // 1. Create pending payment record
    const payment = await repo.createPayment({ bookingId, amount, currency, method: 'mada' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'moyasar', amount, currency, status: 'pending',
      meta: { sourceType: source.type },
    });

    // 2. Call Moyasar
    let result;
    try {
      result = await moyasar.charge({
        amount,
        currency,
        description: description || `UTUBooking — ${bookingId}`,
        source,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status:          'failed',
        gateway_payload: { error: err.response?.data || err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'charge_failed',
        gateway: 'moyasar', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    // 3. Map status and store gateway reference
    const internalStatus = moyasar.mapStatus(result.status);
    const paidAt         = internalStatus === 'completed' ? new Date() : null;

    await repo.updatePayment(payment.id, {
      gateway_ref:     result.id,
      status:          internalStatus,
      gateway_payload: result.raw,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'charge_response',
      gateway: 'moyasar', amount, currency, status: internalStatus,
      meta: { moyasarId: result.id, requires3ds: result.requires3ds },
    });

    // 4. Respond
    if (result.requires3ds) {
      // Client must redirect the customer to complete the 3DS challenge
      return res.status(202).json({
        paymentId:   payment.id,
        moyasarId:   result.id,
        status:      'pending_3ds',
        redirectUrl: result.redirectUrl,
        message:     'Redirect customer to redirectUrl to complete 3D Secure authentication.',
      });
    }

    return res.status(internalStatus === 'completed' ? 200 : 402).json({
      paymentId: payment.id,
      moyasarId: result.id,
      status:    internalStatus,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/mada/webhook ─────────────────────────────────────────
// Signature already verified by moyasarWebhookAuth middleware.
// req.webhookPayload is the parsed JSON body.

async function webhook(req, res, next) {
  try {
    const payload  = req.webhookPayload;
    const moyId    = payload.id;
    const moyStatus = payload.status;

    if (!moyId) {
      return res.status(200).json({ received: true });
    }

    const payment = await repo.findByGatewayRef(moyId);
    if (!payment) {
      console.warn('[moyasar-webhook] unknown gateway_ref:', moyId);
      return res.status(200).json({ received: true });
    }

    const newStatus = moyasar.mapStatus(moyStatus);
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
      gateway:   'moyasar',
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
      }).catch((err) => console.error('[moyasar-webhook] push failed:', err));
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { charge, webhook };
