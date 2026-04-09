/**
 * PayPal Orders API v2 Controller
 *
 * Routes (mounted in payment.router.js):
 *   POST /api/payments/paypal/initiate       → createOrder → { orderId, approveUrl }
 *   POST /api/payments/paypal/capture        → captureOrder → { status, captureId }
 *   POST /api/payments/paypal/webhook        → webhook (raw body, PayPal signature)
 *
 * Flow:
 *   1. Frontend POSTs /paypal/initiate → gets { orderId, approveUrl }
 *   2. Redirect customer to approveUrl (PayPal login + confirm)
 *   3. PayPal redirects to return_url with ?token=ORDERID
 *   4. Frontend POSTs /paypal/capture with { orderId }
 *   5. PayPal also fires PAYMENT.CAPTURE.COMPLETED webhook (idempotent path)
 *
 * Alternatively (PayPal JS SDK — no redirect):
 *   Use PayPal Smart Buttons on the frontend; they call capture server-side.
 *   In that case /paypal/capture is the sole completion endpoint.
 */

'use strict';

const paypal = require('../gateways/paypal.gateway');
const repo   = require('../db/payment.repo');
const audit  = require('../services/audit.service');

const { validate, paypalInitiateSchema, paypalCaptureSchema } =
  require('../validators/payment.validator');

const FRONTEND_URL        = process.env.FRONTEND_URL        ?? 'http://frontend:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

async function _pushNotification({ userId, trigger, vars, deepLink }) {
  if (!userId || !INTERNAL_API_SECRET) return;
  await fetch(`${FRONTEND_URL}/api/notifications/push`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_API_SECRET },
    body:    JSON.stringify({ userId, trigger, vars, deepLink }),
    signal:  AbortSignal.timeout(5_000),
  });
}

// ─── initiate ────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/paypal/initiate
 * Body: { bookingId, amount, currency, description?, returnUrl?, cancelUrl? }
 */
