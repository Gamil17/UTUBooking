'use strict';

const wf = require('../lib/workflow-client');

/**
 * CRM — Admin Routes
 *
 * DEALS
 * GET    /api/admin/crm/deals                           list (filter: stage, type, search, deal_owner, page, limit)
 * POST   /api/admin/crm/deals                           create deal
 * GET    /api/admin/crm/deals/:id                       single deal + contacts + recent activities
 * PATCH  /api/admin/crm/deals/:id                       update deal (auto-logs stage changes)
 * DELETE /api/admin/crm/deals/:id                       delete deal
 * GET    /api/admin/crm/deals/export.csv                CSV download of all deals
 *
 * CONTACTS
 * GET    /api/admin/crm/deals/:id/contacts              list contacts for deal
 * POST   /api/admin/crm/deals/:id/contacts              add contact (name, title, email, phone, linkedin_url)
 * DELETE /api/admin/crm/contacts/:contactId             remove contact
 *
 * ACTIVITIES
 * GET    /api/admin/crm/deals/:id/activities            list activities for deal
 * POST   /api/admin/crm/deals/:id/activities            log activity
 *
 * HOTEL PARTNERS
 * GET    /api/admin/crm/hotel-partners                  list (filter: status, search, priority, city, page, limit)
 * POST   /api/admin/crm/hotel-partners                  create (includes priority)
 * PATCH  /api/admin/crm/hotel-partners/:id              update (auto-sets last_contacted_at on status advance)
 * DELETE /api/admin/crm/hotel-partners/:id              hard delete
 * GET    /api/admin/crm/hotel-partners/export.csv       CSV download of all hotel partners
 * GET    /api/admin/crm/hotel-partners/:id/activities   list HP activity log
 * POST   /api/admin/crm/hotel-partners/:id/activities   log HP activity
 *
 * STATS & MONITORING
 * GET    /api/admin/crm/stats                           pipeline KPIs, stage map, HP status map
 * GET    /api/admin/crm/overdue                         deals with overdue next_action_date
 *
 * Authorization: Bearer <ADMIN_SECRET>
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');

const router = Router();
router.use(adminAuth);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// ── Seed data — B2B deals + investor pipeline ────────────────────────────────
const DEALS_SEED = [
  {
    title:               'Accor Group KSA — Hotel Inventory Partnership',
    partner_name:        'Accor Group KSA',
    partner_country:     'SA',
    deal_type:           'hotel_partner',
    stage:               'proposal',
    value_amount:        3600000,
    value_currency:      'SAR',
    deal_owner:          'CEO',
    ceo_review_required: true,
    proposal_file_path:  'sales/proposals/accor-group-ksa-2026/PROPOSAL-EN-Accor-Group-KSA-UTUBooking-Partnership.md',
    notes:               '920 rooms across Sofitel Makkah, Novotel Madinah, Mercure Jeddah. Commission 7% bundle. White-label option SAR 75K setup + 60K/yr. Annual GBV SAR 51.5M.',
    next_action:         'CEO sign-off → identify Accor KSA regional VP → send bilingual proposal',
    next_action_date:    '2026-04-20',
  },
  {
    title:               'Jordan Hotel Partner Network',
    partner_name:        'Jordan Tourism Board / Local Hotels',
    partner_country:     'JO',
    deal_type:           'hotel_partner',
    stage:               'lead',
    value_amount:        null,
    value_currency:      'USD',
    deal_owner:          'Sales Team',
    ceo_review_required: false,
    proposal_file_path:  'sales/jordan/partner-proposal.md',
    notes:               'Amman + Aqaba + Petra hotel pipeline. Gateway market for Gulf travelers.',
    next_action:         'Identify top 10 Amman hotels to target. Prepare outreach.',
    next_action_date:    '2026-04-25',
  },
  {
    title:               'North Africa Market Expansion (Morocco + Egypt)',
    partner_name:        'North Africa Hotel Partners',
    partner_country:     'MA',
    deal_type:           'hotel_partner',
    stage:               'lead',
    value_amount:        null,
    value_currency:      'USD',
    deal_owner:          'Sales Team',
    ceo_review_required: false,
    proposal_file_path:  'sales/north-africa/partner-proposal.md',
    notes:               'Casablanca, Marrakech, Cairo, Sharm El-Sheikh. Large diaspora Muslim traveler market.',
    next_action:         'Finalise Morocco outreach list. Review Morocco proposal.',
    next_action_date:    '2026-04-28',
  },
  {
    title:               'Series B — Institutional Investor Round',
    partner_name:        'TBD — Gulf/GCC VCs',
    partner_country:     'SA',
    deal_type:           'investor',
    stage:               'lead',
    value_amount:        15000000,
    value_currency:      'USD',
    deal_owner:          'CEO',
    ceo_review_required: true,
    proposal_file_path:  'sales/series-b/pitch-deck-narrative.md',
    notes:               'USD 15M Series B target. Materials in sales/series-b/. VC outreach emails ready. Focus on Gulf-based funds with travel/fintech thesis.',
    next_action:         "CEO finalise pitch deck. Identify warm intros to STV, Wa'ed, Raed Ventures.",
    next_action_date:    '2026-04-18',
  },
  {
    title:               'Gulf Bank Travel Rewards — White-Label SDK',
    partner_name:        'Gulf Bank Kuwait',
    partner_country:     'KW',
    deal_type:           'b2b_whitelabel',
    stage:               'proposal',
    value_amount:        180000,
    value_currency:      'KWD',
    deal_owner:          'CEO',
    ceo_review_required: true,
    proposal_file_path:  'sales/b2b/gulf-bank-kuwait-proposal.md',
    notes:               'SDK + API co-brand model. Next: Demo with Digital Banking + IT team.',
    next_action:         'Send outreach email after CEO sign-off',
    next_action_date:    '2026-04-22',
  },
  {
    title:               'Saudi Airlines (Saudia) — Embedded Widget + API',
    partner_name:        'Saudi Arabian Airlines (Saudia)',
    partner_country:     'SA',
    deal_type:           'b2b_whitelabel',
    stage:               'proposal',
    value_amount:        4200000,
    value_currency:      'SAR',
    deal_owner:          'CEO',
    ceo_review_required: true,
    proposal_file_path:  'sales/b2b/saudia-sv-ancillary-proposal.md',
    notes:               'Zero upfront cost model — easiest to close. Highest strategic value. April 10 deadline passed — follow up urgently.',
    next_action:         'Identify warm intro via GACA or board contact. CEO review required.',
    next_action_date:    '2026-04-14',
  },
  {
    title:               'Careem Super App — Full API White-Label',
    partner_name:        'Careem (Uber)',
    partner_country:     'AE',
    deal_type:           'b2b_whitelabel',
    stage:               'proposal',
    value_amount:        2400000,
    value_currency:      'USD',
    deal_owner:          'CEO',
    ceo_review_required: true,
    proposal_file_path:  'sales/b2b/careem-superapp-proposal.md',
    notes:               'Exclusivity clause requires CEO strategic approval before offering. Identify VP Travel contact.',
    next_action:         'CEO decide on exclusivity option. Find warm VC intro.',
    next_action_date:    '2026-05-02',
  },
  {
    title:               'Morocco Hotel Partner Network',
    partner_name:        'Morocco Tourism / Local Hotels',
    partner_country:     'MA',
    deal_type:           'hotel_partner',
    stage:               'lead',
    value_amount:        null,
    value_currency:      'USD',
    deal_owner:          'Sales Team',
    ceo_review_required: false,
    proposal_file_path:  'sales/morocco/partner-proposal.md',
    notes:               'Casablanca, Marrakech, Fes, Agadir. Large Gulf traveler market. Proposal ready in sales/morocco/.',
    next_action:         'Send partner-proposal.md to top 5 Marrakech hotels. Map visa requirements.',
    next_action_date:    '2026-04-30',
  },
  {
    title:               'Series A — Institutional Round (Closed)',
    partner_name:        'Series A Investors',
    partner_country:     'SA',
    deal_type:           'investor',
    stage:               'won',
    value_amount:        3000000,
    value_currency:      'USD',
    deal_owner:          'CEO',
    ceo_review_required: false,
    proposal_file_path:  'sales/series-a/pitch-deck-narrative.md',
    notes:               'USD 3M Series A. Closed. Full materials in sales/series-a/ — use for Series B due diligence reference.',
    next_action:         null,
    next_action_date:    null,
  },
  {
    title:               'Gulf VC Warm Outreach — Investor Relations',
    partner_name:        "Gulf VC Ecosystem (STV, Wa'ed, Raed, Nuwa)",
    partner_country:     'SA',
    deal_type:           'investor',
    stage:               'lead',
    value_amount:        null,
    value_currency:      'USD',
    deal_owner:          'CEO',
    ceo_review_required: true,
    proposal_file_path:  'sales/investor-materials/COLD-EMAIL-SEQUENCE-Gulf-VCs.md',
    notes:               'Outreach campaign materials ready in sales/investor-materials/. Company overview, tech arch brief, financial model, scalability brief all prepared.',
    next_action:         "CEO identify warm intros. Personalise cold email templates before sending.",
    next_action_date:    '2026-04-16',
  },
];

// ── P1 Haram-zone hotels seed (top 20 Makkah + 10 Madinah) ──────────────────
const HOTEL_PARTNERS_SEED = [
  // Makkah — P1
  { hotel_name: 'Fairmont Makkah Clock Royal Tower',         city: 'Makkah',  country: 'SA', distance_haram_m: 50,  stars: 5, priority: 1, notes: 'Abraj Al-Bait complex. 858 rooms. Peak rate ~SAR 4,500.' },
  { hotel_name: 'Raffles Makkah Palace',                     city: 'Makkah',  country: 'SA', distance_haram_m: 80,  stars: 5, priority: 1, notes: '214 rooms. Ultra-luxury. Peak rate ~SAR 5,200.' },
  { hotel_name: 'Swissôtel Al Maqam Makkah',                 city: 'Makkah',  country: 'SA', distance_haram_m: 80,  stars: 5, priority: 1, notes: '1,490 rooms. Abraj tower. Peak rate ~SAR 3,800.' },
  { hotel_name: 'Pullman Zamzam Makkah',                     city: 'Makkah',  country: 'SA', distance_haram_m: 80,  stars: 5, priority: 1, notes: '750 rooms. Peak rate ~SAR 3,600.' },
  { hotel_name: 'Hyatt Regency Makkah Jabal Omar',           city: 'Makkah',  country: 'SA', distance_haram_m: 120, stars: 5, priority: 1, notes: '674 rooms. Jabal Omar complex. Peak rate ~SAR 3,200.' },
  { hotel_name: 'Anantara Jabal Omar Makkah Resort',         city: 'Makkah',  country: 'SA', distance_haram_m: 130, stars: 5, priority: 1, notes: '375 rooms. Peak rate ~SAR 4,200.' },
  { hotel_name: 'Jabal Omar Marriott Hotel Makkah',          city: 'Makkah',  country: 'SA', distance_haram_m: 140, stars: 5, priority: 1, notes: '967 rooms. Peak rate ~SAR 3,100.' },
  { hotel_name: 'Kempinski Hotel Jabal Omar Makkah',         city: 'Makkah',  country: 'SA', distance_haram_m: 120, stars: 5, priority: 1, notes: '1,440 rooms. Peak rate ~SAR 3,800.' },
  { hotel_name: 'Marriott Makkah Hotel',                     city: 'Makkah',  country: 'SA', distance_haram_m: 150, stars: 5, priority: 1, notes: '568 rooms. Peak rate ~SAR 3,000.' },
  { hotel_name: 'Shaza Makkah',                              city: 'Makkah',  country: 'SA', distance_haram_m: 160, stars: 5, priority: 1, notes: '288 rooms. Boutique luxury. Peak rate ~SAR 3,400.' },
  { hotel_name: 'Conrad Makkah',                             city: 'Makkah',  country: 'SA', distance_haram_m: 160, stars: 5, priority: 1, notes: '1,365 rooms. Peak rate ~SAR 3,500.' },
  { hotel_name: 'Makkah Hilton Hotel Towers',                city: 'Makkah',  country: 'SA', distance_haram_m: 180, stars: 5, priority: 1, notes: '2,080 rooms. Large inventory. Peak rate ~SAR 2,500.' },
  { hotel_name: 'Al Marwa Rayhaan by Rotana',                city: 'Makkah',  country: 'SA', distance_haram_m: 200, stars: 5, priority: 1, notes: '868 rooms. Peak rate ~SAR 2,600.' },
  { hotel_name: 'Hilton Suites Makkah',                      city: 'Makkah',  country: 'SA', distance_haram_m: 200, stars: 5, priority: 1, notes: '1,529 rooms. Peak rate ~SAR 2,800.' },
  { hotel_name: 'InterContinental Dar Al Hijra Makkah',      city: 'Makkah',  country: 'SA', distance_haram_m: 220, stars: 5, priority: 1, notes: '1,400 rooms. Peak rate ~SAR 2,600.' },
  { hotel_name: 'Grand Millennium Makkah',                   city: 'Makkah',  country: 'SA', distance_haram_m: 250, stars: 5, priority: 1, notes: '1,490 rooms. Peak rate ~SAR 2,600.' },
  { hotel_name: 'Sheraton Makkah Jabal Al Kaaba',            city: 'Makkah',  country: 'SA', distance_haram_m: 300, stars: 5, priority: 1, notes: '603 rooms. Peak rate ~SAR 2,800.' },
  { hotel_name: 'Mövenpick Hotel & Residences Hajar Tower',  city: 'Makkah',  country: 'SA', distance_haram_m: 100, stars: 5, priority: 1, notes: '876 rooms. Peak rate ~SAR 3,200.' },
  { hotel_name: 'Dar Al Tawhid Intercontinental',            city: 'Makkah',  country: 'SA', distance_haram_m: 100, stars: 5, priority: 1, notes: '1,480 rooms. Peak rate ~SAR 3,000.' },
  { hotel_name: 'Makkah Towers Oberoi',                      city: 'Makkah',  country: 'SA', distance_haram_m: 90,  stars: 5, priority: 1, notes: '652 rooms. Peak rate ~SAR 4,000.' },
  // Madinah — P1
  { hotel_name: 'Anwar Al Madinah Mövenpick Hotel',          city: 'Madinah', country: 'SA', distance_haram_m: 50,  stars: 5, priority: 1, notes: '2,033 rooms. Closest 5★ to Masjid Al-Nabawi. Peak rate ~SAR 2,400.' },
  { hotel_name: 'Swissôtel Al Maqam Madinah',                city: 'Madinah', country: 'SA', distance_haram_m: 120, stars: 5, priority: 1, notes: '700 rooms. Peak rate ~SAR 2,300.' },
  { hotel_name: 'Pullman ZamZam Madinah',                    city: 'Madinah', country: 'SA', distance_haram_m: 100, stars: 5, priority: 1, notes: '694 rooms. Peak rate ~SAR 2,200.' },
  { hotel_name: 'Sheraton Al Madinah',                       city: 'Madinah', country: 'SA', distance_haram_m: 180, stars: 5, priority: 1, notes: '592 rooms. Peak rate ~SAR 2,200.' },
  { hotel_name: 'Crowne Plaza Madinah',                      city: 'Madinah', country: 'SA', distance_haram_m: 150, stars: 5, priority: 1, notes: '672 rooms. Peak rate ~SAR 2,000.' },
  { hotel_name: 'Mövenpick Hotel Madinah',                   city: 'Madinah', country: 'SA', distance_haram_m: 180, stars: 5, priority: 1, notes: '548 rooms. Peak rate ~SAR 2,000.' },
  { hotel_name: 'Marriott Madinah',                          city: 'Madinah', country: 'SA', distance_haram_m: 280, stars: 5, priority: 1, notes: '400 rooms. Peak rate ~SAR 2,000.' },
  { hotel_name: 'Hilton Madinah',                            city: 'Madinah', country: 'SA', distance_haram_m: 200, stars: 5, priority: 1, notes: '1,544 rooms. Largest in Madinah. Peak rate ~SAR 2,100.' },
  { hotel_name: 'Intercontinental Dar Al Hijra Madinah',     city: 'Madinah', country: 'SA', distance_haram_m: 250, stars: 5, priority: 1, notes: '800 rooms. Peak rate ~SAR 1,900.' },
  { hotel_name: 'Oberoi Madinah',                            city: 'Madinah', country: 'SA', distance_haram_m: 400, stars: 5, priority: 1, notes: 'At Haramain Station. 252 rooms. Ultra-luxury. Peak rate ~SAR 3,500.' },
];

// ── Bootstrap tables + seed ───────────────────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_deals (
      id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      title               TEXT        NOT NULL,
      partner_name        TEXT        NOT NULL,
      partner_country     CHAR(2),
      deal_type           TEXT        NOT NULL DEFAULT 'b2b_whitelabel'
                                      CHECK (deal_type IN ('b2b_whitelabel','hotel_partner','airline','investor','other')),
      stage               TEXT        NOT NULL DEFAULT 'lead'
                                      CHECK (stage IN ('lead','qualified','demo','proposal','negotiation','won','lost')),
      value_amount        NUMERIC(18,2),
      value_currency      CHAR(3)     DEFAULT 'SAR',
      deal_owner          TEXT,
      ceo_review_required BOOLEAN     NOT NULL DEFAULT FALSE,
      ceo_approved_at     TIMESTAMPTZ,
      ceo_approved_by     TEXT,
      proposal_file_path  TEXT,
      notes               TEXT,
      next_action         TEXT,
      next_action_date    DATE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      deal_id      UUID        NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
      name         TEXT        NOT NULL,
      title        TEXT,
      email        TEXT,
      phone        TEXT,
      linkedin_url TEXT,
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      deal_id       UUID        NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
      type          TEXT        NOT NULL DEFAULT 'note'
                                CHECK (type IN ('call','email','demo','meeting','proposal_sent','follow_up','note','won','lost')),
      summary       TEXT        NOT NULL,
      performed_by  TEXT,
      performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Idempotent column addition for deals
  await pool.query(`ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS expected_close_date DATE`).catch(() => {});

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
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Idempotent column additions for hotel_partners (must run AFTER CREATE TABLE)
  await pool.query(`ALTER TABLE crm_hotel_partners ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 3`).catch(() => {});
  await pool.query(`ALTER TABLE crm_hotel_partners ADD COLUMN IF NOT EXISTS last_contacted_at DATE`).catch(() => {});

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

  // Upsert deals by title (idempotent — safe to re-run)
  for (const d of DEALS_SEED) {
    await pool.query(
      `INSERT INTO crm_deals
         (title, partner_name, partner_country, deal_type, stage,
          value_amount, value_currency, deal_owner, ceo_review_required,
          proposal_file_path, notes, next_action, next_action_date)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
       WHERE NOT EXISTS (SELECT 1 FROM crm_deals WHERE title = $1)`,
      [d.title, d.partner_name, d.partner_country, d.deal_type, d.stage,
       d.value_amount, d.value_currency, d.deal_owner, d.ceo_review_required,
       d.proposal_file_path, d.notes, d.next_action, d.next_action_date],
    );
  }

  // Upsert P1 Haram-zone hotel partners (idempotent)
  for (const h of HOTEL_PARTNERS_SEED) {
    await pool.query(
      `INSERT INTO crm_hotel_partners
         (hotel_name, city, country, distance_haram_m, stars, outreach_status, priority, notes)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8
       WHERE NOT EXISTS (SELECT 1 FROM crm_hotel_partners WHERE hotel_name = $1)`,
      [h.hotel_name, h.city, h.country, h.distance_haram_m, h.stars, 'not_contacted', h.priority, h.notes],
    );
  }
  console.log('[crm] bootstrap complete');
}
bootstrap().catch((err) => console.error('[crm] bootstrap error:', err.message));

// ── Helpers ───────────────────────────────────────────────────────────────────
const VALID_STAGES     = new Set(['lead','qualified','demo','proposal','negotiation','won','lost']);
const VALID_TYPES      = new Set(['b2b_whitelabel','hotel_partner','airline','investor','other']);
const VALID_ACT_TYPES  = new Set(['call','email','demo','meeting','proposal_sent','follow_up','note','won','lost']);
const VALID_HP_STATUSES = new Set(['not_contacted','emailed','replied','meeting_scheduled','signed','live','rejected']);

// ── GET /api/admin/crm/deals ──────────────────────────────────────────────────
router.get('/deals', async (req, res) => {
  const { stage, type, search, deal_owner, page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (stage      && VALID_STAGES.has(stage)) { conditions.push(`d.stage = $${idx++}`);       values.push(stage); }
  if (type       && VALID_TYPES.has(type))   { conditions.push(`d.deal_type = $${idx++}`);    values.push(type); }
  if (deal_owner) { conditions.push(`d.deal_owner ILIKE $${idx++}`);  values.push(deal_owner); }
  if (search) {
    conditions.push(`(d.title ILIKE $${idx} OR d.partner_name ILIKE $${idx})`);
    values.push(`%${search}%`); idx++;
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT d.*,
                (SELECT COUNT(*) FROM crm_contacts  c WHERE c.deal_id = d.id) AS contact_count,
                (SELECT COUNT(*) FROM crm_activities a WHERE a.deal_id = d.id) AS activity_count
           FROM crm_deals d ${where}
          ORDER BY
            CASE d.stage
              WHEN 'negotiation' THEN 1 WHEN 'proposal' THEN 2 WHEN 'demo' THEN 3
              WHEN 'qualified'   THEN 4 WHEN 'lead'     THEN 5 WHEN 'won'  THEN 6
              WHEN 'lost'        THEN 7 ELSE 8
            END,
            d.value_amount DESC NULLS LAST
          LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, lim, off],
      ),
      pool.query(`SELECT COUNT(*) FROM crm_deals d ${where}`, values),
    ]);
    res.json({ data: rows.rows, total: parseInt(total.rows[0].count), page: parseInt(page, 10), limit: lim });
  } catch (err) {
    console.error('[crm/deals GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/crm/deals ─────────────────────────────────────────────────
router.post('/deals', async (req, res) => {
  const {
    title, partner_name, partner_country, deal_type = 'b2b_whitelabel',
    stage = 'lead', value_amount, value_currency = 'SAR', deal_owner,
    ceo_review_required = false, proposal_file_path, notes, next_action, next_action_date,
  } = req.body ?? {};

  if (!title || !partner_name) return res.status(400).json({ error: 'title and partner_name required' });
  if (!VALID_STAGES.has(stage)) return res.status(400).json({ error: 'invalid stage' });
  if (!VALID_TYPES.has(deal_type)) return res.status(400).json({ error: 'invalid deal_type' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_deals
         (title, partner_name, partner_country, deal_type, stage,
          value_amount, value_currency, deal_owner, ceo_review_required,
          proposal_file_path, notes, next_action, next_action_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [title, partner_name, partner_country ?? null, deal_type, stage,
       value_amount ?? null, value_currency, deal_owner ?? null, ceo_review_required,
       proposal_file_path ?? null, notes ?? null, next_action ?? null, next_action_date ?? null],
    );
    const deal = rows[0];

    // ── Launch deal approval workflow when CEO review is flagged ──────────────
    if (ceo_review_required) {
      wf.launch({
        triggerEvent:   'deal_stage_changed',
        triggerRef:     deal.id,
        triggerRefType: 'crm_deal',
        initiatedBy:    req.user?.email ?? deal_owner ?? 'admin',
        context: {
          title,
          partner_name,
          deal_type,
          stage,
          value_amount:    value_amount ?? null,
          value_currency,
          ceo_review_required: true,
        },
      });
    }

    res.status(201).json({ data: deal });
  } catch (err) {
    console.error('[crm/deals POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/deals/:id ──────────────────────────────────────────────
router.get('/deals/:id', async (req, res) => {
  try {
    const [deal, contacts, activities] = await Promise.all([
      pool.query('SELECT * FROM crm_deals WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM crm_contacts WHERE deal_id = $1 ORDER BY created_at ASC', [req.params.id]),
      pool.query('SELECT * FROM crm_activities WHERE deal_id = $1 ORDER BY performed_at DESC LIMIT 20', [req.params.id]),
    ]);
    if (!deal.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { ...deal.rows[0], contacts: contacts.rows, activities: activities.rows } });
  } catch (err) {
    console.error('[crm/deals/:id GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /api/admin/crm/deals/:id ───────────────────────────────────────────
router.patch('/deals/:id', async (req, res) => {
  const allowed = ['title','partner_name','partner_country','deal_type','stage',
                   'value_amount','value_currency','deal_owner','ceo_review_required',
                   'ceo_approved_at','ceo_approved_by','proposal_file_path',
                   'notes','next_action','next_action_date','expected_close_date'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields' });
  if (updates.stage    && !VALID_STAGES.has(updates.stage))    return res.status(400).json({ error: 'invalid stage' });
  if (updates.deal_type && !VALID_TYPES.has(updates.deal_type)) return res.status(400).json({ error: 'invalid deal_type' });

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  setClauses.push('updated_at = NOW()');

  try {
    // Fetch current stage before update (for auto-log)
    const prev = updates.stage
      ? await pool.query('SELECT stage FROM crm_deals WHERE id = $1', [req.params.id])
      : null;

    const { rows } = await pool.query(
      `UPDATE crm_deals SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [req.params.id, ...Object.values(updates)],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // Auto-log stage change to activities
    if (updates.stage && prev?.rows[0] && prev.rows[0].stage !== updates.stage) {
      await pool.query(
        `INSERT INTO crm_activities (deal_id, type, summary, performed_by)
         VALUES ($1, 'note', $2, 'System')`,
        [req.params.id, `Stage changed: ${prev.rows[0].stage} → ${updates.stage}`],
      ).catch(err => console.error('[crm] auto-log stage change failed:', err.message));
    }

    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[crm/deals/:id PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/admin/crm/deals/:id ──────────────────────────────────────────
router.delete('/deals/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM crm_deals WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/deals/:id/contacts ─────────────────────────────────────
router.get('/deals/:id/contacts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM crm_contacts WHERE deal_id = $1 ORDER BY created_at ASC',
      [req.params.id],
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/crm/deals/:id/contacts ────────────────────────────────────
router.post('/deals/:id/contacts', async (req, res) => {
  const { name, title, email, phone, linkedin_url, notes } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_contacts (deal_id, name, title, email, phone, linkedin_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, name, title ?? null, email ?? null, phone ?? null, linkedin_url ?? null, notes ?? null],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[crm/contacts POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/admin/crm/contacts/:contactId ─────────────────────────────────
router.delete('/contacts/:contactId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM crm_contacts WHERE id = $1 RETURNING id',
      [req.params.contactId],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/deals/:id/activities ───────────────────────────────────
router.get('/deals/:id/activities', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? 50, 10), 100);
  try {
    const { rows } = await pool.query(
      'SELECT * FROM crm_activities WHERE deal_id = $1 ORDER BY performed_at DESC LIMIT $2',
      [req.params.id, limit],
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/crm/deals/:id/activities ──────────────────────────────────
router.post('/deals/:id/activities', async (req, res) => {
  const { type = 'note', summary, performed_by, performed_at } = req.body ?? {};
  if (!summary) return res.status(400).json({ error: 'summary required' });
  if (!VALID_ACT_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_activities (deal_id, type, summary, performed_by, performed_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, type, summary, performed_by ?? null, performed_at ? new Date(performed_at) : new Date()],
    );
    // Also update deal updated_at
    await pool.query('UPDATE crm_deals SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[crm/activities POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/hotel-partners ────────────────────────────────────────
router.get('/hotel-partners', async (req, res) => {
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
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/crm/hotel-partners ───────────────────────────────────────
router.post('/hotel-partners', async (req, res) => {
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
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// Statuses that count as "contacted" — auto-set last_contacted_at
const CONTACTED_STATUSES = new Set(['emailed','replied','meeting_scheduled','signed','live']);

// ── PATCH /api/admin/crm/hotel-partners/:id ───────────────────────────────────
router.patch('/hotel-partners/:id', async (req, res) => {
  const allowed = ['hotel_name','city','country','distance_haram_m','stars',
                   'contact_name','contact_email','outreach_status','priority',
                   'last_contacted_at','notes'];
  const updates = {};
  for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields' });
  if (updates.outreach_status && !VALID_HP_STATUSES.has(updates.outreach_status)) {
    return res.status(400).json({ error: 'invalid outreach_status' });
  }

  // Auto-set last_contacted_at when status advances to a "contacted" state
  if (updates.outreach_status && CONTACTED_STATUSES.has(updates.outreach_status) && !('last_contacted_at' in updates)) {
    updates.last_contacted_at = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/admin/crm/hotel-partners/:id ──────────────────────────────────
router.delete('/hotel-partners/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM crm_hotel_partners WHERE id = $1 RETURNING id',
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    console.error('[crm/hotel-partners/:id DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── SAR conversion rates (mid-market approximations) ─────────────────────────
const TO_SAR = { SAR: 1, AED: 1.02, USD: 3.75, EUR: 4.10, GBP: 4.80, KWD: 12.20, BHD: 9.95, OMR: 9.74, QAR: 1.03 };

function toSAR(amount, currency) {
  return Number(amount ?? 0) * (TO_SAR[currency] ?? 1);
}

// ── GET /api/admin/crm/stats ──────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [pipeline, byStage, ceoQ, wonQ, overdueQ, hpQ] = await Promise.all([
      // All active deals with value for SAR conversion
      pool.query(`
        SELECT value_amount, value_currency
        FROM crm_deals
        WHERE stage NOT IN ('won','lost')
      `),
      // Count per stage
      pool.query(`
        SELECT stage, COUNT(*) AS count
        FROM crm_deals
        GROUP BY stage
      `),
      // CEO approvals pending
      pool.query(`
        SELECT COUNT(*) AS count
        FROM crm_deals
        WHERE ceo_review_required = true
          AND ceo_approved_at IS NULL
          AND stage NOT IN ('won','lost')
      `),
      // Won this calendar month
      pool.query(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(CASE
                 WHEN value_currency IS NOT NULL THEN value_amount
                 ELSE 0
               END), 0) AS raw_value,
               value_currency
        FROM crm_deals
        WHERE stage = 'won'
          AND updated_at >= date_trunc('month', NOW())
        GROUP BY value_currency
      `),
      // Overdue next actions
      pool.query(`
        SELECT COUNT(*) AS count
        FROM crm_deals
        WHERE next_action_date < CURRENT_DATE
          AND next_action_date IS NOT NULL
          AND stage NOT IN ('won','lost')
      `),
      // Hotel partner counts by status
      pool.query(`
        SELECT outreach_status, COUNT(*) AS count
        FROM crm_hotel_partners
        GROUP BY outreach_status
      `),
    ]);

    // SAR-equivalent pipeline total
    const pipeline_sar = pipeline.rows.reduce(
      (sum, r) => sum + toSAR(r.value_amount, r.value_currency), 0,
    );

    // Won this month SAR equivalent
    const won_sar = wonQ.rows.reduce(
      (sum, r) => sum + toSAR(r.raw_value, r.value_currency), 0,
    );

    // Stage distribution map
    const stages = {};
    for (const r of byStage.rows) stages[r.stage] = parseInt(r.count);

    // Hotel partner status map
    const hp_statuses = {};
    for (const r of hpQ.rows) hp_statuses[r.outreach_status] = parseInt(r.count);

    return res.json({
      data: {
        pipeline_sar:          Math.round(pipeline_sar),
        active_deals:          pipeline.rows.length,
        ceo_pending:           parseInt(ceoQ.rows[0].count),
        overdue_actions:       parseInt(overdueQ.rows[0].count),
        won_this_month_count:  wonQ.rows.reduce((s, r) => s + parseInt(r.count), 0),
        won_this_month_sar:    Math.round(won_sar),
        stages,
        hotel_partners:        hp_statuses,
      },
    });
  } catch (err) {
    console.error('[crm/stats GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/hotel-partners/:id/activities ─────────────────────────
router.get('/hotel-partners/:id/activities', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_hp_activities
       WHERE partner_id = $1
       ORDER BY performed_at DESC
       LIMIT $2`,
      [req.params.id, limit],
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[crm/hp-activities GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/admin/crm/hotel-partners/:id/activities ────────────────────────
const VALID_HP_ACT_TYPES = new Set(['call','email','meeting','follow_up','note','signed','rejected']);

router.post('/hotel-partners/:id/activities', async (req, res) => {
  const { type = 'note', summary, performed_by, performed_at } = req.body ?? {};
  if (!summary) return res.status(400).json({ error: 'summary required' });
  if (!VALID_HP_ACT_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_hp_activities (partner_id, type, summary, performed_by, performed_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, type, summary, performed_by ?? null, performed_at ? new Date(performed_at) : new Date()],
    );
    // Touch updated_at on the hotel partner
    await pool.query('UPDATE crm_hotel_partners SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[crm/hp-activities POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/deals/export.csv ──────────────────────────────────────
router.get('/deals/export.csv', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.title, d.partner_name, d.partner_country, d.deal_type,
             d.stage, d.value_amount, d.value_currency, d.deal_owner,
             d.ceo_review_required, d.ceo_approved_at, d.proposal_file_path,
             d.next_action, d.next_action_date, d.expected_close_date,
             d.notes, d.created_at, d.updated_at,
             (SELECT COUNT(*) FROM crm_activities a WHERE a.deal_id = d.id) AS activity_count
      FROM crm_deals d
      ORDER BY d.updated_at DESC
    `);

    const headers = ['id','title','partner_name','partner_country','deal_type','stage',
                     'value_amount','value_currency','deal_owner','ceo_review_required',
                     'ceo_approved_at','proposal_file_path','next_action','next_action_date',
                     'expected_close_date','notes','created_at','updated_at','activity_count'];

    const escape = v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="crm-deals-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[crm/deals/export.csv]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/hotel-partners/export.csv ──────────────────────────────
router.get('/hotel-partners/export.csv', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, hotel_name, city, country, distance_haram_m, stars, priority,
             contact_name, contact_email, outreach_status, last_contacted_at,
             notes, created_at, updated_at
      FROM crm_hotel_partners
      ORDER BY priority ASC, distance_haram_m ASC NULLS LAST
    `);

    const headers = ['id','hotel_name','city','country','distance_haram_m','stars','priority',
                     'contact_name','contact_email','outreach_status','last_contacted_at',
                     'notes','created_at','updated_at'];

    const escape = v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hotel-partners-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[crm/hotel-partners/export.csv]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/admin/crm/overdue ────────────────────────────────────────────────
router.get('/overdue', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.title, d.partner_name, d.stage, d.deal_owner,
             d.next_action, d.next_action_date, d.expected_close_date,
             d.value_amount, d.value_currency,
             (CURRENT_DATE - d.next_action_date) AS days_overdue
      FROM crm_deals d
      WHERE d.next_action_date < CURRENT_DATE
        AND d.next_action_date IS NOT NULL
        AND d.stage NOT IN ('won','lost')
      ORDER BY d.next_action_date ASC
      LIMIT $1
    `, [limit]);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('[crm/overdue GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
