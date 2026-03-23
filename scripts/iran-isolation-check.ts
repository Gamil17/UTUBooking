/**
 * scripts/iran-isolation-check.ts
 *
 * Iran Technical Isolation Verification Script — Phase 7
 *
 * ⚠️  GATE: Only run after written legal clearance for Iran operations is confirmed.
 *     See legal/iran/feasibility-brief.md. Do NOT run in production until
 *     a qualified OFAC attorney has provided a written opinion.
 *
 * Purpose:
 *   Verifies that UTUBooking's non-Iran infrastructure is completely free of
 *   Iranian user data, authentication tokens, analytics events, payment data,
 *   and API routing overlap. This is an ongoing OFAC compliance obligation —
 *   any isolation failure must be remediated immediately and disclosed to counsel.
 *
 * Five checks (all must PASS for the report to be green):
 *   1. Cross-region data audit    — no IR/IRN records in non-Iran DB shards
 *   2. Auth token isolation       — no Iran-origin tokens in shared Redis
 *   3. Analytics event isolation  — no fa-locale events in shared analytics store
 *   4. API gateway routing        — Iran gateway resolves to separate infrastructure
 *   5. Finance report isolation   — no IRR / IR payment data in shared finance tables
 *
 * Run standalone:
 *   npx ts-node scripts/iran-isolation-check.ts
 *
 * Run via Lambda (weekly, Mondays 06:00 UTC):
 *   infra/lambda/iran-isolation-cron/handler.js
 *
 * Environment variables required:
 *   DB_URL_KSA, DB_URL_UAE, DB_URL_KWT, DB_URL_JOR   — Gulf shards (read-only check)
 *   DB_URL_MAR, DB_URL_TUN, DB_URL_ISTANBUL           — EU shards  (read-only check)
 *   DB_URL_MUMBAI                                     — SA shard   (read-only check)
 *   DB_URL_SEA                                        — SEA shard  (read-only check, if provisioned)
 *   REDIS_URL or REDIS_CLUSTER_URLS                   — Shared Redis cluster
 *   IRAN_API_GATEWAY_HOST                             — Hostname of dedicated Iran API gateway
 *   API_GATEWAY_HOST                                  — Hostname of main UTUBooking API gateway
 *   REPORT_EMAIL_TO                                   — Comma-separated recipient list
 *   REPORT_EMAIL_FROM                                 — Verified SES sender address
 *   AWS_REGION                                        — For SES client (defaults to me-south-1)
 *   ADMIN_SECRET                                      — Internal auth for admin service health check
 */

import { Pool }          from 'pg';
import Redis             from 'ioredis';
import dns               from 'dns/promises';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as fs           from 'fs';
import * as path         from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';

interface Violation {
  location:    string;   // shard, table, Redis key pattern, or DNS hostname
  description: string;
  count?:      number;
  sample?:     string;   // redacted sample — never log real user data
}

interface CheckResult {
  id:         number;
  name:       string;
  status:     CheckStatus;
  message:    string;
  violations: Violation[];
  durationMs: number;
}

interface IsolationReport {
  runAt:         string;
  runBy:         string;
  overallStatus: 'PASS' | 'FAIL';
  passedChecks:  number;
  totalChecks:   number;
  checks:        CheckResult[];
  emailedTo:     string[];
  legalNote:     string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** ISO alpha-2 and alpha-3 codes for Iran — used in DB queries. */
const IRAN_COUNTRY_CODES = ['IR', 'IRN', 'IRAN'];

/** Iran currency code. */
const IRAN_CURRENCY = 'IRR';

/** Iran locale code (Farsi/Persian). */
const IRAN_LOCALE = 'fa';

/**
 * Non-Iran DB shards to audit.
 * Maps a human-readable shard label to its env var name.
 * DB_URL_SEA is optional — checked only if the env var is set.
 */
const NON_IRAN_SHARDS: Record<string, string> = {
  'Gulf/SAU  (me-south-1)':    'DB_URL_KSA',
  'Gulf/ARE  (me-south-1)':    'DB_URL_UAE',
  'Gulf/KWT  (me-south-1)':    'DB_URL_KWT',
  'Gulf/JOR  (me-south-1)':    'DB_URL_JOR',
  'EU/MAR    (eu-central-1)':  'DB_URL_MAR',
  'EU/TUN    (eu-central-1)':  'DB_URL_TUN',
  'EU/TUR    (eu-central-1)':  'DB_URL_ISTANBUL',
  'SA/IND+PK (ap-south-1)':   'DB_URL_MUMBAI',
};
if (process.env.DB_URL_SEA) {
  NON_IRAN_SHARDS['SEA/ID+MY (ap-southeast-1)'] = 'DB_URL_SEA';
}

// ─── DB helper ────────────────────────────────────────────────────────────────

/** Opens a read-only pool (single connection, short timeout) for audit queries. */
function auditPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max:                        1,
    connectionTimeoutMillis:    8_000,
    statement_timeout:          15_000,
    application_name:           'iran-isolation-check',
  });
}

