'use strict';

/**
 * Products Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/products', productsRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * GET  /stats                     — roadmap counts by status, feature flag counts, changelog count
 *
 * GET  /roadmap                   — paginated (filter: status, quarter, tag)
 * POST /roadmap                   — create item
 * PATCH /roadmap/:id              — update item
 * DELETE /roadmap/:id             — delete item
 *
 * GET  /flags                     — all feature flags (filter: environment, enabled)
 * POST /flags                     — create flag
 * PATCH /flags/:id                — update flag (enabled, rollout_pct, description…)
 * DELETE /flags/:id               — delete flag
 *
 * GET  /changelog                 — paginated changelog entries (filter: type)
 * POST /changelog                 — create entry
 * PATCH /changelog/:id            — update entry
 * DELETE /changelog/:id           — delete entry
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const wf         = require('../lib/workflow-client');

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
    CREATE TABLE IF NOT EXISTS products_roadmap (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('idea','planned','in_progress','launched','cancelled')),
      priority    TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('critical','high','medium','low')),
      quarter     TEXT,
      tags        TEXT[],
      votes       INT NOT NULL DEFAULT 0,
      owner       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products_feature_flags (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key              TEXT NOT NULL UNIQUE,
      description      TEXT,
      enabled          BOOLEAN NOT NULL DEFAULT false,
      rollout_pct      INT NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
      environments     TEXT[] NOT NULL DEFAULT ARRAY['development'],
      owner            TEXT,
      expires_at       TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products_changelog (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version      TEXT NOT NULL,
      title        TEXT NOT NULL,
      summary      TEXT,
      body         TEXT,
      type         TEXT NOT NULL DEFAULT 'release'
                   CHECK (type IN ('release','hotfix','feature','deprecation')),
      published_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
bootstrap().catch(err => console.error('[products] bootstrap error:', err));

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [roadmap, flags, changelog] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'planned')     AS planned,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE status = 'launched')    AS launched,
          COUNT(*) FILTER (WHERE status = 'idea')        AS ideas,
          COUNT(*) FILTER (WHERE status = 'cancelled')   AS cancelled
        FROM products_roadmap
      `),
      pool.query(`
        SELECT
          COUNT(*)                              AS total,
          COUNT(*) FILTER (WHERE enabled = true) AS enabled,
          COUNT(*) FILTER (WHERE rollout_pct < 100 AND enabled = true) AS partial_rollout
        FROM products_feature_flags
      `),
      pool.query(`
        SELECT
          COUNT(*)                                                          AS total,
          COUNT(*) FILTER (WHERE published_at IS NOT NULL)                  AS published,
          COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '30 days') AS last_30d
        FROM products_changelog
      `),
    ]);

    const r = roadmap.rows[0];
    const f = flags.rows[0];
    const c = changelog.rows[0];
    res.json({
      data: {
        roadmap: {
          planned:     parseInt(r.planned),
          in_progress: parseInt(r.in_progress),
          launched:    parseInt(r.launched),
          ideas:       parseInt(r.ideas),
          cancelled:   parseInt(r.cancelled),
        },
        flags: {
          total:          parseInt(f.total),
          enabled:        parseInt(f.enabled),
          partial_rollout: parseInt(f.partial_rollout),
        },
        changelog: {
          total:    parseInt(c.total),
          published: parseInt(c.published),
          last_30d: parseInt(c.last_30d),
        },
      },
    });
  } catch (err) {
    console.error('[products] GET /stats error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Roadmap ───────────────────────────────────────────────────────────────────

router.get('/roadmap', async (req, res) => {
  const { status, quarter, tag, page = 1, limit = 50 } = req.query;
  const offset     = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params     = [];

  if (status)  { params.push(status);  conditions.push(`status = $${params.length}`); }
  if (quarter) { params.push(quarter); conditions.push(`quarter = $${params.length}`); }
  if (tag)     { params.push(tag);     conditions.push(`$${params.length} = ANY(tags)`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM products_roadmap ${where}
         ORDER BY
           CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           CASE status WHEN 'in_progress' THEN 1 WHEN 'planned' THEN 2 WHEN 'idea' THEN 3
                       WHEN 'launched' THEN 4 ELSE 5 END,
           votes DESC, created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM products_roadmap ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[products] GET /roadmap error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/roadmap', async (req, res) => {
  const { title, description, status = 'planned', priority = 'medium', quarter, tags, votes = 0, owner } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO products_roadmap (title, description, status, priority, quarter, tags, votes, owner)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description || null, status, priority, quarter || null,
       Array.isArray(tags) ? tags : [], parseInt(votes) || 0, owner || null],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[products] POST /roadmap error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/roadmap/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['title','description','status','priority','quarter','tags','votes','owner'];
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE products_roadmap SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[products] PATCH /roadmap/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/roadmap/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products_roadmap WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[products] DELETE /roadmap/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Feature Flags ─────────────────────────────────────────────────────────────

router.get('/flags', async (req, res) => {
  const { environment, enabled } = req.query;
  const conditions = [];
  const params     = [];

  if (environment) { params.push(environment); conditions.push(`$${params.length} = ANY(environments)`); }
  if (enabled !== undefined) { params.push(enabled === 'true'); conditions.push(`enabled = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT * FROM products_feature_flags ${where} ORDER BY enabled DESC, key ASC`,
      params,
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[products] GET /flags error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/flags', async (req, res) => {
  const { key, description, enabled = false, rollout_pct = 0, environments = ['development'], owner, expires_at } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });
  try {
    const result = await pool.query(
      `INSERT INTO products_feature_flags (key, description, enabled, rollout_pct, environments, owner, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [key.toLowerCase().replace(/\s+/g, '_'), description || null, Boolean(enabled),
       parseInt(rollout_pct) || 0, Array.isArray(environments) ? environments : ['development'],
       owner || null, expires_at || null],
    );
    const flag = result.rows[0];

    // ── Launch flag activation workflow when a flag starts enabled with rollout > 0 ──
    if (Boolean(enabled) && parseInt(rollout_pct) > 0) {
      wf.launch({
        triggerEvent:   'flag_activation',
        triggerRef:     flag.id,
        triggerRefType: 'feature_flag',
        initiatedBy:    req.user?.email ?? 'admin',
        context: {
          flag_key:     flag.key,
          description:  description || null,
          rollout_pct:  parseInt(rollout_pct),
          environments: Array.isArray(environments) ? environments : ['development'],
          owner:        owner || null,
        },
      });
    }

    res.status(201).json({ data: flag });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'FLAG_KEY_EXISTS', message: 'A flag with this key already exists.' });
    console.error('[products] POST /flags error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/flags/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['key','description','enabled','rollout_pct','environments','owner','expires_at'];
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE products_feature_flags SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'FLAG_KEY_EXISTS' });
    console.error('[products] PATCH /flags/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/flags/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products_feature_flags WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[products] DELETE /flags/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

// ── Changelog ─────────────────────────────────────────────────────────────────

router.get('/changelog', async (req, res) => {
  const { type, page = 1, limit = 30 } = req.query;
  const offset     = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params     = [];

  if (type) { params.push(type); conditions.push(`type = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM products_changelog ${where}
         ORDER BY COALESCE(published_at, created_at) DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      pool.query(`SELECT COUNT(*) FROM products_changelog ${where}`, params.slice(0, -2)),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[products] GET /changelog error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.post('/changelog', async (req, res) => {
  const { version, title, summary, body, type = 'release', published_at } = req.body;
  if (!version || !title) return res.status(400).json({ error: 'version and title are required' });
  try {
    const result = await pool.query(
      `INSERT INTO products_changelog (version, title, summary, body, type, published_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [version, title, summary || null, body || null, type, published_at || null],
    );
    const entry = result.rows[0];

    // ── Launch release comms & CS handoff workflow for releases ───────────────
    if (type === 'release') {
      wf.launch({
        triggerEvent:   'release_created',
        triggerRef:     entry.id,
        triggerRefType: 'changelog',
        initiatedBy:    req.user?.email ?? 'system',
        context: {
          entry_id:     entry.id,
          version,
          title,
          summary:      summary ?? null,
          type,
          published_at: published_at ?? null,
        },
      });
    }

    res.status(201).json({ data: entry });
  } catch (err) {
    console.error('[products] POST /changelog error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.patch('/changelog/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['version','title','summary','body','type','published_at'];
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    const result = await pool.query(
      `UPDATE products_changelog SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[products] PATCH /changelog/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

router.delete('/changelog/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products_changelog WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[products] DELETE /changelog/:id error:', err);
    res.status(500).json({ error: 'DB_ERROR' });
  }
});

module.exports = router;
