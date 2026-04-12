'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_legal_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_matters         INT         NOT NULL DEFAULT 0,
      open_matters          INT         NOT NULL DEFAULT 0,
      overdue_tasks         INT         NOT NULL DEFAULT 0,
      legal_health          TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      critical_matters      JSONB       NOT NULL DEFAULT '[]',
      jurisdiction_risks    JSONB       NOT NULL DEFAULT '[]',
      overdue_tasks_list    JSONB       NOT NULL DEFAULT '[]',
      contract_alerts       JSONB       NOT NULL DEFAULT '[]',
      compliance_gaps       TEXT[]      NOT NULL DEFAULT '{}',
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-legal-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_legal_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Matter summary by status & urgency
    const matters = await pool.query(`
      SELECT
        COUNT(*)                                                AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','won','lost')) AS open,
        COUNT(*) FILTER (WHERE urgency = 'critical')           AS critical,
        COUNT(*) FILTER (WHERE urgency = 'high')               AS high,
        COUNT(*) FILTER (WHERE status = 'closed')              AS closed,
        COUNT(DISTINCT jurisdiction)                           AS jurisdictions,
        COUNT(DISTINCT client_name)                            AS clients,
        COALESCE(SUM(estimated_value_sar) FILTER (WHERE status NOT IN ('closed','won','lost')), 0) AS open_value_sar
      FROM legal_matters
    `).catch(() => ({ rows: [{}] }));

    // Critical / high urgency open matters
    const criticalMatters = await pool.query(`
      SELECT title, matter_type, status, urgency, jurisdiction,
             estimated_value_sar, deadline, assigned_to, client_name,
             (deadline::date - CURRENT_DATE) AS days_to_deadline
      FROM legal_matters
      WHERE urgency IN ('critical','high')
        AND status NOT IN ('closed','won','lost')
      ORDER BY CASE urgency WHEN 'critical' THEN 1 ELSE 2 END,
               deadline ASC NULLS LAST
      LIMIT 15
    `).catch(() => ({ rows: [] }));

    // Jurisdiction breakdown
    const jurisdictions = await pool.query(`
      SELECT jurisdiction,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status NOT IN ('closed','won','lost')) AS open,
             COUNT(*) FILTER (WHERE urgency = 'critical') AS critical
      FROM legal_matters
      GROUP BY jurisdiction ORDER BY open DESC LIMIT 15
    `).catch(() => ({ rows: [] }));

    // Overdue tasks
    const overdueTasks = await pool.query(`
      SELECT title, task_type, priority, assignee, due_date,
             (CURRENT_DATE - due_date::date) AS days_overdue
      FROM legal_compliance_tasks
      WHERE status NOT IN ('completed','cancelled')
        AND due_date::date < CURRENT_DATE
      ORDER BY priority DESC, days_overdue DESC LIMIT 15
    `).catch(() => ({ rows: [] }));

    // Task summary
    const tasks = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled') AND due_date::date < CURRENT_DATE) AS overdue,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled') AND due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14) AS due_14d
      FROM legal_compliance_tasks
    `).catch(() => ({ rows: [{}] }));

    // Document registry summary
    const docs = await pool.query(`
      SELECT doc_type, COUNT(*) AS count,
             COUNT(*) FILTER (WHERE expiry_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 60) AS expiring_60d
      FROM legal_documents
      WHERE status = 'active'
      GROUP BY doc_type ORDER BY count DESC LIMIT 10
    `).catch(() => ({ rows: [] }));

    const m = matters.rows[0] ?? {};
    const t = tasks.rows[0] ?? {};

    const prompt = `You are an AI Legal Advisor for UTUBooking.com (Gulf travel platform operating across 25+ markets). Analyse the legal matter portfolio and compliance task queue, and provide strategic legal risk intelligence.

Matter Portfolio:
- Total matters: ${m.total} | Open: ${m.open} | Closed: ${m.closed}
- Critical urgency: ${m.critical} | High urgency: ${m.high}
- Jurisdictions covered: ${m.jurisdictions} | Clients: ${m.clients}
- Open matter value: SAR ${parseFloat(m.open_value_sar || 0).toLocaleString()}

