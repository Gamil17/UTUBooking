/**
 * PATCH /api/admin/contact/enquiries/[id]
 *
 * Full enquiry update: status, adminNotes, assignedTo, priority, dueAt
 * Proxies to auth service PATCH /api/admin/contact/enquiries/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

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
      `${AUTH_SERVICE}/api/admin/contact/enquiries/${id}`,
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
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
