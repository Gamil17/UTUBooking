'use strict';

/**
 * Step Executor — core engine
 *
 * Responsibilities:
 *  1. activateStep(instance, stepDef, pool) — starts a step: creates step_log, sets SLA, sends notification
 *  2. processDecision(instanceId, stepLogId, decision, actor, comments, pool) — records a decision and
 *     advances the instance to the next step or closes the workflow
 *  3. autoApproveCheck(stepDef, context) — returns true if this step can be auto-approved by rule
 *  4. resolveAssignee(stepDef, pool) — looks up which user to assign based on role
 *
 * State machine:
 *   instance: pending → in_progress (on first step activation)
 *   step:     pending → in_progress (on activation) → approved/rejected/escalated
 *   instance: in_progress → approved (all steps pass) / rejected (any step rejects)
 */

const http   = require('http');
const { Pool } = require('pg');
const notify   = require('../notifications/notify');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Launch a new workflow instance for a given trigger event.
 *
 * @param {object} opts
 * @param {string} opts.triggerEvent    — e.g. 'expense_submitted'
 * @param {string} opts.triggerRef      — ID of the triggering object
 * @param {string} opts.triggerRefType  — type of the triggering object, e.g. 'expense'
 * @param {string} opts.initiatedBy     — user email who triggered it
 * @param {object} opts.context         — business data carried through the workflow
 * @returns {object} created instance row
 */
async function launchWorkflow({ triggerEvent, triggerRef, triggerRefType, initiatedBy, context = {} }) {
  // Find the active definition for this trigger event
  const { rows: defRows } = await pool.query(
    `SELECT * FROM workflow_definitions
      WHERE trigger_event = $1 AND status = 'active'
      ORDER BY created_at DESC LIMIT 1`,
    [triggerEvent],
  );

  if (!defRows.length) {
    throw new Error(`No active workflow definition found for trigger_event='${triggerEvent}'`);
  }

  const def = defRows[0];
  const steps = def.steps; // JSONB array

  if (!steps.length) {
    throw new Error(`Workflow definition '${def.name}' has no steps defined`);
  }

  // Create the instance
  const { rows: instRows } = await pool.query(
    `INSERT INTO workflow_instances
       (definition_id, definition_version, trigger_event, trigger_ref, trigger_ref_type,
        status, initiated_by, current_step_index, context)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, 0, $7)
     RETURNING *`,
    [def.id, def.version, triggerEvent, triggerRef || null,
     triggerRefType || null, initiatedBy, JSON.stringify(context)],
  );

  const instance = instRows[0];

  // Log instance_started event
  await _logEvent(instance.id, null, 'instance_started', initiatedBy, {
    definition: def.name, version: def.version, trigger_ref: triggerRef,
  });

  // Activate the first step
  await activateStep(instance, steps[0]);

  return instance;
}

/**
 * Activate a step: create step_log row, calculate SLA deadline, assign, notify.
 */
