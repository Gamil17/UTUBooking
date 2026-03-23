/**
 * Razorpay gateway — India + Bangladesh (INR)
 *
 * Docs:    https://razorpay.com/docs/api
 * npm:     npm install razorpay
 * Auth:    HMAC-SHA256 (order signature for client, webhook secret for server)
 *
 * Supported payment methods (all handled by Razorpay Checkout modal):
 *   UPI        — VPA (user@upi, mobile@paytm, etc.) + deeplinks for GPay/PhonePe/Paytm
 *   NetBanking — HDFC, SBI, ICICI, Axis, Kotak (+ 100 other banks)
 *   Cards      — RuPay, Visa, Mastercard (3DS mandatory)
 *   EMI        — 3/6/9/12-month options for orders ≥ ₹3,000
 *   Wallets    — PayZapp, Mobikwik
 *
 * Flow:
 *  1. Server: createOrder()        → Razorpay order_id
 *  2. Frontend: Razorpay Checkout  → razorpay_payment_id + razorpay_signature
 *  3. Server: verifyPaymentSignature() → mark completed
 *  4. Razorpay webhook: verifyWebhookSignature() → authoritative update
 *
 * Env vars required:
 *   RAZORPAY_KEY_ID        — public key (rzp_test_* / rzp_live_*)
 *   RAZORPAY_KEY_SECRET    — private key
 *   RAZORPAY_WEBHOOK_SECRET — webhook HMAC secret (set in Razorpay dashboard)
 *   RAZORPAY_SANDBOX_MODE  — 'true' uses test credentials
 */

'use strict';
require('dotenv').config();

const Razorpay = require('razorpay');
const crypto   = require('crypto');

// ── Client ────────────────────────────────────────────────────────────────────

function _client() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMI_MIN_INR = 3000;           // minimum order amount to show EMI options
const EMI_TENORS  = [3, 6, 9, 12]; // months
const EMI_APR     = 0.15;           // 15% p.a. approximate (Razorpay shows bank-specific)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** INR decimal → Razorpay paise integer: 8400.00 → 840000 */
function _toPaise(amount) {
  return Math.round(parseFloat(amount) * 100);
}

/** Razorpay receipt string ≤ 40 chars */
function _makeReceipt(bookingId) {
  const ts  = Date.now().toString(36).slice(-6);
  const bid = String(bookingId).replace(/-/g, '').slice(0, 28);
  return `utu_${bid}_${ts}`.slice(0, 40);
}

// ── createOrder ───────────────────────────────────────────────────────────────

/**
 * Creates a Razorpay Order.
 * The returned orderId + keyId are passed to the Razorpay Checkout widget.
 *
 * @param {object} p
 * @param {string}  p.bookingId
 * @param {number}  p.amount     — INR (e.g. 8400.00)
 * @param {string}  [p.currency] — defaults to 'INR'
 * @param {object}  [p.notes]    — extra metadata stored on the Razorpay order
 *
 * @returns {Promise<{ orderId, keyId, amountPaise, currency, emiOptions, receipt, raw }>}
 */
async function createOrder({ bookingId, amount, currency = 'INR', notes = {} }) {
  const order = await _client().orders.create({
    amount:          _toPaise(amount),
    currency,
    receipt:         _makeReceipt(bookingId),
    notes:           { bookingId: String(bookingId), ...notes },
    payment_capture: 1,   // auto-capture on payment
  });

  return {
    orderId:     order.id,
    keyId:       process.env.RAZORPAY_KEY_ID,
    amountPaise: order.amount,
    currency:    order.currency,
    receipt:     order.receipt,
    emiOptions:  getEmiOptions(amount),
    raw:         order,
  };
}

// ── verifyPaymentSignature ────────────────────────────────────────────────────

