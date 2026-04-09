/**
 * GET /api/admin/infrastructure/health
 *
 * Multi-region infrastructure health check for UTUBooking admin dashboard.
 * Pings each regional API node and reports latency, status, and shard DB info.
 *
 * Returns:
 *   - ping latency to all active AWS regions
 *   - DB connection status per region (via backend /health endpoint)
 *   - Redis cache status per region
 *   - Active connection counts
 *   - Overall system status (healthy | degraded | outage)
 *
 * Secured: admin JWT required (x-admin-token header or Authorization Bearer)
 *
 * Env vars:
 *   API_URL_GULF      — https://api.utubooking.com         (me-south-1 Bahrain)
 *   API_URL_LONDON    — https://api-uk.utubooking.com       (eu-west-2)
 *   API_URL_FRANKFURT — https://api-eu.utubooking.com       (eu-central-1)
 *   API_URL_US_EAST   — https://api-us.utubooking.com       (us-east-1)
 *   API_URL_MONTREAL  — https://api-ca.utubooking.com       (ca-central-1)
 *   API_URL_SAO_PAULO — https://api-latam.utubooking.com    (sa-east-1)
 *   API_URL_SINGAPORE — https://api-apac.utubooking.com     (ap-southeast-1)
 *   API_URL_MUMBAI    — https://api-sa.utubooking.com       (ap-south-1)
 *   ADMIN_API_SECRET  — shared secret for admin endpoint auth
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Region definitions ────────────────────────────────────────────────────────

interface Region {
  id:           string;
  label:        string;
  awsRegion:    string;
  jurisdiction: string;
  markets:      string[];
  envVar:       string;
  /** Fallback URL for local dev / when env var not set */
  devFallback:  string;
}

const REGIONS: Region[] = [
  {
    id:           'gulf',
    label:        'Gulf (Bahrain)',
    awsRegion:    'me-south-1',
    jurisdiction: 'SAMA-KSA',
    markets:      ['SA', 'AE', 'KW', 'JO', 'BH', 'MA', 'TN', 'OM', 'QA'],
    envVar:       'API_URL_GULF',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'london',
    label:        'London (UK)',
    awsRegion:    'eu-west-2',
    jurisdiction: 'UK-GDPR',
    markets:      ['GB'],
    envVar:       'API_URL_LONDON',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'frankfurt',
    label:        'Frankfurt (EU)',
    awsRegion:    'eu-central-1',
    jurisdiction: 'GDPR-EU',
    markets:      ['DE', 'FR', 'NL', 'IT', 'ES', 'BE', 'PL', 'CH', 'AT', 'TR'],
    envVar:       'API_URL_FRANKFURT',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'virginia',
    label:        'Virginia (US)',
    awsRegion:    'us-east-1',
    jurisdiction: 'CCPA',
    markets:      ['US'],
    envVar:       'API_URL_US_EAST',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'montreal',
    label:        'Montreal (Canada)',
    awsRegion:    'ca-central-1',
    jurisdiction: 'PIPEDA',
    markets:      ['CA'],
    envVar:       'API_URL_MONTREAL',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'sao_paulo',
    label:        'São Paulo (Brazil)',
    awsRegion:    'sa-east-1',
    jurisdiction: 'LGPD',
    markets:      ['BR', 'AR', 'CO', 'CL', 'PE', 'UY', 'MX'],
    envVar:       'API_URL_SAO_PAULO',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'singapore',
    label:        'Singapore (APAC)',
    awsRegion:    'ap-southeast-1',
    jurisdiction: 'PDPA-SG',
    markets:      ['ID', 'MY', 'SG', 'TH', 'PH'],
    envVar:       'API_URL_SINGAPORE',
    devFallback:  'http://localhost:3001',
  },
  {
    id:           'mumbai',
    label:        'Mumbai (South Asia)',
    awsRegion:    'ap-south-1',
    jurisdiction: 'DPDP-IN',
    markets:      ['IN', 'PK', 'BD'],
    envVar:       'API_URL_MUMBAI',
    devFallback:  'http://localhost:3001',
  },
];

