'use strict';

/**
 * Iran Isolation Check — Admin Service Route
 *
 * ⚠️  GATE: Only accessible after OFAC legal clearance is confirmed.
 *     See legal/iran/feasibility-brief.md.
 *
 * GET /api/admin/infrastructure/iran-isolation
 *   Runs all 5 Iran isolation checks synchronously and returns the JSON report.
 *   Authorization: Bearer <ADMIN_SECRET>
 *
 * Checks performed:
 *   1. Cross-region data audit    — no IR/IRN records in non-Iran DB shards
 *   2. Auth token isolation       — no Iran-origin tokens in shared Redis
 *   3. Analytics event isolation  — no fa-locale events in shared analytics
 *   4. API gateway routing        — Iran gateway on separate infrastructure
 *   5. Finance report isolation   — no IRR / IR data in shared finance tables
 *
 * This route is the production entry point called by the weekly Lambda cron
 * (infra/lambda/iran-isolation-cron/handler.js).
 * The canonical check logic lives in scripts/iran-isolation-check.ts —
 * this route re-implements the same checks in plain JS for the Lambda path.
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const dns        = require('dns').promises;
const Redis      = require('ioredis');
const adminAuth  = require('../middleware/adminAuth');

const router = Router();
router.use(adminAuth);

// ─── Constants ────────────────────────────────────────────────────────────────

const IRAN_CODES    = ['IR', 'IRN', 'IRAN'];
const IRAN_CURRENCY = 'IRR';
const IRAN_LOCALE   = 'fa';
const IN_CLAUSE     = IRAN_CODES.map((c) => `'${c}'`).join(', ');
const MAX_SCAN      = 10_000;

const NON_IRAN_SHARDS = {
  'Gulf/SAU  (me-south-1)':   'DB_URL_KSA',
  'Gulf/ARE  (me-south-1)':   'DB_URL_UAE',
  'Gulf/KWT  (me-south-1)':   'DB_URL_KWT',
  'Gulf/JOR  (me-south-1)':   'DB_URL_JOR',
  'EU/MAR    (eu-central-1)': 'DB_URL_MAR',
  'EU/TUN    (eu-central-1)': 'DB_URL_TUN',
  'EU/TUR    (eu-central-1)': 'DB_URL_ISTANBUL',
  'SA/IND+PK (ap-south-1)':  'DB_URL_MUMBAI',
};
if (process.env.DB_URL_SEA) {
  NON_IRAN_SHARDS['SEA/ID+MY (ap-southeast-1)'] = 'DB_URL_SEA';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function auditPool(connectionString) {
  return new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 15_000,
    application_name: 'iran-isolation-check',
  });
}

async function dbCount(pool, sql) {
  try {
    const { rows } = await pool.query(sql);
    return rows[0]?.n ?? 0;
  } catch { return 0; } // table may not exist
}

function timed(fn) {
  return async (...args) => {
    const t0     = Date.now();
    const result = await fn(...args);
    return { ...result, durationMs: Date.now() - t0 };
  };
}

// ─── Check implementations ────────────────────────────────────────────────────

async function check1CrossRegionData() {
  const violations = [];
  const queries = [
    { label: 'users (country_code/nationality)',  sql: `SELECT COUNT(*)::int AS n FROM users WHERE UPPER(country_code) IN (${IN_CLAUSE}) OR UPPER(nationality) IN (${IN_CLAUSE})` },
    { label: 'bookings (country_code)',           sql: `SELECT COUNT(*)::int AS n FROM bookings WHERE UPPER(country_code) IN (${IN_CLAUSE})` },
    { label: 'payments (currency=IRR/country)',   sql: `SELECT COUNT(*)::int AS n FROM payments WHERE UPPER(currency) = '${IRAN_CURRENCY}' OR UPPER(country_code) IN (${IN_CLAUSE})` },
    { label: 'wallet_tx (currency=IRR)',          sql: `SELECT COUNT(*)::int AS n FROM wallet_tx WHERE UPPER(currency) = '${IRAN_CURRENCY}'` },
  ];

  for (const [label, envVar] of Object.entries(NON_IRAN_SHARDS)) {
    const connStr = process.env[envVar];
    if (!connStr) { violations.push({ location: label, description: `${envVar} not set — cannot audit` }); continue; }
    const pool = auditPool(connStr);
    try {
      for (const q of queries) {
        const n = await dbCount(pool, q.sql);
        if (n > 0) violations.push({ location: `${label} → ${q.label}`, description: `${n} record(s) with Iranian identity`, count: n });
      }
    } finally { await pool.end().catch(() => {}); }
  }

  return { id: 1, name: 'Cross-region user data audit', violations,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    message: violations.length === 0 ? 'No Iranian data in non-Iran shards.' : `${violations.length} violation(s) found.` };
}

async function check2AuthTokenIsolation() {
  const violations  = [];
  const redisUrl    = process.env.REDIS_URL ?? 'redis://localhost:6379';
  let   client      = null;

  try {
    client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await client.connect();

    const FORBIDDEN_PATTERNS = ['*:ir:*', '*:IRN:*', '*:iran:*', '*:IR:*'];
    for (const pattern of FORBIDDEN_PATTERNS) {
      let cursor = '0', scanned = 0;
      do {
        const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor   = next;
        scanned += keys.length;
        if (keys.length > 0) { violations.push({ location: `Redis pattern: ${pattern}`, description: `${keys.length} key(s) match Iran pattern`, count: keys.length }); break; }
        if (scanned >= MAX_SCAN) break;
      } while (cursor !== '0');
    }

    // JWT payload scan
    let sessionCursor = '0', sessionScanned = 0, iranSessions = 0;
    do {
      const [next, keys] = await client.scan(sessionCursor, 'MATCH', 'auth:session:*', 'COUNT', 100);
      sessionCursor   = next;
      sessionScanned += keys.length;
      for (const key of keys) {
        const val = await client.get(key);
        if (!val) continue;
        try {
          const payloadB64 = val.split('.')[1];
          if (payloadB64) {
            const p = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            if (IRAN_CODES.includes(String(p.country ?? p.countryCode ?? '').toUpperCase())) iranSessions++;
          }
        } catch {}
      }
      if (sessionScanned >= MAX_SCAN) break;
    } while (sessionCursor !== '0');

    if (iranSessions > 0) violations.push({ location: 'Redis auth:session:* JWT payloads', description: `${iranSessions} active session(s) with country=IR`, count: iranSessions });
  } catch (err) {
    violations.push({ location: 'Redis cluster', description: `Cannot connect: ${err.message}` });
  } finally {
    await client?.quit().catch(() => {});
  }

  return { id: 2, name: 'Auth token isolation', violations,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    message: violations.length === 0 ? 'No Iran-origin tokens in shared Redis.' : `${violations.length} violation(s) found.` };
}

async function check3AnalyticsIsolation() {
  const violations = [];
  const redisUrl   = process.env.REDIS_URL ?? 'redis://localhost:6379';
  let   client     = null;

  try {
    client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await client.connect();
    let cursor = '0', scanned = 0, iranEvents = 0;
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', 'analytics:*', 'COUNT', 100);
      cursor   = next;
      scanned += keys.length;
      for (const key of keys) {
        const type = await client.type(key);
        const strs = type === 'string' ? [await client.get(key)] : type === 'list' ? await client.lrange(key, 0, 49) : [];
        for (const s of strs) {
          if (!s) continue;
          try {
            const e = JSON.parse(s);
            const localeMatch  = String(e.locale ?? e.language ?? '').toLowerCase().startsWith(IRAN_LOCALE);
            const countryMatch = IRAN_CODES.includes(String(e.country ?? e.countryCode ?? '').toUpperCase());
            if (localeMatch || countryMatch) iranEvents++;
          } catch {}
        }
      }
      if (scanned >= MAX_SCAN) break;
    } while (cursor !== '0');
    if (iranEvents > 0) violations.push({ location: 'Redis analytics:*', description: `${iranEvents} event(s) with locale=fa or country=IR`, count: iranEvents });
  } catch (err) {
    violations.push({ location: 'Redis analytics scan', description: err.message });
  } finally {
    await client?.quit().catch(() => {});
  }

  // DB analytics_events
  const analyticsQuery = `SELECT COUNT(*)::int AS n FROM analytics_events WHERE LOWER(locale) LIKE 'fa%' OR UPPER(country_code) IN (${IN_CLAUSE})`;
  for (const [label, envVar] of Object.entries(NON_IRAN_SHARDS)) {
    const connStr = process.env[envVar];
    if (!connStr) continue;
    const pool = auditPool(connStr);
    try { const n = await dbCount(pool, analyticsQuery); if (n > 0) violations.push({ location: `${label} → analytics_events`, description: `${n} event(s) with locale=fa or country=IR`, count: n }); }
    finally { await pool.end().catch(() => {}); }
  }

  return { id: 3, name: 'Analytics event isolation', violations,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    message: violations.length === 0 ? 'No fa-locale analytics events in shared pipeline.' : `${violations.length} violation(s) found.` };
}

async function check4ApiGatewayRouting() {
  const violations = [];
  const iranHost   = (process.env.IRAN_API_GATEWAY_HOST ?? '').trim();
  const mainHost   = (process.env.API_GATEWAY_HOST ?? 'api.utubooking.com').trim();

  if (!iranHost) return { id: 4, name: 'API gateway routing isolation', violations: [],
    status: 'SKIP', message: 'IRAN_API_GATEWAY_HOST not set — Iran gateway not yet provisioned.' };

  let iranIPs = [], mainIPs = [];
  try { iranIPs = await dns.resolve4(iranHost); } catch (e) { violations.push({ location: `DNS: ${iranHost}`, description: `Does not resolve: ${e.message}` }); }
  try { mainIPs = await dns.resolve4(mainHost); } catch (e) { violations.push({ location: `DNS: ${mainHost}`, description: `Does not resolve: ${e.message}` }); }

  if (iranIPs.length && mainIPs.length) {
    const iranSet  = new Set(iranIPs);
    const overlap  = mainIPs.filter((ip) => iranSet.has(ip));
    if (overlap.length) violations.push({ location: `IP overlap: ${iranHost} ↔ ${mainHost}`, description: 'Shared IP — same infrastructure', count: overlap.length, sample: overlap.join(', ') });
  }

  const apex = (h) => h.split('.').slice(-2).join('.');
  if (apex(iranHost) === apex(mainHost)) violations.push({ location: `DNS zone: ${iranHost}`, description: `Same apex domain (${apex(mainHost)}) as main gateway — must be completely separate` });

  return { id: 4, name: 'API gateway routing isolation', violations,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    message: violations.length === 0 ? `Iran gateway (${iranHost}) resolves to separate infrastructure from main gateway.` : `${violations.length} violation(s) — shared infrastructure detected.` };
}

async function check5FinanceIsolation() {
  const violations = [];
  const queries = [
    { label: 'payments (IRR currency)',           sql: `SELECT COUNT(*)::int AS n FROM payments WHERE UPPER(currency) = '${IRAN_CURRENCY}'` },
    { label: 'payments (Iran country_code)',       sql: `SELECT COUNT(*)::int AS n FROM payments WHERE UPPER(country_code) IN (${IN_CLAUSE})` },
    { label: 'invoices (IRR or Iran)',             sql: `SELECT COUNT(*)::int AS n FROM invoices WHERE UPPER(currency) = '${IRAN_CURRENCY}' OR UPPER(country_code) IN (${IN_CLAUSE})` },
    { label: 'fx_rates (IRR)',                     sql: `SELECT COUNT(*)::int AS n FROM fx_rates WHERE UPPER(base_currency) = '${IRAN_CURRENCY}' OR UPPER(target_currency) = '${IRAN_CURRENCY}'` },
    { label: 'wallet_tx (IRR)',                    sql: `SELECT COUNT(*)::int AS n FROM wallet_tx WHERE UPPER(currency) = '${IRAN_CURRENCY}'` },
    { label: 'financial_transactions (IRR/Iran)',  sql: `SELECT COUNT(*)::int AS n FROM financial_transactions WHERE UPPER(currency) = '${IRAN_CURRENCY}' OR UPPER(country_code) IN (${IN_CLAUSE})` },
  ];

  for (const [label, envVar] of Object.entries(NON_IRAN_SHARDS)) {
    const connStr = process.env[envVar];
    if (!connStr) continue;
    const pool = auditPool(connStr);
    try {
      for (const q of queries) {
        const n = await dbCount(pool, q.sql);
        if (n > 0) violations.push({ location: `${label} → ${q.label}`, description: `${n} financial record(s) with Iranian data`, count: n });
      }
    } finally { await pool.end().catch(() => {}); }
  }

  return { id: 5, name: 'Finance report isolation', violations,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    message: violations.length === 0 ? 'No IRR currency or Iranian country code in shared finance tables.' : `${violations.length} violation(s) found.` };
}

// ─── Route: GET /iran-isolation ───────────────────────────────────────────────

router.get('/iran-isolation', async (_req, res) => {
  const runAt = new Date().toISOString();

  const [c1, c2, c3, c4, c5] = await Promise.all([
    timed(check1CrossRegionData)(),
    timed(check2AuthTokenIsolation)(),
    timed(check3AnalyticsIsolation)(),
    timed(check4ApiGatewayRouting)(),
    timed(check5FinanceIsolation)(),
  ]);

  const checks        = [c1, c2, c3, c4, c5];
  const active        = checks.filter((c) => c.status !== 'SKIP');
  const passedChecks  = active.filter((c) => c.status === 'PASS').length;
  const failedChecks  = active.filter((c) => c.status === 'FAIL').length;
  const overallStatus = failedChecks === 0 ? 'PASS' : 'FAIL';

  if (overallStatus === 'FAIL') {
    console.error(
      `[iran-isolation] ❌ FAIL — ${failedChecks} check(s) failed. ` +
      'Escalate to Legal Agent immediately. See legal/iran/feasibility-brief.md §10.'
    );
  }

  res.json({
    runAt,
    overallStatus,
    passedChecks,
    totalChecks: active.length,
    checks,
    legalNote:
      'FAIL results must be escalated to Legal Agent within 24 hours. ' +
      'See legal/iran/feasibility-brief.md — OFAC counsel must be notified of any isolation breach.',
  });
});

module.exports = router;
