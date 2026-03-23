/**
 * JazzCash adapter — Pakistan (PKR)
 *
 * Docs:    https://sandbox.jazzcash.com.pk/ApplicationAPI
 * Auth:    HMAC-SHA256 secure hash (pp_IntegritySalt as key)
 * Product: Mobile Wallet (MPAY) — 60M+ users on Jazz/Mobilink network
 *
 * Flow:
 *  1. Server: initiateMobileWalletPayment() → POST to JazzCash API
 *  2. JazzCash sends OTP / push to customer's JazzCash app
 *  3. Customer confirms in app with PIN
 *  4. JazzCash POSTs result to pp_ReturnURL (webhook)
 *  5. Server: verifyCallbackSignature() → update booking status
 *
 * Amount convention: paise (no decimal) — 100 PKR → "10000"
 * Ref format: T + YYYYMMDDHHmmss + 6-random-digits (JazzCash requirement)
 *
 * Env vars required:
 *   JAZZCASH_MERCHANT_ID      — Merchant account ID from JazzCash portal
 *   JAZZCASH_PASSWORD         — API password from portal
 *   JAZZCASH_INTEGRITY_SALT   — HMAC secret from portal
 *   JAZZCASH_RETURN_URL       — POST endpoint for payment callbacks
 *   JAZZCASH_SANDBOX_MODE     — 'true' for sandbox (default true)
 */

'use strict';
require('dotenv').config();

const crypto = require('crypto');

// ── Endpoints ──────────────────────────────────────────────────────────────────
const API_URL_SANDBOX = 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';
const API_URL_PROD    = 'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';

const STATUS_URL_SANDBOX = 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire';
const STATUS_URL_PROD    = 'https://payments.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire';

function _apiUrl()    { return process.env.JAZZCASH_SANDBOX_MODE === 'false' ? API_URL_PROD    : API_URL_SANDBOX; }
function _statusUrl() { return process.env.JAZZCASH_SANDBOX_MODE === 'false' ? STATUS_URL_PROD : STATUS_URL_SANDBOX; }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** PKR amount → JazzCash paise string: 250.00 → '25000' */
function _toPaise(amount) {
  return Math.round(parseFloat(amount) * 100).toString();
}

/** pp_TxnRefNo: T + YYYYMMDDHHmmss + 6-digit random */
function _makeTxnRef() {
  const now = new Date();
  const dt  = now.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `T${dt}${rnd}`;
}

/** Expiry timestamp 1 hour from now in YYYYMMDDHHmmss format */
function _expiryDateTime(hoursFromNow = 1) {
  const d = new Date(Date.now() + hoursFromNow * 3_600_000);
  return d.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
}

/**
 * JazzCash HMAC-SHA256 secure hash.
 *
 * Algorithm (per official JazzCash PHP SDK):
 *   1. Collect all pp_ params EXCEPT pp_SecureHash
 *   2. Skip empty values
 *   3. Sort by key (ksort)
 *   4. Concatenate: SALT & val1 & val2 & ...
 *   5. HMAC-SHA256(key=SALT, message=above) → uppercase hex
 */
function _buildSecureHash(params) {
  const salt = process.env.JAZZCASH_INTEGRITY_SALT;
  const sortedKeys = Object.keys(params).sort();

  const parts = [salt];
  for (const key of sortedKeys) {
    const val = params[key];
    if (val !== '' && val !== null && val !== undefined) {
      parts.push(String(val));
    }
  }

  const message = parts.join('&');
  return crypto.createHmac('sha256', salt).update(message).digest('hex').toUpperCase();
}

// ── initiateMobileWalletPayment ───────────────────────────────────────────────

/**
 * Initiates a JazzCash Mobile Wallet payment (MPAY).
 * Customer receives OTP/push in JazzCash app; confirms with PIN.
 *
 * @param {object} p
 * @param {string}  p.bookingId       — unique booking ID (used in description)
 * @param {number}  p.amount          — PKR amount (e.g. 8400)
 * @param {string}  p.mobileNumber    — customer's Jazz mobile: '03001234567'
 * @param {string}  [p.description]   — shown in JazzCash confirmation screen
 *
 * @returns {Promise<{ txnRefNo, status, jazzCashResponse, raw }>}
 */
