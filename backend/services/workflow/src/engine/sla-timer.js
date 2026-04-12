'use strict';

/**
 * SLA Timer — runs every 15 minutes via node-cron
 *
 * Each tick does three things:
 *
 *  1. REMINDER — steps at 50% of SLA elapsed, reminder not yet sent
 *     → send reminder notification to assignee
 *     → mark reminder_sent = true
 *
 *  2. BREACH — steps where sla_deadline has passed and status is still in_progress
 *     → mark step status = 'overdue'
 *     → mark instance status = 'overdue' if not already
 *     → escalate: re-assign to escalation role
 *     → log sla_breached event
 *     → notify assignee + their manager
 *
 *  3. STALE PENDING — instances in 'pending' for > 24h (definition may have no steps or system error)
 *     → log warning, do not auto-close — human must investigate
 */

const cron   = require('node-cron');
const { Pool } = require('pg');
const notify   = require('../notifications/notify');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Tick ──────────────────────────────────────────────────────────────────────

async function tick() {
  try {
    await Promise.all([
      _sendReminders(),
      _escalateBreached(),
      _warnStalePending(),
    ]);
  } catch (err) {
    console.error('[sla-timer] tick error:', err.message);
  }
}

// ── 1. Send 50% SLA reminders ─────────────────────────────────────────────────

async function _sendReminders() {
  // Steps where more than 50% of SLA time has elapsed but deadline not yet passed
  const { rows } = await pool.query(`
    SELECT sl.id, sl.instance_id, sl.step_name, sl.assignee_email, sl.assignee_id,
           sl.sla_hours, sl.sla_deadline, sl.activated_at,
           wi.context
      FROM workflow_step_logs sl
      JOIN workflow_instances wi ON wi.id = sl.instance_id
     WHERE sl.status = 'in_progress'
       AND sl.sla_deadline IS NOT NULL
       AND sl.reminder_sent = false
       AND sl.activated_at IS NOT NULL
       AND NOW() >= sl.activated_at + (sl.sla_hours * INTERVAL '1 hour' * 0.5)
       AND NOW() < sl.sla_deadline
  `);

  for (const step of rows) {
    try {
      if (step.assignee_email) {
        await notify.slaReminder({
          toEmail:      step.assignee_email,
          stepName:     step.step_name,
          instanceId:   step.instance_id,
          stepLogId:    step.id,
          slaDeadline:  step.sla_deadline,
          hoursLeft:    Math.round(
            (new Date(step.sla_deadline) - Date.now()) / 1000 / 3600,
          ),
        });
      }

      await pool.query(
        `UPDATE workflow_step_logs SET reminder_sent = true, updated_at = NOW() WHERE id = $1`,
        [step.id],
      );

      await _logEvent(step.instance_id, step.id, 'sla_reminder', 'system', {
        step: step.step_name,
        deadline: step.sla_deadline,
      });
    } catch (err) {
      console.error('[sla-timer] reminder failed for step', step.id, err.message);
    }
  }

  if (rows.length) {
    console.log(`[sla-timer] sent ${rows.length} SLA reminder(s)`);
  }
}

// ── 2. Escalate breached SLAs ─────────────────────────────────────────────────

