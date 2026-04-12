'use strict';

/**
 * briefing-generator.js
 *
 * Gathers live data from all 17 AI assistant tools in parallel,
 * passes the compiled snapshot to Claude, and generates a structured
 * daily executive briefing in Markdown.
 *
 * Called by:
 *  - daily-briefing.job.js  (automated, 08:00 Riyadh time)
 *  - ai-briefing.router.js  (manual trigger via POST /generate)
 */

const http      = require('http');
const { Pool }  = require('pg');
const Anthropic  = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

const ADMIN_SECRET  = () => process.env.ADMIN_SECRET  || '';
const WORKFLOW_HOST = () => process.env.WORKFLOW_SERVICE_HOST || 'workflow-service';
const WORKFLOW_PORT = () => parseInt(process.env.WORKFLOW_SERVICE_PORT || '3014', 10);
const NOTIF_HOST    = () => process.env.NOTIFICATION_SERVICE_HOST || 'notification-service';
const NOTIF_PORT    = () => parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3002', 10);

// ── DB bootstrap (idempotent) ─────────────────────────────────────────────────

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_daily_briefings (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      briefing_date  DATE        NOT NULL UNIQUE,
      content_md     TEXT        NOT NULL,
      tool_calls     TEXT[]      NOT NULL DEFAULT '{}',
      generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
ensureTable().catch(e => console.error('[briefing] table bootstrap error:', e.message));

// ── Internal HTTP helpers ─────────────────────────────────────────────────────

function internalGet(host, port, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port,
      path,
      method:  'GET',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': ADMIN_SECRET(),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// ── Data gathering — all sources in parallel ──────────────────────────────────

async function gatherWorkflowData() {
  const [overview, byDept, bottlenecks, overdue, dashboard, trend] = await Promise.all([
    internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/overview').then(d => d?.data ?? d),
    internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/by-department').then(d => d?.data ?? d),
    internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/bottlenecks?limit=5').then(d => d?.data ?? d),
    internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/tasks/overdue?limit=15').then(d => d ?? []),
    internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/tasks/dashboard').then(d => d?.data ?? d),
    internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/trend').then(d => d?.data ?? d),
  ]);
  return { overview, by_department: byDept, bottlenecks, overdue_steps: overdue, dashboard, trend };
}

async function gatherFinanceData() {
  try {
    const [inv, exp, budgets] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')                                         AS pending_count,
          COUNT(*) FILTER (WHERE status = 'overdue'
                             OR (status = 'pending' AND due_date < CURRENT_DATE))            AS overdue_count,
          COALESCE(SUM(amount_sar) FILTER (WHERE status = 'pending'), 0)                     AS pending_sar,
          COALESCE(SUM(amount_sar) FILTER (WHERE status = 'paid'
                                            AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS paid_this_month_sar
        FROM finance_invoices
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')                    AS pending_count,
          COUNT(*) FILTER (WHERE status = 'pending'
                             AND created_at < NOW() - INTERVAL '48 hours') AS overdue_48h,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)    AS pending_sar
        FROM finance_expense_claims
      `),
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'draft') AS draft_budgets,
               COUNT(*) FILTER (WHERE status = 'approved') AS approved_budgets
        FROM finance_budgets WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
    ]);

    const pendingClaims = await pool.query(`
      SELECT employee_name, category, amount, currency, claim_date,
             ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) AS hours_waiting
      FROM finance_expense_claims WHERE status = 'pending'
      ORDER BY created_at ASC LIMIT 5
    `);

    return {
      invoices:       inv.rows[0],
      expense_claims: exp.rows[0],
      budgets:        budgets.rows[0],
      top_pending_claims: pendingClaims.rows,
    };
  } catch (e) { return { error: e.message }; }
}

async function gatherHrData() {
  try {
    const [headcount, leave] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')    AS active,
          COUNT(*) FILTER (WHERE status = 'on_leave')  AS on_leave,
          COUNT(*) FILTER (WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
                             AND status != 'terminated') AS new_hires_30d
        FROM hr_employees
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')                              AS pending,
          COUNT(*) FILTER (WHERE status = 'pending'
                             AND created_at < NOW() - INTERVAL '48 hours')        AS overdue_48h,
          COUNT(*) FILTER (WHERE status = 'approved' AND start_date >= CURRENT_DATE) AS upcoming
        FROM hr_leave_requests
      `),
    ]);

    const pendingLeave = await pool.query(`
      SELECT e.full_name, lr.leave_type, lr.start_date, lr.days,
             ROUND(EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600) AS hours_waiting
      FROM hr_leave_requests lr
      JOIN hr_employees e ON e.id = lr.employee_id
      WHERE lr.status = 'pending'
      ORDER BY lr.created_at ASC LIMIT 5
    `);

    return {
      headcount:      headcount.rows[0],
      leave:          leave.rows[0],
      pending_leave:  pendingLeave.rows,
    };
  } catch (e) { return { error: e.message }; }
}

