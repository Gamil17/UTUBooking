/**
 * Webhook signature verification middleware.
 *
 * Stripe requires the raw body Buffer — this middleware MUST run AFTER
 * express.raw(), not express.json().
 *
 * STC Pay and Moyasar also use HMAC-SHA256 over the raw body.
 * The raw body is attached to req by express.raw() as req.body (Buffer).
 */
const stcpay  = require('../gateways/stcpay.gateway');
const moyasar = require('../gateways/moyasar.gateway');
const stripe  = require('../gateways/stripe.gateway');

// ─── STC Pay webhook auth ─────────────────────────────────────────────────────
function stcpayWebhookAuth(req, res, next) {
  const signature = req.headers['x-stcpay-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'MISSING_SIGNATURE' });
  }

  const rawBody = req.body; // Buffer from express.raw()
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'Expected raw body.' });
  }

  const valid = stcpay.verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    console.warn('[stcpay-webhook] invalid signature — rejecting');
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }

  // Attach parsed body for the controller
  try {
    req.webhookPayload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'INVALID_JSON' });
  }

  next();
}

// ─── Moyasar webhook auth ─────────────────────────────────────────────────────
function moyasarWebhookAuth(req, res, next) {
  const signature = req.headers['x-moyasar-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'MISSING_SIGNATURE' });
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'INVALID_BODY' });
  }

  const valid = moyasar.verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    console.warn('[moyasar-webhook] invalid signature — rejecting');
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }

  try {
    req.webhookPayload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'INVALID_JSON' });
  }

  next();
}

// ─── Stripe webhook auth ──────────────────────────────────────────────────────
function stripeWebhookAuth(req, res, next) {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'MISSING_SIGNATURE' });
  }

  let event;
  try {
    event = stripe.constructWebhookEvent(req.body, signature); // req.body is Buffer
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed:', err.message);
    return res.status(401).json({ error: 'INVALID_SIGNATURE', message: err.message });
  }

  req.stripeEvent = event;
  next();
}

module.exports = { stcpayWebhookAuth, moyasarWebhookAuth, stripeWebhookAuth };
