'use strict';

/**
 * HR Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/hr', hrRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                — headcount KPIs + by-department breakdown
 * GET  /employees            — paginated employee list (filter: department_id, status, search)
 * POST /employees            — create employee
 * PATCH /employees/:id       — update employee
 * DELETE /employees/:id      — soft-delete (status = 'terminated')
 *
 * GET  /departments          — list all with employee count
 * POST /departments          — create department
 * PATCH /departments/:id     — rename
 * DELETE /departments/:id    — delete (guard: reject if employees exist)
 *
 * GET  /leave                — paginated leave requests (filter: status, employee_id, month)
 * POST /leave                — create leave request
 * PATCH /leave/:id           — approve / reject / cancel
 *
 * GET  /leave/balances              — leave balance rows for one employee + year
 * GET  /leave/balances/overview     — all active employees balance summary for a year
 * POST /leave/balances/seed         — seed default allocations for active employees (body: { year })
 * PATCH /leave/balances/:id         — admin manual adjustment (body: { adjusted_days })
 *
 * GET  /org-chart            — recursive employee hierarchy tree (flat array, depth-sorted)
 *
 * POST /employees/import     — bulk import employees from JSON array
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');
const wf         = require('../lib/workflow-client');

const router = Router();
router.use(adminAuth);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_departments (
      id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      name       TEXT        NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_employees (
      id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      full_name       TEXT        NOT NULL,
      email           TEXT        NOT NULL UNIQUE,
      phone           TEXT,
      role            TEXT        NOT NULL,
      department_id   UUID        REFERENCES hr_departments(id) ON DELETE SET NULL,
      manager_id      UUID        REFERENCES hr_employees(id)   ON DELETE SET NULL,
      location        TEXT,
      hire_date       DATE        NOT NULL,
      status          TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','on_leave','terminated')),
      employment_type TEXT        NOT NULL DEFAULT 'full_time'
                                  CHECK (employment_type IN ('full_time','part_time','contractor','intern')),
      salary_sar      NUMERIC(12,2),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_leave_requests (
      id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      employee_id  UUID        NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      leave_type   TEXT        NOT NULL
                               CHECK (leave_type IN ('annual','sick','emergency','maternity','paternity','unpaid')),
      start_date   DATE        NOT NULL,
      end_date     DATE        NOT NULL,
      days         INT         NOT NULL,
      reason       TEXT,
      status       TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','cancelled')),
      reviewed_by  TEXT,
      reviewed_at  TIMESTAMPTZ,
      admin_notes  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_leave_balances (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id    UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      year           INT  NOT NULL,
      leave_type     TEXT NOT NULL CHECK (leave_type IN ('annual','sick','maternity','paternity')),
      allocated_days INT  NOT NULL DEFAULT 0,
      used_days      INT  NOT NULL DEFAULT 0,
      adjusted_days  INT  NOT NULL DEFAULT 0,
      UNIQUE (employee_id, year, leave_type)
    );
  `);

  // Seed 5 default departments
  const defaults = ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance'];
  for (const name of defaults) {
    await pool.query(
      `INSERT INTO hr_departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name]
    );
  }

  console.log('[hr] bootstrap complete');
}

bootstrap().catch(err => console.error('[hr] bootstrap error:', err.message));

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const [overallRes, byDeptRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                              AS total,
          COUNT(*) FILTER (WHERE status = 'active')                            AS active,
          COUNT(*) FILTER (WHERE status = 'on_leave')                          AS on_leave,
          COUNT(*) FILTER (WHERE status = 'terminated')                        AS terminated,
          COUNT(*) FILTER (WHERE employment_type = 'contractor')               AS contractors,
          COUNT(*) FILTER (WHERE employment_type = 'intern')                   AS interns,
          COUNT(*) FILTER (WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
                             AND status != 'terminated')                       AS new_hires_30d
        FROM hr_employees
      `),
      pool.query(`
        SELECT d.name, COUNT(e.id) AS count
        FROM hr_departments d
        LEFT JOIN hr_employees e ON e.department_id = d.id AND e.status != 'terminated'
        GROUP BY d.id, d.name
        ORDER BY count DESC, d.name ASC
      `),
    ]);

    const r = overallRes.rows[0];
    res.json({
      data: {
        total:         parseInt(r.total),
        active:        parseInt(r.active),
        on_leave:      parseInt(r.on_leave),
        terminated:    parseInt(r.terminated),
        contractors:   parseInt(r.contractors),
        interns:       parseInt(r.interns),
        new_hires_30d: parseInt(r.new_hires_30d),
        by_department: byDeptRes.rows.map(d => ({ name: d.name, count: parseInt(d.count) })),
      },
    });
  } catch (err) {
    console.error('[hr/stats]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /employees ────────────────────────────────────────────────────────────

router.get('/employees', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params     = [];

  if (req.query.department_id) {
    params.push(req.query.department_id);
    conditions.push(`e.department_id = $${params.length}`);
  }
  if (req.query.status) {
    params.push(req.query.status);
    conditions.push(`e.status = $${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    conditions.push(`(e.full_name ILIKE $${params.length} OR e.email ILIKE $${params.length})`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT e.*,
               d.name AS department_name,
               m.full_name AS manager_name
        FROM hr_employees e
        LEFT JOIN hr_departments d ON d.id = e.department_id
        LEFT JOIN hr_employees   m ON m.id = e.manager_id
        ${where}
        ORDER BY e.status ASC, e.full_name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*) FROM hr_employees e ${where}`, params),
    ]);

    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[hr/employees GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /employees ───────────────────────────────────────────────────────────

router.post('/employees', async (req, res) => {
  const { full_name, email, phone, role, department_id, manager_id,
          location, hire_date, status, employment_type, salary_sar } = req.body;

  if (!full_name || !email || !role || !hire_date) {
    return res.status(400).json({ error: 'full_name, email, role, hire_date are required' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO hr_employees
        (full_name, email, phone, role, department_id, manager_id, location, hire_date, status, employment_type, salary_sar)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      full_name, email, phone ?? null, role,
      department_id ?? null, manager_id ?? null,
      location ?? null, hire_date,
      status ?? 'active', employment_type ?? 'full_time',
      salary_sar ?? null,
    ]);
    const employee = rows[0];

    // ── Trigger onboarding workflow (fire-and-forget) ─────────────────────────
    wf.launch({
      triggerEvent:   'hire_approved',
      triggerRef:     employee.id,
      triggerRefType: 'employee',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        employee_id:      employee.id,
        employee_name:    full_name,
        employee_email:   email,
        role,
        hire_date,
        employment_type:  employment_type ?? 'full_time',
        department_id:    department_id ?? null,
      },
    });

    res.status(201).json({ data: employee });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'EMAIL_EXISTS' });
    console.error('[hr/employees POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /employees/:id ──────────────────────────────────────────────────────

router.patch('/employees/:id', async (req, res) => {
  const allowed = ['full_name','email','phone','role','department_id','manager_id',
                   'location','hire_date','status','employment_type','salary_sar'];
  const sets    = [];
  const params  = [];

  for (const key of allowed) {
    if (key in req.body) {
      params.push(req.body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }

  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  try {
    const { rows } = await pool.query(`
      UPDATE hr_employees SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING *
    `, params);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'EMAIL_EXISTS' });
    console.error('[hr/employees PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /employees/:id (soft-delete) ───────────────────────────────────────

router.delete('/employees/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE hr_employees SET status = 'terminated', updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, role, department_id
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const employee = rows[0];

    // ── Launch employee offboarding workflow ───────────────────────────────────
    wf.launch({
      triggerEvent:   'employee_offboarding',
      triggerRef:     employee.id,
      triggerRefType: 'employee',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        employee_id:   employee.id,
        employee_name: employee.full_name,
        employee_email: employee.email,
        role:           employee.role,
        department_id:  employee.department_id,
        last_day:       new Date().toISOString().slice(0, 10),
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[hr/employees DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /departments ──────────────────────────────────────────────────────────

router.get('/departments', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.*, COUNT(e.id) AS employee_count
      FROM hr_departments d
      LEFT JOIN hr_employees e ON e.department_id = d.id AND e.status != 'terminated'
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    res.json({
      data: rows.map(d => ({ ...d, employee_count: parseInt(d.employee_count) })),
    });
  } catch (err) {
    console.error('[hr/departments GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /departments ─────────────────────────────────────────────────────────

router.post('/departments', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO hr_departments (name) VALUES ($1) RETURNING *`,
      [name.trim()]
    );
    res.status(201).json({ data: { ...rows[0], employee_count: 0 } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DEPT_EXISTS' });
    console.error('[hr/departments POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /departments/:id ────────────────────────────────────────────────────

router.patch('/departments/:id', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows } = await pool.query(
      `UPDATE hr_departments SET name = $1 WHERE id = $2 RETURNING *`,
      [name.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'DEPT_EXISTS' });
    console.error('[hr/departments PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /departments/:id ───────────────────────────────────────────────────

router.delete('/departments/:id', async (req, res) => {
  try {
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM hr_employees WHERE department_id = $1 AND status != 'terminated'`,
      [req.params.id]
    );
    if (parseInt(countRows[0].count) > 0) {
      return res.status(409).json({ error: 'DEPT_HAS_EMPLOYEES' });
    }
    const { rows } = await pool.query(
      `DELETE FROM hr_departments WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true });
  } catch (err) {
    console.error('[hr/departments DELETE]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /leave ────────────────────────────────────────────────────────────────

router.get('/leave', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params     = [];

  if (req.query.status && req.query.status !== 'all') {
    params.push(req.query.status);
    conditions.push(`lr.status = $${params.length}`);
  }
  if (req.query.employee_id) {
    params.push(req.query.employee_id);
    conditions.push(`lr.employee_id = $${params.length}`);
  }
  if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
    params.push(`${req.query.month}-01`);
    conditions.push(`DATE_TRUNC('month', lr.start_date) = $${params.length}::date`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  // Pending first, then by created_at desc
  const orderBy = `ORDER BY CASE lr.status WHEN 'pending' THEN 0 ELSE 1 END, lr.created_at DESC`;

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT lr.*, e.full_name AS employee_name
        FROM hr_leave_requests lr
        JOIN hr_employees e ON e.id = lr.employee_id
        ${where}
        ${orderBy}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
      pool.query(
        `SELECT COUNT(*) FROM hr_leave_requests lr ${where}`,
        params
      ),
    ]);

    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[hr/leave GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /leave ───────────────────────────────────────────────────────────────

router.post('/leave', async (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;

  if (!employee_id || !leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'employee_id, leave_type, start_date, end_date are required' });
  }

  // Calculate business days (simple calendar day diff for now)
  const days = Math.max(1, Math.round(
    (new Date(end_date) - new Date(start_date)) / 86400000
  ) + 1);

  try {
    const { rows } = await pool.query(`
      INSERT INTO hr_leave_requests (employee_id, leave_type, start_date, end_date, days, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [employee_id, leave_type, start_date, end_date, days, reason ?? null]);
    const leave = rows[0];

    // Resolve employee email for actor tracking
    const empRes = await pool.query(
      `SELECT email, full_name FROM hr_employees WHERE id = $1 LIMIT 1`,
      [employee_id]
    ).catch(() => ({ rows: [] }));
    const emp = empRes.rows[0];

    // ── Trigger workflow engine (fire-and-forget) ─────────────────────────────
    wf.launch({
      triggerEvent:   'leave_requested',
      triggerRef:     leave.id,
      triggerRefType: 'leave_request',
      initiatedBy:    req.user?.email ?? emp?.email ?? 'system',
      context: {
        employee_id,
        employee:   emp?.full_name ?? employee_id,
        leave_type,
        start_date,
        end_date,
        days,
        reason:     reason ?? null,
      },
    });

    res.status(201).json({ data: leave });
  } catch (err) {
    console.error('[hr/leave POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /leave/:id ──────────────────────────────────────────────────────────

router.patch('/leave/:id', async (req, res) => {
  const { status, reviewed_by, admin_notes } = req.body;

  const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Fetch leave row before updating so we can decrement the balance on approval
  let leaveRow = null;
  if (status === 'approved') {
    const { rows: lr } = await pool.query(
      `SELECT employee_id, leave_type, start_date, days FROM hr_leave_requests WHERE id = $1`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));
    leaveRow = lr[0] ?? null;
  }

  const sets   = [];
  const params = [];

  if (status) {
    params.push(status);
    sets.push(`status = $${params.length}`);

    if (status === 'approved' || status === 'rejected') {
      sets.push(`reviewed_at = NOW()`);
      if (reviewed_by) {
        params.push(reviewed_by);
        sets.push(`reviewed_by = $${params.length}`);
      }
    }
  }
  if (admin_notes !== undefined) {
    params.push(admin_notes);
    sets.push(`admin_notes = $${params.length}`);
  }

  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  try {
    const { rows } = await pool.query(`
      UPDATE hr_leave_requests SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING *
    `, params);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // Auto-decrement leave balance when approving trackable leave types
    const TRACKABLE = ['annual', 'sick', 'maternity', 'paternity'];
    if (leaveRow && TRACKABLE.includes(leaveRow.leave_type)) {
      pool.query(
        `UPDATE hr_leave_balances SET used_days = used_days + $1
         WHERE employee_id = $2
           AND year = EXTRACT(YEAR FROM $3::date)::int
           AND leave_type = $4`,
        [leaveRow.days, leaveRow.employee_id, leaveRow.start_date, leaveRow.leave_type]
      ).catch(() => {}); // silently skip — no balance row means tracking not yet seeded
    }

    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[hr/leave PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /leave/balances ───────────────────────────────────────────────────────

router.get('/leave/balances', async (req, res) => {
  const { employee_id, year } = req.query;
  if (!employee_id || !year) {
    return res.status(400).json({ error: 'employee_id and year are required' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM hr_leave_balances WHERE employee_id = $1 AND year = $2 ORDER BY leave_type`,
      [employee_id, parseInt(year, 10)]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[hr/leave/balances GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /leave/balances/overview ──────────────────────────────────────────────

router.get('/leave/balances/overview', async (req, res) => {
  const year = parseInt(req.query.year ?? String(new Date().getFullYear()), 10);
  const params = [year];
  let deptFilter = '';
  if (req.query.department_id) {
    params.push(req.query.department_id);
    deptFilter = `AND e.department_id = $${params.length}`;
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        e.id, e.full_name, e.department_id, d.name AS department_name,
        COALESCE(MAX(CASE WHEN lb.leave_type = 'annual'    THEN lb.allocated_days + lb.adjusted_days - lb.used_days END), 0) AS annual_remaining,
        COALESCE(MAX(CASE WHEN lb.leave_type = 'sick'      THEN lb.allocated_days + lb.adjusted_days - lb.used_days END), 0) AS sick_remaining,
        COALESCE(MAX(CASE WHEN lb.leave_type = 'maternity' THEN lb.allocated_days + lb.adjusted_days - lb.used_days END), 0) AS maternity_remaining,
        COALESCE(MAX(CASE WHEN lb.leave_type = 'paternity' THEN lb.allocated_days + lb.adjusted_days - lb.used_days END), 0) AS paternity_remaining
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_leave_balances lb ON lb.employee_id = e.id AND lb.year = $1
      WHERE e.status = 'active' ${deptFilter}
      GROUP BY e.id, e.full_name, e.department_id, d.name
      ORDER BY d.name ASC NULLS LAST, e.full_name ASC
    `, params);
    res.json({ data: rows.map(r => ({
      ...r,
      annual_remaining:    parseInt(r.annual_remaining),
      sick_remaining:      parseInt(r.sick_remaining),
      maternity_remaining: parseInt(r.maternity_remaining),
      paternity_remaining: parseInt(r.paternity_remaining),
    })) });
  } catch (err) {
    console.error('[hr/leave/balances/overview GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /leave/balances/seed ─────────────────────────────────────────────────

router.post('/leave/balances/seed', async (req, res) => {
  const year = parseInt(req.body.year ?? new Date().getFullYear(), 10);
  if (isNaN(year)) return res.status(400).json({ error: 'year is required' });

  // Gulf-standard default allocations
  const DEFAULTS = [
    { leave_type: 'annual',    allocated_days: 21 },
    { leave_type: 'sick',      allocated_days: 30 },
    { leave_type: 'maternity', allocated_days: 60 },
    { leave_type: 'paternity', allocated_days: 3  },
  ];

  try {
    const { rows: employees } = await pool.query(
      `SELECT id FROM hr_employees WHERE status = 'active'`
    );
    let inserted = 0;
    for (const emp of employees) {
      for (const def of DEFAULTS) {
        const result = await pool.query(
          `INSERT INTO hr_leave_balances (employee_id, year, leave_type, allocated_days)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, year, leave_type) DO NOTHING`,
          [emp.id, year, def.leave_type, def.allocated_days]
        );
        inserted += result.rowCount ?? 0;
      }
    }
    res.json({ seeded: inserted, employees: employees.length, year });
  } catch (err) {
    console.error('[hr/leave/balances/seed POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /leave/balances/:id ─────────────────────────────────────────────────

router.patch('/leave/balances/:id', async (req, res) => {
  const { adjusted_days } = req.body;
  if (adjusted_days === undefined || !Number.isInteger(adjusted_days)) {
    return res.status(400).json({ error: 'adjusted_days (integer) is required' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE hr_leave_balances SET adjusted_days = $1 WHERE id = $2 RETURNING *`,
      [adjusted_days, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[hr/leave/balances PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /org-chart ────────────────────────────────────────────────────────────

router.get('/org-chart', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH RECURSIVE org AS (
        SELECT id, full_name, role, department_id, manager_id, 0 AS depth
        FROM hr_employees
        WHERE manager_id IS NULL AND status != 'terminated'
        UNION ALL
        SELECT e.id, e.full_name, e.role, e.department_id, e.manager_id, o.depth + 1
        FROM hr_employees e
        JOIN org o ON e.manager_id = o.id
        WHERE e.status != 'terminated' AND o.depth < 20
      )
      SELECT o.*, d.name AS department_name
      FROM org o
      LEFT JOIN hr_departments d ON o.department_id = d.id
      ORDER BY depth, full_name
    `);
    res.json({ data: rows.map(r => ({ ...r, depth: parseInt(r.depth) })) });
  } catch (err) {
    console.error('[hr/org-chart GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /employees/import ────────────────────────────────────────────────────

router.post('/employees/import', async (req, res) => {
  const { employees: rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'employees array is required' });
  }

  const REQUIRED      = ['full_name', 'email', 'role', 'hire_date'];
  const VALID_TYPES   = ['full_time', 'part_time', 'contractor', 'intern'];
  const TRACKABLE_LT  = ['annual', 'sick', 'maternity', 'paternity'];
  const emailRegex    = /^\S+@\S+\.\S+$/;

  // Pre-validate all rows before opening a transaction
  const valid  = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let rowError = null;

    for (const f of REQUIRED) {
      if (!r[f]?.toString().trim()) {
        rowError = { row: i + 1, field: f, message: `${f} is required` };
        break;
      }
    }
    if (!rowError && !emailRegex.test(r.email ?? '')) {
      rowError = { row: i + 1, field: 'email', message: 'invalid email format' };
    }
    if (!rowError && isNaN(Date.parse(r.hire_date))) {
      rowError = { row: i + 1, field: 'hire_date', message: 'invalid date (use YYYY-MM-DD)' };
    }
    if (!rowError && r.employment_type && !VALID_TYPES.includes(r.employment_type)) {
      rowError = { row: i + 1, field: 'employment_type', message: `must be one of: ${VALID_TYPES.join(', ')}` };
    }

    if (rowError) { errors.push(rowError); } else { valid.push({ index: i, data: r }); }
  }

  if (valid.length === 0) {
    return res.status(400).json({ success: 0, failed: errors.length, errors });
  }

  let successCount = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { index, data: r } of valid) {
      // Resolve department_name → department_id
      let deptId = r.department_id ?? null;
      if (!deptId && r.department_name) {
        const dr = await client.query(
          `SELECT id FROM hr_departments WHERE LOWER(name) = LOWER($1)`,
          [r.department_name.trim()]
        );
        deptId = dr.rows[0]?.id ?? null;
      }

      await client.query(`SAVEPOINT sp_row_${index}`);
      try {
        await client.query(`
          INSERT INTO hr_employees
            (full_name, email, phone, role, department_id, location, hire_date, employment_type, salary_sar)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [
          r.full_name.trim(),
          r.email.trim().toLowerCase(),
          r.phone?.trim()     ?? null,
          r.role.trim(),
          deptId,
          r.location?.trim()  ?? null,
          r.hire_date,
          r.employment_type   ?? 'full_time',
          r.salary_sar        ? parseFloat(r.salary_sar) : null,
        ]);
        successCount++;
      } catch (rowErr) {
        await client.query(`ROLLBACK TO SAVEPOINT sp_row_${index}`);
        if (rowErr.code === '23505') {
          errors.push({ row: index + 1, field: 'email', message: 'email already exists' });
        } else {
          errors.push({ row: index + 1, field: 'unknown', message: rowErr.message });
        }
      }
      await client.query(`RELEASE SAVEPOINT sp_row_${index}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[hr/employees/import POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }

  res.status(201).json({ success: successCount, failed: errors.length, errors });
});

// ─────────────────────────────────────────────────────────────────────────────
// Performance Reviews
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /performance-reviews — submit self-review + launch approval workflow ─
router.post('/performance-reviews', async (req, res) => {
  const {
    employee_id,
    quarter,        // e.g. 'Q1-2026'
    self_assessment, // free text
    goals_met,      // 1-5
    goals_details,
    skills_rating,  // 1-5
    skills_details,
    initiatives,
  } = req.body ?? {};

  if (!employee_id) return res.status(400).json({ error: 'EMPLOYEE_ID_REQUIRED' });
  if (!quarter)     return res.status(400).json({ error: 'QUARTER_REQUIRED' });

  try {
    // Bootstrap table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_performance_reviews (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id     UUID        NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
        quarter         TEXT        NOT NULL,
        self_assessment TEXT,
        goals_met       INT         CHECK (goals_met BETWEEN 1 AND 5),
        goals_details   TEXT,
        skills_rating   INT         CHECK (skills_rating BETWEEN 1 AND 5),
        skills_details  TEXT,
        initiatives     TEXT,
        manager_rating  INT,
        manager_notes   TEXT,
        final_rating    INT,
        status          TEXT        NOT NULL DEFAULT 'submitted'
                                    CHECK (status IN ('submitted','manager_review','calibration','completed')),
        submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (employee_id, quarter)
      )
    `);

    const { rows } = await pool.query(
      `INSERT INTO hr_performance_reviews
         (employee_id, quarter, self_assessment, goals_met, goals_details, skills_rating, skills_details, initiatives)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (employee_id, quarter) DO UPDATE SET
         self_assessment = EXCLUDED.self_assessment,
         goals_met       = EXCLUDED.goals_met,
         goals_details   = EXCLUDED.goals_details,
         skills_rating   = EXCLUDED.skills_rating,
         skills_details  = EXCLUDED.skills_details,
         initiatives     = EXCLUDED.initiatives,
         status          = 'submitted'
       RETURNING *`,
      [employee_id, quarter, self_assessment||null, goals_met||null, goals_details||null,
       skills_rating||null, skills_details||null, initiatives||null]
    );
    const review = rows[0];

    // Resolve employee name for workflow context
    const empRes = await pool.query(
      `SELECT full_name, email, role, department_id FROM hr_employees WHERE id = $1 LIMIT 1`,
      [employee_id]
    ).catch(() => ({ rows: [] }));
    const emp = empRes.rows[0];

    // ── Launch performance review workflow ─────────────────────────────────────
    wf.launch({
      triggerEvent:   'performance_review_submitted',
      triggerRef:     review.id,
      triggerRefType: 'performance_review',
      initiatedBy:    req.user?.email ?? emp?.email ?? 'system',
      context: {
        review_id:    review.id,
        employee_id,
        employee:     emp?.full_name ?? employee_id,
        role:         emp?.role ?? null,
        department_id: emp?.department_id ?? null,
        quarter,
        goals_met:    goals_met ?? null,
        skills_rating: skills_rating ?? null,
      },
    });

    res.status(201).json({ data: review });
  } catch (err) {
    console.error('[hr/performance-reviews POST]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /performance-reviews — list reviews ───────────────────────────────────
router.get('/performance-reviews', async (req, res) => {
  const { employee_id, quarter, status, limit: lim = '20', offset: off = '0' } = req.query;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS hr_performance_reviews (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), employee_id UUID, quarter TEXT, status TEXT NOT NULL DEFAULT 'submitted', submitted_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW())`);
    const conds = []; const vals = [];
    if (employee_id) { conds.push(`r.employee_id = $${vals.length+1}`); vals.push(employee_id); }
    if (quarter)     { conds.push(`r.quarter = $${vals.length+1}`);      vals.push(quarter); }
    if (status)      { conds.push(`r.status = $${vals.length+1}`);       vals.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      pool.query(`SELECT r.*, e.full_name, e.role FROM hr_performance_reviews r LEFT JOIN hr_employees e ON e.id = r.employee_id ${where} ORDER BY r.submitted_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, parseInt(lim), parseInt(off)]),
      pool.query(`SELECT COUNT(*) FROM hr_performance_reviews r ${where}`, vals),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    console.error('[hr/performance-reviews GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /performance-reviews/:id — manager review or HR calibration ─────────
router.patch('/performance-reviews/:id', async (req, res) => {
  const ALLOWED = ['manager_rating','manager_notes','final_rating','status','completed_at'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'NO_UPDATABLE_FIELDS' });
  const vals = fields.map(k => req.body[k]);
  const sets = fields.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    const { rows } = await pool.query(
      `UPDATE hr_performance_reviews SET ${sets}, created_at = created_at WHERE id = $${fields.length + 1} RETURNING *`,
      [...vals, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[hr/performance-reviews PATCH]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