async function gatherSalesData() {
  try {
    const [pipeline, stale] = await Promise.all([
      pool.query(`
        SELECT stage, COUNT(*) AS deals, COALESCE(SUM(value_amount), 0) AS total_sar
        FROM crm_deals WHERE stage NOT IN ('won','lost')
        GROUP BY stage ORDER BY CASE stage
          WHEN 'lead' THEN 1 WHEN 'qualified' THEN 2 WHEN 'demo' THEN 3
          WHEN 'proposal' THEN 4 WHEN 'negotiation' THEN 5 ELSE 6 END
      `),
      pool.query(`
        SELECT title, partner_name, stage, deal_owner,
               ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400) AS days_stale,
               value_amount AS value_sar, ceo_review_required
        FROM crm_deals
        WHERE stage NOT IN ('won','lost')
          AND (updated_at < NOW() - INTERVAL '14 days'
               OR (next_action_date IS NOT NULL AND next_action_date < CURRENT_DATE)
               OR ceo_review_required = TRUE)
        ORDER BY days_stale DESC NULLS LAST LIMIT 5
      `),
    ]);

    const monthly = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE stage = 'won'
                           AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)) AS won_mtd,
        COALESCE(SUM(value_amount) FILTER (WHERE stage = 'won'
                                            AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS won_sar_mtd
      FROM crm_deals
    `);

    return {
      pipeline:          pipeline.rows,
      deals_at_risk:     stale.rows,
      month_to_date:     monthly.rows[0],
    };
  } catch (e) { return { error: e.message }; }
}

async function gatherCsData() {
  try {
    const [accounts, escalations, atRisk] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')          AS active,
          COUNT(*) FILTER (WHERE status = 'at_risk')         AS at_risk,
          COUNT(*) FILTER (WHERE status = 'churned')         AS churned,
          ROUND(AVG(health_score) FILTER (WHERE status != 'churned')) AS avg_health
        FROM cs_accounts
      `),
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE status IN ('open','in_progress'))              AS open,
               COUNT(*) FILTER (WHERE status IN ('open','in_progress')
                                  AND priority IN ('critical','high'))               AS critical_high
        FROM cs_escalations
      `),
      pool.query(`
        SELECT name, tier, health_score, churn_risk, ltv_sar
        FROM cs_accounts
        WHERE status = 'at_risk' OR health_score < 40 OR churn_risk IN ('critical','high')
        ORDER BY health_score ASC, ltv_sar DESC LIMIT 5
      `),
    ]);
    return {
      accounts:     accounts.rows[0],
      escalations:  escalations.rows[0],
      at_risk_top5: atRisk.rows,
    };
  } catch (e) { return { error: e.message }; }
}

async function gatherProcurementData() {
  try {
    const [contracts, slas, expiring] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active') AS expiring_30d,
          COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '90 days' AND status = 'active') AS expiring_90d
        FROM procurement_contracts
      `),
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'breached') AS breached,
               COUNT(*) FILTER (WHERE status = 'at_risk')  AS at_risk
        FROM procurement_slas
      `),
      pool.query(`
        SELECT supplier_name, title, end_date,
               (end_date - CURRENT_DATE) AS days_left, auto_renews
        FROM procurement_contracts WHERE status = 'active'
          AND end_date <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY end_date ASC LIMIT 5
      `),
    ]);
    return {
      contracts:          contracts.rows[0],
      sla_health:         slas.rows[0],
      expiring_contracts: expiring.rows,
    };
  } catch (e) { return { error: e.message }; }
}

// ── Claude briefing generation ────────────────────────────────────────────────

const BRIEFING_SYSTEM = `You are the UTUBooking.com Daily Executive Briefing AI. You generate a concise, high-signal daily operations report for the AMEC Solutions leadership team.

