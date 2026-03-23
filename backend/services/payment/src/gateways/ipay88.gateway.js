/**
 * iPay88 adapter — Malaysia (MYR)
 *
 * Docs:    https://developer.ipay88.com.my
 * No npm package — uses SHA256 form-POST redirect pattern
 *
 * Supported payment methods (PaymentId):
 *   2  = Maybank2U
 *   6  = MEPS FPX (all banks)
 *   16 = Hong Leong Bank Transfer
 *   48 = DuitNow QR
 *   52 = Touch 'n Go eWallet
 *   10 = Credit Card (Visa/Mastercard)
 *   blank = show all available methods
 *
 * Amount convention: MYR decimal (e.g. "250.00") — remove decimal for signature
 *
 * Flow:
 *  1. Server: initiatePayment() → returns { paymentUrl, formParams }
 *  2. Frontend: POST formParams to paymentUrl (form redirect or fetch)
 *     iPay88 shows payment page; customer pays
 *  3. iPay88 POSTs to BackendURL (silent) and ResponseURL (browser)
 *     with Signature in the body — we verify in the response handler
 *
 * Signature algorithm (for both request and response):
 *   SHA256(MerchantKey + MerchantCode + RefNo + Amount_no_dot + Currency)
 *   Amount_no_dot: "250.00" → "25000"
 */
require('dotenv').config();
const crypto = require('crypto');

const PAYMENT_URL_PROD    = 'https://payment.ipay88.com.my/epayment/entry.asp';
const PAYMENT_URL_SANDBOX = 'https://sandbox.ipay88.com.my/epayment/entry.asp';

// Malaysian-specific payment method IDs (PaymentId)
const IPAY88_PAYMENT_METHODS = {
  FPX_MAYBANK: '2',   // Maybank2u — most popular
  FPX_CIMB:    '523', // CIMB Clicks
  FPX_PUBLIC:  '10',  // Public Bank
  CREDIT_CARD: '1',   // Visa/MC/Amex
  DUITNOW_QR:  '523', // DuitNow QR — instant mobile payment
  TNG_EWALLET: '538', // Touch 'n Go eWallet
  GRABPAY:     '523', // GrabPay MY
  BOOST:       '538', // Boost eWallet
};

// MYR pricing format: RM 1,234.56 (NOT MYR or M$)
function formatMyr(amount, locale = 'en') {
  const formatted = Number(amount).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return locale === 'ms' ? `RM ${formatted}` : formatted;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Builds the iPay88 SHA256 signature.
 * Amount must be converted to string without decimal separator:
 *   100.00 → "10000",  1250.50 → "125050"
 */
function _buildSignature({ merchantKey, merchantCode, refNo, amount, currency }) {
  const amountStr = parseFloat(amount).toFixed(2).replace('.', ''); // "10000"
  const payload   = `${merchantKey}${merchantCode}${refNo}${amountStr}${currency}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ─── initiatePayment ──────────────────────────────────────────────────────────

/**
 * Builds iPay88 payment form parameters.
 * The frontend must POST these fields to paymentUrl.
 *
 * @param {object} params
 * @param {string} params.bookingId       — RefNo (unique per transaction)
 * @param {number} params.amount          — MYR decimal (e.g. 250.00)
 * @param {string} [params.currency]      — 'MYR' (default)
 * @param {string} [params.customerName]
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerPhone]
 * @param {string} [params.remark]        — shown on iPay88 payment page
 * @param {string} [params.paymentId]     — '' for all methods, or specific ID
 *
 * @returns {{ paymentUrl, formParams, signature, raw }}
 */
function initiatePayment({
  bookingId,
  amount,
  currency = 'MYR',
  customerName,
  customerEmail,
  customerPhone,
  remark,
  paymentId = '',
}) {
  const merchantKey  = process.env.IPAY88_MERCHANT_KEY;
  const merchantCode = process.env.IPAY88_MERCHANT_CODE;
  const signature    = _buildSignature({ merchantKey, merchantCode, refNo: bookingId, amount, currency });

  const formParams = {
    MerchantCode: merchantCode,
    PaymentId:    paymentId,      // blank = show all
    RefNo:        bookingId,
    Amount:       parseFloat(amount).toFixed(2),
    Currency:     currency,
    ProdDesc:     remark || 'Hotel Booking – UTUBooking',
    UserName:     customerName  || 'UTU Guest',
    UserEmail:    customerEmail || `booking-${bookingId}@utubooking.com`,
    UserContact:  customerPhone || '',
    Remark:       '',
    Lang:         'UTF-8',
    Signature:    signature,
    ResponseURL:  process.env.IPAY88_RESPONSE_URL,   // browser redirect after payment
    BackendURL:   process.env.IPAY88_BACKEND_URL,    // silent server-to-server POST
  };

  const paymentUrl = process.env.IPAY88_SANDBOX_MODE === 'true'
    ? PAYMENT_URL_SANDBOX
    : PAYMENT_URL_PROD;

  return { paymentUrl, formParams, signature, raw: formParams };
}

// ─── Response / Backend notification verification ─────────────────────────────

/**
 * Verifies the Signature field in an iPay88 response / backend POST body.
 * iPay88 uses the same SHA256 formula for both request and response signatures.
 *
 * @param {object} body — parsed URL-encoded body from iPay88 callback
 * @returns {boolean}
 */
function verifyResponseSignature(body) {
  const { MerchantCode, RefNo, Amount, Currency, Signature: receivedSig } = body;

  if (!receivedSig || !MerchantCode || !RefNo || !Amount || !Currency) {
    return false;
  }

  const expected = _buildSignature({
    merchantKey:  process.env.IPAY88_MERCHANT_KEY,
    merchantCode: MerchantCode,
    refNo:        RefNo,
    amount:       Amount,
    currency:     Currency,
  });

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected,     'hex'),
      Buffer.from(receivedSig,  'hex')
    );
  } catch {
    return false; // hex length mismatch → invalid
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps iPay88 Status field → internal payment_status values.
 * Source: iPay88 Developer Guide § Transaction Status
 *
 * Status "1" = success, "0" = failed
 */
function mapStatus(ipay88Status) {
  const map = {
    '1':  'completed',
    '0':  'failed',
    '-1': 'failed',    // in-progress / user abandoned
  };
  return map[String(ipay88Status)] || 'pending';
}

module.exports = {
  initiatePayment,
  verifyResponseSignature,
  mapStatus,
  IPAY88_PAYMENT_METHODS,
  formatMyr,
};
