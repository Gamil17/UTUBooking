'use strict';

const express              = require('express');
const { timingSafeEqual }  = require('crypto');
const { notificationQueue } = require('../jobs/queue');
const { pool }              = require('../db/pg');

const router = express.Router();

function safeEqual(a, b) {
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

// Internal secret auth — separate from admin Bearer token
function internalAuth(req, res, next) {
  const secret   = process.env.INTERNAL_API_SECRET ?? '';
  const provided = req.headers['x-internal-secret'] ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
}

router.use(internalAuth);

/**
 * POST /internal/trigger
 * Manually trigger any scheduled job by name — used for testing and ops.
 * Body: { job: 'scan-abandoned-bookings' | 'scan-checkin-reminders' | 'scan-price-change-alerts' | 'dispatch-campaigns' }
 */
const ALLOWED_JOBS = new Set([
  'scan-abandoned-bookings',
  'scan-checkin-reminders',
  'scan-price-change-alerts',
  'dispatch-campaigns',
]);

router.post('/trigger', async (req, res) => {
  try {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: 'MISSING_FIELD', message: 'job name required' });
    if (!ALLOWED_JOBS.has(job)) {
      return res.status(400).json({ error: 'INVALID_JOB', message: `Unknown job: ${job}` });
    }

    const queued = await notificationQueue.add(job, {}, { attempts: 1, removeOnComplete: true });
    res.json({ queued: true, jobId: queued.id, job });
  } catch (err) {
    console.error('[internal] trigger error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An internal error occurred.' });
  }
});

/**
 * GET /internal/campaigns-for-timeline?month=YYYY-MM
 * Used by admin-service timeline endpoint to fetch campaigns for a given month.
 */
router.get('/campaigns-for-timeline', async (req, res) => {
  try {
    const { month } = req.query; // e.g. '2026-04'
    let where = '';
    const params = [];
    const conditions = [`status NOT IN ('cancelled')`];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      params.push(`${month}-01`);
      conditions.push(`DATE_TRUNC('month', COALESCE(scheduled_for, created_at)) = $${params.length}::date`);
    }
    where = 'WHERE ' + conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT id, name, status, scheduled_for, created_at
       FROM email_campaigns ${where}
       ORDER BY COALESCE(scheduled_for, created_at) ASC`,
      params,
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[internal] campaigns-for-timeline error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