async function activateStep(instance, stepDef) {
  const slaDeadline = stepDef.sla_hours
    ? new Date(Date.now() + stepDef.sla_hours * 60 * 60 * 1000)
    : null;

  // Resolve assignee from role
  const assignee = await resolveAssignee(stepDef);

  // Check auto-approve condition before creating log
  if (stepDef.type === 'approval' && autoApproveCheck(stepDef, instance.context)) {
    // Insert as already-approved
    const { rows } = await pool.query(
      `INSERT INTO workflow_step_logs
         (instance_id, step_id, step_name, step_type, assignee_role,
          assignee_id, assignee_email, status, sla_hours, sla_deadline,
          decision, decision_by, decision_at, activated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'approved',$8,$9,'auto_approved','system',NOW(),NOW())
       RETURNING *`,
      [instance.id, stepDef.id, stepDef.name, stepDef.type,
       stepDef.assignee_role || null,
       assignee?.id || null, assignee?.email || null,
       stepDef.sla_hours || null, slaDeadline],
    );
    const stepLog = rows[0];

    await _logEvent(instance.id, stepLog.id, 'auto_approved', 'system', {
      step: stepDef.name, condition: stepDef.auto_approve_condition,
    });

    // Advance immediately
    await _advance(instance, stepDef, 'approve');
    return stepLog;
  }

  // Normal activation
  const { rows } = await pool.query(
    `INSERT INTO workflow_step_logs
       (instance_id, step_id, step_name, step_type, assignee_role,
        assignee_id, assignee_email, status, sla_hours, sla_deadline, activated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'in_progress',$8,$9,NOW())
     RETURNING *`,
    [instance.id, stepDef.id, stepDef.name, stepDef.type,
     stepDef.assignee_role || null,
     assignee?.id || null, assignee?.email || null,
     stepDef.sla_hours || null, slaDeadline],
  );
  const stepLog = rows[0];

  // Update instance status to in_progress on first step
  await pool.query(
    `UPDATE workflow_instances SET status = 'in_progress', updated_at = NOW()
      WHERE id = $1 AND status = 'pending'`,
    [instance.id],
  );

  await _logEvent(instance.id, stepLog.id, 'step_activated', 'system', {
    step: stepDef.name, assignee: assignee?.email || stepDef.assignee_role,
    sla_hours: stepDef.sla_hours,
  });

  // Send assignment notification
  if (assignee?.email) {
    await notify.stepAssigned({
      toEmail:      assignee.email,
      toName:       assignee.name || assignee.email,
      workflowName: await _getWorkflowName(instance.definition_id),
      stepName:     stepDef.name,
      instanceId:   instance.id,
      stepLogId:    stepLog.id,
      slaHours:     stepDef.sla_hours,
      context:      instance.context,
    }).catch(err => console.error('[workflow] notify.stepAssigned failed:', err.message));
  }

  return stepLog;
}

/**
 * Record a human decision on a step and advance the workflow.
 *
 * @param {string} instanceId
 * @param {string} stepLogId
 * @param {string} decision    — 'approve' | 'reject' | 'escalate'
 * @param {string} actor       — user email making the decision
 * @param {string} comments
 */
