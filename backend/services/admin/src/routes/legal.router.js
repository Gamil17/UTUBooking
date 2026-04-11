'use strict';

/**
 * Legal Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/legal', legalRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * All data lives in the admin DB (DATABASE_URL) — no cross-shard fan-out.
 *
 * GET /stats                                    — KPIs: open matters, overdue tasks, expiring docs
 * GET /matters?status=&type=&urgency=&jurisdiction=&page=
 * POST /matters
 * PATCH /matters/:id
 * DELETE /matters/:id                           — soft close: status='closed', closed_date=NOW()
 *
 * GET /tasks?status=&type=&jurisdiction=&page=
 * POST /tasks
 * PATCH /tasks/:id
 * DELETE /tasks/:id                             — hard delete
 *
 * GET /documents?type=&status=&jurisdiction=&page=
 * POST /documents
 * PATCH /documents/:id
 * DELETE /documents/:id                         — hard delete (file_url is a reference only)
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');

const router = Router();
router.use(adminAuth);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_matters (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title         TEXT NOT NULL,
      description   TEXT,
      matter_type   TEXT NOT NULL DEFAULT 'other',
      status        TEXT NOT NULL DEFAULT 'open',
      urgency       TEXT NOT NULL DEFAULT 'medium',
      jurisdiction  TEXT,
      assigned_to   TEXT,
      due_date      DATE,
      closed_date   DATE,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS legal_compliance_tasks (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title          TEXT NOT NULL UNIQUE,
      task_type      TEXT NOT NULL DEFAULT 'other',
      jurisdiction   TEXT,
      due_date       DATE,
      completed_date DATE,
      status         TEXT NOT NULL DEFAULT 'pending',
      assigned_to    TEXT,
      notes          TEXT,
      recurrence     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS legal_documents (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title          TEXT NOT NULL,
      doc_type       TEXT NOT NULL DEFAULT 'other',
      counterparty   TEXT,
      jurisdiction   TEXT,
      status         TEXT NOT NULL DEFAULT 'active',
      execution_date DATE,
      expiry_date    DATE,
      file_url       TEXT,
      matter_id      UUID REFERENCES legal_matters(id) ON DELETE SET NULL,
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Backfill unique constraint on existing databases (idempotent)
  await pool.query(`
    ALTER TABLE legal_compliance_tasks
      ADD CONSTRAINT IF NOT EXISTS uq_legal_tasks_title UNIQUE (title)
  `).catch(() => {});  // ignore if constraint already exists under a different name

  // Seed default compliance tasks (key regulatory milestones)
  const defaults = [
    { title: 'TURSAB Travel Agency Licence Renewal',    type: 'license_renewal',     jurisdiction: 'TR', recurrence: 'annual' },
    { title: 'GDPR DPA AWS Sign-off',                   type: 'regulatory_report',   jurisdiction: 'EU', recurrence: null },
    { title: 'CCPA Privacy Policy Annual Review',       type: 'audit_prep',          jurisdiction: 'US', recurrence: 'annual' },
    { title: 'KVKK VERBIS Registration Renewal',        type: 'license_renewal',     jurisdiction: 'TR', recurrence: 'annual' },
    { title: 'MOTAC Travel Agency Licence Renewal',     type: 'license_renewal',     jurisdiction: 'MY', recurrence: 'annual' },
    { title: 'ICO Registration Renewal (UK)',           type: 'license_renewal',     jurisdiction: 'GB', recurrence: 'annual' },
  ];
  for (const d of defaults) {
    await pool.query(
      `INSERT INTO legal_compliance_tasks (title, task_type, jurisdiction, recurrence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [d.title, d.type, d.jurisdiction, d.recurrence]
    ).catch(() => {});
  }

  console.log('[legal] bootstrap complete');
}
bootstrap().catch(err => console.error('[legal] bootstrap error:', err.message));

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [mattersRes, tasksRes, docsRes, byJurisdictionRes] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('open','in_progress'))                AS open_matters,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress') AND urgency = 'critical') AS critical_matters
        FROM legal_matters
      `),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'overdue'
            OR (due_date < NOW()::date AND status NOT IN ('completed','overdue')))  AS overdue_tasks,
          COUNT(*) FILTER (WHERE due_date BETWEEN NOW()::date AND (NOW() + INTERVAL '14 days')::date
            AND status NOT IN ('completed','overdue'))                              AS due_soon_tasks
        FROM legal_compliance_tasks
      `),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active'
            AND expiry_date BETWEEN NOW()::date AND (NOW() + INTERVAL '60 days')::date) AS expiring_documents,
          COUNT(*) FILTER (WHERE status = 'active')                                     AS total_active_documents
        FROM legal_documents
      `),

      pool.query(`
        SELECT
          COALESCE(jurisdiction, 'Global') AS jurisdiction,
          COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_matters,
          0::bigint AS pending_tasks
        FROM legal_matters
        GROUP BY COALESCE(jurisdiction, 'Global')
        UNION ALL
        SELECT
          COALESCE(jurisdiction, 'Global'),
          0,
          COUNT(*) FILTER (WHERE status IN ('pending','in_progress'))
        FROM legal_compliance_tasks
        GROUP BY COALESCE(jurisdiction, 'Global')
      `),
    ]);

    // Merge by-jurisdiction results
    const byJurisdiction = {};
    for (const row of byJurisdictionRes.rows) {
      const j = row.jurisdiction;
      if (!byJurisdiction[j]) byJurisdiction[j] = { open_matters: 0, pending_tasks: 0 };
      byJurisdiction[j].open_matters  += parseInt(row.open_matters);
      byJurisdiction[j].pending_tasks += parseInt(row.pending_tasks);
    }
    // Remove jurisdictions with all zeros
    for (const j of Object.keys(byJurisdiction)) {
      if (byJurisdiction[j].open_matters === 0 && byJurisdiction[j].pending_tasks === 0) {
        delete byJurisdiction[j];
      }
    }

    const m = mattersRes.rows[0];
    const t = tasksRes.rows[0];
    const d = docsRes.rows[0];

    return res.json({
      data: {
        open_matters:           parseInt(m.open_matters),
        critical_matters:       parseInt(m.critical_matters),
        overdue_tasks:          parseInt(t.overdue_tasks),
        due_soon_tasks:         parseInt(t.due_soon_tasks),
        expiring_documents:     parseInt(d.expiring_documents),
        total_active_documents: parseInt(d.total_active_documents),
        by_jurisdiction:        byJurisdiction,
      },
    });
  } catch (err) {
    console.error('[legal/stats]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Urgency sort order helper ─────────────────────────────────────────────
const URGENCY_ORDER = `CASE urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`;

// ── GET /matters ───────────────────────────────────────────────────────────
router.get('/matters', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)       { conditions.push(`status = $${i++}`);       vals.push(req.query.status); }
  if (req.query.type)         { conditions.push(`matter_type = $${i++}`);  vals.push(req.query.type); }
  if (req.query.urgency)      { conditions.push(`urgency = $${i++}`);      vals.push(req.query.urgency); }
  if (req.query.jurisdiction) { conditions.push(`jurisdiction ILIKE $${i++}`); vals.push(req.query.jurisdiction); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, title, description, matter_type, status, urgency,
                jurisdiction, assigned_to, due_date, closed_date, notes,
                created_at, updated_at
           FROM legal_matters ${where}
           ORDER BY ${URGENCY_ORDER}, due_date ASC NULLS LAST, created_at DESC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM legal_matters ${where}`, vals),
    ]);

    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[legal/matters GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /matters ──────────────────────────────────────────────────────────
router.post('/matters', async (req, res) => {
  const { title, description, matter_type, status, urgency, jurisdiction,
          assigned_to, due_date, notes } = req.body ?? {};

  if (!title?.trim()) return res.status(400).json({ error: 'TITLE_REQUIRED' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO legal_matters
         (title, description, matter_type, status, urgency, jurisdiction, assigned_to, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title.trim(),
        description  || null,
        matter_type  || 'other',
        status       || 'open',
        urgency      || 'medium',
        jurisdiction || null,
        assigned_to  || null,
        due_date     || null,
        notes        || null,
      ]
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/matters POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /matters/:id ─────────────────────────────────────────────────────
router.patch('/matters/:id', async (req, res) => {
  const ALLOWED = ['title','description','matter_type','status','urgency',
                   'jurisdiction','assigned_to','due_date','notes'];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(req.body[key] || null);
    }
  }

  // Auto-set closed_date when closing
  if (req.body.status === 'closed') {
    sets.push(`closed_date = NOW()`);
  }

  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);

  try {
    const { rows } = await pool.query(
      `UPDATE legal_matters SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/matters PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /matters/:id — soft close ──────────────────────────────────────
router.delete('/matters/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE legal_matters
          SET status = 'closed', closed_date = NOW(), updated_at = NOW()
        WHERE id = $1 AND status != 'closed'
        RETURNING id, title, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND_OR_ALREADY_CLOSED' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/matters DELETE]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /tasks ─────────────────────────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)       { conditions.push(`status = $${i++}`);         vals.push(req.query.status); }
  if (req.query.type)         { conditions.push(`task_type = $${i++}`);      vals.push(req.query.type); }
  if (req.query.jurisdiction) { conditions.push(`jurisdiction ILIKE $${i++}`); vals.push(req.query.jurisdiction); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, title, task_type, jurisdiction, due_date, completed_date,
                status, assigned_to, notes, recurrence, created_at, updated_at
           FROM legal_compliance_tasks ${where}
           ORDER BY
             CASE WHEN (due_date < NOW()::date AND status NOT IN ('completed','overdue')) THEN 0 ELSE 1 END,
             due_date ASC NULLS LAST,
             created_at DESC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM legal_compliance_tasks ${where}`, vals),
    ]);

    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[legal/tasks GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /tasks ────────────────────────────────────────────────────────────
router.post('/tasks', async (req, res) => {
  const { title, task_type, jurisdiction, due_date, assigned_to, notes, recurrence } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: 'TITLE_REQUIRED' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO legal_compliance_tasks
         (title, task_type, jurisdiction, due_date, assigned_to, notes, recurrence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        task_type    || 'other',
        jurisdiction || null,
        due_date     || null,
        assigned_to  || null,
        notes        || null,
        recurrence   || null,
      ]
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/tasks POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /tasks/:id ───────────────────────────────────────────────────────
router.patch('/tasks/:id', async (req, res) => {
  const ALLOWED = ['title','task_type','jurisdiction','due_date','completed_date',
                   'status','assigned_to','notes','recurrence'];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(req.body[key] || null);
    }
  }
  // Auto-set completed_date when marking complete
  if (req.body.status === 'completed' && req.body.completed_date === undefined) {
    sets.push(`completed_date = NOW()`);
  }

  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);

  try {
    const { rows } = await pool.query(
      `UPDATE legal_compliance_tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/tasks PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /tasks/:id ──────────────────────────────────────────────────────
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM legal_compliance_tasks WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[legal/tasks DELETE]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /documents ─────────────────────────────────────────────────────────
router.get('/documents', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.type)         { conditions.push(`doc_type = $${i++}`);       vals.push(req.query.type); }
  if (req.query.status)       { conditions.push(`status = $${i++}`);         vals.push(req.query.status); }
  if (req.query.jurisdiction) { conditions.push(`jurisdiction ILIKE $${i++}`); vals.push(req.query.jurisdiction); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, title, doc_type, counterparty, jurisdiction, status,
                execution_date, expiry_date, file_url, matter_id, notes,
                created_at, updated_at
           FROM legal_documents ${where}
           ORDER BY expiry_date ASC NULLS LAST, created_at DESC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM legal_documents ${where}`, vals),
    ]);

    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[legal/documents GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /documents ────────────────────────────────────────────────────────
router.post('/documents', async (req, res) => {
  const { title, doc_type, counterparty, jurisdiction, status, execution_date,
          expiry_date, file_url, matter_id, notes } = req.body ?? {};

  if (!title?.trim()) return res.status(400).json({ error: 'TITLE_REQUIRED' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO legal_documents
         (title, doc_type, counterparty, jurisdiction, status,
          execution_date, expiry_date, file_url, matter_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title.trim(),
        doc_type       || 'other',
        counterparty   || null,
        jurisdiction   || null,
        status         || 'active',
        execution_date || null,
        expiry_date    || null,
        file_url       || null,
        matter_id      || null,
        notes          || null,
      ]
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/documents POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /documents/:id ───────────────────────────────────────────────────
router.patch('/documents/:id', async (req, res) => {
  const ALLOWED = ['title','doc_type','counterparty','jurisdiction','status',
                   'execution_date','expiry_date','file_url','matter_id','notes'];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(req.body[key] || null);
    }
  }

  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);

  try {
    const { rows } = await pool.query(
      `UPDATE legal_documents SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[legal/documents PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /documents/:id ──────────────────────────────────────────────────
router.delete('/documents/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM legal_documents WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[legal/documents DELETE]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
