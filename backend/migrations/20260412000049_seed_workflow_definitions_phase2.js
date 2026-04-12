/* eslint-disable camelcase */
'use strict';

/**
 * Seed Phase 2: workflow definitions for the remaining 9 departments
 *
 * New trigger_events:
 *  1.  ops           — incident_opened               (Critical/High Incident Response)
 *  2.  dev           — deploy_requested              (Production Deployment Approval)
 *  3.  products      — flag_activation               (Feature Flag Activation Review)
 *  4.  revenue       — pricing_rule_proposed         (Pricing Rule Approval)
 *  5.  cs            — escalation_raised             (Customer Escalation Resolution)
 *  6.  fraud         — case_flagged                  (High-Risk Fraud Case Review)
 *  7.  crm           — deal_stage_changed            (Deal CEO Approval)
 *  8.  bizdev        — partner_onboard_requested     (Partner Onboarding)
 *  9.  marketing     — blog_post_ready               (Content Review & Publish)
 * 10.  analytics     — kpi_threshold_breached        (KPI Breach Investigation)
 * 11.  affiliates    — affiliate_applied             (Affiliate Application Review)
 * 12.  advertising   — advertising_enquiry_received  (Advertising Enquiry Qualification)
 * 13.  corporate     — corporate_enquiry_received    (Corporate Enquiry Qualification)
 *
 * Idempotent — skips if active definition exists for that trigger_event.
 */

exports.shorthands = undefined;

function step(id, name, type, opts = {}) {
  return {
    id,
    name,
    type,
    assignee_role:          opts.assignee_role    ?? null,
    assignee_email:         opts.assignee_email   ?? null,
    sla_hours:              opts.sla_hours        ?? null,
    escalate_to_role:       opts.escalate_to_role ?? 'super_admin',
    auto_approve_condition: opts.auto_approve     ?? null,
  };
}

function chain(steps) {
  return steps.map((s, i) => ({
    ...s,
    on_approve: i < steps.length - 1 ? steps[i + 1].id : undefined,
  }));
}

