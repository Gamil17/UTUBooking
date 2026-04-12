'use strict';

/**
 * Marketing Content Calendar — Admin Routes
 *
 * GET    /api/admin/marketing/calendar          list entries, filter by status / language / month
 * POST   /api/admin/marketing/calendar          create entry
 * PATCH  /api/admin/marketing/calendar/:id      update status, notes, file_path, etc.
 * DELETE /api/admin/marketing/calendar/:id      remove entry
 *
 * Authorization: Bearer <ADMIN_SECRET>  (same pattern as infrastructure.health.js)
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');
const wf         = require('../lib/workflow-client');

const router = Router();
router.use(adminAuth);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── Seed data — 90-day calendar Apr-Jun 2026 ──────────────────────────────────
const CALENDAR_SEED = [
  {
    title: 'Best Hotels Near Masjid Al-Haram 2026',
    keyword: 'best hotels near Masjid Al-Haram 2026',
    slug: 'best-hotels-near-masjid-al-haram-2026',
    language: 'EN',
    status: 'draft',
    publish_week: 'Apr W1',
    utm_campaign: 'best-hotels-near-masjid-al-haram-2026',
    file_path: 'marketing/blog-drafts/2026-04-10-best-hotels-near-masjid-al-haram-EN.md',
    notes: null,
  },
  {
    title: 'Umrah Travel Checklist 2026',
    keyword: 'Umrah travel checklist 2026',
    slug: 'umrah-travel-checklist-2026',
    language: 'EN',
    status: 'draft',
    publish_week: 'Apr W2',
    utm_campaign: 'umrah-travel-checklist-2026',
    file_path: 'marketing/blog-drafts/2026-04-15-umrah-travel-checklist-2026-EN.md',
    notes: null,
  },
  {
    title: 'Cheap Flights to Jeddah from GCC Cities 2026',
    keyword: 'cheap flights to Jeddah from GCC cities',
    slug: 'cheap-flights-jeddah-gcc-2026',
    language: 'EN',
    status: 'draft',
    publish_week: 'Apr W3',
    utm_campaign: 'cheap-flights-jeddah-gcc-2026',
    file_path: 'marketing/blog-drafts/2026-04-22-cheap-flights-jeddah-gcc-EN.md',
    notes: null,
  },
  {
    title: 'Car Rental Makkah to Madinah 2026',
    keyword: 'car rental Makkah to Madinah',
    slug: 'car-rental-makkah-madinah',
    language: 'EN',
    status: 'draft',
    publish_week: 'Apr W4',
    utm_campaign: 'car-rental-makkah-madinah',
    file_path: 'marketing/blog-drafts/2026-04-29-car-rental-makkah-madinah-EN.md',
    notes: null,
  },
  {
    title: 'Best Hotels in Madinah Near Masjid Al-Nabawi 2026',
    keyword: 'best hotels in Madinah near Masjid Al-Nabawi 2026',
    slug: 'best-hotels-madinah-masjid-nabawi-2026',
    language: 'EN',
    status: 'planned',
    publish_week: 'May W1',
    utm_campaign: 'best-hotels-madinah-masjid-nabawi-2026',
    file_path: null,
    notes: null,
  },
  {
    title: 'Hajj 2026 Hotel Booking Guide',
    keyword: 'Hajj 2026 hotel booking guide',
    slug: 'hajj-2026-hotel-booking-guide',
    language: 'EN',
    status: 'planned',
    publish_week: 'May W2',
    utm_campaign: 'hajj-2026-hotel-booking-guide',
    file_path: null,
    notes: null,
  },
  {
    title: 'Riyadh Business Hotels 2026',
    keyword: 'Riyadh business hotels 2026',
    slug: 'riyadh-business-hotels-2026',
    language: 'EN',
    status: 'planned',
    publish_week: 'May W3',
    utm_campaign: 'riyadh-business-hotels-2026',
    file_path: null,
    notes: null,
  },
  {
    title: 'فنادق قريبة من الحرم المكي',
    keyword: 'فنادق قريبة من الحرم المكي',
    slug: 'fanadeq-qariba-haram-makki',
    language: 'AR',
    status: 'planned',
    publish_week: 'May W4',
    utm_campaign: 'fanadeq-qariba-haram-makki',
    file_path: null,
    notes: null,
  },
  {
    title: 'Almosafer vs UTUBooking',
    keyword: 'Almosafer vs UTUBooking',
    slug: 'almosafer-vs-utubooking',
    language: 'EN',
    status: 'planned',
    publish_week: 'Jun W1',
    utm_campaign: 'almosafer-vs-utubooking',
    file_path: null,
    notes: 'Legal review required before publishing',
  },
  {
    title: 'Ramadan Umrah 2027 Early Booking Guide',
    keyword: 'Ramadan Umrah 2027 early booking',
    slug: 'ramadan-umrah-2027-early-booking',
    language: 'EN',
    status: 'planned',
    publish_week: 'Jun W2',
    utm_campaign: 'ramadan-umrah-2027-early-booking',
    file_path: null,
    notes: null,
  },
  {
    title: 'Best Time to Book Flights to Saudi Arabia',
    keyword: 'best time to book flights to Saudi Arabia',
    slug: 'best-time-book-flights-saudi-arabia',
    language: 'EN',
    status: 'planned',
    publish_week: 'Jun W3',
    utm_campaign: 'best-time-book-flights-saudi-arabia',
    file_path: null,
    notes: null,
  },
  {
    title: 'Airport Car Rental Riyadh King Khalid',
    keyword: 'airport car rental Riyadh King Khalid',
    slug: 'airport-car-rental-riyadh-kaia',
    language: 'EN',
    status: 'planned',
    publish_week: 'Jun W4',
    utm_campaign: 'airport-car-rental-riyadh-kaia',
    file_path: null,
    notes: null,
  },
];

// ── Bootstrap table + seed on startup ────────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_calendar (
      id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      title        TEXT        NOT NULL,
      keyword      TEXT,
      slug         TEXT,
      language     TEXT        NOT NULL DEFAULT 'EN',
      status       TEXT        NOT NULL DEFAULT 'planned'
                               CHECK (status IN ('planned','draft','review','approved','published')),
      post_type    TEXT        NOT NULL DEFAULT 'blog',
      publish_week TEXT,
      utm_campaign TEXT,
      file_path    TEXT,
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Seed only if empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM content_calendar');
  if (parseInt(rows[0].count) === 0) {
    for (const entry of CALENDAR_SEED) {
      await pool.query(
        `INSERT INTO content_calendar
           (title, keyword, slug, language, status, publish_week, utm_campaign, file_path, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          entry.title, entry.keyword, entry.slug, entry.language,
          entry.status, entry.publish_week, entry.utm_campaign,
          entry.file_path, entry.notes,
        ],
      );
    }
    console.log('[marketing] seeded 12 content calendar entries');
  }
}
bootstrap().catch((err) => console.error('[marketing] bootstrap error:', err.message));

// ── Helpers ───────────────────────────────────────────────────────────────────
const VALID_STATUSES = new Set(['planned', 'draft', 'review', 'approved', 'published']);

// ── GET /api/admin/marketing/calendar ─────────────────────────────────────────
router.get('/calendar', async (req, res) => {
  const { status, language, month, page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (status && VALID_STATUSES.has(status)) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  if (language) {
    conditions.push(`language = $${idx++}`);
    values.push(language.toUpperCase());
  }
  if (month) {
    // month = 'Apr' | 'May' | 'Jun'
    conditions.push(`publish_week ILIKE $${idx++}`);
    values.push(`${month}%`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT id, title, keyword, slug, language, status, post_type,
                publish_week, utm_campaign, file_path, notes, created_at, updated_at
           FROM content_calendar ${where}
          ORDER BY
            CASE publish_week
              WHEN 'Apr W1' THEN 1 WHEN 'Apr W2' THEN 2 WHEN 'Apr W3' THEN 3 WHEN 'Apr W4' THEN 4
              WHEN 'May W1' THEN 5 WHEN 'May W2' THEN 6 WHEN 'May W3' THEN 7 WHEN 'May W4' THEN 8
              WHEN 'Jun W1' THEN 9 WHEN 'Jun W2' THEN 10 WHEN 'Jun W3' THEN 11 WHEN 'Jun W4' THEN 12
              ELSE 99
            END
          LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, lim, off],
      ),
      pool.query(`SELECT COUNT(*) FROM content_calendar ${where}`, values),
    ]);
    res.json({ data: rows.rows, total: parseInt(total.rows[0].count), page: parseInt(page, 10), limit: lim });
  } catch (err) {
    console.error('[marketing/calendar GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/marketing/calendar ────────────────────────────────────────
router.post('/calendar', async (req, res) => {
  const { title, keyword, slug, language = 'EN', status = 'planned',
          post_type = 'blog', publish_week, utm_campaign, file_path, notes } = req.body ?? {};

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (status && !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO content_calendar
         (title, keyword, slug, language, status, post_type, publish_week, utm_campaign, file_path, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [title, keyword ?? null, slug ?? null, language, status, post_type,
       publish_week ?? null, utm_campaign ?? null, file_path ?? null, notes ?? null],
    );
    const entry = rows[0];

    // ── Launch content review workflow when piece is submitted for review ─────
    if (status === 'review') {
      wf.launch({
        triggerEvent:   'blog_post_ready',
        triggerRef:     entry.id,
        triggerRefType: 'content_calendar',
        initiatedBy:    req.user?.email ?? 'admin',
        context: {
          title,
          keyword:      keyword ?? null,
          slug:         slug ?? null,
          language,
          post_type,
          publish_week: publish_week ?? null,
          utm_campaign: utm_campaign ?? null,
          file_path:    file_path ?? null,
        },
      });
    }

    res.status(201).json({ data: entry });
  } catch (err) {
    console.error('[marketing/calendar POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /api/admin/marketing/calendar/:id ───────────────────────────────────
router.patch('/calendar/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['title','keyword','slug','language','status','post_type',
                   'publish_week','utm_campaign','file_path','notes'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }
  if (updates.status && !VALID_STATUSES.has(updates.status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  setClauses.push(`updated_at = NOW()`);

  try {
    const { rows } = await pool.query(
      `UPDATE content_calendar
          SET ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING *`,
      [id, ...Object.values(updates)],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[marketing/calendar PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/admin/marketing/calendar/:id ──────────────────────────────────
router.delete('/calendar/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM content_calendar WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    console.error('[marketing/calendar DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/marketing/consent ─────────────────────────────────────────
/**
 * Read-only view of the marketing consent log across all shards.
 * Query params: email, country, status (granted|revoked|all), page, limit
 */
