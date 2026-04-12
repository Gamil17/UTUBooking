'use strict';

/**
 * AI KPI Anomaly Root Cause Analyzer
 *
 * Registered in app.js as:
 *   app.use('/api/admin/kpi-analyzer', requireAdmin, aiKpiAnalyzerRouter)
 *
 * GET  /          — list recent analyses (newest first)
 * GET  /:alertId  — fetch existing analysis (404 if none)
 * POST /:alertId  — run AI root cause analysis, store & return result
 *
 * Claude output schema:
 *   root_cause_dept     string   — which department owns the root cause
 *   root_cause_summary  string   — 2-3 sentence root cause narrative
 *   confidence          'high' | 'medium' | 'low'
 *   contributing_factors string[] — specific signals contributing to the miss
 *   ruling_out          string[] — factors that appear NOT to be the cause
 *   recommended_actions { department, action }[] — per-dept action items
 *   escalate_to         string[] — roles that should be notified immediately
 *   monitoring_signals  string[] — what to watch to confirm recovery
 */

const express  = require('express');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_kpi_analyses (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      alert_id             UUID        NOT NULL UNIQUE,
      alert_name           TEXT,
      kpi_name             TEXT,
      kpi_category         TEXT,
      metric_key           TEXT,
      target_value         NUMERIC(16,4),
      current_value        NUMERIC(16,4),
      unit                 TEXT,
      root_cause_dept      TEXT        NOT NULL,
      root_cause_summary   TEXT        NOT NULL,
      confidence           TEXT        NOT NULL
                                       CHECK (confidence IN ('high','medium','low')),
      contributing_factors TEXT[]      NOT NULL DEFAULT '{}',
      ruling_out           TEXT[]      NOT NULL DEFAULT '{}',
      recommended_actions  JSONB       NOT NULL DEFAULT '[]',
      escalate_to          TEXT[]      NOT NULL DEFAULT '{}',
      monitoring_signals   TEXT[]      NOT NULL DEFAULT '{}',
      generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-kpi-analyzer] bootstrap error:', e.message));

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Chief Analytics Officer AI for UTUBooking.com, a travel booking platform serving the Gulf and Muslim World (Hotels, Flights, Cars, Hajj/Umrah). You specialise in root cause analysis when KPIs miss their targets.

Company context:
- Platform: Hotels, Flights, Car Rentals, Hajj/Umrah packages
- Primary market: Saudi Arabia / GCC. Secondary: Egypt, Turkey, SE Asia, EU diaspora
- Revenue model: booking commissions, SaaS white-label, advertising
- Key seasonal events: Hajj (Dhul Hijjah), Umrah (year-round, peaks in Ramadan), GCC school holidays, Eid Al-Fitr, Eid Al-Adha

KPI categories and their typical root cause owners:
- revenue: Finance (pricing), Revenue Management (rules/blackouts), Sales (pipeline), Marketing (campaigns)
- conversion: Products (UX/features), Dev (performance/bugs), Marketing (landing pages/campaigns), Pricing (AI model)
- bookings: Sales (B2B), Marketing (demand gen), Ops (availability/errors), Revenue (pricing rules)
- users: Marketing (acquisition), Products (retention features), CS (churn)
- retention: CS (health scores, escalations), Products (engagement), Marketing (CRM)
- operations: Ops (incidents, ticket resolution), Dev (deployments, bugs), Infrastructure (latency/uptime)

Cross-department signals to consider:
- Recent incidents (Ops) may cause conversion drops
- Pricing rule changes (Revenue) may suppress booking volume
- Feature flag activations (Products) may introduce regressions
- Marketing campaign pauses may reduce user acquisition
- Fraud rule changes may block legitimate bookings (especially Hajj/Umrah customers from diaspora)
- Seasonal effects: Hajj week = massive spike; post-Hajj = demand cliff; Ramadan Umrah = sustained high demand

Analysis rules:
- Be specific: name likely root causes with reasoning, not generic platitudes
- confidence 'high' = strong signal from data; 'medium' = likely but needs verification; 'low' = hypothesis needs investigation
- recommended_actions must include DEPARTMENT and a concrete ACTION ITEM (verb-led, specific)
- Output ONLY valid JSON — no markdown fences, no commentary

