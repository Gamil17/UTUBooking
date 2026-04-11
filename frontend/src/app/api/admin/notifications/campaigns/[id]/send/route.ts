/**
 * BFF: POST /api/admin/notifications/campaigns/[id]/send
 * → notification service POST /api/admin/notifications/campaigns/:id/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, upstreamAdminHeader } from '@/lib/admin-bff-auth';

const NOTIF = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await fetch(`${NOTIF}/api/admin/notifications/campaigns/${id}/send`, {
      method:  'POST',
      headers: { ...upstreamAdminHeader(), 'Content-Type': 'application/json' },
      body:    '{}',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/notifications/campaigns/send BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
