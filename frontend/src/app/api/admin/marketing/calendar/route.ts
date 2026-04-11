/**
 * GET  /api/admin/marketing/calendar  — list calendar entries
 * POST /api/admin/marketing/calendar  — create entry
 *
 * Proxies to admin-service /api/admin/marketing/calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

function adminHeaders() {
  return {
    'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
    'Content-Type':  'application/json',
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const qs = req.nextUrl.searchParams.toString();
  try {
    const upstream = await fetch(
      `${ADMIN_SERVICE}/api/admin/marketing/calendar${qs ? `?${qs}` : ''}`,
      { headers: adminHeaders(), cache: 'no-store', signal: AbortSignal.timeout(10_000) },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const body     = await req.json();
    const upstream = await fetch(`${ADMIN_SERVICE}/api/admin/marketing/calendar`, {
      method:  'POST',
      headers: adminHeaders(),
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
