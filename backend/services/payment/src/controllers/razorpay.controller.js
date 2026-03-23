/**
 * Razorpay controller — India + Bangladesh (INR)
 *
 * Routes:
 *   POST /api/payments/razorpay/initiate   — create Razorpay order (step 1)
 *   POST /api/payments/razorpay/verify     — verify client-side signature (step 2)
 *   POST /api/payments/razorpay/webhook    — server webhook (authoritative, HMAC-verified)
 *
 * 3DS: handled automatically by Razorpay for all card transactions.
 * EMI: returned in initiate response; frontend passes to Razorpay Checkout config.
 */

'use strict';

const repo     = require('../db/payment.repo');
const razorpay = require('../gateways/razorpay.gateway');
const audit    = require('../services/audit.service');

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

// ── POST /api/payments/razorpay/initiate ──────────────────────────────────────
/**
 * Creates a Razorpay Order.
 * Frontend uses the returned orderId + keyId to open Razorpay Checkout.
 *
 * Body: { bookingId, amount, currency? }
 * Response: { paymentId, orderId, keyId, amountPaise, currency, emiOptions }
 */
async function initiate(req, res, next) {
  try {
    const { bookingId, amount, currency = 'INR' } = req.body;

    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });
    if (!amount)    return res.status(400).json({ error: 'amount is required' });
    if (parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

    const payment = await repo.createPayment({
      bookingId, amount, currency, method: 'razorpay',
    });

    await audit.log({
      paymentId: payment.id, bookingId,
      event: 'initiate', gateway: 'razorpay',
      amount, currency, status: 'pending',
    });

    let result;
    try {
      result = await razorpay.createOrder({ bookingId, amount, currency });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status: 'failed', gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'razorpay', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    await repo.updatePayment(payment.id, {
      gateway_ref:     result.orderId,
      gateway_payload: result.raw,
      status:          'pending',
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'razorpay', amount, currency, status: 'pending',
      meta: { orderId: result.orderId },
    });

    return res.status(201).json({
      paymentId:   payment.id,
      orderId:     result.orderId,
      keyId:       result.keyId,
      amountPaise: result.amountPaise,
      currency:    result.currency,
      emiOptions:  result.emiOptions,
      message:     'Order created. Open Razorpay Checkout with orderId + keyId.',
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/payments/razorpay/verify ────────────────────────────────────────
/**
 * Verifies the client-side signature Razorpay Checkout returns after payment.
 * Call this immediately after the Razorpay modal closes with a success callback.
 *
 * Body: { orderId, paymentId, signature }
 * Response: { paymentId, status }
 */
async function verify(req, res, next) {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: 'orderId, paymentId, and signature are all required',
      });
    }

    // 1. Cryptographic signature check
    if (!razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      return res.status(400).json({
        error: 'INVALID_SIGNATURE',
        message: 'Payment signature verification failed.',
      });
    }

    // 2. Fetch authoritative status from Razorpay API
    let rzpPayment;
    try {
      rzpPayment = await razorpay.fetchPayment(paymentId);
    } catch (err) {
      return next(err);
    }

    const newStatus = razorpay.mapStatus(rzpPayment.status);

    // 3. Update DB record (gateway_ref = orderId set during initiate)
    const payment = await repo.findByGatewayRef(orderId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found for this order.' });
    }

    const paidAt = newStatus === 'completed' ? new Date() : null;
    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: { orderId, paymentId, rzpPayment },
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id, bookingId: payment.booking_id,
      event: 'verify', gateway: 'razorpay',
      amount: payment.amount, currency: 'INR', status: newStatus,
      meta: { orderId, paymentId, rzpStatus: rzpPayment.status },
    });

    if (newStatus === 'completed') {
      _pushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch(e => console.error('[razorpay-verify] push failed:', e));
    }

    return res.json({ paymentId: payment.id, status: newStatus });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/payments/razorpay/webhook ───────────────────────────────────────
/**
 * Server-to-server webhook from Razorpay.
 *
 * ⚠️  This route MUST receive the raw body (Buffer) — registered with
 *     express.raw() in payment.router.js before the JSON body-parser.
 *     req.rawBody is set by the rawBodyCapture middleware in the router.
 *
 * Events handled:
 *   payment.captured  → completed
 *   payment.failed    → failed
 *   order.paid        → completed
 *
 * Razorpay retries on non-2xx — always return 200 after logging.
 */
async function webhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      console.warn('[razorpay-webhook] missing X-Razorpay-Signature header');
      return res.status(400).json({ error: 'missing signature' });
    }

    // Use raw body captured by middleware (required for HMAC integrity)
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error('[razorpay-webhook] req.rawBody not set — check router middleware');
      return res.status(500).json({ error: 'raw body unavailable' });
    }

    if (!razorpay.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[razorpay-webhook] HMAC verification failed');
      return res.status(400).json({ error: 'invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Extract payment entity (structure differs by event type)
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity   = event.payload?.order?.entity;
    const entity        = paymentEntity ?? orderEntity;

    if (!entity) {
      return res.status(200).json({ received: true });
    }

    const rzpOrderId = paymentEntity?.order_id ?? orderEntity?.id;
    const rzpPayId   = paymentEntity?.id;
    const newStatus  = razorpay.mapStatus(paymentEntity?.status ?? 'captured');

    if (!rzpOrderId) {
      return res.status(200).json({ received: true });
    }

    const payment = await repo.findByGatewayRef(rzpOrderId);
    if (!payment) {
      console.warn('[razorpay-webhook] unknown order_id:', rzpOrderId);
      return res.status(200).json({ received: true });
    }

    // Idempotency — don't downgrade a completed payment
    if (payment.status === 'completed' && newStatus !== 'completed') {
      return res.status(200).json({ received: true, note: 'idempotent — already completed' });
    }

    const paidAt = newStatus === 'completed' ? new Date() : null;
    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: event,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id, bookingId: payment.booking_id,
      event: 'webhook_received', gateway: 'razorpay',
      amount: payment.amount, currency: 'INR', status: newStatus,
      meta: { eventType: event.event, orderId: rzpOrderId, paymentId: rzpPayId },
    });

    if (newStatus === 'completed') {
      _pushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch(e => console.error('[razorpay-webhook] push failed:', e));
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, verify, webhook };
