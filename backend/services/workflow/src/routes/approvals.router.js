'use strict';

/**
 * Approvals — record human decisions on workflow steps
 *
 * POST /decide        — record approve | reject | escalate on a step
 *                       Body: { instance_id, step_log_id, decision, comments }
 *
 * GET  /pending       — steps pending THIS user's decision (by email)
 *                       Query: ?email=xxx (admin can query any; non-admin only own)
 *
 * GET  /history       — decisions made by this user (or all, for super_admin)
 *                       Query: ?email=xxx&limit=50&offset=0
 */

const { Router }           = require('express');
const { Pool }             = require('pg');
const { processDecision }  = require('../engine/step-executor');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// ── POST /decide ──────────────────────────────────────────────────────────────

router.post('/decide', async (req, res) => {
  const { instance_id, step_log_id, decision, comments } = req.body ?? {};

  if (!instance_id || !step_log_id || !decision) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'instance_id, step_log_id, and decision are required',
    });
  }

  const validDecisions = ['approve', 'reject', 'escalate'];
  if (!validDecisions.includes(decision)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `decision must be one of: ${validDecisions.join(', ')}`,
    });
  }

  try {
    // Verify this user is the assigned approver (unless super_admin)
    const { rows: stepRows } = await pool.query(
      `SELECT sl.*, wi.initiated_by
         FROM workflow_step_logs sl
         JOIN workflow_instances wi ON wi.id = sl.instance_id
        WHERE sl.id = $1 AND sl.instance_id = $2`,
      [step_log_id, instance_id],
    );

    if (!stepRows.length) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Step not found' });
    }

    const step = stepRows[0];

    // Only the assigned approver or super_admin may decide
    const canDecide =
      req.user.role === 'super_admin' ||
      req.user.email === 'system@internal' ||
      step.assignee_email === req.user.email ||
      step.assignee_id === req.user.sub;

    if (!canDecide) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You are not the assigned approver for this step',
      });
    }

    const result = await processDecision(
      instance_id, step_log_id, decision, req.user.email, comments || '',
    );

    res.json({ message: `Step ${decision}d`, result });
  } catch (err) {
    console.error('[approvals] POST /decide', err.message);
    if (err.message.includes('already')) {
      return res.status(409).json({ error: 'CONFLICT', message: err.message });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /pending — steps waiting for this user ────────────────────────────────

router.get('/pending', async (req, res) => {
  // Allow super_admin to query any email; others can only query their own
  let targetEmail = req.user.email;
  if (req.query.email && req.user.role === 'super_admin') {
    targetEmail = req.query.email;
  }

  const limit  = Math.min(parseInt(req.query.limit ?? 50), 200);
  const offset = parseInt(req.query.offset ?? 0);

  try {
    const { rows } = await pool.query(
      `SELECT sl.id AS step_log_id, sl.step_name, sl.step_type, sl.step_id,
              sl.assignee_role, sl.sla_hours, sl.sla_deadline, sl.status AS step_status,
              sl.activated_at, sl.created_at,
              wi.id AS instance_id, wi.trigger_event, wi.trigger_ref,
              wi.trigger_ref_type, wi.context, wi.initiated_by,
              wi.status AS instance_status, wi.started_at,
              wd.name AS workflow_name, wd.department,
              CASE
                WHEN sl.sla_deadline IS NOT NULL AND sl.sla_deadline < NOW() THEN 'overdue'
                WHEN sl.sla_deadline IS NOT NULL
                     AND NOW() >= sl.activated_at + (sl.sla_hours * INTERVAL '1 hour' * 0.5)
                THEN 'due_soon'
                ELSE 'on_track'
              END AS sla_health
         FROM workflow_step_logs sl
         JOIN workflow_instances wi ON wi.id = sl.instance_id
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
        WHERE sl.assignee_email = $1
          AND sl.status IN ('in_progress', 'overdue', 'escalated')
        ORDER BY
          CASE sl.status WHEN 'overdue' THEN 0 WHEN 'escalated' THEN 1 ELSE 2 END,
          sl.sla_deadline ASC NULLS LAST
        LIMIT $2 OFFSET $3`,
      [targetEmail, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM workflow_step_logs
        WHERE assignee_email = $1 AND status IN ('in_progress', 'overdue', 'escalated')`,
      [targetEmail],
    );

    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    console.error('[approvals] GET /pending', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /history — decision history ──────────────────────────────────────────

router.get('/history', async (req, res) => {
  let targetEmail = req.user.email;
  if (req.query.email && req.user.role === 'super_admin') {
    targetEmail = req.query.email;
  }

  const limit  = Math.min(parseInt(req.query.limit ?? 50), 200);
  const offset = parseInt(req.query.offset ?? 0);

  try {
    const { rows } = await pool.query(
      `SELECT sl.id AS step_log_id, sl.step_name, sl.decision, sl.decision_at,
              sl.comments, sl.status AS step_status,
              wi.id AS instance_id, wi.trigger_event, wi.trigger_ref,
              wi.status AS instance_status,
              wd.name AS workflow_name, wd.department
         FROM workflow_step_logs sl
         JOIN workflow_instances wi ON wi.id = sl.instance_id
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
        WHERE sl.decision_by = $1
          AND sl.decision IS NOT NULL
        ORDER BY sl.decision_at DESC
        LIMIT $2 OFFSET $3`,
      [targetEmail, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM workflow_step_logs
        WHERE decision_by = $1 AND decision IS NOT NULL`,
      [targetEmail],
    );

    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    console.error('[approvals] GET /history', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
