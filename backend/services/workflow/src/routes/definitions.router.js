'use strict';

/**
 * Workflow Definitions — CRUD
 *
 * GET    /                         — list all definitions (filter: department, status)
 * GET    /:id                      — get single definition with steps
 * POST   /                         — create new definition (status: draft)
 * PATCH  /:id                      — update draft definition (name, description, steps, approval_chain)
 * POST   /:id/submit               — submit draft for approval (moves to active pending approval chain)
 * POST   /:id/approve              — super_admin: activate definition
 * POST   /:id/archive              — super_admin: archive active definition
 * POST   /:id/new-version          — create a new draft version based on existing active definition
 * GET    /:id/versions             — list all versions of a definition (by trigger_event + name)
 */

const { Router } = require('express');
const { Pool }   = require('pg');

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// Bootstrap — ensure tables exist (idempotent, matches migration)
async function bootstrap() {
  // Tables are created by migration; this just checks connectivity
  await pool.query('SELECT 1 FROM workflow_definitions LIMIT 1').catch(() => {
    console.warn('[definitions.router] workflow_definitions table not yet migrated');
  });
}
bootstrap();

// ── GET / — list definitions ──────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { department, status, trigger_event } = req.query;
  const limit  = Math.min(parseInt(req.query.limit ?? 50), 200);
  const offset = parseInt(req.query.offset ?? 0);

  try {
    const conditions = [];
    const vals       = [];
    let   i          = 1;

    if (department) { conditions.push(`department = $${i++}`);     vals.push(department); }
    if (status)     { conditions.push(`status = $${i++}`);         vals.push(status); }
    if (trigger_event) { conditions.push(`trigger_event = $${i++}`); vals.push(trigger_event); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await pool.query(
      `SELECT id, name, department, trigger_event, description, version,
              status, created_by, approved_by, approved_at, created_at, updated_at
         FROM workflow_definitions
         ${where}
        ORDER BY department, name, created_at DESC
        LIMIT $${i} OFFSET $${i + 1}`,
      [...vals, limit, offset],
    );
    const total = await pool.query(
      `SELECT COUNT(*) FROM workflow_definitions ${where}`, vals,
    );
    res.json({ total: parseInt(total.rows[0].count), rows });
  } catch (err) {
    console.error('[definitions] GET /', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /:id — single definition ──────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM workflow_definitions WHERE id = $1`, [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[definitions] GET /:id', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST / — create draft definition ─────────────────────────────────────────

router.post('/', async (req, res) => {
  const { name, department, trigger_event, description, steps, approval_chain } = req.body ?? {};

  if (!name || !department || !trigger_event) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'name, department, and trigger_event are required',
    });
  }

  // Validate steps array shape
  const stepsArr = Array.isArray(steps) ? steps : [];
  for (const [idx, step] of stepsArr.entries()) {
    if (!step.id || !step.name || !step.type) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Step at index ${idx} is missing required fields: id, name, type`,
      });
    }
    const validTypes = ['action', 'approval', 'condition', 'notification', 'ai_check'];
    if (!validTypes.includes(step.type)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Step '${step.id}' has invalid type '${step.type}'. Valid: ${validTypes.join(', ')}`,
      });
    }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO workflow_definitions
         (name, department, trigger_event, description, version, status, steps, approval_chain, created_by)
       VALUES ($1, $2, $3, $4, '1.0.0', 'draft', $5, $6, $7)
       RETURNING *`,
      [name, department, trigger_event, description || null,
       JSON.stringify(stepsArr),
       JSON.stringify(Array.isArray(approval_chain) ? approval_chain : []),
       req.user.email],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[definitions] POST /', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /:id — update draft ─────────────────────────────────────────────────

router.patch('/:id', async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      `SELECT * FROM workflow_definitions WHERE id = $1`, [req.params.id],
    );
    if (!existing.length) return res.status(404).json({ error: 'NOT_FOUND' });

    if (existing[0].status !== 'draft') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Only draft definitions can be edited. Create a new version to modify an active definition.',
      });
    }

    const { name, department, trigger_event, description, steps, approval_chain } = req.body ?? {};
    const updates = [];
    const vals    = [];
    let   i       = 1;

    if (name !== undefined)          { updates.push(`name = $${i++}`);            vals.push(name); }
    if (department !== undefined)    { updates.push(`department = $${i++}`);      vals.push(department); }
    if (trigger_event !== undefined) { updates.push(`trigger_event = $${i++}`);   vals.push(trigger_event); }
    if (description !== undefined)   { updates.push(`description = $${i++}`);     vals.push(description); }
    if (steps !== undefined)         { updates.push(`steps = $${i++}`);           vals.push(JSON.stringify(steps)); }
    if (approval_chain !== undefined){ updates.push(`approval_chain = $${i++}`);  vals.push(JSON.stringify(approval_chain)); }

    if (!updates.length) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    vals.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE workflow_definitions SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[definitions] PATCH /:id', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /:id/approve — activate definition (super_admin only) ────────────────

