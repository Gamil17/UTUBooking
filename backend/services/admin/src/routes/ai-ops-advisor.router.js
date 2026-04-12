'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_ops_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_incidents       INT         NOT NULL DEFAULT 0,
      open_incidents        INT         NOT NULL DEFAULT 0,
      open_tickets          INT         NOT NULL DEFAULT 0,
      ops_health            TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      critical_incidents    JSONB       NOT NULL DEFAULT '[]',
      sla_risks             JSONB       NOT NULL DEFAULT '[]',
      ticket_backlog        TEXT,
      incident_patterns     TEXT,
      platform_risk_flags   TEXT[]      NOT NULL DEFAULT '{}',
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-ops-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_ops_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Incident summary
    const incidents = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed'))           AS open,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved','closed')) AS critical_open,
        COUNT(*) FILTER (WHERE severity = 'high'     AND status NOT IN ('resolved','closed')) AS high_open,
        COUNT(*) FILTER (WHERE status = 'resolved')                           AS resolved,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')       AS last_7d,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE status = 'resolved') AS avg_resolution_hours
      FROM ops_incidents
    `).catch(() => ({ rows: [{}] }));

    // Critical/high open incidents
    const criticalIncidents = await pool.query(`
      SELECT title, severity, status, service_affected, assigned_to,
             created_at,
             EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
      FROM ops_incidents
      WHERE severity IN ('critical','high')
        AND status NOT IN ('resolved','closed')
      ORDER BY CASE severity WHEN 'critical' THEN 1 ELSE 2 END, created_at ASC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    // Incident trend by severity (last 30 days)
    const incidentTrend = await pool.query(`
      SELECT severity, COUNT(*) AS count,
             COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved
      FROM ops_incidents
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY severity ORDER BY count DESC
    `).catch(() => ({ rows: [] }));

    // Ticket summary
    const tickets = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed'))           AS open,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved','closed')) AS urgent_open,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')       AS last_7d,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed') AND created_at < NOW() - INTERVAL '3 days') AS stale_3d,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE status IN ('resolved','closed')) AS avg_resolution_hours
      FROM ops_support_tickets
    `).catch(() => ({ rows: [{}] }));

    // Ticket by category
    const byCategory = await pool.query(`
      SELECT category,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open,
             COUNT(*) FILTER (WHERE priority IN ('urgent','high')) AS high_priority
      FROM ops_support_tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY category ORDER BY total DESC LIMIT 10
    `).catch(() => ({ rows: [] }));

    const inc = incidents.rows[0] ?? {};
    const tix = tickets.rows[0] ?? {};

    const prompt = `You are an AI Operations Advisor for UTUBooking.com (Gulf travel platform — 25+ markets, AWS multi-region). Analyse the incident and support ticket queues, and provide operational health intelligence.

Incident Summary:
- Total incidents: ${inc.total} | Open: ${inc.open} | Resolved: ${inc.resolved}
- Critical open: ${inc.critical_open} | High open: ${inc.high_open}
- Last 7 days: ${inc.last_7d}
- Avg resolution time: ${inc.avg_resolution_hours ? Math.round(parseFloat(inc.avg_resolution_hours)) + ' hours' : 'N/A'}

Open Critical/High Incidents:
${JSON.stringify(criticalIncidents.rows.map(r => ({
  title: r.title, severity: r.severity, status: r.status,
  service: r.service_affected, assigned_to: r.assigned_to,
  age_hours: Math.round(parseFloat(r.age_hours || 0)),
})))}

Incident Trend (last 30 days by severity):
${JSON.stringify(incidentTrend.rows.map(r => ({
  severity: r.severity, count: parseInt(r.count), resolved: parseInt(r.resolved),
})))}

Support Ticket Summary:
- Total tickets: ${tix.total} | Open: ${tix.open} | Urgent open: ${tix.urgent_open}
- Last 7 days: ${tix.last_7d} | Stale >3 days: ${tix.stale_3d}
- Avg resolution time: ${tix.avg_resolution_hours ? Math.round(parseFloat(tix.avg_resolution_hours)) + ' hours' : 'N/A'}

Tickets by Category (last 30 days):
${JSON.stringify(byCategory.rows.map(r => ({
  category: r.category, total: parseInt(r.total),
  open: parseInt(r.open), high_priority: parseInt(r.high_priority),
})))}

Context:
- UTUBooking operates 24/7 across Gulf + Muslim World markets — downtime during Hajj/Umrah season is critical
- SLA benchmarks: P1/Critical = 1h resolution; P2/High = 4h; P3/Medium = 24h
- Stale tickets >3 days = support SLA breach risk
- >2 critical open incidents = "poor" health regardless of other metrics
- Peak risk periods: Hajj season (Dhul Hijjah), Ramadan, Umrah surges (Rajab/Sha'ban)
- Key services: booking engine, payment gateway, hotel search, flight search

Respond with ONLY a JSON object (no markdown fences):
{
  "ops_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence COO-level operational summary",
  "critical_incidents": [
    { "title": "...", "severity": "...", "service": "...", "age_hours": 0, "risk": "...", "recommended_action": "..." }
  ],
  "sla_risks": [
    { "type": "incident|ticket", "segment": "...", "count": 0, "breach_risk": "...", "action": "..." }
  ],
  "ticket_backlog": "paragraph on ticket backlog patterns, category hotspots, and resolution velocity",
  "incident_patterns": "paragraph on incident frequency, severity trends, and systemic risks",
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
      INSERT INTO ai_ops_advice
        (snapshot_key, total_incidents, open_incidents, open_tickets,
         ops_health, executive_summary, critical_incidents, sla_risks,
         ticket_backlog, incident_patterns, platform_risk_flags, quick_wins, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_incidents     = EXCLUDED.total_incidents,
        open_incidents      = EXCLUDED.open_incidents,
        open_tickets        = EXCLUDED.open_tickets,
        ops_health          = EXCLUDED.ops_health,
        executive_summary   = EXCLUDED.executive_summary,
        critical_incidents  = EXCLUDED.critical_incidents,
        sla_risks           = EXCLUDED.sla_risks,
        ticket_backlog      = EXCLUDED.ticket_backlog,
        incident_patterns   = EXCLUDED.incident_patterns,
        platform_risk_flags = EXCLUDED.platform_risk_flags,
        quick_wins          = EXCLUDED.quick_wins,
        recommendations     = EXCLUDED.recommendations,
        generated_at        = NOW()
    `, [
      'latest',
      parseInt(inc.total || 0), parseInt(inc.open || 0), parseInt(tix.open || 0),
      ai.ops_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.critical_incidents ?? []),
      JSON.stringify(ai.sla_risks ?? []),
      ai.ticket_backlog ?? null,
      ai.incident_patterns ?? null,
      ai.platform_risk_flags ?? [],
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_ops_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-ops-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
