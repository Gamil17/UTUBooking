'use strict';

/**
 * Dev Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/dev', devRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                — active sprint progress + open task counts + deployments today
 *
 * GET  /sprints              — sprint list (filter: status)
 * POST /sprints              — create sprint
 * PATCH /sprints/:id         — update sprint (name, goal, dates, status)
 * DELETE /sprints/:id        — delete sprint (guard: has tasks)
 *
 * GET  /tasks                — paginated task list (filter: sprint_id, status, priority, type, assignee)
 * POST /tasks                — create task
 * PATCH /tasks/:id           — update task (any field)
 * DELETE /tasks/:id          — delete task
 *
 * GET  /deployments          — paginated deployment log (filter: service, environment, status)
 * POST /deployments          — log a deployment
 * PATCH /deployments/:id     — update deployment (status, notes)
 * DELETE /deployments/:id    — delete deployment log entry
 */

const { Router } = require('express');
const { Pool }   = require('pg');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// ── Middleware ────────────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
}

router.use(adminAuth);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dev_sprints (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      goal        TEXT,
      status      TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned','active','completed','cancelled')),
      start_date  DATE,
      end_date    DATE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dev_tasks (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sprint_id     UUID REFERENCES dev_sprints(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      type          TEXT NOT NULL DEFAULT 'task'
                    CHECK (type IN ('feature','bug','chore','task','spike')),
      priority      TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low')),
      status        TEXT NOT NULL DEFAULT 'backlog'
                    CHECK (status IN ('backlog','todo','in_progress','review','done','cancelled')),
      assignee      TEXT,
      story_points  INT,
      service       TEXT,
      pr_url        TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dev_deployments (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service       TEXT NOT NULL,
      version       TEXT,
      environment   TEXT NOT NULL DEFAULT 'staging'
                    CHECK (environment IN ('development','staging','production')),
      status        TEXT NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success','failed','rolled_back','in_progress')),
      deployed_by   TEXT NOT NULL DEFAULT 'admin',
      notes         TEXT,
      deployed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
bootstrap().catch(err => console.error('[dev] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [tasks, sprints, deployments] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('done','cancelled'))                AS open_total,
          COUNT(*) FILTER (WHERE status = 'in_progress')                           AS in_progress,
          COUNT(*) FILTER (WHERE status = 'review')                                AS in_review,
          COUNT(*) FILTER (WHERE status = 'done'
                             AND updated_at >= NOW() - INTERVAL '7 days')          AS done_7d,
          COUNT(*) FILTER (WHERE priority = 'critical'
                             AND status NOT IN ('done','cancelled'))                AS critical_open,
          COALESCE(SUM(story_points) FILTER (WHERE status = 'done'
                             AND sprint_id IN (
                               SELECT id FROM dev_sprints WHERE status = 'active'
                             )), 0)                                                AS active_sprint_velocity
        FROM dev_tasks
      `),
      pool.query(`
        SELECT id, name, goal, status, start_date, end_date,
          (SELECT COUNT(*) FROM dev_tasks WHERE sprint_id = dev_sprints.id)               AS total_tasks,
          (SELECT COUNT(*) FROM dev_tasks WHERE sprint_id = dev_sprints.id
             AND status = 'done')                                                          AS done_tasks
        FROM dev_sprints
        WHERE status = 'active'
        ORDER BY start_date DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deployed_at >= NOW() - INTERVAL '24 hours')  AS deployments_24h,
          COUNT(*) FILTER (WHERE status = 'failed'
                             AND deployed_at >= NOW() - INTERVAL '24 hours')  AS failed_24h,
          COUNT(*) FILTER (WHERE environment = 'production'
                             AND deployed_at >= NOW() - INTERVAL '7 days')    AS prod_7d
        FROM dev_deployments
      `),
    ]);

    const t  = tasks.rows[0];
    const sp = sprints.rows[0] ?? null;
    const d  = deployments.rows[0];

    res.json({
      data: {
        tasks: {
          open:                  parseInt(t.open_total),
          in_progress:           parseInt(t.in_progress),
          in_review:             parseInt(t.in_review),
          done_7d:               parseInt(t.done_7d),
          critical_open:         parseInt(t.critical_open),
          active_sprint_velocity: parseInt(t.active_sprint_velocity),
        },
        active_sprint: sp ? {
          id:          sp.id,
          name:        sp.name,
          goal:        sp.goal,
          status:      sp.status,
          start_date:  sp.start_date,
          end_date:    sp.end_date,
          total_tasks: parseInt(sp.total_tasks),
          done_tasks:  parseInt(sp.done_tasks),
          progress_pct: sp.total_tasks > 0
            ? Math.round((parseInt(sp.done_tasks) / parseInt(sp.total_tasks)) * 100)
            : 0,
        } : null,
        deployments: {
          deployments_24h: parseInt(d.deployments_24h),
          failed_24h:      parseInt(d.failed_24h),
          prod_7d:         parseInt(d.prod_7d),
        },
      },
    });
  } catch (err) {
    console.error('[dev] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Sprints ───────────────────────────────────────────────────────────────────

router.get('/sprints', async (req, res) => {
  const { status } = req.query;
  const conditions = [];
  const params     = [];

  if (status) { params.push(status); conditions.push(`s.status = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
         COUNT(t.id)                                             AS total_tasks,
         COUNT(t.id) FILTER (WHERE t.status = 'done')           AS done_tasks,
         COUNT(t.id) FILTER (WHERE t.status = 'in_progress')    AS in_progress_tasks
       FROM dev_sprints s
       LEFT JOIN dev_tasks t ON t.sprint_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY
         CASE s.status WHEN 'active' THEN 1 WHEN 'planned' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END,
         s.start_date DESC NULLS LAST`,
      params,
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[dev] GET /sprints error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/sprints', async (req, res) => {
  const { name, goal, status = 'planned', start_date, end_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO dev_sprints (name, goal, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, goal || null, status, start_date || null, end_date || null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] POST /sprints error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/sprints/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['name','goal','status','start_date','end_date'];
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE dev_sprints SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] PATCH /sprints/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/sprints/:id', async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT COUNT(*) FROM dev_tasks WHERE sprint_id = $1 AND status NOT IN ('done','cancelled')`,
      [req.params.id],
    );
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(409).json({ error: 'SPRINT_HAS_ACTIVE_TASKS', message: 'Move or complete all tasks before deleting this sprint.' });
    }
    const result = await pool.query('DELETE FROM dev_sprints WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] DELETE /sprints/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

router.get('/tasks', async (req, res) => {
  const { sprint_id, status, priority, type, assignee, service, page = 1, limit = 50 } = req.query;
  const offset     = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params     = [];

  if (sprint_id) { params.push(sprint_id); conditions.push(`sprint_id = $${params.length}`); }
  if (status)    { params.push(status);    conditions.push(`status = $${params.length}`); }
  if (priority)  { params.push(priority);  conditions.push(`priority = $${params.length}`); }
  if (type)      { params.push(type);      conditions.push(`type = $${params.length}`); }
  if (assignee)  { params.push(assignee);  conditions.push(`assignee = $${params.length}`); }
  if (service)   { params.push(service);   conditions.push(`service = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT t.*, s.name AS sprint_name
         FROM dev_tasks t
         LEFT JOIN dev_sprints s ON s.id = t.sprint_id
         ${where}
         ORDER BY
           CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           CASE t.status   WHEN 'in_progress' THEN 1 WHEN 'review' THEN 2 WHEN 'todo' THEN 3
                           WHEN 'backlog' THEN 4 WHEN 'done' THEN 5 ELSE 6 END,
           t.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM dev_tasks ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[dev] GET /tasks error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/tasks', async (req, res) => {
  const {
    sprint_id, title, description, type = 'task', priority = 'medium',
    status = 'backlog', assignee, story_points, service, pr_url,
  } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO dev_tasks
         (sprint_id, title, description, type, priority, status, assignee, story_points, service, pr_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        sprint_id || null, title, description || null, type, priority, status,
        assignee || null, story_points ? parseInt(story_points) : null,
        service || null, pr_url || null,
      ],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] POST /tasks error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['sprint_id','title','description','type','priority','status','assignee','story_points','service','pr_url'];
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE dev_tasks SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] PATCH /tasks/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM dev_tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Deployments ───────────────────────────────────────────────────────────────

router.get('/deployments', async (req, res) => {
  const { service, environment, status, page = 1, limit = 50 } = req.query;
  const offset     = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params     = [];

  if (service)     { params.push(service);     conditions.push(`service = $${params.length}`); }
  if (environment) { params.push(environment); conditions.push(`environment = $${params.length}`); }
  if (status)      { params.push(status);      conditions.push(`status = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM dev_deployments ${where}
         ORDER BY deployed_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM dev_deployments ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[dev] GET /deployments error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/deployments', async (req, res) => {
  const {
    service, version, environment = 'staging', status = 'success',
    deployed_by = 'admin', notes, deployed_at,
  } = req.body;
  if (!service) return res.status(400).json({ error: 'service is required' });
  try {
    const result = await pool.query(
      `INSERT INTO dev_deployments (service, version, environment, status, deployed_by, notes, deployed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [service, version || null, environment, status, deployed_by,
       notes || null, deployed_at || new Date().toISOString()],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] POST /deployments error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/deployments/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['service','version','environment','status','deployed_by','notes','deployed_at'];
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE dev_deployments SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] PATCH /deployments/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/deployments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM dev_deployments WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[dev] DELETE /deployments/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