async function initiateMobileWalletPayment({ bookingId, amount, mobileNumber, description }) {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password   = process.env.JAZZCASH_PASSWORD;
  const returnUrl  = process.env.JAZZCASH_RETURN_URL;

  const txnRefNo = _makeTxnRef();
  const txnAmt   = _toPaise(amount);
  const txnDt    = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const expiryDt = _expiryDateTime(1);

  // pp_ params for signature (exclude pp_SecureHash)
  const params = {
    pp_Version:            '1.1',
    pp_TxnType:            'MPAY',
    pp_Language:           'EN',
    pp_MerchantID:         merchantId,
    pp_SubMerchantID:      '',
    pp_Password:           password,
    pp_BankID:             'TBANK',
    pp_ProductID:          'RETL',
    pp_TxnRefNo:           txnRefNo,
    pp_Amount:             txnAmt,
    pp_TxnCurrency:        'PKR',
    pp_TxnDateTime:        txnDt,
    pp_BillReference:      `BILL-${bookingId}`,
    pp_Description:        description || `UTUBooking #${bookingId}`,
    pp_TxnExpiryDateTime:  expiryDt,
    pp_ReturnURL:          returnUrl,
    pp_MobileNumber:       mobileNumber,
  };

  const pp_SecureHash = _buildSecureHash(params);
  const payload = { ...params, pp_SecureHash };

  const res = await fetch(_apiUrl(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`JazzCash API error ${res.status}`), { httpStatus: res.status, body: text });
  }

  const data = await res.json();

  // pp_ResponseCode '000' = success, '157' = wallet blocked, '121' = invalid mobile, etc.
  return {
    txnRefNo,
    status:            mapStatus(data.pp_ResponseCode),
    responseCode:      data.pp_ResponseCode,
    responseMessage:   data.pp_ResponseMessage ?? '',
    jazzCashResponse:  data,
    raw:               { payload, response: data },
  };
}

// ── getTransactionStatus ──────────────────────────────────────────────────────

/**
 * Polls JazzCash for the current status of a transaction.
 *
 * @param {string} txnRefNo — pp_TxnRefNo from initiateMobileWalletPayment
 * @returns {Promise<{ txnRefNo, status, responseCode, responseMessage, raw }>}
 */
async function getTransactionStatus(txnRefNo) {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password   = process.env.JAZZCASH_PASSWORD;

  const params = {
    pp_Version:     '1.1',
    pp_TxnType:     'MPAY',
    pp_Language:    'EN',
    pp_MerchantID:  merchantId,
    pp_Password:    password,
    pp_TxnRefNo:    txnRefNo,
  };
  const pp_SecureHash = _buildSecureHash(params);
  const payload = { ...params, pp_SecureHash };

  const res = await fetch(_statusUrl(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`JazzCash status API error ${res.status}`), { httpStatus: res.status, body: text });
  }

  const data = await res.json();

  return {
    txnRefNo,
    status:          mapStatus(data.pp_ResponseCode),
    responseCode:    data.pp_ResponseCode,
    responseMessage: data.pp_ResponseMessage ?? '',
    raw:             data,
  };
}

// ── verifyCallbackSignature ───────────────────────────────────────────────────

/**
 * Verifies the pp_SecureHash in a JazzCash callback POST body.
 * Same HMAC algorithm used for requests.
 *
 * @param {object} body — parsed JSON/form body from JazzCash callback
 * @returns {boolean}
 */
function verifyCallbackSignature(body) {
  const received = body.pp_SecureHash;
  if (!received) return false;

  const { pp_SecureHash: _sig, ...params } = body;
  const expected = _buildSecureHash(params);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(received,  'utf8'),
    );
  } catch {
    return false;
  }
}

// ── mapStatus ─────────────────────────────────────────────────────────────────

/**
 * Maps JazzCash pp_ResponseCode → internal payment status.
 * Full code list: JazzCash Developer Guide §Response Codes
 */
function mapStatus(responseCode) {
  const code = String(responseCode ?? '');
  if (code === '000') return 'completed';

  // User-pending states — waiting for customer to confirm in app
  const pending = ['001', '002', '101', '111', '153'];
  if (pending.includes(code)) return 'pending';

  // All other codes → failed
  return 'failed';
}

// ── formatPkr ─────────────────────────────────────────────────────────────────

/**
 * Format a PKR amount for display.
 * Pakistan uses standard Western grouping (NOT Indian lakh/crore).
 * Use Intl.NumberFormat for correct locale rendering in the frontend.
 */
function formatPkr(amount) {
  return `PKR ${Number(amount).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

module.exports = {
  initiateMobileWalletPayment,
  getTransactionStatus,
  verifyCallbackSignature,
  mapStatus,
  formatPkr,
};
