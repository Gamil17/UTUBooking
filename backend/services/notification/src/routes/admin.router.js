'use strict';

const express  = require('express');
const adminAuth = require('../middleware/adminAuth');
const repo     = require('../db/notification.repo');
const { notificationQueue } = require('../jobs/queue');

const router = express.Router();
router.use(adminAuth);

// ─── Incomplete Bookings ────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications/incomplete-bookings
 * Paginated list of pending bookings >1 day old with email send counts.
 * Query params: page, limit
 */
router.get('/incomplete-bookings', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));

    const [{ results, total }, stats] = await Promise.all([
      repo.listIncompleteBookings({ page, limit }),
      repo.getIncompleteBookingStats(),
    ]);

    // Normalise field names to match frontend IncompleteBookingRow interface
    const data = results.map((r) => ({
      ...r,
      name_en:     r.customer_name ?? null,
      email_count: r.recovery_emails_sent ?? 0,
      suppressed:  r.is_suppressed ?? false,
    }));

    res.json({ data, total, stats, page, limit });
  } catch (err) {
    console.error('[admin] incomplete-bookings error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

// ─── Email Log ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications/email-log
 * Filterable email history.
 * Query params: page, limit, emailType, deliveryStatus, bookingRef
 */
router.get('/email-log', async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit   = Math.min(100, parseInt(req.query.limit || '50', 10));
    const filters = {
      emailType:      req.query.emailType      || null,
      deliveryStatus: req.query.deliveryStatus || null,
      bookingRef:     req.query.bookingRef     || null,
    };

    const { results, total } = await repo.listEmailLog({ page, limit, ...filters });
    res.json({ data: results, total, page, limit });
  } catch (err) {
    console.error('[admin] email-log error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

// ─── Suppressions ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications/suppressions
 * Query: page, limit, active (true|false), email, suppressionType
 */
router.get('/suppressions', async (req, res) => {
  try {
    const page           = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit          = Math.min(100, parseInt(req.query.limit || '50', 10));
    const suppressionType = req.query.suppressionType || null;
    const email          = req.query.email           || null;
    const active         = req.query.active === 'true'  ? true
                         : req.query.active === 'false' ? false
                         : undefined;

    const { rows, total } = await repo.listSuppressions({ page, limit, active, email, suppressionType });
    res.json({ data: rows, total, page, limit });
  } catch (err) {
    console.error('[admin] suppressions list error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * POST /api/admin/notifications/suppress
 * Body: { userId, bookingId?, reason }
 */
router.post('/suppress', async (req, res) => {
  try {
    const { userId, bookingId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'MISSING_FIELD', message: 'userId required' });

    const row = await repo.createSuppression({
      userId,
      bookingId:    bookingId || null,
      reason:       reason   || 'manual',
      suppressedBy: 'admin',
    });
    res.status(201).json({ data: row });
  } catch (err) {
    console.error('[admin] suppress error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * POST /api/admin/notifications/suppress/:id/lift
 */
router.post('/suppress/:id/lift', async (req, res) => {
  try {
    const lifted = await repo.liftSuppression(req.params.id);
    if (!lifted) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] lift-suppress error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

// ─── Manual Trigger ─────────────────────────────────────────────────────────

/**
 * POST /api/admin/notifications/trigger-recovery
 * Body: { bookingId }
 * Bypasses 23h rate-limit timer — immediate send.
 */
router.post('/trigger-recovery', async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'MISSING_FIELD', message: 'bookingId required' });

    const job = await notificationQueue.add(
      'trigger-abandoned-booking',
      { bookingId },
      { attempts: 1, removeOnComplete: true },
    );
    res.json({ queued: true, jobId: job.id });
  } catch (err) {
    console.error('[admin] trigger-recovery error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

// ─── Campaigns ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications/campaigns
 * Query params: page, limit, status
 */
router.get('/campaigns', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const status = req.query.status || null;

    const { results, total } = await repo.listCampaigns({ page, limit, status });
    res.json({ data: results, total, page, limit });
  } catch (err) {
    console.error('[admin] campaigns list error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * GET /api/admin/notifications/campaigns/audience-estimate?segment=<JSON>
 * Returns estimated recipient count for a given target_segment without sending.
 */
router.get('/campaigns/audience-estimate', async (req, res) => {
  try {
    const { pool: pgPool } = require('../db/pg');
    let segment = null;
    if (req.query.segment) {
      try { segment = JSON.parse(req.query.segment); } catch { return res.status(400).json({ error: 'INVALID_SEGMENT_JSON' }); }
    }

    // Base: all active users not globally suppressed
    let query = `
      SELECT u.id, u.country_code,
             la.tier AS loyalty_tier,
             MAX(b.created_at) AS last_booking_date
      FROM users u
      LEFT JOIN loyalty_accounts la ON la.user_id = u.id
      LEFT JOIN bookings b ON b.user_id = u.id
      WHERE u.is_active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM email_suppressions es
          WHERE es.user_id = u.id AND es.booking_id IS NULL AND es.lifted_at IS NULL
        )
      GROUP BY u.id, la.tier
    `;
    const { rows: users } = await pgPool.query(query);

    let filtered = users;
    if (segment) {
      if (segment.countries?.length)
        filtered = filtered.filter(u => segment.countries.includes(u.country_code));
      if (segment.loyalty_tiers?.length)
        filtered = filtered.filter(u => segment.loyalty_tiers.includes(u.loyalty_tier));
      if (segment.min_days_since_booking != null || segment.max_days_since_booking != null) {
        filtered = filtered.filter(u => {
          const days = u.last_booking_date
            ? Math.floor((Date.now() - new Date(u.last_booking_date)) / 86400000)
            : Infinity;
          const min = segment.min_days_since_booking ?? 0;
          const max = segment.max_days_since_booking ?? Infinity;
          return days >= min && days <= max;
        });
      }
    }
    res.json({ estimated_recipients: filtered.length });
  } catch (err) {
    console.error('[admin] audience-estimate error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * POST /api/admin/notifications/campaigns
 * Body: { name, subjectEn, subjectAr?, scheduledFor?, dealItems?, targetSegment? }
 */
router.post('/campaigns', async (req, res) => {
  try {
    const { name, subjectEn, subjectAr, scheduledFor, dealItems, targetSegment } = req.body;
    if (!name || !subjectEn) {
      return res.status(400).json({ error: 'MISSING_FIELD', message: 'name and subjectEn required' });
    }

    const campaign = await repo.createCampaign({
      name,
      subjectEn,
      subjectAr:     subjectAr     || null,
      scheduledFor:  scheduledFor  || null,
      dealItems:     dealItems     || [],
      targetSegment: targetSegment || null,
      createdBy:     'admin',
    });
    res.status(201).json({ data: campaign });
  } catch (err) {
    console.error('[admin] campaigns create error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * POST /api/admin/notifications/campaigns/:id/duplicate
 * Clone a campaign as a new draft.
 */
router.post('/campaigns/:id/duplicate', async (req, res) => {
  try {
    const existing = await repo.getCampaignById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });

    const copy = await repo.duplicateCampaign(req.params.id);
    res.status(201).json({ data: copy });
  } catch (err) {
    console.error('[admin] campaigns duplicate error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * POST /api/admin/notifications/campaigns/:id/send
 * Trigger immediate dispatch — sets scheduled_for = NOW so the 5-min cron picks it up instantly.
 */
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const existing = await repo.getCampaignById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });

    await repo.updateCampaignStatus(req.params.id, 'scheduled', {
      scheduledFor: new Date(),
    });

    // Also enqueue immediately rather than waiting up to 5 minutes
    await notificationQueue.add('dispatch-campaigns', {}, { attempts: 1, removeOnComplete: true });

    const updated = await repo.getCampaignById(req.params.id);
    res.json({ data: updated, queued: true });
  } catch (err) {
    console.error('[admin] campaigns send error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * DELETE /api/admin/notifications/campaigns/:id
 * Cancels a draft or scheduled campaign (not already sending/sent).
 */
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const cancelled = await repo.cancelCampaign(req.params.id);
    if (!cancelled) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] campaigns delete error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * GET /api/admin/notifications/campaigns/:id/stats
 * Extended metrics: open rate, CTR, CTOR, delivery rate, send duration, segment summary.
 */
router.get('/campaigns/:id/stats', async (req, res) => {
  try {
    const { pool } = require('../db/pg');
    const { rows } = await pool.query(
      `SELECT id, name, status, target_segment,
         total_recipients, sent_count, failed_count, opened_count, click_count,
         scheduled_for, started_at, completed_at, created_at
       FROM email_campaigns WHERE id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const c = rows[0];
    const sent     = c.sent_count   || 0;
    const opened   = c.opened_count || 0;
    const clicked  = c.click_count  || 0;
    const total    = c.total_recipients || sent;
    const duration = (c.started_at && c.completed_at)
      ? Math.round((new Date(c.completed_at) - new Date(c.started_at)) / 1000)
      : null;

    const round1 = (n) => Math.round(n * 10) / 10;

    res.json({ data: {
      ...c,
      open_rate_pct:          round1(sent   ? (opened  / sent)  * 100 : 0),
      click_rate_pct:         round1(sent   ? (clicked / sent)  * 100 : 0),
      click_to_open_rate_pct: round1(opened ? (clicked / opened) * 100 : 0),
      delivery_rate_pct:      round1(total  ? (sent    / total)  * 100 : 0),
      send_duration_seconds:  duration,
      segment_summary:        c.target_segment ?? null,
    }});
  } catch (err) {
    console.error('[admin] campaigns stats error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

// ─── Email Templates ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications/templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await repo.listTemplates();
    res.json({ data: templates });
  } catch (err) {
    console.error('[admin] templates list error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * POST /api/admin/notifications/templates
 * Body: { name, description?, subjectEn, subjectAr?, htmlEn, htmlAr?, variables? }
 */
router.post('/templates', async (req, res) => {
  try {
    const { name, description, subjectEn, subjectAr, htmlEn, htmlAr, variables } = req.body ?? {};
    if (!name || !subjectEn || !htmlEn) {
      return res.status(400).json({ error: 'MISSING_FIELD', message: 'name, subjectEn and htmlEn required' });
    }
    const template = await repo.createTemplate({ name, description, subjectEn, subjectAr, htmlEn, htmlAr, variables });
    res.status(201).json({ data: template });
  } catch (err) {
    console.error('[admin] templates create error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * GET /api/admin/notifications/templates/:id
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await repo.getTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: template });
  } catch (err) {
    console.error('[admin] templates get error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * PATCH /api/admin/notifications/templates/:id
 */
router.patch('/templates/:id', async (req, res) => {
  try {
    const updated = await repo.updateTemplate(req.params.id, req.body ?? {});
    if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: updated });
  } catch (err) {
    console.error('[admin] templates update error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * DELETE /api/admin/notifications/templates/:id
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const deleted = await repo.deleteTemplate(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ ok: true });
  } catch (err) {
    if (err.message === 'TEMPLATE_IN_USE') {
      return res.status(409).json({ error: 'TEMPLATE_IN_USE', message: 'Cannot delete a template used by sent campaigns' });
    }
    console.error('[admin] templates delete error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

// ─── Send one-off email to a specific customer ──────────────────────────────

/**
 * POST /api/admin/notifications/send-to-user
 * Body: { email, name, subject, bodyHtml }
 *
 * Sends a custom transactional email to one customer and logs it.
 * All fields required. bodyHtml is the full HTML body.
 */
router.post('/send-to-user', async (req, res) => {
  const { email, name, subject, bodyHtml } = req.body ?? {};

  if (!email || !subject || !bodyHtml) {
    return res.status(400).json({
      error:   'MISSING_FIELDS',
      message: 'email, subject, and bodyHtml are required',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'INVALID_EMAIL' });
  }

  const { pool } = require('../db/pg');
  const sendgrid = require('../lib/sendgrid');

  try {
    const { messageId } = await sendgrid.send({
      to:         email,
      subject,
      html:       bodyHtml,
      categories: ['admin-manual'],
    });

    // Log to email_log so it appears in the email log dashboard
    await pool.query(
      `INSERT INTO email_log
         (recipient_email, email_type, subject, delivery_status, message_id, created_at)
       VALUES ($1, 'admin_manual', $2, 'sent', $3, NOW())`,
      [email.toLowerCase(), subject, messageId ?? null],
    ).catch((err) => console.error('[send-to-user] email_log insert failed:', err.message));

    return res.json({ ok: true, messageId: messageId ?? null });
  } catch (err) {
    console.error('[send-to-user] sendgrid error:', err.message);
    return res.status(502).json({ error: 'SEND_FAILED', message: err.message });
  }
});

module.exports = router;
