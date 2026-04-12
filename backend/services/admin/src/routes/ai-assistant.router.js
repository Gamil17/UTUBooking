'use strict';

/**
 * Admin AI Assistant — POST /api/admin/ai-assistant/chat
 *
 * A Claude claude-sonnet-4-6-powered chat endpoint for admin users.
 * Answers natural-language questions about any part of the platform
 * by calling internal APIs and direct DB queries as Claude tools,
 * then synthesising a plain-English answer.
 *
 * Auth: requireAdmin (JWT or x-admin-secret) — applied at app.js level
 *
 * Coverage (17 tools):
 *   Workflow (9): stats, overview, by-department, bottlenecks, definitions,
 *                 overdue, dashboard, active-instances, trend
 *   Finance  (2): summary (invoices + expenses + budgets), pending expense claims
 *   HR       (2): summary (headcount + leave), pending leave requests
 *   Sales    (2): pipeline by stage, deals needing attention
 *   CS       (1): summary + at-risk accounts
 *   Procurement (1): contracts expiring + SLA breaches
 *
 * Request:  { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 * Response: { response: string, tool_calls_made: string[] }
 */

const express   = require('express');
const http      = require('http');
const { Pool }  = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Shared DB pool for direct admin-DB queries (Finance, HR, Sales, CS, Procurement)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

const ADMIN_SECRET  = () => process.env.ADMIN_SECRET || '';
const WORKFLOW_HOST = () => process.env.WORKFLOW_SERVICE_HOST || 'workflow-service';
const WORKFLOW_PORT = () => parseInt(process.env.WORKFLOW_SERVICE_PORT || '3014', 10);

// ── Internal HTTP helper (workflow service) ───────────────────────────────────

function internalGet(host, port, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port,
      path,
      method:   'GET',
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
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

// ── Workflow tools (via HTTP to workflow-service) ─────────────────────────────

async function toolGetWorkflowStats() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/tasks/stats');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

async function toolGetWorkflowOverview() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/overview');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

async function toolGetWorkflowByDepartment() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/by-department');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

async function toolGetWorkflowBottlenecks() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/bottlenecks?limit=5');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

async function toolGetWorkflowDefinitions() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/by-definition?limit=20');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

async function toolGetOverdueWorkflows() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/tasks/overdue?limit=20');
    return data ?? [];
  } catch (e) { return { error: e.message }; }
}

async function toolGetWorkflowDashboard() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/tasks/dashboard');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

async function toolGetActiveInstances() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/instances?status=in_progress&limit=20');
    return data ?? [];
  } catch (e) { return { error: e.message }; }
}

async function toolGetWorkflowTrend() {
  try {
    const data = await internalGet(WORKFLOW_HOST(), WORKFLOW_PORT(), '/api/workflow/analytics/trend');
    return data?.data ?? data;
  } catch (e) { return { error: e.message }; }
}

// ── Finance tools (direct DB) ─────────────────────────────────────────────────

async function toolGetFinanceSummary() {
  try {
    const [invoices, expenses, budgets] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                   AS total_invoices,
          COUNT(*) FILTER (WHERE status = 'pending')                AS pending_invoices,
          COUNT(*) FILTER (WHERE status = 'overdue'
                             OR (status = 'pending' AND due_date < CURRENT_DATE)) AS overdue_invoices,
          COALESCE(SUM(amount_sar) FILTER (WHERE status = 'pending'), 0) AS pending_amount_sar,
          COALESCE(SUM(amount_sar) FILTER (WHERE status = 'paid'), 0)    AS paid_this_month_sar
        FROM finance_invoices
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) OR status IN ('pending','overdue')
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')                    AS pending_claims,
          COUNT(*) FILTER (WHERE status = 'approved')                   AS approved_claims,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)    AS pending_amount_sar,
          COALESCE(SUM(amount) FILTER (WHERE status = 'approved'
                                        AND reviewed_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS approved_this_month_sar
        FROM finance_expense_claims
      `),
      pool.query(`
        SELECT
          COUNT(*)                                              AS total_budgets,
          COUNT(*) FILTER (WHERE status = 'approved')          AS approved_budgets,
          COUNT(*) FILTER (WHERE status = 'draft')             AS draft_budgets,
          COALESCE(SUM(total_sar) FILTER (WHERE status = 'approved'), 0) AS total_approved_budget_sar
        FROM finance_budgets
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
    ]);

    return {
      invoices:        invoices.rows[0],
      expense_claims:  expenses.rows[0],
      budgets:         budgets.rows[0],
    };
  } catch (e) { return { error: e.message }; }
}

