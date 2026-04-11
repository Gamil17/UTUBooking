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
 * Creates a Stripe PaymentIntent (card-only legacy flow).
 * Used by existing GCC/MENA markets where card is the only method.
 *
 * @param {object} params
 * @param {number} params.amount      — amount in currency units (e.g. 1250.00 SAR)
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
  }, { idempotencyKey: `pi-${bookingId}` });

  return {
    paymentIntentId: intent.id,
    clientSecret:    intent.client_secret,
    status:          intent.status,
    raw:             intent,
  };
}

// ─── createPaymentElementIntent ───────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent for the Stripe Payment Element (EU flow).
 *
 * Key difference from createPaymentIntent():
 *   - Uses `automatic_payment_methods: { enabled: true }` instead of
 *     `payment_method_types: ['card']`.
 *   - Stripe automatically surfaces the right local methods based on
 *     the currency and the customer's browser locale:
 *       EUR + NL  → iDEAL, SEPA Debit
 *       EUR + BE  → Bancontact, SEPA
 *       GBP       → Klarna, Apple Pay, Google Pay
 *       PLN       → BLIK, card
 *       CHF       → TWINT (if enabled in Dashboard), card
 *
 * Frontend flow:
 *   1. Call this endpoint → receive clientSecret
 *   2. Create Stripe.js `Elements` with clientSecret + appearance
 *   3. Mount `PaymentElement` (auto UI)
 *   4. Call `stripe.confirmPayment({ elements, confirmParams: { return_url } })`
 *   5. Stripe handles redirect (iDEAL, Bancontact, Sofort) or in-page (card, BLIK)
 *   6. On return_url load, call stripe.retrievePaymentIntent(clientSecret) to confirm
 *   7. Webhook fires `payment_intent.succeeded` as normal
 *
 * Dashboard prerequisites — enable these in Stripe Dashboard → Settings → Payment Methods:
 *   SEPA Direct Debit · iDEAL · Bancontact · Klarna · BLIK
 *   Apple Pay · Google Pay (ensure GBP + EUR wallets added)
 *   [Giropay: discontinued June 2024 — do not enable]
 *   [Sofort: Stripe deprecated — replaced by Klarna bank-pay]
 *
 * @param {object} params
 * @param {number} params.amount      — amount in currency minor units (pence, cents, etc.)
 *                                      or decimal (gateway converts)
 * @param {string} params.currency    — ISO currency code (EUR, GBP, PLN, CHF, etc.)
 * @param {string} params.bookingId
 * @param {string} params.description
 * @param {string} [params.countryCode] — optional, stored in metadata for analytics
 *
 * @returns {{ paymentIntentId, clientSecret, status, raw }}
 */
async function createPaymentElementIntent({
  amount,
  currency = 'EUR',
  bookingId,
  description,
  countryCode,
}) {
  const intent = await stripe.paymentIntents.create({
    amount:                   Math.round(parseFloat(amount) * 100),
    currency:                 currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    capture_method:           'automatic',
    description,
    metadata:                 { bookingId, countryCode: countryCode ?? '' },
  }, { idempotencyKey: `pe-${bookingId}` });

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

// ─── createRefund ─────────────────────────────────────────────────────────────

/**
 * Issues a full or partial refund against a Stripe PaymentIntent.
 *
 * @param {string} paymentIntentId — the gateway_ref stored on the payment record
 * @param {number|null} amount     — refund amount in currency units (null = full refund)
 * @param {string} currency        — ISO currency code (used to convert to smallest unit)
 * @param {'requested_by_customer'|'fraudulent'|'duplicate'} reason
 * @returns {{ id, status, amount, currency }}
 */
async function createRefund(paymentIntentId, amount, currency = 'SAR', reason = 'requested_by_customer') {
  const params = {
    payment_intent: paymentIntentId,
    reason,
  };
  if (amount != null) {
    params.amount = Math.round(parseFloat(amount) * 100); // smallest unit
  }
  const refund = await stripe.refunds.create(params);
  return {
    id:       refund.id,
    status:   refund.status,
    amount:   refund.amount / 100,
    currency: refund.currency.toUpperCase(),
  };
}

module.exports = { createPaymentIntent, createPaymentElementIntent, constructWebhookEvent, mapStatus, createRefund };
