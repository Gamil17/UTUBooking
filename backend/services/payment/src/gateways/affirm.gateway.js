/**
 * Affirm BNPL (Buy Now Pay Later) Gateway
 *
 * Affirm offers 0–36% APR installment plans for US purchases.
 * Show ONLY for bookings > USD 200 (Affirm minimum is $50; we enforce $200 for
 * travel bookings where smaller amounts aren't worth BNPL friction).
 *
 * API version: v2 (stable, current as of 2026)
 * Docs: https://docs.affirm.com/affirm-developers/reference/
 *
 * Flow:
 *   1. Backend POST /v2/checkouts → { checkout_token, redirect_url }
 *   2. Frontend redirects customer to redirect_url (Affirm checkout UI)
 *   3. Customer approves → Affirm redirects to confirm_url with ?checkout_token=XXX
 *   4. Backend POST /v2/charges { checkout_token } → { id: chargeId, status }
 *   5. Backend POST /v2/charges/{chargeId}/capture → settled
 *
 * Webhook events (sent to POST /api/payments/affirm/confirm):
 *   charge.confirmed   → confirmed
 *   charge.voided      → failed
 *   charge.refunded    → refunded
 *   charge.rejected    → failed
 *
 * Venmo / PayPal Pay Later:
 *   PayPal automatically surfaces "Pay Later" / Venmo in the PayPal modal
 *   when creating a PayPal order — no separate integration needed.
 *
 * Env vars:
 *   AFFIRM_PUBLIC_KEY   merchant public key from Affirm dashboard
 *   AFFIRM_PRIVATE_KEY  merchant private key (KEEP SECRET)
 *   AFFIRM_ENV          'sandbox' | 'production'  (default: 'sandbox')
 */

'use strict';

const axios = require('axios');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

const ENV      = (process.env.AFFIRM_ENV ?? 'sandbox');
const BASE_URL = ENV === 'production'
  ? 'https://api.affirm.com/api/v2'
  : 'https://sandbox.affirm.com/api/v2';

const AFFIRM_MIN_USD = 50;    // Affirm's actual minimum
const RECOMMENDED_MIN_USD = 200;  // UTUBooking enforced minimum (exported for controller)

// ─── Auth ─────────────────────────────────────────────────────────────────────

function _buildHeaders() {
  const pub  = process.env.AFFIRM_PUBLIC_KEY  ?? '';
  const priv = process.env.AFFIRM_PRIVATE_KEY ?? '';
  const token = Buffer.from(`${pub}:${priv}`).toString('base64');
  return {
    Authorization:  `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

// ─── createCheckout ───────────────────────────────────────────────────────────

/**
 * Create an Affirm checkout session.
 * Returns a redirect_url to send the customer to Affirm's checkout UI.
 *
 * @param {object} params
 * @param {string} params.bookingId
 * @param {number} params.amountCents     amount in US cents (e.g. 24999 for $249.99)
 * @param {string} params.confirmUrl      Affirm redirects here with ?checkout_token= on approval
 * @param {string} params.cancelUrl       Affirm redirects here on cancellation
 * @param {string} params.description     e.g. "Umrah package – Makkah Hilton 5 nights"
 * @param {object} [params.customerEmail] pre-fill customer email
 *
 * @returns {Promise<{ checkoutToken: string, redirectUrl: string }>}
 */
async function createCheckout({
  bookingId,
  amountCents,
  confirmUrl,
  cancelUrl,
  description,
  customerEmail,
}) {
  if (amountCents < AFFIRM_MIN_USD * 100) {
    throw new AffirmGatewayError(
      `Amount $${(amountCents / 100).toFixed(2)} is below Affirm minimum $${AFFIRM_MIN_USD}`,
      422,
    );
  }

  const body = {
    merchant: {
      public_api_key:    process.env.AFFIRM_PUBLIC_KEY ?? '',
      user_confirmation_url:       confirmUrl,
      user_cancel_url:             cancelUrl,
      user_confirmation_url_action: 'POST',
    },
    shipping: null,   // no physical shipping for travel bookings
    items: [{
      display_name:  description ?? `UTUBooking reservation ${bookingId}`,
      sku:           bookingId,
      unit_price:    amountCents,
      qty:           1,
      item_type:     'physical',  // Affirm requires 'physical' for installment eligibility
    }],
    order_id:     bookingId,
    total:        amountCents,
    currency:     'USD',
    metadata: {
      booking_id:  bookingId,
      platform:    'utubooking',
    },
    ...(customerEmail ? { user_data: { email: customerEmail } } : {}),
  };

  let res;
  try {
    res = await axios.post(`${BASE_URL}/checkouts`, body, {
      headers: _buildHeaders(),
      timeout: 15000,
    });
  } catch (err) {
    throw new AffirmGatewayError(
      err.response?.data?.message ?? err.message ?? 'Affirm createCheckout failed',
      err.response?.status ?? 502,
      err.response?.data,
    );
  }

  const data = res.data;
  return {
    checkoutToken: data.checkout_token,
    redirectUrl:   data.redirect_url ?? `https://www.affirm.com/checkout/${data.checkout_token}`,
    raw:           data,
  };
}

