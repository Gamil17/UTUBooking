'use strict';

/**
 * Interac e-Transfer / Interac Online via Bambora (Worldline Canada)
 *
 * Bambora is the primary Canadian payment processor supporting Interac Online.
 * Interac does NOT offer a direct merchant API — all Interac Online traffic
 * flows through Bambora's redirect-based checkout.
 *
 * Flow:
 *   1. UTUBooking calls POST /v1/payments → Bambora returns { redirectUrl }
 *   2. Customer is redirected to their bank's Interac portal
 *   3. Bank redirects customer back to UTUBooking via approvedUrl/declinedUrl
 *   4. UTUBooking calls GET /v1/payments/{id} to verify final status
 *   5. Bambora also fires a server-side webhook (POST /interac/callback)
 *
 * Install:  npm install axios (already in payment service deps)
 * Docs:     developer.bambora.com/na/checkout/guides/interac-online
 *
 * Env vars:
 *   BAMBORA_MERCHANT_ID   — from Bambora/Worldline merchant portal
 *   BAMBORA_PASSCODE      — API access passcode (NOT login password)
 *   BAMBORA_ENV           — "sandbox" | "production" (default: "sandbox")
 */

const axios = require('axios');

const ENV             = process.env.BAMBORA_ENV ?? 'sandbox';
const MERCHANT_ID     = process.env.BAMBORA_MERCHANT_ID ?? '';
const PASSCODE        = process.env.BAMBORA_PASSCODE ?? '';

const BASE_URL = ENV === 'production'
  ? 'https://api.na.bambora.com'
  : 'https://sandbox.na.bambora.com';

// Basic auth — base64("merchant_id:passcode")
function authHeader() {
  const creds = Buffer.from(`${MERCHANT_ID}:${PASSCODE}`).toString('base64');
  return `Basic ${creds}`;
}

/**
 * Initiate an Interac Online payment.
 *
 * @param {object} opts
 * @param {number}  opts.amountCAD      — amount in CAD (major units, e.g. 1250.00)
 * @param {string}  opts.orderId        — unique order reference (max 30 chars)
 * @param {string}  opts.customerEmail  — payer email
 * @param {string}  opts.customerName   — payer full name
 * @param {string}  opts.approvedUrl    — redirect on success (UTUBooking return page)
 * @param {string}  opts.declinedUrl    — redirect on failure/cancel
 *
 * @returns {{ paymentId: string, redirectUrl: string }}
 */
async function initiateInteracPayment({
  amountCAD,
  orderId,
  customerEmail,
  customerName,
  approvedUrl,
  declinedUrl,
}) {
  const amountFormatted = Number(amountCAD).toFixed(2);

  const payload = {
    payment_method: 'interac',
    order_number:   orderId.slice(0, 30),    // Bambora limit
    amount:         amountFormatted,
    currency:       'CAD',
    customer_ip:    '127.0.0.1',             // replaced by controller using req.ip
    customer_details: {
      email: customerEmail,
      name:  customerName,
    },
    interac: {
      approved_url: approvedUrl,
      declined_url: declinedUrl,
    },
  };

  const res = await axios.post(
    `${BASE_URL}/v1/payments`,
    payload,
    {
      headers: {
        Authorization:  authHeader(),
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );

  const data = res.data;

  // Bambora returns 200 with { id, redirect_url, ... } for Interac Online
  if (!data.interac?.redirect_url && !data.redirect_url) {
    throw new Error(`Bambora did not return a redirect URL. Code: ${data.code} — ${data.message}`);
  }

  return {
    paymentId:   String(data.id),
    redirectUrl: data.redirect_url ?? data.interac?.redirect_url,
    raw:         data,
  };
}

/**
 * Verify the outcome of an Interac payment by fetching the transaction.
 * Called after customer returns from Interac portal, or from webhook handler.
 *
 * @param {string} paymentId — Bambora transaction ID
 * @returns {{ status: 'completed' | 'failed' | 'pending', raw: object }}
 */
async function verifyPayment(paymentId) {
  const res = await axios.get(
    `${BASE_URL}/v1/payments/${paymentId}`,
    {
      headers: { Authorization: authHeader() },
      timeout: 15000,
    },
  );

  const data = res.data;

  // Bambora approved field: 1 = approved, 0 = declined
  const status =
    data.approved === 1 ? 'completed'
    : data.approved === 0 ? 'failed'
    : 'pending';

  return { status, raw: data };
}

/**
 * Validate Bambora webhook notification.
 * Bambora sends a POST with form data; there is no HMAC signature on standard plans.
 * Verify by re-fetching the payment from the API to confirm its status.
 *
 * @param {object} webhookBody — parsed webhook payload (form-urlencoded or JSON)
 * @returns {{ valid: boolean, paymentId: string, status: string }}
 */
async function handleWebhook(webhookBody) {
  // Bambora webhook body contains `trnId` (transaction ID)
  const paymentId = webhookBody.trnId ?? webhookBody.id;
  if (!paymentId) return { valid: false, paymentId: null, status: 'unknown' };

  // Re-fetch to confirm (prevents replay of spoofed webhooks)
  const result = await verifyPayment(String(paymentId));
  return { valid: true, paymentId: String(paymentId), status: result.status };
}

module.exports = {
  initiateInteracPayment,
  verifyPayment,
  handleWebhook,
};
