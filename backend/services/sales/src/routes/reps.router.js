'use strict';

/**
 * Sales Reps + Quota Tracking — Sales Service Routes
 *
 * GET    /api/sales/reps                   list all reps
 * POST   /api/sales/reps                   create rep
 * PATCH  /api/sales/reps/:id               update rep
 * DELETE /api/sales/reps/:id               delete rep
 * POST   /api/sales/reps/:id/quotas        assign quarterly quota
 * GET    /api/sales/reps/:id/attainment    quota target vs actual won deals
 */

const { Router } = require('express');
const salesAuth  = require('../middleware/salesAuth');
const { pool }   = require('../db/pg');

const router = Router();
router.use(salesAuth);

const TO_SAR = { SAR: 1, AED: 1.02, USD: 3.75, EUR: 4.10, GBP: 4.80, KWD: 12.20, BHD: 9.95, OMR: 9.74, QAR: 1.03 };
const toSAR  = (amount, currency) => Number(amount ?? 0) * (TO_SAR[currency] ?? 1);

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_sales_reps (
      id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      name       TEXT        NOT NULL,
      email      TEXT        UNIQUE,
      region     TEXT,
      is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_rep_quotas (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      rep_id      UUID        NOT NULL REFERENCES crm_sales_reps(id) ON DELETE CASCADE,
      year        SMALLINT    NOT NULL,
      quarter     SMALLINT    NOT NULL CHECK (quarter BETWEEN 1 AND 4),
      target_sar  NUMERIC(18,2) NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (rep_id, year, quarter)
    )
  `);

  console.log('[sales/reps] bootstrap complete');
}
bootstrap().catch((err) => console.error('[sales/reps] bootstrap error:', err.message));

// ── GET /api/sales/reps ───────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*,
             COALESCE(
               json_agg(q ORDER BY q.year, q.quarter) FILTER (WHERE q.id IS NOT NULL),
               '[]'
             ) AS quotas
      FROM crm_sales_reps r
      LEFT JOIN crm_rep_quotas q ON q.rep_id = r.id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);
    res.json({ data: rows });
  } catch (err) {
    console.error('[sales/reps GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/reps ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, region } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_sales_reps (name, email, region) VALUES ($1,$2,$3) RETURNING *`,
      [name, email ?? null, region ?? null],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('[sales/reps POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /api/sales/reps/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const allowed = ['name','email','region','is_active'];
  const updates = {};
  for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields' });
  updates.updated_at = 'NOW()';

  const setKeys = Object.keys(updates);
  const setClauses = setKeys.map((k, i) => k === 'updated_at' ? `updated_at = NOW()` : `${k} = $${i + 2}`);
  const values     = setKeys.filter(k => k !== 'updated_at').map(k => updates[k]);

  try {
    const { rows } = await pool.query(
      `UPDATE crm_sales_reps SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [req.params.id, ...values],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/reps/:id PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/sales/reps/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM crm_sales_reps WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    console.error('[sales/reps/:id DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/reps/:id/quotas ───────────────────────────────────────────
router.post('/:id/quotas', async (req, res) => {
  const { year, quarter, target_sar } = req.body ?? {};
  if (!year || !quarter || target_sar == null) {
    return res.status(400).json({ error: 'year, quarter, and target_sar required' });
  }
  const q = parseInt(quarter, 10);
  if (q < 1 || q > 4) return res.status(400).json({ error: 'quarter must be 1-4' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_rep_quotas (rep_id, year, quarter, target_sar)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (rep_id, year, quarter) DO UPDATE SET target_sar = EXCLUDED.target_sar
       RETURNING *`,
      [req.params.id, parseInt(year, 10), q, Number(target_sar)],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/reps/:id/quotas POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/reps/:id/attainment?year=&quarter= ────────────────────────
router.get('/:id/attainment', async (req, res) => {
  const year    = parseInt(req.query.year    ?? new Date().getFullYear(), 10);
  const quarter = req.query.quarter ? parseInt(req.query.quarter, 10) : null;

  try {
    const rep = await pool.query('SELECT * FROM crm_sales_reps WHERE id = $1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // Get all quarterly quotas for this rep in the requested year
    const quotas = await pool.query(
      `SELECT * FROM crm_rep_quotas
       WHERE rep_id = $1 AND year = $2
       ${quarter ? 'AND quarter = $3' : ''}
       ORDER BY quarter ASC`,
      quarter ? [req.params.id, year, quarter] : [req.params.id, year],
    );

    // Get won deals owned by this rep — match by deal_owner ILIKE rep.name
    const wonDeals = await pool.query(
      `SELECT value_amount, value_currency, updated_at
       FROM crm_deals
       WHERE stage = 'won'
         AND deal_owner ILIKE $1
         AND EXTRACT(YEAR FROM updated_at) = $2
         ${quarter ? 'AND EXTRACT(QUARTER FROM updated_at) = $3' : ''}`,
      quarter ? [`%${rep.rows[0].name}%`, year, quarter] : [`%${rep.rows[0].name}%`, year],
    );

    const wonSar = wonDeals.rows.reduce((sum, d) => sum + toSAR(d.value_amount, d.value_currency), 0);
    const targetSar = quotas.rows.reduce((sum, q) => sum + Number(q.target_sar), 0);
    const attainmentPct = targetSar > 0 ? Math.round((wonSar / targetSar) * 100) : null;

    // Per-quarter breakdown
    const byQuarter = quotas.rows.map(q => {
      const qWon = wonDeals.rows.filter(d => {
        const dq = Math.ceil((new Date(d.updated_at).getMonth() + 1) / 3);
        return dq === q.quarter;
      });
      const qWonSar    = qWon.reduce((s, d) => s + toSAR(d.value_amount, d.value_currency), 0);
      const qTargetSar = Number(q.target_sar);
      return {
        quarter:          q.quarter,
        target_sar:       qTargetSar,
        won_sar:          Math.round(qWonSar),
        attainment_pct:   qTargetSar > 0 ? Math.round((qWonSar / qTargetSar) * 100) : null,
        won_deals_count:  qWon.length,
      };
    });

    res.json({
      data: {
        rep:              rep.rows[0],
        year,
        quarter:          quarter ?? 'all',
        target_sar:       Math.round(targetSar),
        won_sar:          Math.round(wonSar),
        attainment_pct:   attainmentPct,
        won_deals_count:  wonDeals.rows.length,
        by_quarter:       byQuarter,
      },
    });
  } catch (err) {
    console.error('[sales/reps/:id/attainment GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
