'use strict';

/**
 * Phase P2 Workflow Seeds — 2 cross-department definitions
 *
 *   release_created          Products/Dev → Marketing → CS
 *   campaign_brief_submitted Marketing campaign lifecycle
 */

exports.up = async (knex) => {
  const definitions = [

    // ── Products/Dev → Marketing → CS ────────────────────────────────────────
    {
      name:          'Release Comms & CS Handoff',
      department:    'products',
      trigger_event: 'release_created',
      description:   'Product release: Legal sign-off check → Marketing notified → CS briefed → Release published',
      status:        'active',
      version:       '1.0.0',
      created_by:    'system',
      approval_chain: JSON.stringify(['legal_manager', 'marketing_manager', 'cs_manager']),
      steps: JSON.stringify([
        {
          id:               'legal_check',
          name:             'Legal Sign-off',
          type:             'approval',
          assignee_role:    'legal_manager',
          sla_hours:        24,
          escalate_to_role: 'super_admin',
          on_approve:       'marketing_notify',
          on_reject:        'hold_release',
          on_timeout:       'marketing_notify',
          description:      'Legal confirms no IP, compliance, or regulatory issues with the release. Required for AI features, data-processing changes, or new markets.',
        },
        {
          id:               'hold_release',
          name:             'Release On Hold',
          type:             'notification',
          assignee_role:    'super_admin',
          sla_hours:        4,
          escalate_to_role: 'super_admin',
          on_approve:       'legal_check',
          on_reject:        null,
          on_timeout:       null,
          description:      'Legal has flagged a blocker — release is on hold pending resolution. COO notified.',
        },
        {
          id:               'marketing_notify',
          name:             'Marketing Briefed',
          type:             'approval',
          assignee_role:    'marketing_manager',
          sla_hours:        8,
          escalate_to_role: 'super_admin',
          on_approve:       'cs_brief',
          on_reject:        null,
          on_timeout:       'cs_brief',
          description:      'Marketing receives release notes, prepares social posts, email announcement, and press release if applicable.',
        },
        {
          id:               'cs_brief',
          name:             'CS Team Briefed',
          type:             'approval',
          assignee_role:    'cs_manager',
          sla_hours:        4,
          escalate_to_role: 'super_admin',
          on_approve:       null,
          on_reject:        null,
          on_timeout:       null,
          description:      'CS team receives product change summary and FAQ to handle customer enquiries. Update help centre if needed.',
        },
      ]),
    },

    // ── Marketing Campaign Lifecycle ──────────────────────────────────────────
    {
      name:          'Campaign Lifecycle Approval',
      department:    'marketing',
      trigger_event: 'campaign_brief_submitted',
      description:   'Campaign brief → creative review → compliance check → Finance budget sign-off → scheduled → launched',
      status:        'active',
      version:       '1.0.0',
      created_by:    'system',
      approval_chain: JSON.stringify(['marketing_manager', 'legal_manager', 'cfo']),
      steps: JSON.stringify([
        {
          id:               'creative_review',
          name:             'Creative Review',
          type:             'approval',
          assignee_role:    'marketing_manager',
          sla_hours:        48,
          escalate_to_role: 'super_admin',
          on_approve:       'compliance_check',
          on_reject:        'brief_revision',
          on_timeout:       null,
          description:      'Marketing manager reviews creative brief: messaging, visuals, channel mix, target audience, KPIs, and timeline.',
        },
        {
          id:               'brief_revision',
          name:             'Brief Revision',
          type:             'notification',
          assignee_role:    'marketing_manager',
          sla_hours:        72,
          escalate_to_role: 'super_admin',
          on_approve:       'creative_review',
          on_reject:        null,
          on_timeout:       null,
          description:      'Brief returned with comments for revision before re-submission.',
        },
        {
          id:               'compliance_check',
          name:             'Legal & Compliance Check',
          type:             'approval',
          assignee_role:    'legal_manager',
          sla_hours:        24,
          escalate_to_role: 'super_admin',
          on_approve:       'budget_approval',
          on_reject:        'brief_revision',
          on_timeout:       'budget_approval',
          description:      'Legal reviews campaign for: misleading claims, PDPL/GDPR consent (email campaigns), Hajj/religious sensitivities, competitor references.',
        },
        {
          id:               'budget_approval',
          name:             'Budget Sign-off',
          type:             'approval',
          assignee_role:    'cfo',
          sla_hours:        48,
          escalate_to_role: 'super_admin',
          on_approve:       'schedule',
          on_reject:        null,
          on_timeout:       null,
          auto_approve_condition: { field: 'budget_sar', op: 'lte', value: 10000 },
          description:      'CFO approves campaign budget. Auto-approved for campaigns under SAR 10,000.',
        },
        {
          id:               'schedule',
          name:             'Campaign Scheduled',
          type:             'action',
          assignee_role:    'marketing_manager',
          sla_hours:        24,
          escalate_to_role: 'super_admin',
          on_approve:       null,
          on_reject:        null,
          on_timeout:       null,
          description:      'Marketing schedules campaign in CMS/email platform/ad accounts. Confirms launch date, tracking UTMs, and reporting dashboard.',
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
    .whereIn('trigger_event', ['release_created', 'campaign_brief_submitted'])
    .del();
};
