'use strict';

/**
 * AI Approval Recommendation Engine
 *
 * Uses Claude claude-sonnet-4-6 to analyse workflow step context and produce a structured
 * recommendation for human approvers. The AI does NOT make decisions — it surfaces
 * relevant signals so humans can decide faster with better information.
 *
 * Returns:
 *   {
 *     recommended_decision : 'approve' | 'reject' | 'investigate'
 *     confidence           : 'high' | 'medium' | 'low'
 *     context_summary      : string   — plain-English one-liner of what this task is about
 *     rationale            : string   — 2–3 sentences explaining the recommendation
 *     risk_factors         : string[] — specific concerns (empty if none)
 *     policy_notes         : string[] — relevant policy or limit references (empty if none)
 *   }
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Department-specific policy context ───────────────────────────────────────
// Injected into the prompt so Claude knows company limits and rules.

const DEPT_POLICY = {
  finance: `
    - Expense claims under SAR 500 are pre-approved for routine items.
    - Claims SAR 500–5,000 require manager approval.
    - Claims above SAR 5,000 require Finance Director sign-off.
    - Receipts are required for all claims above SAR 100.
    - Entertainment expenses require business justification.`,

  hr: `
    - Employees are entitled to 21 days annual leave per year (Gulf standard).
    - Sick leave up to 30 days per year (with medical certificate above 3 days).
    - Emergency leave up to 3 days per incident.
    - Maternity: 60 days. Paternity: 3 days.
    - Leave requests must be submitted at least 7 days in advance for annual leave.`,

  legal: `
    - Contracts above SAR 50,000 require CFO countersignature.
    - NDAs with new suppliers must be reviewed by in-house counsel before signing.
    - Any contract with GDPR/data processing implications requires DPO review.
    - IP assignments require Legal Director approval.`,

  compliance: `
    - GDPR erasure requests must be completed within 30 days (Art. 17).
    - DSR fulfilment requires identity verification before data release.
    - Requests from high-risk jurisdictions require extra DPO scrutiny.`,

  procurement: `
    - Suppliers must pass due diligence before activation (financial health, sanctions check).
    - Suppliers from sanctioned countries must be blocked regardless of commercial value.
    - Annual contract values above SAR 500,000 require Board approval.`,

  ops: `
    - Critical incidents (P1) require acknowledgement within 15 minutes.
    - High severity (P2) requires acknowledgement within 1 hour.
    - All production incidents must have a post-mortem within 5 business days.`,

  dev: `
    - Production deployments must be reviewed by a senior engineer and security.
    - Deployments affecting user data or payments require extra scrutiny.
    - Zero-downtime deployment required for all production changes.`,

  products: `
    - Feature flags rolling out to >10% of users require PM and Engineering sign-off.
    - Flags in production affecting payments or auth require security review.
    - Any flag that cannot be rolled back safely must be blocked.`,

  revenue: `
    - Price changes above ±20% require Revenue Director approval.
    - Blackout rules overlapping Hajj or Ramadan require Marketing review.
    - Rules that would make prices below cost are automatically rejected.`,

  'customer-success': `
    - Escalations from VIP/enterprise accounts are priority-1.
    - Escalations involving potential refunds above SAR 2,000 require Finance sign-off.
    - Regulatory or legal complaints must be escalated to Legal immediately.`,

  fraud: `
    - Cases with risk score ≥ 90 should be auto-blocked pending manual review.
    - Cases involving repeat offenders require immediate account suspension.
    - Cross-border transactions with unusual patterns warrant extra scrutiny.`,

  sales: `
    - Deals above SAR 1M in value require CEO approval.
    - Deals with payment terms >90 days require CFO approval.
    - Revenue share above 20% requires board sign-off.`,

  bizdev: `
    - New strategic partners must pass legal and financial due diligence.
    - Revenue share agreements above 15% require CFO approval.
    - Partners operating in sanctioned regions must be referred to Legal.`,

  marketing: `
    - Blog content must be factually accurate and reviewed for brand compliance.
    - Content referencing competitors must be approved by Legal.
    - Religious content must be reviewed by a Gulf Arabic expert.`,

  analytics: `
    - KPI threshold breaches above 20% variance from target require immediate escalation.
    - Revenue KPI breaches require Finance and CEO notification.
    - Fraud-related KPI breaches require immediate Fraud team response.`,

  affiliates: `
    - Applicants with fraudulent traffic sources (bought clicks, incentivised) must be rejected.
    - Applications from competitors must be rejected.
    - Applicants with audience under 1,000 require special justification.`,

  advertising: `
    - Advertisers in sensitive categories (gambling, alcohol) are not eligible.
    - Budget commitments above SAR 50,000 per month require Finance approval.
    - Competitor brands may not advertise on UTUBooking.com.`,

  corporate: `
    - Corporate accounts must have a valid commercial registration.
    - Monthly travel budget commitments above SAR 100,000 require CFO approval.
    - Corporate accounts from high-risk countries require Compliance review.`,
};

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Generate an AI recommendation for a workflow step.
 *
 * @param {object} opts
 * @param {string} opts.workflow_name     — human-readable workflow name
 * @param {string} opts.step_name         — name of the step requiring decision
 * @param {string} opts.department        — department (maps to policy context)
 * @param {string} opts.trigger_event     — e.g. 'expense_submitted'
 * @param {object} opts.context           — business context carried by the instance
 * @param {string} opts.initiated_by      — email of the person who triggered the workflow
 * @param {number} opts.sla_hours         — SLA window for this step
 * @param {string} opts.sla_health        — 'on_track' | 'due_soon' | 'overdue' | 'no_sla'
 */
