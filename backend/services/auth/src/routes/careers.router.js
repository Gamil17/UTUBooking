'use strict';

/**
 * Careers admin router — auth service
 * Mounted at: /api/admin/careers (via app.js)
 *
 * POST /applications            — create application (called from Next.js BFF after file parsing)
 * GET  /applications            — list applications with search, status/position filter, pagination
 * GET  /applications/:id        — single application detail
 * PATCH /applications/:id/status — update status + admin notes
 *
 * Auth: x-admin-secret header must match ADMIN_SECRET env var.
 *       All routes called only from the Next.js BFF.
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');

const router = Router();

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

// ── POST /applications ────────────────────────────────────────────────────────
// Called by Next.js /api/careers/apply after parsing FormData and validating file.

router.post('/applications', async (req, res, next) => {
  const {
    name,
    email,
    role,
    coverLetter,
    phone       = '',
    linkedinUrl = '',
    cvFilename  = null,
    cvSizeBytes = null,
    cvMimeType  = null,
  } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !role?.trim() || !coverLetter?.trim()) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Required fields missing.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Invalid email address.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO career_applications
         (applicant_name, email, phone, position, linkedin_url, cover_letter,
          cv_filename, cv_size_bytes, cv_mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, applicant_name, email, position, status, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        role.trim(),
        linkedinUrl?.trim() || null,
        coverLetter.trim(),
        cvFilename  || null,
        cvSizeBytes || null,
        cvMimeType  || null,
      ],
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /applications ─────────────────────────────────────────────────────────

router.get('/applications', async (req, res, next) => {
  const {
    search   = '',
    status   = '',
    position = '',
    page     = '1',
    limit    = '25',
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  const VALID_STATUSES = new Set(['applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn']);

  try {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`(a.applicant_name ILIKE $${idx} OR a.email ILIKE $${idx} OR a.position ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (status && VALID_STATUSES.has(status)) {
      conditions.push(`a.status = $${idx}`);
      values.push(status);
      idx++;
    }
    if (position) {
      conditions.push(`a.position ILIKE $${idx}`);
      values.push(`%${position}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM career_applications a ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         a.id,
         a.applicant_name,
         a.email,
         a.phone,
         a.position,
         a.linkedin_url,
         a.status,
         a.cv_filename,
         a.cv_size_bytes,
         a.cv_mime_type,
         a.admin_notes,
         a.reviewed_by,
         a.reviewed_at,
         a.created_at,
         a.updated_at
       FROM career_applications a
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limitNum, offset],
    );

    return res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// ── GET /applications/:id ─────────────────────────────────────────────────────

router.get('/applications/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         a.id, a.applicant_name, a.email, a.phone, a.position,
         a.linkedin_url, a.cover_letter, a.status,
         a.cv_filename, a.cv_size_bytes, a.cv_mime_type, a.cv_s3_key,
         a.admin_notes, a.reviewed_by, a.reviewed_at,
         a.created_at, a.updated_at
       FROM career_applications a
       WHERE a.id = $1`,
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

// ── PATCH /applications/:id/status ────────────────────────────────────────────

router.patch('/applications/:id/status', async (req, res, next) => {
  const { id }     = req.params;
  const { status, adminNotes, reviewedBy } = req.body ?? {};

  const VALID_STATUSES = ['applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn'];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid status value.' });
  }

  try {
    const result = await pool.query(
      `UPDATE career_applications
       SET status      = $2,
           admin_notes = $3,
           reviewed_by = $4,
           reviewed_at = NOW(),
           updated_at  = NOW()
       WHERE id = $1
       RETURNING id, applicant_name, email, position, status, admin_notes,
                 reviewed_by, reviewed_at, updated_at`,
      [id, status, adminNotes?.trim() || null, reviewedBy?.trim() || null],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