const DEFINITIONS = [

  // ── 1. Critical/High Incident Response ───────────────────────────────────────
  {
    name:          'Critical Incident Response',
    department:    'ops',
    trigger_event: 'incident_opened',
    description:   'Triggered when a critical or high-severity incident is opened. Routes through Ops Lead → Engineering Lead → CTO for tracking and resolution.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('ops_triage', 'Ops Lead Triage', 'approval', {
        assignee_role:    'admin',
        sla_hours:        1,
        escalate_to_role: 'super_admin',
      }),
      step('eng_lead_review', 'Engineering Lead Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        2,
        escalate_to_role: 'super_admin',
      }),
      step('cto_acknowledge', 'CTO Acknowledgement', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        4,
        escalate_to_role: 'super_admin',
      }),
      step('post_mortem_notify', 'Schedule Post-Mortem', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     24,
      }),
    ]),
  },

  // ── 2. Production Deployment Approval ────────────────────────────────────────
  {
    name:          'Production Deployment Approval',
    department:    'dev',
    trigger_event: 'deploy_requested',
    description:   'Every production deployment requires Tech Lead review then CTO sign-off before proceeding.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('tech_lead_review', 'Tech Lead Code Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        4,
        escalate_to_role: 'super_admin',
      }),
      step('cto_approval', 'CTO Deployment Sign-off', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('deploy_confirm', 'Deployment Confirmed', 'notification', {
        assignee_role: 'admin',
        sla_hours:     2,
      }),
    ]),
  },

  // ── 3. Feature Flag Activation Review ────────────────────────────────────────
  {
    name:          'Feature Flag Activation Review',
    department:    'products',
    trigger_event: 'flag_activation',
    description:   'New feature flags with rollout > 0% routed through Product Lead for approval before going live.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('product_lead_review', 'Product Lead Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('qa_signoff', 'QA Sign-off', 'approval', {
        assignee_role:    'admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('flag_live_notify', 'Flag Live Notification', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     2,
      }),
    ]),
  },

  // ── 4. Pricing Rule Approval ──────────────────────────────────────────────────
  {
    name:          'Pricing Rule Approval',
    department:    'revenue',
    trigger_event: 'pricing_rule_proposed',
    description:   'All new pricing rules require Revenue Manager review then CFO approval before activation.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('revenue_manager_review', 'Revenue Manager Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('cfo_approval', 'CFO Approval', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('pricing_activated', 'Rule Activation Notification', 'notification', {
        assignee_role: 'admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 5. Customer Escalation Resolution ────────────────────────────────────────
  {
    name:          'Customer Escalation Resolution',
    department:    'customer_success',
    trigger_event: 'escalation_raised',
    description:   'Critical/High customer escalations route through CS Lead → Department Head → CEO for resolution.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('cs_lead_review', 'CS Lead Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        4,
        escalate_to_role: 'super_admin',
      }),
      step('dept_head_decision', 'Department Head Decision', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('customer_response', 'Customer Response Sent', 'notification', {
        assignee_role: 'admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 6. High-Risk Fraud Case Review ───────────────────────────────────────────
  {
    name:          'High-Risk Fraud Case Review',
    department:    'fraud',
    trigger_event: 'case_flagged',
    description:   'Fraud cases with risk score >= 70 require Fraud Analyst review then Fraud Manager decision within tight SLAs.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('analyst_review', 'Fraud Analyst Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        2,
        escalate_to_role: 'super_admin',
      }),
      step('manager_decision', 'Fraud Manager Decision', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        4,
        escalate_to_role: 'super_admin',
      }),
      step('case_actioned', 'Case Action Notification', 'notification', {
        assignee_role: 'admin',
        sla_hours:     1,
      }),
    ]),
  },

  // ── 7. Deal CEO Approval ──────────────────────────────────────────────────────
  {
    name:          'Deal CEO Approval',
    department:    'sales',
    trigger_event: 'deal_stage_changed',
    description:   'Deals flagged for CEO review route through Sales Director then CEO before advancing.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('sales_director_review', 'Sales Director Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('ceo_approval', 'CEO Approval', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('deal_advanced', 'Deal Advancement Notification', 'notification', {
        assignee_role: 'admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 8. Partner Onboarding ─────────────────────────────────────────────────────
  {
    name:          'Strategic Partner Onboarding',
    department:    'bizdev',
    trigger_event: 'partner_onboard_requested',
    description:   'New strategic partners in active engagement status trigger due diligence → Legal → Finance → CEO activation.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('due_diligence', 'BizDev Due Diligence', 'approval', {
        assignee_role:    'admin',
        sla_hours:        72,
        escalate_to_role: 'super_admin',
      }),
      step('legal_review', 'Legal Agreement Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        72,
        escalate_to_role: 'super_admin',
      }),
      step('finance_terms', 'Finance Revenue Share Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('ceo_sign_off', 'CEO Final Sign-off', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('partner_activated', 'Partner Go-Live Notification', 'notification', {
        assignee_role: 'admin',
        sla_hours:     8,
      }),
    ]),
  },

  // ── 9. Content Review & Publish ──────────────────────────────────────────────
  {
    name:          'Content Review & Publish',
    department:    'marketing',
    trigger_event: 'blog_post_ready',
    description:   'Blog posts and marketing content submitted for review route through SEO Editor → Head of Marketing before publishing.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('seo_review', 'SEO Editor Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('marketing_head_approval', 'Head of Marketing Approval', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('publish_notify', 'Publish Confirmation', 'notification', {
        assignee_role: 'admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 10. KPI Breach Investigation ─────────────────────────────────────────────
  {
    name:          'KPI Threshold Breach Investigation',
    department:    'analytics',
    trigger_event: 'kpi_threshold_breached',
    description:   'When a BI alert fires, routes to BI Analyst → Head of Analytics → C-suite for acknowledgement and action plan.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('bi_analyst_review', 'BI Analyst Root Cause', 'approval', {
        assignee_role:    'admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('analytics_head_review', 'Head of Analytics Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('csuite_notify', 'C-Suite Briefing', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     8,
      }),
    ]),
  },

  // ── 11. Affiliate Application Review ─────────────────────────────────────────
  {
    name:          'Affiliate Application Review',
    department:    'affiliates',
    trigger_event: 'affiliate_applied',
    description:   'New affiliate applications routed through Affiliate Manager review then Head of Marketing approval before account creation.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('affiliate_manager_review', 'Affiliate Manager Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('marketing_head_approval', 'Head of Marketing Approval', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('affiliate_account_created', 'Affiliate Account Created', 'action', {
        assignee_role:    'admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('welcome_notify', 'Welcome Email Sent', 'notification', {
        assignee_role: 'admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 12. Advertising Enquiry Qualification ─────────────────────────────────────
  {
    name:          'Advertising Enquiry Qualification',
    department:    'advertising',
    trigger_event: 'advertising_enquiry_received',
    description:   'Inbound advertising enquiries routed through Sales Development Rep qualification then Account Executive for proposal.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('sdr_qualification', 'SDR Qualification Call', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('ae_proposal', 'Account Executive Proposal', 'approval', {
        assignee_role:    'admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('proposal_sent_notify', 'Proposal Sent Confirmation', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 13. Corporate Enquiry Qualification ──────────────────────────────────────
  {
    name:          'Corporate Enquiry Qualification',
    department:    'corporate',
    trigger_event: 'corporate_enquiry_received',
    description:   'Business travel enquiries reviewed by Corporate Sales Rep then Head of Corporate Sales for account setup decision.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('corp_sales_review', 'Corporate Sales Rep Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('head_corp_approval', 'Head of Corporate Sales Decision', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('account_setup', 'Corporate Account Setup', 'action', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('onboarding_notify', 'Onboarding Welcome Sent', 'notification', {
        assignee_role: 'admin',
        sla_hours:     4,
      }),
    ]),
  },

];

// ── Up ────────────────────────────────────────────────────────────────────────

exports.up = async (pgm) => {
  for (const def of DEFINITIONS) {
    const existing = await pgm.db.query(
      `SELECT id FROM workflow_definitions WHERE trigger_event = $1 AND status = 'active' LIMIT 1`,
      [def.trigger_event],
    );
    if (existing.rows.length > 0) {
      console.log(`[seed-p2] skipping '${def.trigger_event}' — active definition already exists`);
      continue;
    }

    await pgm.db.query(
      `INSERT INTO workflow_definitions
         (name, department, trigger_event, description, version, status, steps,
          approval_chain, created_by, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, '1.0.0', 'active', $5, $6, 'system', 'system', NOW())`,
      [
        def.name,
        def.department,
        def.trigger_event,
        def.description,
        JSON.stringify(def.steps),
        JSON.stringify(def.approval_chain),
      ],
    );

    console.log(`[seed-p2] inserted workflow: ${def.name} (${def.trigger_event})`);
  }
};

// ── Down ──────────────────────────────────────────────────────────────────────

exports.down = async (pgm) => {
  const events = DEFINITIONS.map(d => d.trigger_event);
  await pgm.db.query(
    `DELETE FROM workflow_definitions
      WHERE trigger_event = ANY($1) AND created_by = 'system'`,
    [events],
  );
};
