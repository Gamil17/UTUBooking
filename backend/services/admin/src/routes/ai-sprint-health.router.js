'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_sprint_health (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      sprint_id           UUID        NOT NULL UNIQUE,
      sprint_name         TEXT,
      health_status       TEXT        NOT NULL DEFAULT 'at_risk',
      velocity_trend      TEXT        NOT NULL DEFAULT 'stable',
      completion_pct      INT         NOT NULL DEFAULT 0,
      executive_summary   TEXT        NOT NULL,
      blockers            JSONB       NOT NULL DEFAULT '[]',
      risks               TEXT[]      NOT NULL DEFAULT '{}',
      achievements        TEXT[]      NOT NULL DEFAULT '{}',
      deployment_health   TEXT,
      scope_creep_flag    BOOLEAN     NOT NULL DEFAULT false,
      recommendations     TEXT[]      NOT NULL DEFAULT '{}',
      daily_actions       JSONB       NOT NULL DEFAULT '[]',
      generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-sprint-health] bootstrap error:', e.message));

// GET /api/admin/sprint-health/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM ai_sprint_health WHERE sprint_id = $1`, [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/admin/sprint-health/:id
router.post('/:id', async (req, res) => {
  const sprintId = req.params.id;
  try {
    const sprintR = await pool.query(
      `SELECT * FROM dev_sprints WHERE id = $1`, [sprintId]
    );
    if (!sprintR.rows.length) return res.status(404).json({ error: 'SPRINT_NOT_FOUND' });
    const sprint = sprintR.rows[0];

    const tasks = await pool.query(
      `SELECT title, type, priority, status, assignee, story_points, service
       FROM dev_tasks WHERE sprint_id = $1
       ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END`,
      [sprintId]
    );

    // Recent deployments (last 14 days)
    const deploys = await pool.query(`
      SELECT service, version, environment, status, deployed_by, deployed_at
      FROM dev_deployments
      WHERE deployed_at >= NOW() - INTERVAL '14 days'
      ORDER BY deployed_at DESC LIMIT 30
    `).catch(() => ({ rows: [] }));

    const allTasks = tasks.rows;
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const blocked = allTasks.filter(t => ['backlog', 'todo'].includes(t.status) && t.priority === 'critical').length;
    const totalPoints = allTasks.reduce((s, t) => s + (t.story_points || 0), 0);
    const donePoints = allTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points || 0), 0);
    const completionPct = total ? Math.round((done / total) * 100) : 0;

    const daysLeft = sprint.end_date
      ? Math.max(0, Math.round((new Date(sprint.end_date).getTime() - Date.now()) / 86400000))
      : null;
    const sprintDuration = sprint.start_date && sprint.end_date
      ? Math.round((new Date(sprint.end_date).getTime() - new Date(sprint.start_date).getTime()) / 86400000)
      : null;

    const failedDeploys = deploys.rows.filter(d => d.status === 'failed').length;

    const prompt = `You are an AI Engineering Manager advisor for UTUBooking.com (travel tech, microservices architecture on AWS). Analyse this sprint and provide health coaching.

Sprint:
${JSON.stringify({
  name: sprint.name,
  goal: sprint.goal,
  status: sprint.status,
  start_date: sprint.start_date,
  end_date: sprint.end_date,
  days_remaining: daysLeft,
  sprint_duration_days: sprintDuration,
}, null, 2)}

Progress:
- Total tasks: ${total}
- Done: ${done} (${completionPct}%)
- In Progress: ${inProgress}
- Critical items not started: ${blocked}
- Story points: ${donePoints}/${totalPoints} completed

Task Breakdown:
${JSON.stringify(allTasks.map(t => ({
  title: t.title,
  type: t.type,
  priority: t.priority,
  status: t.status,
  assignee: t.assignee,
  points: t.story_points,
  service: t.service,
})), null, 2)}

Recent Deployments (${deploys.rows.length}, ${failedDeploys} failed):
${JSON.stringify(deploys.rows.slice(0, 15).map(d => ({
  service: d.service, env: d.environment,
  status: d.status, deployed_at: d.deployed_at,
})))}

Context:
- Platform has 18 microservices; deployment failures in auth/payment are critical
- Team works in 2-week sprints
- Code freeze recommended 2 days before end_date
- Critical/high priority tasks must complete before mid-sprint

Respond with ONLY a JSON object (no markdown fences):
{
  "health_status": "on_track|at_risk|behind|critical",
  "velocity_trend": "accelerating|stable|slowing|blocked",
  "completion_pct": 0-100,
  "executive_summary": "2-3 sentence EM-level summary",
  "blockers": [
    { "task": "...", "assignee": "...", "risk": "...", "suggested_action": "..." }
  ],
  "risks": ["risk 1", "risk 2"],
  "achievements": ["done 1", "done 2"],
  "deployment_health": "paragraph on deployment health",
  "scope_creep_flag": true|false,
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "daily_actions": [
    { "action": "...", "owner": "...", "urgency": "today|this_week" }
  ]
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].text
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const ai = JSON.parse(raw);

    await pool.query(`
      INSERT INTO ai_sprint_health
        (sprint_id, sprint_name, health_status, velocity_trend, completion_pct,
         executive_summary, blockers, risks, achievements, deployment_health,
         scope_creep_flag, recommendations, daily_actions, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (sprint_id) DO UPDATE SET
        sprint_name       = EXCLUDED.sprint_name,
        health_status     = EXCLUDED.health_status,
        velocity_trend    = EXCLUDED.velocity_trend,
        completion_pct    = EXCLUDED.completion_pct,
        executive_summary = EXCLUDED.executive_summary,
        blockers          = EXCLUDED.blockers,
        risks             = EXCLUDED.risks,
        achievements      = EXCLUDED.achievements,
        deployment_health = EXCLUDED.deployment_health,
        scope_creep_flag  = EXCLUDED.scope_creep_flag,
        recommendations   = EXCLUDED.recommendations,
        daily_actions     = EXCLUDED.daily_actions,
        generated_at      = NOW()
    `, [
      sprintId, sprint.name,
      ai.health_status ?? 'at_risk',
      ai.velocity_trend ?? 'stable',
      ai.completion_pct ?? completionPct,
      ai.executive_summary ?? '',
      JSON.stringify(ai.blockers ?? []),
      ai.risks ?? [],
      ai.achievements ?? [],
      ai.deployment_health ?? null,
      ai.scope_creep_flag ?? false,
      ai.recommendations ?? [],
      JSON.stringify(ai.daily_actions ?? []),
    ]);

    const saved = await pool.query(`SELECT * FROM ai_sprint_health WHERE sprint_id = $1`, [sprintId]);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-sprint-health] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
