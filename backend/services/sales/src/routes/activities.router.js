'use strict';

/**
 * Activities + Deal Contacts — Sales Service Routes
 * Mounted at /api/sales/deals
 *
 * GET    /api/sales/deals/:id/contacts    list contacts for deal
 * POST   /api/sales/deals/:id/contacts    add contact to deal
 * GET    /api/sales/deals/:id/activities  list activities
 * POST   /api/sales/deals/:id/activities  log activity
 */

const { Router } = require('express');
const salesAuth  = require('../middleware/salesAuth');
const { pool }   = require('../db/pg');

const router = Router();
router.use(salesAuth);

const VALID_ACT_TYPES = new Set(['call','email','demo','meeting','proposal_sent','follow_up','note','won','lost']);

// ── GET /api/sales/deals/:id/contacts ─────────────────────────────────────────
router.get('/:id/contacts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM crm_contacts WHERE deal_id = $1 ORDER BY created_at ASC',
      [req.params.id],
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[sales/deals/:id/contacts GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/deals/:id/contacts ────────────────────────────────────────
router.post('/:id/contacts', async (req, res) => {
  const { name, title, email, phone, linkedin_url, notes } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_contacts (deal_id, name, title, email, phone, linkedin_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, name, title ?? null, email ?? null, phone ?? null, linkedin_url ?? null, notes ?? null],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/deals/:id/contacts POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/deals/:id/activities ───────────────────────────────────────
router.get('/:id/activities', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  try {
    const { rows } = await pool.query(
      'SELECT * FROM crm_activities WHERE deal_id = $1 ORDER BY performed_at DESC LIMIT $2',
      [req.params.id, limit],
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[sales/deals/:id/activities GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/deals/:id/activities ──────────────────────────────────────
router.post('/:id/activities', async (req, res) => {
  const { type = 'note', summary, performed_by, performed_at } = req.body ?? {};
  if (!summary) return res.status(400).json({ error: 'summary required' });
  if (!VALID_ACT_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_activities (deal_id, type, summary, performed_by, performed_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, type, summary, performed_by ?? null, performed_at ? new Date(performed_at) : new Date()],
    );
    await pool.query('UPDATE crm_deals SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/deals/:id/activities POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
