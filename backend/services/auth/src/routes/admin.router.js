'use strict';

/**
 * Admin user management router — auth service
 * Mounted at: /api/admin (via app.js)
 *
 * GET  /users              — list users with search, status filter, pagination
 * POST /users/:id/suspend  — suspend a user account
 * POST /users/:id/unsuspend — restore a suspended user account
 *
 * Auth: x-admin-secret header must match ADMIN_SECRET env var.
 *       Called only from the Next.js BFF (app/api/admin/users/route.ts).
 */

const { Router }           = require('express');
const { timingSafeEqual }  = require('crypto');
const { pool }             = require('../db/pg');

const router = Router();

function safeEqual(a, b) {
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

// ── Admin secret middleware ───────────────────────────────────────────────────

function requireAdminSecret(req, res, next) {
  const secret   = process.env.ADMIN_SECRET ?? '';
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
}

router.use(requireAdminSecret);

// ── GET /users ────────────────────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  const {
    search = '',
    status = '',
    page   = '1',
    limit  = '25',
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${idx} OR u.name ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (status === 'active' || status === 'suspended') {
      conditions.push(`u.status = $${idx}`);
      values.push(status);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching rows
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM users u ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch paginated rows with booking stats joined
    const dataResult = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.locale,
         u.country,
         u.created_at,
         u.last_seen_at,
         COALESCE(u.status, 'active')   AS status,
         COUNT(b.id)::int               AS booking_count,
         COALESCE(SUM(b.total_price), 0) AS total_spent
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id AND b.status NOT IN ('cancelled','failed')
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limitNum, offset],
    );

    return res.json({
      data:  dataResult.rows,
      total,
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /users/:id/suspend ───────────────────────────────────────────────────

router.post('/users/:id/suspend', async (req, res, next) => {
  const { id }     = req.params;
  const { reason } = req.body ?? {};

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({ error: 'REASON_REQUIRED', message: 'A suspension reason is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET status             = 'suspended',
           suspension_reason  = $2,
           suspended_at       = NOW(),
           updated_at         = NOW()
       WHERE id = $1
       RETURNING id, email, name, locale, country, created_at, last_seen_at, status`,
      [id, reason.trim()],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /users/:id/unsuspend ─────────────────────────────────────────────────

router.post('/users/:id/unsuspend', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users
       SET status             = 'active',
           suspension_reason  = NULL,
           suspended_at       = NULL,
           updated_at         = NOW()
       WHERE id = $1
       RETURNING id, email, name, locale, country, created_at, last_seen_at, status`,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
