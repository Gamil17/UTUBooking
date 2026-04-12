'use strict';

const { Router } = require('express');
const { Pool }   = require('pg');
const wf         = require('../lib/workflow-client');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

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
    CREATE TABLE IF NOT EXISTS bi_dashboards (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      description TEXT,
      config      JSONB NOT NULL DEFAULT '{}',
      is_default  BOOLEAN NOT NULL DEFAULT FALSE,
      created_by  TEXT NOT NULL DEFAULT 'admin',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bi_reports (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      description TEXT,
      query_type  TEXT NOT NULL DEFAULT 'bookings'
                  CHECK (query_type IN ('bookings','revenue','users','flights','hotels','cars','loyalty','funnel')),
      filters     JSONB NOT NULL DEFAULT '{}',
      schedule    TEXT,
      last_run_at TIMESTAMPTZ,
      created_by  TEXT NOT NULL DEFAULT 'admin',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bi_kpi_targets (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL UNIQUE,
      category      TEXT NOT NULL DEFAULT 'revenue'
                    CHECK (category IN ('revenue','bookings','users','conversion','retention','operations')),
      metric_key    TEXT NOT NULL,
      target_value  NUMERIC(16,4) NOT NULL,
      current_value NUMERIC(16,4),
      unit          TEXT NOT NULL DEFAULT 'SAR'
                    CHECK (unit IN ('SAR','%','count','ms','days')),
      period        TEXT NOT NULL DEFAULT 'monthly'
                    CHECK (period IN ('daily','weekly','monthly','quarterly','annual')),
      owner         TEXT,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bi_alerts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      kpi_target_id UUID REFERENCES bi_kpi_targets(id) ON DELETE CASCADE,
      condition     TEXT NOT NULL DEFAULT 'below_target'
                    CHECK (condition IN ('below_target','above_target','below_threshold','above_threshold')),
      threshold     NUMERIC(16,4),
      notify_email  TEXT,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      last_fired_at TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seeds: 8 KPI targets + 1 default dashboard
  await pool.query(`
    INSERT INTO bi_kpi_targets (name, category, metric_key, target_value, current_value, unit, period, owner)
    VALUES
      ('Monthly Revenue',            'revenue',    'monthly_revenue_sar',         5000000, 3820000, 'SAR',   'monthly',   'Finance'),
      ('Booking Conversion Rate',    'conversion', 'booking_conversion_pct',      3.2,     2.8,     '%',     'monthly',   'Products'),
      ('Monthly Active Users',       'users',      'monthly_active_users',        50000,   38500,   'count', 'monthly',   'Products'),
      ('Hotel Booking Rate',         'bookings',   'hotel_booking_share_pct',     65,      61,      '%',     'monthly',   'Sales'),
      ('Flight Booking Rate',        'bookings',   'flight_booking_share_pct',    25,      22,      '%',     'monthly',   'Sales'),
      ('Support Ticket Resolution',  'operations', 'avg_resolution_hours',        24,      31,      'hours', 'monthly',   'Ops'),
      ('AI Pricing Acceptance Rate', 'operations', 'ai_pricing_acceptance_pct',   70,      65,      '%',     'monthly',   'Products'),
      ('Net Promoter Score',         'retention',  'nps_score',                   50,      42,      'count', 'quarterly', 'Customer Success')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO bi_dashboards (name, description, is_default, config)
    VALUES ('Executive Overview', 'Top-level KPIs and business health', TRUE, '{"widgets":["revenue","conversion","mau","nps"]}')
    ON CONFLICT DO NOTHING;
  `);

  console.log('[analytics] bootstrap complete');
}
bootstrap().catch(err => console.error('[analytics] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [kpis, alerts, reports] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE current_value IS NOT NULL AND target_value > 0
            AND CASE unit WHEN 'hours' THEN current_value <= target_value WHEN 'ms' THEN current_value <= target_value ELSE current_value >= target_value * 0.9 END
          ) AS on_target,
          COUNT(*) FILTER (WHERE current_value IS NOT NULL AND target_value > 0
            AND CASE unit WHEN 'hours' THEN current_value > target_value WHEN 'ms' THEN current_value > target_value ELSE current_value < target_value * 0.9 END
          ) AS off_target
        FROM bi_kpi_targets
      `),
      pool.query(`SELECT COUNT(*) FILTER (WHERE active = TRUE) AS active_alerts FROM bi_alerts`),
      pool.query(`SELECT COUNT(*) AS reports_count FROM bi_reports`),
    ]);
    res.json({
      data: {
        on_target:     parseInt(kpis.rows[0].on_target),
        off_target:    parseInt(kpis.rows[0].off_target),
        active_alerts: parseInt(alerts.rows[0].active_alerts),
        reports_count: parseInt(reports.rows[0].reports_count),
      },
    });
  } catch (err) {
    console.error('[analytics] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── KPI Targets — summary BEFORE :id ─────────────────────────────────────────
router.get('/kpi-targets/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *,
        CASE
          WHEN current_value IS NULL OR target_value = 0 THEN NULL
          WHEN unit IN ('hours','ms','days') THEN ROUND((target_value / NULLIF(current_value,0)) * 100, 1)
          ELSE ROUND((current_value / target_value) * 100, 1)
        END AS hit_pct
      FROM bi_kpi_targets
      ORDER BY category, name
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[analytics] GET /kpi-targets/summary error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.get('/kpi-targets', async (req, res) => {
  const { category, period } = req.query;
  const conditions = [];
  const params = [];
  if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
  if (period)   { params.push(period);   conditions.push(`period = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const result = await pool.query(`SELECT * FROM bi_kpi_targets ${where} ORDER BY category, name`, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[analytics] GET /kpi-targets error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/kpi-targets', async (req, res) => {
  const { name, category = 'revenue', metric_key, target_value, current_value, unit = 'SAR', period = 'monthly', owner } = req.body;
  if (!name || !metric_key || target_value === undefined) return res.status(400).json({ error: 'name, metric_key and target_value are required' });
  try {
    const result = await pool.query(
      `INSERT INTO bi_kpi_targets (name, category, metric_key, target_value, current_value, unit, period, owner)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, category, metric_key, target_value, current_value||null, unit, period, owner||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'KPI_EXISTS' });
    console.error('[analytics] POST /kpi-targets error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/kpi-targets/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','category','metric_key','target_value','current_value','unit','period','owner'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  fields.push('updated_at');
  req.body.updated_at = new Date().toISOString();
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE bi_kpi_targets SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] PATCH /kpi-targets/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/kpi-targets/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bi_kpi_targets WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] DELETE /kpi-targets/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Dashboards ────────────────────────────────────────────────────────────────
router.get('/dashboards', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM bi_dashboards ORDER BY is_default DESC, name ASC`);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[analytics] GET /dashboards error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/dashboards', async (req, res) => {
  const { name, description, config = {}, is_default = false, created_by = 'admin' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    if (is_default) {
      await pool.query(`UPDATE bi_dashboards SET is_default = FALSE`);
    }
    const result = await pool.query(
      `INSERT INTO bi_dashboards (name, description, config, is_default, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description||null, JSON.stringify(config), is_default, created_by],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] POST /dashboards error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/dashboards/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','description','config','is_default'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  try {
    if (req.body.is_default === true) {
      await pool.query(`UPDATE bi_dashboards SET is_default = FALSE WHERE id != $1`, [id]);
    }
    const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => f === 'config' ? JSON.stringify(req.body[f]) : req.body[f]);
    const result = await pool.query(
      `UPDATE bi_dashboards SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] PATCH /dashboards/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/dashboards/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bi_dashboards WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] DELETE /dashboards/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  const { query_type, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (query_type) { params.push(query_type); conditions.push(`query_type = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM bi_reports ${where} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM bi_reports ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[analytics] GET /reports error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/reports', async (req, res) => {
  const { name, description, query_type = 'bookings', filters = {}, schedule, created_by = 'admin' } = req.body;
  if (!name || !query_type) return res.status(400).json({ error: 'name and query_type are required' });
  try {
    const result = await pool.query(
      `INSERT INTO bi_reports (name, description, query_type, filters, schedule, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description||null, query_type, JSON.stringify(filters), schedule||null, created_by],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] POST /reports error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/reports/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','description','query_type','filters','schedule'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => f === 'filters' ? JSON.stringify(req.body[f]) : req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE bi_reports SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] PATCH /reports/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bi_reports WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] DELETE /reports/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Alerts ────────────────────────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  const { active } = req.query;
  const conditions = [];
  const params = [];
  if (active !== undefined) { params.push(active === 'true'); conditions.push(`active = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const result = await pool.query(`SELECT * FROM bi_alerts ${where} ORDER BY active DESC, name ASC`, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[analytics] GET /alerts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/alerts', async (req, res) => {
  const { name, kpi_target_id, condition = 'below_target', threshold, notify_email, active = true } = req.body;
  if (!name || !condition) return res.status(400).json({ error: 'name and condition are required' });
  try {
    const result = await pool.query(
      `INSERT INTO bi_alerts (name, kpi_target_id, condition, threshold, notify_email, active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, kpi_target_id||null, condition, threshold||null, notify_email||null, active],
    );
    const alert = result.rows[0];

    // ── Launch KPI investigation workflow when an alert is raised as active ───
    // Represents a known threshold breach being flagged for management review.
    if (Boolean(active)) {
      wf.launch({
        triggerEvent:   'kpi_threshold_breached',
        triggerRef:     alert.id,
        triggerRefType: 'bi_alert',
        initiatedBy:    req.user?.email ?? notify_email ?? 'admin',
        context: {
          name,
          condition,
          threshold:      threshold ?? null,
          kpi_target_id:  kpi_target_id || null,
          notify_email:   notify_email || null,
        },
      });
    }

    res.status(201).json({ data: alert });
  } catch (err) {
    console.error('[analytics] POST /alerts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/alerts/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','condition','threshold','notify_email','active'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE bi_alerts SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] PATCH /alerts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/alerts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bi_alerts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[analytics] DELETE /alerts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
