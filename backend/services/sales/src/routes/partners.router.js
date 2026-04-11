'use strict';

/**
 * Hotel Partners — Sales Service Routes
 *
 * GET    /api/sales/hotel-partners                list (filter: status, search, page, limit)
 * POST   /api/sales/hotel-partners                create
 * PATCH  /api/sales/hotel-partners/:id            update (auto-sets last_contacted_at)
 * DELETE /api/sales/hotel-partners/:id            delete
 * GET    /api/sales/hotel-partners/export.csv     CSV download
 * GET    /api/sales/hotel-partners/:id/activities list activities
 * POST   /api/sales/hotel-partners/:id/activities log activity
 */

const { Router } = require('express');
const salesAuth  = require('../middleware/salesAuth');
const { pool }   = require('../db/pg');

const router = Router();
router.use(salesAuth);

const VALID_HP_STATUSES  = new Set(['not_contacted','emailed','replied','meeting_scheduled','signed','live','rejected']);
const VALID_HP_ACT_TYPES = new Set(['call','email','meeting','follow_up','note','signed','rejected']);
const CONTACTED_STATUSES = new Set(['emailed','replied','meeting_scheduled','signed','live']);

// ── P1 Haram-zone hotel seed data ─────────────────────────────────────────────
const HOTEL_PARTNERS_SEED = [
  { hotel_name: 'Fairmont Makkah Clock Royal Tower',        city: 'Makkah',  country: 'SA', distance_haram_m: 50,  stars: 5, priority: 1, notes: 'Abraj Al-Bait complex. 858 rooms. Peak rate ~SAR 4,500.' },
  { hotel_name: 'Raffles Makkah Palace',                    city: 'Makkah',  country: 'SA', distance_haram_m: 80,  stars: 5, priority: 1, notes: '214 rooms. Ultra-luxury. Peak rate ~SAR 5,200.' },
  { hotel_name: 'Swissôtel Al Maqam Makkah',                city: 'Makkah',  country: 'SA', distance_haram_m: 80,  stars: 5, priority: 1, notes: '1,490 rooms. Abraj tower. Peak rate ~SAR 3,800.' },
  { hotel_name: 'Pullman Zamzam Makkah',                    city: 'Makkah',  country: 'SA', distance_haram_m: 80,  stars: 5, priority: 1, notes: '750 rooms. Peak rate ~SAR 3,600.' },
  { hotel_name: 'Hyatt Regency Makkah Jabal Omar',          city: 'Makkah',  country: 'SA', distance_haram_m: 120, stars: 5, priority: 1, notes: '674 rooms. Peak rate ~SAR 3,200.' },
  { hotel_name: 'Anantara Jabal Omar Makkah Resort',        city: 'Makkah',  country: 'SA', distance_haram_m: 130, stars: 5, priority: 1, notes: '375 rooms. Peak rate ~SAR 4,200.' },
  { hotel_name: 'Jabal Omar Marriott Hotel Makkah',         city: 'Makkah',  country: 'SA', distance_haram_m: 140, stars: 5, priority: 1, notes: '967 rooms. Peak rate ~SAR 3,100.' },
  { hotel_name: 'Kempinski Hotel Jabal Omar Makkah',        city: 'Makkah',  country: 'SA', distance_haram_m: 120, stars: 5, priority: 1, notes: '1,440 rooms. Peak rate ~SAR 3,800.' },
  { hotel_name: 'Marriott Makkah Hotel',                    city: 'Makkah',  country: 'SA', distance_haram_m: 150, stars: 5, priority: 1, notes: '568 rooms. Peak rate ~SAR 3,000.' },
  { hotel_name: 'Shaza Makkah',                             city: 'Makkah',  country: 'SA', distance_haram_m: 160, stars: 5, priority: 1, notes: '288 rooms. Boutique luxury. Peak rate ~SAR 3,400.' },
  { hotel_name: 'Conrad Makkah',                            city: 'Makkah',  country: 'SA', distance_haram_m: 160, stars: 5, priority: 1, notes: '1,365 rooms. Peak rate ~SAR 3,500.' },
  { hotel_name: 'Makkah Hilton Hotel Towers',               city: 'Makkah',  country: 'SA', distance_haram_m: 180, stars: 5, priority: 1, notes: '2,080 rooms. Peak rate ~SAR 2,500.' },
  { hotel_name: 'Al Marwa Rayhaan by Rotana',               city: 'Makkah',  country: 'SA', distance_haram_m: 200, stars: 5, priority: 1, notes: '868 rooms. Peak rate ~SAR 2,600.' },
  { hotel_name: 'Hilton Suites Makkah',                     city: 'Makkah',  country: 'SA', distance_haram_m: 200, stars: 5, priority: 1, notes: '1,529 rooms. Peak rate ~SAR 2,800.' },
  { hotel_name: 'InterContinental Dar Al Hijra Makkah',     city: 'Makkah',  country: 'SA', distance_haram_m: 220, stars: 5, priority: 1, notes: '1,400 rooms. Peak rate ~SAR 2,600.' },
  { hotel_name: 'Grand Millennium Makkah',                  city: 'Makkah',  country: 'SA', distance_haram_m: 250, stars: 5, priority: 1, notes: '1,490 rooms. Peak rate ~SAR 2,600.' },
  { hotel_name: 'Sheraton Makkah Jabal Al Kaaba',           city: 'Makkah',  country: 'SA', distance_haram_m: 300, stars: 5, priority: 1, notes: '603 rooms. Peak rate ~SAR 2,800.' },
  { hotel_name: 'Mövenpick Hotel & Residences Hajar Tower', city: 'Makkah',  country: 'SA', distance_haram_m: 100, stars: 5, priority: 1, notes: '876 rooms. Peak rate ~SAR 3,200.' },
  { hotel_name: 'Dar Al Tawhid Intercontinental',           city: 'Makkah',  country: 'SA', distance_haram_m: 100, stars: 5, priority: 1, notes: '1,480 rooms. Peak rate ~SAR 3,000.' },
  { hotel_name: 'Makkah Towers Oberoi',                     city: 'Makkah',  country: 'SA', distance_haram_m: 90,  stars: 5, priority: 1, notes: '652 rooms. Peak rate ~SAR 4,000.' },
  { hotel_name: 'Anwar Al Madinah Mövenpick Hotel',         city: 'Madinah', country: 'SA', distance_haram_m: 50,  stars: 5, priority: 1, notes: '2,033 rooms. Closest 5★ to Masjid Al-Nabawi. Peak rate ~SAR 2,400.' },
  { hotel_name: 'Swissôtel Al Maqam Madinah',               city: 'Madinah', country: 'SA', distance_haram_m: 120, stars: 5, priority: 1, notes: '700 rooms. Peak rate ~SAR 2,300.' },
  { hotel_name: 'Pullman ZamZam Madinah',                   city: 'Madinah', country: 'SA', distance_haram_m: 100, stars: 5, priority: 1, notes: '694 rooms. Peak rate ~SAR 2,200.' },
  { hotel_name: 'Sheraton Al Madinah',                      city: 'Madinah', country: 'SA', distance_haram_m: 180, stars: 5, priority: 1, notes: '592 rooms. Peak rate ~SAR 2,200.' },
  { hotel_name: 'Crowne Plaza Madinah',                     city: 'Madinah', country: 'SA', distance_haram_m: 150, stars: 5, priority: 1, notes: '672 rooms. Peak rate ~SAR 2,000.' },
  { hotel_name: 'Mövenpick Hotel Madinah',                  city: 'Madinah', country: 'SA', distance_haram_m: 180, stars: 5, priority: 1, notes: '548 rooms. Peak rate ~SAR 2,000.' },
  { hotel_name: 'Marriott Madinah',                         city: 'Madinah', country: 'SA', distance_haram_m: 280, stars: 5, priority: 1, notes: '400 rooms. Peak rate ~SAR 2,000.' },
  { hotel_name: 'Hilton Madinah',                           city: 'Madinah', country: 'SA', distance_haram_m: 200, stars: 5, priority: 1, notes: '1,544 rooms. Peak rate ~SAR 2,100.' },
  { hotel_name: 'Intercontinental Dar Al Hijra Madinah',    city: 'Madinah', country: 'SA', distance_haram_m: 250, stars: 5, priority: 1, notes: '800 rooms. Peak rate ~SAR 1,900.' },
  { hotel_name: 'Oberoi Madinah',                           city: 'Madinah', country: 'SA', distance_haram_m: 400, stars: 5, priority: 1, notes: 'At Haramain Station. 252 rooms. Ultra-luxury. Peak rate ~SAR 3,500.' },
];

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_hotel_partners (
      id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      hotel_name       TEXT        NOT NULL,
      city             TEXT,
      country          CHAR(2),
      distance_haram_m INTEGER,
      stars            SMALLINT,
      contact_name     TEXT,
      contact_email    TEXT,
      outreach_status  TEXT        NOT NULL DEFAULT 'not_contacted'
                                   CHECK (outreach_status IN
                                     ('not_contacted','emailed','replied','meeting_scheduled','signed','live','rejected')),
      priority         SMALLINT    NOT NULL DEFAULT 3,
      last_contacted_at DATE,
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_hp_activities (
      id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      partner_id    UUID        NOT NULL REFERENCES crm_hotel_partners(id) ON DELETE CASCADE,
      type          TEXT        NOT NULL DEFAULT 'note'
                                CHECK (type IN ('call','email','meeting','follow_up','note','signed','rejected')),
      summary       TEXT        NOT NULL,
      performed_by  TEXT,
      performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const h of HOTEL_PARTNERS_SEED) {
    await pool.query(
      `INSERT INTO crm_hotel_partners
         (hotel_name, city, country, distance_haram_m, stars, outreach_status, priority, notes)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8
       WHERE NOT EXISTS (SELECT 1 FROM crm_hotel_partners WHERE hotel_name = $1)`,
      [h.hotel_name, h.city, h.country, h.distance_haram_m, h.stars, 'not_contacted', h.priority, h.notes],
    );
  }
  console.log('[sales/partners] bootstrap complete');
}
bootstrap().catch((err) => console.error('[sales/partners] bootstrap error:', err.message));