async function toolGetPendingExpenseClaims() {
  try {
    const { rows } = await pool.query(`
      SELECT employee_name, category, amount, currency,
             claim_date, description,
             ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) AS hours_waiting
      FROM finance_expense_claims
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 15
    `);
    return rows;
  } catch (e) { return { error: e.message }; }
}

// ── HR tools (direct DB) ──────────────────────────────────────────────────────

async function toolGetHrSummary() {
  try {
    const [headcount, leave, newHires] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')      AS active_employees,
          COUNT(*) FILTER (WHERE status = 'on_leave')    AS on_leave,
          COUNT(*) FILTER (WHERE status = 'terminated')  AS terminated,
          COUNT(*) FILTER (WHERE employment_type = 'full_time' AND status = 'active') AS full_time,
          COUNT(*) FILTER (WHERE employment_type = 'contractor' AND status = 'active') AS contractors
        FROM hr_employees
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')   AS pending_requests,
          COUNT(*) FILTER (WHERE status = 'approved' AND start_date >= CURRENT_DATE) AS upcoming_leaves,
          COUNT(*) FILTER (WHERE status = 'pending'
                             AND created_at < NOW() - INTERVAL '48 hours') AS overdue_pending
        FROM hr_leave_requests
      `),
      pool.query(`
        SELECT COUNT(*) AS new_hires_30d
        FROM hr_employees
        WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
          AND status != 'terminated'
      `),
    ]);

    return {
      headcount:  headcount.rows[0],
      leave:      leave.rows[0],
      new_hires:  newHires.rows[0],
    };
  } catch (e) { return { error: e.message }; }
}

async function toolGetPendingLeaveRequests() {
  try {
    const { rows } = await pool.query(`
      SELECT e.full_name AS employee, e.role,
             lr.leave_type, lr.start_date, lr.end_date, lr.days, lr.reason,
             ROUND(EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600) AS hours_waiting
      FROM hr_leave_requests lr
      JOIN hr_employees e ON e.id = lr.employee_id
      WHERE lr.status = 'pending'
      ORDER BY lr.created_at ASC
      LIMIT 15
    `);
    return rows;
  } catch (e) { return { error: e.message }; }
}

// ── Sales / CRM tools (direct DB) ────────────────────────────────────────────

async function toolGetSalesPipeline() {
  try {
    const { rows } = await pool.query(`
      SELECT
        stage,
        COUNT(*)                                AS deal_count,
        COALESCE(SUM(value_amount), 0)          AS total_value_sar,
        COALESCE(AVG(value_amount), 0)          AS avg_value_sar,
        COUNT(*) FILTER (WHERE ceo_review_required) AS needs_ceo_review
      FROM crm_deals
      WHERE stage NOT IN ('won', 'lost')
      GROUP BY stage
      ORDER BY CASE stage
        WHEN 'lead'         THEN 1
        WHEN 'qualified'    THEN 2
        WHEN 'demo'         THEN 3
        WHEN 'proposal'     THEN 4
        WHEN 'negotiation'  THEN 5
        ELSE 6
      END
    `);

    const totals = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE stage = 'won'
                           AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)) AS won_this_month,
        COALESCE(SUM(value_amount) FILTER (WHERE stage = 'won'
                                            AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS won_value_sar_this_month,
        COUNT(*) FILTER (WHERE stage = 'lost'
                           AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)) AS lost_this_month
      FROM crm_deals
    `);

    return { pipeline: rows, this_month: totals.rows[0] };
  } catch (e) { return { error: e.message }; }
}

