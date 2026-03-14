/**
 * iyzico Checkout Form adapter — Turkey (TRY)
 *
 * Docs:    https://dev.iyzipay.com  (English)
 * npm:     iyzipay
 * Sandbox: Set IYZICO_SANDBOX_MODE=true — uses sandbox-api.iyzipay.com
 *
 * Flow:
 *  1. Server: initiatePayment() → returns { token, checkoutFormContent }
 *  2. Frontend: embed checkoutFormContent (iyzico inline JS) in page
 *     iyzico handles 3D Secure internally inside the form
 *  3. After 3DS, iyzico POSTs token to IYZICO_CALLBACK_URL (browser redirect)
 *  4. Server: retrievePaymentResult(token) → get final payment status
 *
 * Amount convention: iyzico uses TRY as a decimal string (e.g. "250.00")
 */
require('dotenv').config();
const Iyzipay = require('iyzipay');

const iyzipay = new Iyzipay({
  apiKey:    process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: process.env.IYZICO_SANDBOX_MODE === 'true'
    ? 'https://sandbox-api.iyzipay.com'
    : 'https://api.iyzipay.com',
});

// ─── initiatePayment ──────────────────────────────────────────────────────────

/**
 * Creates an iyzico checkout form session.
 *
 * @param {object} params
 * @param {string} params.bookingId      — used as conversationId + orderId
 * @param {number} params.amount         — TRY amount as decimal (e.g. 1250.00)
 * @param {string} [params.currency]     — 'TRY' (default)
 * @param {string} [params.buyerEmail]
 * @param {string} [params.buyerName]    — full name, space-separated
 * @param {string} [params.buyerIp]
 *
 * @returns {{ token, checkoutFormContent, raw }}
 */
async function initiatePayment({
  bookingId,
  amount,
  currency = 'TRY',
  buyerEmail,
  buyerName,
  buyerIp,
}) {
  const price      = parseFloat(amount).toFixed(2);
  const nameParts  = (buyerName || 'UTU Guest').split(' ');
  const firstName  = nameParts[0];
  const lastName   = nameParts.slice(1).join(' ') || 'Guest';

  const request = {
    locale:          Iyzipay.LOCALE.TR,
    conversationId:  bookingId,
    price,
    paidPrice:       price,
    currency:        Iyzipay.CURRENCY[currency] || Iyzipay.CURRENCY.TRY,
    basketId:        bookingId,
    paymentGroup:    Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl:     process.env.IYZICO_CALLBACK_URL,
    enabledInstallments: [1, 2, 3, 6],

    buyer: {
      id:                  buyerEmail || `booking-${bookingId}`,
      name:                firstName,
      surname:             lastName,
      gsmNumber:           '+905350000000',
      email:               buyerEmail || `booking-${bookingId}@utubooking.com`,
      identityNumber:      '74300864791',       // required; placeholder for non-citizen
      registrationAddress: 'N/A',
      ip:                  buyerIp || '127.0.0.1',
      city:                'Istanbul',
      country:             'Turkey',
    },

    shippingAddress: {
      contactName: buyerName || 'UTU Guest',
      city:        'Istanbul',
      country:     'Turkey',
      address:     'N/A',
    },

    billingAddress: {
      contactName: buyerName || 'UTU Guest',
      city:        'Istanbul',
      country:     'Turkey',
      address:     'N/A',
    },

    basketItems: [{
      id:       bookingId,
      name:     'Hotel Booking – UTUBooking',
      category1: 'Travel',
      itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
      price,
    }],
  };

  return new Promise((resolve, reject) => {
    iyzipay.checkoutFormInitialize.create(request, (err, result) => {
      if (err) return reject(err);
      if (result.status !== 'success') {
        return reject(
          new Error(`iyzico initiatePayment failed: ${result.errorMessage} (code ${result.errorCode})`)
        );
      }
      resolve({
        token:               result.token,
        checkoutFormContent: result.checkoutFormContent,
        raw:                 result,
      });
    });
  });
}

// ─── retrievePaymentResult ────────────────────────────────────────────────────

/**
 * Retrieves the final payment result for a token received at the callback URL.
 * Call this after iyzico POSTs the token to IYZICO_CALLBACK_URL.
 *
 * @param {string} token — received in POST body from iyzico callback
 * @returns {{ iyzicoStatus, paymentId, conversationId, raw }}
 */
async function retrievePaymentResult(token) {
  return new Promise((resolve, reject) => {
    iyzipay.checkoutForm.retrieve(
      { locale: Iyzipay.LOCALE.TR, token },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          iyzicoStatus:   result.paymentStatus || result.status,
          paymentId:      result.paymentId,
          conversationId: result.conversationId,
          raw:            result,
        });
      }
    );
  });
}

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps iyzico paymentStatus strings → internal payment_status values.
 */
function mapStatus(iyzicoStatus) {
  const map = {
    SUCCESS:          'completed',
    FAILURE:          'failed',
    INIT_THREEDS:     'pending',    // 3DS initiated — not yet confirmed
    CALLBACK_THREEDS: 'pending',    // 3DS callback — wait for retrieve
    PENDING:          'pending',
  };
  return map[String(iyzicoStatus).toUpperCase()] || 'pending';
}

module.exports = { initiatePayment, retrievePaymentResult, mapStatus };
