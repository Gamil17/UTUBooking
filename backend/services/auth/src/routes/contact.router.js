'use strict';

/**
 * Contact enquiries router — auth service
 * Mounted at: /api/admin/contact (via app.js)
 *
 * POST /enquiries            — create enquiry (called from Next.js /api/contact BFF)
 * GET  /enquiries            — list enquiries with search, status filter, pagination
 * PATCH /enquiries/:id/status — update status + admin notes
 *
 * Auth: x-admin-secret header must match ADMIN_SECRET env var.
 *       All routes called only from the Next.js BFF.
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');

const router = Router();

const VALID_STATUSES    = new Set(['new', 'read', 'replied']);
const VALID_PRIORITIES  = new Set(['low', 'normal', 'high', 'urgent']);

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

router.use(requireAdminSecret);

// ── POST /enquiries ───────────────────────────────────────────────────────────
// Called by Next.js /api/contact after input validation.

router.post('/enquiries', async (req, res, next) => {
  const {
    name,
    email,
    topic,
    message,
    bookingRef = '',
  } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !topic?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Required fields missing.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Invalid email address.' });
  }

  const VALID_TOPICS = new Set(['flights', 'hotels', 'hajj', 'cars', 'payments', 'tech', 'visa', 'privacy', 'affiliate', 'other']);
  if (!VALID_TOPICS.has(topic.trim().toLowerCase())) {
    return res.status(400).json({ error: 'INVALID_TOPIC', message: 'Invalid topic.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO contact_enquiries (name, email, topic, booking_ref, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, topic, booking_ref, status, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        topic.trim().toLowerCase(),
        bookingRef?.trim() || null,
        message.trim(),
      ],
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /enquiries ────────────────────────────────────────────────────────────

router.get('/enquiries', async (req, res, next) => {
  const {
    search   = '',
    status   = '',
    topic    = '',
    priority = '',
    page     = '1',
    limit    = '25',
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`(e.name ILIKE $${idx} OR e.email ILIKE $${idx} OR e.message ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (status && VALID_STATUSES.has(status)) {
      conditions.push(`e.status = $${idx}`);
      values.push(status);
      idx++;
    }
    if (topic) {
      conditions.push(`e.topic = $${idx}`);
      values.push(topic.toLowerCase());
      idx++;
    }
    if (priority && VALID_PRIORITIES.has(priority)) {
      conditions.push(`e.priority = $${idx}`);
      values.push(priority);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM contact_enquiries e ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         e.id,
         e.name,
         e.email,
         e.topic,
         e.booking_ref,
         e.message,
         e.status,
         e.admin_notes,
         e.assigned_to,
         e.priority,
         e.due_at,
         e.created_at,
         e.updated_at
       FROM contact_enquiries e
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limitNum, offset],
    );

    return res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /enquiries/:id ──────────────────────────────────────────────────────
// Updates any combination of: status, admin_notes, assigned_to, priority, due_at

router.patch('/enquiries/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    status,
    adminNotes,
    assignedTo,
    priority,
    dueAt,
  } = req.body ?? {};

  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Status must be new, read, or replied.' });
  }
  if (priority !== undefined && !VALID_PRIORITIES.has(priority)) {
    return res.status(400).json({ error: 'INVALID_PRIORITY', message: 'Priority must be low, normal, high, or urgent.' });
  }

  // Build dynamic SET clause — only update fields that were provided
  const sets = ['updated_at = NOW()'];
  const vals = [id];
  let   idx  = 2;

  if (status     !== undefined) { sets.push(`status      = $${idx++}`); vals.push(status); }
  if (adminNotes !== undefined) { sets.push(`admin_notes = $${idx++}`); vals.push(adminNotes?.trim() || null); }
  if (assignedTo !== undefined) { sets.push(`assigned_to = $${idx++}`); vals.push(assignedTo?.trim() || null); }
  if (priority   !== undefined) { sets.push(`priority    = $${idx++}`); vals.push(priority); }
  if (dueAt      !== undefined) { sets.push(`due_at      = $${idx++}`); vals.push(dueAt || null); }

  try {
    const result = await pool.query(
      `UPDATE contact_enquiries
          SET ${sets.join(', ')}
        WHERE id = $1
        RETURNING id, name, email, topic, booking_ref, message,
                  status, admin_notes, assigned_to, priority, due_at,
                  created_at, updated_at`,
      vals,
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Keep old route alias for backwards-compatibility with any existing callers
router.patch('/enquiries/:id/status', async (req, res, next) => {
  req.body = { status: req.body?.status, adminNotes: req.body?.adminNotes };
  // Delegate to the main PATCH handler by re-using its logic inline
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  if (!status || !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Status must be new, read, or replied.' });
  }
  try {
    const result = await pool.query(
      `UPDATE contact_enquiries
          SET status = $2, admin_notes = $3, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, email, topic, booking_ref, status, admin_notes,
                  assigned_to, priority, due_at, created_at, updated_at`,
      [id, status, adminNotes?.trim() || null],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
