'use strict';

/**
 * Admin router for the booking service.
 * Mounted at: /api/admin/bookings
 *
 * Auth: x-admin-secret header (timingSafeEqual against ADMIN_SECRET env var).
 *
 * Routes:
 *   GET  /stats          Booking counts by status + total revenue
 *   GET  /               Paginated list of all bookings (search, status, product_type filter)
 *   GET  /:id            Single booking detail
 *   PATCH /:id/status    Update booking status (confirm, cancel, refunded)
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const pool                = require('../db/pg');
const repo                = require('../db/booking.repo');

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireAdminSecret(req, res, next) {
  const secret   = process.env.ADMIN_SECRET;
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !provided) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const a = Buffer.from(secret);
    const b = Buffer.alloc(a.length);
    Buffer.from(provided).copy(b);
    if (!timingSafeEqual(a, b)) throw new Error();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  return next();
}

router.use(requireAdminSecret);

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'pending')        AS pending,
        COUNT(*) FILTER (WHERE status = 'confirmed')      AS confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled,
        COUNT(*) FILTER (WHERE status = 'refunded')       AS refunded,
        COUNT(*) FILTER (WHERE product_type = 'hotel')    AS hotels,
        COUNT(*) FILTER (WHERE product_type = 'flight')   AS flights,
        COUNT(*) FILTER (WHERE product_type = 'car')      AS cars,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'confirmed'), 0) AS confirmed_revenue,
        COALESCE(SUM(total_price), 0)                     AS gross_revenue
      FROM bookings
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/bookings/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET / (list) ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const limit        = Math.min(parseInt(req.query.limit  ?? 50), 100);
  const offset       = parseInt(req.query.offset ?? 0);
  const search       = req.query.search       || null;
  const status       = req.query.status       || null;
  const productType  = req.query.product_type || null;

  try {
    const conditions = [];
    const values     = [];
    let   i          = 1;

    if (search) {
      conditions.push(`(b.reference_no ILIKE $${i} OR u.email ILIKE $${i} OR u.name ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }
    if (status) {
      conditions.push(`b.status = $${i++}`);
      values.push(status);
    }
    if (productType) {
      conditions.push(`b.product_type = $${i++}`);
      values.push(productType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT b.id, b.reference_no, b.product_type, b.status,
              b.total_price, b.currency, b.created_at, b.confirmed_at,
              b.meta,
              u.email AS user_email, u.name AS user_name
         FROM bookings b
         LEFT JOIN users u ON u.id = b.user_id
         ${where}
        ORDER BY b.created_at DESC
        LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    );

    const totalRes = await pool.query(
      `SELECT COUNT(*) FROM bookings b LEFT JOIN users u ON u.id = b.user_id ${where}`,
      values
    );

    res.json({ total: parseInt(totalRes.rows[0].count), rows });
  } catch (err) {
    console.error('[admin/bookings/list]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, p.status AS payment_status, p.method AS payment_method, p.amount AS payment_amount,
              u.email AS user_email, u.name AS user_name
         FROM bookings b
         LEFT JOIN payments p ON p.booking_id = b.id
         LEFT JOIN users u ON u.id = b.user_id
        WHERE b.id = $1
        LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/bookings/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body ?? {};
  const ALLOWED = ['pending', 'confirmed', 'cancelled', 'refunded'];
  if (!status || !ALLOWED.includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', allowed: ALLOWED });
  }

  try {
    const updated = await repo.updateBookingStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ id: updated.id, reference_no: updated.reference_no, status: updated.status });
  } catch (err) {
    console.error('[admin/bookings/:id/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
