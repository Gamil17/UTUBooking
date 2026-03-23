/**
 * Easypaisa adapter — Pakistan (PKR)
 *
 * Docs:    https://developer.easypaisa.com.pk
 * Auth:    SHA256 hash (merchantHashedReq) — no HMAC, plain hash of colon-delimited fields
 * Product: Mobile Account Payment (MA) — 40M+ Telenor users
 *
 * Flow (Web Checkout redirect):
 *  1. Server: initiatePayment() → returns { paymentUrl, formParams }
 *  2. Frontend: POST formParams to paymentUrl (form redirect)
 *     Easypaisa shows payment page; customer confirms via OTP on Telenor number
 *  3. Easypaisa POSTs result to postBackURL (server) and redirects browser
 *  4. Server: verifyCallbackHash() → update booking status
 *
 * Mobile Account Direct API (MA_Pay) — server-to-server:
 *  1. initiateAccountPayment() → POST to Easypaisa API with mobileNumber
 *  2. Customer receives OTP on Telenor number, enters in UTU checkout UI
 *  3. confirmOtp() → completes the transaction
 *  4. Webhook fires to postBackURL with final status
 *
 * Amount convention: PKR with 2 decimal places ("8400.00")
 *
 * Env vars required:
 *   EASYPAISA_STORE_ID         — Merchant store ID from Easypaisa portal
 *   EASYPAISA_ACCOUNT_NUMBER   — Merchant Easypaisa account number (11 digits)
 *   EASYPAISA_HASH_KEY         — Merchant password / hash key from portal
 *   EASYPAISA_POSTBACK_URL     — POST endpoint for payment callbacks
 *   EASYPAISA_SANDBOX_MODE     — 'true' for sandbox (default true)
 */

'use strict';
require('dotenv').config();

const crypto = require('crypto');

// ── Endpoints ──────────────────────────────────────────────────────────────────
const CHECKOUT_URL_SANDBOX = 'https://sandbox.easypaisa.com.pk/easypay-service/rest/v4/initiate-transaction';
const CHECKOUT_URL_PROD    = 'https://easypaisa.com.pk/easypay-service/rest/v4/initiate-transaction';

const STATUS_URL_SANDBOX   = 'https://sandbox.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction';
const STATUS_URL_PROD      = 'https://easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction';

function _checkoutUrl() { return process.env.EASYPAISA_SANDBOX_MODE === 'false' ? CHECKOUT_URL_PROD   : CHECKOUT_URL_SANDBOX; }
function _statusUrl()   { return process.env.EASYPAISA_SANDBOX_MODE === 'false' ? STATUS_URL_PROD     : STATUS_URL_SANDBOX; }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** PKR amount → fixed 2 decimal string: 8400 → '8400.00' */
function _toAmountStr(amount) {
  return parseFloat(amount).toFixed(2);
}

/** Order reference: EP + YYYYMMDDHHmmss + 4-random-digits */
function _makeOrderRef() {
  const dt  = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `EP${dt}${rnd}`;
}

/** Expiry: 30 minutes from now as ISO datetime string */
function _expiryDateTime(minutesFromNow = 30) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Easypaisa merchant hash.
 *
 * Algorithm (per Easypaisa Integration Guide v4):
 *   SHA256(storeId:amount:postBackURL:orderRefNum:expiryDate:autoAcceptOffer:storePassword)
 *   All fields colon-delimited, NO spaces, NO trailing colon.
 */
