/**
 * BFF: GET /api/admin/tenants/[id]/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 * → whitelabel service GET /api/admin/tenants/:id/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const WL_SVC       = process.env.WHITELABEL_SERVICE_URL ?? 'http://localhost:3009';
const bearerHeader = () => ({
  Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to params required' }, { status: 400 });
  }

  try {
    const res  = await fetch(
      `${WL_SVC}/api/admin/tenants/${id}/analytics?from=${from}&to=${to}`,
      { headers: bearerHeader(), cache: 'no-store' },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/tenants/:id/analytics BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
