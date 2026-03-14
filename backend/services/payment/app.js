require('dotenv').config();
const express      = require('express');
const paymentRouter = require('./src/routes/payment.router');
const errorHandler  = require('./src/middleware/errorHandler');

const app = express();

/**
 * ⚠  RAW BODY ROUTES — must come BEFORE express.json()
 *
 * Stripe, Moyasar, and STC Pay webhook verification requires the raw request
 * body (Buffer). express.raw() provides this. JSON parsing is done inside
 * the respective webhook auth middleware after signature verification.
 */
const RAW_BODY      = express.raw({ type: 'application/json', limit: '64kb' });
const URLENC_BODY   = express.urlencoded({ extended: false, limit: '64kb' });

app.use('/api/payments/webhook',              RAW_BODY);     // STC Pay
app.use('/api/payments/mada/webhook',         RAW_BODY);     // Moyasar
app.use('/api/payments/stripe/webhook',       RAW_BODY);     // Stripe

// iyzico callback + iPay88 response send URL-encoded form data (browser redirects)
app.use('/api/payments/iyzico/callback',      URLENC_BODY);  // iyzico 3DS redirect
app.use('/api/payments/ipay88/response',      URLENC_BODY);  // iPay88 BackendURL / ResponseURL

// All other routes use JSON parsing
app.use(express.json({ limit: '64kb' }));

// ─── Content-Type guard for non-webhook / non-form POSTs ─────────────────────
app.use((req, res, next) => {
  const skipPaths = ['/webhook', '/callback', '/response', '/notification'];
  const isExempt  = skipPaths.some((p) => req.path.endsWith(p));
  if (!isExempt && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(415).json({
        error:   'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
      });
    }
  }
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'payment-service', ts: new Date().toISOString() })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/payments', paymentRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
