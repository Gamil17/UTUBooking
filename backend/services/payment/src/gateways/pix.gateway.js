'use strict';

/**
 * Pix + Boleto Bancário Gateway — Brazil (BRL) via Stripe Brazil
 *
 * Stripe natively supports both Pix and Boleto for Brazilian users.
 * No separate npm package needed — uses the existing Stripe SDK.
 *
 * Pix flow:
 *   1. Server creates PaymentIntent with payment_method_types: ['pix']
 *   2. Stripe returns QR code image URL + Pix Copia e Cola string
 *   3. Frontend displays QR code — user scans with any Brazilian bank app
 *   4. Pix is instant — Stripe fires payment_intent.succeeded within seconds
 *   5. No redirect needed — poll or wait for webhook
 *
 * Boleto flow:
 *   1. Server creates PaymentIntent with payment_method_types: ['boleto']
 *   2. Stripe returns hosted voucher URL (PDF boleto slip)
 *   3. User prints/downloads slip, pays at bank/lottery/ATM within 3 days
 *   4. Stripe fires webhook when payment confirmed (1–3 business days)
 *
 * Env vars:
 *   STRIPE_SECRET_KEY — same key used for card payments; enable Pix/Boleto in Stripe Dashboard
 *   STRIPE_BRAZIL_ACCOUNT — optional connected account ID for Brazil entity
 *
 * Stripe Dashboard setup:
 *   Settings → Payment methods → Brazil → enable Pix + Boleto Bancário
 *   Pix requires BRL currency. Boleto requires customer name + email + CPF/CNPJ.
 */

require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion:        '2023-10-16',
  timeout:           20000,
  maxNetworkRetries: 2,
});

// PIX expires: 1 hour (3600s) — Banco Central do Brasil minimum is 30min
const PIX_EXPIRY_SECONDS = 3600;

/**
 * Generate a Pix PaymentIntent and return QR code data.
 *
 * @param {object} opts
 * @param {number} opts.amountBRL      — amount in BRL (e.g. 1250.00)
 * @param {string} opts.bookingId      — internal booking ID for metadata
 * @param {string} opts.customerEmail  — required by Stripe for Pix
 * @param {string} opts.customerName   — required by Stripe for Pix
 *
 * @returns {{ paymentIntentId, qrCodeImageUrl, pixCopiaCola, expiresAt, status }}
 */
async function generatePixCode({ amountBRL, bookingId, customerEmail, customerName }) {
  // Pix requires a Stripe Customer with email
  const customer = await stripe.customers.create({
    email: customerEmail,
    name:  customerName,
    metadata: { bookingId },
  });

  const intent = await stripe.paymentIntents.create({
    amount:               Math.round(parseFloat(amountBRL) * 100), // centavos
    currency:             'brl',
    payment_method_types: ['pix'],
    payment_method_data:  { type: 'pix' },
    confirm:              true,  // immediately confirm to get QR code
    customer:             customer.id,
    payment_method_options: {
      pix: {
        expires_after_seconds: PIX_EXPIRY_SECONDS,
      },
    },
    metadata: { bookingId, gateway: 'pix' },
  });

  // Stripe returns QR code data in next_action when payment_method_type=pix + confirm=true
  const pixAction = intent.next_action?.pix_display_qr_code;

  if (!pixAction) {
    throw new Error(`Stripe Pix did not return QR code. Status: ${intent.status}`);
  }

  return {
    paymentIntentId: intent.id,
    clientSecret:    intent.client_secret,
    qrCodeImageUrl:  pixAction.image_url_png,        // PNG image for display
    pixCopiaCola:    pixAction.data,                 // text string user can paste
    expiresAt:       new Date(pixAction.expires_at * 1000).toISOString(),
    status:          intent.status,                  // 'requires_action' → waiting for user
    raw:             intent,
  };
}

/**
 * Check the current status of a Pix payment.
 *
 * @param {string} paymentIntentId
 * @returns {{ status: 'completed'|'pending'|'failed'|'expired', raw }}
 */
async function checkPixPayment(paymentIntentId) {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const status =
    intent.status === 'succeeded'          ? 'completed'
    : intent.status === 'canceled'         ? 'failed'
    : intent.status === 'payment_failed'   ? 'failed'
    : intent.status === 'requires_action'  ? 'pending'
    : 'pending';

  // Check if Pix QR code has expired
  const pixAction = intent.next_action?.pix_display_qr_code;
  if (pixAction && pixAction.expires_at && Date.now() / 1000 > pixAction.expires_at) {
    return { status: 'expired', raw: intent };
  }

  return { status, raw: intent };
}

/**
 * Generate a Boleto Bancário PaymentIntent.
 * Expires in 3 business days (Stripe default; configurable).
 *
 * @param {object} opts
 * @param {number} opts.amountBRL
 * @param {string} opts.bookingId
 * @param {string} opts.customerEmail
 * @param {string} opts.customerName
 * @param {string} opts.cpfOrCnpj      — Brazilian taxpayer ID (CPF 11 digits or CNPJ 14 digits)
 *
 * @returns {{ paymentIntentId, boletoUrl, expiresAt, status }}
 */
async function generateBoleto({ amountBRL, bookingId, customerEmail, customerName, cpfOrCnpj }) {
  const customer = await stripe.customers.create({
    email: customerEmail,
    name:  customerName,
    metadata: { bookingId },
  });

  const intent = await stripe.paymentIntents.create({
    amount:               Math.round(parseFloat(amountBRL) * 100),
    currency:             'brl',
    payment_method_types: ['boleto'],
    payment_method_data:  {
      type:   'boleto',
      boleto: { tax_id: cpfOrCnpj.replace(/\D/g, '') }, // digits only
      billing_details: {
        name:  customerName,
        email: customerEmail,
      },
    },
    confirm:  true,
    customer: customer.id,
    payment_method_options: {
      boleto: {
        expires_after_days: 3, // 3-day expiry
      },
    },
    metadata: { bookingId, gateway: 'boleto' },
  });

  const boletoAction = intent.next_action?.boleto_display_details;

  if (!boletoAction) {
    throw new Error(`Stripe Boleto did not return voucher URL. Status: ${intent.status}`);
  }

  return {
    paymentIntentId: intent.id,
    clientSecret:    intent.client_secret,
    boletoUrl:       boletoAction.hosted_voucher_url,  // user clicks → PDF boleto
    expiresAt:       new Date(boletoAction.expires_at * 1000).toISOString(),
    status:          intent.status,
    raw:             intent,
  };
}

/**
 * Handle Stripe webhook for Pix / Boleto events.
 * Verify webhook signature before calling this function (use stripeWebhookAuth middleware).
 *
 * @param {object} event — Stripe Event object (already verified)
 * @returns {{ paymentIntentId, status, gateway }}
 */
function handleStripeWebhook(event) {
  const { type, data } = event;
  const intent = data.object;

  // Only handle PaymentIntents (not SetupIntents or other objects)
  if (intent.object !== 'payment_intent') {
    return { handled: false };
  }

  // Determine which gateway from metadata
  const gateway = intent.metadata?.gateway ?? 'pix';

  const status =
    type === 'payment_intent.succeeded'       ? 'completed'
    : type === 'payment_intent.payment_failed' ? 'failed'
    : type === 'payment_intent.canceled'       ? 'failed'
    : 'pending';

  return {
    handled:         true,
    paymentIntentId: intent.id,
    bookingId:       intent.metadata?.bookingId,
    gateway,
    status,
    raw:             intent,
  };
}

module.exports = {
  generatePixCode,
  checkPixPayment,
  generateBoleto,
  handleStripeWebhook,
};
