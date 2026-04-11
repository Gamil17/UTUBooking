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
    CREATE TABLE IF NOT EXISTS cs_accounts (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name             TEXT NOT NULL,
      type             TEXT NOT NULL DEFAULT 'corporate'
                       CHECK (type IN ('corporate','travel_agency','vip_individual','group_operator','government')),
      tier             TEXT NOT NULL DEFAULT 'standard'
                       CHECK (tier IN ('enterprise','premium','standard')),
      status           TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','at_risk','churned','onboarding')),
      country          TEXT,
      contact_name     TEXT,
      contact_email    TEXT,
      contact_phone    TEXT,
      owner            TEXT,
      ltv_sar          NUMERIC(14,2) DEFAULT 0,
      nps_score        INT,
      health_score     INT DEFAULT 50,
      churn_risk       TEXT DEFAULT 'low'
                       CHECK (churn_risk IN ('critical','high','medium','low')),
      renewal_date     DATE,
      notes            TEXT,
      last_contacted_at TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cs_touchpoints (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id   UUID REFERENCES cs_accounts(id) ON DELETE CASCADE,
      account_name TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'call'
                   CHECK (type IN ('call','email','meeting','qbr','onboarding','renewal','escalation','note')),
      summary      TEXT NOT NULL,
      outcome      TEXT NOT NULL DEFAULT 'neutral'
                   CHECK (outcome IN ('positive','neutral','negative')),
      owner        TEXT,
      touched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cs_escalations (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id   UUID REFERENCES cs_accounts(id) ON DELETE SET NULL,
      account_name TEXT NOT NULL,
      subject      TEXT NOT NULL,
      priority     TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('critical','high','medium','low')),
      status       TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','resolved','closed')),
      owner        TEXT,
      root_cause   TEXT,
      resolution   TEXT,
      opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO cs_accounts (name, type, tier, status, country, contact_name, contact_email, health_score, ltv_sar, owner)
    VALUES
      ('Saudia Corporate Travel',      'corporate',       'enterprise', 'active',   'SA', 'Fahad Al-Otaibi', 'fahad@saudia.com',    85, 2500000, 'Amira Hassan'),
      ('Saudi Tourism Authority',      'government',      'enterprise', 'active',   'SA', 'Nora Al-Qahtani', 'nora@sta.gov.sa',     78, 1800000, 'Amira Hassan'),
      ('Al-Futtaim Travel',            'travel_agency',   'premium',    'active',   'AE', 'Omar Khalil',     'omar@alfuttaim.ae',   72, 950000,  'Karim Saleh'),
      ('VIP Pilgrim Group Operations', 'group_operator',  'premium',    'at_risk',  'SA', 'Abdullah Mirza',  'a.mirza@pilgrim.sa',  45, 620000,  'Karim Saleh')
    ON CONFLICT DO NOTHING;
  `);

  console.log('[customer-success] bootstrap complete');
}
bootstrap().catch(err => console.error('[customer-success] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [accounts, escalations, health] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status != 'churned') AS active_accounts,
          COUNT(*) FILTER (WHERE status = 'at_risk') AS at_risk,
          COUNT(*) FILTER (WHERE tier = 'enterprise') AS enterprise_count
        FROM cs_accounts
      `),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_escalations FROM cs_escalations`),
      pool.query(`SELECT COALESCE(AVG(health_score), 0) AS avg_health FROM cs_accounts WHERE status != 'churned'`),
    ]);
    const a = accounts.rows[0];
    res.json({
      data: {
        active_accounts:  parseInt(a.active_accounts),
        at_risk:          parseInt(a.at_risk),
        enterprise_count: parseInt(a.enterprise_count),
        open_escalations: parseInt(escalations.rows[0].open_escalations),
        avg_health_score: Math.round(parseFloat(health.rows[0].avg_health)),
      },
    });
  } catch (err) {
    console.error('[customer-success] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Accounts ──────────────────────────────────────────────────────────────────
router.get('/accounts', async (req, res) => {
  const { type, tier, status, churn_risk, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (type)       { params.push(type);       conditions.push(`type = $${params.length}`); }
  if (tier)       { params.push(tier);       conditions.push(`tier = $${params.length}`); }
  if (status)     { params.push(status);     conditions.push(`status = $${params.length}`); }
  if (churn_risk) { params.push(churn_risk); conditions.push(`churn_risk = $${params.length}`); }
  if (search)     { params.push(`%${search}%`); conditions.push(`(name ILIKE $${params.length} OR contact_email ILIKE $${params.length})`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM cs_accounts ${where}
         ORDER BY
           CASE tier WHEN 'enterprise' THEN 1 WHEN 'premium' THEN 2 ELSE 3 END,
           CASE churn_risk WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           name ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM cs_accounts ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[customer-success] GET /accounts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/accounts', async (req, res) => {
  const { name, type = 'corporate', tier = 'standard', status = 'active', country,
          contact_name, contact_email, contact_phone, owner, ltv_sar = 0,
          nps_score, health_score = 50, churn_risk = 'low', renewal_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO cs_accounts (name, type, tier, status, country, contact_name, contact_email, contact_phone, owner, ltv_sar, nps_score, health_score, churn_risk, renewal_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [name, type, tier, status, country||null, contact_name||null, contact_email||null, contact_phone||null, owner||null, ltv_sar, nps_score||null, health_score, churn_risk, renewal_date||null, notes||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[customer-success] POST /accounts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','type','tier','status','country','contact_name','contact_email','contact_phone','owner','ltv_sar','nps_score','health_score','churn_risk','renewal_date','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE cs_accounts SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[customer-success] PATCH /accounts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cs_accounts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[customer-success] DELETE /accounts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Touchpoints ───────────────────────────────────────────────────────────────
router.get('/accounts/:id/touchpoints', async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM cs_touchpoints WHERE account_id = $1 ORDER BY touched_at DESC LIMIT $2 OFFSET $3`,
        [id, parseInt(limit), offset],
      ),
      pool.query(`SELECT COUNT(*) FROM cs_touchpoints WHERE account_id = $1`, [id]),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[customer-success] GET /accounts/:id/touchpoints error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/accounts/:id/touchpoints', async (req, res) => {
  const { id } = req.params;
  const { type = 'call', summary, outcome = 'neutral', owner, touched_at } = req.body;
  if (!summary) return res.status(400).json({ error: 'summary is required' });

  try {
    const account = await pool.query('SELECT name FROM cs_accounts WHERE id = $1', [id]);
    if (!account.rows.length) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });

    const [tp] = await Promise.all([
      pool.query(
        `INSERT INTO cs_touchpoints (account_id, account_name, type, summary, outcome, owner, touched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, account.rows[0].name, type, summary, outcome, owner||null, touched_at || new Date().toISOString()],
      ),
      pool.query(`UPDATE cs_accounts SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1`, [id]),
    ]);
    res.status(201).json({ data: tp.rows[0] });
  } catch (err) {
    console.error('[customer-success] POST /accounts/:id/touchpoints error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Escalations ───────────────────────────────────────────────────────────────
router.get('/escalations', async (req, res) => {
  const { status, priority, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (status)   { params.push(status);   conditions.push(`status = $${params.length}`); }
  if (priority) { params.push(priority); conditions.push(`priority = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM cs_escalations ${where}
         ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, opened_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM cs_escalations ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[customer-success] GET /escalations error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/escalations', async (req, res) => {
  const { account_id, account_name, subject, priority = 'medium', status = 'open', owner } = req.body;
  if (!account_name || !subject) return res.status(400).json({ error: 'account_name and subject are required' });
  try {
    const result = await pool.query(
      `INSERT INTO cs_escalations (account_id, account_name, subject, priority, status, owner)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [account_id||null, account_name, subject, priority, status, owner||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[customer-success] POST /escalations error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/escalations/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['subject','priority','status','owner','root_cause','resolution'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  if (['resolved','closed'].includes(req.body.status) && !req.body.resolved_at) {
    fields.push('resolved_at');
    req.body.resolved_at = new Date().toISOString();
  }

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE cs_escalations SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[customer-success] PATCH /escalations/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/escalations/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cs_escalations WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[customer-success] DELETE /escalations/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