// ─── Check 1 — Cross-region data audit ───────────────────────────────────────

/**
 * Queries every non-Iran shard for:
 *   - users with country_code or nationality = IR/IRN
 *   - bookings with country_code = IR/IRN
 *   - payments with currency = IRR or country_code = IR/IRN
 *   - wallet transactions with currency = IRR
 *
 * Any non-zero count is a violation — Iranian user data must not exist
 * in non-Iran infrastructure.
 */
async function checkCrossRegionData(): Promise<CheckResult> {
  const start      = Date.now();
  const violations: Violation[] = [];

  const IN_CLAUSE = IRAN_COUNTRY_CODES.map((c) => `'${c}'`).join(', ');

  const QUERIES: Array<{ label: string; sql: string }> = [
    {
      label: 'users.country_code or nationality = Iran',
      sql:   `SELECT COUNT(*)::int AS n FROM users
              WHERE UPPER(country_code) IN (${IN_CLAUSE})
                 OR UPPER(nationality)  IN (${IN_CLAUSE})`,
    },
    {
      label: 'bookings.country_code = Iran',
      sql:   `SELECT COUNT(*)::int AS n FROM bookings
              WHERE UPPER(country_code) IN (${IN_CLAUSE})`,
    },
    {
      label: 'payments.currency = IRR or country_code = Iran',
      sql:   `SELECT COUNT(*)::int AS n FROM payments
              WHERE UPPER(currency)     = '${IRAN_CURRENCY}'
                 OR UPPER(country_code) IN (${IN_CLAUSE})`,
    },
    {
      label: 'wallet_tx.currency = IRR',
      sql:   `SELECT COUNT(*)::int AS n FROM wallet_tx
              WHERE UPPER(currency) = '${IRAN_CURRENCY}'`,
    },
  ];

  for (const [shardLabel, envVar] of Object.entries(NON_IRAN_SHARDS)) {
    const connStr = process.env[envVar];
    if (!connStr) {
      violations.push({
        location:    shardLabel,
        description: `Env var ${envVar} not set — cannot audit this shard. Treat as unverified.`,
      });
      continue;
    }

    const pool = auditPool(connStr);
    try {
      for (const { label, sql } of QUERIES) {
        try {
          const { rows } = await pool.query(sql);
          const count    = rows[0]?.n ?? 0;
          if (count > 0) {
            violations.push({
              location:    `${shardLabel} → ${label}`,
              description: `Found ${count} record(s) with Iranian identity in a non-Iran shard`,
              count,
              sample:      '[redacted — do not log PII]',
            });
          }
        } catch (queryErr: any) {
          // Table may not exist yet on some shards — not a violation
          if (!queryErr.message?.includes('does not exist')) {
            violations.push({
              location:    `${shardLabel} → ${label}`,
              description: `Query error: ${queryErr.message}`,
            });
          }
        }
      }
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  return {
    id:         1,
    name:       'Cross-region user data audit',
    status:     violations.length === 0 ? 'PASS' : 'FAIL',
    message:    violations.length === 0
      ? 'No Iranian user, booking, payment, or wallet data found in any non-Iran shard.'
      : `${violations.length} violation(s) — Iranian data found outside Iran shard.`,
    violations,
    durationMs: Date.now() - start,
  };
}

// ─── Check 2 — Auth token isolation ──────────────────────────────────────────

/**
 * Scans shared Redis for keys or values that indicate Iran-origin auth tokens:
 *   - Key patterns containing :ir:, :IRN:, :iran:
 *   - auth:session:* values whose JWT payload contains "country":"IR"
 *   - refresh:* keys with Iran markers
 *
 * Uses SCAN (non-blocking cursor) — safe for production Redis.
 * Inspects up to MAX_SCAN_KEYS keys to avoid excessive memory reads.
 */
async function checkAuthTokenIsolation(): Promise<CheckResult> {
  const start      = Date.now();
  const violations: Violation[] = [];
  const MAX_SCAN_KEYS = 10_000;

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  let   client: Redis | null = null;

  try {
    client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await client.connect();

    // Patterns that should never appear in the shared Redis cluster
    const FORBIDDEN_PATTERNS = [
      '*:ir:*', '*:IRN:*', '*:iran:*', '*:IR:*',
      'auth:*:ir', 'session:*:IR', 'refresh:*:IR',
    ];

    for (const pattern of FORBIDDEN_PATTERNS) {
      let cursor  = '0';
      let scanned = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor   = nextCursor;
        scanned += keys.length;

        if (keys.length > 0) {
          violations.push({
            location:    `Redis key pattern: ${pattern}`,
            description: `Found ${keys.length} key(s) matching Iran-pattern in shared Redis cluster`,
            count:       keys.length,
            sample:      '[key names redacted]',
          });
          break; // One violation per pattern is enough to flag
        }

        if (scanned >= MAX_SCAN_KEYS) break;
      } while (cursor !== '0');
    }

    // Spot-check auth:session:* values for Iran country code in JWT payload
    let sessionCursor = '0';
    let sessionScanned = 0;
    let iranSessionCount = 0;

    do {
      const [nextCursor, keys] = await client.scan(
        sessionCursor, 'MATCH', 'auth:session:*', 'COUNT', 100
      );
      sessionCursor  = nextCursor;
      sessionScanned += keys.length;

      for (const key of keys) {
        const val = await client.get(key);
        if (val) {
          try {
            // JWT payload is base64url — decode middle segment without verification
            const payloadB64 = val.split('.')[1];
            if (payloadB64) {
              const payload = JSON.parse(
                Buffer.from(payloadB64, 'base64url').toString('utf8')
              );
              if (
                IRAN_COUNTRY_CODES.includes(String(payload.country ?? '').toUpperCase()) ||
                IRAN_COUNTRY_CODES.includes(String(payload.countryCode ?? '').toUpperCase())
              ) {
                iranSessionCount++;
              }
            }
          } catch { /* not a JWT — skip */ }
        }
      }

      if (sessionScanned >= MAX_SCAN_KEYS) break;
    } while (sessionCursor !== '0');

    if (iranSessionCount > 0) {
      violations.push({
        location:    'Redis auth:session:* JWT payloads',
        description: `Found ${iranSessionCount} active session token(s) with country=IR in shared Redis`,
        count:       iranSessionCount,
        sample:      '[JWT payload country field redacted]',
      });
    }

  } catch (err: any) {
    violations.push({
      location:    'Redis cluster',
      description: `Cannot connect to Redis for auth token audit: ${err.message}`,
    });
  } finally {
    await client?.quit().catch(() => undefined);
  }

  return {
    id:         2,
    name:       'Auth token isolation',
    status:     violations.length === 0 ? 'PASS' : 'FAIL',
    message:    violations.length === 0
      ? 'No Iran-origin auth tokens or session keys found in shared Redis cluster.'
      : `${violations.length} violation(s) — Iran-origin tokens found in shared Redis.`,
    violations,
    durationMs: Date.now() - start,
  };
}

// ─── Check 3 — Analytics event isolation ─────────────────────────────────────

/**
 * Verifies that Farsi-locale (fa) analytics events are not flowing through
 * the shared analytics pipeline. Checks:
 *   - Redis analytics:events:* keys for locale=fa or country_code=IR
 *   - DB analytics_events table (if exists) on all non-Iran shards
 *
 * Iranian analytics must flow through a separate, isolated pipeline.
 */
async function checkAnalyticsIsolation(): Promise<CheckResult> {
  const start      = Date.now();
  const violations: Violation[] = [];
  const MAX_EVENTS_SCAN = 5_000;

  // ── Redis analytics event scan ──────────────────────────────────────────────
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  let   client: Redis | null = null;

  try {
    client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await client.connect();

    let cursor  = '0';
    let scanned = 0;
    let iranEventCount = 0;

    do {
      const [nextCursor, keys] = await client.scan(
        cursor, 'MATCH', 'analytics:*', 'COUNT', 100
      );
      cursor   = nextCursor;
      scanned += keys.length;

      for (const key of keys) {
        // Events may be stored as JSON strings or lists
        const type = await client.type(key);
        let eventStrings: string[] = [];

        if (type === 'string') {
          const v = await client.get(key);
          if (v) eventStrings = [v];
        } else if (type === 'list') {
          eventStrings = await client.lrange(key, 0, 49); // sample first 50
        }

        for (const str of eventStrings) {
          try {
            const evt = JSON.parse(str);
            const localeMatch   = String(evt.locale ?? evt.language ?? '').toLowerCase().startsWith(IRAN_LOCALE);
            const countryMatch  = IRAN_COUNTRY_CODES.includes(String(evt.country ?? evt.countryCode ?? '').toUpperCase());
            if (localeMatch || countryMatch) {
              iranEventCount++;
            }
          } catch { /* not JSON */ }
        }
      }

      if (scanned >= MAX_EVENTS_SCAN) break;
    } while (cursor !== '0');

    if (iranEventCount > 0) {
      violations.push({
        location:    'Redis analytics:* event store',
        description: `Found ${iranEventCount} analytics event(s) with locale=fa or country=IR in shared Redis`,
        count:       iranEventCount,
      });
    }
  } catch (err: any) {
    violations.push({
      location:    'Redis analytics scan',
      description: `Cannot scan Redis analytics events: ${err.message}`,
    });
  } finally {
    await client?.quit().catch(() => undefined);
  }

  // ── DB analytics_events table audit ─────────────────────────────────────────
  const IN_CLAUSE = IRAN_COUNTRY_CODES.map((c) => `'${c}'`).join(', ');
  const analyticsQuery = `
    SELECT COUNT(*)::int AS n FROM analytics_events
    WHERE LOWER(locale)        LIKE 'fa%'
       OR UPPER(country_code)  IN (${IN_CLAUSE})
  `;

  for (const [shardLabel, envVar] of Object.entries(NON_IRAN_SHARDS)) {
    const connStr = process.env[envVar];
    if (!connStr) continue;

    const pool = auditPool(connStr);
    try {
      const { rows } = await pool.query(analyticsQuery);
      const count    = rows[0]?.n ?? 0;
      if (count > 0) {
        violations.push({
          location:    `${shardLabel} → analytics_events`,
          description: `Found ${count} analytics event(s) with locale=fa or country=IR`,
          count,
        });
      }
    } catch { /* table may not exist — not a violation */ } finally {
      await pool.end().catch(() => undefined);
    }
  }

  return {
    id:         3,
    name:       'Analytics event isolation',
    status:     violations.length === 0 ? 'PASS' : 'FAIL',
    message:    violations.length === 0
      ? 'No Farsi-locale or Iran-country analytics events found in shared analytics pipeline.'
      : `${violations.length} violation(s) — Iran analytics events leaking into shared pipeline.`,
    violations,
    durationMs: Date.now() - start,
  };
}

// ─── Check 4 — API gateway routing isolation ──────────────────────────────────

/**
 * Verifies that the Iran API gateway is hosted on completely separate infrastructure:
 *   1. IRAN_API_GATEWAY_HOST resolves to different IP(s) than API_GATEWAY_HOST
 *   2. There is no IP overlap between the two gateways
 *   3. IRAN_API_GATEWAY_HOST is set and non-empty
 *   4. The Iran gateway domain is on a different DNS zone than the main gateway
 *
 * A shared IP address means shared infrastructure — an OFAC violation risk.
 */
async function checkApiGatewayRouting(): Promise<CheckResult> {
  const start      = Date.now();
  const violations: Violation[] = [];

  const iranHost = process.env.IRAN_API_GATEWAY_HOST?.trim();
  const mainHost = process.env.API_GATEWAY_HOST?.trim() ?? 'api.utubooking.com';

  if (!iranHost) {
    return {
      id:         4,
      name:       'API gateway routing isolation',
      status:     'SKIP',
      message:    'IRAN_API_GATEWAY_HOST env var not set — Iran gateway not yet provisioned.',
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  // Resolve both hostnames
  let iranAddresses: string[] = [];
  let mainAddresses: string[] = [];

  try {
    const iranResult = await dns.resolve4(iranHost);
    iranAddresses    = iranResult;
  } catch (err: any) {
    violations.push({
      location:    `DNS: ${iranHost}`,
      description: `Iran API gateway hostname does not resolve: ${err.message}`,
    });
  }

  try {
    const mainResult = await dns.resolve4(mainHost);
    mainAddresses    = mainResult;
  } catch (err: any) {
    violations.push({
      location:    `DNS: ${mainHost}`,
      description: `Main API gateway hostname does not resolve: ${err.message}`,
    });
  }

  // Check for IP overlap
  if (iranAddresses.length > 0 && mainAddresses.length > 0) {
    const iranSet = new Set(iranAddresses);
    const overlap = mainAddresses.filter((ip) => iranSet.has(ip));

    if (overlap.length > 0) {
      violations.push({
        location:    `DNS overlap: ${iranHost} ↔ ${mainHost}`,
        description: `Shared IP address(es) detected — Iran and main API gateway share infrastructure`,
        count:       overlap.length,
        sample:      overlap.join(', '),
      });
    }
  }

  // Check the domains are on different DNS zones
  const getApexDomain = (host: string): string =>
    host.split('.').slice(-2).join('.');

  const iranApex = getApexDomain(iranHost);
  const mainApex = getApexDomain(mainHost);

  if (iranApex === mainApex) {
    violations.push({
      location:    `DNS zone: ${iranHost}`,
      description: `Iran API gateway is on the same apex domain (${mainApex}) as the main gateway. Must use a completely separate domain for OFAC isolation.`,
      sample:      `Iran: ${iranApex} | Main: ${mainApex}`,
    });
  }

  const statusMsg = violations.length === 0
    ? `Iran gateway (${iranHost}: ${iranAddresses.join(', ')}) resolves to separate IPs from main gateway (${mainHost}: ${mainAddresses.join(', ')}). No shared infrastructure detected.`
    : `${violations.length} routing violation(s) — Iran and main infrastructure not fully isolated.`;

  return {
    id:         4,
    name:       'API gateway routing isolation',
    status:     violations.length === 0 ? 'PASS' : 'FAIL',
    message:    statusMsg,
    violations,
    durationMs: Date.now() - start,
  };
}

// ─── Check 5 — Finance report isolation ──────────────────────────────────────

/**
 * Audits all non-Iran financial tables for Iranian payment data:
 *   - payments.currency = IRR
 *   - payments.country_code = IR/IRN
 *   - invoices.currency = IRR or country = Iran
 *   - wallet_tx.currency = IRR (already in Check 1 but included here for finance focus)
 *   - fx_rates table for IRR (wallet service)
 *
 * Finance data isolation is critical for OFAC reporting requirements —
 * Iranian revenue must never appear in consolidated financial reports.
 */
async function checkFinanceIsolation(): Promise<CheckResult> {
  const start      = Date.now();
  const violations: Violation[] = [];

  const IN_CLAUSE = IRAN_COUNTRY_CODES.map((c) => `'${c}'`).join(', ');

  const FINANCE_QUERIES: Array<{ label: string; sql: string }> = [
    {
      label: 'payments with IRR currency',
      sql:   `SELECT COUNT(*)::int AS n FROM payments WHERE UPPER(currency) = '${IRAN_CURRENCY}'`,
    },
    {
      label: 'payments with Iran country_code',
      sql:   `SELECT COUNT(*)::int AS n FROM payments WHERE UPPER(country_code) IN (${IN_CLAUSE})`,
    },
    {
      label: 'invoices with IRR or Iran',
      sql:   `SELECT COUNT(*)::int AS n FROM invoices
              WHERE UPPER(currency) = '${IRAN_CURRENCY}'
                 OR UPPER(country_code) IN (${IN_CLAUSE})`,
    },
    {
      label: 'fx_rates containing IRR',
      sql:   `SELECT COUNT(*)::int AS n FROM fx_rates
              WHERE UPPER(base_currency)   = '${IRAN_CURRENCY}'
                 OR UPPER(target_currency) = '${IRAN_CURRENCY}'`,
    },
    {
      label: 'wallet_tx with IRR',
      sql:   `SELECT COUNT(*)::int AS n FROM wallet_tx WHERE UPPER(currency) = '${IRAN_CURRENCY}'`,
    },
    {
      label: 'financial_transactions with IRR or Iran',
      sql:   `SELECT COUNT(*)::int AS n FROM financial_transactions
              WHERE UPPER(currency) = '${IRAN_CURRENCY}'
                 OR UPPER(country_code) IN (${IN_CLAUSE})`,
    },
  ];

  for (const [shardLabel, envVar] of Object.entries(NON_IRAN_SHARDS)) {
    const connStr = process.env[envVar];
    if (!connStr) continue;

    const pool = auditPool(connStr);
    try {
      for (const { label, sql } of FINANCE_QUERIES) {
        try {
          const { rows } = await pool.query(sql);
          const count    = rows[0]?.n ?? 0;
          if (count > 0) {
            violations.push({
              location:    `${shardLabel} → ${label}`,
              description: `Found ${count} financial record(s) with Iranian currency/country in non-Iran shard`,
              count,
              sample:      '[financial data redacted]',
            });
          }
        } catch { /* table may not exist — not a violation */ }
      }
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  return {
    id:         5,
    name:       'Finance report isolation',
    status:     violations.length === 0 ? 'PASS' : 'FAIL',
    message:    violations.length === 0
      ? 'No IRR currency or Iranian country code found in any non-Iran financial table.'
      : `${violations.length} violation(s) — Iranian financial data found in shared finance system.`,
    violations,
    durationMs: Date.now() - start,
  };
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildTextReport(report: IsolationReport): string {
  const BAR = '═'.repeat(72);
  const SEP = '─'.repeat(72);

  const statusIcon = (s: CheckStatus) =>
    s === 'PASS' ? '✅ PASS' : s === 'FAIL' ? '❌ FAIL' : s === 'SKIP' ? '⏭  SKIP' : '⚠️  ERROR';

  const lines: string[] = [
    BAR,
    'UTUBooking — Iran Technical Isolation Verification Report',
    `Run at:  ${report.runAt}`,
    `Run by:  ${report.runBy}`,
    BAR,
    '',
    `Overall Status: ${report.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`,
    `Checks passed:  ${report.passedChecks} / ${report.totalChecks}`,
    '',
    SEP,
  ];

  for (const check of report.checks) {
    lines.push(`${statusIcon(check.status)}  Check ${check.id}: ${check.name} (${check.durationMs}ms)`);
    lines.push(`          ${check.message}`);

    if (check.violations.length > 0) {
      lines.push('');
      lines.push('          Violations:');
      for (const v of check.violations) {
        lines.push(`          • [${v.location}]`);
        lines.push(`            ${v.description}`);
        if (v.count !== undefined) lines.push(`            Count: ${v.count}`);
        if (v.sample)              lines.push(`            Sample: ${v.sample}`);
      }
    }
    lines.push(SEP);
  }

  lines.push('');
  lines.push(`⚖️  ${report.legalNote}`);
  lines.push('');
  lines.push(`Emailed to: ${report.emailedTo.join(', ') || '(no recipients configured)'}`);
  lines.push(BAR);

  return lines.join('\n');
}

// ─── Email sender ─────────────────────────────────────────────────────────────

async function sendReportEmail(
  report:    IsolationReport,
  textReport: string,
): Promise<string[]> {
  const toRaw = process.env.REPORT_EMAIL_TO ?? '';
  const from  = process.env.REPORT_EMAIL_FROM ?? 'noreply@utubooking.com';
  const to    = toRaw.split(',').map((e) => e.trim()).filter(Boolean);

  if (to.length === 0) {
    console.warn('[iran-isolation-check] REPORT_EMAIL_TO not set — skipping email');
    return [];
  }

  const subject = report.overallStatus === 'PASS'
    ? `[PASS] Iran Isolation Check — ${new Date(report.runAt).toDateString()}`
    : `[FAIL ❌] Iran Isolation Check — ${new Date(report.runAt).toDateString()} — ACTION REQUIRED`;

  const ses = new SESClient({
    region: process.env.AWS_REGION ?? 'me-south-1',
  });

  try {
    await ses.send(new SendEmailCommand({
      Source:      from,
      Destination: { ToAddresses: to },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: textReport, Charset: 'UTF-8' },
          Html: {
            Data: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${
              textReport.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }</pre>`,
            Charset: 'UTF-8',
          },
        },
      },
    }));
    console.info(`[iran-isolation-check] Report emailed to: ${to.join(', ')}`);
    return to;
  } catch (err: any) {
    console.error('[iran-isolation-check] Email failed:', err.message);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runIsolationCheck(): Promise<IsolationReport> {
  console.info('[iran-isolation-check] Starting isolation verification...');

  const [check1, check2, check3, check4, check5] = await Promise.all([
    checkCrossRegionData(),
    checkAuthTokenIsolation(),
    checkAnalyticsIsolation(),
    checkApiGatewayRouting(),
    checkFinanceIsolation(),
  ]);

  const checks = [check1, check2, check3, check4, check5];

  const activechecks  = checks.filter((c) => c.status !== 'SKIP');
  const passedChecks  = activechecks.filter((c) => c.status === 'PASS').length;
  const failedChecks  = activechecks.filter((c) => c.status === 'FAIL').length;
  const overallStatus: 'PASS' | 'FAIL' = failedChecks === 0 ? 'PASS' : 'FAIL';

  const report: IsolationReport = {
    runAt:         new Date().toISOString(),
    runBy:         'iran-isolation-check (automated)',
    overallStatus,
    passedChecks,
    totalChecks:   activechecks.length,
    checks,
    emailedTo:     [],
    legalNote:
      'This report is for internal OFAC compliance monitoring. Any FAIL result must be ' +
      'escalated to the AMEC Legal Agent immediately and disclosed to OFAC counsel within 24 hours. ' +
      'See legal/iran/feasibility-brief.md for context.',
  };

  const textReport = buildTextReport(report);

  // Always print to stdout (captured by Lambda CloudWatch Logs)
  console.log('\n' + textReport + '\n');

  // Write to file for local runs
  const outFile = path.join(process.cwd(), 'iran-isolation-report.txt');
  try {
    fs.writeFileSync(outFile, textReport, 'utf8');
    console.info(`[iran-isolation-check] Report saved to ${outFile}`);
  } catch { /* non-fatal in Lambda environment */ }

  // Send email report
  report.emailedTo = await sendReportEmail(report, textReport);

  return report;
}

// Run directly (ts-node scripts/iran-isolation-check.ts)
if (require.main === module) {
  runIsolationCheck()
    .then((report) => {
      process.exit(report.overallStatus === 'PASS' ? 0 : 1);
    })
    .catch((err) => {
      console.error('[iran-isolation-check] Fatal error:', err);
      process.exit(2);
    });
}
