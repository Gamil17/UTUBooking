/**
 * Stripe Payment Gateway adapter — Visa / Mastercard (international users)
 *
 * Docs: https://stripe.com/docs/api
 * 3D Secure flow:
 *   1. Server: createPaymentIntent → returns { paymentIntentId, clientSecret }
 *   2. Frontend: stripe.js confirmCardPayment(clientSecret, { payment_method })
 *      Stripe.js handles the 3DS redirect/popup automatically
 *   3. Stripe fires webhook: payment_intent.succeeded | payment_intent.payment_failed
 *
 * Webhook signature MUST be verified with constructWebhookEvent() on the raw body.
 */
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  timeout:    20000,
  maxNetworkRetries: 2,
});

// ─── createPaymentIntent ──────────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent for a booking.
 * Returns { paymentIntentId, clientSecret } — pass clientSecret to the frontend.
 *
 * @param {object} params
 * @param {number} params.amount      — SAR amount (e.g. 1250.00)
 * @param {string} params.currency    — ISO currency code (default: 'SAR')
 * @param {string} params.bookingId   — stored in Stripe metadata for reconciliation
 * @param {string} params.description — shown on Stripe dashboard
 *
 * @returns {{ paymentIntentId, clientSecret, status, raw }}
 */
async function createPaymentIntent({ amount, currency = 'SAR', bookingId, description }) {
  const intent = await stripe.paymentIntents.create({
    amount:               Math.round(parseFloat(amount) * 100), // smallest currency unit
    currency:             currency.toLowerCase(),
    payment_method_types: ['card'],
    capture_method:       'automatic',
    description,
    metadata:             { bookingId },
    // 3DS handled automatically by Stripe when using PaymentIntents + stripe.js
  });

  return {
    paymentIntentId: intent.id,
    clientSecret:    intent.client_secret,
    status:          intent.status,
    raw:             intent,
  };
}

// ─── Webhook event construction ───────────────────────────────────────────────

/**
 * Verifies the Stripe-Signature header and constructs the event object.
 * Must be called with the RAW request body (Buffer), not JSON-parsed.
 * Throws if the signature is invalid.
 *
 * @param {Buffer} rawBody   — express.raw() body
 * @param {string} signature — value of `Stripe-Signature` header
 * @returns {Stripe.Event}
 */
function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStatus(stripeStatus) {
  const map = {
    succeeded:           'completed',
    payment_failed:      'failed',
    requires_action:     'pending',  // awaiting 3DS
    requires_payment_method: 'failed',
    canceled:            'failed',
    processing:          'pending',
  };
  return map[stripeStatus] || 'pending';
}

module.exports = { createPaymentIntent, constructWebhookEvent, mapStatus };
