/**
 * STC Pay Merchant API v2 adapter
 *
 * Auth:    API key + HMAC-SHA256 per-request signature
 * Docs:    backend/docs/stcpay-api.md  |  https://dev.stcpay.net
 * Sandbox: Set STCPAY_SANDBOX_MODE=true and use TEST_ merchant credentials
 *
 * Amount convention: STC Pay v2 uses fils (integer) — 1 SAR = 100 fils
 * Flow: initiate → customer authenticates in STC Pay app → webhook callback
 */
require('dotenv').config();
const axios  = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.STCPAY_BASE_URL || 'https://b2b.stcpay.com.sa/b2b/payment';

// ─── Per-request auth headers ─────────────────────────────────────────────────
// Signs each request with HMAC-SHA256(apiSecret, apiKey + timestamp)
// so every call has a unique, time-bound signature.

function _buildAuthHeaders() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', process.env.STCPAY_API_SECRET)
    .update(`${process.env.STCPAY_API_KEY}${timestamp}`)
    .digest('hex');

  return {
    'X-Api-Key':      process.env.STCPAY_API_KEY,
    'X-Merchant-Id':  process.env.STCPAY_MERCHANT_ID,
    'X-Timestamp':    timestamp,
    'X-Signature':    signature,
    'Content-Type':   'application/json',
  };
}

// ─── initiatePayment ──────────────────────────────────────────────────────────

/**
 * Creates a payment session with STC Pay.
 *
 * @param {object} params
 * @param {string} params.bookingId    — used as orderId (idempotent key)
 * @param {number} params.amount       — SAR amount as decimal (e.g. 1250.00)
 *                                       Converted to fils internally (× 100)
 * @param {string} params.currency     — 'SAR' (only supported currency)
 * @param {string} [params.successUrl] — redirect URL on payment success
 * @param {string} [params.failureUrl] — redirect URL on payment failure
 *
 * @returns {{ stcPayRef, paymentUrl, raw }}
 */
async function initiatePayment({ bookingId, amount, currency = 'SAR', successUrl, failureUrl }) {
  const amountInFils = Math.round(parseFloat(amount) * 100); // SAR → fils

  const res = await axios.post(
    `${BASE_URL}/v2/payment/initiation`,
    {
      orderId:     bookingId,                                          // idempotent key
      amount:      amountInFils,
      currency,
      callbackUrl: process.env.STCPAY_CALLBACK_URL,
      ...(successUrl && { successUrl }),
      ...(failureUrl && { failureUrl }),
    },
    {
      headers:  _buildAuthHeaders(),
      timeout:  15000,
    }
  );

  return {
    stcPayRef:  res.data.STCPayPmtRef,
    paymentUrl: res.data.PaymentURL || null,
    raw:        res.data,
  };
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature on an incoming STC Pay webhook.
 * Signature arrives in the `X-STCPAY-Signature` header as a hex string.
 *
 * @param {Buffer} rawBody   — raw request body bytes (must NOT be JSON-parsed)
 * @param {string} signature — hex value from the header
 */
function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.STCPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected,  'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false; // length mismatch → definitely invalid
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps STC Pay v2 PaymentStatus enum strings → internal payment_status values.
 * Source: backend/docs/stcpay-api.md § Status Codes & Error Handling
 */
function mapStatus(stcPayStatus) {
  const map = {
    COMPLETED: 'completed',
    FAILED:    'failed',
    CANCELLED: 'failed',    // allow re-initiation; treated as terminal failure
    INITIATED: 'pending',   // still in-progress
  };
  return map[String(stcPayStatus).toUpperCase()] || 'pending';
}

module.exports = { initiatePayment, verifyWebhookSignature, mapStatus };
