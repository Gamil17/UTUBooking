const express       = require('express');
const { Router }    = require('express');
const { getGateway, getAvailableGateways, getGatewayConfig } = require('../services/gatewayRouter');
const stcpayCtrl    = require('../controllers/stcpay.controller');
const madaCtrl      = require('../controllers/mada.controller');
const stripeCtrl    = require('../controllers/stripe.controller');
const iyzicoCtrl    = require('../controllers/iyzico.controller');
const midtransCtrl  = require('../controllers/midtrans.controller');
const ipay88Ctrl    = require('../controllers/ipay88.controller');
const jazzcashCtrl  = require('../controllers/jazzcash.controller');
const easypaisaCtrl = require('../controllers/easypaisa.controller');
const razorpayCtrl  = require('../controllers/razorpay.controller');
const twintCtrl     = require('../controllers/twint.controller');
const paypalCtrl    = require('../controllers/paypal.controller');
const affirmCtrl    = require('../controllers/affirm.controller');
const interacCtrl      = require('../controllers/interac.controller');
const pixCtrl          = require('../controllers/pix.controller');
const mercadopagoCtrl  = require('../controllers/mercadopago.controller');
const {
  stcpayWebhookAuth,
  moyasarWebhookAuth,
  stripeWebhookAuth,
} = require('../middleware/webhookAuth');
const repo = require('../db/payment.repo');

// Captures raw Buffer body and attaches as req.rawBody — required for
// Razorpay HMAC webhook verification (signature is over the raw bytes)
function rawBodyCapture(req, _res, next) {
  req.rawBody = req.body; // req.body is a Buffer when express.raw() precedes this
  try { req.body = JSON.parse(req.rawBody.toString()); } catch { /* not JSON */ }
  next();
}

const router = Router();

// ─── STC Pay (Saudi Arabia — SAR) ────────────────────────────────────────────
router.post('/initiate',              stcpayCtrl.initiate);
router.post('/webhook',               stcpayWebhookAuth, stcpayCtrl.webhook);

// ─── Mada (Moyasar — Saudi Arabia) ───────────────────────────────────────────
router.post('/mada/charge',           madaCtrl.charge);
router.post('/mada/webhook',          moyasarWebhookAuth, madaCtrl.webhook);

// ─── Stripe (Visa / Mastercard — international legacy) ───────────────────────
router.post('/stripe/initiate',              stripeCtrl.initiate);
router.post('/stripe/webhook',               stripeWebhookAuth, stripeCtrl.webhook);

// ─── Stripe Payment Element (EU — automatic_payment_methods) ─────────────────
// Supports: SEPA Direct Debit, iDEAL, Bancontact, BLIK, Klarna, Apple Pay,
//           Google Pay, and any method enabled in Stripe Dashboard.
// Frontend: POST → { clientSecret } → mount <PaymentElement> → stripe.confirmPayment()
router.post('/stripe/element/initiate',      stripeCtrl.initiateElement);

// ─── iyzico (Turkey — TRY) ───────────────────────────────────────────────────
// callback is form-encoded from browser; no header-based auth — verified via iyzico API
router.post('/iyzico/initiate',       iyzicoCtrl.initiate);
router.post('/iyzico/callback',       iyzicoCtrl.callback);

// ─── Midtrans Snap (Indonesia — IDR) ─────────────────────────────────────────
// notification body contains signature_key — verified inside controller
router.post('/midtrans/initiate',       midtransCtrl.initiate);
router.post('/midtrans/charge',         midtransCtrl.charge);
router.get('/midtrans/status/:orderId', midtransCtrl.status);
router.post('/midtrans/notification',   midtransCtrl.notification);

// ─── iPay88 (Malaysia — MYR) ─────────────────────────────────────────────────
// response is form-encoded; Signature field in body — verified inside controller
router.post('/ipay88/initiate',       ipay88Ctrl.initiate);
router.post('/ipay88/response',       ipay88Ctrl.response);

// ─── JazzCash (Pakistan — PKR, primary) ──────────────────────────────────────
// pp_SecureHash in JSON body verified inside controller (HMAC-SHA256)
router.post('/jazzcash/initiate',          jazzcashCtrl.initiate);
router.get('/jazzcash/status/:ref',        jazzcashCtrl.status);
router.post('/jazzcash/callback',          jazzcashCtrl.callback);

// ─── Easypaisa (Pakistan — PKR, secondary) ───────────────────────────────────
// encryptedHashRequest in body verified inside controller (SHA256)
router.post('/easypaisa/initiate',         easypaisaCtrl.initiate);
router.get('/easypaisa/status/:ref',       easypaisaCtrl.status);
router.post('/easypaisa/callback',         easypaisaCtrl.callback);

// ─── Razorpay (India + Bangladesh — INR) ─────────────────────────────────────
// Webhook uses express.raw() + rawBodyCapture for HMAC-SHA256 over raw bytes.
// initiate + verify use standard JSON body (already parsed by app-level middleware).
router.post('/razorpay/initiate',
  razorpayCtrl.initiate);
