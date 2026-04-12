'use strict';

/**
 * Seed 2 cron-triggered workflow definitions:
 *   contract_expiry_90d   — Procurement contract renewal (fired by contract-expiry.job)
 *   health_score_critical — CS at-risk account outreach (fired by contract-expiry.job)
 */

exports.up = async (knex) => {
  const definitions = [

    // ── Procurement: Contract Renewal ─────────────────────────────────────────
    {
      name:          'Procurement Contract Renewal',
      department:    'procurement',
      trigger_event: 'contract_expiry_90d',
      description:   'Contract expiring within 90 days: review → renegotiate → Legal sign → Finance updated',
      status:        'active',
      version:       '1.0.0',
      created_by:    'system',
      approval_chain: JSON.stringify(['procurement_manager', 'legal_manager', 'cfo']),
      steps: JSON.stringify([
        {
          id:               'review',
          name:             'Contract Performance Review',
          type:             'approval',
          assignee_role:    'procurement_manager',
          sla_hours:        120,
          escalate_to_role: 'super_admin',
          on_approve:       'legal_negotiate',
          on_reject:        'terminate_notify',
          on_timeout:       null,
          description:      'Procurement reviews supplier performance, SLA compliance, and value for money. Recommend renewal, renegotiation, or replacement.',
        },
        {
          id:               'terminate_notify',
          name:             'Termination Notice',
          type:             'notification',
          assignee_role:    'legal_manager',
          sla_hours:        24,
          escalate_to_role: 'super_admin',
          on_approve:       null,
          on_reject:        null,
          on_timeout:       null,
          description:      'Legal issues formal termination/non-renewal notice to supplier per contract terms',
        },
        {
          id:               'legal_negotiate',
          name:             'Legal Review & Negotiation',
          type:             'approval',
          assignee_role:    'legal_manager',
          sla_hours:        168,
          escalate_to_role: 'super_admin',
          on_approve:       'cfo_approve',
          on_reject:        null,
          on_timeout:       null,
          description:      'Legal reviews renewed contract terms, negotiates commercial and liability clauses, prepares signing-ready document',
        },
        {
          id:               'cfo_approve',
          name:             'CFO Financial Approval',
          type:             'approval',
          assignee_role:    'cfo',
          sla_hours:        48,
          escalate_to_role: 'super_admin',
          on_approve:       'activate',
          on_reject:        null,
          on_timeout:       null,
          description:      'CFO approves renewed contract value and payment terms. Required for contracts above SAR 50,000 annual value.',
        },
        {
          id:               'activate',
          name:             'Contract Signed & Activated',
          type:             'action',
          assignee_role:    'procurement_manager',
          sla_hours:        24,
          escalate_to_role: 'super_admin',
          on_approve:       null,
          on_reject:        null,
          on_timeout:       null,
          description:      'Procurement updates contract record: new end_date, new value, upload signed copy, confirm supplier is active',
        },
      ]),
    },

    // ── Customer Success: Health Score Critical ───────────────────────────────
    {
      name:          'Critical Account Health Response',
      department:    'customer_success',
      trigger_event: 'health_score_critical',
      description:   'Account health score < 40: CS rep outreach → rescue plan → exec escalation if needed → health restored',
      status:        'active',
      version:       '1.0.0',
      created_by:    'system',
      approval_chain: JSON.stringify(['cs_manager', 'super_admin']),
      steps: JSON.stringify([
        {
          id:               'cs_outreach',
          name:             'CS Rep Outreach',
          type:             'approval',
          assignee_role:    'cs_manager',
          sla_hours:        4,
          escalate_to_role: 'super_admin',
          on_approve:       'rescue_plan',
          on_reject:        null,
          on_timeout:       null,
          description:      'CS rep contacts the account: call + personalised email. Identify root cause of dissatisfaction (product, support, pricing, service failure).',
        },
        {
          id:               'rescue_plan',
          name:             'Rescue Plan',
          type:             'approval',
          assignee_role:    'cs_manager',
          sla_hours:        48,
          escalate_to_role: 'super_admin',
          on_approve:       'monitor',
          on_reject:        'exec_escalation',
          on_timeout:       'exec_escalation',
          description:      'CS proposes rescue plan: compensation, priority support, re-booking assistance, loyalty credit, or account review meeting',
        },
        {
          id:               'exec_escalation',
          name:             'Executive Escalation',
          type:             'approval',
          assignee_role:    'super_admin',
          sla_hours:        8,
          escalate_to_role: 'super_admin',
          on_approve:       'monitor',
          on_reject:        null,
          on_timeout:       null,
          description:      'High-LTV account at critical risk — escalate to COO/CEO for personal intervention',
        },
        {
          id:               'monitor',
          name:             'Health Monitoring',
          type:             'action',
          assignee_role:    'cs_manager',
          sla_hours:        168,
          escalate_to_role: 'super_admin',
          on_approve:       null,
          on_reject:        null,
          on_timeout:       null,
          description:      'CS monitors account health score for 7 days post-outreach. Update touchpoint timeline. Close workflow when score recovers above 60.',
        },
      ]),
    },

  ];

  for (const def of definitions) {
    await knex.raw(`
      INSERT INTO workflow_definitions
        (name, department, trigger_event, description, status, version, created_by, approval_chain, steps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (trigger_event)
      DO NOTHING
    `, [
      def.name, def.department, def.trigger_event, def.description,
      def.status, def.version, def.created_by,
      def.approval_chain, def.steps,
    ]);
  }
};

exports.down = async (knex) => {
  await knex('workflow_definitions')
    .whereIn('trigger_event', ['contract_expiry_90d', 'health_score_critical'])
    .del();
};
