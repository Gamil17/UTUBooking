'use strict';

/**
 * UTUBooking Phase 4–12 — Shard Router
 *
 * Maps countryCode (ISO 3166-1 alpha-3) → { pool, readPool }
 *
 * Shard timeline:
 *   Phase 4: KSA/UAE/KWT/JOR/MAR/TUN (Bahrain me-south-1)
 *   Phase 5: TR/Istanbul → Frankfurt (KVKK EU data residency)
 *   Phase 6: IN/PK → Mumbai (DPDP 2023)
 *   Phase 7: ID/MY → Singapore
 *   Phase 8: GB → London eu-west-2 (UK GDPR); EU mainland → Frankfurt eu-central-1
 *   Phase 10: US → us-east-1; CA → ca-central-1 (PIPEDA)
 *   Phase 12: BR/AR/CO/CL → São Paulo sa-east-1 (LGPD)
 *
 * Canonical TypeScript type map: backend/config/database.ts
 *
 * Usage (in booking/payment/wallet services):
 *   const { getShardPool } = require('../../shared/shard-router');
 *   const { pool, readPool } = getShardPool(req.user.countryCode);
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
  // ── Phase 4: Gulf / Middle East — me-south-1 Bahrain ─────────────────────
  SAU: { writeEnv: 'DB_URL_KSA',         readEnv: 'READ_DB_URL_KSA' },
  ARE: { writeEnv: 'DB_URL_UAE',         readEnv: 'READ_DB_URL_UAE' },
  KWT: { writeEnv: 'DB_URL_KWT',         readEnv: 'READ_DB_URL_KWT' },
  JOR: { writeEnv: 'DB_URL_JOR',         readEnv: 'READ_DB_URL_JOR' },
  MAR: { writeEnv: 'DB_URL_MAR',         readEnv: 'READ_DB_URL_MAR' },
  TUN: { writeEnv: 'DB_URL_TUN',         readEnv: 'READ_DB_URL_TUN' },

  // ── Phase 5: Turkey — eu-central-1 Frankfurt (KVKK data residency) ────────
  TUR: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },

  // ── Phase 6: South Asia — ap-south-1 Mumbai ───────────────────────────────
  IND: { writeEnv: 'DB_URL_MUMBAI',      readEnv: 'READ_DB_URL_MUMBAI' },
  PAK: { writeEnv: 'DB_URL_MUMBAI',      readEnv: 'READ_DB_URL_MUMBAI' },
  BGD: { writeEnv: 'DB_URL_MUMBAI',      readEnv: 'READ_DB_URL_MUMBAI' },

  // ── Phase 7: SE Asia — ap-southeast-1 Singapore ───────────────────────────
  IDN: { writeEnv: 'DB_URL_SINGAPORE',   readEnv: 'READ_DB_URL_SINGAPORE' },
  MYS: { writeEnv: 'DB_URL_SINGAPORE',   readEnv: 'READ_DB_URL_SINGAPORE' },
  SGP: { writeEnv: 'DB_URL_SINGAPORE',   readEnv: 'READ_DB_URL_SINGAPORE' },

  // ── Phase 8: UK — eu-west-2 London (UK GDPR data sovereignty) ─────────────
  GBR: { writeEnv: 'DB_URL_LONDON',      readEnv: 'READ_DB_URL_LONDON' },

  // ── Phase 8: EU Mainland — eu-central-1 Frankfurt (GDPR Art. 44) ──────────
  DEU: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  FRA: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  NLD: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  ESP: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  ITA: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  BEL: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  POL: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  BIH: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  CHE: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  AUT: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  SWE: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  DNK: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  FIN: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  NOR: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  PRT: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  IRL: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },
  GRC: { writeEnv: 'DB_URL_FRANKFURT',   readEnv: 'READ_DB_URL_FRANKFURT' },

  // ── Phase 10: North America ────────────────────────────────────────────────
  USA: { writeEnv: 'DB_URL_US_EAST',     readEnv: 'READ_DB_URL_US_EAST' },
  CAN: { writeEnv: 'DB_URL_MONTREAL',    readEnv: 'READ_DB_URL_MONTREAL' },   // PIPEDA

  // ── Phase 12: South America — sa-east-1 São Paulo (LGPD) ──────────────────
  BRA: { writeEnv: 'DB_URL_SAO_PAULO',   readEnv: 'READ_DB_URL_SAO_PAULO' },
  ARG: { writeEnv: 'DB_URL_SAO_PAULO',   readEnv: 'READ_DB_URL_SAO_PAULO' },
  COL: { writeEnv: 'DB_URL_SAO_PAULO',   readEnv: 'READ_DB_URL_SAO_PAULO' },
  CHL: { writeEnv: 'DB_URL_SAO_PAULO',   readEnv: 'READ_DB_URL_SAO_PAULO' },
  PER: { writeEnv: 'DB_URL_SAO_PAULO',   readEnv: 'READ_DB_URL_SAO_PAULO' },
  URY: { writeEnv: 'DB_URL_SAO_PAULO',   readEnv: 'READ_DB_URL_SAO_PAULO' },
};

// Aliases: ISO alpha-2 → alpha-3 (accept either format from JWT claims)
const COUNTRY_ALIASES = {
  // Gulf
  SA: 'SAU', AE: 'ARE', KW: 'KWT', JO: 'JOR', MA: 'MAR', TN: 'TUN',
  QA: 'SAU', BH: 'SAU', OM: 'SAU', EG: 'SAU',
  // SE/South Asia
  TR: 'TUR', IN: 'IND', PK: 'PAK', BD: 'BGD',
  ID: 'IDN', MY: 'MYS', SG: 'SGP',
  // EU
  GB: 'GBR',
  DE: 'DEU', FR: 'FRA', NL: 'NLD', ES: 'ESP', IT: 'ITA',
  BE: 'BEL', PL: 'POL', BA: 'BIH', CH: 'CHE', AT: 'AUT',
  SE: 'SWE', DK: 'DNK', FI: 'FIN', NO: 'NOR', PT: 'PRT',
  IE: 'IRL', GR: 'GRC',
  // North America
  US: 'USA', CA: 'CAN',
  // South America
  BR: 'BRA', AR: 'ARG', CO: 'COL', CL: 'CHL', PE: 'PER', UY: 'URY',
  // Legacy short codes (Phase 1-3 user records)
  KSA: 'SAU', UAE: 'ARE',
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
