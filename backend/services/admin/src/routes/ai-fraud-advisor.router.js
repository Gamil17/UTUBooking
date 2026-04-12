'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_fraud_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_cases           INT         NOT NULL DEFAULT 0,
      confirmed_fraud       INT         NOT NULL DEFAULT 0,
      pending_review        INT         NOT NULL DEFAULT 0,
      fraud_health          TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      threat_vectors        JSONB       NOT NULL DEFAULT '[]',
      rule_gaps             JSONB       NOT NULL DEFAULT '[]',
      high_risk_patterns    JSONB       NOT NULL DEFAULT '[]',
      watchlist_assessment  TEXT,
      false_positive_analysis TEXT,
      platform_risk_flags   TEXT[]      NOT NULL DEFAULT '{}',
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-fraud-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_fraud_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Case summary
    const cases = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending')           AS pending,
        COUNT(*) FILTER (WHERE status = 'reviewing')         AS reviewing,
        COUNT(*) FILTER (WHERE status = 'confirmed_fraud')   AS confirmed,
        COUNT(*) FILTER (WHERE status = 'false_positive')    AS false_positive,
        COUNT(*) FILTER (WHERE status = 'escalated')         AS escalated,
        COALESCE(SUM(amount_sar) FILTER (WHERE status = 'confirmed_fraud'), 0) AS confirmed_loss_sar,
        AVG(risk_score)                                      AS avg_risk_score,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS last_7d
      FROM fraud_cases
    `).catch(() => ({ rows: [{}] }));

    // Case type breakdown
    const byType = await pool.query(`
      SELECT fraud_type,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'confirmed_fraud') AS confirmed,
             COUNT(*) FILTER (WHERE status = 'pending') AS pending,
             COALESCE(SUM(amount_sar) FILTER (WHERE status = 'confirmed_fraud'), 0) AS loss_sar
      FROM fraud_cases
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY fraud_type ORDER BY total DESC LIMIT 10
    `).catch(() => ({ rows: [] }));

    // Active rules summary
    const rules = await pool.query(`
      SELECT rule_type,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE active = TRUE) AS active,
             COUNT(*) FILTER (WHERE active = FALSE) AS inactive
      FROM fraud_rules
      GROUP BY rule_type ORDER BY total DESC
    `).catch(() => ({ rows: [] }));

    // Rules with recent triggers
    const topRules = await pool.query(`
      SELECT name, rule_type, action, trigger_count, active, threshold
      FROM fraud_rules
      WHERE active = TRUE
      ORDER BY trigger_count DESC NULLS LAST LIMIT 10
    `).catch(() => ({ rows: [] }));

    // Watchlist summary
    const watchlist = await pool.query(`
      SELECT entry_type, COUNT(*) AS count
      FROM fraud_watchlist
      WHERE (expires_at IS NULL OR expires_at > NOW())
      GROUP BY entry_type ORDER BY count DESC
    `).catch(() => ({ rows: [] }));

    // Recent decisions
    const decisions = await pool.query(`
      SELECT verdict, COUNT(*) AS count,
             AVG(confidence_score) AS avg_confidence
      FROM fraud_decisions
      WHERE decided_at >= NOW() - INTERVAL '30 days'
      GROUP BY verdict ORDER BY count DESC
    `).catch(() => ({ rows: [] }));

    const c = cases.rows[0] ?? {};
    const totalCases = parseInt(c.total || 0);
    const confirmedFraud = parseInt(c.confirmed || 0);
    const pendingReview = parseInt(c.pending || 0);
    const falsePositive = parseInt(c.false_positive || 0);
    const fpRate = (confirmedFraud + falsePositive) > 0
      ? Math.round((falsePositive / (confirmedFraud + falsePositive)) * 100) : 0;

    const prompt = `You are an AI Fraud & Risk Intelligence Advisor for UTUBooking.com (Gulf travel platform). Analyse the fraud case portfolio, detection rules, and watchlist to provide threat intelligence and risk recommendations.

Case Summary:
- Total cases: ${totalCases} | Pending: ${pendingReview} | Reviewing: ${c.reviewing} | Confirmed fraud: ${confirmedFraud}
- False positives: ${falsePositive} (FP rate: ${fpRate}%) | Escalated: ${c.escalated}
- Confirmed loss: SAR ${parseFloat(c.confirmed_loss_sar || 0).toLocaleString()}
- Avg risk score: ${Math.round(parseFloat(c.avg_risk_score || 0))} / 100
- New cases (last 7d): ${c.last_7d}

