/**
 * PayPal Orders API v2 Gateway
 *
 * Uses @paypal/checkout-server-sdk (PayPal Node.js SDK).
 * npm install @paypal/checkout-server-sdk
 *
 * Flow:
 *   1. createOrder()    → { orderId, approveUrl }  (customer approves at approveUrl)
 *   2. captureOrder()   → { orderId, status, captureId, amount, currency }
 *   3. refund()         → { refundId, status, amount }
 *
 * Webhook events (subscribe in PayPal Developer Dashboard):
 *   PAYMENT.CAPTURE.COMPLETED  → 'completed'
 *   PAYMENT.CAPTURE.DENIED     → 'failed'
 *   PAYMENT.CAPTURE.REFUNDED   → 'refunded'
 *
 * Env vars:
 *   PAYPAL_CLIENT_ID      from PayPal Developer Dashboard
 *   PAYPAL_CLIENT_SECRET  from PayPal Developer Dashboard
 *   PAYPAL_ENV            'sandbox' | 'live'  (default: 'sandbox')
 *   PAYPAL_WEBHOOK_ID     from PayPal Developer Dashboard → Webhooks
 */

'use strict';

const checkoutSdk = require('@paypal/checkout-server-sdk');

// ─── SDK client (singleton) ───────────────────────────────────────────────────

let _client = null;

function _getClient() {
  if (_client) return _client;

  const clientId     = process.env.PAYPAL_CLIENT_ID     ?? '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? '';
  const env          = process.env.PAYPAL_ENV === 'live'
    ? new checkoutSdk.core.LiveEnvironment(clientId, clientSecret)
    : new checkoutSdk.core.SandboxEnvironment(clientId, clientSecret);

  _client = new checkoutSdk.core.PayPalHttpClient(env);
  return _client;
}

// ─── createOrder ─────────────────────────────────────────────────────────────

/**
 * Create a PayPal order for a booking.
 *
 * @param {object} params
 * @param {string} params.bookingId   Internal booking UUID
 * @param {number} params.amount      Amount in major currency units (e.g. 45.00)
 * @param {string} params.currency    ISO 4217 (USD, EUR, GBP, etc.)
 * @param {string} params.description Human-readable line item description
 * @param {string} params.returnUrl   Where PayPal redirects on approval
 * @param {string} params.cancelUrl   Where PayPal redirects on cancellation
 *
 * @returns {Promise<{ orderId: string, approveUrl: string, status: string }>}
 */
async function createOrder({ bookingId, amount, currency = 'USD', description, returnUrl, cancelUrl }) {
  const request = new checkoutSdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id:  bookingId,
      description:   description ?? `UTUBooking reservation ${bookingId}`,
      custom_id:     bookingId,
      amount: {
        currency_code: currency.toUpperCase(),
        value:         parseFloat(amount).toFixed(2),
      },
    }],
    application_context: {
      brand_name:          'UTUBooking',
      landing_page:        'NO_PREFERENCE',
      user_action:         'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
      return_url:          returnUrl ?? `${process.env.FRONTEND_URL}/booking/confirm`,
      cancel_url:          cancelUrl ?? `${process.env.FRONTEND_URL}/booking/cancel`,
    },
  });

  let res;
  try {
    res = await _getClient().execute(request);
  } catch (err) {
    throw new PayPalGatewayError(
      err.message ?? 'PayPal createOrder failed',
      err.statusCode ?? 502,
      err,
    );
  }

  const order = res.result;
  const approveLink = order.links?.find((l) => l.rel === 'approve');

  return {
    orderId:    order.id,
    approveUrl: approveLink?.href ?? null,
    status:     order.status,   // 'CREATED'
    raw:        order,
  };
}

// ─── captureOrder ─────────────────────────────────────────────────────────────

/**
 * Capture a previously-approved PayPal order.
 * Called after the customer approves at the PayPal redirect URL.
 *
 * @param {string} orderId  The PayPal order ID from createOrder()
 * @returns {Promise<{ orderId, captureId, status, amount, currency }>}
 */
async function captureOrder(orderId) {
  const request = new checkoutSdk.orders.OrdersCaptureRequest(orderId);
  request.prefer('return=representation');
  request.requestBody({});

  let res;
  try {
    res = await _getClient().execute(request);
  } catch (err) {
    throw new PayPalGatewayError(
      err.message ?? 'PayPal captureOrder failed',
      err.statusCode ?? 502,
      err,
    );
  }

  const order   = res.result;
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

  if (!capture) {
    throw new PayPalGatewayError('No capture found in PayPal response', 502, order);
  }

  return {
    orderId:   order.id,
    captureId: capture.id,
    status:    _mapStatus(order.status),  // 'COMPLETED' → 'completed'
    amount:    parseFloat(capture.amount?.value ?? 0),
    currency:  capture.amount?.currency_code ?? 'USD',
    raw:       order,
  };
}

// ─── refund ──────────────────────────────────────────────────────────────────

