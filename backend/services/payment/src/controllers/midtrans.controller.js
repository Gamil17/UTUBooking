/**
 * Midtrans controller — Indonesia (IDR)
 *
 * Routes:
 *   POST /api/payments/midtrans/initiate           — create Snap transaction (popup/redirect)
 *   POST /api/payments/midtrans/charge             — direct charge for specific payment method
 *   GET  /api/payments/midtrans/status/:orderId    — poll transaction status
 *   POST /api/payments/midtrans/notification       — silent server-to-server webhook
 *
 * Supported direct payment types (charge endpoint):
 *   gopay        — GoPay deeplink URL + QR (redirect to Gojek app)
 *   shopeepay    — ShopeePay deeplink URL
 *   qris         — QRIS QR code (returned as base64 data URI + hosted URL)
 *   bank_transfer + bank=bca|bni|bri — Virtual Account number + expiry
 *   mandiri_va   — Mandiri eChannel billerCode + billKey + expiry
 *
 * Webhook verification:
 *   Midtrans sends signature_key in the JSON body (not a header).
 *   We verify: SHA512(order_id + status_code + gross_amount + serverKey)
 */

'use strict';

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

// ─── POST /api/payments/midtrans/initiate ─────────────────────────────────────
// Snap popup / redirect — client receives a token for Snap.js

async function initiate(req, res, next) {
  try {
    const {
      bookingId, amount, currency = 'IDR',
      customerName, customerEmail, customerPhone,
    } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: ['bookingId and amount are required'],
      });
    }

    const payment = await repo.createPayment({ bookingId, amount, currency, method: 'midtrans' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'midtrans', amount, currency, status: 'pending',
      meta: { customerEmail },
    });

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

// ─── POST /api/payments/midtrans/charge ───────────────────────────────────────
// Direct charge for a specific Indonesian payment method.

/**
 * Request body:
 *   bookingId:    string  — unique booking/order identifier
 *   amount:       number  — IDR amount (integers only)
 *   paymentType:  string  — 'gopay'|'shopeepay'|'qris'|'bank_transfer'|'mandiri_va'
 *   bank?:        string  — required for bank_transfer: 'bca'|'bni'|'bri'
 *   customerName?  customerEmail?  customerPhone?  gopayCallbackUrl?
 *
 * Response shapes by paymentType:
 *   gopay/shopeepay: { paymentId, orderId, paymentType, deeplinkUrl, qrUrl, status }
 *   qris:            { paymentId, orderId, paymentType, qrBase64, qrUrl, qrString, expiryTime, status }
 *   bank_transfer:   { paymentId, orderId, paymentType, bank, vaNumber, expiryTime, status }
 *   mandiri_va:      { paymentId, orderId, paymentType, bank:'mandiri', billerCode, billKey, expiryTime, status }
 */
async function charge(req, res, next) {
  try {
    const {
      bookingId, amount, paymentType, bank,
      customerName, customerEmail, customerPhone, gopayCallbackUrl,
    } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    const errors = [];
    if (!bookingId)   errors.push('bookingId is required');
    if (!amount)      errors.push('amount is required');
    if (!paymentType) errors.push('paymentType is required');
    if (!midtrans.DIRECT_PAYMENT_TYPES.includes(paymentType)) {
      errors.push(`paymentType must be one of: ${midtrans.DIRECT_PAYMENT_TYPES.join(', ')}`);
    }
    if (paymentType === 'bank_transfer' && !midtrans.BANK_TRANSFER_BANKS.includes(bank)) {
      errors.push(`bank must be one of: ${midtrans.BANK_TRANSFER_BANKS.join(', ')} for bank_transfer`);
    }
    if (errors.length) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors });
    }

    // ── Create pending payment record ────────────────────────────────────────
    const method  = paymentType === 'bank_transfer' ? `midtrans_va_${bank}` : `midtrans_${paymentType}`;
    const payment = await repo.createPayment({ bookingId, amount, currency: 'IDR', method });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'charge_initiate',
      gateway: 'midtrans', amount, currency: 'IDR', status: 'pending',
      meta: { paymentType, bank: bank || null },
    });

    // ── Call Core API ────────────────────────────────────────────────────────
    let chargeResult;
    try {
      chargeResult = await midtrans.createDirectCharge({
        bookingId, amount, paymentType, bank,
        customerName, customerEmail, customerPhone, gopayCallbackUrl,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, {
        status: 'failed', gateway_payload: { error: err.message },
      });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'charge_failed',
        gateway: 'midtrans', amount, currency: 'IDR', status: 'failed',
        meta: { paymentType, error: err.message },
      });
      return next(err);
    }

    // ── Store gateway ref (order_id = bookingId) ──────────────────────────────
    await repo.updatePayment(payment.id, {
      gateway_ref:     chargeResult.orderId,
      gateway_payload: chargeResult.raw,
      status:          chargeResult.status,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'charge_success',
      gateway: 'midtrans', amount, currency: 'IDR', status: chargeResult.status,
      meta: { paymentType, orderId: chargeResult.orderId },
    });

    // ── Build response (omit internal raw field) ─────────────────────────────
    const { raw: _raw, ...chargePublic } = chargeResult;

    return res.status(201).json({
      paymentId: payment.id,
      ...chargePublic,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/payments/midtrans/status/:orderId ───────────────────────────────
// Polling endpoint — frontend calls this after GoPay/VA/QRIS to check payment.

async function status(req, res, next) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId param is required' });
    }

    // ── Query Midtrans Core API for live status ────────────────────────────────
    let statusResult;
    try {
      statusResult = await midtrans.getTransactionStatus(orderId);
    } catch (err) {
      // 404 from Midtrans means order not found yet (charge still being processed)
      const code = err.httpStatusCode ?? err.statusCode;
      if (code === 404) {
        return res.json({ orderId, status: 'pending', message: 'Transaction not found yet.' });
      }
      return next(err);
    }

    // ── Sync payment record if status changed ─────────────────────────────────
    const payment = await repo.findByGatewayRef(orderId);
    if (payment && payment.status !== statusResult.status) {
      const paidAt = statusResult.status === 'completed' ? new Date() : null;
      await repo.updatePayment(payment.id, {
        status:          statusResult.status,
        gateway_payload: statusResult.raw,
        ...(paidAt && { paid_at: paidAt }),
      });

      await audit.log({
        paymentId: payment.id,
        bookingId: payment.booking_id,
        event:     'status_poll_update',
        gateway:   'midtrans',
        amount:    payment.amount,
        currency:  'IDR',
        status:    statusResult.status,
        meta:      { orderId, paymentType: statusResult.paymentType },
      });

      if (statusResult.status === 'completed') {
        triggerPushNotification({
          userId:   payment.user_id,
          trigger:  'booking_confirmed',
          vars:     { ref: String(payment.booking_id) },
          deepLink: `/trips/${payment.booking_id}`,
        }).catch((err) => console.error('[midtrans-status] push failed:', err));
      }
    }

    const { raw: _raw, ...publicStatus } = statusResult;
    return res.json(publicStatus);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/midtrans/notification ─────────────────────────────────
// Silent server-to-server webhook — Midtrans POSTs status changes here.

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
      return res.status(200).json({ received: true });
    }

    const payment = await repo.findByGatewayRef(orderId);
    if (!payment) {
      console.warn('[midtrans-notification] unknown order_id:', orderId);
      return res.status(200).json({ received: true });
    }

    // Midtrans fraud check: capture + challenge → deny
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

module.exports = { initiate, charge, status, notification };
