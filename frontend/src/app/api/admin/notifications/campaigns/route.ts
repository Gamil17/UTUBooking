/**
 * BFF: /api/admin/notifications/campaigns
 *
 * GET  → notification service GET /api/admin/notifications/campaigns
 * POST → notification service POST /api/admin/notifications/campaigns
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
      `${NOTIF}/api/admin/notifications/campaigns${qs ? `?${qs}` : ''}`,
      { headers: upstreamAdminHeader(), cache: 'no-store' },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/notifications/campaigns BFF] GET error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const res = await fetch(`${NOTIF}/api/admin/notifications/campaigns`, {
      method:  'POST',
      headers: { ...upstreamAdminHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/notifications/campaigns BFF] POST error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