// ── GET /api/sales/hotel-partners ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (status && VALID_HP_STATUSES.has(status)) { conditions.push(`outreach_status = $${idx++}`); values.push(status); }
  if (search) {
    conditions.push(`(hotel_name ILIKE $${idx} OR city ILIKE $${idx} OR contact_name ILIKE $${idx})`);
    values.push(`%${search}%`); idx++;
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT * FROM crm_hotel_partners ${where}
          ORDER BY
            CASE outreach_status
              WHEN 'meeting_scheduled' THEN 1 WHEN 'replied' THEN 2 WHEN 'emailed' THEN 3
              WHEN 'not_contacted'     THEN 4 WHEN 'signed'  THEN 5 WHEN 'live'    THEN 6
              WHEN 'rejected'          THEN 7 ELSE 8
            END,
            distance_haram_m ASC NULLS LAST
          LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, lim, off],
      ),
      pool.query(`SELECT COUNT(*) FROM crm_hotel_partners ${where}`, values),
    ]);
    res.json({ data: rows.rows, total: parseInt(total.rows[0].count), page: parseInt(page, 10), limit: lim });
  } catch (err) {
    console.error('[sales/hotel-partners GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/hotel-partners ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { hotel_name, city, country, distance_haram_m, stars,
          contact_name, contact_email, outreach_status = 'not_contacted',
          priority = 3, notes } = req.body ?? {};

  if (!hotel_name) return res.status(400).json({ error: 'hotel_name required' });
  if (!VALID_HP_STATUSES.has(outreach_status)) return res.status(400).json({ error: 'invalid outreach_status' });
  const p = Math.min(Math.max(parseInt(priority, 10) || 3, 1), 3);

  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_hotel_partners
         (hotel_name, city, country, distance_haram_m, stars, contact_name, contact_email, outreach_status, priority, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [hotel_name, city ?? null, country ?? null, distance_haram_m ?? null, stars ?? null,
       contact_name ?? null, contact_email ?? null, outreach_status, p, notes ?? null],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/hotel-partners POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/hotel-partners/export.csv ──────────────────────────────────
router.get('/export.csv', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, hotel_name, city, country, distance_haram_m, stars, priority,
             contact_name, contact_email, outreach_status, last_contacted_at,
             notes, created_at, updated_at
      FROM crm_hotel_partners
      ORDER BY priority ASC, distance_haram_m ASC NULLS LAST
    `);

    const headers = ['id','hotel_name','city','country','distance_haram_m','stars','priority',
                     'contact_name','contact_email','outreach_status','last_contacted_at','notes','created_at','updated_at'];
    const escape  = v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hotel-partners-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[sales/hotel-partners/export.csv]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /api/sales/hotel-partners/:id ───────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const allowed = ['hotel_name','city','country','distance_haram_m','stars',
                   'contact_name','contact_email','outreach_status','priority','last_contacted_at','notes'];
  const updates = {};
  for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields' });
  if (updates.outreach_status && !VALID_HP_STATUSES.has(updates.outreach_status)) {
    return res.status(400).json({ error: 'invalid outreach_status' });
  }
  if (updates.outreach_status && CONTACTED_STATUSES.has(updates.outreach_status) && !('last_contacted_at' in updates)) {
    updates.last_contacted_at = new Date().toISOString().slice(0, 10);
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  setClauses.push('updated_at = NOW()');

  try {
    const { rows } = await pool.query(
      `UPDATE crm_hotel_partners SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [req.params.id, ...Object.values(updates)],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/hotel-partners/:id PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/sales/hotel-partners/:id ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM crm_hotel_partners WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    console.error('[sales/hotel-partners/:id DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/hotel-partners/:id/activities ──────────────────────────────
router.get('/:id/activities', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_hp_activities WHERE partner_id = $1 ORDER BY performed_at DESC LIMIT $2`,
      [req.params.id, limit],
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[sales/hp-activities GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/hotel-partners/:id/activities ─────────────────────────────
router.post('/:id/activities', async (req, res) => {
  const { type = 'note', summary, performed_by, performed_at } = req.body ?? {};
  if (!summary) return res.status(400).json({ error: 'summary required' });
  if (!VALID_HP_ACT_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_hp_activities (partner_id, type, summary, performed_by, performed_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, type, summary, performed_by ?? null, performed_at ? new Date(performed_at) : new Date()],
    );
    await pool.query('UPDATE crm_hotel_partners SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[sales/hp-activities POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
