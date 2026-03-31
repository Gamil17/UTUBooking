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

    const [rows, stats] = await Promise.all([
      repo.listIncompleteBookings({ page, limit }),
      repo.getIncompleteBookingStats(),
    ]);

    res.json({ data: rows, stats, page, limit });
  } catch (err) {
    console.error('[admin] incomplete-bookings error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
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

    const rows = await repo.listEmailLog({ page, limit, filters });
    res.json({ data: rows, page, limit });
  } catch (err) {
    console.error('[admin] email-log error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ─── Suppressions ───────────────────────────────────────────────────────────

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
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/admin/notifications/suppress/:id/lift
 */
router.post('/suppress/:id/lift', async (req, res) => {
  try {
    const row = await repo.liftSuppression(req.params.id);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: row });
  } catch (err) {
    console.error('[admin] lift-suppress error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
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
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
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

    const rows = await repo.listCampaigns({ page, limit, status });
    res.json({ data: rows, page, limit });
  } catch (err) {
    console.error('[admin] campaigns list error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/admin/notifications/campaigns
 * Body: { name, subjectEn, subjectAr?, scheduledFor?, dealItems? }
 */
router.post('/campaigns', async (req, res) => {
  try {
    const { name, subjectEn, subjectAr, scheduledFor, dealItems } = req.body;
    if (!name || !subjectEn) {
      return res.status(400).json({ error: 'MISSING_FIELD', message: 'name and subjectEn required' });
    }

    const campaign = await repo.createCampaign({
      name,
      subjectEn,
      subjectAr:    subjectAr    || null,
      scheduledFor: scheduledFor || null,
      dealItems:    dealItems    || [],
      createdBy:    'admin',
    });
    res.status(201).json({ data: campaign });
  } catch (err) {
    console.error('[admin] campaigns create error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/admin/notifications/campaigns/:id/send
 * Trigger immediate dispatch — sets scheduled_for = NOW so the 5-min cron picks it up instantly.
 */
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const campaign = await repo.updateCampaignStatus(req.params.id, 'scheduled', {
      scheduledFor: new Date(),
    });
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND' });

    // Also enqueue immediately rather than waiting up to 5 minutes
    await notificationQueue.add('dispatch-campaigns', {}, { attempts: 1, removeOnComplete: true });
    res.json({ data: campaign, queued: true });
  } catch (err) {
    console.error('[admin] campaigns send error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * DELETE /api/admin/notifications/campaigns/:id
 * Cancels a draft or scheduled campaign (not already sending/sent).
 */
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await repo.cancelCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: campaign });
  } catch (err) {
    console.error('[admin] campaigns delete error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/admin/notifications/campaigns/:id/stats
 */
router.get('/campaigns/:id/stats', async (req, res) => {
  try {
    const { pool } = require('../db/pg');
    const { rows } = await pool.query(
      `SELECT
         id, name, status,
         total_recipients, sent_count, failed_count, opened_count,
         ROUND(
           CASE WHEN sent_count > 0
             THEN (opened_count::numeric / sent_count) * 100
             ELSE 0
           END, 2
         ) AS open_rate_pct,
         scheduled_for, started_at, completed_at, created_at
       FROM email_campaigns
       WHERE id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[admin] campaigns stats error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