/**
 * Verifies the signature Razorpay Checkout sends back to the frontend.
 * MUST be called server-side — never expose RAZORPAY_KEY_SECRET to the browser.
 *
 * Algorithm: HMAC-SHA256(key=KEY_SECRET, msg=orderId + '|' + paymentId)
 *
 * @param {{ orderId: string, paymentId: string, signature: string }} p
 * @returns {boolean}
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const secret   = process.env.RAZORPAY_KEY_SECRET;
  const message  = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

// ── verifyWebhookSignature ────────────────────────────────────────────────────

/**
 * Verifies the X-Razorpay-Signature header on inbound webhook POST.
 *
 * ⚠️  rawBody must be the Buffer/string BEFORE JSON.parse — use express.raw() on
 *     the webhook route. See payment.router.js for setup.
 *
 * Algorithm: HMAC-SHA256(key=WEBHOOK_SECRET, msg=rawBody)
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[razorpay] RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

// ── fetchPayment ──────────────────────────────────────────────────────────────

/** Fetch a Razorpay payment object by payment_id */
async function fetchPayment(paymentId) {
  return _client().payments.fetch(paymentId);
}

// ── mapStatus ─────────────────────────────────────────────────────────────────

/**
 * Maps Razorpay payment status → internal payment status.
 * Full status list: https://razorpay.com/docs/api/payments/#payment-states
 */
function mapStatus(razorpayStatus) {
  switch (String(razorpayStatus)) {
    case 'captured':   return 'completed';
    case 'authorized': return 'pending';    // authorized but not captured yet
    case 'created':    return 'pending';
    case 'failed':     return 'failed';
    case 'refunded':   return 'refunded';
    default:           return 'pending';
  }
}

// ── EMI helpers ───────────────────────────────────────────────────────────────

/**
 * Returns EMI breakdown options for the given INR amount.
 * Returns [] when amount < ₹3,000 (Razorpay/bank minimum).
 * Uses 15% p.a. flat rate as an approximation — actual rates vary by bank.
 *
 * @param {number} amountInr
 * @returns {{ months, monthlyAmount, totalAmount, labelEn, labelHi }[]}
 */
function getEmiOptions(amountInr) {
  const amt = parseFloat(amountInr);
  if (!Number.isFinite(amt) || amt < EMI_MIN_INR) return [];

  const monthlyRate = EMI_APR / 12;
  return EMI_TENORS.map(months => {
    const emi     = amt * monthlyRate * Math.pow(1 + monthlyRate, months) /
                    (Math.pow(1 + monthlyRate, months) - 1);
    const monthly = Math.ceil(emi);
    return {
      months,
      monthlyAmount: monthly,
      totalAmount:   monthly * months,
      labelEn:       `${months} months × ${formatInr(monthly)}/mo`,
      labelHi:       `${months} महीने × ${formatInr(monthly)}/माह`,
    };
  });
}

// ── UPI helpers ───────────────────────────────────────────────────────────────

/**
 * Validates a UPI VPA (Virtual Payment Address).
 * Format: user@provider   e.g. 9876543210@paytm, name@oksbi, user@upi
 */
function isValidUpiVpa(vpa) {
  return /^[a-zA-Z0-9._+\-]{2,256}@[a-zA-Z]{2,64}$/.test((vpa ?? '').trim());
}

/**
 * Generates UPI intent deeplinks for the three major Indian UPI apps.
 * These links open the app directly; the user confirms the payment there.
 *
 * @param {{ vpa, amount, txnRef, merchantName? }} p
 * @returns {{ phonepe, gpay, paytm, generic }}
 */
function getUpiDeeplinks({ vpa, amount, txnRef, merchantName = 'UTUBooking' }) {
  const pa = encodeURIComponent(vpa);
  const am = parseFloat(amount).toFixed(2);
  const tn = encodeURIComponent(`UTU-${txnRef}`);
  const pn = encodeURIComponent(merchantName);

  return {
    phonepe: `phonepe://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`,
    gpay:    `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`,
    paytm:   `paytmmp://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`,
    generic: `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`,
  };
}

// ── INR formatting ────────────────────────────────────────────────────────────

/**
 * Format INR with Indian number grouping (lakh/crore): ₹12,34,567
 * NOT Western grouping: ₹1,234,567 — that is incorrect for India.
 */
function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  mapStatus,
  getEmiOptions,
  isValidUpiVpa,
  getUpiDeeplinks,
  formatInr,
  EMI_MIN_INR,
  EMI_TENORS,
};
