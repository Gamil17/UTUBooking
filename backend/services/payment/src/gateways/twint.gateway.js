/**
 * TWINT Payment Gateway — Switzerland (CHF)
 *
 * TWINT is Switzerland's dominant mobile payment system (80% Swiss mobile market).
 * This adapter calls the TWINT Partner API directly.
 *
 * ── Prerequisites ──────────────────────────────────────────────────────────────
 * 1. Apply for TWINT partner membership: developer.twint.ch
 * 2. Complete merchant onboarding + KYC with TWINT AG
 * 3. Obtain TWINT_CLIENT_ID, TWINT_CLIENT_SECRET, TWINT_PARTNER_ID from the portal
 * 4. Set TWINT_ENVIRONMENT=production (or 'test' for sandbox)
 *
 * NOTE: `npm install twint-integration` is NOT a real npm package.
 * This gateway uses direct HTTP calls to the TWINT REST API.
 * There is no official Node.js SDK from TWINT AG — use this adapter.
 *
 * ── Alternative via Stripe ─────────────────────────────────────────────────────
 * Stripe added TWINT support for CHF in 2024.
 * If you already have Stripe and prefer not to do a TWINT partnership:
 *   1. Enable TWINT in Stripe Dashboard → Settings → Payment Methods → Switzerland
 *   2. Use the Payment Element (createPaymentElementIntent) with currency='CHF'
 *   3. TWINT will auto-appear in the Payment Element UI for Swiss users
 *   4. No separate gateway or contract needed — Stripe handles the TWINT settlement
 * Both approaches work. This gateway exists for direct integration when lower fees
 * (1.3% vs Stripe 2.9%) or deeper TWINT features (recurring, refunds) are needed.
 *
 * ── Payment flow ───────────────────────────────────────────────────────────────
 *   1. POST /checkouts → { checkoutId, token, qrCodeUrl, appLink }
 *   2. Show QR code (desktop) or app-link button (mobile) to user
 *   3. User scans QR with TWINT app or taps deep-link
 *   4. TWINT sends webhook: POST /api/payments/twint/webhook
 *   5. Poll GET /checkouts/{checkoutId} as fallback if webhook missed
 */

require('dotenv').config();

const TWINT_ENV    = process.env.TWINT_ENVIRONMENT ?? 'test';
const BASE_URL     = TWINT_ENV === 'production'
  ? 'https://api.twint.ch/v1'
  : 'https://api.sandbox.twint.ch/v1';

const CLIENT_ID     = process.env.TWINT_CLIENT_ID;
const CLIENT_SECRET = process.env.TWINT_CLIENT_SECRET;
const PARTNER_ID    = process.env.TWINT_PARTNER_ID;
const WEBHOOK_URL   = process.env.TWINT_WEBHOOK_URL ?? 'https://api.utubooking.com/api/payments/twint/webhook';

if (!CLIENT_ID || !CLIENT_SECRET || !PARTNER_ID) {
  console.warn(
    '[twint] TWINT_CLIENT_ID / TWINT_CLIENT_SECRET / TWINT_PARTNER_ID not set. ' +
    'TWINT payments will fail. Set these env vars after completing TWINT partner onboarding.'
  );
}

// ─── OAuth token cache ────────────────────────────────────────────────────────
// TWINT uses OAuth 2.0 client credentials. Tokens are valid for ~1 hour.
let _tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 30_000) {
    return _tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         'payments',
  });

  const res = await fetch(`${BASE_URL}/oauth2/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
    signal:  AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[twint] OAuth token request failed: ${res.status} — ${text}`);
  }

  const data = await res.json();
  _tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return _tokenCache.token;
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────
async function twintFetch(path, options = {}) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'X-Partner-Id':  PARTNER_ID,
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(options.timeout ?? 30_000),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const err   = new Error(`[twint] ${options.method ?? 'GET'} ${path} → ${res.status}`);
    err.status  = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

// ─── createCheckout ───────────────────────────────────────────────────────────

