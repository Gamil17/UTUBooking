/**
 * GET /api/admin/users — list platform users with search, status filter, pagination
 *
 * Proxies to AUTH_SERVICE_URL/api/admin/users with admin-secret forwarding.
 * Auth: checks utu_admin_token cookie OR Authorization: Bearer <ADMIN_SECRET>.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const AUTH_SERVICE  = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();

  try {
    const upstream = await fetch(
      `${AUTH_SERVICE}/api/admin/users${qs ? `?${qs}` : ''}`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