router.post('/razorpay/verify',
  razorpayCtrl.verify);
router.post('/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  rawBodyCapture,
  razorpayCtrl.webhook);

// ─── TWINT (Switzerland — CHF) ───────────────────────────────────────────────
// Webhook uses raw body (HMAC-SHA256 via X-TWINT-Signature).
// initiate + status use standard JSON body.
// rawBodyCapture is re-used from the Razorpay handler above.
router.post('/twint/initiate',             twintCtrl.initiate);
router.get('/twint/status/:checkoutId',    twintCtrl.status);
router.post('/twint/webhook',
  express.raw({ type: 'application/json', limit: '64kb' }),
  rawBodyCapture,
  twintCtrl.webhook);

// ─── PayPal (USA + global fallback — USD) ────────────────────────────────────
// Webhook uses raw body for PayPal's own signature verification endpoint.
// initiate + capture use standard JSON body.
router.post('/paypal/initiate',            paypalCtrl.initiate);
router.post('/paypal/capture',             paypalCtrl.capture);
router.post('/paypal/webhook',
  express.raw({ type: 'application/json', limit: '64kb' }),
  rawBodyCapture,
  paypalCtrl.webhook);

// ─── Affirm BNPL (USA — USD, bookings > $200) ────────────────────────────────
// Webhook uses raw body for HMAC-SHA256 over X-Affirm-Signature header.
// initiate + confirm use standard JSON body.
router.post('/affirm/initiate',            affirmCtrl.initiate);
router.post('/affirm/confirm',             affirmCtrl.confirm);
router.post('/affirm/webhook',
  express.raw({ type: 'application/json', limit: '64kb' }),
  rawBodyCapture,
  affirmCtrl.webhook);

// ─── Interac Online (Canada — CAD, via Bambora/Worldline) ────────────────────
// Webhook is form-urlencoded POST from Bambora (no HMAC on standard plans).
// Verify authenticity by re-fetching the transaction from Bambora API.
// returnFromBank is a GET redirect — customer lands here from Interac bank portal.
router.post('/interac/initiate',           interacCtrl.initiate);
router.get('/interac/return',              interacCtrl.returnFromBank);
router.post('/interac/callback',
  express.urlencoded({ extended: false }),
  interacCtrl.webhook);

// ─── Pix (Brazil — BRL, primary) ─────────────────────────────────────────────
// Pix is instant — frontend polls /status every 3s after showing QR code.
// Shared Stripe webhook handles both Pix + Boleto (same Stripe account).
router.post('/pix/initiate',             pixCtrl.inititatePix);
router.get('/pix/status/:intentId',      pixCtrl.pixStatus);
router.post('/pix/webhook',
  express.raw({ type: 'application/json', limit: '64kb' }),
  rawBodyCapture,
  pixCtrl.pixWebhook);

// ─── Boleto Bancário (Brazil — BRL, fallback for unbanked) ───────────────────
// Boleto expires in 3 days. Frontend shows countdown timer.
// Stripe webhook (above) handles Boleto events — no separate webhook route.
router.post('/boleto/initiate',          pixCtrl.initiateBoleto);

// ─── MercadoPago (LATAM — AR/CO/CL/UY/MX/PE) ─────────────────────────────────
// Redirect-based Checkout Pro. Covers local methods per country.
// No HMAC webhook signature — verify by re-fetching payment from MP API.
router.post('/mercadopago/initiate',     mercadopagoCtrl.initiate);
router.get('/mercadopago/success',       mercadopagoCtrl.success);
router.get('/mercadopago/failure',       mercadopagoCtrl.failure);
router.get('/mercadopago/pending',       mercadopagoCtrl.pending);
router.post('/mercadopago/webhook',
  express.urlencoded({ extended: false }),
  mercadopagoCtrl.webhook);

// ─── Gateway discovery ────────────────────────────────────────────────────────
// GET /api/payments/available-gateways?countryCode=TR
router.get('/available-gateways', (req, res) => {
  const { countryCode } = req.query;
  if (!countryCode) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: ['countryCode is required'] });
  }

  const primary    = getGateway(countryCode);
  const gateways   = getAvailableGateways(countryCode);
  const config     = getGatewayConfig(primary) ?? {};

  return res.json({
    countryCode:    countryCode.toUpperCase(),
    primaryGateway: primary,
    allGateways:    gateways,
    fee:            config.fee ?? null,
    minAmount:      config.minAmount ?? null,
    maxAmount:      config.maxAmount ?? null,
    currency:       config.currency ?? 'USD',
  });
});

// ─── Status lookup ────────────────────────────────────────────────────────────
router.get('/:bookingId', async (req, res, next) => {
  try {
    const payments = await repo.findByBookingId(req.params.bookingId);
    return res.json({ bookingId: req.params.bookingId, payments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
