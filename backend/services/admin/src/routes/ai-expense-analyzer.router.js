'use strict';

/**
 * AI Expense Claim Analyzer
 *
 * Registered in app.js as: app.use('/api/admin/expense-analyzer', requireAdmin, aiExpenseAnalyzerRouter)
 *
 * Reads from finance_expense_claims (finance-service table, same DB).
 * Writes analysis to ai_expense_analyses (admin-service table).
 *
 * GET  /:claimId   — fetch existing analysis (404 if none)
 * POST /:claimId   — run AI analysis, store & return result
 * GET  /           — list recent analyses (newest first)
 *
 * Claude output schema:
 *   recommendation      'approve' | 'reject' | 'query'
 *   confidence          0-100 integer
 *   policy_flags        string[]  (policy violations or concerns — empty if clean)
 *   anomaly_flags       string[]  (statistical or contextual anomalies)
 *   summary             1-2 sentence plain-English summary for the reviewer
 *   justification       why this recommendation was made
 *   suggested_notes     ready-to-use admin notes text the reviewer can copy directly
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
    CREATE TABLE IF NOT EXISTS ai_expense_analyses (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id          UUID        NOT NULL UNIQUE,
      employee_name     TEXT,
      recommendation    TEXT        NOT NULL
                                    CHECK (recommendation IN ('approve','reject','query')),
      confidence        INT         NOT NULL CHECK (confidence BETWEEN 0 AND 100),
      policy_flags      TEXT[]      NOT NULL DEFAULT '{}',
      anomaly_flags     TEXT[]      NOT NULL DEFAULT '{}',
      summary           TEXT        NOT NULL,
      justification     TEXT        NOT NULL,
      suggested_notes   TEXT,
      generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-expense-analyzer] bootstrap error:', e.message));

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert finance controller and expense auditor for UTUBooking.com, a travel booking startup headquartered in Saudi Arabia targeting the Gulf and Muslim World market.

Company context:
- UTUBooking.com: Series A startup, ~50 employees, predominantly remote-friendly
- HQ: Riyadh, Saudi Arabia. Teams in UAE, Jordan, and remote across MENA
- Business: Travel technology — Hotels, Flights, Car Rentals, Hajj/Umrah
- Expense policy (inferred from category norms):
  * travel: SAR 2,000 per trip economy domestic; SAR 5,000 international economy; per diem SAR 300/day
  * software: pre-approval required for licences > SAR 1,000/month; SaaS subscriptions common
  * marketing: campaigns need budget code approval; events up to SAR 5,000 without CEO approval
  * hosting: AWS/cloud costs via procurement — personal claims for hosting unusual
  * salaries: should NOT appear as expense claims (processed via payroll)
  * legal: law firm retainers via procurement — ad-hoc legal claims up to SAR 3,000 ok
  * other: flag if amount > SAR 500 and description is vague

Assessment rules:
- Flag policy violations clearly — be specific (e.g., "Amount exceeds SAR 2,000 domestic travel limit")
- Flag anomalies — duplicate patterns, round numbers with vague descriptions, unusual categories
- Be fair: a high amount alone is not a flag if description is specific and category is appropriate
- "query" recommendation = approve pending clarification or receipt evidence
- suggested_notes must be professional and actionable — suitable to show in admin system
- Output ONLY valid JSON — no markdown fences, no commentary before/after

Output this exact JSON structure:
{
  "recommendation": "<approve|reject|query>",
  "confidence": <integer 0-100>,
  "policy_flags": ["<specific policy concern>"],
  "anomaly_flags": ["<statistical or contextual anomaly>"],
  "summary": "<1-2 sentence plain-English assessment for the finance reviewer>",
  "justification": "<detailed explanation of why this recommendation was made>",
  "suggested_notes": "<ready-to-use admin notes the reviewer can copy directly — professional tone>"
}`;

// ── GET / — list recent analyses ──────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, claim_id, employee_name, recommendation, confidence, generated_at
        FROM ai_expense_analyses
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_expense_analyses'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count, 10), limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:claimId — fetch existing analysis ────────────────────────────────────

router.get('/:claimId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_expense_analyses WHERE claim_id = $1',
      [req.params.claimId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:claimId — run AI analysis ──────────────────────────────────────────

router.post('/:claimId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { claimId } = req.params;

  // Load claim from finance_expense_claims
  let claim;
  try {
    const { rows } = await pool.query(
      `SELECT id, employee_name, claim_date, category, amount, currency,
              description, status, reviewed_by, reviewed_at, file_url, admin_notes,
              created_at, updated_at
       FROM finance_expense_claims WHERE id = $1`,
      [claimId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'CLAIM_NOT_FOUND' });
    claim = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Get recent claims from same employee for anomaly context (last 10)
  let employeeClaims = [];
  try {
    const { rows } = await pool.query(
      `SELECT category, amount, currency, description, claim_date, status
       FROM finance_expense_claims
       WHERE employee_name ILIKE $1 AND id != $2
       ORDER BY claim_date DESC LIMIT 10`,
      [claim.employee_name, claimId],
    );
    employeeClaims = rows;
  } catch {
    // Non-critical — proceed without context
  }

  // SAR conversion for context
  const TO_SAR = { SAR: 1, AED: 1.02, USD: 3.75, EUR: 4.10, GBP: 4.80,
                   KWD: 12.20, BHD: 9.95, OMR: 9.74, QAR: 1.03, EGP: 0.076 };
  const sarAmount = (claim.amount * (TO_SAR[claim.currency] ?? 1)).toFixed(0);

  // Age of claim
  const today      = new Date();
  const claimDate  = new Date(claim.claim_date);
  const ageDays    = Math.floor((today - claimDate) / 86_400_000);

  const userPrompt = `Analyse this expense claim for UTUBooking.com and return your assessment as JSON only.

CLAIM DETAILS
Employee:     ${claim.employee_name}
Category:     ${claim.category}
Amount:       ${claim.currency} ${Number(claim.amount).toLocaleString()} (≈ SAR ${sarAmount})
Claim date:   ${claim.claim_date} (${ageDays} days ago)
Description:  ${claim.description}
Has receipt:  ${claim.file_url ? 'Yes (URL provided)' : 'No receipt attached'}
Status:       ${claim.status}
${claim.reviewed_by ? `Reviewed by: ${claim.reviewed_by}` : ''}
${claim.admin_notes ? `Existing admin notes: ${claim.admin_notes}` : ''}

EMPLOYEE CLAIM HISTORY (last ${employeeClaims.length} claims):
${employeeClaims.length
  ? employeeClaims.map(r =>
      `- ${r.claim_date}: ${r.category} ${r.currency} ${Number(r.amount).toLocaleString()} — "${r.description}" [${r.status}]`
    ).join('\n')
  : '(No previous claims)'}

Analyse this claim for policy compliance, anomalies, and provide a recommendation. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,
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

    // Validate
    const validRecs = new Set(['approve', 'reject', 'query']);
    const recommendation = validRecs.has(parsed.recommendation) ? parsed.recommendation : 'query';
    const confidence     = Math.max(0, Math.min(100, parseInt(parsed.confidence ?? 50, 10)));

    // UPSERT
    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_expense_analyses
        (claim_id, employee_name, recommendation, confidence,
         policy_flags, anomaly_flags, summary, justification, suggested_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (claim_id) DO UPDATE SET
        employee_name   = EXCLUDED.employee_name,
        recommendation  = EXCLUDED.recommendation,
        confidence      = EXCLUDED.confidence,
        policy_flags    = EXCLUDED.policy_flags,
        anomaly_flags   = EXCLUDED.anomaly_flags,
        summary         = EXCLUDED.summary,
        justification   = EXCLUDED.justification,
        suggested_notes = EXCLUDED.suggested_notes,
        generated_at    = NOW()
      RETURNING *
    `, [
      claimId,
      claim.employee_name,
      recommendation,
      confidence,
      parsed.policy_flags  ?? [],
      parsed.anomaly_flags ?? [],
      parsed.summary        ?? '',
      parsed.justification  ?? '',
      parsed.suggested_notes ?? null,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-expense-analyzer] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
