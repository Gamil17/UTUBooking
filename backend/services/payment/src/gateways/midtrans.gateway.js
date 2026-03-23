/**
 * Midtrans Gateway — Indonesia (IDR)
 *
 * Two client modes:
 *  - Snap (midtransClient.Snap):    createTransaction() — popup / redirect flow
 *  - Core API (midtransClient.CoreApi): createDirectCharge() — server-side charge
 *                                       per-method: GoPay, ShopeePay, QRIS, Bank Transfer VA
 *
 * Docs:    https://docs.midtrans.com/docs/snap-overview
 *          https://docs.midtrans.com/reference/charge-transactions-1
 * npm:     midtrans-client
 * Sandbox: Set MIDTRANS_SANDBOX_MODE=true — SDK selects sandbox endpoint automatically
 *
 * Amount convention: IDR has no decimal places — always integer
 *
 * Webhook notification flow:
 *  Midtrans POSTs JSON to MIDTRANS_NOTIFICATION_URL containing:
 *    { order_id, status_code, gross_amount, signature_key, transaction_status, ... }
 *  Signature: SHA512(order_id + status_code + gross_amount + serverKey) === signature_key
 *
 * Redis cache key: payment:midtrans:status:{orderId}  TTL: 30 s
 */

'use strict';

require('dotenv').config();
const midtransClient = require('midtrans-client');
const crypto         = require('crypto');

// ─── Snap client (popup / redirect) ──────────────────────────────────────────

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_SANDBOX_MODE !== 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY,
});

// ─── Core API client (server-side direct charge) ─────────────────────────────

const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_SANDBOX_MODE !== 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY,
});

// ─── Supported direct payment types ──────────────────────────────────────────

const DIRECT_PAYMENT_TYPES = /** @type {const} */ ([
  'gopay',
  'shopeepay',
  'qris',
  'bank_transfer', // bank must be one of: bca | bni | bri
  'mandiri_va',    // Mandiri uses echannel API — aliased for clarity
]);

/** Banks supported via Virtual Account */
const BANK_TRANSFER_BANKS = ['bca', 'bni', 'bri'];

// ─── createTransaction (Snap) ─────────────────────────────────────────────────

/**
 * Creates a Midtrans Snap transaction.
 * Returns a token for the Snap.js popup or a redirect URL.
 *
 * @param {object} params
 * @param {string} params.bookingId
 * @param {number} params.amount          — IDR (rounded to integer)
 * @param {string} [params.currency]      — always 'IDR'
 * @param {string} [params.customerName]
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerPhone]
 * @returns {{ token, redirectUrl, raw }}
 */
async function createTransaction({
  bookingId,
  amount,
  currency = 'IDR',
  customerName,
  customerEmail,
  customerPhone,
}) {
  const grossAmount = Math.round(parseFloat(amount));
  const nameParts   = (customerName || 'UTU Guest').split(' ');

  const parameter = {
    transaction_details: {
      order_id:     bookingId,
      gross_amount: grossAmount,
    },
    item_details: [{
      id:       bookingId,
      price:    grossAmount,
      quantity: 1,
      name:     'Hotel Booking – UTUBooking',
    }],
    customer_details: {
      first_name: nameParts[0],
      last_name:  nameParts.slice(1).join(' ') || 'Guest',
      email:      customerEmail || `booking-${bookingId}@utubooking.com`,
      phone:      customerPhone || '+628000000000',
    },
    enabled_payments: [
      'gopay', 'shopeepay', 'qris',
      'bca_va', 'bni_va', 'bri_va', 'mandiri_bill', 'permata_va',
      'credit_card',
    ],
    callbacks: {
      finish: process.env.MIDTRANS_FINISH_URL,
    },
  };

  const transaction = await snap.createTransaction(parameter);

  return {
    token:       transaction.token,
    redirectUrl: transaction.redirect_url,
    raw:         transaction,
  };
}

// ─── createDirectCharge (Core API) ───────────────────────────────────────────

