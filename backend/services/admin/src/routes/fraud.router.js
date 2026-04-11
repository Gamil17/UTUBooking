'use strict';

const { Router } = require('express');
const { Pool }   = require('pg');

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
    CREATE TABLE IF NOT EXISTS fraud_cases (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_ref     TEXT,
      user_id         TEXT,
      user_email      TEXT,
      amount_sar      NUMERIC(14,2),
      payment_method  TEXT,
      ip_address      TEXT,
      country         TEXT,
      risk_score      INT NOT NULL DEFAULT 0,
      flags           TEXT[] NOT NULL DEFAULT '{}',
      status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','reviewing','confirmed_fraud','false_positive','escalated')),
      assigned_to     TEXT,
      decision_reason TEXT,
      decided_at      TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fraud_rules (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL UNIQUE,
      type        TEXT NOT NULL DEFAULT 'threshold'
                  CHECK (type IN ('threshold','velocity','geo','device','card','pattern','ml')),
      description TEXT,
      condition   JSONB NOT NULL DEFAULT '{}',
      action      TEXT NOT NULL DEFAULT 'flag'
                  CHECK (action IN ('flag','block','review','allow')),
      severity    TEXT NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('critical','high','medium','low')),
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      hit_count   INT NOT NULL DEFAULT 0,
      created_by  TEXT NOT NULL DEFAULT 'admin',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fraud_decisions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id     UUID REFERENCES fraud_cases(id) ON DELETE CASCADE,
      booking_ref TEXT,
      decision    TEXT NOT NULL
                  CHECK (decision IN ('confirmed_fraud','false_positive','escalated')),
      reason      TEXT NOT NULL,
      decided_by  TEXT NOT NULL DEFAULT 'admin',
      decided_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fraud_watchlist (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type       TEXT NOT NULL
                 CHECK (type IN ('email','ip','card_bin','device_id','phone')),
      value      TEXT NOT NULL,
      reason     TEXT NOT NULL,
      severity   TEXT NOT NULL DEFAULT 'high'
                 CHECK (severity IN ('critical','high','medium')),
      added_by   TEXT NOT NULL DEFAULT 'admin',
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (type, value)
    );
  `);

  await pool.query(`
    INSERT INTO fraud_rules (name, type, description, condition, action, severity)
    VALUES
      ('High Velocity Booking',     'velocity',  'More than 5 bookings in 10 minutes from same IP',         '{"max_count":5,"window_minutes":10,"group_by":"ip"}',         'flag',   'high'),
      ('Geo Mismatch',              'geo',        'Billing country differs from booking origin country',     '{"check":"billing_vs_origin"}',                              'review', 'medium'),
      ('High-Risk IP Range',        'geo',        'Requests from known high-fraud IP ranges',                '{"source":"ip_reputation_db","threshold":0.8}',               'block',  'critical'),
      ('Card BIN Blacklist',        'card',       'Card BIN matches known fraudulent issuer patterns',       '{"check":"bin_blacklist"}',                                   'block',  'critical'),
      ('Late Night Bulk Booking',   'pattern',    'High-value booking between 02:00-05:00 local time',      '{"hours_utc":[2,3,4],"min_amount_sar":5000}',                 'review', 'medium'),
      ('Multi-Card Same IP',        'velocity',  'More than 3 different cards used from same IP in 1 hour', '{"max_cards":3,"window_minutes":60,"group_by":"ip"}',         'flag',   'high')
    ON CONFLICT (name) DO NOTHING;
  `);

  console.log('[fraud] bootstrap complete');
}
bootstrap().catch(err => console.error('[fraud] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [cases, fraud, fp_rate, rules, watchlist] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending FROM fraud_cases`),
      pool.query(`SELECT COALESCE(SUM(amount_sar), 0) AS total_sar FROM fraud_cases
                  WHERE status = 'confirmed_fraud' AND date_trunc('month', created_at) = date_trunc('month', NOW())`),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE decision = 'false_positive') AS fp,
                    COUNT(*) AS total
                  FROM fraud_decisions
                  WHERE decided_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE active = TRUE) AS active_rules FROM fraud_rules`),
      pool.query(`SELECT COUNT(*) AS watchlist_entries FROM fraud_watchlist WHERE (expires_at IS NULL OR expires_at > NOW())`),
    ]);

    const fpRow  = fp_rate.rows[0];
    const fpRate = fpRow.total > 0 ? Math.round((fpRow.fp / fpRow.total) * 100) : 0;

    res.json({
      data: {
        pending_cases:       parseInt(cases.rows[0].pending),
        confirmed_fraud_sar: parseFloat(fraud.rows[0].total_sar),
        false_positive_rate: fpRate,
        active_rules:        parseInt(rules.rows[0].active_rules),
        watchlist_entries:   parseInt(watchlist.rows[0].watchlist_entries),
      },
    });
  } catch (err) {
    console.error('[fraud] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Cases ─────────────────────────────────────────────────────────────────────
router.get('/cases', async (req, res) => {
  const { status, country, min_risk, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (status)   { params.push(status);          conditions.push(`status = $${params.length}`); }
  if (country)  { params.push(country);         conditions.push(`country = $${params.length}`); }
  if (min_risk) { params.push(parseInt(min_risk)); conditions.push(`risk_score >= $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM fraud_cases ${where} ORDER BY risk_score DESC, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM fraud_cases ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[fraud] GET /cases error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/cases', async (req, res) => {
  const { booking_ref, user_id, user_email, amount_sar, payment_method, ip_address, country, risk_score = 0, flags = [], assigned_to } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO fraud_cases (booking_ref, user_id, user_email, amount_sar, payment_method, ip_address, country, risk_score, flags, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [booking_ref||null, user_id||null, user_email||null, amount_sar||null, payment_method||null, ip_address||null, country||null, risk_score, flags, assigned_to||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] POST /cases error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/cases/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['status','assigned_to','decision_reason'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const decisionStatuses = ['confirmed_fraud','false_positive','escalated'];
  const newStatus = req.body.status;

  if (newStatus && decisionStatuses.includes(newStatus)) {
    fields.push('decided_at');
    req.body.decided_at = new Date().toISOString();
  }

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE fraud_cases SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // Insert decision audit record
    if (newStatus && decisionStatuses.includes(newStatus) && req.body.decision_reason) {
      const c = result.rows[0];
      await pool.query(
        `INSERT INTO fraud_decisions (case_id, booking_ref, decision, reason, decided_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, c.booking_ref, newStatus, req.body.decision_reason, 'admin'],
      );
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] PATCH /cases/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/cases/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM fraud_cases WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] DELETE /cases/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Rules ─────────────────────────────────────────────────────────────────────
router.get('/rules', async (req, res) => {
  const { type, active, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (type)   { params.push(type); conditions.push(`type = $${params.length}`); }
  if (active !== undefined) { params.push(active === 'true'); conditions.push(`active = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM fraud_rules ${where}
         ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, hit_count DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM fraud_rules ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[fraud] GET /rules error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/rules', async (req, res) => {
  const { name, type = 'threshold', description, condition = {}, action = 'flag', severity = 'medium', created_by = 'admin' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO fraud_rules (name, type, description, condition, action, severity, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, description||null, JSON.stringify(condition), action, severity, created_by],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'RULE_EXISTS' });
    console.error('[fraud] POST /rules error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/rules/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','type','description','condition','action','severity','active'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => f === 'condition' ? JSON.stringify(req.body[f]) : req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE fraud_rules SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] PATCH /rules/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM fraud_rules WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] DELETE /rules/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Watchlist ─────────────────────────────────────────────────────────────────
router.get('/watchlist', async (req, res) => {
  const { type, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['(expires_at IS NULL OR expires_at > NOW())'];
  const params = [];
  if (type) { params.push(type); conditions.push(`type = $${params.length}`); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM fraud_watchlist ${where} ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM fraud_watchlist ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[fraud] GET /watchlist error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/watchlist', async (req, res) => {
  const { type, value, reason, severity = 'high', added_by = 'admin', expires_at } = req.body;
  if (!type || !value || !reason) return res.status(400).json({ error: 'type, value and reason are required' });
  try {
    const result = await pool.query(
      `INSERT INTO fraud_watchlist (type, value, reason, severity, added_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (type, value) DO UPDATE SET reason = EXCLUDED.reason, severity = EXCLUDED.severity, expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [type, value, reason, severity, added_by, expires_at||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] POST /watchlist error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/watchlist/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM fraud_watchlist WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[fraud] DELETE /watchlist/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Decisions (read-only audit) ───────────────────────────────────────────────
router.get('/decisions', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM fraud_decisions ORDER BY decided_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM fraud_decisions`),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[fraud] GET /decisions error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
