/**
 * BFF: GET /api/admin/notifications/email-log
 * → notification service GET /api/admin/notifications/email-log
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, upstreamAdminHeader } from '@/lib/admin-bff-auth';

const NOTIF = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const res  = await fetch(
      `${NOTIF}/api/admin/notifications/email-log${qs ? `?${qs}` : ''}`,
      { headers: upstreamAdminHeader(), cache: 'no-store' },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/notifications/email-log BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
