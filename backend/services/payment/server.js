const app  = require('./app');

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  console.log(`[payment-service] running on port ${PORT}`);
  console.log(`[payment-service] POST /api/payments/initiate        — STC Pay`);
  console.log(`[payment-service] POST /api/payments/webhook         — STC Pay webhook`);
  console.log(`[payment-service] POST /api/payments/mada/charge     — Mada via Moyasar`);
  console.log(`[payment-service] POST /api/payments/mada/webhook    — Moyasar webhook`);
  console.log(`[payment-service] POST /api/payments/stripe/initiate — Visa/Mastercard`);
  console.log(`[payment-service] POST /api/payments/stripe/webhook  — Stripe webhook`);
  console.log(`[payment-service] GET  /api/payments/:bookingId      — payment status`);
});
