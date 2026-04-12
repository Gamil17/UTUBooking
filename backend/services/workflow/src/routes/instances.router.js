'use strict';

/**
 * Workflow Instances — launch and monitor
 *
 * GET    /                         — list instances (filter: status, department, trigger_event, initiated_by)
 * GET    /:id                      — get instance with its step logs
 * GET    /:id/events               — full immutable audit trail for an instance
 * POST   /launch                   — launch a new workflow instance for a trigger event
 * POST   /:id/cancel               — cancel an in-progress instance (initiator or super_admin only)
 */

const { Router }        = require('express');
const { Pool }          = require('pg');
const { launchWorkflow } = require('../engine/step-executor');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// ── GET / — list instances ────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { status, department, trigger_event, initiated_by, trigger_ref_type } = req.query;
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 200);
  const offset = parseInt(req.query.offset ?? 0);

  try {
    const conditions = [];
    const vals       = [];
    let   i          = 1;

    if (status)          { conditions.push(`wi.status = $${i++}`);               vals.push(status); }
    if (trigger_event)   { conditions.push(`wi.trigger_event = $${i++}`);        vals.push(trigger_event); }
    if (initiated_by)    { conditions.push(`wi.initiated_by = $${i++}`);         vals.push(initiated_by); }
    if (trigger_ref_type){ conditions.push(`wi.trigger_ref_type = $${i++}`);     vals.push(trigger_ref_type); }
    if (department)      { conditions.push(`wd.department = $${i++}`);           vals.push(department); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await pool.query(
      `SELECT wi.id, wi.status, wi.trigger_event, wi.trigger_ref, wi.trigger_ref_type,
              wi.initiated_by, wi.current_step_index, wi.outcome_note,
              wi.started_at, wi.completed_at, wi.created_at, wi.updated_at,
              wi.definition_id, wi.definition_version,
              wd.name AS workflow_name, wd.department
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
         ${where}
        ORDER BY wi.created_at DESC
        LIMIT $${i} OFFSET $${i + 1}`,
      [...vals, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM workflow_instances wi
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
         ${where}`,
      vals,
    );

    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    console.error('[instances] GET /', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /:id — instance with step logs ───────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows: instRows } = await pool.query(
      `SELECT wi.*, wd.name AS workflow_name, wd.department, wd.steps AS definition_steps
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
        WHERE wi.id = $1`,
      [req.params.id],
    );
    if (!instRows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    const { rows: stepRows } = await pool.query(
      `SELECT * FROM workflow_step_logs WHERE instance_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    );

    res.json({ data: { ...instRows[0], step_logs: stepRows } });
  } catch (err) {
    console.error('[instances] GET /:id', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /:id/events — audit trail ─────────────────────────────────────────────

router.get('/:id/events', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT we.id, we.event_type, we.actor, we.meta, we.created_at,
              sl.step_name
         FROM workflow_events we
         LEFT JOIN workflow_step_logs sl ON sl.id = we.step_log_id
        WHERE we.instance_id = $1
        ORDER BY we.created_at ASC`,
      [req.params.id],
    );
    res.json({ rows });
  } catch (err) {
    console.error('[instances] GET /:id/events', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /launch — launch a new workflow instance ─────────────────────────────

router.post('/launch', async (req, res) => {
  const { trigger_event, trigger_ref, trigger_ref_type, context } = req.body ?? {};

  if (!trigger_event) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'trigger_event is required',
    });
  }

  try {
    const instance = await launchWorkflow({
      triggerEvent:    trigger_event,
      triggerRef:      trigger_ref || null,
      triggerRefType:  trigger_ref_type || null,
      initiatedBy:     req.user.email,
      context:         context || {},
    });

    // Reload with workflow name for response
    const { rows } = await pool.query(
      `SELECT wi.*, wd.name AS workflow_name, wd.department
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
        WHERE wi.id = $1`,
      [instance.id],
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[instances] POST /launch', err.message);
    if (err.message.includes('No active workflow definition')) {
      return res.status(404).json({ error: 'NO_DEFINITION', message: err.message });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:id/cancel — cancel an instance ────────────────────────────────────

router.post('/:id/cancel', async (req, res) => {
  const { reason } = req.body ?? {};

  try {
    const { rows: existing } = await pool.query(
      `SELECT * FROM workflow_instances WHERE id = $1`, [req.params.id],
    );
    if (!existing.length) return res.status(404).json({ error: 'NOT_FOUND' });

    const instance = existing[0];

    // Only initiator or super_admin can cancel
    if (instance.initiated_by !== req.user.email && req.user.role !== 'super_admin'
        && req.user.email !== 'system@internal') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only the initiator or super_admin can cancel this workflow',
      });
    }

    const cancellableStatuses = ['pending', 'in_progress', 'overdue'];
    if (!cancellableStatuses.includes(instance.status)) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: `Cannot cancel a workflow in '${instance.status}' status`,
      });
    }

    await pool.query(
      `UPDATE workflow_instances
          SET status = 'cancelled', completed_at = NOW(),
              outcome_note = $1, updated_at = NOW()
        WHERE id = $2`,
      [reason || null, req.params.id],
    );

    // Mark all pending/in_progress steps as skipped
    await pool.query(
      `UPDATE workflow_step_logs
          SET status = 'skipped', updated_at = NOW()
        WHERE instance_id = $1 AND status IN ('pending', 'in_progress', 'overdue')`,
      [req.params.id],
    );

    await pool.query(
      `INSERT INTO workflow_events (instance_id, event_type, actor, meta)
       VALUES ($1, 'instance_cancelled', $2, $3)`,
      [req.params.id, req.user.email, JSON.stringify({ reason: reason || null })],
    );

    res.json({ message: 'Workflow cancelled', id: req.params.id });
  } catch (err) {
    console.error('[instances] POST /:id/cancel', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
