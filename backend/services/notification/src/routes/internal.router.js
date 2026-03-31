'use strict';

const express = require('express');
const { notificationQueue } = require('../jobs/queue');

const router = express.Router();

// Internal secret auth — separate from admin Bearer token
function internalAuth(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
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
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