async function toolGetDealsNeedingAttention() {
  try {
    const { rows } = await pool.query(`
      SELECT title, partner_name, stage, deal_owner,
             value_amount AS value_sar, value_currency,
             ceo_review_required,
             next_action, next_action_date,
             ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400) AS days_stale
      FROM crm_deals
      WHERE stage NOT IN ('won', 'lost')
        AND (
          updated_at < NOW() - INTERVAL '14 days'
          OR (next_action_date IS NOT NULL AND next_action_date < CURRENT_DATE)
          OR ceo_review_required = TRUE
        )
      ORDER BY days_stale DESC NULLS LAST
      LIMIT 10
    `);
    return rows;
  } catch (e) { return { error: e.message }; }
}

// ── Customer Success tools (direct DB) ───────────────────────────────────────

async function toolGetCsSummary() {
  try {
    const [accounts, escalations] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                             AS total_accounts,
          COUNT(*) FILTER (WHERE status = 'active')           AS active,
          COUNT(*) FILTER (WHERE status = 'at_risk')          AS at_risk,
          COUNT(*) FILTER (WHERE status = 'churned')          AS churned,
          COUNT(*) FILTER (WHERE status = 'onboarding')       AS onboarding,
          ROUND(AVG(health_score) FILTER (WHERE status != 'churned')) AS avg_health_score,
          COUNT(*) FILTER (WHERE churn_risk IN ('critical','high')) AS high_churn_risk_count,
          COALESCE(SUM(ltv_sar), 0)                           AS total_ltv_sar
        FROM cs_accounts
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('open','in_progress'))   AS open_escalations,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress')
                             AND priority IN ('critical','high'))     AS critical_high_escalations,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress')
                             AND created_at < NOW() - INTERVAL '48 hours') AS overdue_escalations
        FROM cs_escalations
      `),
    ]);

    const atRisk = await pool.query(`
      SELECT name, type, tier, health_score, churn_risk, owner, ltv_sar,
             ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400) AS days_since_update
      FROM cs_accounts
      WHERE status = 'at_risk' OR health_score < 40 OR churn_risk IN ('critical','high')
      ORDER BY health_score ASC, ltv_sar DESC
      LIMIT 8
    `);

    return {
      summary:          accounts.rows[0],
      escalations:      escalations.rows[0],
      at_risk_accounts: atRisk.rows,
    };
  } catch (e) { return { error: e.message }; }
}

// ── Procurement tools (direct DB) ────────────────────────────────────────────

async function toolGetProcurementSummary() {
  try {
    const [contracts, slas, pos] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                            AS total_active_contracts,
          COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '90 days'
                             AND status = 'active')                          AS expiring_90d,
          COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days'
                             AND status = 'active')                          AS expiring_30d,
          COUNT(*) FILTER (WHERE status = 'under_review')                    AS under_review
        FROM procurement_contracts
        WHERE status IN ('active','under_review')
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'breached')  AS sla_breaches,
          COUNT(*) FILTER (WHERE status = 'at_risk')   AS sla_at_risk
        FROM procurement_slas
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'approved')   AS pending_delivery_pos,
          COUNT(*) FILTER (WHERE status = 'draft')      AS draft_pos,
          COALESCE(SUM(amount_sar) FILTER (WHERE status IN ('draft','approved')), 0) AS outstanding_po_value_sar
        FROM procurement_purchase_orders
      `),
    ]);

    const expiring = await pool.query(`
      SELECT supplier_name, title,
             end_date,
             (end_date - CURRENT_DATE) AS days_until_expiry,
             auto_renews, value_sar
      FROM procurement_contracts
      WHERE status = 'active'
        AND end_date <= CURRENT_DATE + INTERVAL '90 days'
      ORDER BY end_date ASC
      LIMIT 10
    `);

    return {
      contracts:          contracts.rows[0],
      sla_health:         slas.rows[0],
      purchase_orders:    pos.rows[0],
      expiring_contracts: expiring.rows,
    };
  } catch (e) { return { error: e.message }; }
}

