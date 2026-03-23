'use strict';

/**
 * Infrastructure Health Check — Phase 7
 *
 * GET  /api/admin/infrastructure/health
 *   Pings all active DB shards, measures latency, reads Redis stats,
 *   and returns a per-region health summary.
 *
 * GET  /api/admin/infrastructure/routing-audit
 *   Queries each shard for: SELECT country, COUNT(*) FROM bookings GROUP BY country
 *   Cross-references against DB_REGION_MAP — flags any misrouted records.
 *
 * Authorization: Bearer <ADMIN_SECRET> (enforced by app.js → adminAuth middleware)
 *
 * Region → Shard map (Phase 7 — 10 active markets):
 *
 *   me-south-1  (Bahrain)    SAU, ARE, KWT, JOR      SAMA guidelines
 *   eu-central-1 (Frankfurt) MAR, TUN, TUR            GDPR-adjacent + KVKK
 *   ap-southeast-1 (Singapore) IDN, MYS               PDP + PDPA  [pending provisioning]
 *   ap-south-1  (Mumbai)     IND, PAK (shared)        DPDP 2023 + PECA
 *
 * Note on SEA shards (IDN, MYS):
 *   Indonesia and Malaysia use DB_URL_SEA / READ_DB_URL_SEA.
 *   These env vars are not yet in the shard router (Phase 7 provisioning item).
 *   The health check tests the connection directly if DB_URL_SEA is set,
 *   and marks the shards as 'pending_provisioning' if the env var is absent.
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');

const { getShardPool, getShardPoolStats } = require('../../../../shared/shard-router');
const redis = require('../../../../shared/redis-cluster');

const router = Router();
router.use(adminAuth);

// ─── Region / Shard definitions ──────────────────────────────────────────────

/**
 * AWS region → shard codes + metadata.
 * Matches the Phase 7 data residency table from the spec.
 */
const REGION_MAP = {
  'me-south-1': {
    name:       'Bahrain',
    dbInstance: 'utubooking-gulf',
    dataLaw:    'SAMA guidelines',
    markets:    ['Saudi Arabia', 'UAE', 'Kuwait', 'Jordan', 'Bahrain'],
    shards:     ['SAU', 'ARE', 'KWT', 'JOR'],
  },
  'eu-central-1': {
    name:       'Frankfurt',
    dbInstance: 'utubooking-eu / utubooking-turkey',
    dataLaw:    'GDPR-adjacent (MA/TN) + KVKK 2016 (TR)',
    markets:    ['Morocco', 'Tunisia', 'Turkey'],
    shards:     ['MAR', 'TUN', 'TUR'],
  },
  'ap-southeast-1': {
    name:       'Singapore',
    dbInstance: 'utubooking-sea',
    dataLaw:    'PDP (Indonesia) + PDPA (Malaysia)',
    markets:    ['Indonesia', 'Malaysia'],
    shards:     ['IDN', 'MYS'],
    pending:    true,   // DB_URL_SEA not yet provisioned in shard router
  },
  'ap-south-1': {
    name:       'Mumbai',
    dbInstance: 'utubooking-sa',
    dataLaw:    'DPDP Act 2023 (India) + PECA 2016 (Pakistan)',
    markets:    ['India', 'Pakistan'],
    shards:     ['IND', 'PAK'],
  },
};

/**
 * Shard code → AWS region code (for routing audit enrichment).
 */
const SHARD_TO_REGION = {
  SAU: 'me-south-1',  ARE: 'me-south-1',  KWT: 'me-south-1',  JOR: 'me-south-1',
  MAR: 'eu-central-1', TUN: 'eu-central-1', TUR: 'eu-central-1',
  IDN: 'ap-southeast-1', MYS: 'ap-southeast-1',
  IND: 'ap-south-1',  PAK: 'ap-south-1',
};

/**
 * ISO alpha-2 country code → expected shard.
 * Used by the routing audit to detect misrouted bookings.
 *
 * PAK → IND (they share utubooking-sa / DB_URL_MUMBAI).
 * BH (Bahrain) → SAU (falls back to Gulf shard).
 * BD (Bangladesh) → IND (nearest shard per shard-router.js).
 */
const COUNTRY_EXPECTED_SHARD = {
  SA: 'SAU', AE: 'ARE', KW: 'KWT', JO: 'JOR', BH: 'SAU',
  MA: 'MAR', TN: 'TUN', TR: 'TUR',
  ID: 'IDN', MY: 'MYS',
  IN: 'IND', PK: 'IND',   // PAK shares IND shard (DB_URL_MUMBAI)
  BD: 'IND',               // Bangladesh → Mumbai (nearest, per shard-router.js)
};

// ─── Shard ping helper ────────────────────────────────────────────────────────

/**
 * Pings a shard's write pool with SELECT 1 and measures round-trip latency.
 * For SEA shards (IDN, MYS), falls back to a direct pool from DB_URL_SEA
 * since they are not yet in the shard router.
 *
 * @param {string} shardCode
 * @returns {{ status: string, latencyMs: number|null, error?: string }}
 */