async function _escalateBreached() {
  const { rows } = await pool.query(`
    SELECT sl.id, sl.instance_id, sl.step_name, sl.assignee_email,
           sl.step_id, sl.sla_deadline,
           wi.definition_id, wi.current_step_index, wi.context,
           wd.steps, wd.name AS wf_name
      FROM workflow_step_logs sl
      JOIN workflow_instances wi ON wi.id = sl.instance_id
      JOIN workflow_definitions wd ON wd.id = wi.definition_id
     WHERE sl.status = 'in_progress'
       AND sl.sla_deadline IS NOT NULL
       AND sl.sla_deadline < NOW()
  `);

  for (const step of rows) {
    try {
      // Mark step as overdue
      await pool.query(
        `UPDATE workflow_step_logs SET status = 'overdue', updated_at = NOW() WHERE id = $1`,
        [step.id],
      );

      // Mark instance as overdue
      await pool.query(
        `UPDATE workflow_instances SET status = 'overdue', updated_at = NOW()
          WHERE id = $1 AND status = 'in_progress'`,
        [step.instance_id],
      );

      // Find escalation target from step definition
      const stepDef = (step.steps || []).find(s => s.id === step.step_id) || {};
      const escalateToRole = stepDef.escalate_to_role || 'super_admin';

      const { rows: escRows } = await pool.query(
        `SELECT id, email, name FROM users
          WHERE role = $1 AND COALESCE(status,'active') = 'active'
          ORDER BY last_seen_at DESC NULLS LAST LIMIT 1`,
        [escalateToRole],
      );
      const escalatee = escRows[0];

      // Reassign overdue step to escalation target with a fresh 4-hour SLA
      await pool.query(
        `UPDATE workflow_step_logs
            SET escalated_to = $1,
                assignee_role = $2,
                assignee_id   = $3,
                assignee_email = $4,
                sla_deadline  = NOW() + INTERVAL '4 hours',
                reminder_sent = false,
                updated_at    = NOW()
          WHERE id = $5`,
        [escalateToRole, escalateToRole,
         escalatee?.id || null, escalatee?.email || null,
         step.id],
      );

      await _logEvent(step.instance_id, step.id, 'sla_breached', 'system', {
        step:         step.step_name,
        deadline:     step.sla_deadline,
        escalated_to: escalateToRole,
      });

      // Notify original assignee (SLA breach) + escalatee (new assignment)
      if (step.assignee_email) {
        await notify.slaBreached({
          toEmail:      step.assignee_email,
          stepName:     step.step_name,
          instanceId:   step.instance_id,
          stepLogId:    step.id,
          deadline:     step.sla_deadline,
          escalatedTo:  escalateToRole,
        }).catch(err => console.error('[sla-timer] breach notify failed:', err.message));
      }

      if (escalatee?.email) {
        await notify.stepAssigned({
          toEmail:      escalatee.email,
          toName:       escalatee.name || escalatee.email,
          workflowName: step.wf_name,
          stepName:     step.step_name + ' (ESCALATED)',
          instanceId:   step.instance_id,
          stepLogId:    step.id,
          slaHours:     4,
          context:      step.context,
        }).catch(err => console.error('[sla-timer] escalation assign notify failed:', err.message));
      }

      console.log(`[sla-timer] escalated step ${step.id} (${step.step_name}) → ${escalateToRole}`);
    } catch (err) {
      console.error('[sla-timer] escalation failed for step', step.id, err.message);
    }
  }
}

// ── 3. Warn on stale pending instances ───────────────────────────────────────

async function _warnStalePending() {
  const { rows } = await pool.query(`
    SELECT id, definition_id, trigger_event, initiated_by, created_at
      FROM workflow_instances
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '24 hours'
  `);

  for (const inst of rows) {
    console.warn(
      `[sla-timer] WARNING: instance ${inst.id} has been 'pending' for >24h ` +
      `(trigger: ${inst.trigger_event}, initiated by: ${inst.initiated_by})`,
    );
  }
}

// ── Event log ─────────────────────────────────────────────────────────────────

async function _logEvent(instanceId, stepLogId, eventType, actor, meta) {
  await pool.query(
    `INSERT INTO workflow_events (instance_id, step_log_id, event_type, actor, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [instanceId, stepLogId || null, eventType, actor,
     meta ? JSON.stringify(meta) : null],
  ).catch(err => console.error('[sla-timer] _logEvent error:', err.message));
}

// ── Start ─────────────────────────────────────────────────────────────────────

function startSlaTimer() {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('[sla-timer] tick at', new Date().toISOString());
    tick();
  });

  console.log('[sla-timer] started — checks every 15 minutes');
}

module.exports = { startSlaTimer, tick };
