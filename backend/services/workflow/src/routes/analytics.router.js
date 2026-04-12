'use strict';

/**
 * Workflow Analytics — GET /api/workflow/analytics
 *
 * System-wide BPM performance metrics for management reporting.
 *
 * GET /overview           — KPIs: total instances, approval rate, avg completion time, SLA breach rate
 * GET /by-definition      — per-workflow performance: runs, approval rate, avg hours, bottleneck steps
 * GET /by-department      — department rollup: active, overdue, approval rate
 * GET /bottlenecks        — top 10 slowest steps across all definitions
 * GET /trend              — monthly completion counts for the trailing 12 months
 */

const { Router } = require('express');
const { Pool }   = require('pg');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// ── GET /overview ─────────────────────────────────────────────────────────────

router.get('/overview', async (req, res) => {
  try {
    const [totals, completionTime, breach] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                                          AS total_instances,
          COUNT(*) FILTER (WHERE status = 'approved')                      AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')                      AS rejected,
          COUNT(*) FILTER (WHERE status = 'cancelled')                     AS cancelled,
          COUNT(*) FILTER (WHERE status IN ('pending','in_progress','overdue')) AS active,
          COUNT(*) FILTER (WHERE status IN ('approved','rejected','cancelled')
                            AND completed_at >= NOW() - INTERVAL '30 days') AS completed_30d,
          COUNT(*) FILTER (WHERE status IN ('approved','rejected','cancelled')
                            AND completed_at >= NOW() - INTERVAL '7 days')  AS completed_7d
        FROM workflow_instances
      `),

      pool.query(`
        SELECT
          ROUND(
            AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600)::NUMERIC,
            1
          ) AS avg_completion_hours,
          ROUND(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600
            )::NUMERIC,
            1
          ) AS median_completion_hours,
          ROUND(
            PERCENTILE_CONT(0.9) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600
            )::NUMERIC,
            1
          ) AS p90_completion_hours
        FROM workflow_instances
        WHERE status IN ('approved','rejected')
          AND completed_at IS NOT NULL
          AND started_at   IS NOT NULL
      `),

      pool.query(`
        SELECT
          COUNT(*)                                                   AS total_steps,
          COUNT(*) FILTER (WHERE status = 'overdue'
                            OR (status = 'in_progress' AND sla_deadline < NOW()))
                                                                     AS breached,
          COUNT(*) FILTER (WHERE decision_at IS NOT NULL)            AS decided
        FROM workflow_step_logs
        WHERE sla_hours IS NOT NULL
      `),
    ]);

    const t = totals.rows[0];
    const c = completionTime.rows[0];
    const b = breach.rows[0];

    const closed        = parseInt(t.approved) + parseInt(t.rejected) + parseInt(t.cancelled);
    const approvalRate  = closed > 0
      ? Math.round((parseInt(t.approved) / (parseInt(t.approved) + parseInt(t.rejected))) * 100)
      : null;
    const breachRate    = parseInt(b.total_steps) > 0
      ? Math.round((parseInt(b.breached) / parseInt(b.total_steps)) * 100)
      : 0;

    res.json({
      data: {
        total_instances:       parseInt(t.total_instances),
        active:                parseInt(t.active),
        approved:              parseInt(t.approved),
        rejected:              parseInt(t.rejected),
        cancelled:             parseInt(t.cancelled),
        completed_30d:         parseInt(t.completed_30d),
        completed_7d:          parseInt(t.completed_7d),
        approval_rate_pct:     approvalRate,
        avg_completion_hours:  parseFloat(c.avg_completion_hours)  || null,
        median_completion_hours: parseFloat(c.median_completion_hours) || null,
        p90_completion_hours:  parseFloat(c.p90_completion_hours)  || null,
        sla_breach_rate_pct:   breachRate,
        total_steps_with_sla:  parseInt(b.total_steps),
        sla_breached:          parseInt(b.breached),
      },
    });
  } catch (err) {
    console.error('[analytics] GET /overview', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /by-definition ────────────────────────────────────────────────────────

router.get('/by-definition', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? 50), 100);

  try {
    const { rows } = await pool.query(`
      SELECT
        wd.id                                                           AS definition_id,
        wd.name                                                         AS workflow_name,
        wd.department,
        wd.trigger_event,
        COUNT(wi.id)                                                    AS total_runs,
        COUNT(wi.id) FILTER (WHERE wi.status = 'approved')             AS approved,
        COUNT(wi.id) FILTER (WHERE wi.status = 'rejected')             AS rejected,
        COUNT(wi.id) FILTER (WHERE wi.status = 'cancelled')            AS cancelled,
        COUNT(wi.id) FILTER (
          WHERE wi.status IN ('pending','in_progress','overdue'))       AS active,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at)) / 3600
          ) FILTER (WHERE wi.completed_at IS NOT NULL AND wi.started_at IS NOT NULL)
          ::NUMERIC, 1
        )                                                               AS avg_completion_hours,
        -- Approval rate among closed instances (approved + rejected only)
        CASE
          WHEN COUNT(wi.id) FILTER (WHERE wi.status IN ('approved','rejected')) = 0
          THEN NULL
          ELSE ROUND(
            100.0 *
            COUNT(wi.id) FILTER (WHERE wi.status = 'approved') /
            NULLIF(COUNT(wi.id) FILTER (WHERE wi.status IN ('approved','rejected')), 0)
            , 1
          )
        END                                                             AS approval_rate_pct,
        -- Bottleneck: slowest step on average across all runs
        (
          SELECT sl2.step_name
          FROM workflow_step_logs sl2
          JOIN workflow_instances wi2 ON wi2.id = sl2.instance_id
          WHERE wi2.definition_id = wd.id
            AND sl2.decision_at IS NOT NULL
            AND sl2.activated_at IS NOT NULL
          GROUP BY sl2.step_name
          ORDER BY AVG(EXTRACT(EPOCH FROM (sl2.decision_at - sl2.activated_at)) / 3600) DESC
          LIMIT 1
        )                                                               AS bottleneck_step,
        (
          SELECT ROUND(
            AVG(EXTRACT(EPOCH FROM (sl2.decision_at - sl2.activated_at)) / 3600)::NUMERIC, 1
          )
          FROM workflow_step_logs sl2
          JOIN workflow_instances wi2 ON wi2.id = sl2.instance_id
          WHERE wi2.definition_id = wd.id
            AND sl2.decision_at IS NOT NULL
            AND sl2.activated_at IS NOT NULL
          GROUP BY sl2.step_name
          ORDER BY AVG(EXTRACT(EPOCH FROM (sl2.decision_at - sl2.activated_at)) / 3600) DESC
          LIMIT 1
        )                                                               AS bottleneck_avg_hours
      FROM workflow_definitions wd
      LEFT JOIN workflow_instances wi ON wi.definition_id = wd.id
      GROUP BY wd.id, wd.name, wd.department, wd.trigger_event
      ORDER BY total_runs DESC, wd.name ASC
      LIMIT $1
    `, [limit]);

    const mapped = rows.map(r => ({
      definition_id:         r.definition_id,
      workflow_name:         r.workflow_name,
      department:            r.department,
      trigger_event:         r.trigger_event,
      total_runs:            parseInt(r.total_runs),
      approved:              parseInt(r.approved),
      rejected:              parseInt(r.rejected),
      cancelled:             parseInt(r.cancelled),
      active:                parseInt(r.active),
      approval_rate_pct:     r.approval_rate_pct !== null ? parseFloat(r.approval_rate_pct) : null,
      avg_completion_hours:  r.avg_completion_hours !== null ? parseFloat(r.avg_completion_hours) : null,
      bottleneck_step:       r.bottleneck_step || null,
      bottleneck_avg_hours:  r.bottleneck_avg_hours !== null ? parseFloat(r.bottleneck_avg_hours) : null,
    }));

    res.json({ data: mapped });
  } catch (err) {
    console.error('[analytics] GET /by-definition', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /by-department ────────────────────────────────────────────────────────

router.get('/by-department', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wd.department,
        COUNT(wi.id)                                                    AS total_runs,
        COUNT(wi.id) FILTER (WHERE wi.status IN ('pending','in_progress','overdue')) AS active,
        COUNT(wi.id) FILTER (WHERE wi.status = 'approved')             AS approved,
        COUNT(wi.id) FILTER (WHERE wi.status = 'rejected')             AS rejected,
        COUNT(wi.id) FILTER (WHERE wi.status = 'overdue')              AS overdue,
        CASE
          WHEN COUNT(wi.id) FILTER (WHERE wi.status IN ('approved','rejected')) = 0
          THEN NULL
          ELSE ROUND(
            100.0 *
            COUNT(wi.id) FILTER (WHERE wi.status = 'approved') /
            NULLIF(COUNT(wi.id) FILTER (WHERE wi.status IN ('approved','rejected')), 0)
            , 1
          )
        END                                                             AS approval_rate_pct,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at)) / 3600
          ) FILTER (WHERE wi.completed_at IS NOT NULL AND wi.started_at IS NOT NULL)
          ::NUMERIC, 1
        )                                                               AS avg_completion_hours
      FROM workflow_definitions wd
      LEFT JOIN workflow_instances wi ON wi.definition_id = wd.id
      GROUP BY wd.department
      ORDER BY total_runs DESC
    `);

    res.json({
      data: rows.map(r => ({
        department:           r.department,
        total_runs:           parseInt(r.total_runs),
        active:               parseInt(r.active),
        approved:             parseInt(r.approved),
        rejected:             parseInt(r.rejected),
        overdue:              parseInt(r.overdue),
        approval_rate_pct:    r.approval_rate_pct !== null ? parseFloat(r.approval_rate_pct) : null,
        avg_completion_hours: r.avg_completion_hours !== null ? parseFloat(r.avg_completion_hours) : null,
      })),
    });
  } catch (err) {
    console.error('[analytics] GET /by-department', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /bottlenecks ──────────────────────────────────────────────────────────

router.get('/bottlenecks', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? 10), 50);

  try {
    const { rows } = await pool.query(`
      SELECT
        sl.step_name,
        wd.name                                                         AS workflow_name,
        wd.department,
        COUNT(sl.id)                                                    AS total_decisions,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (sl.decision_at - sl.activated_at)) / 3600)::NUMERIC, 1
        )                                                               AS avg_wait_hours,
        ROUND(
          MAX(EXTRACT(EPOCH FROM (sl.decision_at - sl.activated_at)) / 3600)::NUMERIC, 1
        )                                                               AS max_wait_hours,
        ROUND(
          PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (sl.decision_at - sl.activated_at)) / 3600
          )::NUMERIC, 1
        )                                                               AS p90_wait_hours,
        COUNT(sl.id) FILTER (WHERE sl.status = 'escalated')            AS escalation_count,
        COUNT(sl.id) FILTER (WHERE sl.decision = 'approve')            AS approvals,
        COUNT(sl.id) FILTER (WHERE sl.decision = 'reject')             AS rejections
      FROM workflow_step_logs sl
      JOIN workflow_instances wi ON wi.id = sl.instance_id
      JOIN workflow_definitions wd ON wd.id = wi.definition_id
      WHERE sl.decision_at IS NOT NULL
        AND sl.activated_at IS NOT NULL
      GROUP BY sl.step_name, wd.name, wd.department
      HAVING COUNT(sl.id) >= 2
      ORDER BY avg_wait_hours DESC NULLS LAST
      LIMIT $1
    `, [limit]);

    res.json({
      data: rows.map(r => ({
        step_name:        r.step_name,
        workflow_name:    r.workflow_name,
        department:       r.department,
        total_decisions:  parseInt(r.total_decisions),
        avg_wait_hours:   parseFloat(r.avg_wait_hours)  || 0,
        max_wait_hours:   parseFloat(r.max_wait_hours)  || 0,
        p90_wait_hours:   parseFloat(r.p90_wait_hours)  || 0,
        escalation_count: parseInt(r.escalation_count),
        approvals:        parseInt(r.approvals),
        rejections:       parseInt(r.rejections),
      })),
    });
  } catch (err) {
    console.error('[analytics] GET /bottlenecks', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /trend ────────────────────────────────────────────────────────────────
// Monthly completion counts for the trailing 12 months

router.get('/trend', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS month,
        COUNT(*)                                               AS completed,
        COUNT(*) FILTER (WHERE status = 'approved')           AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')           AS rejected
      FROM workflow_instances
      WHERE status IN ('approved','rejected')
        AND completed_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', completed_at)
      ORDER BY DATE_TRUNC('month', completed_at) ASC
    `);

    res.json({
      data: rows.map(r => ({
        month:     r.month,
        completed: parseInt(r.completed),
        approved:  parseInt(r.approved),
        rejected:  parseInt(r.rejected),
      })),
    });
  } catch (err) {
    console.error('[analytics] GET /trend', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
