/**
 * GET /api/admin/careers/applications
 * Lists all career applications with search, status/position filter, pagination.
 * Proxies to AUTH_SERVICE /api/admin/careers/applications with admin-secret.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const qs = req.nextUrl.searchParams.toString();
  try {
    const upstream = await fetch(
      `${AUTH_SERVICE}/api/admin/careers/applications${qs ? `?${qs}` : ''}`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
