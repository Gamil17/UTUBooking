'use strict';

/**
 * Pix + Boleto Controller — Brazil (BRL)
 *
 * Routes (mounted at /api/payments in payment.router.js):
 *   POST /pix/initiate          → generate Pix QR code
 *   GET  /pix/status/:intentId  → poll Pix payment status
 *   POST /boleto/initiate       → generate Boleto slip
 *   POST /pix/webhook           → Stripe webhook (Pix + Boleto events)
 *
 * Pix is instant — frontend polls /status every 3s after showing QR code.
 * Boleto takes 1–3 business days — show countdown to expiry (3 days).
 */

const pix   = require('../gateways/pix.gateway');
const repo  = require('../db/payment.repo');
const audit = require('../services/audit.service');
const Joi   = require('joi');

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://utubooking.com';

// ── Validation ──────────────────────────────────────────────────────────────

const pixSchema = Joi.object({
  bookingId:     Joi.string().uuid({ version: 'uuidv4' }).required(),
  amountBRL:     Joi.number().positive().precision(2).required(),
  customerEmail: Joi.string().email().required(),
  customerName:  Joi.string().max(100).required(),
}).options({ stripUnknown: true });

const boletoSchema = Joi.object({
  bookingId:     Joi.string().uuid({ version: 'uuidv4' }).required(),
  amountBRL:     Joi.number().positive().precision(2).required(),
  customerEmail: Joi.string().email().required(),
  customerName:  Joi.string().max(100).required(),
  cpfOrCnpj:    Joi.string().replace(/\D/g, '').min(11).max(14).required(),
}).options({ stripUnknown: true });

// ── POST /pix/initiate ──────────────────────────────────────────────────────

async function inititatePix(req, res, next) {
  const { error, value } = pixSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { bookingId, amountBRL, customerEmail, customerName } = value;

  let payment;
  try {
    payment = await repo.createPayment({
      bookingId,
      method:   'pix',
      amount:   amountBRL,
      currency: 'BRL',
    });
  } catch (err) {
    return next(err);
  }

  let result;
  try {
    result = await pix.generatePixCode({ amountBRL, bookingId, customerEmail, customerName });
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
    return next(err);
  }

  await repo.updatePayment(payment.id, {
    gateway_ref:     result.paymentIntentId,
    gateway_payload: { expiresAt: result.expiresAt },
  });

  await audit.log({
    paymentId: payment.id,
    bookingId,
    event:    'initiate',
    gateway:  'pix',
    amount:    amountBRL,
    currency: 'BRL',
    status:   'pending',
    meta:     { expiresAt: result.expiresAt },
  });

  return res.json({
    ok:              true,
    paymentId:       payment.id,
    stripeIntentId:  result.paymentIntentId,
    qrCodeImageUrl:  result.qrCodeImageUrl,
    pixCopiaCola:    result.pixCopiaCola,   // text — user can copy/paste into bank app
    expiresAt:       result.expiresAt,
    status:          'pending',
  });
}

// ── GET /pix/status/:intentId ───────────────────────────────────────────────
// Frontend polls every 3 seconds — Pix is instant, usually settles within 10s

async function pixStatus(req, res, next) {
  const { intentId } = req.params;
  if (!intentId) {
    return res.status(400).json({ error: 'MISSING_INTENT_ID' });
  }

  try {
    const result = await pix.checkPixPayment(intentId);

    // Update DB if completed/failed
    if (result.status === 'completed' || result.status === 'failed') {
      const payment = await repo.findByGatewayRef(intentId);
      if (payment && (payment.status === 'pending')) {
        await repo.updatePayment(payment.id, {
          status:          result.status,
          gateway_payload: { verifiedAt: new Date().toISOString() },
          ...(result.status === 'completed' ? { paid_at: new Date() } : {}),
        });
        await audit.log({
          paymentId: payment.id,
          event:     `pix.${result.status}`,
          gateway:   'pix',
          status:    result.status,
          meta:      {},
        });
      }
    }

    return res.json({ status: result.status });
  } catch (err) {
    return next(err);
  }
}

// ── POST /boleto/initiate ────────────────────────────────────────────────────

async function initiateBoleto(req, res, next) {
  const { error, value } = boletoSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.details.map((d) => d.message) });
  }

  const { bookingId, amountBRL, customerEmail, customerName, cpfOrCnpj } = value;

  let payment;
  try {
    payment = await repo.createPayment({
      bookingId,
      method:   'boleto',
      amount:   amountBRL,
      currency: 'BRL',
    });
  } catch (err) {
    return next(err);
  }

  let result;
  try {
    result = await pix.generateBoleto({ amountBRL, bookingId, customerEmail, customerName, cpfOrCnpj });
  } catch (err) {
    await repo.updatePayment(payment.id, { status: 'failed', gateway_payload: { error: err.message } });
    return next(err);
  }

  await repo.updatePayment(payment.id, {
    gateway_ref:     result.paymentIntentId,
    gateway_payload: { boletoUrl: result.boletoUrl, expiresAt: result.expiresAt },
  });

  await audit.log({
    paymentId: payment.id,
    bookingId,
    event:    'initiate',
    gateway:  'boleto',
    amount:    amountBRL,
    currency: 'BRL',
    status:   'pending',
    meta:     { boletoUrl: result.boletoUrl, expiresAt: result.expiresAt },
  });

  return res.json({
    ok:             true,
    paymentId:      payment.id,
    stripeIntentId: result.paymentIntentId,
    boletoUrl:      result.boletoUrl,       // PDF download link
    expiresAt:      result.expiresAt,       // 3 days — show countdown in UI
    status:         'pending',
  });
}

// ── POST /pix/webhook ────────────────────────────────────────────────────────
// Shared Stripe webhook for Pix + Boleto events.
// Signature already verified by stripeWebhookAuth middleware before this runs.

async function pixWebhook(req, res, next) {
  try {
    const result = pix.handleStripeWebhook(req.body);
    if (!result.handled) {
      return res.status(200).send('OK'); // non-payment event — ignore
    }

    const payment = await repo.findByGatewayRef(result.paymentIntentId);
    if (payment && (payment.status === 'pending' || payment.status === 'redirected')) {
      await repo.updatePayment(payment.id, {
        status:          result.status,
        gateway_payload: { webhookEvent: req.body.type, webhookAt: new Date().toISOString() },
        ...(result.status === 'completed' ? { paid_at: new Date() } : {}),
      });
      await audit.log({
        paymentId: payment.id,
        event:     `pix.webhook.${result.status}`,
        gateway:   result.gateway,
        status:    result.status,
        meta:      { stripeEvent: req.body.type },
      });
    }

    return res.status(200).send('OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { inititatePix, pixStatus, initiateBoleto, pixWebhook };
