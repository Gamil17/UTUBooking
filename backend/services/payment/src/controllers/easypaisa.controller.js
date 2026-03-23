/**
 * Easypaisa controller — Pakistan (PKR)
 *
 * Routes:
 *   POST /api/payments/easypaisa/initiate     — start mobile account payment
 *   GET  /api/payments/easypaisa/status/:ref  — poll for completion
 *   POST /api/payments/easypaisa/callback     — server-to-server webhook
 */

'use strict';

const repo      = require('../db/payment.repo');
const easypaisa = require('../gateways/easypaisa.gateway');
const audit     = require('../services/audit.service');
const { easypaisaInitiateSchema, validate } = require('../validators/payment.validator');

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

// ── POST /api/payments/easypaisa/initiate ─────────────────────────────────────
/**
 * Starts an Easypaisa Mobile Account payment.
 * Uses the server-to-server (MA_Pay) flow — customer receives OTP on their
 * Telenor mobile and confirms payment.
 *
 * Body: { bookingId, amount, mobileNumber, description? }
 * Response: { paymentId, orderRef, status, otpRequired, responseMessage }
 */
async function initiate(req, res, next) {
  try {
    const body = { ...req.body };
    body.mobileNumber = (body.mobileNumber ?? '').replace(/[-\s]/g, '');

    const { error, value } = validate(easypaisaInitiateSchema, body);
    if (error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map(d => d.message) });
    }

    const { bookingId, amount, mobileNumber, description } = value;
    const normalised = mobileNumber;
    const payment    = await repo.createPayment({ bookingId, amount, currency: 'PKR', method: 'easypaisa' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'easypaisa', amount, currency: 'PKR', status: 'pending',
      meta: { mobileNumber: normalised.slice(0, 6) + 'xxxxx' },
    });

    let result;
    try {
      result = await easypaisa.initiateAccountPayment({
        bookingId, amount, mobileNumber: normalised,
        description: description || `Booking ${bookingId}`,
      });
    } catch (err) {
      await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
      await audit.log({
        paymentId: payment.id, bookingId, event: 'initiate_failed',
        gateway: 'easypaisa', amount, currency: 'PKR', status: 'failed',
        meta: { error: err.message },
      });
      return next(err);
    }

    await repo.updatePayment(payment.id, {
      gateway_ref:     result.orderRef,
      gateway_payload: result.raw,
      status:          result.status,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'easypaisa', amount, currency: 'PKR', status: result.status,
      meta: { orderRef: result.orderRef, responseCode: result.responseCode },
    });

    return res.status(201).json({
      paymentId:       payment.id,
      orderRef:        result.orderRef,
      status:          result.status,
      otpRequired:     result.otpRequired,
      responseCode:    result.responseCode,
      responseMessage: result.responseMessage,
      message:         result.otpRequired
        ? 'OTP sent to customer\'s Telenor number. Poll /easypaisa/status/:ref for completion.'
        : result.responseMessage,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/payments/easypaisa/status/:ref ───────────────────────────────────
/**
 * Polls Easypaisa for current transaction status.
 * Params: ref — orderRefNum from initiate response
 */
async function status(req, res, next) {
  try {
    const { ref } = req.params;
    if (!ref) return res.status(400).json({ error: 'ref param is required' });

    let result;
    try {
      result = await easypaisa.getTransactionStatus(ref);
    } catch (err) {
      const code = err.httpStatus ?? err.statusCode;
      if (code === 404) {
        return res.json({ orderRef: ref, status: 'pending', message: 'Transaction not found yet.' });
      }
      return next(err);
    }

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
        event: 'status_poll_update', gateway: 'easypaisa',
        amount: payment.amount, currency: 'PKR', status: result.status,
        meta: { orderRef: ref, responseCode: result.responseCode },
      });

      if (result.status === 'completed') {
        _pushNotification({
          userId:   payment.user_id,
          trigger:  'booking_confirmed',
          vars:     { ref: String(payment.booking_id) },
          deepLink: `/trips/${payment.booking_id}`,
        }).catch(e => console.error('[easypaisa-status] push failed:', e));
      }
    }

    const { raw: _raw, ...publicResult } = result;
    return res.json(publicResult);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/payments/easypaisa/callback ─────────────────────────────────────
/**
 * Silent server-to-server callback from Easypaisa.
 * Easypaisa POSTs form-encoded body with hash for verification.
 * Always respond 200 — Easypaisa retries on non-2xx.
 */
async function callback(req, res, next) {
  try {
    const body = req.body;

    if (!easypaisa.verifyCallbackHash(body)) {
      console.warn('[easypaisa-callback] invalid hash — rejecting');
      return res.status(200).json({ received: true });
    }

    const orderRef  = body.orderRefNumber ?? body.orderId ?? body.orderRefNum;
    const newStatus = easypaisa.mapStatus(body.responseCode);

    if (!orderRef) {
      console.warn('[easypaisa-callback] missing orderRef');
      return res.status(200).json({ received: true });
    }

    const payment = await repo.findByGatewayRef(orderRef);
    if (!payment) {
      console.warn('[easypaisa-callback] unknown orderRef:', orderRef);
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
      event: 'callback_received', gateway: 'easypaisa',
      amount: payment.amount, currency: 'PKR', status: newStatus,
      meta: { orderRef, responseCode: body.responseCode, responseDesc: body.responseDesc },
    });

    if (newStatus === 'completed') {
      _pushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch(e => console.error('[easypaisa-callback] push failed:', e));
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, status, callback };