/**
 * Creates a direct server-side charge for a specific Indonesian payment method.
 *
 * Supported payment_type values:
 *  'gopay'       → returns deeplinkUrl (redirect to GoPay app) + qrUrl
 *  'shopeepay'   → returns deeplinkUrl (redirect to ShopeePay app)
 *  'qris'        → returns qrUrl + qrBase64 (data URI, fetch from Midtrans CDN)
 *  'bank_transfer' + bank='bca'|'bni'|'bri' → returns vaNumber + expiryTime
 *  'mandiri_va'  → returns vaNumber (billerCode + billKey for Mandiri eChanell) + expiryTime
 *
 * @param {object} params
 * @param {string} params.bookingId
 * @param {number} params.amount
 * @param {string} params.paymentType       — see supported types above
 * @param {string} [params.bank]            — required for bank_transfer: 'bca'|'bni'|'bri'
 * @param {string} [params.customerName]
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerPhone]
 * @param {string} [params.gopayCallbackUrl]
 * @returns {Promise<DirectChargeResult>}
 * @throws {Error} if paymentType/bank is unsupported or API call fails
 */
async function createDirectCharge({
  bookingId,
  amount,
  paymentType,
  bank,
  customerName,
  customerEmail,
  customerPhone,
  gopayCallbackUrl,
}) {
  if (!DIRECT_PAYMENT_TYPES.includes(paymentType)) {
    throw new Error(
      `Unsupported paymentType '${paymentType}'. Valid: ${DIRECT_PAYMENT_TYPES.join(', ')}`
    );
  }
  if (paymentType === 'bank_transfer' && !BANK_TRANSFER_BANKS.includes(bank)) {
    throw new Error(
      `bank '${bank}' is not supported for bank_transfer. Valid: ${BANK_TRANSFER_BANKS.join(', ')}`
    );
  }

  const grossAmount = Math.round(parseFloat(amount));
  const nameParts   = (customerName || 'UTU Guest').split(' ');

  // ── Base charge body shared across all payment types ──────────────────────
  const chargeBody = {
    payment_type: paymentType === 'mandiri_va' ? 'echannel' : paymentType,
    transaction_details: {
      order_id:     bookingId,
      gross_amount: grossAmount,
    },
    item_details: [{
      id:       bookingId,
      price:    grossAmount,
      quantity: 1,
      name:     'Hotel Booking – UTUBooking',
    }],
    customer_details: {
      first_name: nameParts[0],
      last_name:  nameParts.slice(1).join(' ') || 'Guest',
      email:      customerEmail || `booking-${bookingId}@utubooking.com`,
      phone:      customerPhone || '+628000000000',
    },
  };

  // ── Payment-type-specific fields ──────────────────────────────────────────

  if (paymentType === 'gopay') {
    chargeBody.gopay = {
      enable_callback: true,
      callback_url:    gopayCallbackUrl || process.env.MIDTRANS_FINISH_URL || '',
    };
  }

  if (paymentType === 'shopeepay') {
    chargeBody.shopeepay = {
      callback_url: process.env.MIDTRANS_FINISH_URL || '',
    };
  }

  if (paymentType === 'bank_transfer') {
    chargeBody.bank_transfer = { bank }; // bca | bni | bri
  }

  if (paymentType === 'mandiri_va') {
    // Mandiri uses eChanell (billing code + bill key)
    chargeBody.echannel = {
      bill_info1: 'Pembayaran UTUBooking',
      bill_info2: `Booking ${bookingId}`,
    };
  }

  // ── Call Core API ─────────────────────────────────────────────────────────

  const raw = await coreApi.charge(chargeBody);

  // ── Build normalised result ───────────────────────────────────────────────

  return _buildDirectChargeResult(raw, paymentType, bank);
}

/**
 * Builds a normalised DirectChargeResult from the Core API response.
 * Handles QR base64 fetch for QRIS asynchronously.
 *
 * @param {object} raw          — Core API charge response
 * @param {string} paymentType
 * @param {string} [bank]
 * @returns {Promise<DirectChargeResult>}
 */
