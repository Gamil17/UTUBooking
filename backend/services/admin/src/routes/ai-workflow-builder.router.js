'use strict';

/**
 * AI Workflow Builder
 *
 * Registered in app.js as:
 *   app.use('/api/admin/workflow-builder', requireAdmin, aiWorkflowBuilderRouter)
 *
 * POST /generate  — takes plain English description → returns draft workflow definition JSON
 *
 * The generated workflow is NOT automatically saved. It is returned to the
 * frontend for human review. The admin can then call POST /api/admin/workflow/definitions
 * to save it if approved.
 *
 * Claude output schema (matches WorkflowDefinition shape):
 *   name            string
 *   department      string
 *   trigger_event   string
 *   description     string
 *   steps           WfStepDef[]
 *   approval_chain  string[]
 *   builder_notes   string[]  — AI notes/warnings for the human reviewer
 */

const express  = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Business Process Designer for UTUBooking.com, a travel tech startup (Hotels, Flights, Cars, Hajj/Umrah) headquartered in Riyadh, Saudi Arabia.

Your task is to convert plain English workflow descriptions into structured workflow definition JSON that fits UTUBooking's Workflow Engine.

Workflow Engine constraints:
- Steps are executed sequentially. Each step has ONE next step (on_approve) and optional rejection/timeout paths.
- Step types: 'approval' (human decision required), 'action' (human completes a task, no formal decision), 'notification' (informational — auto-advances), 'condition' (auto-route based on context field)
- assignee_role must be one of: super_admin, admin, hr_manager, finance_manager, cfo, legal_manager, dpo, marketing_manager, cs_manager, ops_manager, support_agent, procurement_manager, revenue_manager, risk_lead, it_manager, dept_head, manager, employee
- sla_hours: use sensible defaults (4h for urgent, 24h for standard, 72h for complex review, 120h for legal/compliance)
- escalate_to_role: typically the supervisor of assignee_role, or super_admin as fallback
- auto_approve_condition: optional { field, op, value } — op must be 'lt', 'lte', 'gt', 'gte', or 'eq'
- on_approve: step id of next step (null for final step)
- on_reject: step id for rejection path (null = workflow ends as rejected)
- on_timeout: step id to go to on SLA breach (usually same as on_approve or a parallel escalation step, null = escalate_to_role handles it)

Valid departments: finance, hr, legal, compliance, ops, dev, products, revenue, customer_success, procurement, fraud, analytics, marketing, sales, bizdev, affiliates, advertising, corporate

Trigger event naming convention: snake_case past-tense or noun phrase (e.g. invoice_received, leave_requested, contract_drafted, feature_approved)

builder_notes: include warnings about anything unclear, assumptions made, fields the human should verify, or GDPR/PDPL implications.

Output ONLY valid JSON — no markdown fences, no commentary before or after.

Output this exact structure:
{
  "name": "<workflow name>",
  "department": "<department>",
  "trigger_event": "<snake_case_event_name>",
  "description": "<one sentence describing the process>",
  "approval_chain": ["<role1>", "<role2>"],
  "steps": [
    {
      "id": "<snake_case_step_id>",
      "name": "<Human Readable Step Name>",
      "type": "<approval|action|notification|condition>",
      "assignee_role": "<role>",
      "sla_hours": <number>,
      "escalate_to_role": "<role>",
      "on_approve": "<next_step_id or null>",
      "on_reject": "<rejection_step_id or null>",
      "on_timeout": "<timeout_step_id or null>",
      "auto_approve_condition": null,
      "description": "<what the assignee must do>"
    }
  ],
  "builder_notes": ["<note or warning for the human reviewer>"]
}`;

// ── POST /generate ─────────────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { description, department, context } = req.body ?? {};
  if (!description?.trim()) {
    return res.status(400).json({ error: 'DESCRIPTION_REQUIRED', message: 'Provide a plain English workflow description' });
  }

  const userPrompt = `Design a workflow for UTUBooking.com based on this description:

"${description.trim()}"

${department ? `Suggested department: ${department}` : ''}
${context    ? `Additional context: ${context.trim()}` : ''}

Generate a complete, production-ready workflow definition JSON. Make realistic SLA assumptions for a Series A Gulf tech startup. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
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

    // Basic validation
    if (!parsed.name || !parsed.trigger_event || !Array.isArray(parsed.steps)) {
      return res.status(500).json({ error: 'INVALID_OUTPUT', message: 'Claude returned incomplete workflow structure', raw: parsed });
    }

    return res.json({
      data:    parsed,
      message: 'Draft workflow generated. Review all fields before saving.',
    });

  } catch (err) {
    console.error('[ai-workflow-builder] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
