/**
 * Promo Codes router — dual export.
 *
 * app.js registers:
 *   app.use('/api/promos',       publicRouter);
 *   app.use('/api/admin/promos', adminRouter);
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');

// ─── Admin auth middleware ────────────────────────────────────────────────────

function requireAdminSecret(req, res, next) {
  const secret   = process.env.ADMIN_SECRET ?? '';
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !provided) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    if (timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) return next();
  } catch { /* length mismatch */ }
  return res.status(401).json({ error: 'UNAUTHORIZED' });
}

// ─── Public router ────────────────────────────────────────────────────────────

const publicRouter = Router();

/** GET /api/promos — list publicly visible active codes (for /promo-codes display page) */
publicRouter.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, code, title, description, discount_type, discount_value, currency,
             min_order_amount, expires_at, sort_order
      FROM   promo_codes
      WHERE  is_active = true
      AND   (expires_at IS NULL OR expires_at > NOW())
      AND   (max_uses IS NULL OR uses_count < max_uses)
      ORDER  BY sort_order ASC, created_at DESC
    `);
    return res.json({ data: rows });
  } catch (err) {
    console.error('[promos] GET / error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** POST /api/promos/validate — validate a code without redeeming it */
publicRouter.post('/validate', async (req, res) => {
  const rawCode    = String(req.body.code ?? '').toUpperCase().trim();
  const orderAmt   = parseFloat(req.body.orderAmount ?? 0) || 0;

  if (!rawCode) {
    return res.status(422).json({ error: 'CODE_REQUIRED', message: 'Promo code is required.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM promo_codes WHERE code = $1 LIMIT 1`,
      [rawCode],
    );

    if (!rows.length) {
      return res.status(422).json({ error: 'CODE_NOT_FOUND', message: 'Code not found.' });
    }

    const promo = rows[0];

    if (!promo.is_active) {
      return res.status(422).json({ error: 'CODE_INACTIVE', message: 'This code is no longer active.' });
    }
    if (promo.expires_at && new Date(promo.expires_at) <= new Date()) {
      return res.status(422).json({ error: 'CODE_EXPIRED', message: 'This code has expired.' });
    }
    if (promo.max_uses != null && promo.uses_count >= promo.max_uses) {
      return res.status(422).json({ error: 'CODE_EXHAUSTED', message: 'This code has reached its usage limit.' });
    }
    if (orderAmt > 0 && parseFloat(promo.min_order_amount) > orderAmt) {
      return res.status(422).json({
        error:   'MIN_ORDER_NOT_MET',
        message: `Minimum order of ${promo.currency} ${promo.min_order_amount} required.`,
      });
    }

    return res.json({
      valid:          true,
      code:           promo.code,
      title:          promo.title,
      discount_type:  promo.discount_type,
      discount_value: parseFloat(promo.discount_value),
      currency:       promo.currency,
    });
  } catch (err) {
    console.error('[promos] POST /validate error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── Admin router ─────────────────────────────────────────────────────────────

const adminRouter = Router();
adminRouter.use(requireAdminSecret);

/** GET /api/admin/promos — list all promo codes with optional filters */
adminRouter.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (req.query.search) {
      conditions.push(`(code ILIKE $${idx} OR title ILIKE $${idx})`);
      values.push(`%${req.query.search}%`);
      idx++;
    }
    if (req.query.active === 'true')  { conditions.push(`is_active = true`);  }
    if (req.query.active === 'false') { conditions.push(`is_active = false`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM promo_codes ${where} ORDER BY sort_order ASC, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS total FROM promo_codes ${where}`, values),
    ]);

    return res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[promos admin] GET / error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** POST /api/admin/promos — create a new promo code */
adminRouter.post('/', async (req, res) => {
  const {
    code, title, description, discount_type, discount_value,
    currency = 'SAR', min_order_amount = 0, max_uses,
    expires_at, is_active = true, sort_order = 0,
  } = req.body;

  if (!code || !title || !discount_type || discount_value == null) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'code, title, discount_type, discount_value are required.' });
  }
  if (!['percent', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ error: 'INVALID_DISCOUNT_TYPE' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO promo_codes
         (code, title, description, discount_type, discount_value, currency,
          min_order_amount, max_uses, expires_at, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        code.toUpperCase().trim(),
        title,
        description ?? null,
        discount_type,
        discount_value,
        currency,
        min_order_amount,
        max_uses ?? null,
        expires_at ?? null,
        is_active,
        sort_order,
      ],
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'DUPLICATE_CODE', message: 'A code with that value already exists.' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ error: 'INVALID_DISCOUNT_TYPE' });
    }
    console.error('[promos admin] POST / error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** PATCH /api/admin/promos/:id — partial update */
adminRouter.patch('/:id', async (req, res) => {
  const allowed = [
    'title', 'description', 'discount_type', 'discount_value', 'currency',
    'min_order_amount', 'max_uses', 'expires_at', 'is_active', 'sort_order',
  ];

  const sets = ['updated_at = NOW()'];
  const vals = [req.params.id];
  let   idx  = 2;

  // Allow updating the code (normalise to uppercase)
  if (req.body.code !== undefined) {
    sets.push(`code = $${idx++}`);
    vals.push(String(req.body.code).toUpperCase().trim());
  }

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(req.body[key] === '' ? null : req.body[key]);
    }
  }

  if (sets.length === 1) {
    return res.status(400).json({ error: 'NO_FIELDS' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE promo_codes SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      vals,
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'DUPLICATE_CODE' });
    }
    console.error('[promos admin] PATCH /:id error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** DELETE /api/admin/promos/:id — soft delete (is_active = false) */
adminRouter.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE promo_codes SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, code, is_active`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[promos admin] DELETE /:id error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = { publicRouter, adminRouter };
