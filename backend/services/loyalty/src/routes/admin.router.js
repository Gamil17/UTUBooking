'use strict';

/**
 * Loyalty service — admin monitoring + rewards management routes.
 *
 * All routes require x-admin-secret header (timingSafeEqual against ADMIN_SECRET).
 * Registered in app.js as:  app.use('/api/admin/loyalty', adminRouter)
 */

const { Router }           = require('express');
const { timingSafeEqual }  = require('crypto');
const { pool }             = require('../db/pg');

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAdminSecret(req, res, next) {
  const secret   = process.env.ADMIN_SECRET ?? '';
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !provided) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    if (timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) return next();
  } catch { /* length mismatch */ }
  return res.status(401).json({ error: 'UNAUTHORIZED' });
}

const router = Router();
router.use(requireAdminSecret);

// ─── GET /stats ───────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                              AS total_members,
        COUNT(*) FILTER (WHERE tier = 'silver')               AS silver,
        COUNT(*) FILTER (WHERE tier = 'gold')                 AS gold,
        COUNT(*) FILTER (WHERE tier = 'platinum')             AS platinum,
        COALESCE(SUM(points), 0)                              AS total_points_outstanding,
        COALESCE(SUM(lifetime_points), 0)                     AS total_lifetime_points
      FROM loyalty_accounts
    `);
    const r = rows[0];
    return res.json({
      data: {
        total_members:            parseInt(r.total_members,            10) || 0,
        silver:                   parseInt(r.silver,                   10) || 0,
        gold:                     parseInt(r.gold,                     10) || 0,
        platinum:                 parseInt(r.platinum,                 10) || 0,
        total_points_outstanding: parseInt(r.total_points_outstanding, 10) || 0,
        total_lifetime_points:    parseInt(r.total_lifetime_points,    10) || 0,
      },
    });
  } catch (err) {
    console.error('[loyalty admin] GET /stats error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── GET /members — list accounts with optional search ────────────────────────

router.get('/members', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;
    const search = req.query.search?.toString().trim() ?? '';

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`user_id::text ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }
    if (req.query.tier) {
      conditions.push(`tier = $${idx++}`);
      values.push(req.query.tier);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, user_id, tier, points, lifetime_points, created_at
         FROM loyalty_accounts ${where}
         ORDER BY lifetime_points DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS total FROM loyalty_accounts ${where}`, values),
    ]);

    return res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[loyalty admin] GET /members error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── GET /members/:userId/ledger ──────────────────────────────────────────────

router.get('/members/:userId/ledger', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, booking_id, points, action, note, created_at
       FROM points_ledger
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.userId],
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('[loyalty admin] GET /members/:id/ledger error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── Rewards catalog ──────────────────────────────────────────────────────────

/** GET /rewards — list all rewards (admin sees all, including inactive) */
router.get('/rewards', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (req.query.active === 'true')  conditions.push('is_active = true');
    if (req.query.active === 'false') conditions.push('is_active = false');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, name_en, name_ar, points_cost, type, discount_sar, valid_until, is_active, created_at
         FROM rewards ${where}
         ORDER BY points_cost ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS total FROM rewards ${where}`, values),
    ]);

    return res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[loyalty admin] GET /rewards error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** POST /rewards — create a new reward */
router.post('/rewards', async (req, res) => {
  const {
    name_en, name_ar, points_cost, type,
    discount_sar = 0, valid_until, is_active = true,
  } = req.body;

  if (!name_en || points_cost == null || !type) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'name_en, points_cost, type are required.',
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO rewards (name_en, name_ar, points_cost, type, discount_sar, valid_until, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name_en, name_ar ?? null, points_cost, type, discount_sar, valid_until ?? null, is_active],
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[loyalty admin] POST /rewards error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** PATCH /rewards/:id — partial update */
router.patch('/rewards/:id', async (req, res) => {
  const allowed = ['name_en', 'name_ar', 'points_cost', 'type', 'discount_sar', 'valid_until', 'is_active'];

  const sets = ['updated_at = NOW()'];
  const vals = [req.params.id];
  let   idx  = 2;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(req.body[key] === '' ? null : req.body[key]);
    }
  }

  if (sets.length === 1) return res.status(400).json({ error: 'NO_FIELDS' });

  try {
    const { rows } = await pool.query(
      `UPDATE rewards SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      vals,
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[loyalty admin] PATCH /rewards/:id error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** DELETE /rewards/:id — soft delete */
router.delete('/rewards/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE rewards SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, is_active`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[loyalty admin] DELETE /rewards/:id error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
