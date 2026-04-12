'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_compliance_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_erasure_requests INT        NOT NULL DEFAULT 0,
      overdue_erasures      INT         NOT NULL DEFAULT 0,
      total_data_exports    INT         NOT NULL DEFAULT 0,
      compliance_health     TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      sla_breaches          JSONB       NOT NULL DEFAULT '[]',
      regulation_risks      JSONB       NOT NULL DEFAULT '[]',
      erasure_backlog       TEXT,
      export_patterns       TEXT,
      breach_assessment     TEXT,
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-compliance-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_compliance_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Erasure request summary
    const erasures = await pool.query(`
      SELECT
        COUNT(*)                                                             AS total,
        COUNT(*) FILTER (WHERE status = 'pending')                          AS pending,
        COUNT(*) FILTER (WHERE status = 'completed')                        AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')                           AS failed,
        COUNT(*) FILTER (WHERE status IN ('pending','processing')
                           AND created_at < NOW() - INTERVAL '30 days')     AS overdue_30d,
        COUNT(*) FILTER (WHERE status IN ('pending','processing')
                           AND created_at < NOW() - INTERVAL '15 days')     AS overdue_15d
      FROM erasure_requests
    `).catch(() => ({ rows: [{}] }));

    // Erasure by regulation
    const erasureByLaw = await pool.query(`
      SELECT applicable_law,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'pending') AS pending,
             AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE status = 'completed') AS avg_days
      FROM erasure_requests
      GROUP BY applicable_law ORDER BY total DESC
    `).catch(() => ({ rows: [] }));

    // Data exports summary
    const exports = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last_30d
      FROM data_exports
    `).catch(() => ({ rows: [{}] }));

    // Export by regulation
    const exportsByLaw = await pool.query(`
      SELECT applicable_law,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'pending') AS pending,
             AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE status = 'completed') AS avg_days
      FROM data_exports
      GROUP BY applicable_law ORDER BY total DESC
    `).catch(() => ({ rows: [] }));

    // Compliance breaches (if table exists)
    const breaches = await pool.query(`
      SELECT severity, status, COUNT(*) AS count
      FROM compliance_breaches
      GROUP BY severity, status ORDER BY severity DESC
    `).catch(() => ({ rows: [] }));

    const e = erasures.rows[0] ?? {};
    const ex = exports.rows[0] ?? {};
    const overdueCount = parseInt(e.overdue_30d || 0);

    const prompt = `You are an AI Privacy Compliance Advisor for UTUBooking.com (Gulf travel platform operating in 25+ markets under multiple privacy regulations). Analyse the GDPR/PDPL/LGPD/CCPA/KVKK compliance posture and provide regulatory risk intelligence.

Erasure Request Summary (GDPR Art. 17 / Right to be Forgotten):
- Total: ${e.total} | Pending: ${e.pending} | Completed: ${e.completed} | Failed: ${e.failed}
- Overdue >30 days: ${e.overdue_30d} | Overdue >15 days: ${e.overdue_15d}
- SLA: GDPR requires erasure within 30 days; Saudi PDPL within 30 days

Erasure by Regulation:
${JSON.stringify(erasureByLaw.rows.map(r => ({
  law: r.applicable_law,
  total: parseInt(r.total), pending: parseInt(r.pending),
  avg_completion_days: r.avg_days ? Math.round(parseFloat(r.avg_days)) : null,
})))}

Data Export / Subject Access Requests:
- Total: ${ex.total} | Pending: ${ex.pending} | Completed: ${ex.completed} | Failed: ${ex.failed} | Last 30d: ${ex.last_30d}

Exports by Regulation:
${JSON.stringify(exportsByLaw.rows.map(r => ({
  law: r.applicable_law,
  total: parseInt(r.total), pending: parseInt(r.pending),
  avg_completion_days: r.avg_days ? Math.round(parseFloat(r.avg_days)) : null,
})))}

Breach Records:
${JSON.stringify(breaches.rows.map(r => ({ severity: r.severity, status: r.status, count: parseInt(r.count) })))}

Context:
- GDPR (EU): 30-day erasure SLA, 72-hour breach notification, €20M or 4% global turnover fine
- Saudi PDPL: 30-day erasure, up to SAR 5M fine, Saudi Arabia primary market
- LGPD (Brazil): 15-day DSR response time, ANPD breach notification 72h
- CCPA (California): 45-day response, Do Not Sell required
- KVKK (Turkey): 30-day response
- Overdue erasures = active regulatory exposure and potential enforcement action
- Failed erasures may indicate technical issues with shard cascade — critical engineering concern
- High pending-to-completed ratio = process bottleneck

Respond with ONLY a JSON object (no markdown fences):
{
  "compliance_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence DPO-level summary",
  "sla_breaches": [
    { "regulation": "...", "breach_type": "...", "count": 0, "risk": "...", "action": "..." }
  ],
  "regulation_risks": [
    { "regulation": "...", "risk_level": "critical|high|medium|low", "issue": "...", "remediation": "..." }
  ],
  "erasure_backlog": "paragraph on erasure backlog severity, SLA risk, and root cause hypothesis",
  "export_patterns": "paragraph on DSR/access request patterns and process health",
  "breach_assessment": "paragraph on breach severity distribution and notification compliance",
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
      INSERT INTO ai_compliance_advice
        (snapshot_key, total_erasure_requests, overdue_erasures, total_data_exports,
         compliance_health, executive_summary, sla_breaches, regulation_risks,
         erasure_backlog, export_patterns, breach_assessment, quick_wins, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_erasure_requests = EXCLUDED.total_erasure_requests,
        overdue_erasures       = EXCLUDED.overdue_erasures,
        total_data_exports     = EXCLUDED.total_data_exports,
        compliance_health      = EXCLUDED.compliance_health,
        executive_summary      = EXCLUDED.executive_summary,
        sla_breaches           = EXCLUDED.sla_breaches,
        regulation_risks       = EXCLUDED.regulation_risks,
        erasure_backlog        = EXCLUDED.erasure_backlog,
        export_patterns        = EXCLUDED.export_patterns,
        breach_assessment      = EXCLUDED.breach_assessment,
        quick_wins             = EXCLUDED.quick_wins,
        recommendations        = EXCLUDED.recommendations,
        generated_at           = NOW()
    `, [
      'latest',
      parseInt(e.total || 0), overdueCount, parseInt(ex.total || 0),
      ai.compliance_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.sla_breaches ?? []),
      JSON.stringify(ai.regulation_risks ?? []),
      ai.erasure_backlog ?? null,
      ai.export_patterns ?? null,
      ai.breach_assessment ?? null,
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_compliance_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-compliance-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
