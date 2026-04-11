/**
 * BFF: /api/admin/loyalty/rewards/[id]
 *
 * PATCH  → loyalty service PATCH /api/admin/loyalty/rewards/:id
 * DELETE → loyalty service DELETE /api/admin/loyalty/rewards/:id (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const LOYALTY_SERVICE = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

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
    const res = await fetch(`${LOYALTY_SERVICE}/api/admin/loyalty/rewards/${id}`, {
      method:  'PATCH',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/loyalty/rewards/[id] BFF] PATCH error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const adminSecret = process.env.ADMIN_SECRET ?? '';

  try {
    const res = await fetch(`${LOYALTY_SERVICE}/api/admin/loyalty/rewards/${id}`, {
      method:  'DELETE',
      headers: { 'x-admin-secret': adminSecret },
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/loyalty/rewards/[id] BFF] DELETE error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
