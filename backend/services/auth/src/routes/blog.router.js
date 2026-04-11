'use strict';

/**
 * Blog posts router — auth service
 *
 * Public router  — mounted at /api/blog (no auth required):
 *   GET /          — list published posts (listing fields only, no sections)
 *   GET /:slug     — single post by slug, including sections
 *
 * Admin router   — mounted at /api/admin/blog (x-admin-secret required):
 *   GET /          — list ALL posts (published + draft), paginated
 *   POST /         — create a new post
 *   PATCH /:id     — update post fields (partial update)
 *   DELETE /:id    — unpublish (soft delete) a post
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');

// ── Public router ─────────────────────────────────────────────────────────────

const publicRouter = Router();

// GET / — list published posts (no sections to save bandwidth)
publicRouter.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, category, title, excerpt, published_date, read_time, sort_order, created_at
       FROM blog_posts
       WHERE is_published = true
       ORDER BY sort_order ASC, created_at DESC`,
    );
    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /:slug — single post with full sections
publicRouter.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, slug, category, title, excerpt, published_date, read_time, sections, sort_order, created_at
       FROM blog_posts
       WHERE slug = $1 AND is_published = true`,
      [slug],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json({ data: result.rows[0] });
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

// GET / — list all posts (published + draft)
adminRouter.get('/', async (req, res, next) => {
  const { search = '', published = '', page = '1', limit = '50' } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`(b.title ILIKE $${idx} OR b.slug ILIKE $${idx} OR b.category ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (published === 'true' || published === 'false') {
      conditions.push(`b.is_published = $${idx}`);
      values.push(published === 'true');
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM blog_posts b ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT id, slug, category, title, excerpt, published_date, read_time, is_published, sort_order, created_at, updated_at
       FROM blog_posts b
       ${where}
       ORDER BY sort_order ASC, created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limitNum, offset],
    );

    return res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// POST / — create post
adminRouter.post('/', async (req, res, next) => {
  const {
    slug,
    category,
    title,
    excerpt,
    published_date = 'Draft',
    read_time      = '5 min read',
    sections       = [],
    is_published   = false,
    sort_order     = 0,
  } = req.body ?? {};

  if (!slug?.trim() || !category?.trim() || !title?.trim() || !excerpt?.trim()) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'slug, category, title, and excerpt are required.' });
  }

  // Validate sections shape
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'INVALID_SECTIONS', message: 'sections must be a JSON array.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO blog_posts
         (slug, category, title, excerpt, published_date, read_time, sections, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       RETURNING id, slug, category, title, excerpt, published_date, read_time, is_published, sort_order, created_at, updated_at`,
      [
        slug.trim().toLowerCase().replace(/\s+/g, '-'),
        category.trim(),
        title.trim(),
        excerpt.trim(),
        published_date?.trim() || 'Draft',
        read_time?.trim()      || '5 min read',
        JSON.stringify(sections),
        Boolean(is_published),
        parseInt(sort_order, 10) || 0,
      ],
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'SLUG_CONFLICT', message: 'A post with this slug already exists.' });
    }
    next(err);
  }
});

// PATCH /:id — partial update
adminRouter.patch('/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    slug,
    category,
    title,
    excerpt,
    published_date,
    read_time,
    sections,
    is_published,
    sort_order,
  } = req.body ?? {};

  const sets   = [];
  const values = [];
  let   idx    = 1;

  if (slug           !== undefined) { sets.push(`slug           = $${idx++}`); values.push(slug.trim().toLowerCase().replace(/\s+/g, '-')); }
  if (category       !== undefined) { sets.push(`category       = $${idx++}`); values.push(category.trim()); }
  if (title          !== undefined) { sets.push(`title          = $${idx++}`); values.push(title.trim()); }
  if (excerpt        !== undefined) { sets.push(`excerpt        = $${idx++}`); values.push(excerpt.trim()); }
  if (published_date !== undefined) { sets.push(`published_date = $${idx++}`); values.push(published_date?.trim() || 'Draft'); }
  if (read_time      !== undefined) { sets.push(`read_time      = $${idx++}`); values.push(read_time?.trim() || '5 min read'); }
  if (sections       !== undefined) { sets.push(`sections       = $${idx++}::jsonb`); values.push(JSON.stringify(sections)); }
  if (is_published   !== undefined) { sets.push(`is_published   = $${idx++}`); values.push(Boolean(is_published)); }
  if (sort_order     !== undefined) { sets.push(`sort_order     = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'NO_FIELDS', message: 'No fields provided to update.' });
  }

  sets.push(`updated_at = NOW()`);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE blog_posts SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, slug, category, title, excerpt, published_date, read_time, is_published, sort_order, created_at, updated_at`,
      values,
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'SLUG_CONFLICT', message: 'A post with this slug already exists.' });
    }
    next(err);
  }
});

// DELETE /:id — unpublish (soft delete)
adminRouter.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE blog_posts SET is_published = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, slug, title, is_published, updated_at`,
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
