/**
 * Midtrans controller — Indonesia (IDR)
 *
 * Routes:
 *   POST /api/payments/midtrans/initiate      — create Snap transaction
 *   POST /api/payments/midtrans/notification  — silent server-to-server webhook
 *
 * Webhook verification:
 *   Midtrans sends signature_key in the JSON body (not a header).
 *   We verify: SHA512(order_id + status_code + gross_amount + serverKey)
 */
const repo      = require('../db/payment.repo');
const midtrans  = require('../gateways/midtrans.gateway');
const audit     = require('../services/audit.service');

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

// ─── POST /api/payments/midtrans/initiate ────────────────────────────────────

async function initiate(req, res, next) {
  try {
    const {
      bookingId, amount, currency = 'IDR',
      customerName, customerEmail, customerPhone,
    } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: ['bookingId and amount are required'] });
    }

    // 1. Create pending payment record
    const payment = await repo.createPayment({ bookingId, amount, currency, method: 'midtrans' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'midtrans', amount, currency, status: 'pending',
      meta: { customerEmail },
    });

    // 2. Call Midtrans Snap API
    let snapResult;
    try {
      snapResult = await midtrans.createTransaction({
        bookingId, amount, currency, customerName, customerEmail, customerPhone,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status: 'failed', gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'midtrans', amount, currency, status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    // 3. Store Snap token as gateway_ref
    await repo.updatePayment(payment.id, {
      gateway_ref:     snapResult.token,
      gateway_payload: snapResult.raw,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'midtrans', amount, currency, status: 'pending',
      meta: { token: snapResult.token },
    });

    return res.status(201).json({
      paymentId:   payment.id,
      token:       snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      status:      'pending',
      message:     'Use token with Snap.js or redirect to redirectUrl.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/midtrans/notification ─────────────────────────────────
// Midtrans sends JSON — express.json() has already parsed req.body
// Signature is in req.body.signature_key (not a request header)

async function notification(req, res, next) {
  try {
    const body = req.body;

    // 1. Verify body signature before trusting any field
    const sigValid = midtrans.verifyNotificationSignature(body);
    if (!sigValid) {
      console.warn('[midtrans-notification] invalid signature_key — rejecting');
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    const orderId           = body.order_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus       = body.fraud_status;

    if (!orderId) {
      console.warn('[midtrans-notification] missing order_id');
      return res.status(200).json({ received: true }); // 200 stops retries
    }

    const payment = await repo.findByGatewayRef(orderId);

    // If not found by gateway_ref, try booking_id match (pre-confirm case)
    if (!payment) {
      console.warn('[midtrans-notification] unknown order_id:', orderId);
      return res.status(200).json({ received: true });
    }

    // Midtrans fraud check: combine transaction_status + fraud_status
    let effectiveStatus = transactionStatus;
    if (transactionStatus === 'capture') {
      effectiveStatus = fraudStatus === 'accept' ? 'capture' : 'deny';
    }

    const newStatus = midtrans.mapStatus(effectiveStatus);
    const paidAt    = newStatus === 'completed' ? new Date() : null;

    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: body,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id,
      bookingId: payment.booking_id,
      event:     'notification_received',
      gateway:   'midtrans',
      amount:    payment.amount,
      currency:  payment.currency,
      status:    newStatus,
      meta:      { transactionStatus, fraudStatus, orderId },
    });

    if (newStatus === 'completed') {
      triggerPushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch((err) => console.error('[midtrans-notification] push failed:', err));
    }

    // Always 200 — Midtrans retries on non-2xx
    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, notification };
