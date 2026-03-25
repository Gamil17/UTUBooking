/**
 * TWINT Controller — Switzerland (CHF)
 *
 * Routes (mounted at /api/payments/twint):
 *   POST /initiate         → create TWINT checkout, return QR + app-link
 *   GET  /status/:id       → poll payment status (frontend polling fallback)
 *   POST /webhook          → TWINT server-to-server notification
 */

const repo  = require('../db/payment.repo');
const twint = require('../gateways/twint.gateway');
const audit = require('../services/audit.service');
const { twintInitiateSchema, validate } = require('../validators/payment.validator');

const FRONTEND_URL        = process.env.FRONTEND_URL        ?? 'http://frontend:3000';
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
  }).catch((err) => console.error('[twint] push notification failed:', err));
}

// ─── POST /api/payments/twint/initiate ───────────────────────────────────────

async function initiate(req, res, next) {
  try {
    const { error, value } = validate(twintInitiateSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { bookingId, amount, currency, description } = value;

    const payment = await repo.createPayment({
      bookingId,
      amount,
      currency: 'CHF',
      method:   'twint',
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'twint_initiate',
      gateway: 'twint', amount, currency: 'CHF', status: 'pending', meta: {},
    });

    let checkout;
    try {
      checkout = await twint.createCheckout({ amount, bookingId, description });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status:          'failed',
        gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'twint_initiate_failed',
        gateway: 'twint', amount, currency: 'CHF', status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    await repo.updatePayment(payment.id, {
      gateway_ref:     checkout.checkoutId,
      gateway_payload: checkout,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'twint_initiate_success',
      gateway: 'twint', amount, currency: 'CHF', status: 'pending',
      meta: { checkoutId: checkout.checkoutId },
    });

    return res.status(201).json({
      paymentId:  payment.id,
      checkoutId: checkout.checkoutId,
      qrCodeUrl:  checkout.qrCodeUrl,   // embed as <img src={qrCodeUrl}> on desktop
      appLink:    checkout.appLink,      // twint://… for mobile deep-link
      expiresAt:  checkout.expiresAt,   // show countdown timer
      token:      checkout.token,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/payments/twint/status/:checkoutId ──────────────────────────────
// Frontend polls this after QR scan (fallback if webhook is slow).
// Rate-limit: call at most every 3 seconds.

async function status(req, res, next) {
  try {
    const { checkoutId } = req.params;
    if (!checkoutId) {
      return res.status(400).json({ error: 'checkoutId required' });
    }

    const payment = await repo.findByGatewayRef(checkoutId);
    if (!payment) {
      return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
    }

    // Check current DB status first (webhook may have already updated it)
    if (payment.status === 'completed') {
      return res.json({ status: 'completed', paymentId: payment.id });
    }

    // Poll TWINT API for fresh status
    const result = await twint.getCheckoutStatus(checkoutId);

    if (result.status !== 'pending') {
      await repo.updatePayment(payment.id, {
        status:          result.status,
        gateway_payload: result,
        ...(result.status === 'completed' ? { paid_at: new Date() } : {}),
      });

      await audit.log({
        paymentId: payment.id, bookingId: payment.booking_id,
        event:    `twint_status_poll:${result.rawStatus}`,
        gateway:   'twint', amount: payment.amount, currency: 'CHF',
        status:    result.status, meta: result,
      });
    }

    return res.json({ status: result.status, paymentId: payment.id });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/twint/webhook ────────────────────────────────────────
// TWINT server-to-server notification.
// Body is raw JSON — signature verified via X-TWINT-Signature header.
// Mounted with express.raw() in app.js to preserve raw bytes for HMAC check.

async function webhook(req, res, next) {
  try {
    const signature = req.headers['x-twint-signature'];
    const rawBody   = req.rawBody ?? req.body;

    if (!twint.verifyWebhookSignature(rawBody, signature)) {
      await audit.log({
        paymentId: null, bookingId: null,
        event: 'twint_webhook_invalid_signature',
        gateway: 'twint', amount: null, currency: 'CHF', status: null,
        meta: {},
      });
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    // Parse body if raw
    let notification;
    try {
      notification = typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'INVALID_BODY' });
    }

    const { checkoutId, status: twintStatus } = notification;
    const newStatus = twint.mapWebhookStatus(twintStatus);

    await audit.log({
      paymentId: null, bookingId: null,
      event:   `twint_webhook:${twintStatus}`,
      gateway: 'twint', amount: notification.paidAmount ?? null,
      currency: 'CHF', status: newStatus,
      meta: { checkoutId, twintStatus },
    });

    const payment = await repo.findByGatewayRef(checkoutId);
    if (!payment) {
      // Unknown checkout — acknowledge so TWINT doesn't retry
      console.warn('[twint-webhook] unknown checkoutId:', checkoutId);
      return res.json({ received: true });
    }

    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: notification,
      ...(newStatus === 'completed' ? { paid_at: new Date() } : {}),
    });

    await audit.log({
      paymentId: payment.id, bookingId: payment.booking_id,
      event:   'twint_webhook_processed',
      gateway: 'twint', amount: payment.amount, currency: 'CHF',
      status:  newStatus, meta: { checkoutId, twintStatus },
    });

    if (newStatus === 'completed') {
      triggerPushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      });
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, status, webhook };
