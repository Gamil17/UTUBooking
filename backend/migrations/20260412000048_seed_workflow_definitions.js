/* eslint-disable camelcase */
'use strict';

/**
 * Seed: starter workflow definitions
 *
 * Inserts 6 production-ready active workflow definitions covering the
 * highest-priority cross-department business processes:
 *
 *  1. finance    — expense_submitted         (Expense Claim Approval)
 *  2. hr         — leave_requested           (Leave Request Approval)
 *  3. legal      — contract_drafted          (Contract Review & Sign-off)
 *  4. compliance — dsr_received              (Data Subject Request Fulfilment)
 *  5. hr         — hire_approved             (New Hire Onboarding Trigger)
 *  6. procurement— supplier_onboard_requested (Supplier Onboarding)
 *
 * Each definition is inserted only if no active definition exists for
 * that trigger_event (idempotent).
 */

exports.shorthands = undefined;

// ── Step builder helpers ──────────────────────────────────────────────────────

function step(id, name, type, opts = {}) {
  return {
    id,
    name,
    type,
    assignee_role:         opts.assignee_role    ?? null,
    assignee_email:        opts.assignee_email   ?? null,
    sla_hours:             opts.sla_hours        ?? null,
    escalate_to_role:      opts.escalate_to_role ?? 'super_admin',
    auto_approve_condition: opts.auto_approve    ?? null,
    // on_approve is wired by the seed function below
  };
}

/**
 * Wire sequential on_approve pointers and return the array.
 * Last step on_approve = undefined (instance closes as approved).
 */
function chain(steps) {
  return steps.map((s, i) => ({
    ...s,
    on_approve: i < steps.length - 1 ? steps[i + 1].id : undefined,
  }));
}

// ── Definitions ───────────────────────────────────────────────────────────────

const DEFINITIONS = [

  // ── 1. Expense Claim Approval ─────────────────────────────────────────────
  {
    name:          'Expense Claim Approval',
    department:    'finance',
    trigger_event: 'expense_submitted',
    description:   'Routes expense claims through line manager then Finance. Auto-approves claims under SAR 500.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('manager_review', 'Line Manager Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
        // Auto-approve expenses under SAR 500 — no human needed
        auto_approve:     { field: 'amount', op: 'lt', value: 500 },
      }),
      step('finance_review', 'Finance Manager Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
        // Finance auto-approves amounts under SAR 5,000 that already passed manager
        auto_approve:     { field: 'amount', op: 'lt', value: 5000 },
      }),
      step('payment_notify', 'Trigger Reimbursement', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     8,
      }),
    ]),
  },

  // ── 2. Leave Request Approval ─────────────────────────────────────────────
  {
    name:          'Leave Request Approval',
    department:    'hr',
    trigger_event: 'leave_requested',
    description:   'Routes employee leave requests through line manager then HR. SLA 24h per step.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('manager_approval', 'Line Manager Approval', 'approval', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('hr_confirm', 'HR Confirmation', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('payroll_notify', 'Notify Payroll', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     8,
      }),
    ]),
  },

  // ── 3. Contract Review & Sign-off ─────────────────────────────────────────
  {
    name:          'Contract Review & Sign-off',
    department:    'legal',
    trigger_event: 'contract_drafted',
    description:   'Drafts go through Legal review, then relevant dept head, then CFO for high-value contracts.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('legal_review', 'Legal Counsel Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        72,
        escalate_to_role: 'super_admin',
      }),
      step('dept_head_approval', 'Department Head Approval', 'approval', {
        assignee_role:    'admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('cfo_approval', 'CFO Final Sign-off', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
        // CFO auto-approves contracts under SAR 50,000
        auto_approve:     { field: 'value', op: 'lt', value: 50000 },
      }),
      step('counterparty_send', 'Send to Counterparty', 'action', {
        assignee_role: 'super_admin',
        sla_hours:     24,
      }),
    ]),
  },

  // ── 4. Data Subject Request (DSR) Fulfilment ─────────────────────────────
  {
    name:          'Data Subject Request Fulfilment',
    department:    'compliance',
    trigger_event: 'dsr_received',
    description:   'GDPR Art.15/17 — identity verification, data export, DPO review, response within 30-day SLA.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('identity_verify', 'Identity Verification', 'action', {
        assignee_role:    'admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('data_locate', 'Locate & Compile Data', 'action', {
        assignee_role:    'admin',
        sla_hours:        120,   // 5 days
        escalate_to_role: 'super_admin',
      }),
      step('dpo_review', 'DPO Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('response_send', 'Send Response to Subject', 'action', {
        assignee_role: 'admin',
        sla_hours:     24,
      }),
    ]),
  },

  // ── 5. New Hire Onboarding ────────────────────────────────────────────────
  {
    name:          'New Hire Onboarding',
    department:    'hr',
    trigger_event: 'hire_approved',
    description:   'Cross-dept: HR confirms → IT provisions access → Finance sets up payroll → Equipment ordered.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('hr_confirm', 'HR Records Confirmation', 'action', {
        assignee_role:    'super_admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
      step('it_access', 'IT Account Provisioning', 'action', {
        assignee_role:    'admin',
        sla_hours:        24,
        escalate_to_role: 'super_admin',
      }),
      step('finance_payroll', 'Payroll Setup', 'action', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('procurement_equipment', 'Equipment Order', 'action', {
        assignee_role:    'admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('welcome_notify', 'Welcome Notification', 'notification', {
        assignee_role: 'super_admin',
        sla_hours:     4,
      }),
    ]),
  },

  // ── 6. Supplier Onboarding ────────────────────────────────────────────────
  {
    name:          'Supplier Onboarding',
    department:    'procurement',
    trigger_event: 'supplier_onboard_requested',
    description:   'Due diligence → Legal contract → Finance payment terms → activated in supplier directory.',
    approval_chain: ['super_admin'],
    steps: chain([
      step('due_diligence', 'Due Diligence Review', 'approval', {
        assignee_role:    'admin',
        sla_hours:        72,
        escalate_to_role: 'super_admin',
      }),
      step('legal_contract', 'Legal Contract Review', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        72,
        escalate_to_role: 'super_admin',
      }),
      step('finance_terms', 'Finance Payment Terms', 'approval', {
        assignee_role:    'super_admin',
        sla_hours:        48,
        escalate_to_role: 'super_admin',
      }),
      step('supplier_activate', 'Activate in Directory', 'action', {
        assignee_role:    'admin',
        sla_hours:        8,
        escalate_to_role: 'super_admin',
      }),
    ]),
  },

];

// ── Up ────────────────────────────────────────────────────────────────────────

exports.up = async (pgm) => {
  for (const def of DEFINITIONS) {
    // Idempotent: skip if an active definition already exists for this trigger_event
    const existing = await pgm.db.query(
      `SELECT id FROM workflow_definitions WHERE trigger_event = $1 AND status = 'active' LIMIT 1`,
      [def.trigger_event],
    );
    if (existing.rows.length > 0) {
      console.log(`[seed] skipping '${def.trigger_event}' — active definition already exists`);
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

    console.log(`[seed] inserted workflow: ${def.name} (${def.trigger_event})`);
  }
};

// ── Down ──────────────────────────────────────────────────────────────────────

exports.down = async (pgm) => {
  const events = DEFINITIONS.map(d => d.trigger_event);
  await pgm.db.query(
    `DELETE FROM workflow_definitions WHERE trigger_event = ANY($1) AND created_by = 'system'`,
    [events],
  );
};
