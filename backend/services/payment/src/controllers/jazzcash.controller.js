/**
 * JazzCash controller — Pakistan (PKR)
 *
 * Routes:
 *   POST /api/payments/jazzcash/initiate     — start mobile wallet payment
 *   GET  /api/payments/jazzcash/status/:ref  — poll for completion
 *   POST /api/payments/jazzcash/callback     — silent server-to-server webhook
 */

'use strict';

const repo     = require('../db/payment.repo');
const jazzcash = require('../gateways/jazzcash.gateway');
const audit    = require('../services/audit.service');
const { jazzcashInitiateSchema, validate } = require('../validators/payment.validator');

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

// ── POST /api/payments/jazzcash/initiate ──────────────────────────────────────
/**
 * Starts a JazzCash Mobile Wallet (MPAY) payment.
 * Customer receives OTP / push in their JazzCash app and confirms with PIN.
 *
 * Body: { bookingId, amount, mobileNumber, customerName?, description? }
 * Response: { paymentId, txnRefNo, status, responseMessage }
 */
async function initiate(req, res, next) {
  try {
    const { customerName, ...body } = req.body;
    body.mobileNumber = (body.mobileNumber ?? '').replace(/[-\s]/g, '');

    const { error, value } = validate(jazzcashInitiateSchema, body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map(d => d.message) });
    }

    const { bookingId, amount, mobileNumber, description } = value;
    const normalised = mobileNumber;
    const payment    = await repo.createPayment({ bookingId, amount, currency: 'PKR', method: 'jazzcash' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'jazzcash', amount, currency: 'PKR', status: 'pending',
      meta: { mobileNumber: normalised.slice(0, 6) + 'xxxxx' }, // mask digits
    });

    let result;
    try {
      result = await jazzcash.initiateMobileWalletPayment({
        bookingId, amount, mobileNumber: normalised,
        description: description || `Booking ${bookingId}`,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'jazzcash', amount, currency: 'PKR', status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    await repo.updatePayment(payment.id, {
      gateway_ref:     result.txnRefNo,
      gateway_payload: result.raw,
      status:          result.status,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'jazzcash', amount, currency: 'PKR', status: result.status,
      meta: { txnRefNo: result.txnRefNo, responseCode: result.responseCode },
    });

    return res.status(201).json({
      paymentId:       payment.id,
      txnRefNo:        result.txnRefNo,
      status:          result.status,
      responseCode:    result.responseCode,
      responseMessage: result.responseMessage,
      message:         result.status === 'pending'
        ? 'OTP sent to customer\'s JazzCash app. Poll /jazzcash/status/:ref for completion.'
        : result.responseMessage,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/payments/jazzcash/status/:ref ────────────────────────────────────
/**
 * Polls JazzCash for the current status of a transaction.
 * Frontend calls this every 5 seconds after initiation.
 *
 * Params: ref — pp_TxnRefNo from initiate response
 */
async function status(req, res, next) {
  try {
    const { ref } = req.params;
    if (!ref) return res.status(400).json({ error: 'ref param is required' });

    let result;
    try {
      result = await jazzcash.getTransactionStatus(ref);
    } catch (err) {
      const code = err.httpStatus ?? err.statusCode;
      if (code === 404) {
        return res.json({ txnRefNo: ref, status: 'pending', message: 'Transaction not found yet.' });
      }
      return next(err);
    }

    // Sync DB if status changed
    const payment = await repo.findByGatewayRef(ref);
    if (payment && payment.status !== result.status) {
      const paidAt = result.status === 'completed' ? new Date() : null;
      await repo.updatePayment(payment.id, {
        status:          result.status,
        gateway_payload: result.raw,
        ...(paidAt && { paid_at: paidAt }),
      });

      await audit.log({
        paymentId: payment.id, bookingId: payment.booking_id,
        event: 'status_poll_update', gateway: 'jazzcash',
        amount: payment.amount, currency: 'PKR', status: result.status,
        meta: { txnRefNo: ref, responseCode: result.responseCode },
      });

      if (result.status === 'completed') {
        _pushNotification({
          userId:   payment.user_id,
          trigger:  'booking_confirmed',
          vars:     { ref: String(payment.booking_id) },
          deepLink: `/trips/${payment.booking_id}`,
        }).catch(e => console.error('[jazzcash-status] push failed:', e));
      }
    }

    const { raw: _raw, ...publicResult } = result;
    return res.json(publicResult);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/payments/jazzcash/callback ──────────────────────────────────────
/**
 * Silent server-to-server callback from JazzCash.
 * JazzCash POSTs JSON body with pp_SecureHash for verification.
 * Always respond 200 — JazzCash retries on non-2xx.
 */
async function callback(req, res, next) {
  try {
    const body = req.body;

    // 1. Verify signature before trusting any field
    if (!jazzcash.verifyCallbackSignature(body)) {
      console.warn('[jazzcash-callback] invalid pp_SecureHash — rejecting');
      return res.status(200).json({ received: true }); // 200 to stop retries, log internally
    }

    const txnRefNo   = body.pp_TxnRefNo;
    const newStatus  = jazzcash.mapStatus(body.pp_ResponseCode);

    if (!txnRefNo) {
      console.warn('[jazzcash-callback] missing pp_TxnRefNo');
      return res.status(200).json({ received: true });
    }

    const payment = await repo.findByGatewayRef(txnRefNo);
    if (!payment) {
      console.warn('[jazzcash-callback] unknown pp_TxnRefNo:', txnRefNo);
      return res.status(200).json({ received: true });
    }

    const paidAt = newStatus === 'completed' ? new Date() : null;
    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: body,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id, bookingId: payment.booking_id,
      event: 'callback_received', gateway: 'jazzcash',
      amount: payment.amount, currency: 'PKR', status: newStatus,
      meta: { txnRefNo, responseCode: body.pp_ResponseCode, responseMessage: body.pp_ResponseMessage },
    });

    if (newStatus === 'completed') {
      _pushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch(e => console.error('[jazzcash-callback] push failed:', e));
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, status, callback };
