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
    CREATE TABLE IF NOT EXISTS procurement_suppliers (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name             TEXT NOT NULL UNIQUE,
      type             TEXT NOT NULL DEFAULT 'api_provider'
                       CHECK (type IN ('api_provider','gds','hotel_chain','airline','car_rental','insurance','technology','other')),
      status           TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','onboarding','suspended','terminated')),
      country          TEXT,
      contact_name     TEXT,
      contact_email    TEXT,
      website          TEXT,
      account_id       TEXT,
      annual_value_sar NUMERIC(16,2) DEFAULT 0,
      owner            TEXT,
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS procurement_contracts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id   UUID REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
      supplier_name TEXT NOT NULL,
      title         TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'service'
                    CHECK (type IN ('service','api','license','distribution','nda','framework','other')),
      value_sar     NUMERIC(16,2) DEFAULT 0,
      start_date    DATE,
      end_date      DATE,
      auto_renews   BOOLEAN NOT NULL DEFAULT FALSE,
      status        TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','expired','terminated','under_review')),
      signed_by     TEXT,
      file_url      TEXT,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS procurement_slas (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id        UUID REFERENCES procurement_suppliers(id) ON DELETE CASCADE,
      supplier_name      TEXT NOT NULL,
      metric             TEXT NOT NULL,
      target_value       NUMERIC(10,4) NOT NULL,
      unit               TEXT NOT NULL DEFAULT '%'
                         CHECK (unit IN ('%','ms','hours','days')),
      measurement_period TEXT NOT NULL DEFAULT 'monthly'
                         CHECK (measurement_period IN ('daily','weekly','monthly','quarterly')),
      current_value      NUMERIC(10,4),
      status             TEXT NOT NULL DEFAULT 'met'
                         CHECK (status IN ('met','at_risk','breached','pending')),
      last_reviewed_at   TIMESTAMPTZ,
      notes              TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS procurement_purchase_orders (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id   UUID REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
      supplier_name TEXT NOT NULL,
      po_number     TEXT NOT NULL UNIQUE,
      description   TEXT NOT NULL,
      amount_sar    NUMERIC(16,2) NOT NULL,
      status        TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','sent','delivered','paid','cancelled')),
      ordered_at    DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_at   DATE,
      approved_by   TEXT,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO procurement_suppliers (name, type, status, country, website, annual_value_sar)
    VALUES
      ('Hotelbeds',          'api_provider', 'active', 'ES', 'https://www.hotelbeds.com',   1200000),
      ('Amadeus GDS',        'gds',          'active', 'ES', 'https://developers.amadeus.com', 850000),
      ('Sabre Corporation',  'gds',          'active', 'US', 'https://developer.sabre.com',  620000),
      ('Amazon Web Services','technology',   'active', 'US', 'https://aws.amazon.com',        480000),
      ('Stripe',             'technology',   'active', 'US', 'https://stripe.com',            180000),
      ('Twilio',             'technology',   'active', 'US', 'https://www.twilio.com',         95000),
      ('Saudia Airlines API','airline',       'active', 'SA', 'https://developer.saudia.com',  320000)
    ON CONFLICT (name) DO NOTHING;
  `);

  console.log('[procurement] bootstrap complete');
}
bootstrap().catch(err => console.error('[procurement] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [suppliers, contracts, slas, pos, spend] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'active') AS active_suppliers FROM procurement_suppliers`),
      pool.query(`SELECT COUNT(*) AS expiring_90d FROM procurement_contracts
                  WHERE status = 'active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'breached') AS breached_slas FROM procurement_slas`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('draft','approved')) AS pending_pos FROM procurement_purchase_orders`),
      pool.query(`SELECT COALESCE(SUM(annual_value_sar), 0) AS total FROM procurement_suppliers WHERE status = 'active'`),
    ]);
    res.json({
      data: {
        active_suppliers:       parseInt(suppliers.rows[0].active_suppliers),
        contracts_expiring_90d: parseInt(contracts.rows[0].expiring_90d),
        breached_slas:          parseInt(slas.rows[0].breached_slas),
        pending_pos:            parseInt(pos.rows[0].pending_pos),
        total_annual_spend_sar: parseFloat(spend.rows[0].total),
      },
    });
  } catch (err) {
    console.error('[procurement] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Suppliers ─────────────────────────────────────────────────────────────────
router.get('/suppliers', async (req, res) => {
  const { type, status, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (type)   { params.push(type);   conditions.push(`type = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`name ILIKE $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM procurement_suppliers ${where} ORDER BY annual_value_sar DESC, name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM procurement_suppliers ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[procurement] GET /suppliers error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/suppliers', async (req, res) => {
  const { name, type = 'api_provider', status = 'active', country, contact_name, contact_email, website, account_id, annual_value_sar = 0, owner, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO procurement_suppliers (name, type, status, country, contact_name, contact_email, website, account_id, annual_value_sar, owner, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, type, status, country||null, contact_name||null, contact_email||null, website||null, account_id||null, annual_value_sar, owner||null, notes||null],
    );
    const supplier = result.rows[0];

    // ── Launch supplier onboarding workflow when a new supplier enters onboarding ─
    if (status === 'onboarding') {
      wf.launch({
        triggerEvent:   'supplier_onboard_requested',
        triggerRef:     supplier.id,
        triggerRefType: 'supplier',
        initiatedBy:    req.user?.email ?? 'admin',
        context: {
          supplier_name:     name,
          supplier_type:     type,
          country:           country || null,
          contact_name:      contact_name || null,
          contact_email:     contact_email || null,
          annual_value_sar:  annual_value_sar,
        },
      });
    }

    res.status(201).json({ data: supplier });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SUPPLIER_EXISTS' });
    console.error('[procurement] POST /suppliers error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['name','type','status','country','contact_name','contact_email','website','account_id','annual_value_sar','owner','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE procurement_suppliers SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] PATCH /suppliers/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const active = await pool.query(
      `SELECT id FROM procurement_contracts WHERE supplier_id = $1 AND status = 'active' LIMIT 1`,
      [req.params.id],
    );
    if (active.rows.length) {
      const result = await pool.query(
        `UPDATE procurement_suppliers SET status = 'terminated', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [req.params.id],
      );
      return res.json({ data: result.rows[0], soft: true });
    }
    const result = await pool.query('DELETE FROM procurement_suppliers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] DELETE /suppliers/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Contracts (expiring BEFORE :id) ──────────────────────────────────────────
router.get('/contracts/expiring', async (req, res) => {
  const { days = 90 } = req.query;
  try {
    const result = await pool.query(
      `SELECT *, end_date - CURRENT_DATE AS days_until_expiry
       FROM procurement_contracts
       WHERE status = 'active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${parseInt(days)} days'
       ORDER BY end_date ASC`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[procurement] GET /contracts/expiring error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.get('/contracts', async (req, res) => {
  const { status, type, supplier_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (status)      { params.push(status);      conditions.push(`status = $${params.length}`); }
  if (type)        { params.push(type);        conditions.push(`type = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); conditions.push(`supplier_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM procurement_contracts ${where}
         ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 WHEN 'under_review' THEN 3 ELSE 4 END, end_date ASC NULLS LAST
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM procurement_contracts ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[procurement] GET /contracts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/contracts', async (req, res) => {
  const { supplier_id, supplier_name, title, type = 'service', value_sar = 0, start_date, end_date, auto_renews = false, status = 'active', signed_by, file_url, notes } = req.body;
  if (!supplier_name || !title) return res.status(400).json({ error: 'supplier_name and title are required' });
  try {
    const result = await pool.query(
      `INSERT INTO procurement_contracts (supplier_id, supplier_name, title, type, value_sar, start_date, end_date, auto_renews, status, signed_by, file_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [supplier_id||null, supplier_name, title, type, value_sar, start_date||null, end_date||null, auto_renews, status, signed_by||null, file_url||null, notes||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] POST /contracts error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/contracts/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['title','type','value_sar','start_date','end_date','auto_renews','status','signed_by','file_url','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE procurement_contracts SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] PATCH /contracts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/contracts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM procurement_contracts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] DELETE /contracts/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── SLAs ──────────────────────────────────────────────────────────────────────
router.get('/slas', async (req, res) => {
  const { status, supplier_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (status)      { params.push(status);      conditions.push(`status = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); conditions.push(`supplier_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM procurement_slas ${where}
         ORDER BY CASE status WHEN 'breached' THEN 1 WHEN 'at_risk' THEN 2 WHEN 'pending' THEN 3 ELSE 4 END, supplier_name ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM procurement_slas ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[procurement] GET /slas error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/slas', async (req, res) => {
  const { supplier_id, supplier_name, metric, target_value, unit = '%', measurement_period = 'monthly', current_value, status = 'pending', notes } = req.body;
  if (!supplier_name || !metric || target_value === undefined || !unit) return res.status(400).json({ error: 'supplier_name, metric, target_value and unit are required' });
  try {
    const result = await pool.query(
      `INSERT INTO procurement_slas (supplier_id, supplier_name, metric, target_value, unit, measurement_period, current_value, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [supplier_id||null, supplier_name, metric, target_value, unit, measurement_period, current_value||null, status, notes||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] POST /slas error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/slas/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['metric','target_value','unit','measurement_period','current_value','status','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  fields.push('last_reviewed_at');
  req.body.last_reviewed_at = new Date().toISOString();
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE procurement_slas SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] PATCH /slas/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/slas/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM procurement_slas WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] DELETE /slas/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Purchase Orders ───────────────────────────────────────────────────────────
router.get('/purchase-orders', async (req, res) => {
  const { status, supplier_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  if (status)      { params.push(status);      conditions.push(`status = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); conditions.push(`supplier_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM procurement_purchase_orders ${where} ORDER BY ordered_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM procurement_purchase_orders ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[procurement] GET /purchase-orders error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/purchase-orders', async (req, res) => {
  const { supplier_id, supplier_name, description, amount_sar, status = 'draft', ordered_at, expected_at, approved_by, notes } = req.body;
  if (!supplier_name || !description || amount_sar === undefined) return res.status(400).json({ error: 'supplier_name, description and amount_sar are required' });
  const po_number = `PO-${Date.now()}`;
  try {
    const result = await pool.query(
      `INSERT INTO procurement_purchase_orders (supplier_id, supplier_name, po_number, description, amount_sar, status, ordered_at, expected_at, approved_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [supplier_id||null, supplier_name, po_number, description, amount_sar, status, ordered_at||new Date().toISOString().split('T')[0], expected_at||null, approved_by||null, notes||null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] POST /purchase-orders error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  const ALLOWED = ['description','amount_sar','status','ordered_at','expected_at','approved_by','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });
  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const result = await pool.query(
      `UPDATE procurement_purchase_orders SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] PATCH /purchase-orders/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM procurement_purchase_orders WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[procurement] DELETE /purchase-orders/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