async function getRecommendation(opts) {
  const {
    workflow_name, step_name, department, trigger_event,
    context = {}, initiated_by, sla_hours, sla_health,
  } = opts;

  const policyContext = DEPT_POLICY[department] || 'No specific policy context available for this department.';

  const contextLines = Object.entries(context)
    .map(([k, v]) => `  - ${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n') || '  (no context data)';

  const slaNote = sla_health === 'overdue' ? ' [OVERDUE — SLA breached]'
               : sla_health === 'due_soon' ? ` [DUE SOON — ${sla_hours}h SLA window]`
               : sla_hours ? ` [${sla_hours}h SLA]`
               : '';

  const systemPrompt = `You are an AI business analyst for UTUBooking.com (AMEC Solutions), a travel booking platform serving the Gulf and Muslim World markets. Your job is to help admins make faster, better-informed workflow decisions by surfacing relevant signals from the business context.

You do NOT make the final decision — you surface risks, policy considerations, and a recommendation so the human approver can decide quickly.

Company currency: SAR (Saudi Riyal). Current date: ${new Date().toISOString().split('T')[0]}.

Respond ONLY with a JSON object matching this exact schema (no markdown, no extra text):
{
  "recommended_decision": "approve" | "reject" | "investigate",
  "confidence": "high" | "medium" | "low",
  "context_summary": "<one sentence, max 20 words>",
  "rationale": "<2-3 sentences explaining your recommendation>",
  "risk_factors": ["<risk 1>", "<risk 2>"],
  "policy_notes": ["<policy note 1>"]
}

Rules:
- recommended_decision: use "investigate" if you need more information or there are red flags that can't be resolved from the context alone
- confidence: "high" only when the data clearly supports the recommendation; "low" when context is thin or contradictory
- risk_factors: max 3 items; omit the array items if there are no genuine risks
- policy_notes: reference specific limits (e.g. "SAR 5,000 manager approval limit") when relevant; omit if not applicable
- Be concise and direct — no corporate speak`;

  const userPrompt = `Workflow: ${workflow_name}
Step requiring decision: ${step_name}${slaNote}
Department: ${department}
Trigger event: ${trigger_event}
Initiated by: ${initiated_by || 'unknown'}

Business context:
${contextLines}

Department policy:
${policyContext}

Analyse this and provide your recommendation.`;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  });

  const text = message.content[0]?.text ?? '';

  // Parse JSON — strict; throw if malformed so caller can handle
  let parsed;
  try {
    // Strip any accidental markdown fences
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Claude returned non-JSON: ${text.slice(0, 200)}`);
  }

  // Validate and sanitise
  const validDecisions = ['approve', 'reject', 'investigate'];
  const validConf      = ['high', 'medium', 'low'];

  return {
    recommended_decision: validDecisions.includes(parsed.recommended_decision)
      ? parsed.recommended_decision : 'investigate',
    confidence:    validConf.includes(parsed.confidence) ? parsed.confidence : 'low',
    context_summary: String(parsed.context_summary ?? ''),
    rationale:       String(parsed.rationale ?? ''),
    risk_factors:    Array.isArray(parsed.risk_factors)
      ? parsed.risk_factors.slice(0, 3).map(String) : [],
    policy_notes:    Array.isArray(parsed.policy_notes)
      ? parsed.policy_notes.slice(0, 3).map(String) : [],
  };
}

module.exports = { getRecommendation };