function _buildMerchantHash({ storeId, amount, postBackURL, orderRefNum, expiryDate, autoAcceptOffer }) {
  const password = process.env.EASYPAISA_HASH_KEY;
  const raw = [storeId, amount, postBackURL, orderRefNum, expiryDate, autoAcceptOffer, password].join(':');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── initiatePayment (Web Checkout redirect) ───────────────────────────────────

/**
 * Builds Easypaisa Web Checkout parameters.
 * The frontend POSTs formParams to paymentUrl as application/x-www-form-urlencoded.
 *
 * @param {object} p
 * @param {string}  p.bookingId       — unique booking ID
 * @param {number}  p.amount          — PKR amount (e.g. 8400)
 * @param {string}  [p.mobileNumber]  — optional, pre-fills customer mobile
 * @param {string}  [p.description]   — payment description
 *
 * @returns {{ paymentUrl, formParams, orderRef }}
 */
function initiatePayment({ bookingId, amount, mobileNumber, description }) {
  const storeId     = process.env.EASYPAISA_STORE_ID;
  const postBackURL = process.env.EASYPAISA_POSTBACK_URL;
  const orderRef    = _makeOrderRef();
  const amountStr   = _toAmountStr(amount);
  const expiryDate  = _expiryDateTime(30);

  const merchantHashedReq = _buildMerchantHash({
    storeId,
    amount:          amountStr,
    postBackURL,
    orderRefNum:     orderRef,
    expiryDate,
    autoAcceptOffer: '0',
  });

  const formParams = {
    storeId,
    orderId:            orderRef,
    transactionAmount:  amountStr,
    mobileNum:          mobileNumber ?? '',
    emailAddress:       '',
    transactionType:    'MA',              // Mobile Account
    tokenExpiry:        expiryDate,
    bankIdentificationCode: 'EPBL',
    encryptedHashRequest: merchantHashedReq,
    merchantPaymentMethod: 'MA',
    postBackURL,
    recurringTransaction: '0',
    description:        description || `UTUBooking #${bookingId}`,
  };

  return {
    paymentUrl: _checkoutUrl(),
    formParams,
    orderRef,
    raw: formParams,
  };
}

// ── initiateAccountPayment (server-to-server MA_Pay) ─────────────────────────

/**
 * Server-initiated Mobile Account payment.
 * Use when you want a direct API call instead of redirect — Easypaisa sends
 * OTP to customer's Telenor number; customer enters OTP in your checkout UI.
 *
 * @param {object} p
 * @param {string}  p.bookingId
 * @param {number}  p.amount          — PKR
 * @param {string}  p.mobileNumber    — customer Telenor number '03001234567'
 * @param {string}  [p.description]
 *
 * @returns {Promise<{ orderRef, status, otpRequired, easypaisaResponse, raw }>}
 */
async function initiateAccountPayment({ bookingId, amount, mobileNumber, description }) {
  const storeId       = process.env.EASYPAISA_STORE_ID;
  const accountNumber = process.env.EASYPAISA_ACCOUNT_NUMBER;
  const postBackURL   = process.env.EASYPAISA_POSTBACK_URL;
  const orderRef      = _makeOrderRef();
  const amountStr     = _toAmountStr(amount);
  const expiryDate    = _expiryDateTime(10);

  const merchantHashedReq = _buildMerchantHash({
    storeId,
    amount:          amountStr,
    postBackURL,
    orderRefNum:     orderRef,
    expiryDate,
    autoAcceptOffer: '0',
  });

  const payload = {
    storeId,
    accountNum:           accountNumber,
    mobileNum:            mobileNumber,
    amount:               amountStr,
    emailAddress:         '',
    orderRefNum:          orderRef,
    transactionType:      'MA',
    tokenExpiry:          expiryDate,
    merchantHashedReq,
    postBackURL,
    bankIdentificationCode: 'EPBL',
    description:          description || `UTUBooking #${bookingId}`,
  };

  const res = await fetch(_checkoutUrl(), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Credentials:    Buffer.from(`${storeId}:${process.env.EASYPAISA_HASH_KEY}`).toString('base64'),
    },
    body:   JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`Easypaisa API error ${res.status}`), { httpStatus: res.status, body: text });
  }

  const data = await res.json();

  // responseCode '0000' = OTP sent, waiting for customer confirmation
  return {
    orderRef,
    status:            mapStatus(data.responseCode),
    otpRequired:       data.responseCode === '0000',
    responseCode:      data.responseCode,
    responseMessage:   data.responseDesc ?? '',
    easypaisaResponse: data,
    raw:               { payload, response: data },
  };
}

// ── getTransactionStatus ──────────────────────────────────────────────────────

/**
 * Polls Easypaisa for the current status of a transaction.
 *
 * @param {string} orderRef — orderRefNum from initiatePayment / initiateAccountPayment
 * @returns {Promise<{ orderRef, status, responseCode, responseMessage, raw }>}
 */
async function getTransactionStatus(orderRef) {
  const storeId  = process.env.EASYPAISA_STORE_ID;
  const password = process.env.EASYPAISA_HASH_KEY;

  const payload = {
    storeId,
    orderRefNum: orderRef,
    transactionType: 'MA',
  };

  const res = await fetch(_statusUrl(), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Credentials:    Buffer.from(`${storeId}:${password}`).toString('base64'),
    },
    body:   JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`Easypaisa status API error ${res.status}`), { httpStatus: res.status, body: text });
  }

  const data = await res.json();

  return {
    orderRef,
    status:          mapStatus(data.responseCode),
    responseCode:    data.responseCode,
    responseMessage: data.responseDesc ?? '',
    raw:             data,
  };
}

// ── verifyCallbackHash ────────────────────────────────────────────────────────

/**
 * Verifies the encryptedHashRequest in an Easypaisa callback POST body.
 * Same SHA256 hash algorithm used for payment initiation.
 *
 * @param {object} body — parsed body from Easypaisa callback
 * @returns {boolean}
 */
function verifyCallbackHash(body) {
  const received = body.encryptedHashRequest ?? body.merchantHashedReq;
  if (!received) return false;

  const expected = _buildMerchantHash({
    storeId:         body.storeId       ?? process.env.EASYPAISA_STORE_ID,
    amount:          body.transactionAmount ?? body.amount,
    postBackURL:     process.env.EASYPAISA_POSTBACK_URL,
    orderRefNum:     body.orderRefNumber ?? body.orderId ?? body.orderRefNum,
    expiryDate:      body.tokenExpiry   ?? '',
    autoAcceptOffer: body.recurringTransaction ?? '0',
  });

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
 * Maps Easypaisa responseCode → internal payment status.
 * Full code list: Easypaisa Integration Guide §Response Codes
 */
function mapStatus(responseCode) {
  const code = String(responseCode ?? '');
  // Success
  if (code === '0000') return 'completed';
  // Pending / OTP awaiting
  const pending = ['0001', '0002', '1002', '0161'];
  if (pending.includes(code)) return 'pending';
  // All other codes → failed
  return 'failed';
}

module.exports = {
  initiatePayment,
  initiateAccountPayment,
  getTransactionStatus,
  verifyCallbackHash,
  mapStatus,
};
