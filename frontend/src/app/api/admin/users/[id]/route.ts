/**
 * GET /api/admin/users/[id]
 *
 * BFF proxy → admin service GET /admin/api/users/:id/profile
 *
 * Returns aggregated customer 360 data:
 *   { user, bookings[], loyalty, enquiries[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SVC = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const upstream = await fetch(
      `${ADMIN_SVC}/admin/api/users/${id}/profile`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache:   'no-store',
        signal:  AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => ({}));

  try {
    const upstream = await fetch(
      `${ADMIN_SVC}/admin/api/users/${id}/notes`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type':   'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? '',
        },
        body:   JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
