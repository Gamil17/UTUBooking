/**
 * Affirm BNPL Controller
 *
 * Routes (mounted in payment.router.js):
 *   POST /api/payments/affirm/initiate  → createCheckout → { checkoutToken, redirectUrl }
 *   POST /api/payments/affirm/confirm   → chargeCheckout → { status, chargeId }
 *   POST /api/payments/affirm/webhook   → Affirm event webhook (raw body)
 *
 * Flow:
 *   1. Frontend POSTs /affirm/initiate → gets { redirectUrl, checkoutToken }
 *   2. Frontend redirects to redirectUrl (Affirm checkout)
 *   3. Customer approves → Affirm GET-redirects to confirm_url with ?checkout_token=XXX
 *   4. Frontend POSTs /affirm/confirm with { checkoutToken }
 *   5. Backend calls chargeCheckout() → returns { status, chargeId }
 *   6. Affirm also fires charge.confirmed webhook (idempotent path)
 *
 * Minimum amount: USD 200 (configured in affirm.gateway.js RECOMMENDED_MIN_USD)
 */

'use strict';

const affirm = require('../gateways/affirm.gateway');
const repo   = require('../db/payment.repo');
const audit  = require('../services/audit.service');
const { validate, affirmInitiateSchema, affirmConfirmSchema } =
  require('../validators/payment.validator');

// ─── initiate ────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/affirm/initiate
 * Body: { bookingId, amountUSD, description?, confirmUrl?, cancelUrl?, customerEmail? }
 */
async function initiate(req, res, next) {
  const { error, value } = validate(affirmInitiateSchema, req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { bookingId, amountUSD, description, confirmUrl, cancelUrl, customerEmail } = value;

  // Enforce $200 minimum
  if (amountUSD < affirm.RECOMMENDED_MIN_USD) {
    return res.status(422).json({
      error:   'AMOUNT_TOO_LOW',
      message: `Affirm is only available for bookings of $${affirm.RECOMMENDED_MIN_USD} or more.`,
      minimum: affirm.RECOMMENDED_MIN_USD,
    });
  }

  const amountCents = Math.round(amountUSD * 100);

  let payment;
  try {
    payment = await repo.createPayment({
      bookingId,
      method:   'affirm',
      amount:   amountUSD,
      currency: 'USD',
    });
  } catch (err) {
    return next(err);
  }

  const baseUrl = process.env.FRONTEND_URL ?? 'https://www.utubooking.com';
  const defaultConfirmUrl = `${baseUrl}/booking/confirm?paymentId=${payment.id}&bookingId=${bookingId}`;
  const defaultCancelUrl  = `${baseUrl}/booking/cancel?paymentId=${payment.id}&bookingId=${bookingId}`;

  let result;
  try {
    result = await affirm.createCheckout({
      bookingId,
      amountCents,
      confirmUrl:    confirmUrl ?? defaultConfirmUrl,
      cancelUrl:     cancelUrl  ?? defaultCancelUrl,
      description,
      customerEmail,
    });
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
    return next(err);
  }

  await repo.updatePayment(payment.id, {
    gateway_ref:     result.checkoutToken,
    gateway_payload: { redirectUrl: result.redirectUrl },
  });

  await audit.log({
    paymentId: payment.id,
    bookingId,
    event:     'initiate_success',
    gateway:   'affirm',
    amount:    amountUSD,
    currency:  'USD',
    status:    'pending',
    meta:      { checkoutToken: result.checkoutToken },
  });

  return res.status(201).json({
    paymentId:     payment.id,
    checkoutToken: result.checkoutToken,
    redirectUrl:   result.redirectUrl,
    monthlyEstimate: affirm.estimateMonthlyPayment(amountUSD),
    status:        'pending',
    message:       'Redirect customer to redirectUrl; then POST /affirm/confirm with checkoutToken on return.',
  });
}

// ─── confirm ──────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/affirm/confirm
 * Body: { checkoutToken, paymentId? }
 *
 * Called after the customer returns from Affirm's approval page.
 * Charges the approved checkout.
 */
async function confirm(req, res, next) {
  const { error, value } = validate(affirmConfirmSchema, req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { checkoutToken, paymentId } = value;

  const payment = await repo.findByGatewayRef(checkoutToken).catch(() => null)
    ?? (paymentId ? await repo.findById(paymentId).catch(() => null) : null);

  if (!payment) {
    return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', checkoutToken });
  }

  if (payment.status === 'completed') {
    return res.json({ paymentId: payment.id, status: 'completed', message: 'Already confirmed.' });
  }

  let result;
  try {
    result = await affirm.chargeCheckout(checkoutToken);
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
    return next(err);
  }

  await repo.updatePayment(payment.id, {
    status:          result.status,
    gateway_payload: { chargeId: result.chargeId, amountCents: result.amountCents },
    ...(result.status === 'completed' ? { paid_at: new Date() } : {}),
  });

  await audit.log({
    paymentId: payment.id,
    bookingId: payment.booking_id,
    event:     'confirm_success',
    gateway:   'affirm',
    amount:    result.amountCents / 100,
    currency:  'USD',
    status:    result.status,
    meta:      { checkoutToken, chargeId: result.chargeId },
  });

  if (result.status === 'completed') {
    // Auto-capture after confirmation (travel = no delay needed)
    try {
      await affirm.captureCharge(result.chargeId);
    } catch (captureErr) {
      console.warn('[affirm] auto-capture failed — will retry via webhook:', captureErr.message);
    }
  }

  return res.json({
    paymentId:  payment.id,
    chargeId:   result.chargeId,
    status:     result.status,
  });
}

// ─── webhook ──────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/affirm/webhook
 * Raw body; X-Affirm-Signature: sha256=<hex>
 */
async function webhook(req, res, next) {
  const signature = req.headers['x-affirm-signature'];
  const valid     = affirm.verifyWebhookSignature(req.rawBody ?? req.body, signature);

  if (!valid) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }

  const event     = req.body;
  const eventType = event?.event_type;
  const charge    = event?.data ?? {};

  const newStatus = affirm.mapWebhookEventType(eventType);
  if (newStatus === null) {
    return res.status(200).json({ received: true, ignored: true });
  }

  // Affirm includes merchant_data / order_id which is our bookingId
  const checkoutToken = charge.checkout_token ?? charge.token ?? null;
  const chargeId      = charge.id ?? null;
  const amountCents   = charge.amount ?? 0;

  const payment = await repo.findByGatewayRef(checkoutToken ?? chargeId).catch(() => null);
  if (!payment) {
    return res.status(200).json({ received: true, ignored: true, reason: 'payment not found' });
  }

  if (payment.status === 'completed' && newStatus !== 'refunded') {
    return res.status(200).json({ received: true, idempotent: true });
  }

  await repo.updatePayment(payment.id, {
    status:          newStatus,
    gateway_payload: { chargeId, amountCents, eventType, raw: event },
    ...(newStatus === 'completed' ? { paid_at: new Date() } : {}),
  });

  await audit.log({
    paymentId: payment.id,
    bookingId: payment.booking_id,
    event:     `webhook_${newStatus}`,
    gateway:   'affirm',
    amount:    amountCents / 100,
    currency:  'USD',
    status:    newStatus,
    meta:      { chargeId, checkoutToken, eventType },
  });

  return res.status(200).json({ received: true });
}

module.exports = { initiate, confirm, webhook };
