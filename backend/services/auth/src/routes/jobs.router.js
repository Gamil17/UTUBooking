'use strict';

/**
 * Job listings router — auth service
 *
 * Public router  — mounted at /api/jobs (no auth required):
 *   GET /          — list active job listings (for /careers page)
 *
 * Admin router   — mounted at /api/admin/jobs (x-admin-secret required):
 *   GET /          — list all listings (active + inactive), paginated
 *   POST /         — create a new listing
 *   PATCH /:id     — update listing fields
 *   DELETE /:id    — deactivate (soft delete) a listing
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');

// ── Public router ─────────────────────────────────────────────────────────────

const publicRouter = Router();

publicRouter.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, team, location, type, description, sort_order, created_at
       FROM job_listings
       WHERE is_active = true
       ORDER BY sort_order ASC, created_at ASC`,
    );
    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── Admin router ──────────────────────────────────────────────────────────────

const adminRouter = Router();

function safeEqual(a, b) {
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

function requireAdminSecret(req, res, next) {
  const secret   = process.env.ADMIN_SECRET ?? '';
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
}

adminRouter.use(requireAdminSecret);

// GET / — list all (active + inactive)
adminRouter.get('/', async (req, res, next) => {
  const { search = '', active = '', page = '1', limit = '50' } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`(j.title ILIKE $${idx} OR j.team ILIKE $${idx} OR j.location ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (active === 'true' || active === 'false') {
      conditions.push(`j.is_active = $${idx}`);
      values.push(active === 'true');
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM job_listings j ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT id, title, team, location, type, description, is_active, sort_order, created_at, updated_at
       FROM job_listings j
       ${where}
       ORDER BY sort_order ASC, created_at ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limitNum, offset],
    );

    return res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// POST / — create listing
adminRouter.post('/', async (req, res, next) => {
  const {
    title,
    team,
    location,
    type,
    description = null,
    is_active   = true,
    sort_order  = 0,
  } = req.body ?? {};

  if (!title?.trim() || !team?.trim() || !location?.trim() || !type?.trim()) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'title, team, location, and type are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO job_listings (title, team, location, type, description, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, team, location, type, description, is_active, sort_order, created_at, updated_at`,
      [
        title.trim(),
        team.trim(),
        location.trim(),
        type.trim(),
        description?.trim() || null,
        Boolean(is_active),
        parseInt(sort_order, 10) || 0,
      ],
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — update listing
adminRouter.patch('/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    title,
    team,
    location,
    type,
    description,
    is_active,
    sort_order,
  } = req.body ?? {};

  // Build SET clause dynamically from provided fields only
  const sets   = [];
  const values = [];
  let   idx    = 1;

  if (title       !== undefined) { sets.push(`title       = $${idx++}`); values.push(title.trim()); }
  if (team        !== undefined) { sets.push(`team        = $${idx++}`); values.push(team.trim()); }
  if (location    !== undefined) { sets.push(`location    = $${idx++}`); values.push(location.trim()); }
  if (type        !== undefined) { sets.push(`type        = $${idx++}`); values.push(type.trim()); }
  if (description !== undefined) { sets.push(`description = $${idx++}`); values.push(description?.trim() || null); }
  if (is_active   !== undefined) { sets.push(`is_active   = $${idx++}`); values.push(Boolean(is_active)); }
  if (sort_order  !== undefined) { sets.push(`sort_order  = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'NO_FIELDS', message: 'No fields provided to update.' });
  }

  sets.push(`updated_at = NOW()`);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE job_listings SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, title, team, location, type, description, is_active, sort_order, created_at, updated_at`,
      values,
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — soft delete (deactivate)
adminRouter.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE job_listings SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, is_active, updated_at`,
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = { publicRouter, adminRouter };