Output this exact JSON structure:
{
  "root_cause_dept": "<primary responsible department>",
  "root_cause_summary": "<2-3 sentence root cause narrative>",
  "confidence": "<high|medium|low>",
  "contributing_factors": ["<specific contributing signal 1>", "..."],
  "ruling_out": ["<factor that appears NOT to be the cause>", "..."],
  "recommended_actions": [
    { "department": "<dept>", "action": "<specific action item>" }
  ],
  "escalate_to": ["<role to notify immediately>"],
  "monitoring_signals": ["<what to watch to confirm root cause or recovery>"]
}`;

// ── GET / — list recent analyses ──────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);
  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, alert_id, alert_name, kpi_name, kpi_category, root_cause_dept,
               confidence, generated_at
        FROM ai_kpi_analyses
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_kpi_analyses'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:alertId — fetch existing analysis ───────────────────────────────────

router.get('/:alertId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_kpi_analyses WHERE alert_id = $1',
      [req.params.alertId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:alertId — run AI root cause analysis ───────────────────────────────

router.post('/:alertId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { alertId } = req.params;

  // Load alert + linked KPI target
  let alert, kpi;
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id AS alert_id, a.name AS alert_name, a.condition, a.threshold,
        a.last_fired_at, a.active,
        k.id AS kpi_id, k.name AS kpi_name, k.category AS kpi_category,
        k.metric_key, k.target_value, k.current_value, k.unit, k.period, k.owner, k.updated_at
      FROM bi_alerts a
      LEFT JOIN bi_kpi_targets k ON k.id = a.kpi_target_id
      WHERE a.id = $1
    `, [alertId]);
    if (!rows[0]) return res.status(404).json({ error: 'ALERT_NOT_FOUND' });
    alert = rows[0];
    kpi   = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Gather cross-department context in parallel
  const [recentIncidents, recentDeploys, fraudRuleChanges, recentExpenses,
         openEscalations, activeCampaigns, recentDeals] = await Promise.all([
    pool.query(`SELECT title, severity, status, started_at FROM ops_incidents
                WHERE started_at > NOW() - INTERVAL '14 days'
                ORDER BY started_at DESC LIMIT 5`).catch(() => ({ rows: [] })),
    pool.query(`SELECT service, environment, status, created_at FROM dev_deployments
                WHERE created_at > NOW() - INTERVAL '14 days'
                ORDER BY created_at DESC LIMIT 5`).catch(() => ({ rows: [] })),
    pool.query(`SELECT name, type, action, severity, created_at FROM fraud_rules
                WHERE created_at > NOW() - INTERVAL '14 days'
                ORDER BY created_at DESC LIMIT 5`).catch(() => ({ rows: [] })),
    pool.query(`SELECT SUM(total_amount) AS total, COUNT(*) AS count FROM finance_expense_claims
                WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'approved'`).catch(() => ({ rows: [] })),
    pool.query(`SELECT COUNT(*) AS count FROM cs_escalations
                WHERE status NOT IN ('resolved','closed')`).catch(() => ({ rows: [] })),
    pool.query(`SELECT name, channel, status FROM marketing_campaigns
                WHERE status IN ('live','scheduled')
                LIMIT 5`).catch(() => ({ rows: [] })),
    pool.query(`SELECT stage, COUNT(*) AS count, SUM(value_sar) AS value
                FROM crm_deals WHERE stage NOT IN ('closed_won','closed_lost')
                GROUP BY stage ORDER BY stage`).catch(() => ({ rows: [] })),
  ]);

  // Compute miss magnitude
  const gap = kpi.target_value && kpi.current_value
    ? ((kpi.current_value - kpi.target_value) / kpi.target_value * 100).toFixed(1)
    : null;

  const userPrompt = `Analyse this KPI anomaly for UTUBooking.com and return a root cause assessment as JSON only.

KPI ALERT
Alert Name:    ${alert.alert_name}
Condition:     ${alert.condition?.replace(/_/g,' ')}
Threshold:     ${alert.threshold ?? 'N/A'}
Last Fired:    ${alert.last_fired_at ?? 'Unknown'}

KPI: ${kpi.kpi_name ?? 'N/A'}
Category:      ${kpi.kpi_category ?? 'N/A'}
Metric Key:    ${kpi.metric_key ?? 'N/A'}
Target:        ${kpi.target_value ?? 'N/A'} ${kpi.unit ?? ''}
Current Value: ${kpi.current_value ?? 'Unknown'} ${kpi.unit ?? ''}
Gap:           ${gap !== null ? `${gap}% vs target` : 'Unknown'}
Period:        ${kpi.period ?? 'N/A'}
KPI Owner:     ${kpi.owner ?? 'Unassigned'}
Last Updated:  ${kpi.updated_at ?? 'Unknown'}

CROSS-DEPARTMENT CONTEXT (last 14 days)
───────────────────────────────────────
Recent Incidents (Ops):
${recentIncidents.rows.map(i => `  - ${i.severity?.toUpperCase()} | ${i.title} | ${i.status} | ${i.started_at}`).join('\n') || '  None'}

Recent Production Deployments (Dev):
${recentDeploys.rows.map(d => `  - ${d.service} (${d.environment}) | ${d.status} | ${d.created_at}`).join('\n') || '  None'}

Recent Fraud Rule Changes:
${fraudRuleChanges.rows.map(r => `  - ${r.name} | action:${r.action} | severity:${r.severity} | ${r.created_at}`).join('\n') || '  None'}

Open Customer Escalations: ${openEscalations.rows[0]?.count ?? 0}
Active/Scheduled Campaigns: ${activeCampaigns.rows.map(c => `${c.name} (${c.channel}, ${c.status})`).join(', ') || 'None'}
Live CRM Pipeline: ${recentDeals.rows.map(d => `${d.stage}: ${d.count} deals (${Math.round((d.value||0)/1000)}k SAR)`).join(', ') || 'No data'}

Based on the KPI miss and cross-department signals above, identify the most likely root cause and provide actionable next steps. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
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

    const validConf = new Set(['high', 'medium', 'low']);
    const confidence = validConf.has(parsed.confidence) ? parsed.confidence : 'medium';

    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_kpi_analyses
        (alert_id, alert_name, kpi_name, kpi_category, metric_key,
         target_value, current_value, unit,
         root_cause_dept, root_cause_summary, confidence,
         contributing_factors, ruling_out, recommended_actions,
         escalate_to, monitoring_signals)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (alert_id) DO UPDATE SET
        alert_name           = EXCLUDED.alert_name,
        kpi_name             = EXCLUDED.kpi_name,
        kpi_category         = EXCLUDED.kpi_category,
        metric_key           = EXCLUDED.metric_key,
        target_value         = EXCLUDED.target_value,
        current_value        = EXCLUDED.current_value,
        unit                 = EXCLUDED.unit,
        root_cause_dept      = EXCLUDED.root_cause_dept,
        root_cause_summary   = EXCLUDED.root_cause_summary,
        confidence           = EXCLUDED.confidence,
        contributing_factors = EXCLUDED.contributing_factors,
        ruling_out           = EXCLUDED.ruling_out,
        recommended_actions  = EXCLUDED.recommended_actions,
        escalate_to          = EXCLUDED.escalate_to,
        monitoring_signals   = EXCLUDED.monitoring_signals,
        generated_at         = NOW()
      RETURNING *
    `, [
      alertId,
      alert.alert_name,
      kpi.kpi_name   ?? null,
      kpi.kpi_category ?? null,
      kpi.metric_key ?? null,
      kpi.target_value  ?? null,
      kpi.current_value ?? null,
      kpi.unit ?? null,
      parsed.root_cause_dept      ?? 'Unknown',
      parsed.root_cause_summary   ?? '',
      confidence,
      parsed.contributing_factors  ?? [],
      parsed.ruling_out            ?? [],
      JSON.stringify(parsed.recommended_actions ?? []),
      parsed.escalate_to           ?? [],
      parsed.monitoring_signals    ?? [],
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-kpi-analyzer] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