const PROBE_TIMEOUT_MS = 5_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegionHealth {
  id:           string;
  label:        string;
  awsRegion:    string;
  jurisdiction: string;
  markets:      string[];
  status:       'healthy' | 'degraded' | 'unreachable';
  latencyMs:    number | null;
  db:           { status: 'ok' | 'error' | 'unknown'; message?: string };
  redis:        { status: 'ok' | 'error' | 'unknown'; hitRatePercent?: number };
  connections:  { active: number | null; max: number | null };
  checkedAt:    string;
}

interface HealthResponse {
  overall:      'healthy' | 'degraded' | 'outage';
  checkedAt:    string;
  regions:      RegionHealth[];
  summary: {
    totalRegions:   number;
    healthy:        number;
    degraded:       number;
    unreachable:    number;
  };
}

// ── Probe a single region ─────────────────────────────────────────────────────

async function probeRegion(region: Region): Promise<RegionHealth> {
  const baseUrl = process.env[region.envVar] ?? region.devFallback;
  const start   = Date.now();
  const now     = new Date().toISOString();

  const base: RegionHealth = {
    id:           region.id,
    label:        region.label,
    awsRegion:    region.awsRegion,
    jurisdiction: region.jurisdiction,
    markets:      region.markets,
    status:       'unreachable',
    latencyMs:    null,
    db:           { status: 'unknown' },
    redis:        { status: 'unknown' },
    connections:  { active: null, max: null },
    checkedAt:    now,
  };

  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const res = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
      headers: { 'x-internal-probe': 'admin-health-check' },
    });

    clearTimeout(timer);

    const latency = Date.now() - start;
    base.latencyMs = latency;

    if (!res.ok) {
      base.status = 'degraded';
      return base;
    }

    const data = await res.json() as {
      status?:      string;
      db?:          { status?: string; connections?: { active?: number; max?: number }; message?: string };
      redis?:       { status?: string; hitRatePercent?: number };
    };

    base.db    = {
      status:  (data.db?.status === 'ok') ? 'ok' : (data.db?.status === 'error' ? 'error' : 'unknown'),
      message: data.db?.message,
    };
    base.redis = {
      status:          (data.redis?.status === 'ok') ? 'ok' : (data.redis?.status === 'error' ? 'error' : 'unknown'),
      hitRatePercent:  data.redis?.hitRatePercent,
    };
    base.connections = {
      active: data.db?.connections?.active ?? null,
      max:    data.db?.connections?.max    ?? null,
    };

    // Determine status
    const dbOk    = base.db.status    === 'ok';
    const redisOk = base.redis.status === 'ok' || base.redis.status === 'unknown';

    if (dbOk && redisOk && latency < 3000) {
      base.status = 'healthy';
    } else if (dbOk) {
      base.status = 'degraded';   // Redis issue or high latency
    } else {
      base.status = 'degraded';   // DB issue
    }

  } catch {
    base.latencyMs = Date.now() - start;
    base.status    = 'unreachable';
  }

  return base;
}

// ── Admin auth check ─────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_API_SECRET;

  // Skip auth in dev when no secret is set
  if (!adminSecret) return process.env.NODE_ENV !== 'production';

  const authHeader = req.headers.get('authorization') ?? '';
  const tokenHeader = req.headers.get('x-admin-token') ?? '';

  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return bearer === adminSecret || tokenHeader === adminSecret;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Probe all regions in parallel
  const results = await Promise.all(REGIONS.map(probeRegion));

  const healthy     = results.filter(r => r.status === 'healthy').length;
  const degraded    = results.filter(r => r.status === 'degraded').length;
  const unreachable = results.filter(r => r.status === 'unreachable').length;

  let overall: HealthResponse['overall'];
  if (unreachable > 0 || degraded > 2) {
    overall = unreachable >= REGIONS.length / 2 ? 'outage' : 'degraded';
  } else if (degraded > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  const body: HealthResponse = {
    overall,
    checkedAt: new Date().toISOString(),
    regions:   results,
    summary: {
      totalRegions: REGIONS.length,
      healthy,
      degraded,
      unreachable,
    },
  };

  const httpStatus = overall === 'outage' ? 503 : overall === 'degraded' ? 207 : 200;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Checked-Regions': String(REGIONS.length),
    },
  });
}
