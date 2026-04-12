'use strict';

const express          = require('express');
const adminRouter      = require('./routes/admin.router');
const internalRouter   = require('./routes/internal.router');
const workflowRouter   = require('./routes/workflow.router');
const { processWebhookEvents } = require('./lib/sendgrid');
const repo             = require('./db/notification.repo');
const { pool }         = require('./db/pg');

const app = express();

// ── Bootstrap: idempotent schema additions ────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS target_segment  JSONB        DEFAULT NULL;
    ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS click_count     INT          NOT NULL DEFAULT 0;
    ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS template_id     UUID         DEFAULT NULL;
    ALTER TABLE email_log       ADD COLUMN IF NOT EXISTS clicked_at      TIMESTAMPTZ  DEFAULT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      name        TEXT        NOT NULL,
      description TEXT,
      subject_en  TEXT        NOT NULL,
      subject_ar  TEXT,
      html_en     TEXT        NOT NULL,
      html_ar     TEXT,
      variables   JSONB       NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Seed default templates if none exist
  const { rows } = await pool.query('SELECT COUNT(*) FROM email_templates');
  if (parseInt(rows[0].count) === 0) {
    const TEMPLATE_VARS = JSON.stringify(['user.name', 'campaign.name', 'deals', 'unsubscribe_url']);
    const digestHtmlEn = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f1f5f9;padding:32px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px"><h1 style="color:#1E3A5F">{{campaign.name}}</h1><p>Hello {{user.name}},</p><p>Check out this month's best deals:</p>{{#each deals}}<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0"><strong>{{this.title_en}}</strong><br/>{{this.destination}} &mdash; <strong>{{this.price}} {{this.currency}}</strong><br/><a href="{{this.cta_url}}" style="color:#2563EB">Book Now</a></div>{{/each}}<p style="font-size:12px;color:#94a3b8;margin-top:32px"><a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></body></html>`;
    const digestHtmlAr = `<!DOCTYPE html><html dir="rtl"><body style="font-family:sans-serif;background:#f1f5f9;padding:32px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px"><h1 style="color:#1E3A5F">{{campaign.name}}</h1><p>مرحباً {{user.name}}،</p><p>إليك أفضل عروض هذا الشهر:</p>{{#each deals}}<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0"><strong>{{this.title_ar}}</strong><br/>{{this.destination}} &mdash; <strong>{{this.price}} {{this.currency}}</strong><br/><a href="{{this.cta_url}}" style="color:#2563EB">احجز الآن</a></div>{{/each}}<p style="font-size:12px;color:#94a3b8;margin-top:32px"><a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div></body></html>`;
    const promoHtmlEn = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f1f5f9;padding:32px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center"><h1 style="color:#1E3A5F">{{campaign.name}}</h1><p style="font-size:18px;color:#334155">Hello {{user.name}}</p><p style="color:#475569">{{deals.[0].title_en}}</p><p style="font-size:24px;font-weight:bold;color:#1E3A5F">{{deals.[0].price}} {{deals.[0].currency}}</p><a href="{{deals.[0].cta_url}}" style="display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Book Now</a><p style="font-size:12px;color:#94a3b8;margin-top:32px"><a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></body></html>`;
    const promoHtmlAr = `<!DOCTYPE html><html dir="rtl"><body style="font-family:sans-serif;background:#f1f5f9;padding:32px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center"><h1 style="color:#1E3A5F">{{campaign.name}}</h1><p style="font-size:18px;color:#334155">مرحباً {{user.name}}</p><p style="color:#475569">{{deals.[0].title_ar}}</p><p style="font-size:24px;font-weight:bold;color:#1E3A5F">{{deals.[0].price}} {{deals.[0].currency}}</p><a href="{{deals.[0].cta_url}}" style="display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">احجز الآن</a><p style="font-size:12px;color:#94a3b8;margin-top:32px"><a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div></body></html>`;

    await pool.query(
      `INSERT INTO email_templates (name, description, subject_en, subject_ar, html_en, html_ar, variables) VALUES
       ($1,$2,$3,$4,$5,$6,$7),
       ($8,$9,$10,$11,$12,$13,$14)`,
      [
        'monthly_deal_digest', 'Monthly deal newsletter with a grid of hotel/flight offers',
        'Exclusive Deals Just for You — UTUBooking', 'عروض حصرية لك — UTUBooking',
        digestHtmlEn, digestHtmlAr, TEMPLATE_VARS,
        'promotional_announcement', 'Single-CTA promotional email for a specific offer',
        'A Special Offer from UTUBooking', 'عرض خاص من UTUBooking',
        promoHtmlEn, promoHtmlAr, TEMPLATE_VARS,
      ],
    );
    console.log('[notification] seeded 2 default email templates');
  }
}
bootstrap().catch((err) => console.error('[notification] bootstrap error:', err.message));

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

    // Require secret in production — missing secret is a misconfiguration, not a skip
    if (process.env.NODE_ENV === 'production' && !secret) {
      console.error('[webhook/sendgrid] SENDGRID_WEBHOOK_SECRET is not set in production');
      return res.status(500).json({ error: 'WEBHOOK_NOT_CONFIGURED' });
    }
    // Verify signature when secret is present
    if (secret) {
      const { EventWebhook } = require('@sendgrid/eventwebhook');
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

// ── Click tracking redirect (/track/click) ───────────────────────────────────
// Public — no auth. Validates lid UUID, records click, then redirects to url.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get('/track/click', async (req, res) => {
  const { lid, url } = req.query;
  if (!lid || !url || !UUID_RE.test(lid)) {
    return res.status(400).json({ error: 'INVALID_PARAMS' });
  }
  let destination;
  try { destination = decodeURIComponent(url); } catch { return res.status(400).json({ error: 'INVALID_URL' }); }

  try {
    await repo.recordClick(lid);
  } catch (err) {
    console.error('[track/click] recordClick failed:', err.message);
    // Still redirect even if tracking fails
  }
  res.redirect(302, destination);
});

// ── Admin routes (/api/admin/notifications/*) ─────────────────────────────────
app.use('/api/admin/notifications', adminRouter);

// ── Workflow notification route (/api/notifications/send) ────────────────────
// Called by the workflow engine (port 3014) to send transactional emails.
// Auth: x-admin-secret header (service-to-service).
app.use('/api/notifications', workflowRouter);

// ── Internal trigger routes (/internal/*) ────────────────────────────────────
app.use('/internal', internalRouter);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[notification-service] error:', err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
});

module.exports = app;