/**
 * Refund a PayPal capture (full or partial).
 *
 * @param {string} captureId  The capture ID from captureOrder()
 * @param {object} [opts]
 * @param {number} [opts.amount]   Partial refund amount (omit for full refund)
 * @param {string} [opts.currency]
 * @param {string} [opts.note]    Reason shown to customer
 *
 * @returns {Promise<{ refundId, status, amount, currency }>}
 */
async function refund(captureId, opts = {}) {
  const request = new checkoutSdk.payments.CapturesRefundRequest(captureId);
  request.prefer('return=representation');

  const body = {};
  if (opts.amount) {
    body.amount = {
      value:         parseFloat(opts.amount).toFixed(2),
      currency_code: (opts.currency ?? 'USD').toUpperCase(),
    };
  }
  if (opts.note) {
    body.note_to_payer = opts.note.substring(0, 255);
  }
  request.requestBody(body);

  let res;
  try {
    res = await _getClient().execute(request);
  } catch (err) {
    throw new PayPalGatewayError(
      err.message ?? 'PayPal refund failed',
      err.statusCode ?? 502,
      err,
    );
  }

  const refundResult = res.result;
  return {
    refundId: refundResult.id,
    status:   _mapStatus(refundResult.status),
    amount:   parseFloat(refundResult.amount?.value ?? opts.amount ?? 0),
    currency: refundResult.amount?.currency_code ?? opts.currency ?? 'USD',
    raw:      refundResult,
  };
}

// ─── verifyWebhookSignature ───────────────────────────────────────────────────

/**
 * Verify a PayPal webhook payload via PayPal's own verification endpoint.
 * Called in paypal.controller.js before processing any webhook.
 *
 * @param {object} params
 * @param {string} params.authAlgo         PAYPAL-AUTH-ALGO header
 * @param {string} params.certUrl          PAYPAL-CERT-URL header
 * @param {string} params.transmissionId   PAYPAL-TRANSMISSION-ID header
 * @param {string} params.transmissionSig  PAYPAL-TRANSMISSION-SIG header
 * @param {string} params.transmissionTime PAYPAL-TRANSMISSION-TIME header
 * @param {object} params.webhookEvent     Parsed JSON body
 *
 * @returns {Promise<boolean>} true if valid
 */
async function verifyWebhookSignature({
  authAlgo,
  certUrl,
  transmissionId,
  transmissionSig,
  transmissionTime,
  webhookEvent,
}) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID ?? '';
  if (!webhookId) {
    console.warn('[paypal-gateway] PAYPAL_WEBHOOK_ID not set — skipping verification');
    return true; // non-fatal for dev; fatal in prod (block in controller)
  }

  const request    = new checkoutSdk.notifications.VerifyWebhookSignatureRequest();
  request.requestBody({
    auth_algo:          authAlgo,
    cert_url:           certUrl,
    transmission_id:    transmissionId,
    transmission_sig:   transmissionSig,
    transmission_time:  transmissionTime,
    webhook_id:         webhookId,
    webhook_event:      webhookEvent,
  });

  try {
    const res = await _getClient().execute(request);
    return res.result?.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('[paypal-gateway] webhook verification error:', err.message);
    return false;
  }
}

// ─── Status mapper ────────────────────────────────────────────────────────────

/**
 * Map PayPal order/capture status to UTUBooking internal status.
 */
function _mapStatus(paypalStatus) {
  switch (String(paypalStatus).toUpperCase()) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'completed';
    case 'CREATED':
    case 'SAVED':
    case 'PAYER_ACTION_REQUIRED':
      return 'pending';
    case 'VOIDED':
    case 'DENIED':
    case 'CANCELLED':
      return 'failed';
    case 'PENDING_REFUND':
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'refunded';
    default:
      return 'pending';
  }
}

// ─── Webhook event type mapper ─────────────────────────────────────────────────

/**
 * Map a PayPal webhook event_type to UTUBooking internal status.
 */
function mapWebhookStatus(eventType) {
  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED':     return 'completed';
    case 'PAYMENT.CAPTURE.DENIED':        return 'failed';
    case 'PAYMENT.CAPTURE.REFUNDED':      return 'refunded';
    case 'PAYMENT.CAPTURE.REVERSED':      return 'failed';
    case 'PAYMENT.CAPTURE.PENDING':       return 'pending';
    case 'CHECKOUT.ORDER.APPROVED':       return 'pending';  // needs capture
    case 'CHECKOUT.ORDER.COMPLETED':      return 'completed';
    default:                               return null;       // ignore unknown events
  }
}

// ─── Error type ───────────────────────────────────────────────────────────────

class PayPalGatewayError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'PayPalGatewayError';
    this.statusCode = statusCode;
    this.status     = statusCode;
    this.raw        = raw;
  }
}

module.exports = {
  createOrder,
  captureOrder,
  refund,
  verifyWebhookSignature,
  mapWebhookStatus,
  _mapStatus,        // exported for unit tests
  PayPalGatewayError,
};
