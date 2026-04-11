/**
 * BFF: GET /api/admin/notifications/incomplete
 * → notification service GET /api/admin/notifications/incomplete-bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, upstreamAdminHeader } from '@/lib/admin-bff-auth';

const NOTIF = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const qs = new URLSearchParams();
  if (searchParams.get('page'))  qs.set('page',  searchParams.get('page')!);
  if (searchParams.get('limit')) qs.set('limit', searchParams.get('limit')!);

  try {
    const res  = await fetch(
      `${NOTIF}/api/admin/notifications/incomplete-bookings?${qs}`,
      { headers: upstreamAdminHeader(), cache: 'no-store' },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/notifications/incomplete BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
