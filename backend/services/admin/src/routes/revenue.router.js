'use strict';

const { Router } = require('express');
const { Pool }   = require('pg');
const wf         = require('../lib/workflow-client');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const PRICING_SERVICE = process.env.PRICING_SERVICE_URL ?? 'http://localhost:3011';

function adminAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
}
router.use(adminAuth);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS revenue_rules (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'seasonal'
                    CHECK (type IN ('seasonal','event','demand','occupancy','manual')),
      applies_to    TEXT NOT NULL DEFAULT 'all'
                    CHECK (applies_to IN ('all','hotel')),
      hotel_id      TEXT,
      adjustment    TEXT NOT NULL DEFAULT 'percent'
                    CHECK (adjustment IN ('percent','absolute')),
      value         NUMERIC(10,2) NOT NULL DEFAULT 0,
      start_date    DATE,
      end_date      DATE,
      priority      INT NOT NULL DEFAULT 5,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_by    TEXT NOT NULL DEFAULT 'admin',
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS revenue_blackouts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      hotel_id      TEXT,
      start_date    DATE NOT NULL,
      end_date      DATE NOT NULL,
      reason        TEXT,
      created_by    TEXT NOT NULL DEFAULT 'admin',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS revenue_overrides (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_id      TEXT NOT NULL,
      hotel_name    TEXT NOT NULL,
      override_date DATE NOT NULL,
      price_sar     NUMERIC(10,2) NOT NULL,
      reason        TEXT NOT NULL,
      approved_by   TEXT NOT NULL DEFAULT 'admin',
      status        TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','expired','cancelled')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS revenue_targets (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period          TEXT NOT NULL,
      period_type     TEXT NOT NULL DEFAULT 'month'
                      CHECK (period_type IN ('month','quarter','year')),
      target_revpar   NUMERIC(10,2),
      target_occ_pct  NUMERIC(5,2),
      target_adr      NUMERIC(10,2),
      actual_revpar   NUMERIC(10,2),
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (period, period_type)
    );
  `);

  // Seeds
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const q    = Math.ceil((now.getMonth() + 1) / 3);

  await pool.query(`
    INSERT INTO revenue_rules (name, type, adjustment, value, start_date, end_date, priority, notes)
    VALUES
      ('Ramadan Peak',    'seasonal', 'percent',  20, '2026-02-28', '2026-03-29', 1, 'Ramadan 2026 pricing uplift'),
      ('Weekend Premium', 'demand',   'percent',  10, NULL, NULL, 3, 'Friday-Saturday premium for all hotels'),
      ('Low Demand Disc', 'demand',   'percent', -15, NULL, NULL, 7, 'Discount during low-demand periods'),
      ('Hajj Season',     'event',    'percent',  35, '2026-06-01', '2026-06-20', 1, 'Hajj 2026 peak pricing')
    ON CONFLICT DO NOTHING;

    INSERT INTO revenue_targets (period, period_type, target_revpar, target_occ_pct, target_adr)
    VALUES
      ($1, 'month',   450, 72, 625),
      ($2, 'quarter', 430, 70, 600),
      ($3, 'year',    410, 68, 600)
    ON CONFLICT (period, period_type) DO NOTHING;
  `, [
    `${yyyy}-${mm}`,
    `${yyyy}-Q${q}`,
    `${yyyy}`,
  ]);

  console.log('[revenue] bootstrap complete');
}
bootstrap().catch(err => console.error('[revenue] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [rules, blackouts, overrides] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE active = TRUE) AS active_rules FROM revenue_rules`),
      pool.query(`SELECT COUNT(*) AS blackouts_this_month FROM revenue_blackouts
                  WHERE date_trunc('month', start_date) = date_trunc('month', CURRENT_DATE)`),
      pool.query(`SELECT COUNT(*) AS overrides_this_week FROM revenue_overrides
                  WHERE status = 'active' AND created_at >= NOW() - INTERVAL '7 days'`),
    ]);

    // Proxy pending AI recs count from pricing service
    let pendingRecs = 0;
    try {
      const r = await fetch(`${PRICING_SERVICE}/api/v1/pricing/recommendations?status=pending&limit=1`, {
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const json = await r.json();
        pendingRecs = json.total ?? (json.data?.length ?? 0);
      }
    } catch { /* pricing service unavailable — non-fatal */ }

    res.json({
      data: {
        active_rules:        parseInt(rules.rows[0].active_rules),
        blackouts_this_month: parseInt(blackouts.rows[0].blackouts_this_month),
        overrides_this_week:  parseInt(overrides.rows[0].overrides_this_week),
        pending_ai_recs:      pendingRecs,
      },
    });
  } catch (err) {
    console.error('[revenue] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Rules ─────────────────────────────────────────────────────────────────────
router.get('/rules', async (req, res) => {
  const { type, active, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (type)   { params.push(type);           conditions.push(`type = $${params.length}`); }
  if (active !== undefined) { params.push(active === 'true'); conditions.push(`active = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM revenue_rules ${where}
         ORDER BY priority ASC, active DESC, name ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM revenue_rules ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[revenue] GET /rules error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/rules', async (req, res) => {
  const { name, type = 'seasonal', applies_to = 'all', hotel_id, adjustment = 'percent',
          value, start_date, end_date, priority = 5, active = true, created_by = 'admin', notes } = req.body;
  if (!name || value === undefined) return res.status(400).json({ error: 'name and value are required' });
  try {
    const result = await pool.query(
      `INSERT INTO revenue_rules (name, type, applies_to, hotel_id, adjustment, value, start_date, end_date, priority, active, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, type, applies_to, hotel_id || null, adjustment, value, start_date || null, end_date || null, priority, active, created_by, notes || null],
    );
    const rule = result.rows[0];

    // ── Launch pricing rule approval workflow ─────────────────────────────────
    wf.launch({
      triggerEvent:   'pricing_rule_proposed',
      triggerRef:     rule.id,
      triggerRefType: 'revenue_rule',
      initiatedBy:    req.user?.email ?? created_by,
      context: {
        name,
        type,
        applies_to,
        adjustment,
        value:       parseFloat(value),
        hotel_id:    hotel_id || null,
        start_date:  start_date || null,
        end_date:    end_date || null,
      },
    });

    res.status(201).json({ data: rule });
  } catch (err) {
    console.error('[revenue] POST /rules error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/rules/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','type','applies_to','hotel_id','adjustment','value','start_date','end_date','priority','active','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE revenue_rules SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] PATCH /rules/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM revenue_rules WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] DELETE /rules/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Blackouts ─────────────────────────────────────────────────────────────────
router.get('/blackouts', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM revenue_blackouts ORDER BY start_date ASC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM revenue_blackouts`),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[revenue] GET /blackouts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/blackouts', async (req, res) => {
  const { name, hotel_id, start_date, end_date, reason, created_by = 'admin', estimated_revenue_impact_sar } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: 'name, start_date and end_date are required' });
  try {
    const result = await pool.query(
      `INSERT INTO revenue_blackouts (name, hotel_id, start_date, end_date, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, hotel_id || null, start_date, end_date, reason || null, created_by],
    );
    const blackout = result.rows[0];

    // ── Launch blackout approval workflow ──────────────────────────────────────
    wf.launch({
      triggerEvent:   'blackout_requested',
      triggerRef:     blackout.id,
      triggerRefType: 'blackout',
      initiatedBy:    req.user?.email ?? created_by,
      context: {
        blackout_id:                   blackout.id,
        name,
        hotel_id:                      hotel_id ?? null,
        start_date,
        end_date,
        reason:                        reason ?? null,
        estimated_revenue_impact_sar:  estimated_revenue_impact_sar ?? null,
      },
    });

    res.status(201).json({ data: blackout });
  } catch (err) {
    console.error('[revenue] POST /blackouts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/blackouts/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','hotel_id','start_date','end_date','reason'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE revenue_blackouts SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] PATCH /blackouts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/blackouts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM revenue_blackouts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] DELETE /blackouts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Overrides ─────────────────────────────────────────────────────────────────
router.get('/overrides', async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM revenue_overrides ${where} ORDER BY override_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM revenue_overrides ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[revenue] GET /overrides error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/overrides', async (req, res) => {
  const { hotel_id, hotel_name, override_date, price_sar, reason, approved_by = 'admin' } = req.body;
  if (!hotel_id || !hotel_name || !override_date || price_sar === undefined || !reason)
    return res.status(400).json({ error: 'hotel_id, hotel_name, override_date, price_sar and reason are required' });
  try {
    const result = await pool.query(
      `INSERT INTO revenue_overrides (hotel_id, hotel_name, override_date, price_sar, reason, approved_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [hotel_id, hotel_name, override_date, price_sar, reason, approved_by],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] POST /overrides error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/overrides/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['price_sar','reason','status'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE revenue_overrides SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] PATCH /overrides/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/overrides/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM revenue_overrides WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] DELETE /overrides/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Targets ───────────────────────────────────────────────────────────────────
router.get('/targets', async (req, res) => {
  const { period_type } = req.query;
  const conditions = [];
  const params = [];
  if (period_type) { params.push(period_type); conditions.push(`period_type = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const result = await pool.query(
      `SELECT * FROM revenue_targets ${where} ORDER BY period_type, period DESC`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[revenue] GET /targets error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/targets', async (req, res) => {
  const { period, period_type = 'month', target_revpar, target_occ_pct, target_adr, actual_revpar, notes } = req.body;
  if (!period || !period_type) return res.status(400).json({ error: 'period and period_type are required' });
  try {
    const result = await pool.query(
      `INSERT INTO revenue_targets (period, period_type, target_revpar, target_occ_pct, target_adr, actual_revpar, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [period, period_type, target_revpar || null, target_occ_pct || null, target_adr || null, actual_revpar || null, notes || null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'TARGET_EXISTS', message: 'A target for this period already exists' });
    console.error('[revenue] POST /targets error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/targets/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['period','period_type','target_revpar','target_occ_pct','target_adr','actual_revpar','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE revenue_targets SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[revenue] PATCH /targets/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── AI Recommendations (proxy to pricing service) ─────────────────────────────
router.get('/ai-recommendations', async (req, res) => {
  try {
    const qs  = new URLSearchParams(req.query).toString();
    const url = `${PRICING_SERVICE}/api/v1/pricing/recommendations${qs ? '?' + qs : ''}`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch {
    res.status(503).json({ error: 'PRICING_SERVICE_UNAVAILABLE' });
  }
});

router.post('/ai-recommendations/:rec_id/accept', async (req, res) => {
  try {
    const r = await fetch(
      `${PRICING_SERVICE}/api/v1/pricing/recommendations/${req.params.rec_id}/accept`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body), signal: AbortSignal.timeout(8000) },
    );
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch {
    res.status(503).json({ error: 'PRICING_SERVICE_UNAVAILABLE' });
  }
});

router.post('/ai-recommendations/:rec_id/reject', async (req, res) => {
  try {
    const r = await fetch(
      `${PRICING_SERVICE}/api/v1/pricing/recommendations/${req.params.rec_id}/reject`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body), signal: AbortSignal.timeout(8000) },
    );
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch {
    res.status(503).json({ error: 'PRICING_SERVICE_UNAVAILABLE' });
  }
});

router.get('/ai-revpar', async (req, res) => {
  try {
    const qs  = new URLSearchParams(req.query).toString();
    const url = `${PRICING_SERVICE}/api/v1/pricing/metrics/revpar${qs ? '?' + qs : ''}`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch {
    res.status(503).json({ error: 'PRICING_SERVICE_UNAVAILABLE' });
  }
});

module.exports = router;
