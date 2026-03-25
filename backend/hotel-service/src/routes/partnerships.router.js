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
const { authMiddleware } = require('../../src/middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware(['admin', 'sales']));

// GET /api/v1/partnerships
router.get('/', async (req, res) => {
  try {
    // Re-use getPartnersByCountry with wildcard 'ALL' handled inside service
    const pool = req.app.locals.dbPool;
    const { rows } = await pool.query(
      `SELECT * FROM hotel_partnerships ORDER BY tier DESC, commission_rate DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/partnerships/country/:cc
router.get('/country/:cc', async (req, res) => {
  try {
    const partners = await getPartnersByCountry(req.params.cc);
    res.json({ success: true, count: partners.length, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/partnerships/:code
router.get('/:code', async (req, res) => {
  try {
    const pool = req.app.locals.dbPool;
    const { rows } = await pool.query(
      `SELECT * FROM hotel_partnerships WHERE reference_code = $1`,
      [req.params.code]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Partnership not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/partnerships/cache/clear  (admin only)
router.post('/cache/clear', authMiddleware(['admin']), async (req, res) => {
  try {
    await invalidatePartnerCache();
    res.json({ success: true, message: 'Partner cache cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
