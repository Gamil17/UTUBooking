/**
 * iyzico controller — Turkey (TRY)
 *
 * Routes:
 *   POST /api/payments/iyzico/initiate  — create checkout form session
 *   POST /api/payments/iyzico/callback  — called by iyzico after 3DS (browser redirect)
 */
const repo    = require('../db/payment.repo');
const iyzico  = require('../gateways/iyzico.gateway');
const audit   = require('../services/audit.service');

const FRONTEND_URL        = process.env.FRONTEND_URL        ?? 'http://frontend:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/** Fire-and-forget push notification */
async function triggerPushNotification({ userId, trigger, vars, deepLink }) {
  if (!userId || !INTERNAL_API_SECRET) return;
  await fetch(`${FRONTEND_URL}/api/notifications/push`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_API_SECRET },
    body:    JSON.stringify({ userId, trigger, vars, deepLink }),
    signal:  AbortSignal.timeout(5000),
  });
}

// ─── POST /api/payments/iyzico/initiate ──────────────────────────────────────

async function initiate(req, res, next) {
  try {
    const {
      bookingId, amount, currency = 'TRY',
      buyerEmail, buyerName, buyerIp,
    } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: ['bookingId and amount are required'] });
    }

    // 1. Create pending payment record
    const payment = await repo.createPayment({ bookingId, amount, currency, method: 'iyzico' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'iyzico', amount, currency, status: 'pending',
      meta: { buyerEmail },
    });

    // 2. Call iyzico API
    let iyzicoResult;
    try {
      iyzicoResult = await iyzico.initiatePayment({
        bookingId, amount, currency, buyerEmail, buyerName,
        buyerIp: buyerIp || req.ip,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status: 'failed', gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'iyzico', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    // 3. Store token as gateway_ref
    await repo.updatePayment(payment.id, {
      gateway_ref:     iyzicoResult.token,
      gateway_payload: iyzicoResult.raw,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'iyzico', amount, currency, status: 'pending',
      meta: { token: iyzicoResult.token },
    });

    return res.status(201).json({
      paymentId:           payment.id,
      token:               iyzicoResult.token,
      checkoutFormContent: iyzicoResult.checkoutFormContent,
      status:              'pending',
      message:             'Embed checkoutFormContent in page. iyzico handles 3DS automatically.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/iyzico/callback ──────────────────────────────────────
// iyzico POSTs URL-encoded body: { token, status } after 3DS
// req.body is already parsed (urlencoded middleware in app.js)

async function callback(req, res, next) {
  try {
    const token = req.body?.token;

    if (!token) {
      console.warn('[iyzico-callback] missing token in body');
      return res.redirect(`${FRONTEND_URL}/payment/failed?reason=missing_token`);
    }

    // Find payment by gateway_ref (token)
    const payment = await repo.findByGatewayRef(token);
    if (!payment) {
      console.warn('[iyzico-callback] unknown token:', token);
      return res.redirect(`${FRONTEND_URL}/payment/failed?reason=unknown_token`);
    }

    // Retrieve final status from iyzico API
    let result;
    try {
      result = await iyzico.retrievePaymentResult(token);
    } catch (err) {
      console.error('[iyzico-callback] retrievePaymentResult failed:', err.message);
      return res.redirect(`${FRONTEND_URL}/payment/failed?bookingId=${payment.booking_id}`);
    }

    const newStatus = iyzico.mapStatus(result.iyzicoStatus);
    const paidAt    = newStatus === 'completed' ? new Date() : null;

    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: result.raw,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id,
      bookingId: payment.booking_id,
      event:     'callback_received',
      gateway:   'iyzico',
      amount:    payment.amount,
      currency:  payment.currency,
      status:    newStatus,
      meta:      { iyzicoStatus: result.iyzicoStatus, token },
    });

    if (newStatus === 'completed') {
      triggerPushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch((err) => console.error('[iyzico-callback] push failed:', err));

      return res.redirect(`${FRONTEND_URL}/payment/success?bookingId=${payment.booking_id}`);
    }

    return res.redirect(`${FRONTEND_URL}/payment/failed?bookingId=${payment.booking_id}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, callback };
