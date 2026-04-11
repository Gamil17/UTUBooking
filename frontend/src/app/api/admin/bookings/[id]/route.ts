/**
 * BFF: GET  /api/admin/bookings/[id]   → booking detail
 *       PATCH /api/admin/bookings/[id]  → update status { status: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const BOOKING_SVC = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3006';
const adminHeader = (extra: Record<string, string> = {}) => ({
  'x-admin-secret': process.env.ADMIN_SECRET ?? '',
  ...extra,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res  = await fetch(`${BOOKING_SVC}/api/admin/bookings/${id}`, {
      headers: adminHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/bookings/:id GET BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id }   = await params;
  const payload  = await req.json().catch(() => ({}));

  try {
    const res  = await fetch(`${BOOKING_SVC}/api/admin/bookings/${id}/status`, {
      method:  'PATCH',
      headers: adminHeader({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/bookings/:id PATCH BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