async function _buildDirectChargeResult(raw, paymentType, bank) {
  const base = {
    orderId:     raw.order_id,
    paymentType,
    status:      mapStatus(raw.transaction_status || 'pending'),
    grossAmount: parseInt(raw.gross_amount || 0, 10),
    currency:    'IDR',
    raw,
  };

  // ── GoPay / ShopeePay — deeplink + QR URL ────────────────────────────────
  if (paymentType === 'gopay' || paymentType === 'shopeepay') {
    const actions       = raw.actions || [];
    const deeplinkEntry = actions.find((a) => a.name === 'deeplink-redirect');
    const qrEntry       = actions.find((a) => a.name === 'generate-qr-code');
    return {
      ...base,
      /** Redirect user to this URL to open the GoPay / ShopeePay app */
      deeplinkUrl: deeplinkEntry?.url ?? null,
      /** QR code image URL (for in-browser display) */
      qrUrl:       qrEntry?.url ?? null,
    };
  }

  // ── QRIS — QR code → base64 data URI ─────────────────────────────────────
  if (paymentType === 'qris') {
    const qrUrl    = raw.qr_code_url ?? null;
    const qrBase64 = await _fetchQrBase64(qrUrl);
    return {
      ...base,
      /** QRIS string for custom QR rendering */
      qrString: raw.qr_string ?? null,
      /** Hosted QR image URL from Midtrans CDN */
      qrUrl,
      /** Base64 data URI of the QR image (ready for <img src="..."> on frontend) */
      qrBase64,
      expiryTime: raw.expiry_time ?? null,
    };
  }

  // ── Bank Transfer VA (BCA / BNI / BRI) ────────────────────────────────────
  if (paymentType === 'bank_transfer') {
    const vaEntry = (raw.va_numbers || [])[0] ?? {};
    return {
      ...base,
      bank:       vaEntry.bank ?? bank,
      vaNumber:   vaEntry.va_number ?? null,
      expiryTime: raw.expiry_time ?? null, // 'YYYY-MM-DD HH:mm:ss' WIB
    };
  }

  // ── Mandiri VA (eChanell — billerCode + billKey) ───────────────────────────
  if (paymentType === 'mandiri_va') {
    return {
      ...base,
      bank:        'mandiri',
      billerCode:  raw.biller_code ?? null, // prefix entered on ATM / m-banking
      billKey:     raw.bill_key    ?? null, // suffix (the actual VA number)
      expiryTime:  raw.expiry_time ?? null,
    };
  }

  return base;
}

/**
 * Fetches the QR code image from a Midtrans CDN URL and returns a
 * base64-encoded data URI string (e.g. "data:image/png;base64,...").
 * Returns null on any network / decode failure (non-fatal).
 *
 * @param {string|null} url
 * @returns {Promise<string|null>}
 */
async function _fetchQrBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf      = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get('content-type') || 'image/png';
    return `data:${mimeType};base64,${buf.toString('base64')}`;
  } catch {
    return null; // non-fatal — frontend can fall back to qrUrl
  }
}

// ─── getTransactionStatus ─────────────────────────────────────────────────────

/**
 * Queries the current status of a Midtrans transaction via Core API.
 * Used for the polling endpoint GET /api/payments/midtrans/status/:orderId.
 *
 * @param {string} orderId — the order_id used when the charge was created
 * @returns {Promise<TransactionStatusResult>}
 */
async function getTransactionStatus(orderId) {
  const raw = await coreApi.transaction.status(orderId);

  return {
    orderId:     raw.order_id,
    status:      mapStatus(raw.transaction_status || ''),
    paymentType: raw.payment_type || null,
    fraudStatus: raw.fraud_status || null,
    grossAmount: parseInt(raw.gross_amount || 0, 10),
    currency:    'IDR',
    transactionTime: raw.transaction_time || null,
    settlementTime:  raw.settlement_time  || null,
    raw,
  };
}

// ─── createTransaction ────────────────────────────────────────────────────────
// (already defined above, keep module export clean below)

// ─── Notification signature verification ──────────────────────────────────────

/**
 * Verifies the signature_key field in a Midtrans notification body.
 * Midtrans signature algorithm:
 *   SHA512(orderId + statusCode + grossAmount + serverKey)
 *
 * @param {object} body — parsed JSON notification body
 * @returns {boolean}
 */
function verifyNotificationSignature(body) {
  const { order_id, status_code, gross_amount, signature_key } = body;
  if (!signature_key) return false;

  const expected = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected,      'hex'),
      Buffer.from(signature_key, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps Midtrans transaction_status → internal payment_status values.
 * https://docs.midtrans.com/docs/status-cycle-and-status-definition
 *
 * @param {string} midtransStatus
 * @returns {'completed'|'pending'|'failed'}
 */
function mapStatus(midtransStatus) {
  const map = {
    capture:    'completed',
    settlement: 'completed',
    pending:    'pending',
    deny:       'failed',
    cancel:     'failed',
    expire:     'failed',
    failure:    'failed',
    refund:     'failed',
    chargeback: 'failed',
  };
  return map[String(midtransStatus).toLowerCase()] || 'pending';
}

module.exports = {
  createTransaction,
  createDirectCharge,
  getTransactionStatus,
  verifyNotificationSignature,
  mapStatus,
  DIRECT_PAYMENT_TYPES,
  BANK_TRANSFER_BANKS,
};
