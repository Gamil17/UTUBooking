'use strict';

/**
 * Tasks Inbox — unified view of all pending tasks across all workflows
 *
 * This is the "My Tasks" single pane of glass for every employee.
 *
 * GET /inbox              — all tasks assigned to current user (pending + overdue)
 *                           Includes SLA health, context summary, action links
 *
 * GET /dashboard          — super_admin: system-wide task health overview
 *                           Counts by department, status, SLA health
 *
 * GET /overdue            — super_admin: all overdue steps across all workflows
 *
 * GET /stats              — summary stats: my pending, my overdue, completed this week
 *
 * GET /:stepLogId/recommend — AI-powered approval recommendation from Claude
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const { getRecommendation } = require('../ai/recommendation');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// ── GET /inbox — my task inbox ────────────────────────────────────────────────

router.get('/inbox', async (req, res) => {
  const { status } = req.query; // optional filter: 'in_progress' | 'overdue' | 'escalated'
  const limit  = Math.min(parseInt(req.query.limit ?? 100), 500);
  const offset = parseInt(req.query.offset ?? 0);

  try {
    const statusFilter = status
      ? `AND sl.status = '${status.replace(/'/g, "''")}'`
      : `AND sl.status IN ('in_progress', 'overdue', 'escalated')`;

    const { rows } = await pool.query(
      `SELECT
          sl.id                AS step_log_id,
          sl.step_name,
          sl.step_type,
          sl.assignee_role,
          sl.sla_hours,
          sl.sla_deadline,
          sl.status            AS step_status,
          sl.activated_at,
          sl.escalated_to,
          wi.id                AS instance_id,
          wi.trigger_event,
          wi.trigger_ref,
          wi.trigger_ref_type,
          wi.context,
          wi.initiated_by,
          wi.status            AS instance_status,
          wi.started_at,
          wd.name              AS workflow_name,
          wd.department,
          -- SLA health signal
          CASE
            WHEN sl.sla_deadline IS NOT NULL AND sl.sla_deadline < NOW()           THEN 'overdue'
            WHEN sl.sla_deadline IS NOT NULL
                 AND NOW() >= sl.activated_at + (sl.sla_hours * INTERVAL '1 hour' * 0.5) THEN 'due_soon'
            WHEN sl.sla_deadline IS NOT NULL                                       THEN 'on_track'
            ELSE 'no_sla'
          END AS sla_health,
          -- Minutes remaining until SLA breach (null if no SLA or already breached)
          CASE
            WHEN sl.sla_deadline IS NOT NULL AND sl.sla_deadline > NOW()
            THEN EXTRACT(EPOCH FROM (sl.sla_deadline - NOW())) / 60
            ELSE NULL
          END AS sla_minutes_remaining
        FROM workflow_step_logs sl
        JOIN workflow_instances wi ON wi.id = sl.instance_id
        JOIN workflow_definitions wd ON wd.id = wi.definition_id
       WHERE sl.assignee_email = $1
         ${statusFilter}
       ORDER BY
         -- Overdue first, then due_soon, then on_track, then no_sla
         CASE sl.status WHEN 'overdue' THEN 0 WHEN 'escalated' THEN 1 ELSE 2 END,
         sl.sla_deadline ASC NULLS LAST,
         sl.activated_at ASC
       LIMIT $2 OFFSET $3`,
      [req.user.email, limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM workflow_step_logs sl
         JOIN workflow_instances wi ON wi.id = sl.instance_id
        WHERE sl.assignee_email = $1
          ${statusFilter}`,
      [req.user.email],
    );

    res.json({
      total:  parseInt(total.rows[0].count),
      rows,
      meta: {
        user:     req.user.email,
        fetched:  new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[tasks] GET /inbox', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /stats — my task summary ──────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [pending, overdue, completedWeek, escalated] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM workflow_step_logs
          WHERE assignee_email = $1 AND status = 'in_progress'`,
        [req.user.email],
      ),
      pool.query(
        `SELECT COUNT(*) FROM workflow_step_logs
          WHERE assignee_email = $1 AND status = 'overdue'`,
        [req.user.email],
      ),
      pool.query(
        `SELECT COUNT(*) FROM workflow_step_logs
          WHERE decision_by = $1
            AND decision_at >= NOW() - INTERVAL '7 days'`,
        [req.user.email],
      ),
      pool.query(
        `SELECT COUNT(*) FROM workflow_step_logs
          WHERE assignee_email = $1 AND status = 'escalated'`,
        [req.user.email],
      ),
    ]);

    res.json({
      data: {
        pending:        parseInt(pending.rows[0].count),
        overdue:        parseInt(overdue.rows[0].count),
        escalated:      parseInt(escalated.rows[0].count),
        completed_week: parseInt(completedWeek.rows[0].count),
      },
    });
  } catch (err) {
    console.error('[tasks] GET /stats', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /dashboard — system-wide health (super_admin) ─────────────────────────

router.get('/dashboard', async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.email !== 'system@internal') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'super_admin required' });
  }

  try {
    const [byDept, byStatus, slaHealth, recentCompleted] = await Promise.all([

      // Active instances by department
      pool.query(`
        SELECT wd.department, COUNT(*) AS count
          FROM workflow_instances wi
          JOIN workflow_definitions wd ON wd.id = wi.definition_id
         WHERE wi.status IN ('pending', 'in_progress', 'overdue')
         GROUP BY wd.department
         ORDER BY count DESC
      `),

      // Instances by status
      pool.query(`
        SELECT status, COUNT(*) AS count
          FROM workflow_instances
         GROUP BY status
         ORDER BY count DESC
      `),

      // Step SLA health breakdown
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE sla_deadline IS NULL)                                       AS no_sla,
          COUNT(*) FILTER (WHERE sla_deadline > NOW())                                       AS on_track,
          COUNT(*) FILTER (
            WHERE sla_deadline IS NOT NULL
              AND sla_deadline > NOW()
              AND NOW() >= activated_at + (sla_hours * INTERVAL '1 hour' * 0.5)
          )                                                                                   AS due_soon,
          COUNT(*) FILTER (WHERE sla_deadline < NOW())                                       AS overdue
        FROM workflow_step_logs
        WHERE status IN ('in_progress', 'overdue', 'escalated')
      `),

      // Last 10 completed instances
      pool.query(`
        SELECT wi.id, wi.status, wi.trigger_event, wi.initiated_by,
               wi.completed_at, wd.name AS workflow_name, wd.department
          FROM workflow_instances wi
          JOIN workflow_definitions wd ON wd.id = wi.definition_id
         WHERE wi.status IN ('approved', 'rejected', 'cancelled')
         ORDER BY wi.completed_at DESC
         LIMIT 10
      `),
    ]);

    res.json({
      data: {
        active_by_department: byDept.rows,
        instances_by_status:  byStatus.rows,
        sla_health:           slaHealth.rows[0],
        recently_completed:   recentCompleted.rows,
        generated_at:         new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[tasks] GET /dashboard', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /overdue — all overdue steps (super_admin) ────────────────────────────

router.get('/overdue', async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.email !== 'system@internal') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'super_admin required' });
  }

  const limit  = Math.min(parseInt(req.query.limit ?? 100), 500);
  const offset = parseInt(req.query.offset ?? 0);

  try {
    const { rows } = await pool.query(
      `SELECT sl.id AS step_log_id, sl.step_name, sl.assignee_email, sl.assignee_role,
              sl.sla_deadline, sl.escalated_to, sl.status AS step_status,
              sl.activated_at,
              EXTRACT(EPOCH FROM (NOW() - sl.sla_deadline)) / 3600 AS hours_overdue,
              wi.id AS instance_id, wi.trigger_event, wi.initiated_by,
              wd.name AS workflow_name, wd.department
         FROM workflow_step_logs sl
         JOIN workflow_instances wi ON wi.id = sl.instance_id
         JOIN workflow_definitions wd ON wd.id = wi.definition_id
        WHERE sl.status IN ('overdue', 'escalated')
           OR (sl.status = 'in_progress' AND sl.sla_deadline < NOW())
        ORDER BY sl.sla_deadline ASC NULLS LAST
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM workflow_step_logs
        WHERE status IN ('overdue', 'escalated')
           OR (status = 'in_progress' AND sla_deadline < NOW())`,
    );

    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    console.error('[tasks] GET /overdue', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /:stepLogId/recommend — AI approval recommendation ───────────────────

router.get('/:stepLogId/recommend', async (req, res) => {
  const { stepLogId } = req.params;

  try {
    // Load step log + instance + definition in one join
    const { rows } = await pool.query(
      `SELECT
          sl.id              AS step_log_id,
          sl.step_name,
          sl.step_type,
          sl.assignee_role,
          sl.sla_hours,
          sl.sla_deadline,
          sl.status          AS step_status,
          sl.activated_at,
          wi.id              AS instance_id,
          wi.trigger_event,
          wi.trigger_ref,
          wi.trigger_ref_type,
          wi.context,
          wi.initiated_by,
          wd.name            AS workflow_name,
          wd.department,
          CASE
            WHEN sl.sla_deadline IS NOT NULL AND sl.sla_deadline < NOW()           THEN 'overdue'
            WHEN sl.sla_deadline IS NOT NULL
                 AND NOW() >= sl.activated_at + (sl.sla_hours * INTERVAL '1 hour' * 0.5) THEN 'due_soon'
            WHEN sl.sla_deadline IS NOT NULL                                       THEN 'on_track'
            ELSE 'no_sla'
          END AS sla_health
        FROM workflow_step_logs sl
        JOIN workflow_instances wi ON wi.id = sl.instance_id
        JOIN workflow_definitions wd ON wd.id = wi.definition_id
       WHERE sl.id = $1`,
      [stepLogId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'STEP_NOT_FOUND' });
    }

    const step = rows[0];

    // Only allow recommendations for steps currently requiring action
    if (!['in_progress', 'overdue', 'escalated'].includes(step.step_status)) {
      return res.status(409).json({
        error: 'STEP_NOT_ACTIONABLE',
        message: `Step is '${step.step_status}' — recommendation only available for active steps`,
      });
    }

    const recommendation = await getRecommendation({
      workflow_name: step.workflow_name,
      step_name:     step.step_name,
      department:    step.department,
      trigger_event: step.trigger_event,
      context:       step.context ?? {},
      initiated_by:  step.initiated_by,
      sla_hours:     step.sla_hours,
      sla_health:    step.sla_health,
    });

    console.log(
      `[tasks/recommend] step=${stepLogId} workflow="${step.workflow_name}"` +
      ` rec=${recommendation.recommended_decision} conf=${recommendation.confidence}`,
    );

    return res.json({
      step_log_id:   stepLogId,
      workflow_name: step.workflow_name,
      step_name:     step.step_name,
      department:    step.department,
      recommendation,
      generated_at:  new Date().toISOString(),
    });
  } catch (err) {
    console.error('[tasks/recommend] error:', err.message);
    // Distinguish Claude failures from DB failures
    if (err.message?.includes('Claude') || err.message?.includes('non-JSON') || err.status) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI recommendation service temporarily unavailable' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
