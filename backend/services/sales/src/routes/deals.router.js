'use strict';

/**
 * Deals — Sales Service Routes
 *
 * GET    /api/sales/deals                  list (filter: stage, type, search, deal_owner, page, limit)
 * POST   /api/sales/deals                  create deal
 * GET    /api/sales/deals/:id              single deal + contacts + recent activities
 * PATCH  /api/sales/deals/:id              update deal (logs stage history + field changes)
 * DELETE /api/sales/deals/:id              delete deal
 * GET    /api/sales/deals/export.csv       CSV download
 * GET    /api/sales/deals/:id/changes      field-level audit trail
 */

const { Router } = require('express');
const salesAuth  = require('../middleware/salesAuth');
const { pool }   = require('../db/pg');

const router = Router();
router.use(salesAuth);

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_STAGES    = new Set(['lead','qualified','demo','proposal','negotiation','won','lost']);
const VALID_TYPES     = new Set(['b2b_whitelabel','hotel_partner','airline','investor','other']);
const STAGE_ORDER_MAP = { negotiation:1, proposal:2, demo:3, qualified:4, lead:5, won:6, lost:7 };

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEALS_SEED = [
  {
    title: 'Accor Group KSA — Hotel Inventory Partnership',
    partner_name: 'Accor Group KSA', partner_country: 'SA', deal_type: 'hotel_partner',
    stage: 'proposal', value_amount: 3600000, value_currency: 'SAR', deal_owner: 'CEO',
    ceo_review_required: true,
    proposal_file_path: 'sales/proposals/accor-group-ksa-2026/PROPOSAL-EN-Accor-Group-KSA-UTUBooking-Partnership.md',
    notes: '920 rooms across Sofitel Makkah, Novotel Madinah, Mercure Jeddah. Commission 7% bundle. Annual GBV SAR 51.5M.',
    next_action: 'CEO sign-off → identify Accor KSA regional VP → send bilingual proposal',
    next_action_date: '2026-04-20',
  },
  {
    title: 'Jordan Hotel Partner Network',
    partner_name: 'Jordan Tourism Board / Local Hotels', partner_country: 'JO', deal_type: 'hotel_partner',
    stage: 'lead', value_amount: null, value_currency: 'USD', deal_owner: 'Sales Team',
    ceo_review_required: false, proposal_file_path: 'sales/jordan/partner-proposal.md',
    notes: 'Amman + Aqaba + Petra hotel pipeline.',
    next_action: 'Identify top 10 Amman hotels to target.', next_action_date: '2026-04-25',
  },
  {
    title: 'North Africa Market Expansion (Morocco + Egypt)',
    partner_name: 'North Africa Hotel Partners', partner_country: 'MA', deal_type: 'hotel_partner',
    stage: 'lead', value_amount: null, value_currency: 'USD', deal_owner: 'Sales Team',
    ceo_review_required: false, proposal_file_path: 'sales/north-africa/partner-proposal.md',
    notes: 'Casablanca, Marrakech, Cairo, Sharm El-Sheikh.',
    next_action: 'Finalise Morocco outreach list.', next_action_date: '2026-04-28',
  },
  {
    title: 'Series B — Institutional Investor Round',
    partner_name: 'TBD — Gulf/GCC VCs', partner_country: 'SA', deal_type: 'investor',
    stage: 'lead', value_amount: 15000000, value_currency: 'USD', deal_owner: 'CEO',
    ceo_review_required: true, proposal_file_path: 'sales/series-b/pitch-deck-narrative.md',
    notes: 'USD 15M Series B target. Materials in sales/series-b/.',
    next_action: "CEO finalise pitch deck. Identify warm intros to STV, Wa'ed, Raed Ventures.",
    next_action_date: '2026-04-18',
  },
  {
    title: 'Gulf Bank Travel Rewards — White-Label SDK',
    partner_name: 'Gulf Bank Kuwait', partner_country: 'KW', deal_type: 'b2b_whitelabel',
    stage: 'proposal', value_amount: 180000, value_currency: 'KWD', deal_owner: 'CEO',
    ceo_review_required: true, proposal_file_path: 'sales/b2b/gulf-bank-kuwait-proposal.md',
    notes: 'SDK + API co-brand model.',
    next_action: 'Send outreach email after CEO sign-off', next_action_date: '2026-04-22',
  },
  {
    title: 'Saudi Airlines (Saudia) — Embedded Widget + API',
    partner_name: 'Saudi Arabian Airlines (Saudia)', partner_country: 'SA', deal_type: 'b2b_whitelabel',
    stage: 'proposal', value_amount: 4200000, value_currency: 'SAR', deal_owner: 'CEO',
    ceo_review_required: true, proposal_file_path: 'sales/b2b/saudia-sv-ancillary-proposal.md',
    notes: 'Zero upfront cost model — easiest to close. Highest strategic value.',
    next_action: 'Identify warm intro via GACA or board contact.', next_action_date: '2026-04-14',
  },
  {
    title: 'Careem Super App — Full API White-Label',
    partner_name: 'Careem (Uber)', partner_country: 'AE', deal_type: 'b2b_whitelabel',
    stage: 'proposal', value_amount: 2400000, value_currency: 'USD', deal_owner: 'CEO',
    ceo_review_required: true, proposal_file_path: 'sales/b2b/careem-superapp-proposal.md',
    notes: 'Exclusivity clause requires CEO strategic approval before offering.',
    next_action: 'CEO decide on exclusivity option.', next_action_date: '2026-05-02',
  },
  {
    title: 'Morocco Hotel Partner Network',
    partner_name: 'Morocco Tourism / Local Hotels', partner_country: 'MA', deal_type: 'hotel_partner',
    stage: 'lead', value_amount: null, value_currency: 'USD', deal_owner: 'Sales Team',
    ceo_review_required: false, proposal_file_path: 'sales/morocco/partner-proposal.md',
    notes: 'Casablanca, Marrakech, Fes, Agadir.',
    next_action: 'Send partner-proposal.md to top 5 Marrakech hotels.', next_action_date: '2026-04-30',
  },
  {
    title: 'Series A — Institutional Round (Closed)',
    partner_name: 'Series A Investors', partner_country: 'SA', deal_type: 'investor',
    stage: 'won', value_amount: 3000000, value_currency: 'USD', deal_owner: 'CEO',
    ceo_review_required: false, proposal_file_path: 'sales/series-a/pitch-deck-narrative.md',
    notes: 'USD 3M Series A. Closed.',
    next_action: null, next_action_date: null,
  },
  {
    title: 'Gulf VC Warm Outreach — Investor Relations',
    partner_name: "Gulf VC Ecosystem (STV, Wa'ed, Raed, Nuwa)", partner_country: 'SA', deal_type: 'investor',
    stage: 'lead', value_amount: null, value_currency: 'USD', deal_owner: 'CEO',
    ceo_review_required: true, proposal_file_path: 'sales/investor-materials/COLD-EMAIL-SEQUENCE-Gulf-VCs.md',
    notes: 'Outreach campaign materials ready.',
    next_action: 'CEO identify warm intros. Personalise cold email templates.',
    next_action_date: '2026-04-16',
  },
];

