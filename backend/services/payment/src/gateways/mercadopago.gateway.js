'use strict';

/**
 * MercadoPago Gateway — Latin America
 * Covers: AR (ARS), CO (COP), CL (CLP), UY (UYU), MX (MXN), PE (PEN)
 *
 * Integration: MercadoPago Checkout Pro (redirect-based)
 * One integration covers all LATAM countries — MercadoPago handles local
 * payment methods per country:
 *   AR → PSP, Rapipago, Pago Fácil, cards, installments (cuotas)
 *   CO → PSE (bank transfer), Efecty, cards
 *   CL → Khipu, WebPay, Multicaja, cards
 *   UY → Abitab, Redpagos, cards
 *   MX → OXXO, SPEI, cards
 *   PE → PagoEfectivo, cards
 *
 * Flow:
 *   1. POST /mercadopago/initiate → createPreference() → { redirectUrl }
 *   2. User is redirected to MercadoPago hosted checkout (init_point)
 *   3. MercadoPago redirects back to successUrl/failureUrl/pendingUrl
 *   4. MercadoPago also fires a notification (IPN) to notificationsUrl
 *
 * Docs: https://www.mercadopago.com.br/developers/en/docs/checkout-pro/landing
 *
 * Env vars:
 *   MERCADOPAGO_ACCESS_TOKEN — from MercadoPago Developer Dashboard
 *   MERCADOPAGO_ENV          — 'sandbox' | 'production' (default: sandbox)
 *
 * Note: No npm package used — direct REST to avoid version lock issues.
 * The `mercadopago` npm package v2 has breaking changes from v1.
 */

const axios = require('axios');

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? '';
const ENV          = process.env.MERCADOPAGO_ENV ?? 'sandbox';

const BASE_URL =
  ENV === 'production'
    ? 'https://api.mercadopago.com'
    : 'https://api.mercadopago.com'; // same URL; sandbox uses test access token

// Currency → MercadoPago site_id mapping
const SITE_IDS = {
  ARS: 'MLA', // Argentina
  CLP: 'MLC', // Chile
  COP: 'MCO', // Colombia
  UYU: 'MLU', // Uruguay
  MXN: 'MLM', // Mexico
  PEN: 'MPE', // Peru
  BRL: 'MLB', // Brazil (Pix preferred over this, but available)
};

function authHeader() {
  return { Authorization: `Bearer ${ACCESS_TOKEN}` };
}

/**
 * Create a MercadoPago Checkout Pro preference.
 *
 * @param {object} opts
 * @param {number}   opts.amount          — amount in local currency (e.g. 150000 COP)
 * @param {string}   opts.currency        — ISO currency code (ARS, COP, CLP, UYU, MXN, PEN)
 * @param {string}   opts.bookingId       — internal booking ID
 * @param {string}   opts.description     — item description shown in MercadoPago UI
 * @param {string}   opts.customerEmail   — payer email
 * @param {string}   opts.successUrl      — redirect on success (UTUBooking confirmation page)
 * @param {string}   opts.failureUrl      — redirect on failure
 * @param {string}   opts.pendingUrl      — redirect for async payment methods (bank slips)
 * @param {string}   opts.notificationsUrl — IPN webhook URL
 *
 * @returns {{ preferenceId, redirectUrl }}
 */
async function createPreference({
  amount,
  currency,
  bookingId,
  description,
  customerEmail,
  successUrl,
  failureUrl,
  pendingUrl,
  notificationsUrl,
}) {
  const siteId = SITE_IDS[currency?.toUpperCase()] ?? 'MLA';

  const payload = {
    items: [
      {
        id:          bookingId,
        title:       description || 'UTUBooking — Hajj/Umrah Package',
        quantity:    1,
        currency_id: currency?.toUpperCase(),
        unit_price:  Number(amount),
      },
    ],
    payer: {
      email: customerEmail,
    },
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    auto_return:        'approved',   // auto-redirect when payment is approved
    notification_url:   notificationsUrl,
    external_reference: bookingId,    // returned in all callbacks for reconciliation
    statement_descriptor: 'UTUBOOKING',
    metadata: {
      booking_id: bookingId,
      site_id:    siteId,
      currency,
    },
  };

  const res = await axios.post(
    `${BASE_URL}/checkout/preferences`,
    payload,
    {
      headers: {
        ...authHeader(),
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `utu-pref-${bookingId}`,
      },
      timeout: 30000,
    },
  );

  const data = res.data;

  // sandbox: sandbox_init_point; production: init_point
  const redirectUrl =
    ENV === 'production' ? data.init_point : data.sandbox_init_point;

  return {
    preferenceId: data.id,
    redirectUrl,
    raw:          data,
  };
}

/**
 * Verify and parse a MercadoPago IPN (Instant Payment Notification) webhook.
 * MercadoPago does not sign webhooks with HMAC — verify by fetching the payment.
 *
 * @param {object} body — parsed webhook body
 * @returns {{ valid, paymentId, status, bookingId }}
 */
async function verifyWebhook(body) {
  const topic = body.topic ?? body.type;
  const resourceId = body.data?.id ?? body.id;

  // Only handle payment notifications (not merchant_order or other topics)
  if (!['payment', 'payment.created', 'payment.updated'].includes(topic) && topic !== 'payment') {
    return { valid: false, paymentId: null, status: 'unknown' };
  }

  if (!resourceId) {
    return { valid: false, paymentId: null, status: 'unknown' };
  }

  // Re-fetch to verify (prevents replay attacks)
  const res = await axios.get(
    `${BASE_URL}/v1/payments/${resourceId}`,
    {
      headers: authHeader(),
      timeout: 15000,
    },
  );

  const payment = res.data;

  const status =
    payment.status === 'approved'  ? 'completed'
    : payment.status === 'rejected' ? 'failed'
    : payment.status === 'cancelled' ? 'failed'
    : payment.status === 'in_process' ? 'pending'
    : payment.status === 'pending'  ? 'pending'
    : 'pending';

  return {
    valid:      true,
    paymentId:  String(payment.id),
    bookingId:  payment.external_reference,
    status,
    currency:   payment.currency_id,
    amount:     payment.transaction_amount,
    raw:        payment,
  };
}

module.exports = {
  createPreference,
  verifyWebhook,
};
