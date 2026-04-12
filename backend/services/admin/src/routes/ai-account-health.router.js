'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_account_health (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id          UUID        NOT NULL UNIQUE,
      account_name        TEXT,
      churn_risk          TEXT        NOT NULL DEFAULT 'medium',
      health_score        INT         NOT NULL DEFAULT 50,
      engagement_trend    TEXT        NOT NULL DEFAULT 'stable',
      executive_summary   TEXT        NOT NULL,
      strengths           TEXT[]      NOT NULL DEFAULT '{}',
      concerns            TEXT[]      NOT NULL DEFAULT '{}',
      next_touchpoints    JSONB       NOT NULL DEFAULT '[]',
      renewal_alert       TEXT,
      escalation_summary  TEXT,
      recommendations     TEXT[]      NOT NULL DEFAULT '{}',
      red_flags           TEXT[]      NOT NULL DEFAULT '{}',
      generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-account-health] bootstrap error:', e.message));

// GET /api/admin/account-health/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM ai_account_health WHERE account_id = $1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/admin/account-health/:id
router.post('/:id', async (req, res) => {
  const accountId = req.params.id;
  try {
    // Load account
    const accR = await pool.query(
      `SELECT * FROM cs_accounts WHERE id = $1`, [accountId]
    );
    if (!accR.rows.length) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
    const account = accR.rows[0];

    // Load touchpoints (last 90 days)
    const tpR = await pool.query(
      `SELECT type, summary, outcome, owner, touched_at
       FROM cs_touchpoints WHERE account_id = $1
       ORDER BY touched_at DESC LIMIT 30`,
      [accountId]
    );

    // Load open escalations
    const escR = await pool.query(
      `SELECT subject, priority, status, owner, created_at
       FROM cs_escalations WHERE account_id = $1 AND status NOT IN ('resolved','closed')
       ORDER BY created_at DESC LIMIT 10`,
      [accountId]
    );

    const daysSinceLastTouch = tpR.rows.length
      ? Math.round((Date.now() - new Date(tpR.rows[0].touched_at).getTime()) / 86400000)
      : 999;

    const outcomeBreakdown = { positive: 0, neutral: 0, negative: 0 };
    tpR.rows.forEach(t => { outcomeBreakdown[t.outcome] = (outcomeBreakdown[t.outcome] || 0) + 1; });

    const prompt = `You are an AI Customer Success advisor for UTUBooking.com (Gulf travel platform — hotels, flights, Hajj/Umrah). Analyse this B2B account and provide actionable health coaching.

Account:
${JSON.stringify({
  name: account.name,
  type: account.type,
  tier: account.tier,
  status: account.status,
  country: account.country,
  owner: account.owner,
  ltv_sar: account.ltv_sar,
  nps_score: account.nps_score,
  health_score: account.health_score,
  churn_risk: account.churn_risk,
  renewal_date: account.renewal_date,
  notes: account.notes,
}, null, 2)}

Engagement:
- Days since last touchpoint: ${daysSinceLastTouch}
- Total touchpoints (last 30): ${tpR.rows.length}
- Outcome breakdown: ${JSON.stringify(outcomeBreakdown)}
- Recent touchpoints: ${JSON.stringify(tpR.rows.slice(0, 10))}

Open Escalations (${escR.rows.length}):
${JSON.stringify(escR.rows)}

Context:
- Gulf B2B accounts (travel agencies, corporates, government) have long relationship cycles
- Ramadan is a good renewal period — people travel during Eid
- Government accounts (tier=enterprise) have formal procurement — allow 60+ day lead time
- NPS < 7 = detractor, NPS < 0 = urgent intervention
- Health score 0–100: < 40 = critical, 40–60 = at risk, 60–80 = healthy, > 80 = excellent

Respond with ONLY a JSON object (no markdown fences):
{
  "churn_risk": "critical|high|medium|low",
  "health_score": 0-100,
  "engagement_trend": "improving|stable|declining|at_risk",
  "executive_summary": "2-3 sentences on this account's health",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1", "concern 2"],
  "next_touchpoints": [
    { "action": "...", "type": "call|email|meeting|qbr", "timeline": "...", "owner": "..." }
  ],
  "renewal_alert": "null or string if renewal risk exists",
  "escalation_summary": "null or summary of open escalations",
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "red_flags": ["flag 1"]
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].text
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const ai = JSON.parse(raw);

    await pool.query(`
      INSERT INTO ai_account_health
        (account_id, account_name, churn_risk, health_score, engagement_trend,
         executive_summary, strengths, concerns, next_touchpoints,
         renewal_alert, escalation_summary, recommendations, red_flags, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (account_id) DO UPDATE SET
        account_name      = EXCLUDED.account_name,
        churn_risk        = EXCLUDED.churn_risk,
        health_score      = EXCLUDED.health_score,
        engagement_trend  = EXCLUDED.engagement_trend,
        executive_summary = EXCLUDED.executive_summary,
        strengths         = EXCLUDED.strengths,
        concerns          = EXCLUDED.concerns,
        next_touchpoints  = EXCLUDED.next_touchpoints,
        renewal_alert     = EXCLUDED.renewal_alert,
        escalation_summary = EXCLUDED.escalation_summary,
        recommendations   = EXCLUDED.recommendations,
        red_flags         = EXCLUDED.red_flags,
        generated_at      = NOW()
    `, [
      accountId,
      account.name,
      ai.churn_risk ?? 'medium',
      ai.health_score ?? 50,
      ai.engagement_trend ?? 'stable',
      ai.executive_summary ?? '',
      ai.strengths ?? [],
      ai.concerns ?? [],
      JSON.stringify(ai.next_touchpoints ?? []),
      ai.renewal_alert ?? null,
      ai.escalation_summary ?? null,
      ai.recommendations ?? [],
      ai.red_flags ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_account_health WHERE account_id = $1`, [accountId]);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-account-health] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