async function initiate(req, res, next) {
  const { error, value } = validate(paypalInitiateSchema, req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { bookingId, amount, currency, description, returnUrl, cancelUrl } = value;

  let payment;
  try {
    payment = await repo.createPayment({
      bookingId,
      method:   'paypal',
      amount:   parseFloat(amount),
      currency: currency.toUpperCase(),
    });
  } catch (err) {
    return next(err);
  }

  let result;
  try {
    result = await paypal.createOrder({
      bookingId,
      amount,
      currency,
      description,
      returnUrl,
      cancelUrl,
    });
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
    return next(err);
  }

  await repo.updatePayment(payment.id, {
    gateway_ref:     result.orderId,
    gateway_payload: { approveUrl: result.approveUrl, status: result.status },
  });

  await audit.log({
    paymentId: payment.id,
    bookingId,
    event:     'initiate_success',
    gateway:   'paypal',
    amount:    parseFloat(amount),
    currency,
    status:    'pending',
    meta:      { orderId: result.orderId, approveUrl: result.approveUrl },
  });

  return res.status(201).json({
    paymentId:  payment.id,
    orderId:    result.orderId,
    approveUrl: result.approveUrl,
    status:     'pending',
    message:    'Redirect customer to approveUrl, then POST /paypal/capture with the orderId.',
  });
}

// ─── capture ──────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/paypal/capture
 * Body: { orderId, paymentId }
 *
 * Called after the customer returns from PayPal's approval page.
 */
async function capture(req, res, next) {
  const { error, value } = validate(paypalCaptureSchema, req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { orderId, paymentId } = value;

  // Look up our payment record by the gateway reference (orderId)
  const payment = await repo.findByGatewayRef(orderId).catch(() => null)
    ?? (paymentId ? await repo.findById(paymentId).catch(() => null) : null);

  if (!payment) {
    return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', orderId });
  }

  // Idempotency — already captured
  if (payment.status === 'completed') {
    return res.json({ paymentId: payment.id, status: 'completed', message: 'Already captured.' });
  }

  let result;
  try {
    result = await paypal.captureOrder(orderId);
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
    return next(err);
  }

  await repo.updatePayment(payment.id, {
    status:          result.status,
    gateway_payload: { captureId: result.captureId, amount: result.amount, currency: result.currency },
    ...(result.status === 'completed' ? { paid_at: new Date() } : {}),
  });

  await audit.log({
    paymentId: payment.id,
    bookingId: payment.booking_id,
    event:     'capture_success',
    gateway:   'paypal',
    amount:    result.amount,
    currency:  result.currency,
    status:    result.status,
    meta:      { orderId, captureId: result.captureId },
  });

  if (result.status === 'completed') {
    _pushNotification({
      userId:   payment.user_id,
      trigger:  'booking_confirmed',
      vars:     { ref: String(payment.booking_id) },
      deepLink: `/trips/${payment.booking_id}`,
    }).catch((err) => console.error('[paypal-capture] push failed:', err));
  }

  return res.json({
    paymentId: payment.id,
    orderId,
    captureId: result.captureId,
    status:    result.status,
  });
}

// ─── webhook ──────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/paypal/webhook
 *
 * PayPal sends raw JSON body.
 * Verification uses PayPal's /v1/notifications/verify-webhook-signature endpoint.
 * Mounted with express.raw() + rawBodyCapture in payment.router.js.
 */
async function webhook(req, res, next) {
  // Verify PayPal webhook signature
  const valid = await paypal.verifyWebhookSignature({
    authAlgo:         req.headers['paypal-auth-algo'],
    certUrl:          req.headers['paypal-cert-url'],
    transmissionId:   req.headers['paypal-transmission-id'],
    transmissionSig:  req.headers['paypal-transmission-sig'],
    transmissionTime: req.headers['paypal-transmission-time'],
    webhookEvent:     req.body,
  });

  if (!valid) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }

  const event     = req.body;
  const eventType = event?.event_type;
  const resource  = event?.resource ?? {};

  // Map PayPal status to internal status
  const newStatus = paypal.mapWebhookStatus(eventType);
  if (newStatus === null) {
    return res.status(200).json({ received: true, ignored: true });
  }

  // Extract orderId and captureId from the webhook resource
  const orderId   = resource.supplementary_data?.related_ids?.order_id
    ?? resource.id
    ?? null;
  const captureId = resource.id ?? null;
  const amount    = parseFloat(resource.amount?.value ?? resource.seller_receivable_breakdown?.gross_amount?.value ?? 0);
  const currency  = resource.amount?.currency_code ?? 'USD';

  if (!orderId) {
    return res.status(200).json({ received: true, ignored: true, reason: 'no orderId in resource' });
  }

  const payment = await repo.findByGatewayRef(orderId).catch(() => null);
  if (!payment) {
    return res.status(200).json({ received: true, ignored: true, reason: 'payment not found' });
  }

  // Idempotency — don't regress a completed payment
  if (payment.status === 'completed' && newStatus !== 'refunded') {
    return res.status(200).json({ received: true, idempotent: true });
  }

  await repo.updatePayment(payment.id, {
    status:          newStatus,
    gateway_payload: { captureId, amount, currency, eventType, raw: event },
    ...(newStatus === 'completed' ? { paid_at: new Date() } : {}),
  });

  await audit.log({
    paymentId: payment.id,
    bookingId: payment.booking_id,
    event:     `webhook_${newStatus}`,
    gateway:   'paypal',
    amount,
    currency,
    status:    newStatus,
    meta:      { orderId, captureId, eventType },
  });

  if (newStatus === 'completed') {
    _pushNotification({
      userId:   payment.user_id,
      trigger:  'booking_confirmed',
      vars:     { ref: String(payment.booking_id) },
      deepLink: `/trips/${payment.booking_id}`,
    }).catch((err) => console.error('[paypal-webhook] push failed:', err));
  }

  return res.status(200).json({ received: true });
}

module.exports = { initiate, capture, webhook };
