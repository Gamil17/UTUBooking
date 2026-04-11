'use strict';

/**
 * Compliance Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/compliance', complianceRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET)
 *
 * All data lives on 8 regional shards — reads use fan-out via getShardPool.
 * Write (PATCH /erasures/:id) targets a specific shard passed as _shard in body.
 *
 * GET /stats                       — aggregate pending/overdue counts + by_law breakdown
 * GET /erasures?status=&law=&page= — cross-shard list, sorted by requested_at DESC
 * PATCH /erasures/:id              — DPO status update + notes (targets _shard)
 * GET /exports?law=&page=          — cross-shard data export list, read-only
 */

const { Router } = require('express');
const adminAuth  = require('../middleware/adminAuth');
const { getShardPool } = require('../../../../shared/shard-router');

const router = Router();
router.use(adminAuth);

// ── Shard representatives (one per physical shard) ─────────────────────────
// SA=Gulf, GB=UK, DE=EU, IN=South Asia, ID=SE Asia, US=USA, CA=Canada, BR=Brazil
const SHARD_REPS = ['SA', 'GB', 'DE', 'IN', 'ID', 'US', 'CA', 'BR'];

/**
 * Fan-out helper — runs queryFn against all 8 shards concurrently.
 * Uses Promise.allSettled so a single failed shard never blocks the rest.
 * Tags every row with _shard (ISO alpha-2) so the frontend can route writes back.
 */
async function fanOut(queryFn) {
  const results = await Promise.allSettled(
    SHARD_REPS.map(async cc => {
      const { pool } = getShardPool(cc);
      try {
        const rows = await queryFn(pool);
        return rows.map(r => ({ ...r, _shard: cc }));
      } catch (err) {
        console.warn(`[compliance fanOut] shard ${cc} failed: ${err.message}`);
        return [];
      }
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const allErasures = await fanOut(pool =>
      pool.query(`
        SELECT status, law, requested_at
        FROM erasure_requests
      `).then(r => r.rows)
    );

    const allExports = await fanOut(pool =>
      pool.query(`
        SELECT law, generated_at
        FROM data_exports
      `).then(r => r.rows)
    );

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = new Date(now - thirtyDaysMs);

    let pending_erasures      = 0;
    let in_progress_erasures  = 0;
    let overdue_erasures      = 0;
    let completed_erasures_30d = 0;

    const byLaw = {};
    const KNOWN_LAWS = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];
    for (const law of KNOWN_LAWS) {
      byLaw[law] = { pending_erasures: 0, pending_exports: 0 };
    }

    for (const row of allErasures) {
      const law = row.law || 'OTHER';
      if (!byLaw[law]) byLaw[law] = { pending_erasures: 0, pending_exports: 0 };

      if (row.status === 'pending') {
        pending_erasures++;
        byLaw[law].pending_erasures++;
        const age = now - new Date(row.requested_at).getTime();
        if (age > thirtyDaysMs) overdue_erasures++;
      } else if (row.status === 'in_progress') {
        in_progress_erasures++;
      } else if (row.status === 'completed') {
        if (new Date(row.requested_at) >= thirtyDaysAgo) {
          completed_erasures_30d++;
        }
      }
    }

    let pending_exports = 0;
    for (const row of allExports) {
      const law = row.law || 'OTHER';
      if (!byLaw[law]) byLaw[law] = { pending_erasures: 0, pending_exports: 0 };

      if (!row.generated_at) {
        pending_exports++;
        byLaw[law].pending_exports++;
      }
    }

    return res.json({
      data: {
        pending_erasures,
        in_progress_erasures,
        overdue_erasures,
        completed_erasures_30d,
        pending_exports,
        by_law: byLaw,
      },
    });
  } catch (err) {
    console.error('[compliance/stats]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /erasures ──────────────────────────────────────────────────────────
router.get('/erasures', async (req, res) => {
  const statusFilter = req.query.status || null;
  const lawFilter    = req.query.law    || null;
  const page         = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit        = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));

  try {
    let rows = await fanOut(pool => {
      const conditions = [];
      const vals = [];
      let i = 1;

      if (statusFilter) { conditions.push(`status = $${i++}`); vals.push(statusFilter); }
      if (lawFilter)    { conditions.push(`law = $${i++}`);    vals.push(lawFilter); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      return pool.query(
        `SELECT id, user_id, email_snapshot, requested_at, completed_at,
                status, law, reason, dpo_notes
           FROM erasure_requests
           ${where}
           ORDER BY requested_at DESC`,
        vals
      ).then(r => r.rows);
    });

    // Merge sort: newest first
    rows.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

    const total = rows.length;
    const offset = (page - 1) * limit;
    rows = rows.slice(offset, offset + limit);

    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    console.error('[compliance/erasures]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /erasures/:id ────────────────────────────────────────────────────
// Body: { status, dpo_notes, _shard }
// Writes to the specific shard pool identified by _shard.
router.patch('/erasures/:id', async (req, res) => {
  const { id } = req.params;
  const { status, dpo_notes, _shard } = req.body ?? {};

  if (!_shard) {
    return res.status(400).json({ error: 'MISSING_SHARD', message: '_shard is required' });
  }

  const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'rejected'];
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const { pool } = getShardPool(_shard);

    const sets = [];
    const vals = [];
    let i = 1;

    if (status !== undefined) {
      sets.push(`status = $${i++}`); vals.push(status);
      if (status === 'completed' || status === 'rejected') {
        sets.push(`completed_at = NOW()`);
      }
    }
    if (dpo_notes !== undefined) {
      sets.push(`dpo_notes = $${i++}`); vals.push(dpo_notes || null);
    }

    if (!sets.length) {
      return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE erasure_requests
          SET ${sets.join(', ')}
        WHERE id = $${i}
        RETURNING id, user_id, email_snapshot, requested_at, completed_at,
                  status, law, reason, dpo_notes`,
      vals
    );

    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    return res.json({ data: { ...rows[0], _shard } });
  } catch (err) {
    console.error('[compliance/erasures PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /exports ───────────────────────────────────────────────────────────
router.get('/exports', async (req, res) => {
  const lawFilter = req.query.law || null;
  const page      = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));

  try {
    let rows = await fanOut(pool => {
      const conditions = [];
      const vals = [];
      let i = 1;

      if (lawFilter) { conditions.push(`law = $${i++}`); vals.push(lawFilter); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      return pool.query(
        `SELECT id, user_id, requested_at, export_type, format,
                law, generated_at, download_url, expires_at
           FROM data_exports
           ${where}
           ORDER BY requested_at DESC`,
        vals
      ).then(r => r.rows);
    });

    // Merge sort: newest first
    rows.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

    const total = rows.length;
    const offset = (page - 1) * limit;
    rows = rows.slice(offset, offset + limit);

    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    console.error('[compliance/exports]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