async function pingShardWrite(shardCode) {
  let pool;

  // SEA shards are not yet in shard-router.js — test directly via env var
  if (shardCode === 'IDN' || shardCode === 'MYS') {
    const seaUrl = process.env.DB_URL_SEA;
    if (!seaUrl) {
      return { status: 'pending_provisioning', latencyMs: null };
    }
    pool = new Pool({ connectionString: seaUrl, connectionTimeoutMillis: 5_000, max: 1 });
  } else {
    try {
      ({ pool } = getShardPool(shardCode));
    } catch (err) {
      return { status: 'down', latencyMs: null, error: err.message };
    }
  }

  const t0 = Date.now();
  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - t0;
    return { status: 'healthy', latencyMs };
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - t0, error: err.message };
  }
}

// ─── Redis stats helper ───────────────────────────────────────────────────────

/**
 * Retrieves Redis INFO stats for cache hit rate, memory, and connected clients.
 * For a cluster, INFO is sent to one node — reflects a representative sample.
 */
async function getRedisStats() {
  try {
    // ioredis: redis.info(section) returns the INFO string for that section
    const [statsInfo, memInfo, clientInfo] = await Promise.all([
      redis.info('stats'),
      redis.info('memory'),
      redis.info('clients'),
    ]);

    const hits    = parseInt(statsInfo.match(/keyspace_hits:(\d+)/)?.[1]   ?? '0', 10);
    const misses  = parseInt(statsInfo.match(/keyspace_misses:(\d+)/)?.[1] ?? '0', 10);
    const total   = hits + misses;
    const hitRate = total > 0 ? parseFloat((hits / total).toFixed(4)) : null;

    const usedMemoryBytes  = parseInt(memInfo.match(/used_memory:(\d+)/)?.[1]      ?? '0', 10);
    const peakMemoryBytes  = parseInt(memInfo.match(/used_memory_peak:(\d+)/)?.[1] ?? '0', 10);
    const connectedClients = parseInt(clientInfo.match(/connected_clients:(\d+)/)?.[1] ?? '0', 10);

    return {
      status:           'healthy',
      hitRate,
      hitCount:         hits,
      missCount:        misses,
      usedMemoryMb:     Math.round(usedMemoryBytes / 1024 / 1024),
      peakMemoryMb:     Math.round(peakMemoryBytes / 1024 / 1024),
      connectedClients,
    };
  } catch (err) {
    return { status: 'down', hitRate: null, error: err.message };
  }
}

// ─── Route: GET /health ───────────────────────────────────────────────────────

/**
 * GET /api/admin/infrastructure/health
 *
 * Returns per-region and per-shard health:
 *   - DB ping latency (SELECT 1 round-trip, ms)
 *   - DB connection pool stats (total, idle, waiting)
 *   - Redis cache hit rate, memory, connected clients
 *   - Overall status: healthy | degraded | down
 *
 * Authorization: Bearer <ADMIN_SECRET>
 */
router.get('/health', async (_req, res) => {
  const checkedAt = new Date().toISOString();

  const ALL_SHARDS = ['SAU', 'ARE', 'KWT', 'JOR', 'MAR', 'TUN', 'TUR', 'IDN', 'MYS', 'IND', 'PAK'];

  // Ping all shards + get Redis stats in parallel
  const [pingResults, poolStats, redisStats] = await Promise.all([
    Promise.all(
      ALL_SHARDS.map(async (shard) => ({ shard, result: await pingShardWrite(shard) }))
    ),
    (async () => {
      try { return getShardPoolStats(); } catch { return {}; }
    })(),
    getRedisStats(),
  ]);

  // Index pings by shard code
  const pingByShard = Object.fromEntries(pingResults.map(({ shard, result }) => [shard, result]));

  // Build per-region summary
  const regions = {};

  for (const [regionCode, regionMeta] of Object.entries(REGION_MAP)) {
    const shardDetails = {};
    let sumLatency = 0, healthyCount = 0;

    for (const shardCode of regionMeta.shards) {
      const ping  = pingByShard[shardCode] ?? { status: 'unknown', latencyMs: null };
      const pools = poolStats[shardCode]   ?? {};

      shardDetails[shardCode] = {
        status:      ping.status,
        latencyMs:   ping.latencyMs,
        connections: Object.keys(pools).length > 0 ? pools : undefined,
        ...(ping.error ? { error: ping.error } : {}),
      };

      if (ping.status === 'healthy') {
        sumLatency   += ping.latencyMs;
        healthyCount += 1;
      }
    }

    const statuses   = Object.values(shardDetails).map((s) => s.status);
    const allDown    = statuses.every((s) => s === 'down');
    const anyDown    = statuses.some((s) => s === 'down');
    const allPending = statuses.every((s) => s === 'pending_provisioning');

    let regionStatus;
    if (allPending)        regionStatus = 'pending_provisioning';
    else if (allDown)      regionStatus = 'down';
    else if (anyDown)      regionStatus = 'degraded';
    else                   regionStatus = 'healthy';

    regions[regionCode] = {
      name:          regionMeta.name,
      dbInstance:    regionMeta.dbInstance,
      dataLaw:       regionMeta.dataLaw,
      markets:       regionMeta.markets,
      status:        regionStatus,
      avgLatencyMs:  healthyCount > 0 ? Math.round(sumLatency / healthyCount) : null,
      shards:        shardDetails,
    };
  }

  // Overall status: healthy only if every provisioned region is healthy
  const provisionedStatuses = Object.values(regions)
    .filter((r) => r.status !== 'pending_provisioning')
    .map((r) => r.status);

  const overallStatus =
    provisionedStatuses.every((s) => s === 'healthy') ? 'healthy'
    : provisionedStatuses.every((s) => s === 'down')  ? 'down'
    : 'degraded';

  res.json({
    checkedAt,
    overallStatus,
    activeMarkets: 10,
    regions,
    redis: redisStats,
  });
});

