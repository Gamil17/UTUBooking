'use strict';

/**
 * Hotel Partnerships API
 *
 * Admin + Sales endpoints for managing direct hotel partnership records.
 * All routes require a valid JWT with role='admin' or role='sales'.
 *
 * Routes:
 *   GET  /api/v1/partnerships              — list all active partners (paginated)
 *   GET  /api/v1/partnerships/:code        — get single partner by reference code
 *   GET  /api/v1/partnerships/country/:cc  — partners for a given country
 *   POST /api/v1/partnerships/cache/clear  — invalidate Redis partner cache (admin only)
 */

const express = require('express');
const router = express.Router();

const { overlayPartnerData, invalidatePartnerCache, getPartnersByCountry } = require('../services/partnership.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Lazy-load shard pool to avoid startup crash when DB is unavailable
function _getPool() {
  const { getShardPool } = require('../../../shared/shard-router.js');
  return getShardPool('SA').pool;
}

// All routes require authentication
router.use(authMiddleware(['admin', 'sales']));

// GET /api/v1/partnerships
router.get('/', async (req, res) => {
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT * FROM hotel_partnerships ORDER BY tier DESC, commission_rate DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('[partnerships] list error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve partnerships' });
  }
});

// GET /api/v1/partnerships/country/:cc
router.get('/country/:cc', async (req, res) => {
  const cc = req.params.cc;
  if (!/^[A-Z]{2}$/.test(cc)) {
    return res.status(400).json({ success: false, error: 'Country code must be a 2-letter ISO 3166-1 alpha-2 code' });
  }
  try {
    const partners = await getPartnersByCountry(cc);
    res.json({ success: true, count: partners.length, data: partners });
  } catch (err) {
    console.error('[partnerships] country lookup error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve partnerships' });
  }
});

// GET /api/v1/partnerships/:code
router.get('/:code', async (req, res) => {
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT * FROM hotel_partnerships WHERE reference_code = $1`,
      [req.params.code]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Partnership not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[partnerships] lookup error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve partnership' });
  }
});

// POST /api/v1/partnerships/cache/clear  (admin only)
router.post('/cache/clear', authMiddleware(['admin']), async (req, res) => {
  try {
    await invalidatePartnerCache();
    res.json({ success: true, message: 'Partner cache cleared' });
  } catch (err) {
    console.error('[partnerships] cache clear error:', err);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

module.exports = router;
