'use strict';

/**
 * MercadoPago Controller — Latin America
 * Covers: AR, CO, CL, UY, MX, PE
 *
 * Routes (mounted at /api/payments in payment.router.js):
 *   POST /mercadopago/initiate     → create preference → return redirectUrl
 *   GET  /mercadopago/success      → customer return after approved payment
 *   GET  /mercadopago/failure      → customer return after failed payment
 *   GET  /mercadopago/pending      → customer return for async methods (Efecty, Rapipago)
 *   POST /mercadopago/webhook      → MercadoPago IPN notification
 */

const mp    = require('../gateways/mercadopago.gateway');
const repo  = require('../db/payment.repo');
const audit = require('../services/audit.service');
const Joi   = require('joi');

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://utubooking.com';
const API_BASE     = process.env.API_BASE_URL  ?? 'https://api.utubooking.com';

// ── Validation ──────────────────────────────────────────────────────────────

const initiateSchema = Joi.object({
  bookingId:     Joi.string().uuid({ version: 'uuidv4' }).required(),
  amount:        Joi.number().positive().required(),
  currency:      Joi.string().valid('ARS', 'COP', 'CLP', 'UYU', 'MXN', 'PEN', 'BRL').required(),
  customerEmail: Joi.string().email().required(),
  description:   Joi.string().max(256).optional(),
}).options({ stripUnknown: true });

// ── POST /mercadopago/initiate ──────────────────────────────────────────────

async function initiate(req, res, next) {
  const { error, value } = initiateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { bookingId, amount, currency, customerEmail, description } = value;

  let payment;
  try {
    payment = await repo.createPayment({
      booking_id: bookingId,
      method:     'mercadopago',
      amount,
      currency,
      status:     'pending',
    });
  } catch (err) {
    return next(err);
  }

  const successUrl      = `${FRONTEND_URL}/booking/confirmation?paymentId=${payment.id}&status=success`;
  const failureUrl      = `${FRONTEND_URL}/booking/error?paymentId=${payment.id}&code=MP_FAILED`;
  const pendingUrl      = `${FRONTEND_URL}/booking/pending?paymentId=${payment.id}`;
  const notificationsUrl = `${API_BASE}/api/payments/mercadopago/webhook`;

  let result;
  try {
    result = await mp.createPreference({
      amount,
      currency,
      bookingId,
      description:    description || 'UTUBooking — Hajj/Umrah Package',
      customerEmail,
      successUrl,
      failureUrl,
      pendingUrl,
      notificationsUrl,
    });
  } catch (err) {
    await repo.updatePaymentStatus(payment.id, 'failed', { error: err.message });
    return next(err);
  }

  await repo.updatePaymentStatus(payment.id, 'redirected', {
    mpPreferenceId: result.preferenceId,
    redirectUrl:    result.redirectUrl,
  });

  await audit.log({
    paymentId: payment.id,
    bookingId,
    event:    'initiate',
    gateway:  'mercadopago',
    amount,
    currency,
    status:   'redirected',
    meta:     { preferenceId: result.preferenceId },
  });

  return res.json({
    ok:           true,
    paymentId:    payment.id,
    preferenceId: result.preferenceId,
    redirectUrl:  result.redirectUrl,
  });
}

// ── GET /mercadopago/success ─────────────────────────────────────────────────
// MercadoPago redirects here after approved payment.
// Query params: collection_id, collection_status, external_reference, payment_id

async function success(req, res) {
  const { external_reference: bookingId, payment_id: mpPaymentId } = req.query;
  const payment = await repo.findPaymentByMetadata({ mpPreferenceId: req.query.preference_id });

  if (payment && payment.status !== 'completed') {
    await repo.updatePaymentStatus(payment.id, 'completed', {
      mpPaymentId: String(mpPaymentId),
      confirmedAt: new Date().toISOString(),
    });
  }

  return res.redirect(
    `${FRONTEND_URL}/booking/confirmation?paymentId=${payment?.id ?? ''}&bookingId=${bookingId ?? ''}`,
  );
}

// ── GET /mercadopago/failure ─────────────────────────────────────────────────

async function failure(req, res) {
  const payment = await repo.findPaymentByMetadata({ mpPreferenceId: req.query.preference_id });

  if (payment && payment.status === 'redirected') {
    await repo.updatePaymentStatus(payment.id, 'failed', { failedAt: new Date().toISOString() });
  }

  return res.redirect(
    `${FRONTEND_URL}/booking/error?code=MP_FAILED&paymentId=${payment?.id ?? ''}`,
  );
}

// ── GET /mercadopago/pending ─────────────────────────────────────────────────
// Async methods: Efecty, Rapipago, OXXO, etc. — payment not yet confirmed.

async function pending(req, res) {
  const payment = await repo.findPaymentByMetadata({ mpPreferenceId: req.query.preference_id });
  return res.redirect(
    `${FRONTEND_URL}/booking/pending?paymentId=${payment?.id ?? ''}`,
  );
}

// ── POST /mercadopago/webhook ────────────────────────────────────────────────
// MercadoPago IPN — re-fetch payment to verify (no HMAC on standard plan).

async function webhook(req, res, next) {
  try {
    const result = await mp.verifyWebhook(req.body);
    if (!result.valid) {
      return res.status(200).send('OK'); // unhandled topic — acknowledge
    }

    // Find our payment record by bookingId stored in external_reference
    const payment = result.bookingId
      ? await repo.findPaymentByBookingId(result.bookingId)
      : null;

    if (payment && (payment.status === 'pending' || payment.status === 'redirected')) {
      await repo.updatePaymentStatus(payment.id, result.status, {
        mpPaymentId: result.paymentId,
        webhookAt:   new Date().toISOString(),
      });
      await audit.log({
        paymentId: payment.id,
        event:     `mercadopago.webhook.${result.status}`,
        gateway:   'mercadopago',
        status:    result.status,
        meta:      { mpPaymentId: result.paymentId },
      });
    }

    return res.status(200).send('OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { initiate, success, failure, pending, webhook };
