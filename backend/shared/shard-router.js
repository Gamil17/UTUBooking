'use strict';

/**
 * UTUBooking Phase 4 — Shard Router
 *
 * Maps countryCode (ISO 3166-1 alpha-3) → { pool, readPool }
 * for RDS shard instances provisioned by infra/cloudformation/12-db-sharding.yml
 *
 * Usage (in booking/payment/wallet services):
 *   const { getShardPool } = require('../../shared/shard-router');
 *   const { pool, readPool } = getShardPool(req.user.countryCode);
 *   const result = await pool.query('INSERT INTO bookings ...');
 *
 * Rules:
 * - Write ops (INSERT/UPDATE/DELETE): use pool
 * - Read ops (SELECT): use readPool
 * - Unknown countryCode: falls back to KSA shard (largest capacity)
 * - Pool instances are cached — one Pool per shard per process lifetime
 */

const { Pool } = require('pg');

// ── Shard map: ISO alpha-3 → environment variable key ─────────────────────
// DB_URL_* and READ_DB_URL_* are injected at ECS task startup from SSM params
// via the ECS TaskDefinition secrets block (see 02-ecs-autoscaling.yml)

const SHARD_ENV_MAP = {
  // Saudi Arabia
  SAU: { writeEnv: 'DB_URL_KSA', readEnv: 'READ_DB_URL_KSA' },
  // UAE
  ARE: { writeEnv: 'DB_URL_UAE', readEnv: 'READ_DB_URL_UAE' },
  // Kuwait
  KWT: { writeEnv: 'DB_URL_KWT', readEnv: 'READ_DB_URL_KWT' },
  // Jordan
  JOR: { writeEnv: 'DB_URL_JOR', readEnv: 'READ_DB_URL_JOR' },
  // Morocco
  MAR: { writeEnv: 'DB_URL_MAR', readEnv: 'READ_DB_URL_MAR' },
  // Tunisia
  TUN: { writeEnv: 'DB_URL_TUN', readEnv: 'READ_DB_URL_TUN' },
  // Turkey — EU region for KVKK data residency (Phase 5)
  TUR: { writeEnv: 'DB_URL_ISTANBUL', readEnv: 'READ_DB_URL_ISTANBUL' },
};

// Aliases: ISO alpha-2 → alpha-3 (accept either format from JWT claims)
const COUNTRY_ALIASES = {
  SA: 'SAU', AE: 'ARE', KW: 'KWT', JO: 'JOR', MA: 'MAR', TN: 'TUN', TR: 'TUR',
  // legacy short codes used in Phase 1-3 user records
  KSA: 'SAU', UAE: 'ARE', KWT: 'KWT', JOR: 'JOR',
};

const DEFAULT_SHARD = 'SAU'; // KSA — highest capacity shard

// ── Pool cache: countryCode → { pool, readPool } ──────────────────────────
// Pools are created once and reused. pg.Pool manages connection lifecycle.
const _poolCache = new Map();

const POOL_CONFIG_BASE = {
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Statement timeout — no runaway queries
  statement_timeout: 15_000,
};

/**
 * Returns { pool, readPool } for the shard owning the given countryCode.
 *
 * @param {string} countryCode  ISO 3166-1 alpha-3 (or alpha-2, or legacy alias)
 * @returns {{ pool: Pool, readPool: Pool }}
 */
function getShardPool(countryCode) {
  const normalized = resolveCountryCode(countryCode);

  if (_poolCache.has(normalized)) {
    return _poolCache.get(normalized);
  }

  const shardEnv = SHARD_ENV_MAP[normalized];
  if (!shardEnv) {
    // Should not happen after resolveCountryCode, but guard anyway
    return getShardPool(DEFAULT_SHARD);
  }

  const writeUrl = process.env[shardEnv.writeEnv];
  const readUrl  = process.env[shardEnv.readEnv];

  if (!writeUrl) {
    console.warn(
      `[shard-router] ${shardEnv.writeEnv} not set — falling back to primary DATABASE_URL`
    );
    // Graceful degradation: fall back to primary DB in dev/local
    const fallbackUrl = process.env.DATABASE_URL;
    const pools = {
      pool:     new Pool({ connectionString: fallbackUrl, ...POOL_CONFIG_BASE }),
      readPool: new Pool({ connectionString: process.env.READ_DATABASE_URL || fallbackUrl, ...POOL_CONFIG_BASE }),
    };
    _poolCache.set(normalized, pools);
    return pools;
  }

  const pools = {
    pool:     new Pool({ connectionString: writeUrl, ...POOL_CONFIG_BASE }),
    readPool: new Pool({ connectionString: readUrl || writeUrl, ...POOL_CONFIG_BASE }),
  };

  // Log shard creation (once per process per shard)
  console.info(`[shard-router] Created pool for shard ${normalized} (${shardEnv.writeEnv})`);

  // Handle unexpected pool errors (don't crash process)
  pools.pool.on('error', (err) => {
    console.error(`[shard-router] Pool error on shard ${normalized}:`, err.message);
  });
  pools.readPool.on('error', (err) => {
    console.error(`[shard-router] ReadPool error on shard ${normalized}:`, err.message);
  });

  _poolCache.set(normalized, pools);
  return pools;
}

/**
 * Resolves any countryCode variant to an ISO alpha-3 key in SHARD_ENV_MAP.
 * Falls back to DEFAULT_SHARD for unknown/null codes.
 */
function resolveCountryCode(code) {
  if (!code || typeof code !== 'string') return DEFAULT_SHARD;

  const upper = code.trim().toUpperCase();

  // Direct match in shard map
  if (SHARD_ENV_MAP[upper]) return upper;

  // Alias lookup
  if (COUNTRY_ALIASES[upper]) {
    const resolved = COUNTRY_ALIASES[upper];
    if (SHARD_ENV_MAP[resolved]) return resolved;
  }

  // Unknown country → default shard (KSA)
  console.warn(`[shard-router] Unknown countryCode "${code}" — routing to default shard (${DEFAULT_SHARD})`);
  return DEFAULT_SHARD;
}

/**
 * Returns all currently open pool instances.
 * Used by health check endpoints: GET /health returns pool stats per shard.
 */
function getShardPoolStats() {
  const stats = {};
  for (const [shard, { pool, readPool }] of _poolCache.entries()) {
    stats[shard] = {
      write: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
      read:  { total: readPool.totalCount, idle: readPool.idleCount, waiting: readPool.waitingCount },
    };
  }
  return stats;
}

/**
 * Graceful shutdown — end all pools.
 * Call during SIGTERM handler in each service's index.js.
 */
async function closeAllShardPools() {
  const closes = [];
  for (const { pool, readPool } of _poolCache.values()) {
    closes.push(pool.end(), readPool.end());
  }
  await Promise.all(closes);
  _poolCache.clear();
  console.info('[shard-router] All shard pools closed.');
}

module.exports = {
  getShardPool,
  getShardPoolStats,
  closeAllShardPools,
  resolveCountryCode,
};