// ─── chargeCheckout ───────────────────────────────────────────────────────────

/**
 * Charge a customer-approved Affirm checkout.
 * Call after the customer returns from the Affirm redirect with checkout_token.
 *
 * @param {string} checkoutToken  from URL param ?checkout_token= after Affirm redirect
 * @returns {Promise<{ chargeId, status, amountCents, authCode }>}
 */
async function chargeCheckout(checkoutToken) {
  let res;
  try {
    res = await axios.post(`${BASE_URL}/charges`, {
      checkout_token: checkoutToken,
    }, {
      headers: _buildHeaders(),
      timeout: 20000,
    });
  } catch (err) {
    throw new AffirmGatewayError(
      err.response?.data?.message ?? err.message ?? 'Affirm charge failed',
      err.response?.status ?? 502,
      err.response?.data,
    );
  }

  const charge = res.data;
  return {
    chargeId:    charge.id,
    status:      _mapStatus(charge.status),
    amountCents: charge.amount ?? 0,
    authCode:    charge.auth_code ?? null,
    raw:         charge,
  };
}

// ─── captureCharge ────────────────────────────────────────────────────────────

/**
 * Capture (settle) a previously authorised Affirm charge.
 * Must be called within Affirm's auth expiry window (typically 30 days).
 * Usually called automatically after the booking is confirmed.
 *
 * @param {string} chargeId
 * @param {number} [amountCents]  partial capture (omit for full capture)
 */
async function captureCharge(chargeId, amountCents) {
  const body = amountCents ? { amount: amountCents } : {};
  let res;
  try {
    res = await axios.post(`${BASE_URL}/charges/${chargeId}/capture`, body, {
      headers: _buildHeaders(),
      timeout: 15000,
    });
  } catch (err) {
    throw new AffirmGatewayError(
      err.response?.data?.message ?? err.message ?? 'Affirm capture failed',
      err.response?.status ?? 502,
    );
  }
  return {
    chargeId,
    status:  _mapStatus(res.data.status ?? 'captured'),
    raw:     res.data,
  };
}

// ─── voidCharge ───────────────────────────────────────────────────────────────

/**
 * Void (cancel) an authorised but uncaptured Affirm charge.
 * @param {string} chargeId
 */
async function voidCharge(chargeId) {
  try {
    await axios.post(`${BASE_URL}/charges/${chargeId}/void`, {}, {
      headers: _buildHeaders(),
      timeout: 15000,
    });
  } catch (err) {
    throw new AffirmGatewayError(
      err.response?.data?.message ?? err.message ?? 'Affirm void failed',
      err.response?.status ?? 502,
    );
  }
  return { chargeId, status: 'voided' };
}

// ─── refundCharge ─────────────────────────────────────────────────────────────

