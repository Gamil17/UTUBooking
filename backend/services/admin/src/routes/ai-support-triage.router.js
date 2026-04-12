'use strict';

/**
 * AI Support Ticket Triage
 *
 * Registered in app.js as: app.use('/api/admin/support-triage', requireAdmin, aiSupportTriageRouter)
 *
 * Reads from ops_support_tickets (ops-service table, same DB).
 * Writes triage results to ai_support_triage (admin-service table).
 *
 * GET  /:ticketId   — fetch existing triage result (404 if none)
 * POST /:ticketId   — run AI triage, store & return result
 * GET  /            — list recent triage results (newest first)
 *
 * Claude output schema:
 *   sentiment           'positive' | 'neutral' | 'frustrated' | 'angry'
 *   urgency_override    'urgent' | 'high' | 'medium' | 'low'
 *   category_suggestion string (from allowed category set)
 *   summary             1-2 sentence plain-English summary of the customer's actual issue
 *   root_cause          likely technical or operational root cause
 *   draft_response      professional, empathetic reply ready to send to the customer
 *   escalation_flag     boolean — should this be escalated beyond first-line support?
 *   escalation_reason   string | null (if escalation_flag = true)
 *   resolution_steps    string[] (internal steps for the agent to follow)
 *   pattern_note        string | null (if this matches a known recurring issue pattern)
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
    CREATE TABLE IF NOT EXISTS ai_support_triage (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id           UUID        NOT NULL UNIQUE,
      ticket_subject      TEXT,
      sentiment           TEXT        NOT NULL
                                      CHECK (sentiment IN ('positive','neutral','frustrated','angry')),
      urgency_override    TEXT        NOT NULL
                                      CHECK (urgency_override IN ('urgent','high','medium','low')),
      category_suggestion TEXT,
      summary             TEXT        NOT NULL,
      root_cause          TEXT,
      draft_response      TEXT        NOT NULL,
      escalation_flag     BOOLEAN     NOT NULL DEFAULT FALSE,
      escalation_reason   TEXT,
      resolution_steps    TEXT[]      NOT NULL DEFAULT '{}',
      pattern_note        TEXT,
      generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-support-triage] bootstrap error:', e.message));

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert customer support specialist for UTUBooking.com, a travel booking platform headquartered in Saudi Arabia, focused on the Gulf and Muslim World market.

Platform context:
- UTUBooking.com: Hotels, Flights, Car Rentals — specialising in Makkah, Madinah, Hajj and Umrah travel
- Customers are predominantly Muslim travellers from Saudi Arabia, UAE, Kuwait, and the wider Gulf region
- Bookings are often time-sensitive (Hajj season, Umrah trips, pilgrimages)
- Currency: SAR primary. Common issues: payment failures, cancellation policies, hotel check-in/check-out, flight changes
- Brand tone: Professional, warm, culturally respectful — always refer to customers respectfully

Support policy context:
- Refunds for cancellations follow the hotel/airline cancellation policy
- Hajj/Umrah bookings may have special non-refundable conditions
- Payment failures should be directed to try again or use alternative payment methods
- Technical issues should be logged with browser/device details for the tech team

Triage rules:
- Detect genuine sentiment — do not assume frustration from formal language
- Flag for escalation if: financial dispute over SAR 1000+, threat of legal action, media/press mention, health/safety risk, Hajj booking failure during peak season
- Draft response must be professional, warm, and in English (customer email will be EN or AR — always respond in English for the draft)
- draft_response should be a COMPLETE, ready-to-send email — include greeting, body, resolution/next steps, sign-off ("Warm regards, UTUBooking.com Support Team")
- resolution_steps are INTERNAL agent steps — not shown to the customer
- Output ONLY valid JSON — no markdown fences, no commentary before/after

Output this exact JSON structure:
{
  "sentiment": "<positive|neutral|frustrated|angry>",
  "urgency_override": "<urgent|high|medium|low>",
  "category_suggestion": "<booking|payment|technical|account|refund|other>",
  "summary": "<1-2 sentence plain-English summary of what the customer actually needs>",
  "root_cause": "<likely root cause of this issue>",
  "draft_response": "<complete ready-to-send customer reply>",
  "escalation_flag": <true|false>,
  "escalation_reason": "<reason if escalation_flag is true, else null>",
  "resolution_steps": ["<internal step 1>", "<internal step 2>", "<internal step 3>"],
  "pattern_note": "<if this looks like a known recurring pattern, describe it, else null>"
}`;

// ── GET / — list recent triage results ───────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, ticket_id, ticket_subject, sentiment, urgency_override,
               escalation_flag, generated_at
        FROM ai_support_triage
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_support_triage'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count, 10), limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:ticketId — fetch existing triage ────────────────────────────────────

router.get('/:ticketId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_support_triage WHERE ticket_id = $1',
      [req.params.ticketId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:ticketId — run AI triage ──────────────────────────────────────────

router.post('/:ticketId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { ticketId } = req.params;

  // Load ticket from ops_support_tickets
  let ticket;
  try {
    const { rows } = await pool.query(
      `SELECT id, user_email, booking_ref, category, priority, status,
              subject, description, assignee, resolution, created_at, updated_at
       FROM ops_support_tickets WHERE id = $1`,
      [ticketId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'TICKET_NOT_FOUND' });
    ticket = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Calculate ticket age
  const today       = new Date();
  const createdAt   = new Date(ticket.created_at);
  const ageHours    = Math.floor((today - createdAt) / 3_600_000);
  const ageDisplay  = ageHours < 24
    ? `${ageHours} hour${ageHours !== 1 ? 's' : ''}`
    : `${Math.floor(ageHours / 24)} day${Math.floor(ageHours / 24) !== 1 ? 's' : ''}`;

  const userPrompt = `Triage this support ticket for UTUBooking.com and return your assessment as JSON only.

TICKET DETAILS
Subject:      ${ticket.subject}
Category:     ${ticket.category}
Priority:     ${ticket.priority}
Status:       ${ticket.status}
User email:   ${ticket.user_email || 'Not provided'}
Booking ref:  ${ticket.booking_ref || 'Not provided'}
Assignee:     ${ticket.assignee || 'Unassigned'}
Age:          ${ageDisplay} old

DESCRIPTION:
---
${ticket.description || '(No description provided)'}
---

${ticket.resolution ? `EXISTING RESOLUTION NOTE:\n---\n${ticket.resolution}\n---\n` : ''}

Triage this ticket: assess sentiment, recommended urgency, true category, write a draft customer response, and provide internal resolution steps. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
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

    // Validate enums
    const validSentiments = new Set(['positive', 'neutral', 'frustrated', 'angry']);
    const validUrgencies  = new Set(['urgent', 'high', 'medium', 'low']);
    const validCategories = new Set(['booking', 'payment', 'technical', 'account', 'refund', 'other']);

    const sentiment          = validSentiments.has(parsed.sentiment) ? parsed.sentiment : 'neutral';
    const urgencyOverride    = validUrgencies.has(parsed.urgency_override) ? parsed.urgency_override : 'medium';
    const categorySuggestion = validCategories.has(parsed.category_suggestion) ? parsed.category_suggestion : ticket.category;
    const escalationFlag     = Boolean(parsed.escalation_flag);

    // UPSERT
    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_support_triage
        (ticket_id, ticket_subject, sentiment, urgency_override, category_suggestion,
         summary, root_cause, draft_response, escalation_flag, escalation_reason,
         resolution_steps, pattern_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (ticket_id) DO UPDATE SET
        ticket_subject      = EXCLUDED.ticket_subject,
        sentiment           = EXCLUDED.sentiment,
        urgency_override    = EXCLUDED.urgency_override,
        category_suggestion = EXCLUDED.category_suggestion,
        summary             = EXCLUDED.summary,
        root_cause          = EXCLUDED.root_cause,
        draft_response      = EXCLUDED.draft_response,
        escalation_flag     = EXCLUDED.escalation_flag,
        escalation_reason   = EXCLUDED.escalation_reason,
        resolution_steps    = EXCLUDED.resolution_steps,
        pattern_note        = EXCLUDED.pattern_note,
        generated_at        = NOW()
      RETURNING *
    `, [
      ticketId,
      ticket.subject,
      sentiment,
      urgencyOverride,
      categorySuggestion,
      parsed.summary ?? '',
      parsed.root_cause ?? null,
      parsed.draft_response ?? '',
      escalationFlag,
      escalationFlag ? (parsed.escalation_reason ?? null) : null,
      parsed.resolution_steps ?? [],
      parsed.pattern_note ?? null,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-support-triage] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
