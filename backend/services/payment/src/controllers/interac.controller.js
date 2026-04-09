'use strict';

/**
 * Interac e-Transfer / Interac Online Controller
 *
 * Routes (mounted in payment.router.js at /interac):
 *   POST /api/payments/interac/initiate  → get redirect URL
 *   GET  /api/payments/interac/return    → customer return from bank portal
 *   POST /api/payments/interac/callback  → Bambora server-side webhook
 *
 * Flow:
 *   1. POST /initiate  → { redirectUrl }
 *   2. Frontend redirects user to redirectUrl (Interac bank portal)
 *   3. Bank redirects user to /return?trnId=&trnApproved=1&...
 *   4. Controller verifies with Bambora API; redirects to frontend success/fail
 *   5. Bambora also POSTs /callback (idempotent reconciliation path)
 */

const interac = require('../gateways/interac.gateway');
const repo    = require('../db/payment.repo');
const audit   = require('../services/audit.service');
const Joi     = require('joi');

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://utubooking.com';

// ── Validation ─────────────────────────────────────────────────────────────────

const initiateSchema = Joi.object({
  bookingId:     Joi.string().uuid({ version: 'uuidv4' }).required(),
  amountCAD:     Joi.number().positive().precision(2).required(),
  customerEmail: Joi.string().email().required(),
  customerName:  Joi.string().max(100).required(),
}).options({ stripUnknown: true });

// ── Handlers ───────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/interac/initiate
 * Body: { bookingId, amountCAD, customerEmail, customerName }
 */
async function initiate(req, res, next) {
  const { error, value } = initiateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { bookingId, amountCAD, customerEmail, customerName } = value;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? '0.0.0.0';

  let payment;
  try {
    payment = await repo.createPayment({
      bookingId,
      method:   'interac',
      amount:   amountCAD,
      currency: 'CAD',
    });
  } catch (err) {
    return next(err);
  }

  const orderId     = `UTU-${payment.id.slice(0, 8).toUpperCase()}`;
  const approvedUrl = `${FRONTEND_URL}/api/payments/interac/return?paymentDbId=${payment.id}&approved=1`;
  const declinedUrl = `${FRONTEND_URL}/api/payments/interac/return?paymentDbId=${payment.id}&approved=0`;

  let result;
  try {
    result = await interac.initiateInteracPayment({
      amountCAD,
      orderId,
      customerEmail,
      customerName,
      approvedUrl,
      declinedUrl,
    });
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { initiateError: err.message } });
    return next(err);
  }

  // Store Bambora payment ID as gateway_ref so we can look it up later
  await repo.updatePayment(payment.id, {
    status:          'redirected',
    gateway_ref:     String(result.paymentId),
    gateway_payload: { redirectUrl: result.redirectUrl },
  });

  return res.json({
    ok:          true,
    paymentId:   payment.id,
    bamboraId:   result.paymentId,
    redirectUrl: result.redirectUrl,
  });
}

/**
 * GET /api/payments/interac/return
 * Query: paymentDbId, approved (0|1), trnId (Bambora ID), trnApproved (0|1)
 * This is the customer-facing redirect from the Interac bank portal.
 * Verifies with Bambora API, updates DB, redirects frontend.
 */
async function returnFromBank(req, res, next) {
  const { paymentDbId, trnId, trnApproved } = req.query;

  if (!paymentDbId) {
    return res.redirect(`${FRONTEND_URL}/booking/error?code=MISSING_PAYMENT_ID`);
  }

  try {
    const existingPayment = await repo.findById(paymentDbId);
    const bamboraId  = trnId ?? existingPayment?.gateway_ref;
    const approved   = trnApproved === '1' || req.query.approved === '1';

    let newStatus = approved ? 'completed' : 'failed';

    // Re-confirm with Bambora API if we have a transaction ID
    if (bamboraId) {
      const verification = await interac.verifyPayment(String(bamboraId));
      newStatus = verification.status;
    }

    await repo.updatePayment(paymentDbId, {
      status:          newStatus,
      gateway_payload: { trnId: bamboraId, verifiedAt: new Date().toISOString() },
      ...(newStatus === 'completed' ? { paid_at: new Date() } : {}),
    });
    await audit.log({ event: 'interac.return', paymentId: paymentDbId, status: newStatus });

    if (newStatus === 'completed') {
      return res.redirect(`${FRONTEND_URL}/booking/confirmation?paymentId=${paymentDbId}`);
    }
    return res.redirect(`${FRONTEND_URL}/booking/error?code=INTERAC_DECLINED&paymentId=${paymentDbId}`);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/payments/interac/callback
 * Bambora server-side webhook notification (form-encoded or JSON).
 * Idempotent — safe to process even if returnFromBank already ran.
 */
async function webhook(req, res, next) {
  // Bambora can send form-urlencoded; express.urlencoded or raw body needed
  const body = typeof req.body === 'string'
    ? Object.fromEntries(new URLSearchParams(req.body))
    : req.body;

  try {
    const result = await interac.handleWebhook(body);
    if (!result.valid) {
      return res.status(400).json({ error: 'INVALID_WEBHOOK', message: 'Missing trnId' });
    }

    // Look up our internal payment record by Bambora ID stored in gateway_ref
    const payment = await repo.findByGatewayRef(String(result.paymentId));
    if (payment) {
      // Only update if still pending (idempotent guard)
      if (payment.status === 'pending' || payment.status === 'redirected') {
        await repo.updatePayment(payment.id, {
          status:          result.status,
          gateway_payload: { webhookAt: new Date().toISOString() },
          ...(result.status === 'completed' ? { paid_at: new Date() } : {}),
        });
        await audit.log({ event: 'interac.webhook', paymentId: payment.id, status: result.status });
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { initiate, returnFromBank, webhook };
