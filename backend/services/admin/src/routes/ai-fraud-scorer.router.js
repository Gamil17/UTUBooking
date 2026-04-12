'use strict';

/**
 * AI Fraud Risk Scorer
 *
 * Registered in app.js as: app.use('/api/admin/fraud-scorer', requireAdmin, aiFraudScorerRouter)
 *
 * Reads from fraud_cases + fraud_decisions + fraud_watchlist (fraud-service tables, same DB).
 * Writes AI analysis to ai_fraud_scores (admin-service table).
 *
 * GET  /:caseId   — fetch existing AI score (404 if none)
 * POST /:caseId   — run AI scoring, store & return result
 * GET  /          — list recent scores (newest first)
 *
 * Claude output schema:
 *   threat_level            'critical' | 'high' | 'medium' | 'low'
 *   verdict                 'block' | 'escalate' | 'review' | 'clear'
 *   confidence              0-100 integer
 *   evidence_summary        string — concise narrative of why this is or isn't fraudulent
 *   key_indicators          string[] — specific signals driving the assessment
 *   mitigating_factors      string[] — signals suggesting it may be legitimate
 *   recommended_action      string — specific step for the fraud analyst to take
 *   watchlist_suggestion    { should_add: boolean, type: string|null, reason: string|null }
 *   pattern_note            string | null — if this matches a known fraud pattern
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
    CREATE TABLE IF NOT EXISTS ai_fraud_scores (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id              UUID        NOT NULL UNIQUE,
      booking_ref          TEXT,
      threat_level         TEXT        NOT NULL
                                       CHECK (threat_level IN ('critical','high','medium','low')),
      verdict              TEXT        NOT NULL
                                       CHECK (verdict IN ('block','escalate','review','clear')),
      confidence           INT         NOT NULL CHECK (confidence BETWEEN 0 AND 100),
      evidence_summary     TEXT        NOT NULL,
      key_indicators       TEXT[]      NOT NULL DEFAULT '{}',
      mitigating_factors   TEXT[]      NOT NULL DEFAULT '{}',
      recommended_action   TEXT        NOT NULL,
      watchlist_should_add BOOLEAN     NOT NULL DEFAULT FALSE,
      watchlist_type       TEXT,
      watchlist_reason     TEXT,
      pattern_note         TEXT,
      generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-fraud-scorer] bootstrap error:', e.message));

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert fraud analyst for UTUBooking.com, a travel booking platform headquartered in Saudi Arabia, operating across the Gulf and Muslim World.

Platform context:
- UTUBooking.com: Hotels, Flights, Car Rentals — Hajj and Umrah specialist
- Average legitimate booking: SAR 800-5,000 for hotels; SAR 1,500-8,000 for flights
- Peak fraud risk periods: Hajj season (high-value pilgrim bookings targeted), Ramadan, major holidays
- Common fraud patterns: Card testing with low-value bookings followed by high-value fraud, velocity attacks from VPNs targeting Gulf region, account takeover on loyal pilgrim accounts, refund fraud on cancelled Hajj bookings
- Primary legitimate markets: SA, AE, KW, QA, BH, OM, JO, EG, UK, US (diaspora), ID, MY (Hajj pilgrims)
- High-risk signals: non-Gulf IPs for Makkah bookings, mismatched billing/travel countries, round-number amounts, multiple cards same IP, late-night high-value bookings

Fraud scoring rules:
- Risk score 0-49: likely legitimate; 50-74: suspicious, review; 75-89: high fraud probability; 90+: near-certain fraud
- Multiple flags compound the risk — a single geo mismatch is medium; geo mismatch + velocity + night-time = high/critical
- Legitimate edge cases: diaspora Muslims booking Hajj from EU/US (real pattern), family bookings from single device, corporate travel buyers
- verdict 'block' = stop transaction immediately and add to watchlist
- verdict 'escalate' = senior fraud analyst review required before any action
- verdict 'review' = analyst should verify before allowing (request ID, 3DS, etc.)
- verdict 'clear' = likely false positive; unblock and proceed
- watchlist_suggestion: only suggest adding if you have HIGH confidence it would reduce future fraud
- Output ONLY valid JSON — no markdown fences, no commentary before/after

Output this exact JSON structure:
{
  "threat_level": "<critical|high|medium|low>",
  "verdict": "<block|escalate|review|clear>",
  "confidence": <integer 0-100>,
  "evidence_summary": "<concise narrative of why this is or isn't fraudulent — 2-3 sentences>",
  "key_indicators": ["<specific signal 1>", "<specific signal 2>"],
  "mitigating_factors": ["<legitimate explanation 1>"],
  "recommended_action": "<specific step for the fraud analyst to take now>",
  "watchlist_suggestion": {
    "should_add": <true|false>,
    "type": "<email|ip|card_bin|device_id|phone|null>",
    "reason": "<why this should be watchlisted, or null>"
  },
  "pattern_note": "<if this matches a known UTUBooking fraud pattern, describe it, else null>"
}`;

// ── GET / — list recent scores ────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, case_id, booking_ref, threat_level, verdict, confidence, generated_at
        FROM ai_fraud_scores
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_fraud_scores'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count, 10), limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:caseId — fetch existing score ───────────────────────────────────────

router.get('/:caseId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_fraud_scores WHERE case_id = $1',
      [req.params.caseId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:caseId — run AI scoring ────────────────────────────────────────────

router.post('/:caseId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { caseId } = req.params;

  // Load fraud case
  let fc;
  try {
    const { rows } = await pool.query(
      `SELECT id, booking_ref, user_id, user_email, amount_sar, payment_method,
              ip_address, country, risk_score, flags, status, assigned_to,
              decision_reason, created_at
       FROM fraud_cases WHERE id = $1`,
      [caseId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'CASE_NOT_FOUND' });
    fc = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Gather context: prior decisions on same email/IP + watchlist hits
  let priorDecisions = [];
  let watchlistHits  = [];
  try {
    const [priorRes, watchRes] = await Promise.all([
      // Prior decisions on same email
      fc.user_email
        ? pool.query(
            `SELECT fc.booking_ref, fd.decision, fd.reason, fd.decided_at
             FROM fraud_decisions fd
             JOIN fraud_cases fc ON fc.id = fd.case_id
             WHERE fc.user_email = $1 AND fc.id != $2
             ORDER BY fd.decided_at DESC LIMIT 5`,
            [fc.user_email, caseId],
          )
        : { rows: [] },
      // Watchlist hits on email or IP
      pool.query(
        `SELECT type, value, reason, severity FROM fraud_watchlist
         WHERE (type = 'email' AND value = $1) OR (type = 'ip' AND value = $2)`,
        [fc.user_email ?? '', fc.ip_address ?? ''],
      ),
    ]);
    priorDecisions = priorRes.rows;
    watchlistHits  = watchRes.rows;
  } catch {
    // Non-critical — proceed without context
  }

  // Time of day context
  const createdAt  = new Date(fc.created_at);
  const hour       = createdAt.getUTCHours(); // approximate Riyadh (UTC+3) = hour+3
  const riyadhHour = (hour + 3) % 24;
  const timeNote   = riyadhHour >= 2 && riyadhHour <= 5
    ? `(late-night: ${riyadhHour}:00 Riyadh time — elevated fraud risk window)`
    : `(${riyadhHour}:00 Riyadh time)`;

  const userPrompt = `Score this fraud case for UTUBooking.com and return your assessment as JSON only.

CASE DETAILS
Case ID:          ${fc.id}
Booking Ref:      ${fc.booking_ref ?? 'Not assigned'}
User Email:       ${fc.user_email ?? 'Unknown'}
Amount:           ${fc.amount_sar ? `SAR ${Number(fc.amount_sar).toLocaleString()}` : 'Unknown'}
Payment method:   ${fc.payment_method ?? 'Unknown'}
IP address:       ${fc.ip_address ?? 'Unknown'}
Country:          ${fc.country ?? 'Unknown'}
System risk score: ${fc.risk_score}/100
Current status:   ${fc.status}
Submitted:        ${createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC ${timeNote}

SYSTEM FLAGS TRIGGERED:
${fc.flags?.length ? fc.flags.map(f => `- ${f}`).join('\n') : '(No flags triggered)'}

WATCHLIST HITS (${watchlistHits.length}):
${watchlistHits.length
  ? watchlistHits.map(w => `- ${w.type.toUpperCase()} "${w.value}" — ${w.reason} [${w.severity}]`).join('\n')
  : '(No watchlist hits)'}

PRIOR DECISIONS ON THIS EMAIL (${priorDecisions.length}):
${priorDecisions.length
  ? priorDecisions.map(d =>
      `- ${new Date(d.decided_at).toLocaleDateString('en-GB')}: ${d.booking_ref} → ${d.decision} (${d.reason})`
    ).join('\n')
  : '(No prior decisions on this email)'}

${fc.decision_reason ? `EXISTING ANALYST NOTES:\n${fc.decision_reason}` : ''}

Assess this case's fraud risk, verdict, and recommended action. Return JSON only.`;

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

    // Validate enums
    const validThreats  = new Set(['critical', 'high', 'medium', 'low']);
    const validVerdicts = new Set(['block', 'escalate', 'review', 'clear']);

    const threatLevel  = validThreats.has(parsed.threat_level)  ? parsed.threat_level  : 'medium';
    const verdict      = validVerdicts.has(parsed.verdict)       ? parsed.verdict       : 'review';
    const confidence   = Math.max(0, Math.min(100, parseInt(parsed.confidence ?? 50, 10)));
    const ws           = parsed.watchlist_suggestion ?? {};
    const wsAdd        = Boolean(ws.should_add);
    const validWsTypes = new Set(['email','ip','card_bin','device_id','phone']);
    const wsType       = wsAdd && validWsTypes.has(ws.type) ? ws.type : null;

    // UPSERT
    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_fraud_scores
        (case_id, booking_ref, threat_level, verdict, confidence,
         evidence_summary, key_indicators, mitigating_factors,
         recommended_action, watchlist_should_add, watchlist_type,
         watchlist_reason, pattern_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (case_id) DO UPDATE SET
        booking_ref          = EXCLUDED.booking_ref,
        threat_level         = EXCLUDED.threat_level,
        verdict              = EXCLUDED.verdict,
        confidence           = EXCLUDED.confidence,
        evidence_summary     = EXCLUDED.evidence_summary,
        key_indicators       = EXCLUDED.key_indicators,
        mitigating_factors   = EXCLUDED.mitigating_factors,
        recommended_action   = EXCLUDED.recommended_action,
        watchlist_should_add = EXCLUDED.watchlist_should_add,
        watchlist_type       = EXCLUDED.watchlist_type,
        watchlist_reason     = EXCLUDED.watchlist_reason,
        pattern_note         = EXCLUDED.pattern_note,
        generated_at         = NOW()
      RETURNING *
    `, [
      caseId,
      fc.booking_ref ?? null,
      threatLevel,
      verdict,
      confidence,
      parsed.evidence_summary   ?? '',
      parsed.key_indicators     ?? [],
      parsed.mitigating_factors ?? [],
      parsed.recommended_action ?? '',
      wsAdd,
      wsType,
      wsAdd ? (ws.reason ?? null) : null,
      parsed.pattern_note ?? null,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-fraud-scorer] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
