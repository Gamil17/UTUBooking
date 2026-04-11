/**
 * BFF: DELETE /api/admin/notifications/campaigns/[id]
 * → notification service DELETE /api/admin/notifications/campaigns/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, upstreamAdminHeader } from '@/lib/admin-bff-auth';

const NOTIF = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res  = await fetch(`${NOTIF}/api/admin/notifications/campaigns/${id}`, {
      method:  'DELETE',
      headers: upstreamAdminHeader(),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/notifications/campaigns/[id] BFF] DELETE error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