// ── Bootstrap ──────────────────────────────────────────────────────────────────
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
      expected_close_date DATE,
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

  // Stage history — one row per stage entry per deal
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_deal_stage_history (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      deal_id     UUID        NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
      stage       TEXT        NOT NULL,
      entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exited_at   TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_stage_history_deal ON crm_deal_stage_history(deal_id)
  `);

  // Field-level change audit log
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_deal_changes (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      deal_id     UUID        NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
      field       TEXT        NOT NULL,
      old_value   TEXT,
      new_value   TEXT,
      changed_by  TEXT,
      changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_deal_changes_deal ON crm_deal_changes(deal_id, changed_at DESC)
  `);

  // Backfill stage history for existing deals that have no history rows
  await pool.query(`
    INSERT INTO crm_deal_stage_history (deal_id, stage, entered_at)
    SELECT d.id, d.stage, d.created_at
    FROM crm_deals d
    WHERE NOT EXISTS (
      SELECT 1 FROM crm_deal_stage_history h WHERE h.deal_id = d.id
    )
  `);

  // Seed deals (idempotent)
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

  console.log('[sales/deals] bootstrap complete');
}
bootstrap().catch((err) => console.error('[sales/deals] bootstrap error:', err.message));

// ── GET /api/sales/deals ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { stage, type, search, deal_owner, page = 1, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10), 100);
  const off = (Math.max(parseInt(page, 10), 1) - 1) * lim;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (stage      && VALID_STAGES.has(stage)) { conditions.push(`d.stage = $${idx++}`);      values.push(stage); }
  if (type       && VALID_TYPES.has(type))   { conditions.push(`d.deal_type = $${idx++}`);  values.push(type); }
  if (deal_owner) { conditions.push(`d.deal_owner ILIKE $${idx++}`);                        values.push(deal_owner); }
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
                (SELECT COUNT(*) FROM crm_activities a WHERE a.deal_id = d.id) AS activity_count,
                (SELECT entered_at FROM crm_deal_stage_history h
                 WHERE h.deal_id = d.id AND h.stage = d.stage AND h.exited_at IS NULL
                 ORDER BY h.entered_at DESC LIMIT 1) AS current_stage_since
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
    console.error('[sales/deals GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/sales/deals ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    title, partner_name, partner_country, deal_type = 'b2b_whitelabel',
    stage = 'lead', value_amount, value_currency = 'SAR', deal_owner,
    ceo_review_required = false, proposal_file_path, notes, next_action, next_action_date,
  } = req.body ?? {};

  if (!title || !partner_name) return res.status(400).json({ error: 'title and partner_name required' });
  if (!VALID_STAGES.has(stage))     return res.status(400).json({ error: 'invalid stage' });
  if (!VALID_TYPES.has(deal_type))  return res.status(400).json({ error: 'invalid deal_type' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
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
    // Record initial stage history entry
    await client.query(
      `INSERT INTO crm_deal_stage_history (deal_id, stage) VALUES ($1, $2)`,
      [rows[0].id, stage],
    );
    await client.query('COMMIT');
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sales/deals POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ── GET /api/sales/deals/export.csv ──────────────────────────────────────────
router.get('/export.csv', async (_req, res) => {
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
    const escape  = v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="crm-deals-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[sales/deals/export.csv]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/deals/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [deal, contacts, activities] = await Promise.all([
      pool.query('SELECT * FROM crm_deals WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM crm_contacts WHERE deal_id = $1 ORDER BY created_at ASC', [req.params.id]),
      pool.query('SELECT * FROM crm_activities WHERE deal_id = $1 ORDER BY performed_at DESC LIMIT 20', [req.params.id]),
    ]);
    if (!deal.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { ...deal.rows[0], contacts: contacts.rows, activities: activities.rows } });
  } catch (err) {
    console.error('[sales/deals/:id GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /api/sales/deals/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const allowed = ['title','partner_name','partner_country','deal_type','stage',
                   'value_amount','value_currency','deal_owner','ceo_review_required',
                   'ceo_approved_at','ceo_approved_by','proposal_file_path',
                   'notes','next_action','next_action_date','expected_close_date'];
  const updates = {};
  for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields' });
  if (updates.stage     && !VALID_STAGES.has(updates.stage))    return res.status(400).json({ error: 'invalid stage' });
  if (updates.deal_type && !VALID_TYPES.has(updates.deal_type)) return res.status(400).json({ error: 'invalid deal_type' });

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  setClauses.push('updated_at = NOW()');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch current row before update
    const prev = await client.query('SELECT * FROM crm_deals WHERE id = $1', [req.params.id]);
    if (!prev.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'NOT_FOUND' }); }
    const old = prev.rows[0];

    const { rows } = await client.query(
      `UPDATE crm_deals SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [req.params.id, ...Object.values(updates)],
    );

    const changedBy = req.body._changed_by ?? 'Admin';

    // Log each changed field to crm_deal_changes
    for (const [field, newVal] of Object.entries(updates)) {
      const oldVal = old[field];
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);
      if (oldStr !== newStr) {
        await client.query(
          `INSERT INTO crm_deal_changes (deal_id, field, old_value, new_value, changed_by)
           VALUES ($1,$2,$3,$4,$5)`,
          [req.params.id, field, oldStr, newStr, changedBy],
        );
      }
    }

    // Stage changed — update stage history
    if (updates.stage && old.stage !== updates.stage) {
      // Close the current open stage row
      await client.query(
        `UPDATE crm_deal_stage_history SET exited_at = NOW()
         WHERE deal_id = $1 AND exited_at IS NULL`,
        [req.params.id],
      );
      // Open a new stage row
      await client.query(
        `INSERT INTO crm_deal_stage_history (deal_id, stage) VALUES ($1,$2)`,
        [req.params.id, updates.stage],
      );
      // Also log to activities
      await client.query(
        `INSERT INTO crm_activities (deal_id, type, summary, performed_by)
         VALUES ($1,'note',$2,'System')`,
        [req.params.id, `Stage changed: ${old.stage} → ${updates.stage}`],
      );
    }

    await client.query('COMMIT');
    res.json({ data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sales/deals/:id PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/sales/deals/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM crm_deals WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: { id: rows[0].id } });
  } catch (err) {
    console.error('[sales/deals/:id DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/deals/:id/changes ──────────────────────────────────────────
router.get('/:id/changes', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '100', 10), 200);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_deal_changes
       WHERE deal_id = $1
       ORDER BY changed_at DESC
       LIMIT $2`,
      [req.params.id, limit],
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[sales/deals/:id/changes GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
