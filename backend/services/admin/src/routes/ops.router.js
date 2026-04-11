'use strict';

/**
 * Operations Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/ops', opsRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                — open incident counts by severity + ticket counts by priority
 *
 * GET  /incidents            — paginated incident list (filter: status, severity, service)
 * POST /incidents            — create incident
 * PATCH /incidents/:id       — update incident (status, severity, description, resolved_at…)
 * DELETE /incidents/:id      — delete incident
 *
 * GET  /tickets              — paginated support ticket list (filter: status, priority, category, search)
 * POST /tickets              — create ticket
 * PATCH /tickets/:id         — update ticket (status, priority, assignee, resolution…)
 * DELETE /tickets/:id        — delete ticket
 */

const { Router } = require('express');
const { Pool }   = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
    CREATE TABLE IF NOT EXISTS ops_incidents (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title        TEXT NOT NULL,
      severity     TEXT NOT NULL DEFAULT 'medium'
                   CHECK (severity IN ('critical','high','medium','low')),
      status       TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','investigating','resolved','closed')),
      service      TEXT,
      description  TEXT,
      impact       TEXT,
      started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at  TIMESTAMPTZ,
      created_by   TEXT NOT NULL DEFAULT 'admin',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ops_support_tickets (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email   TEXT,
      booking_ref  TEXT,
      category     TEXT NOT NULL DEFAULT 'other'
                   CHECK (category IN ('booking','payment','technical','account','refund','other')),
      priority     TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('urgent','high','medium','low')),
      status       TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','resolved','closed')),
      subject      TEXT NOT NULL,
      description  TEXT,
      assignee     TEXT,
      resolution   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
bootstrap().catch(err => console.error('[ops] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [incidents, tickets] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('open','investigating'))          AS open_total,
          COUNT(*) FILTER (WHERE severity = 'critical' AND status != 'closed') AS critical,
          COUNT(*) FILTER (WHERE severity = 'high'     AND status != 'closed') AS high,
          COUNT(*) FILTER (WHERE status = 'resolved'
                             AND resolved_at >= NOW() - INTERVAL '24 hours')   AS resolved_24h,
          COUNT(*) FILTER (WHERE status = 'open'
                             AND started_at < NOW() - INTERVAL '1 hour'
                             AND severity IN ('critical','high'))               AS sla_breaching
        FROM ops_incidents
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('open','in_progress'))             AS open_total,
          COUNT(*) FILTER (WHERE priority = 'urgent' AND status != 'closed')   AS urgent,
          COUNT(*) FILTER (WHERE priority = 'high'   AND status != 'closed')   AS high,
          COUNT(*) FILTER (WHERE status = 'resolved'
                             AND updated_at >= NOW() - INTERVAL '24 hours')    AS resolved_24h
        FROM ops_support_tickets
      `),
    ]);

    const i = incidents.rows[0];
    const t = tickets.rows[0];
    res.json({
      data: {
        incidents: {
          open:          parseInt(i.open_total),
          critical:      parseInt(i.critical),
          high:          parseInt(i.high),
          resolved_24h:  parseInt(i.resolved_24h),
          sla_breaching: parseInt(i.sla_breaching),
        },
        tickets: {
          open:         parseInt(t.open_total),
          urgent:       parseInt(t.urgent),
          high:         parseInt(t.high),
          resolved_24h: parseInt(t.resolved_24h),
        },
      },
    });
  } catch (err) {
    console.error('[ops] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Incidents ─────────────────────────────────────────────────────────────────

router.get('/incidents', async (req, res) => {
  const { status, severity, service, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (status)   { params.push(status);   conditions.push(`status = $${params.length}`); }
  if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
  if (service)  { params.push(service);  conditions.push(`service = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM ops_incidents ${where}
         ORDER BY
           CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           started_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM ops_incidents ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[ops] GET /incidents error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/incidents', async (req, res) => {
  const { title, severity = 'medium', status = 'open', service, description, impact, started_at, created_by = 'admin' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO ops_incidents (title, severity, status, service, description, impact, started_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, severity, status, service || null, description || null, impact || null,
       started_at || new Date().toISOString(), created_by],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[ops] POST /incidents error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/incidents/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['title','severity','status','service','description','impact','started_at','resolved_at','created_by'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  // Auto-set resolved_at when status transitions to resolved
  if (req.body.status === 'resolved' && !req.body.resolved_at) {
    fields.push('resolved_at');
    req.body.resolved_at = new Date().toISOString();
  }

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE ops_incidents SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[ops] PATCH /incidents/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/incidents/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ops_incidents WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[ops] DELETE /incidents/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Support Tickets ───────────────────────────────────────────────────────────

router.get('/tickets', async (req, res) => {
  const { status, priority, category, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (status)   { params.push(status);   conditions.push(`status = $${params.length}`); }
  if (priority) { params.push(priority); conditions.push(`priority = $${params.length}`); }
  if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(subject ILIKE $${params.length} OR user_email ILIKE $${params.length} OR booking_ref ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM ops_support_tickets ${where}
         ORDER BY
           CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM ops_support_tickets ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[ops] GET /tickets error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/tickets', async (req, res) => {
  const { user_email, booking_ref, category = 'other', priority = 'medium', subject, description, assignee } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject is required' });
  try {
    const result = await pool.query(
      `INSERT INTO ops_support_tickets (user_email, booking_ref, category, priority, subject, description, assignee)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_email || null, booking_ref || null, category, priority, subject, description || null, assignee || null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[ops] POST /tickets error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['user_email','booking_ref','category','priority','status','subject','description','assignee','resolution'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE ops_support_tickets SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[ops] PATCH /tickets/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/tickets/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ops_support_tickets WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[ops] DELETE /tickets/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
