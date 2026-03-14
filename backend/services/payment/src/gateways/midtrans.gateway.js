/**
 * Midtrans Snap adapter — Indonesia (IDR)
 *
 * Docs:    https://docs.midtrans.com/docs/snap-overview
 * npm:     midtrans-client
 * Sandbox: Set MIDTRANS_SANDBOX_MODE=true — SDK selects sandbox endpoint automatically
 *
 * Supported payment methods:
 *  - GoPay, OVO, ShopeePay (e-wallets)
 *  - QRIS (universal QR)
 *  - Bank Transfer / Virtual Account (BCA, BNI, BRI, Mandiri, Permata)
 *  - Credit/Debit cards (with 3D Secure)
 *
 * Amount convention: IDR has no decimal places — always integer
 *
 * Webhook notification flow:
 *  Midtrans POSTs JSON to MIDTRANS_NOTIFICATION_URL containing:
 *    { order_id, status_code, gross_amount, signature_key, transaction_status, ... }
 *  Signature verification: SHA512(order_id + status_code + gross_amount + serverKey) === signature_key
 */
require('dotenv').config();
const midtransClient = require('midtrans-client');
const crypto         = require('crypto');

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_SANDBOX_MODE !== 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY,
});

// ─── createTransaction ────────────────────────────────────────────────────────

/**
 * Creates a Midtrans Snap transaction.
 * Returns a token for the Snap.js popup or a redirect URL.
 *
 * @param {object} params
 * @param {string} params.bookingId       — used as order_id (must be unique)
 * @param {number} params.amount          — IDR amount (decimal input, rounded to integer)
 * @param {string} [params.currency]      — 'IDR' (Midtrans only supports IDR)
 * @param {string} [params.customerName]
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerPhone]
 *
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
  const grossAmount = Math.round(parseFloat(amount)); // IDR — no decimals
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
      'gopay', 'ovo', 'shopeepay', 'qris',
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

// ─── Notification signature verification ──────────────────────────────────────

/**
 * Verifies the signature_key field in a Midtrans notification body.
 * Must be called on the PARSED body (not raw Buffer).
 *
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
    return false; // length mismatch → invalid
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps Midtrans transaction_status → internal payment_status values.
 * Source: https://docs.midtrans.com/docs/status-cycle-and-status-definition
 */
function mapStatus(midtransStatus) {
  const map = {
    capture:    'completed',  // card payment captured
    settlement: 'completed',  // e-wallet / VA settled
    pending:    'pending',    // awaiting payment (VA unpaid, e-wallet pending)
    deny:       'failed',     // card denied
    cancel:     'failed',     // cancelled by merchant/customer
    expire:     'failed',     // payment window expired
    failure:    'failed',     // general failure
    refund:     'failed',     // refunded (treat as non-active)
    chargeback: 'failed',
  };
  return map[String(midtransStatus).toLowerCase()] || 'pending';
}

module.exports = { createTransaction, verifyNotificationSignature, mapStatus };
