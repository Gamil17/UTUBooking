'use strict';

/**
 * Affiliates Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/affiliates', affiliatesRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                          — KPIs: partner counts, pending apps, payout totals
 *
 * GET  /applications                   — Inbound affiliate applications (filter: status, platform, search)
 * POST /applications                   — Create application (also called from BFF contact flow)
 * PATCH /applications/:id              — Update application (status, notes)
 * POST /applications/:id/approve       — Approve application → creates affiliate_partner record
 *
 * GET  /partners                       — Active affiliate partners (filter: tier, status, search)
 * POST /partners                       — Create partner directly (bypass application)
 * PATCH /partners/:id                  — Update partner (tier, commission, status)
 * DELETE /partners/:id                 — Soft-deactivate partner
 *
 * GET  /payouts                        — Payout history (filter: partner_id, status)
 * POST /payouts                        — Record a payout
 * PATCH /payouts/:id                   — Update payout status (pending → paid / cancelled)
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');
const wf         = require('../lib/workflow-client');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const router = Router();
router.use(adminAuth);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_applications (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           TEXT NOT NULL,
      email          TEXT NOT NULL,
      website        TEXT,
      platform       TEXT NOT NULL DEFAULT 'other'
                     CHECK (platform IN ('blog','youtube','instagram','twitter','telegram','tiktok','other')),
      audience_size  TEXT NOT NULL DEFAULT 'under_1k'
                     CHECK (audience_size IN ('under_1k','1k_10k','10k_100k','over_100k')),
      message        TEXT,
      status         TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','reviewing','approved','rejected')),
      admin_notes    TEXT,
      reviewed_by    TEXT,
      reviewed_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS affiliate_partners (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id  UUID REFERENCES affiliate_applications(id) ON DELETE SET NULL,
      name            TEXT NOT NULL,
      email           TEXT NOT NULL UNIQUE,
      website         TEXT,
      platform        TEXT NOT NULL DEFAULT 'other'
                      CHECK (platform IN ('blog','youtube','instagram','twitter','telegram','tiktok','other')),
      audience_size   TEXT NOT NULL DEFAULT 'under_1k'
                      CHECK (audience_size IN ('under_1k','1k_10k','10k_100k','over_100k')),
      tier            TEXT NOT NULL DEFAULT 'starter'
                      CHECK (tier IN ('elite','pro','starter')),
      status          TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','paused','terminated')),
      commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 3.00,
      referral_code   TEXT UNIQUE,
      payout_method   TEXT DEFAULT 'bank_transfer'
                      CHECK (payout_method IN ('bank_transfer','paypal','wise','stc_pay','other')),
      payout_details  TEXT,
      total_clicks    INT NOT NULL DEFAULT 0,
      total_bookings  INT NOT NULL DEFAULT 0,
      total_earned_sar NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_paid_sar   NUMERIC(14,2) NOT NULL DEFAULT 0,
      notes           TEXT,
      joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS affiliate_payouts (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id      UUID REFERENCES affiliate_partners(id) ON DELETE CASCADE,
      partner_name    TEXT NOT NULL,
      amount_sar      NUMERIC(14,2) NOT NULL,
      period_start    DATE NOT NULL,
      period_end      DATE NOT NULL,
      bookings_count  INT NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','paid','cancelled')),
      payment_ref     TEXT,
      notes           TEXT,
      paid_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_affiliate_apps_status    ON affiliate_applications(status);
    CREATE INDEX IF NOT EXISTS idx_affiliate_apps_email     ON affiliate_applications(email);
    CREATE INDEX IF NOT EXISTS idx_affiliate_partners_email ON affiliate_partners(email);
    CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_partner ON affiliate_payouts(partner_id);
  `);
  console.log('[affiliates] bootstrap complete');
}
bootstrap().catch(err => console.error('[affiliates] bootstrap error:', err.message));

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const [appStats, partnerStats, payoutStats] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                         AS total,
          COUNT(*) FILTER (WHERE status = 'pending')      AS pending,
          COUNT(*) FILTER (WHERE status = 'reviewing')    AS reviewing,
          COUNT(*) FILTER (WHERE status = 'approved')     AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected
        FROM affiliate_applications
      `),

      pool.query(`
        SELECT
          COUNT(*)                                         AS total,
          COUNT(*) FILTER (WHERE status = 'active')       AS active,
          COUNT(*) FILTER (WHERE status = 'paused')       AS paused,
          COUNT(*) FILTER (WHERE status = 'terminated')   AS terminated,
          COUNT(*) FILTER (WHERE tier = 'elite')          AS elite,
          COUNT(*) FILTER (WHERE tier = 'pro')            AS pro,
          COUNT(*) FILTER (WHERE tier = 'starter')        AS starter,
          COALESCE(SUM(total_bookings), 0)                AS total_bookings,
          COALESCE(SUM(total_earned_sar), 0)              AS total_earned_sar,
          COALESCE(SUM(total_paid_sar), 0)                AS total_paid_sar
        FROM affiliate_partners
      `),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')      AS pending_payouts,
          COALESCE(SUM(amount_sar) FILTER (WHERE status = 'pending'), 0) AS pending_sar,
          COALESCE(SUM(amount_sar) FILTER (WHERE status = 'paid'),    0) AS paid_sar
        FROM affiliate_payouts
      `),
    ]);

    const a = appStats.rows[0];
    const p = partnerStats.rows[0];
    const py = payoutStats.rows[0];

    res.json({
      data: {
        applications: {
          total:     parseInt(a.total),
          pending:   parseInt(a.pending),
          reviewing: parseInt(a.reviewing),
          approved:  parseInt(a.approved),
          rejected:  parseInt(a.rejected),
        },
        partners: {
          total:            parseInt(p.total),
          active:           parseInt(p.active),
          paused:           parseInt(p.paused),
          terminated:       parseInt(p.terminated),
          by_tier:          { elite: parseInt(p.elite), pro: parseInt(p.pro), starter: parseInt(p.starter) },
          total_bookings:   parseInt(p.total_bookings),
          total_earned_sar: Math.round(parseFloat(p.total_earned_sar)),
          total_paid_sar:   Math.round(parseFloat(p.total_paid_sar)),
        },
        payouts: {
          pending_count: parseInt(py.pending_payouts),
          pending_sar:   Math.round(parseFloat(py.pending_sar)),
          paid_sar:      Math.round(parseFloat(py.paid_sar)),
        },
      },
    });
  } catch (err) {
    console.error('[affiliates/stats]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /applications ─────────────────────────────────────────────────────────

router.get('/applications', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)   { conditions.push(`status = $${i++}`);   vals.push(req.query.status); }
  if (req.query.platform) { conditions.push(`platform = $${i++}`); vals.push(req.query.platform); }
  if (req.query.search) {
    conditions.push(`(name ILIKE $${i} OR email ILIKE $${i} OR website ILIKE $${i})`);
    vals.push(`%${req.query.search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM affiliate_applications ${where}
         ORDER BY
           CASE status WHEN 'pending' THEN 1 WHEN 'reviewing' THEN 2 ELSE 3 END,
           created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM affiliate_applications ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[affiliates/applications GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /applications ────────────────────────────────────────────────────────
// Called from the affiliate apply form BFF, or directly by admin.

router.post('/applications', async (req, res) => {
  const { name, email, website, platform, audience_size, message } = req.body ?? {};
  if (!name?.trim())  return res.status(400).json({ error: 'NAME_REQUIRED' });
  if (!email?.trim()) return res.status(400).json({ error: 'EMAIL_REQUIRED' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'INVALID_EMAIL' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO affiliate_applications
         (name, email, website, platform, audience_size, message)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), website?.trim() || null,
       platform || 'other', audience_size || 'under_1k', message?.trim() || null]
    );
    const application = rows[0];

    // ── Launch affiliate application review workflow ───────────────────────────
    wf.launch({
      triggerEvent:   'affiliate_applied',
      triggerRef:     application.id,
      triggerRefType: 'affiliate_application',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        name:          name.trim(),
        email:         email.trim().toLowerCase(),
        platform:      platform || 'other',
        audience_size: audience_size || 'under_1k',
        website:       website?.trim() || null,
      },
    });

    res.status(201).json({ data: application });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'EMAIL_EXISTS' });
    console.error('[affiliates/applications POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /applications/:id ───────────────────────────────────────────────────

router.patch('/applications/:id', async (req, res) => {
  const ALLOWED = ['status', 'admin_notes', 'reviewed_by'];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;

  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (req.body.status && ['approved','rejected'].includes(req.body.status)) {
    sets.push(`reviewed_at = NOW()`);
  }

  try {
    const { rows } = await pool.query(
      `UPDATE affiliate_applications SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[affiliates/applications PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /applications/:id/approve ───────────────────────────────────────────
// Approves an application and creates an affiliate_partner record.

router.post('/applications/:id/approve', async (req, res) => {
  const { tier, commission_pct, payout_method, notes } = req.body ?? {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch application
    const { rows: apps } = await client.query(
      `SELECT * FROM affiliate_applications WHERE id = $1`, [req.params.id]
    );
    if (!apps.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'NOT_FOUND' }); }
    const app = apps[0];
    if (app.status === 'approved') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'ALREADY_APPROVED' }); }

    // Generate unique referral code
    const code = `UTU-${app.name.split(' ')[0].toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;

    // Create partner
    const { rows: partners } = await client.query(
      `INSERT INTO affiliate_partners
         (application_id, name, email, website, platform, audience_size,
          tier, commission_pct, referral_code, payout_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (email) DO UPDATE SET
         application_id = EXCLUDED.application_id,
         tier           = EXCLUDED.tier,
         commission_pct = EXCLUDED.commission_pct,
         status         = 'active',
         updated_at     = NOW()
       RETURNING *`,
      [app.id, app.name, app.email, app.website, app.platform, app.audience_size,
       tier || 'starter', parseFloat(commission_pct ?? 3), code,
       payout_method || 'bank_transfer', notes?.trim() || null]
    );

    // Mark application approved
    await client.query(
      `UPDATE affiliate_applications
         SET status = 'approved', reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [app.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: partners[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'EMAIL_EXISTS' });
    console.error('[affiliates/approve]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
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

  if (req.query.tier)     { conditions.push(`tier = $${i++}`);     vals.push(req.query.tier); }
  if (req.query.status)   { conditions.push(`status = $${i++}`);   vals.push(req.query.status); }
  if (req.query.platform) { conditions.push(`platform = $${i++}`); vals.push(req.query.platform); }
  if (req.query.search) {
    conditions.push(`(name ILIKE $${i} OR email ILIKE $${i} OR referral_code ILIKE $${i})`);
    vals.push(`%${req.query.search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM affiliate_partners ${where}
         ORDER BY
           CASE tier WHEN 'elite' THEN 1 WHEN 'pro' THEN 2 ELSE 3 END,
           total_earned_sar DESC,
           joined_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM affiliate_partners ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[affiliates/partners GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /partners ────────────────────────────────────────────────────────────

router.post('/partners', async (req, res) => {
  const { name, email, website, platform, audience_size, tier,
          commission_pct, payout_method, notes } = req.body ?? {};
  if (!name?.trim())  return res.status(400).json({ error: 'NAME_REQUIRED' });
  if (!email?.trim()) return res.status(400).json({ error: 'EMAIL_REQUIRED' });
  const code = `UTU-${name.split(' ')[0].toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO affiliate_partners
         (name, email, website, platform, audience_size, tier,
          commission_pct, referral_code, payout_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), website?.trim() || null,
       platform || 'other', audience_size || 'under_1k', tier || 'starter',
       parseFloat(commission_pct ?? 3), code,
       payout_method || 'bank_transfer', notes?.trim() || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'EMAIL_EXISTS' });
    console.error('[affiliates/partners POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /partners/:id ───────────────────────────────────────────────────────

router.patch('/partners/:id', async (req, res) => {
  const ALLOWED = ['tier','status','commission_pct','payout_method','payout_details',
                   'total_clicks','total_bookings','total_earned_sar','total_paid_sar','notes'];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  try {
    const { rows } = await pool.query(
      `UPDATE affiliate_partners SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[affiliates/partners PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /partners/:id ──────────────────────────────────────────────────────
// Soft-deactivate (terminated) — preserves payout history.

router.delete('/partners/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE affiliate_partners
         SET status = 'terminated', updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[affiliates/partners DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /payouts ──────────────────────────────────────────────────────────────

router.get('/payouts', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.partner_id) { conditions.push(`partner_id = $${i++}`); vals.push(req.query.partner_id); }
  if (req.query.status)     { conditions.push(`status = $${i++}`);     vals.push(req.query.status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM affiliate_payouts ${where}
         ORDER BY
           CASE status WHEN 'pending' THEN 1 WHEN 'processing' THEN 2 ELSE 3 END,
           created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM affiliate_payouts ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[affiliates/payouts GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /payouts ─────────────────────────────────────────────────────────────

router.post('/payouts', async (req, res) => {
  const { partner_id, amount_sar, period_start, period_end, bookings_count, notes } = req.body ?? {};
  if (!partner_id)              return res.status(400).json({ error: 'PARTNER_ID_REQUIRED' });
  if (!amount_sar || amount_sar <= 0) return res.status(400).json({ error: 'INVALID_AMOUNT' });
  if (!period_start || !period_end)   return res.status(400).json({ error: 'PERIOD_REQUIRED' });
  try {
    const { rows: partner } = await pool.query(
      `SELECT name FROM affiliate_partners WHERE id = $1`, [partner_id]
    );
    if (!partner.length) return res.status(404).json({ error: 'PARTNER_NOT_FOUND' });

    const { rows } = await pool.query(
      `INSERT INTO affiliate_payouts
         (partner_id, partner_name, amount_sar, period_start, period_end, bookings_count, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [partner_id, partner[0].name, parseFloat(amount_sar), period_start, period_end,
       parseInt(bookings_count ?? 0), notes?.trim() || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[affiliates/payouts POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /payouts/:id ────────────────────────────────────────────────────────

router.patch('/payouts/:id', async (req, res) => {
  const ALLOWED = ['status', 'payment_ref', 'notes'];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (req.body.status === 'paid') sets.push('paid_at = NOW()');
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  try {
    const { rows } = await pool.query(
      `UPDATE affiliate_payouts SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // When paid: update partner's total_paid_sar
    if (req.body.status === 'paid' && rows[0].partner_id) {
      await pool.query(
        `UPDATE affiliate_partners
           SET total_paid_sar = total_paid_sar + $1, updated_at = NOW()
         WHERE id = $2`,
        [parseFloat(rows[0].amount_sar), rows[0].partner_id]
      );
    }

    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[affiliates/payouts PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /clicks ──────────────────────────────────────────────────────────────
// Called by the BFF when a visitor lands with ?ref=UTU-XXXXX-XXXX.
// Increments total_clicks for the matching active partner.
// Returns the partner's tier + commission_pct so the BFF can cache it if needed.

router.post('/clicks', async (req, res) => {
  const { referral_code } = req.body ?? {};
  if (!referral_code?.trim()) {
    return res.status(400).json({ error: 'REFERRAL_CODE_REQUIRED' });
  }

  // Validate format: UTU-<word chars>-<word chars>
  if (!/^UTU-[A-Z0-9]{1,10}-[A-Z0-9]{1,6}$/i.test(referral_code.trim())) {
    return res.status(400).json({ error: 'INVALID_CODE_FORMAT' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE affiliate_partners
         SET total_clicks = total_clicks + 1, updated_at = NOW()
       WHERE referral_code = $1
         AND status        = 'active'
       RETURNING id, name, referral_code, tier, commission_pct`,
      [referral_code.trim().toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'PARTNER_NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[affiliates/clicks]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /conversions ─────────────────────────────────────────────────────────
// Called by the booking service when a booking is confirmed and a valid
// utu_ref cookie was present.
// Increments total_bookings and total_earned_sar for the matching partner.
//
// Body: { referral_code, booking_id, booking_value_sar }
// Returns: { partner_id, commission_sar, commission_pct }

router.post('/conversions', async (req, res) => {
  const { referral_code, booking_id, booking_value_sar } = req.body ?? {};
  if (!referral_code?.trim()) return res.status(400).json({ error: 'REFERRAL_CODE_REQUIRED' });
  if (!booking_id?.trim())    return res.status(400).json({ error: 'BOOKING_ID_REQUIRED' });
  if (!booking_value_sar || Number(booking_value_sar) <= 0) {
    return res.status(400).json({ error: 'INVALID_BOOKING_VALUE' });
  }

  try {
    // Fetch partner and commission rate
    const { rows: partners } = await pool.query(
      `SELECT id, name, tier, commission_pct
         FROM affiliate_partners
        WHERE referral_code = $1 AND status = 'active'`,
      [referral_code.trim().toUpperCase()]
    );
    if (!partners.length) return res.status(404).json({ error: 'PARTNER_NOT_FOUND' });

    const partner = partners[0];
    const value = parseFloat(booking_value_sar);
    const commission_sar = parseFloat((value * partner.commission_pct / 100).toFixed(2));

    await pool.query(
      `UPDATE affiliate_partners
         SET total_bookings   = total_bookings + 1,
             total_earned_sar = total_earned_sar + $1,
             updated_at       = NOW()
       WHERE id = $2`,
      [commission_sar, partner.id]
    );

    console.log(`[affiliates/conversions] booking=${booking_id} partner=${partner.name} value=SAR${value} commission=SAR${commission_sar}`);
    res.json({
      data: {
        partner_id:     partner.id,
        partner_name:   partner.name,
        commission_sar,
        commission_pct: partner.commission_pct,
      },
    });
  } catch (err) {
    console.error('[affiliates/conversions]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