// ─── Route: GET /routing-audit ────────────────────────────────────────────────

/**
 * GET /api/admin/infrastructure/routing-audit
 *
 * Queries each provisioned shard for:
 *   SELECT country, COUNT(*) FROM bookings GROUP BY country ORDER BY count DESC
 *
 * Cross-references each (shard, country) pair against COUNTRY_EXPECTED_SHARD.
 * Flags any booking records found in the wrong shard as misrouted.
 *
 * Response:
 *   {
 *     checkedAt, status: 'clean'|'issues_found',
 *     totalBookings, misroutedCount,
 *     misrouted: [{ country, count, foundInShard, foundInRegion, expectedShard, expectedRegion }],
 *     breakdown: [{ country, count, shard, region, expectedShard, correct }]
 *   }
 *
 * Authorization: Bearer <ADMIN_SECRET>
 */
router.get('/routing-audit', async (_req, res) => {
  const checkedAt = new Date().toISOString();

  // Only query shards that have real DB connections (exclude SEA — pending)
  const PROVISIONED_SHARDS = ['SAU', 'ARE', 'KWT', 'JOR', 'MAR', 'TUN', 'TUR', 'IND'];
  // PAK shares DB_URL_MUMBAI with IND — querying IND covers both

  const QUERY = `
    SELECT
      UPPER(country) AS country,
      COUNT(*)::int  AS count
    FROM bookings
    GROUP BY country
    ORDER BY count DESC
  `;

  const shardQueryResults = await Promise.all(
    PROVISIONED_SHARDS.map(async (shardCode) => {
      try {
        const { readPool } = getShardPool(shardCode);
        const { rows }     = await readPool.query(QUERY);
        return { shard: shardCode, rows, error: null };
      } catch (err) {
        return { shard: shardCode, rows: null, error: err.message };
      }
    })
  );

  const misrouted   = [];
  const breakdown   = [];
  let   totalBookings = 0;

  for (const { shard, rows, error } of shardQueryResults) {
    if (error || !rows) {
      breakdown.push({
        shard,
        region:  SHARD_TO_REGION[shard],
        status:  'unavailable',
        error,
      });
      continue;
    }

    for (const { country, count } of rows) {
      totalBookings += count;

      const expectedShard  = COUNTRY_EXPECTED_SHARD[country] ?? null;
      const correct        = expectedShard === shard;
      const foundRegion    = SHARD_TO_REGION[shard];
      const expectedRegion = expectedShard ? SHARD_TO_REGION[expectedShard] : null;

      if (!correct) {
        misrouted.push({
          country,
          count,
          foundInShard:    shard,
          foundInRegion:   foundRegion,
          expectedShard:   expectedShard ?? 'UNKNOWN',
          expectedRegion:  expectedRegion ?? 'UNKNOWN',
          dataLawRisk:     expectedRegion !== foundRegion
            ? `Data stored in ${foundRegion} — required in ${expectedRegion}`
            : 'Wrong shard but same region — low risk',
        });
      }

      breakdown.push({
        country,
        count,
        shard,
        region:        foundRegion,
        expectedShard: expectedShard ?? 'UNKNOWN',
        correct,
      });
    }
  }

  // Sort misrouted by count descending (highest volume first)
  misrouted.sort((a, b) => b.count - a.count);
  breakdown.sort((a, b) => b.count - a.count);

  const status = misrouted.length === 0 ? 'clean' : 'issues_found';

  if (status === 'issues_found') {
    console.warn(
      `[routing-audit] ${misrouted.length} misrouted country/shard pairs found.`,
      misrouted.map((m) => `${m.country}: ${m.foundInShard} → should be ${m.expectedShard}`)
    );
  }

  res.json({
    checkedAt,
    status,
    totalBookings,
    misroutedCount:       misrouted.length,
    misroutedCountries:   [...new Set(misrouted.map((m) => m.country))],
    misrouted,
    pendingShards:        ['IDN', 'MYS'],  // SEA region — not yet provisioned
    breakdown,
  });
});

module.exports = router;
