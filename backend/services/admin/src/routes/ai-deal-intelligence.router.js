'use strict';

/**
 * AI Deal Intelligence
 *
 * Registered in app.js as: app.use('/api/admin/deal-intelligence', requireAdmin, aiDealIntelligenceRouter)
 *
 * Reads from crm_deals + crm_contacts + crm_activities (sales-service tables, same DB).
 * Writes analysis to ai_deal_analyses (admin-service table).
 *
 * GET  /:dealId   — fetch existing analysis (404 if none)
 * POST /:dealId   — run AI analysis, store & return result
 * GET  /          — list recent analyses (newest first)
 *
 * Claude output schema:
 *   health_score          0-100 integer
 *   win_probability       0-100 integer
 *   risk_level            'low' | 'medium' | 'high' | 'critical'
 *   summary               2-3 sentence strategic overview
 *   strengths             string[]  (2-4 deal strengths)
 *   key_risks             string[]  (3-5 specific risks)
 *   stall_factors         string[]  (what may be blocking progress)
 *   recommended_actions   string[]  (3-5 concrete next steps, prioritised)
 *   competitive_notes     string    (market/competitive context)
 *   time_sensitivity      string    (urgency and deadline assessment)
 */

const express   = require('express');
const { Pool }  = require('pg');
const Anthropic  = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_deal_analyses (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id             UUID        NOT NULL UNIQUE,
      deal_title          TEXT,
      partner_name        TEXT,
      health_score        INT         NOT NULL CHECK (health_score BETWEEN 0 AND 100),
      win_probability     INT         NOT NULL CHECK (win_probability BETWEEN 0 AND 100),
      risk_level          TEXT        NOT NULL
                                      CHECK (risk_level IN ('low','medium','high','critical')),
      summary             TEXT        NOT NULL,
      strengths           TEXT[]      NOT NULL DEFAULT '{}',
      key_risks           TEXT[]      NOT NULL DEFAULT '{}',
      stall_factors       TEXT[]      NOT NULL DEFAULT '{}',
      recommended_actions TEXT[]      NOT NULL DEFAULT '{}',
      competitive_notes   TEXT,
      time_sensitivity    TEXT,
      generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-deal-intelligence] bootstrap error:', e.message));

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert B2B sales strategist and deal coach for UTUBooking.com, a travel booking platform headquartered in Saudi Arabia targeting the Gulf and Muslim World market.

Company context:
- UTUBooking.com: Gulf & Muslim World travel platform (Hotels, Flights, Cars, Hajj/Umrah)
- Core deal types: B2B White-Label SDK/API, Hotel Partner inventory deals, Airline partnerships, Investor rounds
- Primary markets: Saudi Arabia (Vision 2030 alignment is a strategic advantage), UAE, Gulf region
- Company stage: Series A closed; Series B fundraising active
- Key differentiator: Specialist in Makkah/Madinah Hajj/Umrah market, deep Islamic finance and Gulf cultural expertise

Deal assessment framework:
- Evaluate stage progression: lead → qualified → demo → proposal → negotiation → won/lost
- Consider deal age (time in current stage) as a key stall indicator
- Flag overdue next-action dates as urgent risk factors
- CEO approval requirement is a meaningful gating factor
- Value size and currency context matters for priority scoring
- Activity recency is a strong leading indicator of deal health

Output ONLY valid JSON — no markdown fences, no commentary before/after.

Output this exact JSON structure:
{
  "health_score": <integer 0-100>,
  "win_probability": <integer 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "summary": "<2-3 sentence strategic overview of this deal's current position and trajectory>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "key_risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "stall_factors": ["<what may be blocking deal progress>"],
  "recommended_actions": ["<highest priority action>", "<action 2>", "<action 3>"],
  "competitive_notes": "<1-2 sentences on competitive dynamics, urgency, or market timing relevant to this deal>",
  "time_sensitivity": "<assessment of urgency and any hard deadlines that affect probability of closing>"
}`;

// ── GET / — list recent analyses ──────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, deal_id, deal_title, partner_name,
               health_score, win_probability, risk_level, generated_at
        FROM ai_deal_analyses
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_deal_analyses'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count, 10), limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:dealId — fetch existing analysis ────────────────────────────────────

router.get('/:dealId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_deal_analyses WHERE deal_id = $1',
      [req.params.dealId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:dealId — run AI analysis ──────────────────────────────────────────

router.post('/:dealId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { dealId } = req.params;

  // Load deal from crm_deals (same DB as sales service)
  let deal, contacts, activities;
  try {
    const [dealRes, contactsRes, activitiesRes] = await Promise.all([
      pool.query(
        `SELECT id, title, partner_name, partner_country, deal_type, stage,
                value_amount, value_currency, deal_owner, ceo_review_required,
                ceo_approved_at, proposal_file_path, notes, next_action,
                next_action_date, expected_close_date, created_at, updated_at
         FROM crm_deals WHERE id = $1`,
        [dealId],
      ),
      pool.query(
        `SELECT name, title, email, phone FROM crm_contacts WHERE deal_id = $1 LIMIT 5`,
        [dealId],
      ),
      pool.query(
        `SELECT type, summary, performed_by, performed_at
         FROM crm_activities WHERE deal_id = $1
         ORDER BY performed_at DESC LIMIT 10`,
        [dealId],
      ),
    ]);

    if (!dealRes.rows[0]) return res.status(404).json({ error: 'DEAL_NOT_FOUND' });
    deal       = dealRes.rows[0];
    contacts   = contactsRes.rows;
    activities = activitiesRes.rows;
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Calculate deal age and days since last activity
  const today            = new Date();
  const createdAt        = new Date(deal.created_at);
  const updatedAt        = new Date(deal.updated_at);
  const dealAgeDays      = Math.floor((today - createdAt) / 86_400_000);
  const daysSinceUpdate  = Math.floor((today - updatedAt) / 86_400_000);
  const lastActivity     = activities[0]
    ? Math.floor((today - new Date(activities[0].performed_at)) / 86_400_000)
    : null;

  const nextActionOverdue = deal.next_action_date
    ? new Date(deal.next_action_date) < today
    : false;

  const closeDate = deal.expected_close_date;
  const daysToClose = closeDate
    ? Math.floor((new Date(closeDate) - today) / 86_400_000)
    : null;

  const fmtValue = (amount, currency) =>
    amount ? `${currency} ${Number(amount).toLocaleString()}` : 'Not specified';

  const userPrompt = `Analyse this B2B deal for UTUBooking.com and return your assessment as JSON only.

