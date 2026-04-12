'use strict';

const wf = require('../lib/workflow-client');

/**
 * Business Development Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/bizdev', bizdevRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                         — KPIs: partner counts, agreement values, markets, expiring
 *
 * GET  /partners                      — Strategic partner directory (filter: type, tier, status, country, search)
 * POST /partners                      — Create partner
 * PATCH /partners/:id                 — Update partner
 * DELETE /partners/:id                — Soft-churn if has agreements, hard delete otherwise
 *
 * GET  /partners/:id/activities       — Activity log for a partner
 * POST /partners/:id/activities       — Log activity (auto-updates last_contacted_at)
 *
 * GET  /agreements                    — Partnership agreements (filter: status, type, partner_id)
 * POST /agreements                    — Create agreement
 * PATCH /agreements/:id               — Update agreement
 * DELETE /agreements/:id              — Delete agreement
 * GET  /agreements/expiring           — Agreements expiring within ?days=90
 *
 * GET  /markets                       — Market expansion tracking (filter: status, region, priority)
 * POST /markets                       — Add market
 * PATCH /markets/:id                  — Update market
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const router = Router();
router.use(adminAuth);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bizdev_partners (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name      TEXT NOT NULL,
      type              TEXT NOT NULL DEFAULT 'other'
                        CHECK (type IN ('airline','travel_agency','gds','corporate','ota','bank','whitelabel','other')),
      country           TEXT,
      tier              TEXT NOT NULL DEFAULT 'standard'
                        CHECK (tier IN ('platinum','gold','silver','standard')),
      status            TEXT NOT NULL DEFAULT 'prospect'
                        CHECK (status IN ('prospect','contacted','negotiating','signed','live','paused','churned')),
      contact_name      TEXT,
      contact_email     TEXT,
      contact_phone     TEXT,
      revenue_share_pct NUMERIC(5,2) DEFAULT 0,
      owner             TEXT,
      notes             TEXT,
      last_contacted_at TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bizdev_agreements (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id      UUID REFERENCES bizdev_partners(id) ON DELETE SET NULL,
      partner_name    TEXT NOT NULL,
      title           TEXT NOT NULL,
      type            TEXT NOT NULL DEFAULT 'revenue_share'
                      CHECK (type IN ('revenue_share','white_label','distribution','referral','api_integration','other')),
      value_sar       NUMERIC(16,2) NOT NULL DEFAULT 0,
      commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
      start_date      DATE,
      end_date        DATE,
      status          TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','expired','terminated')),
      signed_by       TEXT,
      file_url        TEXT,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bizdev_activities (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id   UUID REFERENCES bizdev_partners(id) ON DELETE CASCADE,
      partner_name TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'note'
                   CHECK (type IN ('call','email','demo','meeting','proposal','negotiation','signed','note')),
      summary      TEXT NOT NULL,
      owner        TEXT,
      activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bizdev_markets (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country_code       TEXT NOT NULL UNIQUE,
      country_name       TEXT NOT NULL,
      region             TEXT NOT NULL DEFAULT 'MENA'
                         CHECK (region IN ('GCC','MENA','APAC','EU','US','LATAM','AFRICA','OTHER')),
      status             TEXT NOT NULL DEFAULT 'target'
                         CHECK (status IN ('target','researching','pilot','launched','paused')),
      priority           TEXT NOT NULL DEFAULT 'medium'
                         CHECK (priority IN ('critical','high','medium','low')),
      target_launch_date DATE,
      partner_count      INT NOT NULL DEFAULT 0,
      notes              TEXT,
      owner              TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed GCC + MENA markets (idempotent via UNIQUE country_code)
  const markets = [
    { code: 'SA', name: 'Saudi Arabia',   region: 'GCC',  status: 'launched',    priority: 'critical' },
    { code: 'AE', name: 'UAE',             region: 'GCC',  status: 'launched',    priority: 'critical' },
    { code: 'KW', name: 'Kuwait',          region: 'GCC',  status: 'researching', priority: 'high' },
    { code: 'QA', name: 'Qatar',           region: 'GCC',  status: 'researching', priority: 'high' },
    { code: 'BH', name: 'Bahrain',         region: 'GCC',  status: 'target',      priority: 'medium' },
    { code: 'OM', name: 'Oman',            region: 'GCC',  status: 'target',      priority: 'medium' },
    { code: 'EG', name: 'Egypt',           region: 'MENA', status: 'target',      priority: 'high' },
    { code: 'TR', name: 'Turkey',          region: 'MENA', status: 'target',      priority: 'medium' },
    { code: 'PK', name: 'Pakistan',        region: 'MENA', status: 'target',      priority: 'medium' },
  ];
  for (const m of markets) {
    await pool.query(
      `INSERT INTO bizdev_markets (country_code, country_name, region, status, priority)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (country_code) DO NOTHING`,
      [m.code, m.name, m.region, m.status, m.priority]
    ).catch(() => {});
  }

  console.log('[bizdev] bootstrap complete');
}
bootstrap().catch(err => console.error('[bizdev] bootstrap error:', err.message));

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const [partnerStats, agreementStats, activityStats, marketStats, expiringCount] = await Promise.all([

      // Partner counts by status + tier
      pool.query(`
        SELECT
          COUNT(*)                                          AS total,
          COUNT(*) FILTER (WHERE status = 'live')          AS live,
          COUNT(*) FILTER (WHERE status = 'signed')        AS signed,
          COUNT(*) FILTER (WHERE status = 'negotiating')   AS negotiating,
          COUNT(*) FILTER (WHERE status = 'prospect')      AS prospect,
          COUNT(*) FILTER (WHERE tier = 'platinum')        AS platinum,
          COUNT(*) FILTER (WHERE tier = 'gold')            AS gold,
          COUNT(*) FILTER (WHERE tier = 'silver')          AS silver,
          COUNT(*) FILTER (WHERE tier = 'standard')        AS standard
        FROM bizdev_partners WHERE status != 'churned'
      `),

      // Agreement counts + total value
      pool.query(`
        SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE status = 'active')          AS active,
          COUNT(*) FILTER (WHERE status = 'draft')           AS draft,
          COUNT(*) FILTER (WHERE status = 'expired')         AS expired,
          COALESCE(SUM(value_sar) FILTER (WHERE status = 'active'), 0) AS active_value_sar
        FROM bizdev_agreements
      `),

      // Activities this month
      pool.query(`
        SELECT COUNT(*) AS this_month
        FROM bizdev_activities
        WHERE activity_at >= date_trunc('month', NOW())
      `),

      // Market counts by status
      pool.query(`
        SELECT
          COUNT(*)                                              AS total,
          COUNT(*) FILTER (WHERE status = 'launched')          AS launched,
          COUNT(*) FILTER (WHERE status = 'pilot')             AS pilot,
          COUNT(*) FILTER (WHERE status = 'researching')       AS researching,
          COUNT(*) FILTER (WHERE status = 'target')            AS target
        FROM bizdev_markets
      `),

      // Agreements expiring in 90 days
      pool.query(`
        SELECT COUNT(*) AS count
        FROM bizdev_agreements
        WHERE status = 'active'
          AND end_date BETWEEN NOW()::date AND (NOW() + INTERVAL '90 days')::date
      `),
    ]);

    const p = partnerStats.rows[0];
    const a = agreementStats.rows[0];
    const ac = activityStats.rows[0];
    const m = marketStats.rows[0];
    const ex = expiringCount.rows[0];

    res.json({
      data: {
        partners: {
          total:       parseInt(p.total),
          live:        parseInt(p.live),
          signed:      parseInt(p.signed),
          negotiating: parseInt(p.negotiating),
          prospect:    parseInt(p.prospect),
          by_tier: {
            platinum: parseInt(p.platinum),
            gold:     parseInt(p.gold),
            silver:   parseInt(p.silver),
            standard: parseInt(p.standard),
          },
        },
        agreements: {
          total:            parseInt(a.total),
          active:           parseInt(a.active),
          draft:            parseInt(a.draft),
          expired:          parseInt(a.expired),
          active_value_sar: Math.round(parseFloat(a.active_value_sar)),
          expiring_90d:     parseInt(ex.count),
        },
        activities: {
          this_month: parseInt(ac.this_month),
        },
        markets: {
          total:       parseInt(m.total),
          launched:    parseInt(m.launched),
          pilot:       parseInt(m.pilot),
          researching: parseInt(m.researching),
          target:      parseInt(m.target),
        },
      },
    });
  } catch (err) {
    console.error('[bizdev/stats]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /partners ─────────────────────────────────────────────────────────────

router.get('/partners', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.type)   { conditions.push(`type = $${i++}`);    vals.push(req.query.type); }
  if (req.query.tier)   { conditions.push(`tier = $${i++}`);    vals.push(req.query.tier); }
  if (req.query.status) { conditions.push(`status = $${i++}`);  vals.push(req.query.status); }
  if (req.query.country){ conditions.push(`country = $${i++}`); vals.push(req.query.country); }
  if (req.query.search) {
    conditions.push(`(company_name ILIKE $${i} OR contact_name ILIKE $${i} OR contact_email ILIKE $${i})`);
    vals.push(`%${req.query.search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM bizdev_partners ${where}
         ORDER BY
           CASE tier WHEN 'platinum' THEN 1 WHEN 'gold' THEN 2 WHEN 'silver' THEN 3 ELSE 4 END,
           CASE status WHEN 'live' THEN 1 WHEN 'signed' THEN 2 WHEN 'negotiating' THEN 3
                       WHEN 'contacted' THEN 4 WHEN 'prospect' THEN 5 ELSE 6 END,
           company_name ASC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bizdev_partners ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[bizdev/partners GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /partners ────────────────────────────────────────────────────────────

router.post('/partners', async (req, res) => {
  const { company_name, type, country, tier, status, contact_name, contact_email,
          contact_phone, revenue_share_pct, owner, notes } = req.body ?? {};
  if (!company_name?.trim()) return res.status(400).json({ error: 'COMPANY_NAME_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO bizdev_partners
         (company_name, type, country, tier, status, contact_name, contact_email,
          contact_phone, revenue_share_pct, owner, notes, last_contacted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())
       RETURNING *`,
      [company_name.trim(), type || 'other', country || null, tier || 'standard',
       status || 'prospect', contact_name || null, contact_email || null,
       contact_phone || null, parseFloat(revenue_share_pct ?? 0), owner || null, notes || null]
    );
    const partner = rows[0];

    // ── Launch partner onboarding workflow when partner enters active engagement ──
    const activeStatuses = ['contacted', 'negotiating', 'signed', 'live'];
    if (activeStatuses.includes(partner.status)) {
      wf.launch({
        triggerEvent:   'partner_onboard_requested',
        triggerRef:     partner.id,
        triggerRefType: 'bizdev_partner',
        initiatedBy:    req.user?.email ?? owner ?? 'admin',
        context: {
          company_name:      company_name.trim(),
          type:              type || 'other',
          country:           country || null,
          tier:              tier || 'standard',
          status:            partner.status,
          revenue_share_pct: parseFloat(revenue_share_pct ?? 0),
          contact_email:     contact_email || null,
        },
      });
    }

    res.status(201).json({ data: partner });
  } catch (err) {
    console.error('[bizdev/partners POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /partners/:id ───────────────────────────────────────────────────────

router.patch('/partners/:id', async (req, res) => {
  const ALLOWED = ['company_name','type','country','tier','status','contact_name',
                   'contact_email','contact_phone','revenue_share_pct','owner','notes'];
  const sets = []; const vals = []; let i = 1;

  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  // Auto-set last_contacted_at when status moves to an active engagement state
  const engagementStatuses = ['contacted','negotiating','signed','live'];
  if (req.body.status && engagementStatuses.includes(req.body.status)) {
    sets.push(`last_contacted_at = NOW()`);
  }

  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);

  try {
    const { rows } = await pool.query(
      `UPDATE bizdev_partners SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[bizdev/partners PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /partners/:id ──────────────────────────────────────────────────────

router.delete('/partners/:id', async (req, res) => {
  try {
    // Soft-churn if active agreements exist
    const { rows: agr } = await pool.query(
      `SELECT id FROM bizdev_agreements WHERE partner_id = $1 AND status != 'terminated' LIMIT 1`,
      [req.params.id]
    );
    if (agr.length) {
      const { rows } = await pool.query(
        `UPDATE bizdev_partners SET status = 'churned', updated_at = NOW()
           WHERE id = $1 RETURNING id, company_name, status`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
      return res.json({ data: rows[0], message: 'Partner churned (has active agreements)' });
    }
    const { rowCount } = await pool.query(`DELETE FROM bizdev_partners WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true });
  } catch (err) {
    console.error('[bizdev/partners DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /partners/:id/activities ──────────────────────────────────────────────

router.get('/partners/:id/activities', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
  const offset = (page - 1) * limit;
  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM bizdev_activities WHERE partner_id = $1
         ORDER BY activity_at DESC LIMIT $2 OFFSET $3`,
        [req.params.id, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bizdev_activities WHERE partner_id = $1`, [req.params.id]),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[bizdev/partners/:id/activities GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /partners/:id/activities ─────────────────────────────────────────────

router.post('/partners/:id/activities', async (req, res) => {
  const { type, summary, owner, activity_at } = req.body ?? {};
  if (!summary?.trim()) return res.status(400).json({ error: 'SUMMARY_REQUIRED' });
  try {
    // Fetch partner_name for denormalization
    const { rows: partner } = await pool.query(
      `SELECT company_name FROM bizdev_partners WHERE id = $1`, [req.params.id]
    );
    if (!partner.length) return res.status(404).json({ error: 'PARTNER_NOT_FOUND' });

    const { rows } = await pool.query(
      `INSERT INTO bizdev_activities (partner_id, partner_name, type, summary, owner, activity_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, partner[0].company_name, type || 'note', summary.trim(),
       owner || null, activity_at || new Date().toISOString()]
    );

    // Auto-update last_contacted_at on parent partner
    await pool.query(
      `UPDATE bizdev_partners SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[bizdev/partners/:id/activities POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /agreements/expiring ──────────────────────────────────────────────────
// Must be BEFORE /agreements/:id to avoid route conflict

router.get('/agreements/expiring', async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days ?? '90', 10)));
  try {
    const { rows } = await pool.query(
      `SELECT *,
              (end_date - NOW()::date) AS days_until_expiry
       FROM bizdev_agreements
       WHERE status = 'active'
         AND end_date BETWEEN NOW()::date AND (NOW() + ($1 * INTERVAL '1 day'))::date
       ORDER BY end_date ASC`,
      [days]
    );
    res.json({ data: rows, days });
  } catch (err) {
    console.error('[bizdev/agreements/expiring]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /agreements ───────────────────────────────────────────────────────────

router.get('/agreements', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)     { conditions.push(`status = $${i++}`);     vals.push(req.query.status); }
  if (req.query.type)       { conditions.push(`type = $${i++}`);       vals.push(req.query.type); }
  if (req.query.partner_id) { conditions.push(`partner_id = $${i++}`); vals.push(req.query.partner_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM bizdev_agreements ${where}
         ORDER BY
           CASE status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 WHEN 'expired' THEN 3 ELSE 4 END,
           end_date ASC NULLS LAST,
           created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bizdev_agreements ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[bizdev/agreements GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /agreements ──────────────────────────────────────────────────────────

router.post('/agreements', async (req, res) => {
  const { partner_id, partner_name, title, type, value_sar, commission_pct,
          start_date, end_date, status, signed_by, file_url, notes } = req.body ?? {};
  if (!partner_name?.trim()) return res.status(400).json({ error: 'PARTNER_NAME_REQUIRED' });
  if (!title?.trim()) return res.status(400).json({ error: 'TITLE_REQUIRED' });

  // Auto-resolve partner_id from name if not provided
  let resolvedPartnerId = partner_id || null;
  if (!resolvedPartnerId && partner_name) {
    const { rows } = await pool.query(
      `SELECT id FROM bizdev_partners WHERE company_name ILIKE $1 LIMIT 1`,
      [partner_name.trim()]
    ).catch(() => ({ rows: [] }));
    if (rows.length) resolvedPartnerId = rows[0].id;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO bizdev_agreements
         (partner_id, partner_name, title, type, value_sar, commission_pct,
          start_date, end_date, status, signed_by, file_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [resolvedPartnerId, partner_name.trim(), title.trim(), type || 'revenue_share',
       parseFloat(value_sar ?? 0), parseFloat(commission_pct ?? 0),
       start_date || null, end_date || null, status || 'draft',
       signed_by || null, file_url || null, notes || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[bizdev/agreements POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /agreements/:id ─────────────────────────────────────────────────────

router.patch('/agreements/:id', async (req, res) => {
  const ALLOWED = ['title','type','value_sar','commission_pct','start_date','end_date',
                   'status','signed_by','file_url','notes','partner_name'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE bizdev_agreements SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[bizdev/agreements PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /agreements/:id ────────────────────────────────────────────────────

router.delete('/agreements/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM bizdev_agreements WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true });
  } catch (err) {
    console.error('[bizdev/agreements DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /markets ──────────────────────────────────────────────────────────────

router.get('/markets', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '100', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)   { conditions.push(`status = $${i++}`);   vals.push(req.query.status); }
  if (req.query.region)   { conditions.push(`region = $${i++}`);   vals.push(req.query.region); }
  if (req.query.priority) { conditions.push(`priority = $${i++}`); vals.push(req.query.priority); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM bizdev_markets ${where}
         ORDER BY
           CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           target_launch_date ASC NULLS LAST,
           country_name ASC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bizdev_markets ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[bizdev/markets GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /markets ─────────────────────────────────────────────────────────────

router.post('/markets', async (req, res) => {
  const { country_code, country_name, region, status, priority,
          target_launch_date, partner_count, notes, owner } = req.body ?? {};
  if (!country_code?.trim()) return res.status(400).json({ error: 'COUNTRY_CODE_REQUIRED' });
  if (!country_name?.trim()) return res.status(400).json({ error: 'COUNTRY_NAME_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO bizdev_markets
         (country_code, country_name, region, status, priority,
          target_launch_date, partner_count, notes, owner)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [country_code.trim().toUpperCase(), country_name.trim(), region || 'MENA',
       status || 'target', priority || 'medium',
       target_launch_date || null, parseInt(partner_count ?? 0), notes || null, owner || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'COUNTRY_CODE_EXISTS' });
    console.error('[bizdev/markets POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /markets/:id ────────────────────────────────────────────────────────

router.patch('/markets/:id', async (req, res) => {
  const ALLOWED = ['country_name','region','status','priority','target_launch_date',
                   'partner_count','notes','owner'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE bizdev_markets SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[bizdev/markets PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