// ── Tool definitions (sent to Claude) ────────────────────────────────────────

const TOOLS = [
  // ── Workflow ──────────────────────────────────────────────────────────────
  {
    name:         'get_workflow_stats',
    description:  'Get personal task stats: pending count, overdue count, escalated count, completed this week.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_workflow_overview',
    description:  'Get system-wide workflow KPIs: total instances, active workflows, approval rate %, average completion time, SLA breach rate.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_workflow_by_department',
    description:  'Get workflow activity broken down by department: total runs, active, overdue, approval rate, average completion time.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_workflow_bottlenecks',
    description:  'Get the top 5 slowest workflow steps with average and P90 wait times and escalation counts.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_workflow_definitions',
    description:  'Get per-workflow performance: runs, approval rate, avg completion hours, bottleneck step.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_overdue_workflows',
    description:  'List all overdue workflow steps across the system (SLA breached), with assignee, hours overdue, and workflow name.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_workflow_dashboard',
    description:  'Get the super-admin dashboard: active instances by department, SLA health breakdown (on_track / due_soon / overdue), recently completed instances.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_active_instances',
    description:  'List currently running workflow instances with workflow name, department, initiator, and elapsed time.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_workflow_trend',
    description:  'Get monthly workflow completion counts (approved + rejected) for the trailing 12 months.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    name:         'get_finance_summary',
    description:  'Get Finance department snapshot: pending/overdue invoices with SAR amounts, pending expense claims, and budget approval status for the current year.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_pending_expense_claims',
    description:  'List individual pending expense claims with employee name, category, amount, and how many hours they have been waiting for approval.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  // ── HR ────────────────────────────────────────────────────────────────────
  {
    name:         'get_hr_summary',
    description:  'Get HR snapshot: total active headcount, employees on leave, new hires in the last 30 days, pending leave requests, and leave requests waiting more than 48 hours.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_pending_leave_requests',
    description:  'List individual pending leave requests with employee name, role, leave type, dates, and how many hours the request has been waiting.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  // ── Sales / CRM ───────────────────────────────────────────────────────────
  {
    name:         'get_sales_pipeline',
    description:  'Get the CRM deal pipeline: count and total SAR value by stage (lead → negotiation), plus deals won and lost this month.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:         'get_deals_needing_attention',
    description:  'List deals that need attention: stale deals (no update in 14+ days), overdue next actions, or deals requiring CEO review.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  // ── Customer Success ──────────────────────────────────────────────────────
  {
    name:         'get_cs_summary',
    description:  'Get Customer Success snapshot: account health distribution (active/at_risk/churned), average health score, high-churn-risk accounts, open escalations, and the top at-risk accounts by LTV.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  // ── Procurement ───────────────────────────────────────────────────────────
  {
    name:         'get_procurement_summary',
    description:  'Get Procurement snapshot: contracts expiring in 30/90 days, SLA breaches and at-risk SLAs, outstanding purchase order values, and the list of contracts expiring soonest.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────

async function executeTool(name, _input, actorEmail) {
  switch (name) {
    // Workflow
    case 'get_workflow_stats':         return toolGetWorkflowStats();
    case 'get_workflow_overview':      return toolGetWorkflowOverview();
    case 'get_workflow_by_department': return toolGetWorkflowByDepartment();
    case 'get_workflow_bottlenecks':   return toolGetWorkflowBottlenecks();
    case 'get_workflow_definitions':   return toolGetWorkflowDefinitions();
    case 'get_overdue_workflows':      return toolGetOverdueWorkflows();
    case 'get_workflow_dashboard':     return toolGetWorkflowDashboard();
    case 'get_active_instances':       return toolGetActiveInstances();
    case 'get_workflow_trend':         return toolGetWorkflowTrend();
    // Finance
    case 'get_finance_summary':        return toolGetFinanceSummary();
    case 'get_pending_expense_claims': return toolGetPendingExpenseClaims();
    // HR
    case 'get_hr_summary':             return toolGetHrSummary();
    case 'get_pending_leave_requests': return toolGetPendingLeaveRequests();
    // Sales
    case 'get_sales_pipeline':         return toolGetSalesPipeline();
    case 'get_deals_needing_attention':return toolGetDealsNeedingAttention();
    // Customer Success
    case 'get_cs_summary':             return toolGetCsSummary();
    // Procurement
    case 'get_procurement_summary':    return toolGetProcurementSummary();
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the UTUBooking.com AI Executive Assistant — an intelligent operations assistant for the AMEC Solutions admin team.

You have access to live platform data via tools covering Workflows, Finance, HR, Sales, Customer Success, and Procurement. Your role is to answer operational questions, surface insights, flag issues, and help management stay on top of the business.

Platform overview:
- UTUBooking.com: multi-market travel booking platform (Hotels, Flights, Cars)
- Focus: Gulf + Muslim World markets, especially Hajj & Umrah
- 19 departments: Finance, HR, Legal, Compliance, Ops, Dev, Products, Revenue, Customer Success, Procurement, Fraud, Analytics, Sales, BizDev, Marketing, Affiliates, Corporate, Advertising, CRM
- Company currency: SAR (Saudi Riyal)

Tool coverage:
- Workflows: task stats, system KPIs, department breakdown, bottlenecks, definitions, overdue items, dashboard, active instances, trend
- Finance: invoice pipeline, expense claims, budget status
- HR: headcount, leave requests, new hires
- Sales/CRM: deal pipeline by stage, deals needing attention
- Customer Success: account health, escalations, at-risk accounts
- Procurement: contract expiry, SLA health, purchase orders

Behaviour rules:
- Always use tools to get live data before answering questions about current state
- Give concise, direct answers — no corporate filler
- Surface the most important insight first, then detail
- Highlight red flags prominently: overdue items, SLA breaches, high churn risk, stale deals, high-priority escalations
- Format numbers clearly: SAR amounts with comma separators, percentages to 1dp, hours as "Xh Ym", days as "Xd"
- For multi-department questions, call multiple tools in parallel
- If the user asks about a department outside your tool coverage (Legal, Compliance, Fraud, Marketing, etc.) say so honestly — do not guess
- Do NOT make up numbers — only report what the tools return
- Today's date: ${new Date().toISOString().split('T')[0]}`;

// ── POST /chat ────────────────────────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body ?? {};

  if (!message?.trim()) {
    return res.status(400).json({ error: 'MESSAGE_REQUIRED' });
  }

  // Build message history for Claude
  const messages = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message.trim() },
  ];

  const toolCallsMade = [];

  try {
    let response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      tools:      TOOLS,
      messages,
    });

    // Agentic loop — keep going until Claude stops using tools
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolCallsMade.push(block.name);
          const result = await executeTool(block.name, block.input, req.user?.email);
          return {
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          };
        }),
      );

      // Send tool results back to Claude
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user',      content: toolResults });

      response = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        tools:      TOOLS,
        messages,
      });
    }

    // Extract final text response
    const textBlock     = response.content.find(b => b.type === 'text');
    const assistantText = textBlock?.text ?? 'I was unable to generate a response. Please try again.';

    return res.json({
      response:        assistantText,
      tool_calls_made: [...new Set(toolCallsMade)],
    });

  } catch (err) {
    console.error('[ai-assistant] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
