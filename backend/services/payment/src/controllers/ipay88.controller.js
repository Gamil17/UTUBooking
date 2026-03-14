/**
 * iPay88 controller — Malaysia (MYR)
 *
 * Routes:
 *   POST /api/payments/ipay88/initiate  — build payment form params
 *   POST /api/payments/ipay88/response  — silent BackendURL + browser ResponseURL handler
 *
 * Signature verification:
 *   iPay88 puts Signature in the POST body (URL-encoded form data).
 *   We re-derive SHA256(merchantKey + merchantCode + refNo + amount_no_dot + currency).
 */
const repo    = require('../db/payment.repo');
const ipay88  = require('../gateways/ipay88.gateway');
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

// ─── POST /api/payments/ipay88/initiate ──────────────────────────────────────

async function initiate(req, res, next) {
  try {
    const {
      bookingId, amount, currency = 'MYR',
      customerName, customerEmail, customerPhone,
      remark, paymentId,
    } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: ['bookingId and amount are required'] });
    }

    // 1. Create pending payment record
    const payment = await repo.createPayment({ bookingId, amount, currency, method: 'ipay88' });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate',
      gateway: 'ipay88', amount, currency, status: 'pending',
      meta: { customerEmail, paymentId },
    });

    // 2. Build iPay88 form params (synchronous — no API call at initiation)
    const result = ipay88.initiatePayment({
      bookingId, amount, currency,
      customerName, customerEmail, customerPhone,
      remark, paymentId,
    });

    // 3. Store signature as gateway_ref for later lookup
    await repo.updatePayment(payment.id, {
      gateway_ref:     bookingId, // RefNo — used as gateway_ref for callback lookup
      gateway_payload: result.raw,
    });

    await audit.log({
      paymentId: payment.id, bookingId, event: 'initiate_success',
      gateway: 'ipay88', amount, currency, status: 'pending',
      meta: { paymentUrl: result.paymentUrl },
    });

    return res.status(201).json({
      paymentId:  payment.id,
      paymentUrl: result.paymentUrl,
      formParams: result.formParams,
      status:     'pending',
      message:    'POST formParams to paymentUrl. iPay88 handles the payment page.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/payments/ipay88/response ──────────────────────────────────────
// Handles BOTH BackendURL (silent server-to-server) and ResponseURL (browser redirect)
// Body is URL-encoded form data — req.body already parsed by urlencoded middleware in app.js
// Signature field is in the body itself.

async function response(req, res, next) {
  try {
    const body = req.body || {};
    const { RefNo, Status, Signature: receivedSig } = body;

    if (!RefNo) {
      console.warn('[ipay88-response] missing RefNo in body');
      return res.status(200).send('RECEIVEOK'); // ACK to stop retries
    }

    // 1. Verify signature before trusting any field
    const sigValid = ipay88.verifyResponseSignature(body);
    if (!sigValid) {
      console.warn('[ipay88-response] invalid Signature for RefNo:', RefNo);
      // Still return 200 for browser redirect; log for investigation
      return res.status(200).send('RECEIVEOK');
    }

    // 2. Find payment by booking_id (RefNo = bookingId)
    const payment = await repo.findByGatewayRef(RefNo);
    if (!payment) {
      console.warn('[ipay88-response] unknown RefNo:', RefNo);
      return res.status(200).send('RECEIVEOK');
    }

    const newStatus = ipay88.mapStatus(Status);
    const paidAt    = newStatus === 'completed' ? new Date() : null;

    await repo.updatePayment(payment.id, {
      status:          newStatus,
      gateway_payload: body,
      ...(paidAt && { paid_at: paidAt }),
    });

    await audit.log({
      paymentId: payment.id,
      bookingId: payment.booking_id,
      event:     'response_received',
      gateway:   'ipay88',
      amount:    payment.amount,
      currency:  payment.currency,
      status:    newStatus,
      meta:      { Status, RefNo, signature: receivedSig },
    });

    if (newStatus === 'completed') {
      triggerPushNotification({
        userId:   payment.user_id,
        trigger:  'booking_confirmed',
        vars:     { ref: String(payment.booking_id) },
        deepLink: `/trips/${payment.booking_id}`,
      }).catch((err) => console.error('[ipay88-response] push failed:', err));
    }

    // iPay88 BackendURL expects the literal string "RECEIVEOK" on success.
    // For browser ResponseURL it just needs any 2xx response (we redirect).
    const isBackend = req.headers['user-agent']?.toLowerCase().includes('ipay88')
      || !req.headers['accept']?.includes('text/html');

    if (isBackend) {
      return res.status(200).send('RECEIVEOK');
    }

    // Browser redirect
    if (newStatus === 'completed') {
      return res.redirect(`${FRONTEND_URL}/payment/success?bookingId=${payment.booking_id}`);
    }
    return res.redirect(`${FRONTEND_URL}/payment/failed?bookingId=${payment.booking_id}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, response };
