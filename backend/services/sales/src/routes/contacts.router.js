'use strict';

/**
 * Contacts — Sales Service Routes
 *
 * GET    /api/sales/contacts                   paginated contact directory (cross-deal)
 * GET    /api/sales/contacts/search            search by email or name (cross-deal)
 * GET    /api/sales/deals/:id/contacts         list contacts for a deal
 * POST   /api/sales/deals/:id/contacts         add contact to deal
 * DELETE /api/sales/contacts/:contactId        remove contact
 */

const { Router } = require('express');
const salesAuth  = require('../middleware/salesAuth');
const { pool }   = require('../db/pg');

const router = Router();
router.use(salesAuth);

// ── GET /api/sales/contacts/search?email=&name= ───────────────────────────────
router.get('/search', async (req, res) => {
  const { email, name, page = 1, limit = 50 } = req.query;
  if (!email && !name) return res.status(400).json({ error: 'email or name required' });

  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (email) { conditions.push(`c.email ILIKE $${idx++}`); values.push(`%${email}%`); }
  if (name)  { conditions.push(`c.name  ILIKE $${idx++}`); values.push(`%${name}%`); }

  const where = 'WHERE ' + conditions.join(' OR ');

  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              d.id    AS deal_id,
              d.title AS deal_title,
              d.stage AS deal_stage,
              d.partner_name AS deal_partner
       FROM crm_contacts c
       JOIN crm_deals d ON d.id = c.deal_id
       ${where}
       ORDER BY c.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, lim, off],
    );
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('[sales/contacts/search GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/contacts ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  const values = [];
  let   where  = '';
  let   idx    = 1;

  if (search) {
    where = `WHERE (c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.phone ILIKE $${idx})`;
    values.push(`%${search}%`); idx++;
  }

  try {
    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT c.*,
                d.title AS deal_title,
                d.stage AS deal_stage,
                d.partner_name AS deal_partner
         FROM crm_contacts c
         JOIN crm_deals d ON d.id = c.deal_id
         ${where}
         ORDER BY c.name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, lim, off],
      ),
      pool.query(
        `SELECT COUNT(*) FROM crm_contacts c ${where}`,
        values,
      ),
    ]);
    res.json({ data: rows.rows, total: parseInt(total.rows[0].count), page: parseInt(page, 10), limit: lim });
  } catch (err) {
    console.error('[sales/contacts GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/deals/:id/contacts ─────────────────────────────────────────
// NOTE: This router is mounted at /api/sales/contacts, so deal sub-routes are
// handled in activities.router.js which is mounted at /api/sales/deals.
// Contacts per deal are handled here via a specific mount at /api/sales/deals too.

// ── DELETE /api/sales/contacts/:contactId ─────────────────────────────────────
router.delete('/:contactId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM crm_contacts WHERE id = $1 RETURNING id',
      [req.params.contactId],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    console.error('[sales/contacts/:id DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