/**
 * Refund a captured Affirm charge (full or partial).
 * Refunds are free to merchants; Affirm credits the customer's account.
 *
 * @param {string} chargeId
 * @param {number} [amountCents]  omit for full refund
 */
async function refundCharge(chargeId, amountCents) {
  const body = amountCents ? { amount: amountCents } : {};
  let res;
  try {
    res = await axios.post(`${BASE_URL}/charges/${chargeId}/refund`, body, {
      headers: _buildHeaders(),
      timeout: 15000,
    });
  } catch (err) {
    throw new AffirmGatewayError(
      err.response?.data?.message ?? err.message ?? 'Affirm refund failed',
      err.response?.status ?? 502,
    );
  }
  return {
    refundId:    res.data.id ?? chargeId,
    amountCents: res.data.amount ?? amountCents,
    status:      'refunded',
    raw:         res.data,
  };
}

// ─── verifyWebhookSignature ───────────────────────────────────────────────────

/**
 * Verify Affirm webhook signature.
 * Affirm signs webhooks with HMAC-SHA256 using the AFFIRM_PRIVATE_KEY.
 * Header: X-Affirm-Signature: sha256=<hex>
 *
 * @param {Buffer|string} rawBody
 * @param {string} signatureHeader  value of X-Affirm-Signature header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const privateKey = process.env.AFFIRM_PRIVATE_KEY ?? '';
  if (!privateKey) {
    console.warn('[affirm-gateway] AFFIRM_PRIVATE_KEY not set — skipping webhook verification');
    return true; // non-fatal for dev
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', privateKey)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader ?? ''),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

// ─── mapWebhookEventType ──────────────────────────────────────────────────────

/**
 * Map Affirm webhook event_type to UTUBooking internal status.
 */
function mapWebhookEventType(eventType) {
  switch (eventType) {
    case 'charge.confirmed':  return 'completed';
    case 'charge.captured':   return 'completed';
    case 'charge.voided':     return 'failed';
    case 'charge.rejected':   return 'failed';
    case 'charge.refunded':   return 'refunded';
    default:                   return null;
  }
}

// ─── Status mapper ────────────────────────────────────────────────────────────

function _mapStatus(affirmStatus) {
  switch (String(affirmStatus).toLowerCase()) {
    case 'confirmed':
    case 'captured':
    case 'authorized':
      return 'completed';
    case 'pending':
    case 'auth':
      return 'pending';
    case 'voided':
    case 'rejected':
    case 'expired':
      return 'failed';
    case 'refunded':
    case 'partially_refunded':
      return 'refunded';
    default:
      return 'pending';
  }
}

// ─── Monthly installment estimate (for display only) ─────────────────────────

/**
 * Returns a rough monthly payment estimate for display at checkout.
 * Uses a representative 15% APR over 12 months as a mid-range estimate.
 * Actual rate shown in Affirm's own UI after soft credit pull.
 *
 * @param {number} amountUSD
 * @param {number} [months]   default 12
 * @returns {string}  e.g. "as low as $23/mo"
 */
function estimateMonthlyPayment(amountUSD, months = 12) {
  // P × [r(1+r)^n] / [(1+r)^n−1] — standard loan formula at 15% APR
  const annualRate  = 0.15;
  const r           = annualRate / 12;
  const n           = months;
  const monthly     = amountUSD * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return `as low as $${monthly.toFixed(0)}/mo`;
}

// ─── Error type ───────────────────────────────────────────────────────────────

class AffirmGatewayError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'AffirmGatewayError';
    this.statusCode = statusCode;
    this.status     = statusCode;
    this.raw        = raw;
  }
}

module.exports = {
  createCheckout,
  chargeCheckout,
  captureCharge,
  voidCharge,
  refundCharge,
  verifyWebhookSignature,
  mapWebhookEventType,
  estimateMonthlyPayment,
  RECOMMENDED_MIN_USD,
  AffirmGatewayError,
};
