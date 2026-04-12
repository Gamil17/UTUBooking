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
const wf         = require('../lib/workflow-client');

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

// ── POST /dsr — manually log a Data Subject Request + launch workflow ─────────
// Used by DPO/Compliance team when a DSR arrives via email, phone, or postal mail.
// Body: { email, request_type, law, reason, country_code }
router.post('/dsr', async (req, res) => {
  const { email, request_type, law, reason, country_code } = req.body ?? {};

  if (!email?.trim())        return res.status(400).json({ error: 'EMAIL_REQUIRED' });
  if (!request_type?.trim()) return res.status(400).json({ error: 'REQUEST_TYPE_REQUIRED' });

  const validTypes = ['access', 'erasure', 'portability', 'rectification', 'objection'];
  if (!validTypes.includes(request_type)) {
    return res.status(400).json({
      error: 'INVALID_REQUEST_TYPE',
      message: `request_type must be one of: ${validTypes.join(', ')}`,
    });
  }

  const validLaws = ['GDPR', 'UK_GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'PDPL'];
  const resolvedLaw = validLaws.includes(law) ? law : 'GDPR';

  // Write DSR to the correct shard for the user's country
  const countryCode = (country_code || 'SA').toUpperCase();
  try {
    const shardPool = getShardPool(countryCode);

    // Insert into the correct shard's erasure_requests table (reuse existing schema)
    const { rows } = await shardPool.query(
      `INSERT INTO erasure_requests
         (email_snapshot, requested_at, status, law, reason)
       VALUES ($1, NOW(), 'pending', $2, $3)
       RETURNING id, email_snapshot, requested_at, status, law`,
      [email.trim(), resolvedLaw, reason || null]
    );
    const dsr = rows[0];

    // ── Launch DSR fulfilment workflow (fire-and-forget) ──────────────────────
    wf.launch({
      triggerEvent:   'dsr_received',
      triggerRef:     dsr.id,
      triggerRefType: 'dsr',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        email:        email.trim(),
        request_type,
        law:          resolvedLaw,
        country_code: countryCode,
        reason:       reason || null,
        dsr_id:       dsr.id,
        // GDPR Art.15: 30-day SLA from receipt
        sla_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    return res.status(201).json({
      data: dsr,
      message: 'DSR logged and fulfilment workflow launched',
    });
  } catch (err) {
    console.error('[compliance/dsr POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /breach — log a data breach incident + launch response workflow ──────
//
// Triggers the P0 GDPR Breach Incident Response workflow (72h Art.33 SLA).
// Records are stored in compliance_breaches (bootstrapped below).
//
router.post('/breach', async (req, res) => {
  const {
    title,
    description,
    affected_data_types,    // string[] e.g. ['email','payment_method','passport']
    estimated_subjects,     // number — approximate affected data subject count
    severity = 'high',      // 'low' | 'medium' | 'high' | 'critical'
    jurisdictions = [],     // string[] e.g. ['SA','EU','US']
    detected_by,            // name or email of person who detected it
    detected_at,            // ISO timestamp (defaults to now)
    source_system,          // e.g. 'payment-service', 'auth-service', 'hotel-adapter'
  } = req.body ?? {};

  if (!title?.trim()) return res.status(400).json({ error: 'TITLE_REQUIRED' });
  if (!description?.trim()) return res.status(400).json({ error: 'DESCRIPTION_REQUIRED' });

  // Bootstrap table if needed
  const pool = getShardPool('SA');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS compliance_breaches (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title               TEXT        NOT NULL,
        description         TEXT        NOT NULL,
        severity            TEXT        NOT NULL DEFAULT 'high'
                                        CHECK (severity IN ('low','medium','high','critical')),
        affected_data_types TEXT[]      NOT NULL DEFAULT '{}',
        estimated_subjects  INT,
        jurisdictions       TEXT[]      NOT NULL DEFAULT '{}',
        detected_by         TEXT,
        detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source_system       TEXT,
        status              TEXT        NOT NULL DEFAULT 'open'
                                        CHECK (status IN ('open','investigating','contained','closed')),
        regulator_notified  BOOLEAN     NOT NULL DEFAULT false,
        closed_at           TIMESTAMPTZ,
        created_by          TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await pool.query(
      `INSERT INTO compliance_breaches
         (title, description, severity, affected_data_types, estimated_subjects,
          jurisdictions, detected_by, detected_at, source_system, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        title.trim(), description.trim(), severity,
        affected_data_types ?? [], estimated_subjects ?? null,
        jurisdictions, detected_by ?? null,
        detected_at ?? new Date().toISOString(),
        source_system ?? null,
        req.user?.email ?? 'system',
      ]
    );
    const breach = rows[0];

    // ── Launch P0 breach response workflow (fire-and-forget) ──────────────────
    // The 72h GDPR Art.33 clock starts now.
    wf.launch({
      triggerEvent:   'breach_detected',
      triggerRef:     breach.id,
      triggerRefType: 'breach',
      initiatedBy:    req.user?.email ?? detected_by ?? 'system',
      context: {
        breach_id:           breach.id,
        title:               breach.title,
        severity,
        estimated_subjects:  estimated_subjects ?? null,
        jurisdictions,
        source_system:       source_system ?? null,
        detected_by:         detected_by ?? null,
        gdpr_deadline:       new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        requires_regulator:  jurisdictions.some(j => ['EU','GB','SA'].includes(j)),
        requires_user_notify: (estimated_subjects ?? 0) > 0,
      },
    });

    return res.status(201).json({
      data: breach,
      message: 'Breach logged and P0 incident response workflow launched. 72h GDPR clock started.',
    });
  } catch (err) {
    console.error('[compliance/breach POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /breaches — list breach incidents ─────────────────────────────────────
router.get('/breaches', async (req, res) => {
  const pool = getShardPool('SA');
  const { status, severity, limit: lim = '20', offset: off = '0' } = req.query;
  const conds = []; const vals = [];
  if (status)   { conds.push(`status = $${vals.length + 1}`);   vals.push(status); }
  if (severity) { conds.push(`severity = $${vals.length + 1}`); vals.push(severity); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS compliance_breaches (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT, severity TEXT NOT NULL DEFAULT 'high', affected_data_types TEXT[] DEFAULT '{}', estimated_subjects INT, jurisdictions TEXT[] DEFAULT '{}', detected_by TEXT, detected_at TIMESTAMPTZ DEFAULT NOW(), source_system TEXT, status TEXT NOT NULL DEFAULT 'open', regulator_notified BOOLEAN DEFAULT false, closed_at TIMESTAMPTZ, created_by TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM compliance_breaches ${where} ORDER BY created_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, parseInt(lim), parseInt(off)]),
      pool.query(`SELECT COUNT(*) FROM compliance_breaches ${where}`, vals),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), limit: parseInt(lim), offset: parseInt(off) });
  } catch (err) {
    console.error('[compliance/breaches GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