/**
 * Creates a TWINT payment checkout.
 *
 * @param {object} params
 * @param {number} params.amount      — CHF amount (e.g. 250.00)
 * @param {string} params.bookingId   — UTUBooking booking UUID (stored as merchantRef)
 * @param {string} [params.description]
 *
 * @returns {{
 *   checkoutId: string,        — TWINT checkout ID (store as gateway_ref)
 *   token:      string,        — short-lived QR token
 *   qrCodeUrl:  string,        — URL of QR code image (embed as <img src=…>)
 *   appLink:    string,        — twint://… deep-link for mobile app redirect
 *   expiresAt:  string,        — ISO timestamp when QR expires (typically 15 min)
 * }}
 */
async function createCheckout({ amount, bookingId, description }) {
  const body = {
    partnerMerchantId: PARTNER_ID,
    merchantRef:       bookingId,
    currency:          'CHF',
    requestedAmount:   Number(amount).toFixed(2),
    description:       description ?? `UTUBooking — ${bookingId}`,
    notificationUrl:   WEBHOOK_URL,
    // merchant return URL: frontend handles the result on the Stripe-like return_url
    // For TWINT app-to-app, the deep-link includes a merchant_return_app_url param.
  };

  const data = await twintFetch('/checkouts', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

  return {
    checkoutId: data.checkoutId ?? data.id,
    token:      data.token,
    qrCodeUrl:  data.qrCodeUrl  ?? data.qrCode?.url,
    appLink:    data.appLink    ?? data.deepLink,
    expiresAt:  data.expiresAt  ?? data.expiry,
  };
}

// ─── getCheckoutStatus ────────────────────────────────────────────────────────

/**
 * Polls the status of a TWINT checkout.
 * Call this on the frontend return URL or as a webhook fallback.
 *
 * Possible statuses (TWINT native):
 *   PENDING  → user has not yet paid
 *   SUCCESS  → payment confirmed
 *   FAILURE  → payment failed or user cancelled
 *   EXPIRED  → QR token expired (15 min window)
 *
 * @param {string} checkoutId
 * @returns {{ checkoutId, status, paidAmount, currency, paidAt }}
 */
async function getCheckoutStatus(checkoutId) {
  const data = await twintFetch(`/checkouts/${encodeURIComponent(checkoutId)}`);

  const statusMap = {
    SUCCESS: 'completed',
    FAILURE: 'failed',
    EXPIRED: 'failed',
    PENDING: 'pending',
  };

  return {
    checkoutId,
    status:     statusMap[data.status] ?? 'pending',
    rawStatus:  data.status,
    paidAmount: data.paidAmount  ?? data.requestedAmount,
    currency:   data.currency    ?? 'CHF',
    paidAt:     data.completedAt ?? data.paidAt ?? null,
  };
}

// ─── verifyWebhookSignature ───────────────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature on incoming TWINT webhook notifications.
 *
 * TWINT sends:
 *   Header: X-TWINT-Signature: sha256=<hex>
 *   Body:   JSON payload
 *
 * Secret: TWINT_WEBHOOK_SECRET (generated in TWINT merchant portal)
 *
 * @param {Buffer|string} rawBody
 * @param {string}        signature   — value of X-TWINT-Signature header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.TWINT_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[twint] TWINT_WEBHOOK_SECRET not set — webhook verification skipped');
    return true; // fail-open in dev (should fail-closed in prod)
  }

  const crypto   = require('crypto');
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex')}`;

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature ?? ''),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ─── mapWebhookStatus ─────────────────────────────────────────────────────────

function mapWebhookStatus(twintStatus) {
  const map = {
    SUCCESS: 'completed',
    FAILURE: 'failed',
    EXPIRED: 'failed',
    PENDING: 'pending',
  };
  return map[twintStatus] ?? 'pending';
}

module.exports = {
  createCheckout,
  getCheckoutStatus,
  verifyWebhookSignature,
  mapWebhookStatus,
};
