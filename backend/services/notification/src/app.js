'use strict';

const express        = require('express');
const adminRouter    = require('./routes/admin.router');
const internalRouter = require('./routes/internal.router');
const { processWebhookEvents } = require('./lib/sendgrid');
const repo           = require('./db/notification.repo');

const app = express();

app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service', ts: new Date().toISOString() });
});

// ── SendGrid event webhook ────────────────────────────────────────────────────
// Raw body needed for HMAC signature verification — no auth middleware here,
// signature checked inside the handler.
app.post('/api/v1/notifications/webhook/sendgrid', async (req, res) => {
  try {
    const secret    = process.env.SENDGRID_WEBHOOK_SECRET ?? '';
    const signature = req.headers['x-twilio-email-event-webhook-signature'] ?? '';
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] ?? '';

    // Verify signature if secret is configured (skip in dev)
    if (secret && process.env.NODE_ENV === 'production') {
      const { EventWebhook } = require('@sendgrid/event-webhook');
      const ew = new EventWebhook();
      const ecPublicKey = ew.convertPublicKeyToECDH(secret);
      const isValid = ew.verifySignature(ecPublicKey, JSON.stringify(req.body), signature, timestamp);
      if (!isValid) return res.status(403).json({ error: 'INVALID_SIGNATURE' });
    }

    await processWebhookEvents(req.body, repo);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[webhook/sendgrid]', err.message);
    res.status(500).json({ error: 'WEBHOOK_ERROR' });
  }
});

// ── Admin routes (/api/admin/notifications/*) ─────────────────────────────────
app.use('/api/admin/notifications', adminRouter);

// ── Internal trigger routes (/internal/*) ────────────────────────────────────
app.use('/internal', internalRouter);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[notification-service] error:', err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

module.exports = app;