async function processDecision(instanceId, stepLogId, decision, actor, comments = '') {
  const validDecisions = ['approve', 'reject', 'escalate'];
  if (!validDecisions.includes(decision)) {
    throw new Error(`Invalid decision '${decision}'. Must be: ${validDecisions.join(', ')}`);
  }

  // Load instance + step log
  const { rows: instRows } = await pool.query(
    `SELECT wi.*, wd.steps, wd.name AS wf_name
       FROM workflow_instances wi
       JOIN workflow_definitions wd ON wd.id = wi.definition_id
      WHERE wi.id = $1`,
    [instanceId],
  );
  if (!instRows.length) throw new Error('Instance not found');

  const instance = instRows[0];

  if (!['in_progress', 'overdue'].includes(instance.status)) {
    throw new Error(`Instance is already '${instance.status}' — cannot process decision`);
  }

  const { rows: slRows } = await pool.query(
    `SELECT * FROM workflow_step_logs WHERE id = $1 AND instance_id = $2`,
    [stepLogId, instanceId],
  );
  if (!slRows.length) throw new Error('Step log not found');

  const stepLog = slRows[0];

  if (!['in_progress', 'overdue'].includes(stepLog.status)) {
    throw new Error(`Step is already '${stepLog.status}' — cannot process decision`);
  }

  // Record decision on step log
  const newStatus = decision === 'approve'   ? 'approved'
                  : decision === 'reject'    ? 'rejected'
                  : /* escalate */             'escalated';

  await pool.query(
    `UPDATE workflow_step_logs
        SET status = $1, decision = $2, decision_by = $3, decision_at = NOW(),
            comments = $4, updated_at = NOW()
      WHERE id = $5`,
    [newStatus, decision, actor, comments || null, stepLogId],
  );

  await _logEvent(instanceId, stepLogId, `step_${decision}d`, actor, {
    step: stepLog.step_name, comments,
  });

  // Retrieve current step definition from definition steps array
  const steps = instance.steps;
  const currentStepDef = steps[instance.current_step_index];

  if (decision === 'reject') {
    // Reject terminates the whole workflow
    await _closeInstance(instance.id, 'rejected', actor, comments);
    return { status: 'rejected' };
  }

  if (decision === 'escalate') {
    // Escalate: reassign to next-level role defined in step or default escalation chain
    await _handleEscalation(instance, stepLog, currentStepDef, actor);
    return { status: 'escalated' };
  }

  // Approve: advance to next step
  await _advance(instance, currentStepDef, 'approve', actor);
  return { status: 'advanced' };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Advance the instance to the next step, or close it if all steps are done.
 */
async function _advance(instance, currentStepDef, decision, actor = 'system') {
  const steps = instance.steps || [];
  const nextStepId = decision === 'approve'
    ? currentStepDef.on_approve
    : currentStepDef.on_reject;

  // Determine next step by ID or sequential index
  let nextStep = null;
  if (nextStepId) {
    nextStep = steps.find(s => s.id === nextStepId) || null;
  } else {
    // Fall through sequentially
    const nextIndex = instance.current_step_index + 1;
    nextStep = steps[nextIndex] || null;
  }

  if (!nextStep) {
    // All steps done — workflow approved
    await _closeInstance(instance.id, 'approved', actor, null);
    return;
  }

  // Update current_step_index
  const nextIndex = steps.findIndex(s => s.id === nextStep.id);
  await pool.query(
    `UPDATE workflow_instances
        SET current_step_index = $1, updated_at = NOW()
      WHERE id = $2`,
    [nextIndex, instance.id],
  );

  // Reload instance with updated index for activateStep
  const updatedInstance = { ...instance, current_step_index: nextIndex };
  await activateStep(updatedInstance, nextStep);
}

async function _handleEscalation(instance, stepLog, stepDef, actor) {
  const escalateTo = stepDef.escalate_to_role || 'super_admin';

  // Find a user with the escalation role
  const escalatee = await _findUserByRole(escalateTo);

  await pool.query(
    `UPDATE workflow_step_logs
        SET status = 'escalated', escalated_to = $1, assignee_role = $2,
            assignee_id = $3, assignee_email = $4,
            sla_deadline = NOW() + INTERVAL '4 hours',
            reminder_sent = false, updated_at = NOW()
      WHERE id = $5`,
    [escalateTo, escalateTo,
     escalatee?.id || null, escalatee?.email || null,
     stepLog.id],
  );

  await _logEvent(instance.id, stepLog.id, 'step_escalated', actor, {
    escalated_to: escalateTo, step: stepLog.step_name,
  });

  if (escalatee?.email) {
    await notify.stepEscalated({
      toEmail:      escalatee.email,
      toName:       escalatee.name || escalatee.email,
      workflowName: instance.wf_name || 'Workflow',
      stepName:     stepLog.step_name,
      instanceId:   instance.id,
      stepLogId:    stepLog.id,
      escalatedBy:  actor,
    }).catch(err => console.error('[workflow] notify.stepEscalated failed:', err.message));
  }
}

async function _closeInstance(instanceId, outcome, actor, note) {
  await pool.query(
    `UPDATE workflow_instances
        SET status = $1, completed_at = NOW(), outcome_note = $2, updated_at = NOW()
      WHERE id = $3`,
    [outcome, note || null, instanceId],
  );

  await _logEvent(instanceId, null, `instance_${outcome}`, actor, { note });

  // Load instance for notifications + callback
  const { rows } = await pool.query(
    `SELECT wi.initiated_by, wi.trigger_event, wi.trigger_ref, wi.trigger_ref_type,
            wd.name AS wf_name
       FROM workflow_instances wi
       JOIN workflow_definitions wd ON wd.id = wi.definition_id
      WHERE wi.id = $1`,
    [instanceId],
  );

  const inst = rows[0];

  // Send final notification to initiator
  if (inst?.initiated_by) {
    await notify.instanceClosed({
      toEmail:      inst.initiated_by,
      workflowName: inst.wf_name,
      outcome,
      instanceId,
      note,
    }).catch(err => console.error('[workflow] notify.instanceClosed failed:', err.message));
  }

  // Fire completion callback to admin service so source record status is updated
  if (inst?.trigger_ref) {
    _fireCompletionCallback({
      trigger_event:    inst.trigger_event,
      trigger_ref:      inst.trigger_ref,
      trigger_ref_type: inst.trigger_ref_type,
      outcome,
      initiated_by:     inst.initiated_by,
      note,
    });
  }
}

/**
 * Fire-and-forget HTTP POST to admin service callback endpoint.
 * Tells the admin service to update the source record with the workflow outcome.
 * Never blocks — errors are logged but do not affect the workflow close.
 */
function _fireCompletionCallback(payload) {
  const adminHost   = process.env.ADMIN_SERVICE_HOST || 'admin-service';
  const adminPort   = parseInt(process.env.ADMIN_SERVICE_PORT || '3012', 10);
  const adminSecret = process.env.ADMIN_SECRET || '';

  const body = JSON.stringify(payload);

  const options = {
    hostname: adminHost,
    port:     adminPort,
    path:     '/internal/workflow/callback',
    method:   'POST',
    headers: {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-admin-secret': adminSecret,
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 400) {
        console.error(
          `[workflow] completion callback failed: trigger=${payload.trigger_event}` +
          ` status=${res.statusCode} body=${data}`,
        );
      } else {
        console.log(
          `[workflow] completion callback ok: trigger=${payload.trigger_event}` +
          ` outcome=${payload.outcome} ref=${payload.trigger_ref}`,
        );
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[workflow] completion callback error: trigger=${payload.trigger_event}`, err.message);
  });

  req.write(body);
  req.end();
}

async function _logEvent(instanceId, stepLogId, eventType, actor, meta) {
  await pool.query(
    `INSERT INTO workflow_events (instance_id, step_log_id, event_type, actor, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [instanceId, stepLogId || null, eventType, actor || 'system',
     meta ? JSON.stringify(meta) : null],
  ).catch(err => console.error('[workflow] _logEvent failed:', err.message));
}

async function _getWorkflowName(definitionId) {
  const { rows } = await pool.query(
    `SELECT name FROM workflow_definitions WHERE id = $1`, [definitionId],
  );
  return rows[0]?.name || 'Workflow';
}

/**
 * Resolve the assignee user from a step's assignee_role.
 * Looks up admin users with a matching role or department field.
 * Returns { id, email, name } or null.
 */
async function resolveAssignee(stepDef) {
  if (!stepDef.assignee_role) return null;

  // Direct email assignment takes priority
  if (stepDef.assignee_email) {
    const { rows } = await pool.query(
      `SELECT id, email, name FROM users WHERE email = $1 LIMIT 1`,
      [stepDef.assignee_email],
    );
    return rows[0] || null;
  }

  // Map role to admin users
  // Convention: assignee_role matches user.role or a department tag
  const { rows } = await pool.query(
    `SELECT id, email, name FROM users
      WHERE role = $1 AND COALESCE(status, 'active') = 'active'
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 1`,
    [stepDef.assignee_role],
  );
  return rows[0] || null;
}

async function _findUserByRole(role) {
  const { rows } = await pool.query(
    `SELECT id, email, name FROM users
      WHERE role = $1 AND COALESCE(status, 'active') = 'active'
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 1`,
    [role],
  );
  return rows[0] || null;
}

/**
 * Check if a step can be automatically approved based on its condition.
 *
 * Supported conditions (stored as JSON in stepDef.auto_approve_condition):
 *   { field: 'amount', op: 'lt', value: 500 }   — amount < 500
 *   { field: 'amount', op: 'lte', value: 5000 }  — amount <= 5000
 *
 * Returns true if auto-approve should fire.
 */
function autoApproveCheck(stepDef, context) {
  if (!stepDef.auto_approve_condition) return false;

  try {
    const cond = typeof stepDef.auto_approve_condition === 'string'
      ? JSON.parse(stepDef.auto_approve_condition)
      : stepDef.auto_approve_condition;

    const fieldValue = context[cond.field];
    if (fieldValue === undefined || fieldValue === null) return false;

    const val = parseFloat(fieldValue);
    const threshold = parseFloat(cond.value);

    switch (cond.op) {
      case 'lt':  return val < threshold;
      case 'lte': return val <= threshold;
      case 'gt':  return val > threshold;
      case 'gte': return val >= threshold;
      case 'eq':  return val === threshold;
      default:    return false;
    }
  } catch {
    return false;
  }
}

module.exports = {
  launchWorkflow,
  activateStep,
  processDecision,
  resolveAssignee,
  autoApproveCheck,
};
