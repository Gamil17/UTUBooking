/**
 * PATCH /api/admin/contact/enquiries/[id]/status
 * → auth service PATCH /api/admin/contact/enquiries/:id/status
 *
 * Body: { status: 'new' | 'read' | 'replied', adminNotes?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const adminSecret = process.env.ADMIN_SECRET ?? '';

  try {
    const payload = await req.json();
    const upstream = await fetch(
      `${AUTH_SERVICE}/api/admin/contact/enquiries/${id}/status`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type':   'application/json',
          'x-admin-secret': adminSecret,
        },
        body:   JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
