/* eslint-disable camelcase */
'use strict';

/**
 * Workflow Engine — core tables
 *
 * workflow_definitions   — blueprint of a workflow (steps, approval chain, SLAs)
 * workflow_instances     — one running execution of a definition
 * workflow_step_logs     — per-step status within an instance
 * workflow_events        — immutable audit trail of every state transition
 */

exports.shorthands = undefined;

exports.up = (pgm) => {

  // ── ENUMS ──────────────────────────────────────────────────────────────────

  pgm.createType('wf_definition_status', ['draft', 'active', 'archived']);

  pgm.createType('wf_instance_status', [
    'pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'overdue',
  ]);

  pgm.createType('wf_step_status', [
    'pending', 'in_progress', 'approved', 'rejected', 'escalated', 'skipped', 'overdue',
  ]);

  pgm.createType('wf_step_type', [
    'action', 'approval', 'condition', 'notification', 'ai_check',
  ]);

  // ── workflow_definitions ───────────────────────────────────────────────────
  // Immutable once active. Changes create a new version.

  pgm.createTable('workflow_definitions', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    name: {
      type:    'varchar(255)',
      notNull: true,
    },
    department: {
      // e.g. 'finance', 'hr', 'legal', 'compliance', 'ops', 'cross-dept'
      type:    'varchar(100)',
      notNull: true,
    },
    trigger_event: {
      // The event name that launches an instance, e.g. 'expense_submitted'
      type:    'varchar(150)',
      notNull: true,
    },
    description: {
      type:    'text',
      notNull: false,
    },
    version: {
      // semver string, e.g. '1.0.0'. Bumped on each modification.
      type:    'varchar(20)',
      notNull: true,
      default: "'1.0.0'",
    },
    status: {
      type:    'wf_definition_status',
      notNull: true,
      default: "'draft'",
    },
    // Ordered array of step objects:
    // [{ id, name, type, assignee_role, sla_hours, on_approve, on_reject, on_timeout,
    //    auto_approve_condition (optional JS/JSON condition string) }]
    steps: {
      type:    'jsonb',
      notNull: true,
      default: "'[]'",
    },
    // Roles that must approve the definition itself before it goes active
    approval_chain: {
      type:    'jsonb',
      notNull: true,
      default: "'[]'",
    },
    // Who created this definition
    created_by: {
      type:    'varchar(255)',
      notNull: true,
    },
    // Who approved it to active status
    approved_by: {
      type:    'varchar(255)',
      notNull: false,
    },
    approved_at: {
      type:    'timestamptz',
      notNull: false,
    },
    // Link to parent definition when this is a new version of an existing one
    parent_id: {
      type:       'uuid',
      notNull:    false,
      references: '"workflow_definitions"',
      onDelete:   'SET NULL',
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('workflow_definitions', 'department');
  pgm.createIndex('workflow_definitions', 'trigger_event');
  pgm.createIndex('workflow_definitions', 'status');
  pgm.createIndex('workflow_definitions', ['trigger_event', 'status']);

  pgm.sql(`
    COMMENT ON TABLE workflow_definitions IS
    'Blueprint for a business process workflow. Immutable once active — changes create a new version row.';
  `);

  // ── workflow_instances ─────────────────────────────────────────────────────
  // One row = one live execution of a definition.

  pgm.createTable('workflow_instances', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    definition_id: {
      type:       'uuid',
      notNull:    true,
      references: '"workflow_definitions"',
      onDelete:   'RESTRICT',
    },
    // Snapshot the version so in-flight instances are not affected by new versions
    definition_version: {
      type:    'varchar(20)',
      notNull: true,
    },
    trigger_event: {
      type:    'varchar(150)',
      notNull: true,
    },
    // ID of the business object that triggered this (e.g. expense claim UUID)
    trigger_ref: {
      type:    'varchar(255)',
      notNull: false,
    },
    // Type of business object, e.g. 'expense', 'contract', 'leave_request'
    trigger_ref_type: {
      type:    'varchar(100)',
      notNull: false,
    },
    status: {
      type:    'wf_instance_status',
      notNull: true,
      default: "'pending'",
    },
    initiated_by: {
      type:    'varchar(255)',
      notNull: true,
    },
    // 0-based index into the steps array of the definition
    current_step_index: {
      type:    'integer',
      notNull: true,
      default: 0,
    },
    // Arbitrary business context passed through all steps
    // e.g. { amount: 450, currency: 'SAR', requester: 'john@utubooking.com' }
    context: {
      type:    'jsonb',
      notNull: true,
      default: "'{}'",
    },
    // Final outcome reason (rejection reason or approval note)
    outcome_note: {
      type:    'text',
      notNull: false,
    },
    started_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    completed_at: {
      type:    'timestamptz',
      notNull: false,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('workflow_instances', 'definition_id');
  pgm.createIndex('workflow_instances', 'status');
  pgm.createIndex('workflow_instances', 'trigger_ref');
  pgm.createIndex('workflow_instances', 'initiated_by');
  pgm.createIndex('workflow_instances', 'trigger_event');
  pgm.createIndex('workflow_instances', 'created_at', { order: 'DESC' });
  // Fast "is there an active workflow for this object?" lookup
  pgm.createIndex('workflow_instances', ['trigger_ref', 'trigger_ref_type', 'status'], {
    name:  'idx_wf_inst_ref_active',
    where: "status IN ('pending','in_progress','overdue')",
  });

  pgm.sql(`
    COMMENT ON TABLE workflow_instances IS
    'One running execution of a workflow_definition. Preserves the definition version at launch time.';
  `);

  // ── workflow_step_logs ─────────────────────────────────────────────────────
  // One row per step per instance. Tracks assignment, SLA, and decision.

  pgm.createTable('workflow_step_logs', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    instance_id: {
      type:       'uuid',
      notNull:    true,
      references: '"workflow_instances"',
      onDelete:   'CASCADE',
    },
    // Matches the step id field in the definition's steps JSONB
    step_id: {
      type:    'varchar(100)',
      notNull: true,
    },
    step_name: {
      type:    'varchar(255)',
      notNull: true,
    },
    step_type: {
      type:    'wf_step_type',
      notNull: true,
    },
    // Role that owns this step (e.g. 'finance_manager', 'department_head')
    assignee_role: {
      type:    'varchar(100)',
      notNull: false,
    },
    // Specific user assigned (resolved at runtime from role)
    assignee_id: {
      type:    'varchar(255)',
      notNull: false,
    },
    assignee_email: {
      type:    'varchar(320)',
      notNull: false,
    },
    status: {
      type:    'wf_step_status',
      notNull: true,
      default: "'pending'",
    },
    sla_hours: {
      type:    'integer',
      notNull: false,
    },
    // Calculated at step activation: NOW() + sla_hours
    sla_deadline: {
      type:    'timestamptz',
      notNull: false,
    },
    // 'approve' | 'reject' | 'escalate' | 'skip' | 'auto_approved'
    decision: {
      type:    'varchar(50)',
      notNull: false,
    },
    decision_by: {
      type:    'varchar(255)',
      notNull: false,
    },
    decision_at: {
      type:    'timestamptz',
      notNull: false,
    },
    comments: {
      type:    'text',
      notNull: false,
    },
    // Who this was escalated to (user email or role)
    escalated_to: {
      type:    'varchar(255)',
      notNull: false,
    },
    // Whether a 50%-SLA reminder was already sent (avoid duplicate)
    reminder_sent: {
      type:    'boolean',
      notNull: true,
      default: false,
    },
    activated_at: {
      type:    'timestamptz',
      notNull: false,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('workflow_step_logs', 'instance_id');
  pgm.createIndex('workflow_step_logs', 'assignee_id');
  pgm.createIndex('workflow_step_logs', 'assignee_email');
  pgm.createIndex('workflow_step_logs', 'status');
  pgm.createIndex('workflow_step_logs', 'sla_deadline', {
    where: 'sla_deadline IS NOT NULL',
  });
  // "My pending tasks" query
  pgm.createIndex('workflow_step_logs', ['assignee_email', 'status'], {
    name:  'idx_wf_step_my_tasks',
    where: "status IN ('pending','in_progress','overdue')",
  });

  pgm.sql(`
    COMMENT ON TABLE workflow_step_logs IS
    'One row per step per workflow instance. Tracks assignment, SLA countdown, and approval decision.';
  `);

  // ── workflow_events ────────────────────────────────────────────────────────
  // Append-only audit trail. Never UPDATE or DELETE.

  pgm.createTable('workflow_events', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    instance_id: {
      type:       'uuid',
      notNull:    true,
      references: '"workflow_instances"',
      onDelete:   'CASCADE',
    },
    step_log_id: {
      type:       'uuid',
      notNull:    false,
      references: '"workflow_step_logs"',
      onDelete:   'SET NULL',
    },
    // Event types:
    // instance_started | step_activated | step_approved | step_rejected |
    // step_escalated | sla_reminder | sla_breached | instance_approved |
    // instance_rejected | instance_cancelled | ai_decision | auto_approved
    event_type: {
      type:    'varchar(100)',
      notNull: true,
    },
    // Who triggered this event (user email, 'system', or 'ai-agent')
    actor: {
      type:    'varchar(255)',
      notNull: true,
      default: "'system'",
    },
    // Arbitrary event payload for full auditability
    meta: {
      type:    'jsonb',
      notNull: false,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('workflow_events', 'instance_id');
  pgm.createIndex('workflow_events', 'event_type');
  pgm.createIndex('workflow_events', 'created_at', { order: 'DESC' });

  pgm.sql(`
    COMMENT ON TABLE workflow_events IS
    'Immutable audit trail. Append-only — never UPDATE or DELETE rows. Every state transition is recorded here.';
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('workflow_events');
  pgm.dropTable('workflow_step_logs');
  pgm.dropTable('workflow_instances');
  pgm.dropTable('workflow_definitions');
  pgm.dropType('wf_step_type');
  pgm.dropType('wf_step_status');
  pgm.dropType('wf_instance_status');
  pgm.dropType('wf_definition_status');
};