Rules:
- Lead each section with the most critical item
- Prefix urgent items with "URGENT:"
- Format SAR amounts with comma separators (e.g. SAR 145,000)
- Use bullet points, not prose paragraphs
- Flag red flags prominently: overdue SLAs, high-churn accounts, stale deals, expiring contracts without auto-renew
- Keep each section to 4-7 bullets maximum
- Be factual — only report what the data shows, never invent numbers
- Company currency is SAR (Saudi Riyal)
- Platform: UTUBooking.com multi-market travel booking (Hotels, Flights, Cars) — Gulf & Hajj/Umrah focus`;

async function generateBriefing(data, dateStr) {
  const dataContext = JSON.stringify(data, null, 2);

  const userPrompt = `Generate the daily executive briefing for ${dateStr}.

LIVE OPERATIONAL DATA (JSON):
${dataContext}

Write a structured Markdown briefing with EXACTLY these sections in this order:

# Daily Operations Briefing — ${dateStr}

## Executive Summary
(3-5 high-signal bullets covering the most critical issues across all departments)

## Key Actions Required
(Prioritised action list — URGENT items first. Be specific: name, amount, deadline)

## Workflow Operations
(SLA health, overdue steps, approval rates, bottlenecks)

## Finance
(Pending invoices, overdue claims, budget status)

## Human Resources
(Headcount, pending leave, new hires)

## Sales Pipeline
(Pipeline by stage, deals at risk, month-to-date wins)

## Customer Success
(Account health, at-risk accounts, open escalations)

## Procurement
(Expiring contracts — highlight those without auto-renew, SLA breaches)

Keep the entire briefing under 800 words. Omit sections where no data is available or there are no notable items.`;

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 3000,
    system:     BRIEFING_SYSTEM,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? '# Briefing unavailable\n\nFailed to generate briefing content.';
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function storeBriefing(dateStr, contentMd, toolCalls) {
  const { rows } = await pool.query(`
    INSERT INTO ai_daily_briefings (briefing_date, content_md, tool_calls)
    VALUES ($1, $2, $3)
    ON CONFLICT (briefing_date) DO UPDATE
      SET content_md   = EXCLUDED.content_md,
          tool_calls   = EXCLUDED.tool_calls,
          generated_at = NOW()
    RETURNING *
  `, [dateStr, contentMd, toolCalls]);
  return rows[0];
}

// ── Main entry point ──────────────────────────────────────────────────────────

async function runDailyBriefing() {
  const dateStr = new Date().toISOString().split('T')[0];
  console.log(`[briefing] generating for ${dateStr}...`);

  // Gather all data in parallel
  const [workflow, finance, hr, sales, cs, procurement] = await Promise.all([
    gatherWorkflowData(),
    gatherFinanceData(),
    gatherHrData(),
    gatherSalesData(),
    gatherCsData(),
    gatherProcurementData(),
  ]);

  const allData = { workflow, finance, hr, sales, customer_success: cs, procurement };
  const toolCalls = ['workflow_overview','workflow_by_department','workflow_bottlenecks',
                     'workflow_overdue','workflow_dashboard','workflow_trend',
                     'finance_summary','finance_expense_claims',
                     'hr_summary','hr_leave_requests',
                     'sales_pipeline','deals_at_risk',
                     'cs_summary','procurement_summary'];

  // Generate with Claude
  const contentMd = await generateBriefing(allData, dateStr);

  // Store in DB
  const briefing = await storeBriefing(dateStr, contentMd, toolCalls);
  console.log(`[briefing] stored id=${briefing.id} date=${dateStr}`);

  return briefing;
}

module.exports = { runDailyBriefing };
