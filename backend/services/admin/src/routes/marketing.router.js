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
    res.status(201).json({ data: rows[0] });
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

module.exports = router;
