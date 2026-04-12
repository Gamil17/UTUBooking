'use strict';

/**
 * Pro Business Travel (Corporate) Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/corporate', corporateRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                          — KPIs: account counts, active contracts, booking volumes
 *
 * GET  /accounts                       — Corporate accounts (filter: tier, status, industry, search)
 * POST /accounts                       — Create corporate account
 * PATCH /accounts/:id                  — Update account
 * DELETE /accounts/:id                 — Soft-deactivate account
 * POST /accounts/:id/activate          — Create portal login for this account (Phase 1)
 *
 * GET  /accounts/:id/contacts          — List contacts for an account
 * POST /accounts/:id/contacts          — Add contact to account
 * PATCH /accounts/:id/contacts/:cid    — Update contact
 * DELETE /accounts/:id/contacts/:cid   — Remove contact
 *
 * GET  /enquiries                      — Inbound business travel enquiries (filter: status, account_id)
 * POST /enquiries                      — Create enquiry (called from BFF /partners#business form)
 * PATCH /enquiries/:id                 — Update enquiry (status, assigned_to, notes)
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');
const wf         = require('../lib/workflow-client');
// Node 22 provides fetch as a global — no extra import needed

const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const router = Router();
router.use(adminAuth);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS corporate_accounts (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name        TEXT NOT NULL,
      industry            TEXT NOT NULL DEFAULT 'other'
                          CHECK (industry IN ('government','finance','oil_gas','tech','healthcare',
                                              'education','ngo','retail','hospitality','other')),
      country             TEXT,
      tier                TEXT NOT NULL DEFAULT 'standard'
                          CHECK (tier IN ('enterprise','premium','standard')),
      status              TEXT NOT NULL DEFAULT 'prospect'
                          CHECK (status IN ('prospect','active','paused','churned')),
      -- Travel policy
      annual_travel_budget_sar  NUMERIC(16,2) DEFAULT 0,
      max_flight_class    TEXT NOT NULL DEFAULT 'economy'
                          CHECK (max_flight_class IN ('first','business','premium_economy','economy')),
      max_hotel_stars     INT  DEFAULT 4 CHECK (max_hotel_stars BETWEEN 1 AND 5),
      per_diem_sar        NUMERIC(10,2) DEFAULT 0,
      preferred_airlines  TEXT[],
      advance_booking_days INT DEFAULT 14,
      -- Account management
      owner               TEXT,
      contract_start      DATE,
      contract_end        DATE,
      discount_pct        NUMERIC(5,2) DEFAULT 0,
      total_bookings      INT NOT NULL DEFAULT 0,
      total_spend_sar     NUMERIC(16,2) NOT NULL DEFAULT 0,
      notes               TEXT,
      last_activity_at    TIMESTAMPTZ,
      -- Portal activation (Phase 1: UTUBooking for Business)
      portal_user_id      UUID,        -- auth service user.id created on activation
      activated_at        TIMESTAMPTZ, -- set when admin activates the portal login
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS corporate_contacts (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id   UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      account_name TEXT NOT NULL,
      name         TEXT NOT NULL,
      title        TEXT,
      email        TEXT,
      phone        TEXT,
      role         TEXT NOT NULL DEFAULT 'booker'
                   CHECK (role IN ('decision_maker','travel_manager','booker','finance','other')),
      is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS corporate_enquiries (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id   UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email        TEXT NOT NULL,
      phone        TEXT,
      traveler_count INT DEFAULT 1,
      destinations TEXT,
      travel_dates TEXT,
      message      TEXT,
      status       TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','contacted','qualified','converted','lost')),
      assigned_to  TEXT,
      admin_notes  TEXT,
      source       TEXT DEFAULT 'website'
                   CHECK (source IN ('website','referral','direct','event','other')),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corporate_accounts_status   ON corporate_accounts(status);
    CREATE INDEX IF NOT EXISTS idx_corporate_contacts_account  ON corporate_contacts(account_id);
    CREATE INDEX IF NOT EXISTS idx_corporate_enquiries_status  ON corporate_enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_corporate_enquiries_account ON corporate_enquiries(account_id);
  `);

  // Idempotent column additions for existing databases (portal activation — Phase 1)
  await pool.query(`
    ALTER TABLE corporate_accounts
      ADD COLUMN IF NOT EXISTS portal_user_id UUID,
      ADD COLUMN IF NOT EXISTS activated_at   TIMESTAMPTZ;
  `);

  // ── Phase 6: Enhanced Application Form Fields ──────────────────────────────
  await pool.query(`
    ALTER TABLE corporate_enquiries
      ADD COLUMN IF NOT EXISTS job_title                    TEXT,
      ADD COLUMN IF NOT EXISTS company_size                 TEXT,
      ADD COLUMN IF NOT EXISTS country                      TEXT,
      ADD COLUMN IF NOT EXISTS industry                     TEXT,
      ADD COLUMN IF NOT EXISTS estimated_monthly_budget_sar NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS hear_about_us                TEXT;
  `);

  // ── Phase 2: Employee Directory ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS corporate_employees (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id       UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      employee_ref     TEXT,            -- company's internal employee / HR ID
      name             TEXT NOT NULL,
      email            TEXT NOT NULL,
      phone            TEXT,
      department       TEXT,
      job_title        TEXT,
      nationality      TEXT,            -- ISO 3166-1 alpha-2 (SA, AE, PK …)
      passport_number  TEXT,
      passport_expiry  DATE,
      date_of_birth    DATE,
      gender           TEXT CHECK (gender IN ('male','female','other')),
      meal_preference  TEXT NOT NULL DEFAULT 'standard'
                       CHECK (meal_preference IN ('standard','vegetarian','vegan','halal','kosher','gluten_free','other')),
      seat_preference  TEXT NOT NULL DEFAULT 'none'
                       CHECK (seat_preference IN ('window','aisle','none')),
      is_travel_manager BOOLEAN NOT NULL DEFAULT FALSE,
      status           TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive')),
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corporate_employees_account ON corporate_employees(account_id);
    CREATE INDEX IF NOT EXISTS idx_corporate_employees_email   ON corporate_employees(email);
    CREATE INDEX IF NOT EXISTS idx_corporate_employees_status  ON corporate_employees(status);
  `);

  // ── Phase 3: Corporate Bookings ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS corporate_bookings (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id         UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      employee_id        UUID NOT NULL REFERENCES corporate_employees(id),
      booked_by_user_id  UUID NOT NULL,  -- portal user (auth service user.id)
      booking_ref        TEXT,            -- UTUBooking main booking ID once fulfilled
      booking_type       TEXT NOT NULL DEFAULT 'flight'
                         CHECK (booking_type IN ('flight','hotel','car','package')),
      status             TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','cancelled','failed')),
      -- Trip details
      origin             TEXT,
      destination        TEXT NOT NULL,
      depart_date        DATE NOT NULL,
      return_date        DATE,
      flight_class       TEXT CHECK (flight_class IN ('first','business','premium_economy','economy')),
      hotel_stars        INT  CHECK (hotel_stars BETWEEN 1 AND 5),
      -- Costs
      estimated_cost_sar NUMERIC(10,2) DEFAULT 0,
      actual_cost_sar    NUMERIC(10,2),
      currency           TEXT NOT NULL DEFAULT 'SAR',
      -- Policy
      policy_compliant   BOOLEAN NOT NULL DEFAULT TRUE,
      policy_flags       TEXT[],         -- array of policy violation codes
      -- Approval (Phase 4)
      requires_approval  BOOLEAN NOT NULL DEFAULT FALSE,
      approved_by        TEXT,
      approved_at        TIMESTAMPTZ,
      -- Notes
      purpose            TEXT,
      notes              TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corp_bookings_account  ON corporate_bookings(account_id);
    CREATE INDEX IF NOT EXISTS idx_corp_bookings_employee ON corporate_bookings(employee_id);
    CREATE INDEX IF NOT EXISTS idx_corp_bookings_status   ON corporate_bookings(status);
    CREATE INDEX IF NOT EXISTS idx_corp_bookings_depart   ON corporate_bookings(depart_date);
  `);

  // ── Phase 4: Approval Workflow ────────────────────────────────────────────
  // Idempotent column additions to corporate_bookings
  await pool.query(`
    ALTER TABLE corporate_bookings
      ADD COLUMN IF NOT EXISTS approval_status  TEXT NOT NULL DEFAULT 'not_required'
        CHECK (approval_status IN ('not_required','pending','approved','rejected')),
      ADD COLUMN IF NOT EXISTS booked_by_email  TEXT;
  `);

  // Approval audit trail — one row per booking that required approval
  await pool.query(`
    CREATE TABLE IF NOT EXISTS corporate_approvals (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id            UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      booking_id            UUID NOT NULL REFERENCES corporate_bookings(id) ON DELETE CASCADE,
      requester_email       TEXT,          -- email of the portal user who created the booking
      approver_email        TEXT,          -- email of whoever approved / rejected
      status                TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
      policy_violation      TEXT,          -- human-readable summary of why approval was needed
      amount_sar            NUMERIC(10,2),
      notes                 TEXT,          -- rejection reason or approval note
      responded_at          TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corp_approvals_account  ON corporate_approvals(account_id);
    CREATE INDEX IF NOT EXISTS idx_corp_approvals_booking  ON corporate_approvals(booking_id);
    CREATE INDEX IF NOT EXISTS idx_corp_approvals_status   ON corporate_approvals(status);
  `);

  // ── Phase 5: Group Travel ─────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS corporate_trip_groups (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id        UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      description       TEXT,
      destination       TEXT NOT NULL,
      origin            TEXT,
      booking_type      TEXT NOT NULL DEFAULT 'flight'
                        CHECK (booking_type IN ('flight','hotel','car','package')),
      flight_class      TEXT CHECK (flight_class IN ('first','business','premium_economy','economy')),
      depart_date       DATE NOT NULL,
      return_date       DATE,
      traveler_count    INT  NOT NULL DEFAULT 0,
      total_spend_sar   NUMERIC(14,2) NOT NULL DEFAULT 0,
      purpose           TEXT,
      status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','confirmed','cancelled')),
      created_by_user_id UUID,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corp_trip_groups_account ON corporate_trip_groups(account_id);
    CREATE INDEX IF NOT EXISTS idx_corp_trip_groups_status  ON corporate_trip_groups(status);
  `);

  await pool.query(`
    ALTER TABLE corporate_bookings
      ADD COLUMN IF NOT EXISTS corporate_trip_group_id UUID
        REFERENCES corporate_trip_groups(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_corp_bookings_group ON corporate_bookings(corporate_trip_group_id);
  `);

  // ── Phase 7: VAT Invoicing ────────────────────────────────────────────────
  await pool.query(`
    ALTER TABLE corporate_accounts
      ADD COLUMN IF NOT EXISTS vat_number             TEXT,
      ADD COLUMN IF NOT EXISTS vat_country            TEXT DEFAULT 'SA'
        CHECK (vat_country IN ('SA','AE','OTHER')),
      ADD COLUMN IF NOT EXISTS billing_address        TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_name   TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_email  TEXT;
  `);

  await pool.query(`
    ALTER TABLE corporate_bookings
      ADD COLUMN IF NOT EXISTS po_reference  TEXT,
      ADD COLUMN IF NOT EXISTS cost_center   TEXT;
  `);

  console.log('[corporate] bootstrap complete');
}
bootstrap().catch(err => console.error('[corporate] bootstrap error:', err.message));

// ── Notification helper ────────────────────────────────────────────────────────
// Fire-and-forget — never throws. Logs a warning if the notification service
// is unreachable so the booking action still succeeds.

async function sendNotification(to, subject, bodyHtml) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  const notifyUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';
  const secret    = process.env.ADMIN_SECRET ?? '';
  try {
    await fetch(`${notifyUrl}/admin/send-to-user`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body:    JSON.stringify({ email: to, subject, bodyHtml }),
      signal:  AbortSignal.timeout(8_000),
    });
  } catch (err) {
    console.warn('[corporate] notification send failed:', err.message);
  }
}

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const [accountStats, enquiryStats, contractStats] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                         AS total,
          COUNT(*) FILTER (WHERE status = 'active')       AS active,
          COUNT(*) FILTER (WHERE status = 'prospect')     AS prospect,
          COUNT(*) FILTER (WHERE status = 'paused')       AS paused,
          COUNT(*) FILTER (WHERE status = 'churned')      AS churned,
          COUNT(*) FILTER (WHERE tier = 'enterprise')     AS enterprise,
          COUNT(*) FILTER (WHERE tier = 'premium')        AS premium,
          COUNT(*) FILTER (WHERE tier = 'standard')       AS standard,
          COALESCE(SUM(total_bookings), 0)                AS total_bookings,
          COALESCE(SUM(total_spend_sar), 0)               AS total_spend_sar
        FROM corporate_accounts
      `),

      pool.query(`
        SELECT
          COUNT(*)                                         AS total,
          COUNT(*) FILTER (WHERE status = 'new')          AS new_count,
          COUNT(*) FILTER (WHERE status = 'contacted')    AS contacted,
          COUNT(*) FILTER (WHERE status = 'qualified')    AS qualified,
          COUNT(*) FILTER (WHERE status = 'converted')    AS converted,
          COUNT(*) FILTER (WHERE status = 'lost')         AS lost
        FROM corporate_enquiries
      `),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE contract_end < NOW() + INTERVAL '60 days'
                             AND contract_end >= NOW()
                             AND status = 'active') AS expiring_60d
        FROM corporate_accounts
      `),
    ]);

    const a  = accountStats.rows[0];
    const e  = enquiryStats.rows[0];
    const c  = contractStats.rows[0];

    res.json({
      data: {
        accounts: {
          total:         parseInt(a.total),
          active:        parseInt(a.active),
          prospect:      parseInt(a.prospect),
          paused:        parseInt(a.paused),
          churned:       parseInt(a.churned),
          by_tier:       { enterprise: parseInt(a.enterprise), premium: parseInt(a.premium), standard: parseInt(a.standard) },
          total_bookings: parseInt(a.total_bookings),
          total_spend_sar: Math.round(parseFloat(a.total_spend_sar)),
        },
        enquiries: {
          total:     parseInt(e.total),
          new:       parseInt(e.new_count),
          contacted: parseInt(e.contacted),
          qualified: parseInt(e.qualified),
          converted: parseInt(e.converted),
          lost:      parseInt(e.lost),
        },
        contracts: {
          expiring_60d: parseInt(c.expiring_60d),
        },
      },
    });
  } catch (err) {
    console.error('[corporate/stats]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /accounts/:id/activate ──────────────────────────────────────────────
// Creates a UTUBooking for Business portal login for this corporate account.
// Calls the auth service to create a user with role='corporate', then records
// portal_user_id + activated_at on the account and sets status='active'.

router.post('/accounts/:id/activate', async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (!email?.trim()) return res.status(400).json({ error: 'EMAIL_REQUIRED',    message: 'Primary email for the portal login is required.' });
  if (!password)      return res.status(400).json({ error: 'PASSWORD_REQUIRED', message: 'A temporary password is required.' });

  try {
    const { rows: acctRows } = await pool.query(
      `SELECT id, company_name, status, activated_at FROM corporate_accounts WHERE id = $1`,
      [req.params.id]
    );
    if (!acctRows.length) return res.status(404).json({ error: 'NOT_FOUND', message: 'Corporate account not found.' });
    if (acctRows[0].activated_at) {
      return res.status(409).json({ error: 'ALREADY_ACTIVATED', message: 'This account already has an active portal login.' });
    }

    // Create corporate user in auth service
    const authUrl = `${process.env.AUTH_SERVICE_URL}/api/admin/corporate-users`;
    const authResp = await fetch(authUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_SECRET },
      body: JSON.stringify({
        email,
        password,
        name:                 name?.trim() || acctRows[0].company_name,
        corporate_account_id: req.params.id,
      }),
    });
    const authBody = await authResp.json();
    if (!authResp.ok) {
      return res.status(authResp.status).json(authBody);
    }

    // Mark account as activated and link the new portal user
    const { rows } = await pool.query(
      `UPDATE corporate_accounts
         SET status           = 'active',
             activated_at     = NOW(),
             portal_user_id   = $2,
             last_activity_at = NOW(),
             updated_at       = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, authBody.data.id]
    );

    res.json({ data: rows[0], portal_user: authBody.data });
  } catch (err) {
    console.error('[corporate/activate]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /accounts ─────────────────────────────────────────────────────────────

router.get('/accounts', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.tier)     { conditions.push(`tier = $${i++}`);     vals.push(req.query.tier); }
  if (req.query.status)   { conditions.push(`status = $${i++}`);   vals.push(req.query.status); }
  if (req.query.industry) { conditions.push(`industry = $${i++}`); vals.push(req.query.industry); }
  if (req.query.country)  { conditions.push(`country = $${i++}`);  vals.push(req.query.country); }
  if (req.query.search) {
    conditions.push(`(company_name ILIKE $${i} OR notes ILIKE $${i})`);
    vals.push(`%${req.query.search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM corporate_accounts ${where}
         ORDER BY
           CASE tier WHEN 'enterprise' THEN 1 WHEN 'premium' THEN 2 ELSE 3 END,
           CASE status WHEN 'active' THEN 1 WHEN 'prospect' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END,
           company_name ASC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM corporate_accounts ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[corporate/accounts GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /accounts ────────────────────────────────────────────────────────────

router.post('/accounts', async (req, res) => {
  const {
    company_name, industry, country, tier, status,
    annual_travel_budget_sar, max_flight_class, max_hotel_stars,
    per_diem_sar, preferred_airlines, advance_booking_days,
    owner, contract_start, contract_end, discount_pct, notes,
  } = req.body ?? {};
  if (!company_name?.trim()) return res.status(400).json({ error: 'COMPANY_NAME_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO corporate_accounts
         (company_name, industry, country, tier, status,
          annual_travel_budget_sar, max_flight_class, max_hotel_stars,
          per_diem_sar, preferred_airlines, advance_booking_days,
          owner, contract_start, contract_end, discount_pct, notes, last_activity_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, NOW())
       RETURNING *`,
      [
        company_name.trim(), industry || 'other', country || null,
        tier || 'standard', status || 'prospect',
        parseFloat(annual_travel_budget_sar ?? 0),
        max_flight_class || 'economy', parseInt(max_hotel_stars ?? 4),
        parseFloat(per_diem_sar ?? 0),
        preferred_airlines || null,
        parseInt(advance_booking_days ?? 14),
        owner || null,
        contract_start || null, contract_end || null,
        parseFloat(discount_pct ?? 0),
        notes?.trim() || null,
      ]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/accounts POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /accounts/:id ───────────────────────────────────────────────────────

router.patch('/accounts/:id', async (req, res) => {
  const ALLOWED = [
    'company_name','industry','country','tier','status',
    'annual_travel_budget_sar','max_flight_class','max_hotel_stars',
    'per_diem_sar','preferred_airlines','advance_booking_days',
    'owner','contract_start','contract_end','discount_pct',
    'total_bookings','total_spend_sar','notes',
    // Phase 7 — VAT / billing
    'vat_number','vat_country','billing_address','billing_contact_name','billing_contact_email',
  ];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (req.body.status === 'active') {
    sets.push('last_activity_at = NOW()');
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_accounts SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/accounts PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /accounts/:id ──────────────────────────────────────────────────────

router.delete('/accounts/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_accounts
         SET status = 'churned', updated_at = NOW()
       WHERE id = $1 RETURNING id, company_name, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/accounts DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /accounts/:id/contacts ────────────────────────────────────────────────

router.get('/accounts/:id/contacts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM corporate_contacts WHERE account_id = $1
       ORDER BY is_primary DESC, name ASC`,
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[corporate/contacts GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /accounts/:id/contacts ───────────────────────────────────────────────

router.post('/accounts/:id/contacts', async (req, res) => {
  const { name, title, email, phone, role, is_primary } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'NAME_REQUIRED' });
  try {
    const { rows: acct } = await pool.query(
      `SELECT company_name FROM corporate_accounts WHERE id = $1`, [req.params.id]
    );
    if (!acct.length) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });

    // If new contact is primary, demote all others
    if (is_primary) {
      await pool.query(
        `UPDATE corporate_contacts SET is_primary = FALSE WHERE account_id = $1`,
        [req.params.id]
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO corporate_contacts
         (account_id, account_name, name, title, email, phone, role, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, acct[0].company_name,
       name.trim(), title?.trim() || null, email?.trim() || null,
       phone?.trim() || null, role || 'booker', is_primary ? true : false]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/contacts POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /accounts/:id/contacts/:cid ────────────────────────────────────────

router.patch('/accounts/:id/contacts/:cid', async (req, res) => {
  const ALLOWED = ['name','title','email','phone','role','is_primary'];
  const sets = ['updated_at = NOW()']; const vals = [req.params.cid, req.params.id]; let i = 3;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  try {
    if (req.body.is_primary) {
      await pool.query(
        `UPDATE corporate_contacts SET is_primary = FALSE WHERE account_id = $1`, [req.params.id]
      );
    }
    const { rows } = await pool.query(
      `UPDATE corporate_contacts SET ${sets.join(', ')}
       WHERE id = $1 AND account_id = $2 RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/contacts PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /accounts/:id/contacts/:cid ───────────────────────────────────────

router.delete('/accounts/:id/contacts/:cid', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM corporate_contacts WHERE id = $1 AND account_id = $2`,
      [req.params.cid, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true });
  } catch (err) {
    console.error('[corporate/contacts DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /enquiries ────────────────────────────────────────────────────────────

router.get('/enquiries', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)     { conditions.push(`status = $${i++}`);     vals.push(req.query.status); }
  if (req.query.account_id) { conditions.push(`account_id = $${i++}`); vals.push(req.query.account_id); }
  if (req.query.search) {
    conditions.push(`(company_name ILIKE $${i} OR contact_name ILIKE $${i} OR email ILIKE $${i})`);
    vals.push(`%${req.query.search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM corporate_enquiries ${where}
         ORDER BY
           CASE status WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3 ELSE 4 END,
           created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM corporate_enquiries ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[corporate/enquiries GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /enquiries ───────────────────────────────────────────────────────────
// Called from the Next.js BFF when a business travel enquiry is submitted.

router.post('/enquiries', async (req, res) => {
  const {
    company_name, contact_name, email, phone,
    traveler_count, destinations, travel_dates, message, source,
    job_title, company_size, country, estimated_monthly_budget_sar, hear_about_us,
  } = req.body ?? {};
  if (!company_name?.trim()) return res.status(400).json({ error: 'COMPANY_NAME_REQUIRED' });
  if (!contact_name?.trim()) return res.status(400).json({ error: 'CONTACT_NAME_REQUIRED' });
  if (!email?.trim())        return res.status(400).json({ error: 'EMAIL_REQUIRED' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'INVALID_EMAIL' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO corporate_enquiries
         (company_name, contact_name, email, phone,
          traveler_count, destinations, travel_dates, message, source,
          job_title, company_size, country, industry,
          estimated_monthly_budget_sar, hear_about_us)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        company_name.trim(), contact_name.trim(), email.trim().toLowerCase(),
        phone?.trim() || null, parseInt(traveler_count ?? 1),
        destinations?.trim() || null, travel_dates?.trim() || null,
        message?.trim() || null, source || 'website',
        job_title?.trim() || null, company_size || null, country || null,
        industry || null,
        parseFloat(estimated_monthly_budget_sar ?? 0) || null,
        hear_about_us?.trim() || null,
      ]
    );

    const enquiry = rows[0];

    // Send confirmation email to applicant (fire-and-forget)
    sendNotification(
      email.trim().toLowerCase(),
      'We received your UTUBooking for Business application',
      `<p>Hi ${contact_name.trim()},</p>
       <p>Thank you for applying for <strong>UTUBooking for Business</strong>.</p>
       <p>Our team will review your application and get back to you within 1–2 business days.</p>
       <p>In the meantime, feel free to reach us at
          <a href="mailto:corporate@utubooking.com">corporate@utubooking.com</a>.</p>
       <p style="margin-top:24px">Best regards,<br>UTUBooking Corporate Team</p>`
    );

    // ── Launch corporate enquiry qualification workflow ────────────────────────
    wf.launch({
      triggerEvent:   'corporate_enquiry_received',
      triggerRef:     enquiry.id,
      triggerRefType: 'corporate_enquiry',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        company_name:                 company_name.trim(),
        contact_name:                 contact_name.trim(),
        email:                        email.trim().toLowerCase(),
        traveler_count:               parseInt(traveler_count ?? 1),
        country:                      country || null,
        company_size:                 company_size || null,
        estimated_monthly_budget_sar: parseFloat(estimated_monthly_budget_sar ?? 0) || null,
      },
    });

    res.status(201).json({ data: enquiry });
  } catch (err) {
    console.error('[corporate/enquiries POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /enquiries/:id ──────────────────────────────────────────────────────

router.patch('/enquiries/:id', async (req, res) => {
  const ALLOWED = ['status', 'assigned_to', 'admin_notes', 'account_id'];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_enquiries SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/enquiries PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /enquiries/:id/approve ───────────────────────────────────────────────
// One-click approve: creates corporate account + portal user + emails applicant credentials.

router.post('/enquiries/:id/approve', async (req, res) => {
  const { notes } = req.body ?? {};
  try {
    const enqRes = await pool.query('SELECT * FROM corporate_enquiries WHERE id = $1', [req.params.id]);
    if (!enqRes.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const enquiry = enqRes.rows[0];

    if (enquiry.status === 'converted') {
      return res.status(409).json({ error: 'ALREADY_APPROVED', message: 'This application has already been approved.' });
    }

    // Create corporate account from enquiry data
    const acctRes = await pool.query(
      `INSERT INTO corporate_accounts
         (company_name, country, industry, status, tier, notes, last_activity_at)
       VALUES ($1,$2,$3,'active','standard',$4,NOW())
       RETURNING *`,
      [
        enquiry.company_name,
        enquiry.country  || null,
        enquiry.industry || 'other',
        notes?.trim() || `Approved from application. Contact: ${enquiry.contact_name} <${enquiry.email}>`,
      ]
    );
    const account = acctRes.rows[0];

    // Generate temporary password
    const { randomBytes } = require('crypto');
    const raw = randomBytes(6).toString('hex').toUpperCase();
    const tempPassword = `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8)}`;

    // Create portal user via auth service
    const authUrl = `${process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'}/api/admin/corporate-users`;
    const authResp = await fetch(authUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_SECRET },
      body: JSON.stringify({
        email:                enquiry.email,
        password:             tempPassword,
        name:                 enquiry.contact_name,
        corporate_account_id: account.id,
      }),
    });
    const authBody = await authResp.json();
    if (!authResp.ok) {
      await pool.query('DELETE FROM corporate_accounts WHERE id = $1', [account.id]);
      return res.status(authResp.status).json(authBody);
    }

    // Link portal user to account + mark enquiry converted
    await pool.query(
      `UPDATE corporate_accounts SET portal_user_id=$2, updated_at=NOW() WHERE id=$1`,
      [account.id, authBody.data.id]
    );
    const updEnqRes = await pool.query(
      `UPDATE corporate_enquiries
         SET status='converted', account_id=$2,
             admin_notes=COALESCE($3, admin_notes), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, account.id, notes?.trim() || null]
    );

    // Send welcome email with credentials
    const portalUrl = process.env.PORTAL_URL ?? 'https://utubooking.com/pro';
    sendNotification(
      enquiry.email,
      'Your UTUBooking for Business account is approved — Welcome!',
      `<p>Hi ${enquiry.contact_name},</p>
       <p>Great news! Your application for <strong>UTUBooking for Business</strong> has been
          <strong style="color:#16a34a">approved</strong>.</p>
       <p>Your corporate portal is ready. Use the credentials below to log in:</p>
       <table style="border-collapse:collapse;font-size:14px;margin:16px 0;background:#f8fafc;padding:16px;border-radius:8px">
         <tr><td style="padding:6px 16px;color:#64748b;font-weight:600">Portal URL</td>
             <td style="padding:6px 16px"><a href="${portalUrl}">${portalUrl}</a></td></tr>
         <tr><td style="padding:6px 16px;color:#64748b;font-weight:600">Email</td>
             <td style="padding:6px 16px">${enquiry.email}</td></tr>
         <tr><td style="padding:6px 16px;color:#64748b;font-weight:600">Temp Password</td>
             <td style="padding:6px 16px;font-family:monospace;font-size:16px;font-weight:700;letter-spacing:2px">${tempPassword}</td></tr>
       </table>
       <p style="color:#dc2626;font-size:13px">Please change your password immediately after your first login.</p>
       <p>Questions? Email <a href="mailto:corporate@utubooking.com">corporate@utubooking.com</a></p>
       <p style="margin-top:24px">Welcome aboard!<br>UTUBooking Corporate Team</p>`
    );

    res.json({ data: updEnqRes.rows[0], account, portal_user: authBody.data });
  } catch (err) {
    console.error('[corporate/enquiries/approve]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /enquiries/:id/reject ────────────────────────────────────────────────
// Reject application with optional reason — status → lost + notifies applicant.

router.post('/enquiries/:id/reject', async (req, res) => {
  const { reason } = req.body ?? {};
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_enquiries
         SET status='lost',
             admin_notes=COALESCE($2, admin_notes),
             updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, reason?.trim() || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const enquiry = rows[0];

    sendNotification(
      enquiry.email,
      'Update on your UTUBooking for Business application',
      `<p>Hi ${enquiry.contact_name},</p>
       <p>Thank you for your interest in <strong>UTUBooking for Business</strong>.</p>
       <p>After reviewing your application, we are unable to proceed at this time.${reason ? ` ${reason.trim()}` : ''}</p>
       <p>You are welcome to reapply as your business grows, or contact us directly at
          <a href="mailto:corporate@utubooking.com">corporate@utubooking.com</a>
          if you have questions.</p>
       <p style="margin-top:24px">Kind regards,<br>UTUBooking Corporate Team</p>`
    );

    res.json({ data: enquiry });
  } catch (err) {
    console.error('[corporate/enquiries/reject]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /employees ────────────────────────────────────────────────────────────
// Used by both the admin UI (any account) and the portal BFF (scoped to one account).

router.get('/employees', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '100', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.account_id) { conditions.push(`account_id = $${i++}`); vals.push(req.query.account_id); }
  if (req.query.status)     { conditions.push(`status = $${i++}`);     vals.push(req.query.status); }
  if (req.query.department) { conditions.push(`department ILIKE $${i++}`); vals.push(`%${req.query.department}%`); }
  if (req.query.search) {
    conditions.push(`(name ILIKE $${i} OR email ILIKE $${i} OR employee_ref ILIKE $${i})`);
    vals.push(`%${req.query.search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM corporate_employees ${where}
         ORDER BY is_travel_manager DESC, name ASC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM corporate_employees ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[corporate/employees GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /employees ───────────────────────────────────────────────────────────

router.post('/employees', async (req, res) => {
  const {
    account_id, employee_ref, name, email, phone,
    department, job_title, nationality,
    passport_number, passport_expiry, date_of_birth,
    gender, meal_preference, seat_preference,
    is_travel_manager, notes,
  } = req.body ?? {};

  if (!account_id)    return res.status(400).json({ error: 'ACCOUNT_ID_REQUIRED' });
  if (!name?.trim())  return res.status(400).json({ error: 'NAME_REQUIRED' });
  if (!email?.trim()) return res.status(400).json({ error: 'EMAIL_REQUIRED' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'INVALID_EMAIL' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO corporate_employees
         (account_id, employee_ref, name, email, phone,
          department, job_title, nationality,
          passport_number, passport_expiry, date_of_birth,
          gender, meal_preference, seat_preference,
          is_travel_manager, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        account_id, employee_ref?.trim() || null,
        name.trim(), email.trim().toLowerCase(),
        phone?.trim() || null, department?.trim() || null,
        job_title?.trim() || null, nationality?.toUpperCase() || null,
        passport_number?.trim() || null,
        passport_expiry || null, date_of_birth || null,
        gender || null,
        meal_preference || 'standard', seat_preference || 'none',
        is_travel_manager ? true : false,
        notes?.trim() || null,
      ]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'An employee with this email already exists in this account.' });
    }
    console.error('[corporate/employees POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /employees/:id ──────────────────────────────────────────────────────

router.patch('/employees/:id', async (req, res) => {
  const ALLOWED = [
    'employee_ref','name','email','phone','department','job_title','nationality',
    'passport_number','passport_expiry','date_of_birth','gender',
    'meal_preference','seat_preference','is_travel_manager','status','notes',
  ];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  try {
    const { rows } = await pool.query(
      `UPDATE corporate_employees SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/employees PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /bookings ─────────────────────────────────────────────────────────────
// Used by admin (any account_id) and portal BFF (scoped to account via JWT).

router.get('/bookings', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.account_id)  { conditions.push(`cb.account_id = $${i++}`);  vals.push(req.query.account_id); }
  if (req.query.employee_id) { conditions.push(`cb.employee_id = $${i++}`); vals.push(req.query.employee_id); }
  if (req.query.status)      { conditions.push(`cb.status = $${i++}`);      vals.push(req.query.status); }
  if (req.query.booking_type){ conditions.push(`cb.booking_type = $${i++}`);vals.push(req.query.booking_type); }
  // ?pending_approval=true → bookings awaiting approval
  if (req.query.pending_approval === 'true') {
    conditions.push(`cb.requires_approval = TRUE AND cb.approved_at IS NULL AND cb.status = 'pending'`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT cb.*,
                ce.name         AS employee_name,
                ce.email        AS employee_email,
                ce.department   AS employee_dept,
                ce.nationality  AS employee_nationality
           FROM corporate_bookings cb
           JOIN corporate_employees ce ON ce.id = cb.employee_id
          ${where}
         ORDER BY cb.depart_date ASC, cb.created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM corporate_bookings cb ${where}`, vals
      ),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[corporate/bookings GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /bookings ────────────────────────────────────────────────────────────
// Creates a corporate booking request. Runs policy checks against the account's
// travel policy and flags any violations (does NOT block — Phase 4 handles approval).

const FLIGHT_CLASS_RANK = { economy: 1, premium_economy: 2, business: 3, first: 4 };

router.post('/bookings', async (req, res) => {
  const {
    account_id, employee_id, booked_by_user_id, booked_by_email,
    booking_type, origin, destination, depart_date, return_date,
    flight_class, hotel_stars,
    estimated_cost_sar, currency,
    purpose, notes,
  } = req.body ?? {};

  if (!account_id)        return res.status(400).json({ error: 'ACCOUNT_ID_REQUIRED' });
  if (!employee_id)       return res.status(400).json({ error: 'EMPLOYEE_ID_REQUIRED' });
  if (!booked_by_user_id) return res.status(400).json({ error: 'BOOKED_BY_REQUIRED' });
  if (!destination?.trim()) return res.status(400).json({ error: 'DESTINATION_REQUIRED' });
  if (!depart_date)         return res.status(400).json({ error: 'DEPART_DATE_REQUIRED' });

  try {
    // Load travel policy from the corporate account
    const { rows: acctRows } = await pool.query(
      `SELECT max_flight_class, max_hotel_stars, per_diem_sar,
              advance_booking_days, annual_travel_budget_sar, discount_pct
         FROM corporate_accounts WHERE id = $1`,
      [account_id]
    );
    if (!acctRows.length) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
    const policy = acctRows[0];

    // ── Policy checks ──
    const policy_flags = [];

    // Flight class check
    if (booking_type === 'flight' && flight_class) {
      const requested = FLIGHT_CLASS_RANK[flight_class] ?? 0;
      const allowed   = FLIGHT_CLASS_RANK[policy.max_flight_class] ?? 1;
      if (requested > allowed) {
        policy_flags.push(`FLIGHT_CLASS_EXCEEDED:requested=${flight_class},allowed=${policy.max_flight_class}`);
      }
    }

    // Hotel stars check
    if (booking_type === 'hotel' && hotel_stars && hotel_stars > (policy.max_hotel_stars ?? 5)) {
      policy_flags.push(`HOTEL_STARS_EXCEEDED:requested=${hotel_stars},allowed=${policy.max_hotel_stars}`);
    }

    // Advance booking check (depart_date must be at least advance_booking_days from now)
    const daysUntilDepart = Math.floor((new Date(depart_date) - new Date()) / 86400000);
    if (daysUntilDepart < (policy.advance_booking_days ?? 0)) {
      policy_flags.push(`ADVANCE_BOOKING:days_until_depart=${daysUntilDepart},required=${policy.advance_booking_days}`);
    }

    const policy_compliant  = policy_flags.length === 0;
    const requires_approval = !policy_compliant;
    const approval_status   = requires_approval ? 'pending' : 'not_required';

    // Apply corporate discount to estimated cost
    const discount        = parseFloat(policy.discount_pct ?? 0);
    const raw_cost        = parseFloat(estimated_cost_sar ?? 0);
    const discounted_cost = raw_cost > 0 ? raw_cost * (1 - discount / 100) : 0;
    const final_cost      = discounted_cost > 0 ? discounted_cost : raw_cost;

    const { rows } = await pool.query(
      `INSERT INTO corporate_bookings
         (account_id, employee_id, booked_by_user_id, booked_by_email,
          booking_type, origin, destination, depart_date, return_date,
          flight_class, hotel_stars,
          estimated_cost_sar, currency,
          policy_compliant, policy_flags, requires_approval, approval_status,
          purpose, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        account_id, employee_id, booked_by_user_id,
        booked_by_email?.trim().toLowerCase() || null,
        booking_type || 'flight', origin?.trim() || null,
        destination.trim(),
        depart_date, return_date || null,
        flight_class || null, parseInt(hotel_stars ?? 0) || null,
        final_cost, currency || 'SAR',
        policy_compliant, policy_flags.length ? policy_flags : null,
        requires_approval, approval_status,
        purpose?.trim() || null, notes?.trim() || null,
      ]
    );

    const booking = rows[0];

    // ── Phase 4: create approval audit record + notify travel manager(s) ──
    if (requires_approval) {
      const policyViolationText = policy_flags.join('; ');

      // Insert approval audit record (fire-and-forget on error)
      pool.query(
        `INSERT INTO corporate_approvals
           (account_id, booking_id, requester_email, status, policy_violation, amount_sar)
         VALUES ($1, $2, $3, 'pending', $4, $5)`,
        [account_id, booking.id,
         booked_by_email?.trim().toLowerCase() || null,
         policyViolationText, final_cost]
      ).catch(err => console.error('[corporate] approval insert failed:', err.message));

      // Email all active travel managers for this account
      const { rows: mgrs } = await pool.query(
        `SELECT name, email FROM corporate_employees
          WHERE account_id = $1 AND is_travel_manager = TRUE AND status = 'active'`,
        [account_id]
      ).catch(() => ({ rows: [] }));

      // Also email the primary contact (covers accounts with no portal travel manager yet)
      const { rows: primaryContact } = await pool.query(
        `SELECT name, email FROM corporate_contacts
          WHERE account_id = $1 AND is_primary = TRUE LIMIT 1`,
        [account_id]
      ).catch(() => ({ rows: [] }));

      const recipients = [
        ...mgrs.map(m => ({ name: m.name, email: m.email })),
        ...primaryContact.filter(c => c.email && !mgrs.some(m => m.email === c.email))
                         .map(c => ({ name: c.name, email: c.email })),
      ];

      const flagList = policy_flags
        .map(f => `<li style="margin:4px 0">${f.split(':')[0].replace(/_/g,' ').toLowerCase()}: ${f.split(':').slice(1).join(' ')}</li>`)
        .join('');

      for (const { name, email } of recipients) {
        sendNotification(
          email,
          `[Action Required] Travel booking requires approval — ${destination.trim()}`,
          `<p>Hi ${name ?? 'there'},</p>
           <p>A travel booking submitted by <strong>${booked_by_email ?? 'a team member'}</strong>
              requires your approval before it can be processed.</p>
           <table style="border-collapse:collapse;font-size:14px;margin:16px 0">
             <tr><td style="padding:4px 8px;color:#666">Trip</td>
                 <td style="padding:4px 8px;font-weight:600">${origin ? `${origin} → ` : ''}${destination.trim()}</td></tr>
             <tr><td style="padding:4px 8px;color:#666">Depart</td>
                 <td style="padding:4px 8px">${depart_date}${return_date ? ` → ${return_date}` : ''}</td></tr>
             <tr><td style="padding:4px 8px;color:#666">Type</td>
                 <td style="padding:4px 8px;text-transform:capitalize">${booking_type || 'flight'}${flight_class ? ` · ${flight_class.replace(/_/g,' ')}` : ''}</td></tr>
             <tr><td style="padding:4px 8px;color:#666">Est. Cost</td>
                 <td style="padding:4px 8px">SAR ${Math.round(final_cost).toLocaleString()}</td></tr>
           </table>
           <p><strong>Policy flags:</strong></p><ul>${flagList}</ul>
           <p>Please log in to the UTUBooking Business portal to approve or reject this request.</p>
           <p style="margin-top:24px;color:#888;font-size:12px">UTUBooking for Business</p>`
        );
      }
    }

    // ── Budget threshold alerts (fire-and-forget) ────────────────────────────
    // Check if this booking pushes YTD spend past 80% or 100% of annual budget.
    // Only fire the alert once per threshold crossing to avoid email spam.
    (async () => {
      try {
        const [spendRes, acctRes] = await Promise.all([
          pool.query(
            `SELECT COALESCE(SUM(estimated_cost_sar),0) AS ytd_sar
               FROM corporate_bookings
              WHERE account_id = $1
                AND status NOT IN ('cancelled','failed')
                AND EXTRACT(YEAR FROM depart_date) = EXTRACT(YEAR FROM NOW())`,
            [account_id]
          ),
          pool.query(
            `SELECT annual_travel_budget_sar, company_name FROM corporate_accounts WHERE id = $1`,
            [account_id]
          ),
        ]);

        const ytd    = parseFloat(spendRes.rows[0]?.ytd_sar ?? 0);
        const budget = parseFloat(acctRes.rows[0]?.annual_travel_budget_sar ?? 0);
        const company = acctRes.rows[0]?.company_name ?? 'Your company';
        if (!budget) return;

        const pct = Math.round((ytd / budget) * 100);
        let threshold = null;
        if (pct >= 100 && pct - Math.round((final_cost / budget) * 100) < 100) threshold = 100;
        else if (pct >= 80 && pct - Math.round((final_cost / budget) * 100) < 80) threshold = 80;
        if (!threshold) return;

        // Email travel managers
        const { rows: mgrs } = await pool.query(
          `SELECT name, email FROM corporate_employees
            WHERE account_id = $1 AND is_travel_manager = TRUE AND status = 'active'`,
          [account_id]
        );
        for (const { name: mgrName, email: mgrEmail } of mgrs) {
          sendNotification(
            mgrEmail,
            `${threshold === 100 ? '[ALERT] Annual travel budget fully consumed' : '[Warning] Annual travel budget 80% used'} — ${company}`,
            `<p>Hi ${mgrName ?? 'there'},</p>
             <p>${company} has ${threshold === 100
               ? '<strong>consumed its full annual travel budget</strong>'
               : 'used <strong>80% of its annual travel budget</strong>'}.</p>
             <table style="border-collapse:collapse;font-size:14px;margin:16px 0">
               <tr><td style="padding:4px 8px;color:#666">YTD Spend</td>
                   <td style="padding:4px 8px;font-weight:600">SAR ${Math.round(ytd).toLocaleString()}</td></tr>
               <tr><td style="padding:4px 8px;color:#666">Annual Budget</td>
                   <td style="padding:4px 8px">SAR ${Math.round(budget).toLocaleString()}</td></tr>
               <tr><td style="padding:4px 8px;color:#666">Used</td>
                   <td style="padding:4px 8px;color:${threshold === 100 ? '#dc2626' : '#d97706'}">${pct}%</td></tr>
             </table>
             <p>Please review the ${threshold === 100 ? 'remaining bookings and consider requesting a budget increase' : 'upcoming bookings to stay within budget'}.</p>
             <p style="margin-top:24px;color:#888;font-size:12px">UTUBooking for Business</p>`
          );
        }
      } catch (alertErr) {
        console.error('[corporate/bookings budget-alert]', alertErr.message);
      }
    })();

    res.status(201).json({ data: booking, policy_flags, discount_applied_pct: discount, approval_required: requires_approval });
  } catch (err) {
    console.error('[corporate/bookings POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /bookings/:id/approve ────────────────────────────────────────────────

router.post('/bookings/:id/approve', async (req, res) => {
  const { approved_by } = req.body ?? {};
  if (!approved_by?.trim()) return res.status(400).json({ error: 'APPROVED_BY_REQUIRED', message: 'Approver name or email is required.' });

  try {
    const { rows } = await pool.query(
      `UPDATE corporate_bookings
         SET approved_by     = $2,
             approved_at     = NOW(),
             approval_status = 'approved',
             updated_at      = NOW()
       WHERE id = $1 AND requires_approval = TRUE
       RETURNING *`,
      [req.params.id, approved_by.trim()]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const booking = rows[0];

    // Update approval audit record
    pool.query(
      `UPDATE corporate_approvals
         SET status = 'approved', approver_email = $2, responded_at = NOW()
       WHERE booking_id = $1 AND status = 'pending'`,
      [booking.id, approved_by.trim()]
    ).catch(err => console.error('[corporate] approval update failed:', err.message));

    // Notify requester
    if (booking.booked_by_email) {
      sendNotification(
        booking.booked_by_email,
        `Your travel booking has been approved — ${booking.destination}`,
        `<p>Your travel booking request has been <strong style="color:#16a34a">approved</strong>.</p>
         <table style="border-collapse:collapse;font-size:14px;margin:16px 0">
           <tr><td style="padding:4px 8px;color:#666">Trip</td>
               <td style="padding:4px 8px;font-weight:600">${booking.origin ? `${booking.origin} → ` : ''}${booking.destination}</td></tr>
           <tr><td style="padding:4px 8px;color:#666">Depart</td>
               <td style="padding:4px 8px">${booking.depart_date}${booking.return_date ? ` → ${booking.return_date}` : ''}</td></tr>
           <tr><td style="padding:4px 8px;color:#666">Approved by</td>
               <td style="padding:4px 8px">${approved_by.trim()}</td></tr>
           <tr><td style="padding:4px 8px;color:#666">Est. Cost</td>
               <td style="padding:4px 8px">SAR ${Math.round(booking.estimated_cost_sar ?? 0).toLocaleString()}</td></tr>
         </table>
         <p>Your travel manager will complete the booking shortly. You can track it in the UTUBooking Business portal.</p>
         <p style="margin-top:24px;color:#888;font-size:12px">UTUBooking for Business</p>`
      );
    }

    res.json({ data: booking });
  } catch (err) {
    console.error('[corporate/bookings approve]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /bookings/:id/reject ─────────────────────────────────────────────────

router.post('/bookings/:id/reject', async (req, res) => {
  const { reason, rejected_by } = req.body ?? {};

  try {
    const { rows } = await pool.query(
      `UPDATE corporate_bookings
         SET status          = 'cancelled',
             approval_status = 'rejected',
             notes  = CASE WHEN $2::text IS NOT NULL
                      THEN COALESCE(notes || E'\n', '') || 'Rejected: ' || $2
                      ELSE notes END,
             updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, reason?.trim() || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const booking = rows[0];

    // Update approval audit record
    const approverEmail = rejected_by?.trim() || null;
    pool.query(
      `UPDATE corporate_approvals
         SET status = 'rejected', approver_email = $2, notes = $3, responded_at = NOW()
       WHERE booking_id = $1 AND status = 'pending'`,
      [booking.id, approverEmail, reason?.trim() || null]
    ).catch(err => console.error('[corporate] approval update failed:', err.message));

    // Notify requester
    if (booking.booked_by_email) {
      sendNotification(
        booking.booked_by_email,
        `Your travel booking request was not approved — ${booking.destination}`,
        `<p>Your travel booking request has been <strong style="color:#dc2626">not approved</strong>.</p>
         <table style="border-collapse:collapse;font-size:14px;margin:16px 0">
           <tr><td style="padding:4px 8px;color:#666">Trip</td>
               <td style="padding:4px 8px;font-weight:600">${booking.origin ? `${booking.origin} → ` : ''}${booking.destination}</td></tr>
           <tr><td style="padding:4px 8px;color:#666">Depart</td>
               <td style="padding:4px 8px">${booking.depart_date}${booking.return_date ? ` → ${booking.return_date}` : ''}</td></tr>
           ${reason?.trim() ? `<tr><td style="padding:4px 8px;color:#666">Reason</td>
               <td style="padding:4px 8px">${reason.trim()}</td></tr>` : ''}
         </table>
         <p>Please contact your travel manager if you have questions, or submit a new booking within policy.</p>
         <p style="margin-top:24px;color:#888;font-size:12px">UTUBooking for Business</p>`
      );
    }

    res.json({ data: booking });
  } catch (err) {
    console.error('[corporate/bookings reject]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /bookings/:id/confirm ────────────────────────────────────────────────
// Admin-only: marks a booking as confirmed and sets the UTUBooking booking_ref.

router.post('/bookings/:id/confirm', async (req, res) => {
  const { booking_ref, actual_cost_sar } = req.body ?? {};

  try {
    const sets = [`status = 'confirmed'`, `updated_at = NOW()`];
    const vals = [req.params.id];
    let i = 2;
    if (booking_ref)      { sets.push(`booking_ref = $${i++}`);       vals.push(booking_ref.trim()); }
    if (actual_cost_sar)  { sets.push(`actual_cost_sar = $${i++}`);   vals.push(parseFloat(actual_cost_sar)); }

    const { rows } = await pool.query(
      `UPDATE corporate_bookings SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const booking = rows[0];

    // Notify the requester that the booking is confirmed
    if (booking.booked_by_email) {
      const cost = booking.actual_cost_sar ?? booking.estimated_cost_sar;
      sendNotification(
        booking.booked_by_email,
        `Your travel booking is confirmed — ${booking.destination}`,
        `<p>Great news! Your travel booking has been <strong style="color:#16a34a">confirmed</strong> by UTUBooking for Business.</p>
         <table style="border-collapse:collapse;font-size:14px;margin:16px 0">
           <tr><td style="padding:4px 8px;color:#666">Trip</td>
               <td style="padding:4px 8px;font-weight:600">${booking.origin ? `${booking.origin} → ` : ''}${booking.destination}</td></tr>
           <tr><td style="padding:4px 8px;color:#666">Depart</td>
               <td style="padding:4px 8px">${booking.depart_date}${booking.return_date ? ` → ${booking.return_date}` : ''}</td></tr>
           ${booking.booking_ref ? `<tr><td style="padding:4px 8px;color:#666">Booking Ref</td>
               <td style="padding:4px 8px;font-family:monospace">${booking.booking_ref}</td></tr>` : ''}
           ${cost ? `<tr><td style="padding:4px 8px;color:#666">Cost</td>
               <td style="padding:4px 8px">SAR ${Math.round(cost).toLocaleString()}</td></tr>` : ''}
         </table>
         <p>You can view full details in the <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://utubooking.com'}/pro/bookings" style="color:#2563eb">UTUBooking for Business portal</a>.</p>
         <p style="margin-top:24px;color:#888;font-size:12px">UTUBooking for Business</p>`
      );
    }

    res.json({ data: booking });
  } catch (err) {
    console.error('[corporate/bookings confirm]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /bookings/:id ───────────────────────────────────────────────────────

router.patch('/bookings/:id', async (req, res) => {
  const ALLOWED = [
    'status','booking_ref','actual_cost_sar',
    'approved_by','approved_at','requires_approval',
    'purpose','notes',
  ];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  try {
    const { rows } = await pool.query(
      `UPDATE corporate_bookings SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/bookings PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /approvals ────────────────────────────────────────────────────────────
// Approval audit log. Supports ?account_id=, ?status=, ?page=, ?limit=
// Used by admin UI for oversight and by portal BFF for the approver inbox history.

router.get('/approvals', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.account_id) { conditions.push(`ca.account_id = $${i++}`); vals.push(req.query.account_id); }
  if (req.query.status)     { conditions.push(`ca.status = $${i++}`);     vals.push(req.query.status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT
           ca.*,
           cb.destination,
           cb.origin,
           cb.depart_date,
           cb.return_date,
           cb.booking_type,
           cb.flight_class,
           cb.hotel_stars,
           cb.purpose,
           cb.booked_by_email,
           ce.name  AS employee_name,
           ce.email AS employee_email,
           ce.department AS employee_dept
         FROM corporate_approvals ca
         JOIN corporate_bookings  cb ON cb.id = ca.booking_id
         JOIN corporate_employees ce ON ce.id = cb.employee_id
         ${where}
         ORDER BY ca.created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM corporate_approvals ca ${where}`, vals
      ),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[corporate/approvals GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /employees/:id — soft-deactivate ───────────────────────────────────

router.delete('/employees/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_employees
         SET status = 'inactive', updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/employees DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 5 — Group Travel
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /trip-groups ──────────────────────────────────────────────────────────

router.get('/trip-groups', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.account_id) { conditions.push(`account_id = $${i++}`); vals.push(req.query.account_id); }
  if (req.query.status)     { conditions.push(`status = $${i++}`);     vals.push(req.query.status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM corporate_trip_groups ${where}
         ORDER BY depart_date ASC, created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM corporate_trip_groups ${where}`, vals),
    ]);
    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[corporate/trip-groups GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /trip-groups/:id ──────────────────────────────────────────────────────

router.get('/trip-groups/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM corporate_trip_groups WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/trip-groups/:id GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /trip-groups/:id/bookings ─────────────────────────────────────────────

router.get('/trip-groups/:id/bookings', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cb.*,
              ce.name        AS employee_name,
              ce.email       AS employee_email,
              ce.department  AS employee_dept,
              ce.passport_expiry,
              ce.nationality AS employee_nationality
         FROM corporate_bookings  cb
         JOIN corporate_employees ce ON ce.id = cb.employee_id
        WHERE cb.corporate_trip_group_id = $1
        ORDER BY ce.name ASC`,
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[corporate/trip-groups/:id/bookings GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /trip-groups — create group only (without bookings) ──────────────────

router.post('/trip-groups', async (req, res) => {
  const {
    account_id, name, description, destination, origin,
    booking_type, flight_class, depart_date, return_date, purpose,
    created_by_user_id,
  } = req.body ?? {};

  if (!account_id)          return res.status(400).json({ error: 'ACCOUNT_ID_REQUIRED' });
  if (!name?.trim())        return res.status(400).json({ error: 'NAME_REQUIRED' });
  if (!destination?.trim()) return res.status(400).json({ error: 'DESTINATION_REQUIRED' });
  if (!depart_date)         return res.status(400).json({ error: 'DEPART_DATE_REQUIRED' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO corporate_trip_groups
         (account_id, name, description, destination, origin,
          booking_type, flight_class, depart_date, return_date,
          purpose, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        account_id, name.trim(), description?.trim() || null,
        destination.trim(), origin?.trim() || null,
        booking_type || 'flight', flight_class || null,
        depart_date, return_date || null,
        purpose?.trim() || null, created_by_user_id || null,
      ]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/trip-groups POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /trip-groups/bulk-booking ────────────────────────────────────────────
// Creates the group + N individual bookings in one operation.
// Body:
//   account_id, booked_by_user_id, booked_by_email,
//   name, description, destination, origin, depart_date, return_date,
//   booking_type, flight_class, hotel_stars,
//   estimated_cost_sar_per_person, currency, purpose,
//   employee_ids: string[]

router.post('/trip-groups/bulk-booking', async (req, res) => {
  const {
    account_id, booked_by_user_id, booked_by_email,
    name, description, destination, origin,
    booking_type, flight_class, hotel_stars,
    depart_date, return_date,
    estimated_cost_sar_per_person, currency, purpose,
    employee_ids,
  } = req.body ?? {};

  if (!account_id)              return res.status(400).json({ error: 'ACCOUNT_ID_REQUIRED' });
  if (!name?.trim())            return res.status(400).json({ error: 'NAME_REQUIRED' });
  if (!destination?.trim())     return res.status(400).json({ error: 'DESTINATION_REQUIRED' });
  if (!depart_date)             return res.status(400).json({ error: 'DEPART_DATE_REQUIRED' });
  if (!Array.isArray(employee_ids) || employee_ids.length < 2) {
    return res.status(400).json({ error: 'MIN_TWO_TRAVELERS', message: 'Group bookings require at least 2 employees.' });
  }
  if (employee_ids.length > 100) {
    return res.status(400).json({ error: 'TOO_MANY_TRAVELERS', message: 'Maximum 100 travellers per group booking.' });
  }

  try {
    // Load travel policy
    const { rows: acctRows } = await pool.query(
      `SELECT max_flight_class, max_hotel_stars, per_diem_sar,
              advance_booking_days, discount_pct
         FROM corporate_accounts WHERE id = $1`,
      [account_id]
    );
    if (!acctRows.length) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
    const policy = acctRows[0];

    // Load all employees in one query (validates they belong to this account)
    const { rows: employees } = await pool.query(
      `SELECT id, name, email, department, nationality, passport_expiry, passport_number
         FROM corporate_employees
        WHERE id = ANY($1::uuid[]) AND account_id = $2 AND status = 'active'`,
      [employee_ids, account_id]
    );

    if (employees.length !== employee_ids.length) {
      const foundIds = new Set(employees.map(e => e.id));
      const missing = employee_ids.filter(id => !foundIds.has(id));
      return res.status(400).json({ error: 'EMPLOYEE_NOT_FOUND', missing });
    }

    // Policy checks (shared for all travelers — same itinerary)
    const policy_flags = [];
    const FLIGHT_RANK = { economy: 1, premium_economy: 2, business: 3, first: 4 };

    if (booking_type === 'flight' && flight_class) {
      if ((FLIGHT_RANK[flight_class] ?? 0) > (FLIGHT_RANK[policy.max_flight_class] ?? 1)) {
        policy_flags.push(`FLIGHT_CLASS_EXCEEDED:requested=${flight_class},allowed=${policy.max_flight_class}`);
      }
    }
    if (booking_type === 'hotel' && hotel_stars && hotel_stars > (policy.max_hotel_stars ?? 5)) {
      policy_flags.push(`HOTEL_STARS_EXCEEDED:requested=${hotel_stars},allowed=${policy.max_hotel_stars}`);
    }
    const daysUntil = Math.floor((new Date(depart_date) - new Date()) / 86_400_000);
    if (daysUntil < (policy.advance_booking_days ?? 0)) {
      policy_flags.push(`ADVANCE_BOOKING:days_until_depart=${daysUntil},required=${policy.advance_booking_days}`);
    }

    // Passport validity warnings (< 6 months from depart_date)
    const passportWarnings = [];
    const departMs = new Date(depart_date).getTime();
    for (const emp of employees) {
      if (emp.passport_expiry) {
        const expiryMs = new Date(emp.passport_expiry).getTime();
        const monthsLeft = (expiryMs - departMs) / (30 * 86_400_000);
        if (monthsLeft < 6) {
          passportWarnings.push({ employee_id: emp.id, name: emp.name, passport_expiry: emp.passport_expiry });
        }
      }
    }

    const policy_compliant  = policy_flags.length === 0;
    const requires_approval = !policy_compliant;
    const approval_status   = requires_approval ? 'pending' : 'not_required';
    const discount          = parseFloat(policy.discount_pct ?? 0);
    const per_person_cost   = parseFloat(estimated_cost_sar_per_person ?? 0);
    const discounted_cost   = per_person_cost > 0 ? per_person_cost * (1 - discount / 100) : 0;
    const final_per_person  = discounted_cost > 0 ? discounted_cost : per_person_cost;
    const total_spend       = final_per_person * employees.length;

    // ── Transaction: create group + N bookings ─────────────────────────────
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: groupRows } = await client.query(
        `INSERT INTO corporate_trip_groups
           (account_id, name, description, destination, origin,
            booking_type, flight_class, depart_date, return_date,
            traveler_count, total_spend_sar, purpose,
            status, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13)
         RETURNING *`,
        [
          account_id, name.trim(), description?.trim() || null,
          destination.trim(), origin?.trim() || null,
          booking_type || 'flight', flight_class || null,
          depart_date, return_date || null,
          employees.length, total_spend,
          purpose?.trim() || null, booked_by_user_id || null,
        ]
      );
      const group = groupRows[0];

      const bookingRows = [];
      for (const emp of employees) {
        const { rows: bRows } = await client.query(
          `INSERT INTO corporate_bookings
             (account_id, employee_id, booked_by_user_id, booked_by_email,
              booking_type, origin, destination, depart_date, return_date,
              flight_class, hotel_stars,
              estimated_cost_sar, currency,
              policy_compliant, policy_flags, requires_approval, approval_status,
              purpose, corporate_trip_group_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           RETURNING *`,
          [
            account_id, emp.id, booked_by_user_id || null,
            booked_by_email?.trim().toLowerCase() || null,
            booking_type || 'flight', origin?.trim() || null,
            destination.trim(), depart_date, return_date || null,
            flight_class || null, parseInt(hotel_stars ?? 0) || null,
            final_per_person, currency || 'SAR',
            policy_compliant,
            policy_flags.length ? policy_flags : null,
            requires_approval, approval_status,
            purpose?.trim() || null,
            group.id,
          ]
        );
        bookingRows.push({ ...bRows[0], employee_name: emp.name, employee_email: emp.email });
      }

      await client.query('COMMIT');

      // Create approval records + notify if needed (fire-and-forget)
      if (requires_approval) {
        const policyText = policy_flags.join('; ');
        for (const bk of bookingRows) {
          pool.query(
            `INSERT INTO corporate_approvals
               (account_id, booking_id, requester_email, status, policy_violation, amount_sar)
             VALUES ($1,$2,$3,'pending',$4,$5)`,
            [account_id, bk.id, booked_by_email?.toLowerCase() || null, policyText, final_per_person]
          ).catch(err => console.error('[corporate] group approval insert failed:', err.message));
        }

        // Email travel managers once (for the whole group, not per traveler)
        const { rows: mgrs } = await pool.query(
          `SELECT name, email FROM corporate_employees
            WHERE account_id = $1 AND is_travel_manager = TRUE AND status = 'active'`,
          [account_id]
        ).catch(() => ({ rows: [] }));

        const flagList = policy_flags
          .map(f => `<li>${f.split(':')[0].replace(/_/g,' ').toLowerCase()}</li>`)
          .join('');
        for (const { name: mgrName, email: mgrEmail } of mgrs) {
          sendNotification(
            mgrEmail,
            `[Action Required] Group travel booking requires approval — ${destination.trim()} (${employees.length} travellers)`,
            `<p>Hi ${mgrName ?? 'there'},</p>
             <p>A group booking for <strong>${employees.length} travellers</strong>
                to <strong>${destination.trim()}</strong> requires your approval.</p>
             <p><strong>Policy flags:</strong></p><ul>${flagList}</ul>
             <p>Total estimated cost: SAR ${Math.round(total_spend).toLocaleString()}</p>
             <p>Please log in to the UTUBooking Business portal to review this request.</p>`
          );
        }
      }

      res.status(201).json({
        data: {
          group,
          bookings: bookingRows,
          policy_flags,
          passport_warnings: passportWarnings,
          discount_applied_pct: discount,
          approval_required: requires_approval,
        },
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[corporate/trip-groups/bulk-booking]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /trip-groups/:id ────────────────────────────────────────────────────

router.patch('/trip-groups/:id', async (req, res) => {
  const ALLOWED = ['name','description','status','purpose'];
  const sets = ['updated_at = NOW()']; const vals = [req.params.id]; let i = 2;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (sets.length === 1) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_trip_groups SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/trip-groups PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /trip-groups/:id — soft-cancel ─────────────────────────────────────

router.delete('/trip-groups/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE corporate_trip_groups
         SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/trip-groups DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 7 — VAT Invoicing & Expense Export
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /accounts/:id/invoice-months ──────────────────────────────────────────
// Returns the distinct billing months (YYYY-MM) that have bookings for export.

router.get('/accounts/:id/invoice-months', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(depart_date, 'YYYY-MM') AS month,
              COUNT(*)                         AS booking_count,
              SUM(estimated_cost_sar)          AS subtotal_sar
         FROM corporate_bookings
        WHERE account_id = $1 AND status <> 'cancelled'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 24`,
      [req.params.id]
    );
    res.json({ data: rows.map(r => ({
      month:         r.month,
      booking_count: parseInt(r.booking_count),
      subtotal_sar:  Math.round(parseFloat(r.subtotal_sar ?? 0)),
    })) });
  } catch (err) {
    console.error('[corporate/invoice-months]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /accounts/:id/invoice/:yearMonth — generate monthly invoice ────────────
// yearMonth format: YYYY-MM (e.g. 2026-04)
// VAT rates: SA = 15%, AE = 5%, all others = 0%

router.get('/accounts/:id/invoice/:yearMonth', async (req, res) => {
  const { id, yearMonth } = req.params;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return res.status(400).json({ error: 'INVALID_PERIOD', message: 'yearMonth must be YYYY-MM' });
  }

  try {
    const [acctRes, bookingRes] = await Promise.all([
      pool.query(`SELECT * FROM corporate_accounts WHERE id = $1`, [id]),
      pool.query(
        `SELECT cb.*,
                ce.name        AS employee_name,
                ce.department  AS employee_dept
           FROM corporate_bookings cb
           JOIN corporate_employees ce ON ce.id = cb.employee_id
          WHERE cb.account_id = $1
            AND TO_CHAR(cb.depart_date, 'YYYY-MM') = $2
            AND cb.status <> 'cancelled'
          ORDER BY cb.depart_date ASC, ce.name ASC`,
        [id, yearMonth]
      ),
    ]);

    if (!acctRes.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const account = acctRes.rows[0];
    const items   = bookingRes.rows;

    const VAT_RATES = { SA: 0.15, AE: 0.05, OTHER: 0 };
    const vatRate   = VAT_RATES[account.vat_country ?? 'SA'] ?? 0.15;

    const subtotal  = items.reduce((s, b) => s + parseFloat(b.estimated_cost_sar ?? 0), 0);
    const vatAmount = Math.round(subtotal * vatRate);
    const total     = Math.round(subtotal) + vatAmount;

    const [year, month] = yearMonth.split('-');
    const issueDate     = new Date(parseInt(year), parseInt(month), 1)
                            .toISOString().slice(0, 10);  // 1st of following month
    const dueDate       = new Date(parseInt(year), parseInt(month) + 1, 0)
                            .toISOString().slice(0, 10);  // last day of following month

    const MONTH_NAMES = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    const periodLabel = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
    const invoiceNo   = `UTU-${id.slice(0, 8).toUpperCase()}-${yearMonth.replace('-', '')}`;

    const lineItems = items.map(b => {
      let description = b.destination;
      if (b.booking_type === 'flight' && b.origin) {
        description = `${b.origin} → ${b.destination}`;
        if (b.flight_class) description += ` · ${b.flight_class.replace(/_/g, ' ')}`;
      } else if (b.booking_type === 'hotel') {
        description = `Hotel: ${b.destination}`;
        if (b.hotel_stars) description += ` (${'★'.repeat(b.hotel_stars)})`;
      }
      return {
        id:             b.id,
        employee_name:  b.employee_name,
        employee_dept:  b.employee_dept,
        booking_type:   b.booking_type,
        description,
        depart_date:    b.depart_date,
        return_date:    b.return_date,
        po_reference:   b.po_reference,
        cost_center:    b.cost_center,
        booking_ref:    b.booking_ref,
        amount_sar:     Math.round(parseFloat(b.estimated_cost_sar ?? 0)),
        policy_flags:   b.policy_flags,
      };
    });

    res.json({
      data: {
        invoice_number: invoiceNo,
        period:         periodLabel,
        year_month:     yearMonth,
        issue_date:     issueDate,
        due_date:       dueDate,
        account: {
          id:                     account.id,
          company_name:           account.company_name,
          vat_number:             account.vat_number,
          vat_country:            account.vat_country ?? 'SA',
          billing_address:        account.billing_address,
          billing_contact_name:   account.billing_contact_name,
          billing_contact_email:  account.billing_contact_email,
          tier:                   account.tier,
          discount_pct:           parseFloat(account.discount_pct ?? 0),
        },
        line_items:      lineItems,
        item_count:      lineItems.length,
        subtotal_sar:    Math.round(subtotal),
        vat_rate_pct:    Math.round(vatRate * 100),
        vat_amount_sar:  vatAmount,
        total_sar:       total,
      },
    });
  } catch (err) {
    console.error('[corporate/invoice]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 6 — Portal Dashboard & Settings
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /accounts/:id ─────────────────────────────────────────────────────────
// Returns a single account record — used by the portal settings page.

router.get('/accounts/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM corporate_accounts WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[corporate/accounts/:id GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /portal-stats?account_id=... ──────────────────────────────────────────
// Dashboard KPIs for the portal home page.  All queries are scoped to a single
// account_id extracted from the query string (the BFF injects it from the JWT).

router.get('/portal-stats', async (req, res) => {
  const accountId = req.query.account_id;
  if (!accountId) return res.status(400).json({ error: 'ACCOUNT_ID_REQUIRED' });

  try {
    const [
      accountRow,
      spendRow,
      upcomingRow,
      pendingRow,
      complianceRow,
      topDestRow,
      passportRow,
    ] = await Promise.all([

      // Account budget
      pool.query(
        `SELECT annual_travel_budget_sar FROM corporate_accounts WHERE id = $1`,
        [accountId]
      ),

      // Spend this month vs last month
      pool.query(
        `SELECT
           COALESCE(SUM(estimated_cost_sar) FILTER (
             WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
           ), 0) AS this_month_sar,
           COALESCE(SUM(estimated_cost_sar) FILTER (
             WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
           ), 0) AS last_month_sar,
           COALESCE(SUM(estimated_cost_sar) FILTER (
             WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', NOW())
           ), 0) AS this_year_sar
         FROM corporate_bookings
         WHERE account_id = $1 AND status <> 'cancelled'`,
        [accountId]
      ),

      // Upcoming trips — next 7 days, with employee name
      pool.query(
        `SELECT cb.id, cb.booking_type, cb.origin, cb.destination, cb.depart_date,
                cb.return_date, cb.flight_class, cb.estimated_cost_sar,
                cb.status, cb.requires_approval, cb.approval_status,
                ce.name AS employee_name, ce.department AS employee_dept
           FROM corporate_bookings cb
           JOIN corporate_employees ce ON ce.id = cb.employee_id
          WHERE cb.account_id = $1
            AND cb.depart_date BETWEEN NOW()::DATE AND (NOW() + INTERVAL '7 days')::DATE
            AND cb.status <> 'cancelled'
          ORDER BY cb.depart_date ASC
          LIMIT 20`,
        [accountId]
      ),

      // Pending approvals count
      pool.query(
        `SELECT COUNT(*) AS cnt
           FROM corporate_bookings
          WHERE account_id = $1 AND approval_status = 'pending'`,
        [accountId]
      ),

      // Policy compliance rate this quarter
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE policy_compliant = TRUE) AS compliant
           FROM corporate_bookings
          WHERE account_id = $1
            AND created_at >= DATE_TRUNC('quarter', NOW())
            AND status <> 'cancelled'`,
        [accountId]
      ),

      // Top destinations — last 90 days
      pool.query(
        `SELECT destination,
                COUNT(*) AS booking_count,
                COALESCE(SUM(estimated_cost_sar), 0) AS total_spend_sar
           FROM corporate_bookings
          WHERE account_id = $1
            AND created_at >= NOW() - INTERVAL '90 days'
            AND status <> 'cancelled'
          GROUP BY destination
          ORDER BY booking_count DESC
          LIMIT 5`,
        [accountId]
      ),

      // Employees with expiring passports (< 6 months)
      pool.query(
        `SELECT id, name, department, passport_expiry
           FROM corporate_employees
          WHERE account_id = $1
            AND status = 'active'
            AND passport_expiry IS NOT NULL
            AND passport_expiry < NOW() + INTERVAL '6 months'
          ORDER BY passport_expiry ASC
          LIMIT 10`,
        [accountId]
      ),
    ]);

    const budget       = parseFloat(accountRow.rows[0]?.annual_travel_budget_sar ?? 0);
    const monthlyBudget = budget / 12;
    const spend         = spendRow.rows[0];
    const compliance    = complianceRow.rows[0];
    const complianceRate = parseInt(compliance.total) > 0
      ? Math.round((parseInt(compliance.compliant) / parseInt(compliance.total)) * 100)
      : 100;

    res.json({
      data: {
        budget: {
          annual_sar:  Math.round(budget),
          monthly_sar: Math.round(monthlyBudget),
        },
        spend: {
          this_month_sar: Math.round(parseFloat(spend.this_month_sar)),
          last_month_sar: Math.round(parseFloat(spend.last_month_sar)),
          this_year_sar:  Math.round(parseFloat(spend.this_year_sar)),
          month_pct_of_budget: monthlyBudget > 0
            ? Math.round((parseFloat(spend.this_month_sar) / monthlyBudget) * 100)
            : 0,
        },
        pending_approvals:     parseInt(pendingRow.rows[0].cnt),
        policy_compliance_pct: complianceRate,
        upcoming_trips:        upcomingRow.rows,
        top_destinations:      topDestRow.rows.map(r => ({
          destination:    r.destination,
          booking_count:  parseInt(r.booking_count),
          total_spend_sar: Math.round(parseFloat(r.total_spend_sar)),
        })),
        expiring_passports: passportRow.rows,
      },
    });
  } catch (err) {
    console.error('[corporate/portal-stats]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
