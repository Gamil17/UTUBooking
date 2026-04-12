'use strict';

/**
 * AI CRM Deal Coach
 *
 * Registered in app.js as:
 *   app.use('/api/admin/deal-coach', requireAdmin, aiDealCoachRouter)
 *
 * GET  /:dealId  — fetch existing coaching analysis (404 if none)
 * POST /:dealId  — run fresh deal coaching session
 *
 * Claude output schema:
 *   momentum              'accelerating' | 'steady' | 'stalled' | 'declining'
 *   win_probability_pct   number 0-100
 *   stage_assessment      string — is the deal in the right stage? what's missing to advance?
 *   relationship_health   'strong' | 'warm' | 'cold' | 'at_risk'
 *   risks                 string[]
 *   opportunities         string[]
 *   next_best_actions     { action, owner, timeline }[]
 *   competitive_intel_gap string — what intelligence is missing?
 *   coaching_summary      string — 3-4 sentence narrative for the rep
 *   red_flags             string[]
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
    CREATE TABLE IF NOT EXISTS ai_deal_coaching (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id              UUID        NOT NULL UNIQUE,
      deal_title           TEXT,
      partner_name         TEXT,
      stage                TEXT,
      momentum             TEXT        NOT NULL DEFAULT 'steady'
                                       CHECK (momentum IN ('accelerating','steady','stalled','declining')),
      win_probability_pct  INT         NOT NULL DEFAULT 50 CHECK (win_probability_pct BETWEEN 0 AND 100),
      stage_assessment     TEXT        NOT NULL,
      relationship_health  TEXT        NOT NULL DEFAULT 'warm'
                                       CHECK (relationship_health IN ('strong','warm','cold','at_risk')),
      risks                TEXT[]      NOT NULL DEFAULT '{}',
      opportunities        TEXT[]      NOT NULL DEFAULT '{}',
      next_best_actions    JSONB       NOT NULL DEFAULT '[]',
      competitive_intel_gap TEXT,
      coaching_summary     TEXT        NOT NULL,
      red_flags            TEXT[]      NOT NULL DEFAULT '{}',
      generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-deal-coach] bootstrap error:', e.message));

// ── GET /:dealId ──────────────────────────────────────────────────────────────

router.get('/:dealId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_deal_coaching WHERE deal_id = $1',
      [req.params.dealId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:dealId — run coaching ──────────────────────────────────────────────

router.post('/:dealId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { dealId } = req.params;

  // Load deal
  let deal;
  try {
    const { rows } = await pool.query(
      `SELECT d.*, EXTRACT(EPOCH FROM (NOW() - d.created_at))/86400 AS days_in_crm
         FROM crm_deals d WHERE d.id = $1`,
      [dealId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'DEAL_NOT_FOUND' });
    deal = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Load contacts
  const contacts = await pool.query(
    `SELECT name, title, email, phone FROM crm_contacts WHERE deal_id = $1 LIMIT 5`,
    [dealId]
  ).then(r => r.rows).catch(() => []);

  // Load activities (last 30)
  const activities = await pool.query(
    `SELECT type, summary, performed_by, performed_at
       FROM crm_activities WHERE deal_id = $1
       ORDER BY performed_at DESC LIMIT 30`,
    [dealId]
  ).then(r => r.rows).catch(() => []);

  // Load stage history
  const stageHistory = await pool.query(
    `SELECT old_value, new_value, changed_at
       FROM crm_deal_changes WHERE deal_id = $1 AND field = 'stage'
       ORDER BY changed_at ASC LIMIT 10`,
    [dealId]
  ).then(r => r.rows).catch(() => []);

  // Compute engagement stats
  const daysSinceActivity = activities.length > 0
    ? Math.floor((Date.now() - new Date(activities[0].performed_at).getTime()) / 86_400_000)
    : 999;

  const activityTypeCounts = activities.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1; return acc;
  }, {});

  const systemPrompt = `You are the AI Sales Coach for UTUBooking.com's CRM, a Gulf-region B2B travel tech company. You analyse deals to provide actionable coaching to sales reps and managers.

UTUBooking deal context:
- Deal types: b2b_whitelabel (our best), hotel_partner, airline, investor, other
- Typical deal cycle: 2-6 months for B2B, 1-3 months for hotel/airline
- Pipeline stages: lead → qualified → demo → proposal → negotiation → won/lost
- Average deal value: SAR 150k–2M for whitelabel; SAR 20k–200k for hotel_partner
- Key decision makers in Gulf: VP Commercial, CTO, CEO for large deals; GMs for hotel partners
- Relationship is paramount in GCC — in-person meetings >> email chains
- Ramadan and summer (Jul-Aug) are slow periods; act before/after

Coaching philosophy:
- Be direct, specific, commercial
- Name the exact next action, owner, and deadline
- Identify REAL risks, not generic ones
- Win probability should reflect the honest assessment

Output ONLY valid JSON — no markdown fences, no commentary.

JSON structure:
{
  "momentum": "accelerating|steady|stalled|declining",
  "win_probability_pct": <0-100>,
  "stage_assessment": "<is deal in correct stage? what specific milestone must be hit to advance?>",
  "relationship_health": "strong|warm|cold|at_risk",
  "risks": ["<specific risk — name root cause>"],
  "opportunities": ["<specific opportunity to exploit>"],
  "next_best_actions": [{ "action": "<specific action>", "owner": "<deal_owner or contact>", "timeline": "<e.g. within 48h, this week>" }],
  "competitive_intel_gap": "<what do we NOT know about competition, decision criteria, or budget?>",
  "coaching_summary": "<3-4 sentence narrative for the rep — direct, commercial>",
  "red_flags": ["<real concern requiring immediate attention>"]
}`;

  const userPrompt = `Coach me on this UTUBooking CRM deal:

DEAL OVERVIEW
Title:         ${deal.title}
Partner:       ${deal.partner_name} (${deal.partner_country ?? 'Country unknown'})
Type:          ${deal.deal_type}
Stage:         ${deal.stage}
Value:         ${deal.value_currency} ${deal.value_amount ? Number(deal.value_amount).toLocaleString() : 'Not set'}
Owner:         ${deal.deal_owner ?? 'Unassigned'}
Days in CRM:   ${Math.floor(deal.days_in_crm)} days
CEO Review:    ${deal.ceo_review_required ? `Required — ${deal.ceo_approved_at ? 'APPROVED' : 'PENDING'}` : 'Not required'}
Next Action:   ${deal.next_action ?? 'None set'}
Next Action Date: ${deal.next_action_date ?? 'Not set'}
Notes:         ${deal.notes ? deal.notes.slice(0, 200) : 'None'}

CONTACTS (${contacts.length})
${contacts.map(c => `  - ${c.name}${c.title ? ` (${c.title})` : ''} — ${c.email ?? 'no email'}`).join('\n') || '  No contacts added'}

ACTIVITY HISTORY (${activities.length} total)
Last Activity: ${activities[0] ? `${daysSinceActivity} days ago (${activities[0].type})` : 'No activities'}
Activity Mix:  ${Object.entries(activityTypeCounts).map(([t, c]) => `${t}: ${c}`).join(', ') || 'None'}
Recent Activities:
${activities.slice(0, 8).map(a => `  [${new Date(a.performed_at).toLocaleDateString()}] ${a.type}: ${(a.summary || '').slice(0, 100)}`).join('\n') || '  None'}

STAGE PROGRESSION
${stageHistory.length > 0
  ? stageHistory.map(h => `  ${new Date(h.changed_at).toLocaleDateString()}: ${h.old_value} → ${h.new_value}`).join('\n')
  : '  No stage changes recorded (deal may be new or stagnant)'}

Generate deal coaching. Be honest — if this deal looks stuck or at risk, say so. Give concrete next actions with owners and timelines. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'NO_OUTPUT' });

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

    const VALID_MOM  = new Set(['accelerating','steady','stalled','declining']);
    const VALID_REL  = new Set(['strong','warm','cold','at_risk']);
    const momentum         = VALID_MOM.has(parsed.momentum) ? parsed.momentum : 'steady';
    const relationship     = VALID_REL.has(parsed.relationship_health) ? parsed.relationship_health : 'warm';
    const win_pct          = Math.max(0, Math.min(100, parseInt(parsed.win_probability_pct, 10) || 50));

    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_deal_coaching
        (deal_id, deal_title, partner_name, stage, momentum,
         win_probability_pct, stage_assessment, relationship_health,
         risks, opportunities, next_best_actions, competitive_intel_gap,
         coaching_summary, red_flags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (deal_id) DO UPDATE SET
        deal_title           = EXCLUDED.deal_title,
        partner_name         = EXCLUDED.partner_name,
        stage                = EXCLUDED.stage,
        momentum             = EXCLUDED.momentum,
        win_probability_pct  = EXCLUDED.win_probability_pct,
        stage_assessment     = EXCLUDED.stage_assessment,
        relationship_health  = EXCLUDED.relationship_health,
        risks                = EXCLUDED.risks,
        opportunities        = EXCLUDED.opportunities,
        next_best_actions    = EXCLUDED.next_best_actions,
        competitive_intel_gap = EXCLUDED.competitive_intel_gap,
        coaching_summary     = EXCLUDED.coaching_summary,
        red_flags            = EXCLUDED.red_flags,
        generated_at         = NOW()
      RETURNING *
    `, [
      dealId, deal.title, deal.partner_name, deal.stage, momentum,
      win_pct,
      parsed.stage_assessment       ?? '',
      relationship,
      parsed.risks                  ?? [],
      parsed.opportunities          ?? [],
      JSON.stringify(parsed.next_best_actions ?? []),
      parsed.competitive_intel_gap  ?? null,
      parsed.coaching_summary       ?? '',
      parsed.red_flags              ?? [],
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-deal-coach] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
