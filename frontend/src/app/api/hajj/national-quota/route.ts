import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/hajj/national-quota
 *
 * Thin server-side proxy to the national quota adapters.
 * Supported countries: TR (Turkey), ID (Indonesia), PK (Pakistan).
 *
 * Request body:
 *   { countryCode: 'TR' | 'ID' | 'PK', year?: number }
 *
 * Response: QuotaStatus JSON
 *
 * Env vars required (server-side only — all from nationalQuotas.ts):
 *   REDIS_URL          — cache layer
 *   KEMENAG_API_KEY    — required for Indonesia live data (static fallback used if absent)
 *   KEMENAG_API_BASE_URL — optional override for Kemenag sandbox
 *   QUOTA_SERVICE_URL  — optional; if set, proxies to a dedicated backend service
 *                        instead of running adapter logic inline in Next.js
 */

const SUPPORTED = new Set(['TR', 'ID', 'PK']);
const QUOTA_SERVICE_URL = process.env.QUOTA_SERVICE_URL;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { countryCode?: string; year?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const code = (body.countryCode ?? '').toUpperCase();
  if (!SUPPORTED.has(code)) {
    return NextResponse.json(
      { error: `Country '${code}' is not supported. Supported: TR, ID, PK` },
      { status: 422 },
    );
  }

  const year = body.year && Number.isInteger(body.year) ? body.year : new Date().getFullYear();

  // ── Option A: proxy to dedicated backend service ───────────────────────────
  if (QUOTA_SERVICE_URL) {
    try {
      const upstream = await fetch(`${QUOTA_SERVICE_URL}/hajj/national-quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: code, year }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await upstream.json();
      return NextResponse.json(data, { status: upstream.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[national-quota] upstream error:', msg);
      return NextResponse.json({ error: 'Quota service unavailable' }, { status: 503 });
    }
  }

  // ── Option B: run adapter inline ───────────────────────────────────────────
  // Dynamic import so Next.js doesn't bundle Node-only deps (redis, https) into
  // the client bundle. This runs only on the server.
  try {
    const { getNationalQuota } = await import(
      /* webpackIgnore: true */
      '../../../../../../../backend/adapters/hajj/nationalQuotas'
    );
    const quota = await getNationalQuota(code, year);
    if (!quota) {
      return NextResponse.json({ error: 'Quota data unavailable' }, { status: 503 });
    }
    return NextResponse.json(quota);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[national-quota] adapter error:', msg);
    // Return a graceful error so the widget can show a retry button
    return NextResponse.json({ error: 'Failed to fetch quota data', detail: msg }, { status: 503 });
  }
}