Fraud Type Breakdown (last 90 days):
${JSON.stringify(byType.rows.map(r => ({
  type: r.fraud_type, total: parseInt(r.total), confirmed: parseInt(r.confirmed),
  pending: parseInt(r.pending), loss_sar: Math.round(parseFloat(r.loss_sar || 0)),
})))}

Detection Rules:
${JSON.stringify(rules.rows.map(r => ({
  type: r.rule_type, total: parseInt(r.total), active: parseInt(r.active), inactive: parseInt(r.inactive),
})))}

Top Triggered Rules:
${JSON.stringify(topRules.rows.map(r => ({
  name: r.name, type: r.rule_type, action: r.action,
  triggers: parseInt(r.trigger_count || 0), threshold: r.threshold,
})))}

Watchlist Entries (active):
${JSON.stringify(watchlist.rows.map(r => ({ type: r.entry_type, count: parseInt(r.count) })))}

Recent Decision Verdicts (last 30 days):
${JSON.stringify(decisions.rows.map(r => ({
  verdict: r.verdict, count: parseInt(r.count),
  avg_confidence: Math.round(parseFloat(r.avg_confidence || 0)),
})))}

Context:
- UTUBooking Gulf context: Card-not-present fraud, account takeover, loyalty point fraud, refund abuse
- Saudi market: Mada card fraud patterns differ from Visa/MC; STC Pay = lower fraud rate
- Key fraud vectors: fake hotel cancellations, flight refund abuse, promo code stacking
- False positive rate benchmarks: <10% = good, 10-20% = review needed, >20% = rule quality issue
- Pending review >48h = compliance risk (customer impact, chargeback window)
- SAR loss >50K confirmed = board-level reporting threshold

Respond with ONLY a JSON object (no markdown fences):
{
  "fraud_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence CFRM-level fraud intelligence summary",
  "threat_vectors": [
    { "vector": "...", "severity": "critical|high|medium|low", "trend": "increasing|stable|decreasing", "evidence": "...", "countermeasure": "..." }
  ],
  "rule_gaps": [
    { "gap": "...", "fraud_type": "...", "risk": "...", "rule_to_add": "..." }
  ],
  "high_risk_patterns": [
    { "pattern": "...", "volume": "...", "loss_exposure": "...", "detection_status": "covered|gap|partial" }
  ],
  "watchlist_assessment": "paragraph on watchlist coverage and entity type distribution",
  "false_positive_analysis": "paragraph on FP rate, customer experience impact, and rule tuning recommendations",
  "platform_risk_flags": ["flag 1", "flag 2"],
  "quick_wins": ["win 1", "win 2", "win 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"]
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].text
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const ai = JSON.parse(raw);

    await pool.query(`
      INSERT INTO ai_fraud_advice
        (snapshot_key, total_cases, confirmed_fraud, pending_review,
         fraud_health, executive_summary, threat_vectors, rule_gaps,
         high_risk_patterns, watchlist_assessment, false_positive_analysis,
         platform_risk_flags, quick_wins, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_cases           = EXCLUDED.total_cases,
        confirmed_fraud       = EXCLUDED.confirmed_fraud,
        pending_review        = EXCLUDED.pending_review,
        fraud_health          = EXCLUDED.fraud_health,
        executive_summary     = EXCLUDED.executive_summary,
        threat_vectors        = EXCLUDED.threat_vectors,
        rule_gaps             = EXCLUDED.rule_gaps,
        high_risk_patterns    = EXCLUDED.high_risk_patterns,
        watchlist_assessment  = EXCLUDED.watchlist_assessment,
        false_positive_analysis = EXCLUDED.false_positive_analysis,
        platform_risk_flags   = EXCLUDED.platform_risk_flags,
        quick_wins            = EXCLUDED.quick_wins,
        recommendations       = EXCLUDED.recommendations,
        generated_at          = NOW()
    `, [
      'latest',
      totalCases, confirmedFraud, pendingReview,
      ai.fraud_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.threat_vectors ?? []),
      JSON.stringify(ai.rule_gaps ?? []),
      JSON.stringify(ai.high_risk_patterns ?? []),
      ai.watchlist_assessment ?? null,
      ai.false_positive_analysis ?? null,
      ai.platform_risk_flags ?? [],
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_fraud_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-fraud-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