Critical/High Urgency Open Matters:
${JSON.stringify(criticalMatters.rows.map(r => ({
  title: r.title, type: r.matter_type, status: r.status, urgency: r.urgency,
  jurisdiction: r.jurisdiction, client: r.client_name,
  value_sar: Math.round(parseFloat(r.estimated_value_sar || 0)),
  days_to_deadline: r.days_to_deadline != null ? parseInt(r.days_to_deadline) : null,
  assigned_to: r.assigned_to,
})))}

Jurisdiction Breakdown:
${JSON.stringify(jurisdictions.rows.map(r => ({
  jurisdiction: r.jurisdiction, total: parseInt(r.total), open: parseInt(r.open), critical: parseInt(r.critical),
})))}

Compliance Task Queue:
- Total tasks: ${t.total} | Completed: ${t.completed} | Overdue: ${t.overdue} | Due in 14 days: ${t.due_14d}

Overdue Tasks:
${JSON.stringify(overdueTasks.rows.map(r => ({
  title: r.title, type: r.task_type, priority: r.priority,
  assignee: r.assignee, days_overdue: parseInt(r.days_overdue || 0),
})))}

Document Registry (active docs):
${JSON.stringify(docs.rows.map(r => ({
  type: r.doc_type, count: parseInt(r.count), expiring_60d: parseInt(r.expiring_60d || 0),
})))}

Context:
- UTUBooking operates in Saudi Arabia (ZATCA, VAT, Vision 2030 compliance), UAE (DIFC), Egypt, and 20+ Muslim World markets
- Saudi commercial law applies to the primary entity; cross-border contracts require jurisdiction-specific clauses
- Critical legal risks: payment disputes, hotel/flight supplier contracts, data privacy (PDPL Saudi + GDPR EU), employment law
- Overdue compliance tasks = regulatory exposure; >10% overdue = systemic risk
- Open value SAR >1M critical matter = board-level visibility required

Respond with ONLY a JSON object (no markdown fences):
{
  "legal_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence CLegal-level summary",
  "critical_matters": [
    { "title": "...", "type": "...", "jurisdiction": "...", "risk": "...", "recommended_action": "...", "urgency": "immediate|this_week|this_month" }
  ],
  "jurisdiction_risks": [
    { "jurisdiction": "...", "risk": "...", "open_matters": 0, "action": "..." }
  ],
  "overdue_tasks_list": [
    { "task": "...", "days_overdue": 0, "consequence": "...", "action": "..." }
  ],
  "contract_alerts": [
    { "doc_type": "...", "count_expiring": 0, "risk": "...", "action": "..." }
  ],
  "compliance_gaps": ["gap 1", "gap 2"],
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
      INSERT INTO ai_legal_advice
        (snapshot_key, total_matters, open_matters, overdue_tasks, legal_health,
         executive_summary, critical_matters, jurisdiction_risks, overdue_tasks_list,
         contract_alerts, compliance_gaps, quick_wins, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_matters       = EXCLUDED.total_matters,
        open_matters        = EXCLUDED.open_matters,
        overdue_tasks       = EXCLUDED.overdue_tasks,
        legal_health        = EXCLUDED.legal_health,
        executive_summary   = EXCLUDED.executive_summary,
        critical_matters    = EXCLUDED.critical_matters,
        jurisdiction_risks  = EXCLUDED.jurisdiction_risks,
        overdue_tasks_list  = EXCLUDED.overdue_tasks_list,
        contract_alerts     = EXCLUDED.contract_alerts,
        compliance_gaps     = EXCLUDED.compliance_gaps,
        quick_wins          = EXCLUDED.quick_wins,
        recommendations     = EXCLUDED.recommendations,
        generated_at        = NOW()
    `, [
      'latest',
      parseInt(m.total || 0), parseInt(m.open || 0), parseInt(t.overdue || 0),
      ai.legal_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.critical_matters ?? []),
      JSON.stringify(ai.jurisdiction_risks ?? []),
      JSON.stringify(ai.overdue_tasks_list ?? []),
      JSON.stringify(ai.contract_alerts ?? []),
      ai.compliance_gaps ?? [],
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_legal_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-legal-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
