/**
 * BFF: GET   /api/admin/tenants/[id]  → get tenant detail
 *       PATCH /api/admin/tenants/[id] → update tenant fields
 * → whitelabel service /api/admin/tenants/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const WL_SVC       = process.env.WHITELABEL_SERVICE_URL ?? 'http://localhost:3009';
const bearerHeader = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
  ...extra,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res  = await fetch(`${WL_SVC}/api/admin/tenants/${id}`, {
      headers: bearerHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/tenants/:id GET BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id }  = await params;
  const payload = await req.json().catch(() => ({}));

  try {
    const res  = await fetch(`${WL_SVC}/api/admin/tenants/${id}`, {
      method:  'PATCH',
      headers: bearerHeader({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/tenants/:id PATCH BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
