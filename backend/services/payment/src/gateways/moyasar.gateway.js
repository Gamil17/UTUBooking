/**
 * Moyasar Payment Gateway adapter — Mada debit card
 *
 * Docs: https://docs.moyasar.com
 * Auth: HTTP Basic (API key as username, empty password)
 * Amounts: submitted in halalas (SAR × 100, smallest unit)
 *
 * 3D Secure flow:
 *   1. POST /v1/payments → if status === 'initiated', redirect customer to
 *      source.transaction_url for 3DS challenge
 *   2. Customer completes 3DS → Moyasar calls callback_url
 *   3. Moyasar also fires webhook to registered endpoint
 */
require('dotenv').config();
const axios  = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://api.moyasar.com/v1';

function _basicAuth() {
  return Buffer.from(`${process.env.MOYASAR_API_KEY}:`).toString('base64');
}

// ─── charge ───────────────────────────────────────────────────────────────────

/**
 * Initiates a Mada payment via Moyasar.
 *
 * @param {object} params
 * @param {number} params.amount       — SAR amount (e.g. 1250.00)
 * @param {string} params.currency     — 'SAR'
 * @param {string} params.description  — shown on statement
 * @param {string} params.callbackUrl  — Moyasar POSTs result here after 3DS
 * @param {object} params.source       — card token from Moyasar.js
 *   { type: 'mada', token: '...', name: 'Cardholder', month: '12', year: '26' }
 *
 * @returns {{ id, status, redirectUrl, requires3ds, raw }}
 *   requires3ds === true → redirect customer to redirectUrl before payment completes
 */
async function charge({ amount, currency = 'SAR', description, callbackUrl, source }) {
  const res = await axios.post(
    `${BASE_URL}/payments`,
    {
      amount:       Math.round(parseFloat(amount) * 100), // halalas
      currency,
      description,
      callback_url: callbackUrl || process.env.MOYASAR_CALLBACK_URL,
      source,
    },
    {
      headers: {
        Authorization:  `Basic ${_basicAuth()}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const payment = res.data;

  return {
    id:          payment.id,
    status:      payment.status,                          // 'initiated' | 'paid' | 'failed'
    redirectUrl: payment.source?.transaction_url || null, // 3DS redirect URL
    requires3ds: payment.status === 'initiated',
    raw:         payment,
  };
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature on an incoming Moyasar webhook.
 * Signature is in the `x-moyasar-signature` header as a hex string.
 *
 * @param {Buffer} rawBody   — raw bytes (must not be JSON-parsed first)
 * @param {string} signature — hex value from header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.MOYASAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected,  'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStatus(moyasarStatus) {
  const map = {
    paid:      'completed',
    failed:    'failed',
    initiated: 'pending',
    refunded:  'refunded',
    voided:    'refunded',
  };
  return map[moyasarStatus] || 'pending';
}

module.exports = { charge, verifyWebhookSignature, mapStatus };
