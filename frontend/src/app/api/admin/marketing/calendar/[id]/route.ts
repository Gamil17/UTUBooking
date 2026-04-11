/**
 * PATCH  /api/admin/marketing/calendar/[id]  — update entry
 * DELETE /api/admin/marketing/calendar/[id]  — remove entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

function adminHeaders(withBody = false) {
  const h: Record<string, string> = {
    'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
  };
  if (withBody) h['Content-Type'] = 'application/json';
  return h;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body     = await req.json();
    const upstream = await fetch(
      `${ADMIN_SERVICE}/api/admin/marketing/calendar/${id}`,
      {
        method:  'PATCH',
        headers: adminHeaders(true),
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const upstream = await fetch(
      `${ADMIN_SERVICE}/api/admin/marketing/calendar/${id}`,
      {
        method:  'DELETE',
        headers: adminHeaders(),
        signal:  AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
