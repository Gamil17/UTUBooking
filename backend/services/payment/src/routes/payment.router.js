const { Router }   = require('express');
const stcpayCtrl   = require('../controllers/stcpay.controller');
const madaCtrl     = require('../controllers/mada.controller');
const stripeCtrl   = require('../controllers/stripe.controller');
const iyzicoCtrl   = require('../controllers/iyzico.controller');
const midtransCtrl = require('../controllers/midtrans.controller');
const ipay88Ctrl   = require('../controllers/ipay88.controller');
const {
  stcpayWebhookAuth,
  moyasarWebhookAuth,
  stripeWebhookAuth,
} = require('../middleware/webhookAuth');
const repo = require('../db/payment.repo');

const router = Router();

// ─── STC Pay (Saudi Arabia — SAR) ────────────────────────────────────────────
router.post('/initiate',              stcpayCtrl.initiate);
router.post('/webhook',               stcpayWebhookAuth, stcpayCtrl.webhook);

// ─── Mada (Moyasar — Saudi Arabia) ───────────────────────────────────────────
router.post('/mada/charge',           madaCtrl.charge);
router.post('/mada/webhook',          moyasarWebhookAuth, madaCtrl.webhook);

// ─── Stripe (Visa / Mastercard — international) ───────────────────────────────
router.post('/stripe/initiate',       stripeCtrl.initiate);
router.post('/stripe/webhook',        stripeWebhookAuth, stripeCtrl.webhook);

// ─── iyzico (Turkey — TRY) ───────────────────────────────────────────────────
// callback is form-encoded from browser; no header-based auth — verified via iyzico API
router.post('/iyzico/initiate',       iyzicoCtrl.initiate);
router.post('/iyzico/callback',       iyzicoCtrl.callback);

// ─── Midtrans Snap (Indonesia — IDR) ─────────────────────────────────────────
// notification body contains signature_key — verified inside controller
router.post('/midtrans/initiate',     midtransCtrl.initiate);
router.post('/midtrans/notification', midtransCtrl.notification);

// ─── iPay88 (Malaysia — MYR) ─────────────────────────────────────────────────
// response is form-encoded; Signature field in body — verified inside controller
router.post('/ipay88/initiate',       ipay88Ctrl.initiate);
router.post('/ipay88/response',       ipay88Ctrl.response);

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
