'use strict';

/**
 * Advertising Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/advertising', advertisingRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                       — KPIs: total enquiries, by status, by type, conversion rate
 *
 * GET  /enquiries                   — All advertising enquiries (filter: status, company_type, region, goal)
 * POST /enquiries                   — Create enquiry (called from BFF /api/advertise/enquiry)
 * PATCH /enquiries/:id              — Update enquiry (status, assigned_to, admin_notes)
 * GET  /enquiries/:id               — Get single enquiry
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
    CREATE TABLE IF NOT EXISTS advertising_enquiries (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name      TEXT NOT NULL,
      company_name   TEXT NOT NULL,
      work_email     TEXT NOT NULL,
      phone          TEXT,
      company_type   TEXT NOT NULL DEFAULT 'other'
                     CHECK (company_type IN (
                       'tourism_board','airline','hotel','ota','attractions',
                       'car_rental','travel_tech','consumer_brands',
                       'financial_payments','halal_brands','other'
                     )),
      region         TEXT NOT NULL DEFAULT 'global'
                     CHECK (region IN (
                       'saudi_arabia','uae','gulf_gcc','mena',
                       'muslim_world','se_asia','s_asia','global'
                     )),
      goal           TEXT NOT NULL DEFAULT 'brand_awareness'
                     CHECK (goal IN (
                       'performance_marketing','brand_awareness','lead_generation',
                       'app_growth','retargeting','product_launch','market_entry'
                     )),
      budget_range   TEXT NOT NULL DEFAULT 'lets_discuss'
                     CHECK (budget_range IN (
                       'under_10k','10k_50k','50k_200k','over_200k','lets_discuss'
                     )),
      message        TEXT,
      consent        BOOLEAN NOT NULL DEFAULT FALSE,
      status         TEXT NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','contacted','qualified','proposal_sent','won','lost','archived')),
      assigned_to    TEXT,
      admin_notes    TEXT,
      source         TEXT NOT NULL DEFAULT 'website',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS advertising_enquiries_status_idx
      ON advertising_enquiries(status);
    CREATE INDEX IF NOT EXISTS advertising_enquiries_company_type_idx
      ON advertising_enquiries(company_type);
    CREATE INDEX IF NOT EXISTS advertising_enquiries_created_at_idx
      ON advertising_enquiries(created_at DESC);
  `);
}

bootstrap().catch((err) => console.error('[advertising] bootstrap error:', err));

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFilters(q) {
  const where = [];
  const vals  = [];
  let   i     = 1;

  if (q.status) {
    where.push(`status = $${i++}`);
    vals.push(q.status);
  }
  if (q.company_type) {
    where.push(`company_type = $${i++}`);
    vals.push(q.company_type);
  }
  if (q.region) {
    where.push(`region = $${i++}`);
    vals.push(q.region);
  }
  if (q.goal) {
    where.push(`goal = $${i++}`);
    vals.push(q.goal);
  }
  if (q.search) {
    where.push(`(full_name ILIKE $${i} OR company_name ILIKE $${i} OR work_email ILIKE $${i})`);
    vals.push(`%${q.search}%`);
    i++;
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    vals,
    nextIdx: i,
  };
}

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                             AS total,
        COUNT(*) FILTER (WHERE status = 'new')                              AS new_count,
        COUNT(*) FILTER (WHERE status = 'contacted')                        AS contacted_count,
        COUNT(*) FILTER (WHERE status = 'qualified')                        AS qualified_count,
        COUNT(*) FILTER (WHERE status = 'proposal_sent')                    AS proposal_sent_count,
        COUNT(*) FILTER (WHERE status = 'won')                              AS won_count,
        COUNT(*) FILTER (WHERE status = 'lost')                             AS lost_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')    AS last_30_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')     AS last_7_days
      FROM advertising_enquiries
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[advertising] stats error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /enquiries ────────────────────────────────────────────────────────────

router.get('/enquiries', async (req, res) => {
  try {
    const { clause, vals, nextIdx } = parseFilters(req.query);
    const limit  = Math.min(parseInt(req.query.limit  ?? '50', 10), 200);
    const offset = parseInt(req.query.offset ?? '0', 10);

    const { rows } = await pool.query(
      `SELECT * FROM advertising_enquiries
       ${clause}
       ORDER BY created_at DESC
       LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      [...vals, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM advertising_enquiries ${clause}`,
      vals,
    );

    res.json({ enquiries: rows, total: parseInt(total.rows[0].count, 10) });
  } catch (err) {
    console.error('[advertising] list error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /enquiries/:id ────────────────────────────────────────────────────────

router.get('/enquiries/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM advertising_enquiries WHERE id = $1',
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[advertising] get error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /enquiries ───────────────────────────────────────────────────────────

const VALID_COMPANY_TYPES = new Set([
  'tourism_board','airline','hotel','ota','attractions',
  'car_rental','travel_tech','consumer_brands',
  'financial_payments','halal_brands','other',
]);
const VALID_REGIONS = new Set([
  'saudi_arabia','uae','gulf_gcc','mena',
  'muslim_world','se_asia','s_asia','global',
]);
const VALID_GOALS = new Set([
  'performance_marketing','brand_awareness','lead_generation',
  'app_growth','retargeting','product_launch','market_entry',
]);
const VALID_BUDGETS = new Set([
  'under_10k','10k_50k','50k_200k','over_200k','lets_discuss',
]);

router.post('/enquiries', async (req, res) => {
  try {
    const {
      full_name, company_name, work_email, phone,
      company_type, region, goal, budget_range, message,
      consent, source,
    } = req.body ?? {};

    // Validate required
    if (!full_name?.trim())    return res.status(400).json({ message: 'Full name is required.' });
    if (!company_name?.trim()) return res.status(400).json({ message: 'Company name is required.' });
    if (!work_email?.trim())   return res.status(400).json({ message: 'Work email is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(work_email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (company_type && !VALID_COMPANY_TYPES.has(company_type)) {
      return res.status(400).json({ message: 'Invalid company type.' });
    }
    if (region && !VALID_REGIONS.has(region)) {
      return res.status(400).json({ message: 'Invalid region.' });
    }
    if (goal && !VALID_GOALS.has(goal)) {
      return res.status(400).json({ message: 'Invalid goal.' });
    }
    if (budget_range && !VALID_BUDGETS.has(budget_range)) {
      return res.status(400).json({ message: 'Invalid budget range.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO advertising_enquiries
         (full_name, company_name, work_email, phone, company_type, region, goal,
          budget_range, message, consent, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        full_name.trim(),
        company_name.trim(),
        work_email.trim().toLowerCase(),
        phone?.trim()        || null,
        company_type         || 'other',
        region               || 'global',
        goal                 || 'brand_awareness',
        budget_range         || 'lets_discuss',
        message?.trim()      || null,
        consent === true,
        source               || 'website',
      ],
    );

    const enquiry = rows[0];

    // ── Launch advertising enquiry qualification workflow ──────────────────────
    wf.launch({
      triggerEvent:   'advertising_enquiry_received',
      triggerRef:     enquiry.id,
      triggerRefType: 'advertising_enquiry',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        full_name:    full_name?.trim(),
        company_name: company_name?.trim(),
        work_email:   work_email?.trim().toLowerCase(),
        company_type: company_type || 'other',
        region:       region || 'global',
        goal:         goal || 'brand_awareness',
        budget_range: budget_range || 'lets_discuss',
      },
    });

    res.status(201).json(enquiry);
  } catch (err) {
    console.error('[advertising] create error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /enquiries/:id ──────────────────────────────────────────────────────

const VALID_STATUSES = new Set([
  'new','contacted','qualified','proposal_sent','won','lost','archived',
]);

router.patch('/enquiries/:id', async (req, res) => {
  try {
    const { status, assigned_to, admin_notes } = req.body ?? {};

    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const sets  = [];
    const vals  = [];
    let   i     = 1;

    if (status       !== undefined) { sets.push(`status = $${i++}`);       vals.push(status); }
    if (assigned_to  !== undefined) { sets.push(`assigned_to = $${i++}`);  vals.push(assigned_to || null); }
    if (admin_notes  !== undefined) { sets.push(`admin_notes = $${i++}`);  vals.push(admin_notes || null); }

    if (!sets.length) return res.status(400).json({ message: 'Nothing to update.' });

    sets.push(`updated_at = NOW()`);
    vals.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE advertising_enquiries SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );

    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[advertising] update error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