DEAL OVERVIEW
Title:            ${deal.title}
Partner:          ${deal.partner_name}${deal.partner_country ? ` (${deal.partner_country})` : ''}
Type:             ${deal.deal_type}
Stage:            ${deal.stage}
Value:            ${fmtValue(deal.value_amount, deal.value_currency)}
Owner:            ${deal.deal_owner || 'Not assigned'}
CEO Review:       ${deal.ceo_review_required ? (deal.ceo_approved_at ? 'Required — APPROVED' : 'Required — PENDING CEO APPROVAL') : 'Not required'}

TIMELINE
Deal age:         ${dealAgeDays} days since creation
Last update:      ${daysSinceUpdate} days ago
Last activity:    ${lastActivity !== null ? `${lastActivity} days ago` : 'No activities logged'}
Next action:      ${deal.next_action || 'None set'}${nextActionOverdue ? ' — OVERDUE' : ''}
Action due:       ${deal.next_action_date || 'Not set'}${daysToClose !== null ? `\nExpected close:   ${closeDate} (${daysToClose >= 0 ? `${daysToClose} days away` : `${Math.abs(daysToClose)} days overdue`})` : ''}

DEAL NOTES
${deal.notes || '(No notes)'}

CONTACTS (${contacts.length} known)
${contacts.length
  ? contacts.map(c => `- ${c.name}${c.title ? ` (${c.title})` : ''}${c.email ? ` <${c.email}>` : ''}`).join('\n')
  : '(No contacts recorded)'}

RECENT ACTIVITY (last ${activities.length} entries)
${activities.length
  ? activities.map(a => `- [${new Date(a.performed_at).toLocaleDateString('en-GB')}] ${a.type.replace(/_/g, ' ')}: ${a.summary}${a.performed_by ? ` (by ${a.performed_by})` : ''}`).join('\n')
  : '(No activities logged)'}

Assess this deal's health, win probability, risks, and recommended next actions. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'NO_OUTPUT' });

    // Parse Claude's JSON output
    let parsed;
    try {
      const clean = textBlock.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'PARSE_ERROR', raw: textBlock.text.slice(0, 500) });
    }

    // Validate and clamp
    const healthScore   = Math.max(0, Math.min(100, parseInt(parsed.health_score ?? 50, 10)));
    const winProb       = Math.max(0, Math.min(100, parseInt(parsed.win_probability ?? 25, 10)));
    const validRisks    = new Set(['low', 'medium', 'high', 'critical']);
    const riskLevel     = validRisks.has(parsed.risk_level) ? parsed.risk_level : 'medium';

    // UPSERT
    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_deal_analyses
        (deal_id, deal_title, partner_name, health_score, win_probability, risk_level,
         summary, strengths, key_risks, stall_factors, recommended_actions,
         competitive_notes, time_sensitivity)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (deal_id) DO UPDATE SET
        deal_title          = EXCLUDED.deal_title,
        partner_name        = EXCLUDED.partner_name,
        health_score        = EXCLUDED.health_score,
        win_probability     = EXCLUDED.win_probability,
        risk_level          = EXCLUDED.risk_level,
        summary             = EXCLUDED.summary,
        strengths           = EXCLUDED.strengths,
        key_risks           = EXCLUDED.key_risks,
        stall_factors       = EXCLUDED.stall_factors,
        recommended_actions = EXCLUDED.recommended_actions,
        competitive_notes   = EXCLUDED.competitive_notes,
        time_sensitivity    = EXCLUDED.time_sensitivity,
        generated_at        = NOW()
      RETURNING *
    `, [
      dealId,
      deal.title,
      deal.partner_name,
      healthScore,
      winProb,
      riskLevel,
      parsed.summary ?? '',
      parsed.strengths ?? [],
      parsed.key_risks ?? [],
      parsed.stall_factors ?? [],
      parsed.recommended_actions ?? [],
      parsed.competitive_notes ?? null,
      parsed.time_sensitivity ?? null,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-deal-intelligence] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