router.get('/consent', async (req, res) => {
  const { email, country, status = 'all', page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  // Build filter clauses
  const conditions = [`cl.consent_type = 'marketing'`];
  const values     = [];
  let   idx        = 1;

  if (email) {
    conditions.push(`u.email ILIKE $${idx++}`);
    values.push(`%${email}%`);
  }
  if (country) {
    conditions.push(`u.country_code = $${idx++}`);
    values.push(country.toUpperCase());
  }
  if (status === 'granted') {
    conditions.push(`cl.granted = TRUE`);
  } else if (status === 'revoked') {
    conditions.push(`cl.granted = FALSE`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  try {
    // Fan out to shard pool(s). When a country filter is set use its shard;
    // otherwise use the local pool (dev) or loop all shards in prod.
    // For now query using the local pool — sharding layer can be added without API change.
    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT DISTINCT ON (cl.user_id)
                cl.user_id, u.email, u.country_code,
                cl.consent_type, cl.granted, cl.timestamp
           FROM consent_log cl
           JOIN users u ON u.id = cl.user_id
           ${where}
          ORDER BY cl.user_id, cl.timestamp DESC
          LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, lim, off],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT cl.user_id) AS total
           FROM consent_log cl
           JOIN users u ON u.id = cl.user_id
           ${where}`,
        values,
      ),
    ]);
    res.json({ data: rows.rows, total: parseInt(total.rows[0].total), page: parseInt(page, 10), limit: lim });
  } catch (err) {
    console.error('[marketing/consent GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/marketing/timeline ─────────────────────────────────────────
/**
 * Unified content + campaign timeline for a given month.
 * Query params: month (YYYY-MM), page, limit
 */
router.get('/timeline', async (req, res) => {
  const { month, page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  // Derive month prefix for publish_week (e.g. '2026-04' → 'Apr')
  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let monthPrefix = null;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const m = parseInt(month.split('-')[1], 10);
    monthPrefix = MONTH_ABBR[m - 1] ?? null;
  }

  try {
    // 1. Content calendar entries for the month
    const calConditions = [];
    const calValues     = [];
    if (monthPrefix) {
      calConditions.push(`publish_week ILIKE $${calValues.push(monthPrefix + '%')}`);
    }
    const calWhere = calConditions.length ? 'WHERE ' + calConditions.join(' AND ') : '';

    const calRows = await pool.query(
      `SELECT id, title, 'content' AS item_type, status, language,
              publish_week, utm_campaign, NULL AS scheduled_for, created_at
         FROM content_calendar ${calWhere}`,
      calValues,
    );

    // 2. Campaigns for the month — fetched from notification service internal endpoint
    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';
    const internalSecret = process.env.INTERNAL_API_SECRET ?? '';
    let campaignItems = [];
    try {
      const qs  = month ? `?month=${encodeURIComponent(month)}` : '';
      const r   = await fetch(`${notifyUrl}/internal/campaigns-for-timeline${qs}`, {
        headers: { 'x-internal-secret': internalSecret },
        signal:  AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const body = await r.json();
        campaignItems = (body.data ?? []).map(c => ({
          id:           c.id,
          title:        c.name,
          item_type:    'campaign',
          status:       c.status,
          language:     null,
          publish_week: null,
          utm_campaign: null,
          scheduled_for: c.scheduled_for,
          created_at:   c.created_at,
        }));
      }
    } catch (fetchErr) {
      console.warn('[marketing/timeline] notification service unavailable:', fetchErr.message);
    }

    // 3. Merge, sort by date, paginate
    const allItems = [
      ...calRows.rows.map(r => ({ ...r, scheduled_for: null })),
      ...campaignItems,
    ].sort((a, b) => {
      const da = new Date(a.scheduled_for ?? a.created_at);
      const db = new Date(b.scheduled_for ?? b.created_at);
      return da - db;
    });

    const total   = allItems.length;
    const paged   = allItems.slice(off, off + lim);

    res.json({ data: paged, total, page: parseInt(page, 10), limit: lim });
  } catch (err) {
    console.error('[marketing/timeline GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Briefs
// POST /campaigns  — submit a campaign brief → launches campaign_brief_submitted workflow
// GET  /campaigns  — list campaign briefs
// PATCH /campaigns/:id — update status
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrapCampaigns() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name            TEXT        NOT NULL,
      description     TEXT,
      channel         TEXT        NOT NULL DEFAULT 'multi',
      target_audience TEXT,
      objective       TEXT,
      budget_sar      NUMERIC(12,2),
      start_date      DATE,
      end_date        DATE,
      status          TEXT        NOT NULL DEFAULT 'brief'
                                  CHECK (status IN ('brief','review','approved','scheduled','live','completed','rejected')),
      submitted_by    TEXT,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrapCampaigns().catch(e => console.error('[marketing] campaigns bootstrap error:', e.message));

router.post('/campaigns', async (req, res) => {
  const {
    name, description, channel = 'multi', target_audience,
    objective, budget_sar, start_date, end_date, notes,
    submitted_by,
  } = req.body ?? {};

  if (!name?.trim()) return res.status(400).json({ error: 'NAME_REQUIRED' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO marketing_campaigns
         (name, description, channel, target_audience, objective, budget_sar, start_date, end_date, status, submitted_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'brief',$9,$10)
       RETURNING *`,
      [name.trim(), description ?? null, channel, target_audience ?? null,
       objective ?? null, budget_sar ?? null, start_date ?? null, end_date ?? null,
       req.user?.email ?? submitted_by ?? null, notes ?? null]
    );
    const campaign = rows[0];

    // ── Launch campaign lifecycle approval workflow ────────────────────────────
    wf.launch({
      triggerEvent:   'campaign_brief_submitted',
      triggerRef:     campaign.id,
      triggerRefType: 'campaign',
      initiatedBy:    req.user?.email ?? submitted_by ?? 'system',
      context: {
        campaign_id:      campaign.id,
        name:             campaign.name,
        channel,
        objective:        objective ?? null,
        budget_sar:       budget_sar ? parseFloat(budget_sar) : null,
        start_date:       start_date ?? null,
        end_date:         end_date ?? null,
        target_audience:  target_audience ?? null,
      },
    });

    res.status(201).json({ data: campaign });
  } catch (err) {
    console.error('[marketing/campaigns POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

router.get('/campaigns', async (req, res) => {
  const { status, channel, limit: lim = '20', offset: off = '0' } = req.query;
  const conds = []; const vals = [];
  if (status)  { conds.push(`status = $${vals.length + 1}`);  vals.push(status); }
  if (channel) { conds.push(`channel = $${vals.length + 1}`); vals.push(channel); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM marketing_campaigns ${where} ORDER BY created_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, parseInt(lim), parseInt(off)]),
      pool.query(`SELECT COUNT(*) FROM marketing_campaigns ${where}`, vals),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), limit: parseInt(lim), offset: parseInt(off) });
  } catch (err) {
    console.error('[marketing/campaigns GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

router.patch('/campaigns/:id', async (req, res) => {
  const ALLOWED = ['name','description','channel','target_audience','objective','budget_sar','start_date','end_date','status','notes'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'NO_UPDATABLE_FIELDS' });
  const vals = fields.map(k => req.body[k]);
  const sets = fields.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    const { rows } = await pool.query(
      `UPDATE marketing_campaigns SET ${sets}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...vals, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[marketing/campaigns PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
