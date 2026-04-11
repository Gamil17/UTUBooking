/**
 * PATCH  /api/admin/promo-codes/[id] — update promo code fields
 * DELETE /api/admin/promo-codes/[id] — soft-delete (is_active = false)
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
  try {
    const body = await req.json();
    const upstream = await fetch(`${AUTH_SERVICE}/api/admin/promos/${id}`, {
      method:  'PATCH',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET ?? '',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
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
    const upstream = await fetch(`${AUTH_SERVICE}/api/admin/promos/${id}`, {
      method:  'DELETE',
      headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
      signal:  AbortSignal.timeout(10_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