router.post('/:id/approve', async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.email !== 'system@internal') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'super_admin required' });
  }

  try {
    const { rows: existing } = await pool.query(
      `SELECT * FROM workflow_definitions WHERE id = $1`, [req.params.id],
    );
    if (!existing.length) return res.status(404).json({ error: 'NOT_FOUND' });

    if (existing[0].status === 'active') {
      return res.status(409).json({ error: 'CONFLICT', message: 'Already active' });
    }

    // Archive any previously active definition for the same trigger_event
    await pool.query(
      `UPDATE workflow_definitions SET status = 'archived', updated_at = NOW()
        WHERE trigger_event = $1 AND status = 'active' AND id != $2`,
      [existing[0].trigger_event, req.params.id],
    );

    const { rows } = await pool.query(
      `UPDATE workflow_definitions
          SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [req.user.email, req.params.id],
    );
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[definitions] POST /:id/approve', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /:id/archive — archive active definition ─────────────────────────────

router.post('/:id/archive', async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.email !== 'system@internal') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'super_admin required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE workflow_definitions SET status = 'archived', updated_at = NOW()
        WHERE id = $1 AND status = 'active'
        RETURNING *`,
      [req.params.id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Active definition not found' });
    }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[definitions] POST /:id/archive', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /:id/new-version — fork active → new draft ──────────────────────────

router.post('/:id/new-version', async (req, res) => {
  try {
    const { rows: src } = await pool.query(
      `SELECT * FROM workflow_definitions WHERE id = $1`, [req.params.id],
    );
    if (!src.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // Bump patch version: 1.0.0 → 1.0.1
    const [major, minor, patch] = (src[0].version || '1.0.0').split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    const { rows } = await pool.query(
      `INSERT INTO workflow_definitions
         (name, department, trigger_event, description, version, status, steps,
          approval_chain, created_by, parent_id)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9)
       RETURNING *`,
      [src[0].name, src[0].department, src[0].trigger_event,
       src[0].description, newVersion,
       JSON.stringify(src[0].steps), JSON.stringify(src[0].approval_chain),
       req.user.email, src[0].id],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[definitions] POST /:id/new-version', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /:id/versions — version history ──────────────────────────────────────

router.get('/:id/versions', async (req, res) => {
  try {
    const { rows: base } = await pool.query(
      `SELECT trigger_event FROM workflow_definitions WHERE id = $1`, [req.params.id],
    );
    if (!base.length) return res.status(404).json({ error: 'NOT_FOUND' });

    const { rows } = await pool.query(
      `SELECT id, version, status, created_by, approved_by, approved_at, created_at, updated_at
         FROM workflow_definitions
        WHERE trigger_event = $1
        ORDER BY created_at DESC`,
      [base[0].trigger_event],
    );
    res.json({ rows });
  } catch (err) {
    console.error('[definitions] GET /:id/versions', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
