/**
 * GET /api/careers/jobs — public list of active job listings
 *
 * No auth required. Proxies to AUTH_SERVICE /api/jobs.
 * Revalidates every hour so the careers page stays fresh without SSR on every request.
 */

import { NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    const upstream = await fetch(`${AUTH_SERVICE}/api/jobs`, {
      cache:  'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const data = await upstream.json().catch(() => ({ data: [] }));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    // Return empty list so careers page falls back to i18n defaults
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
