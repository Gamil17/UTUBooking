/**
 * BFF: GET /api/admin/pending-users
 * → admin service GET /admin/api/pending-users
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SVC = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const adminHeader = () => ({ 'x-admin-secret': process.env.ADMIN_SECRET ?? '' });

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  if (searchParams.get('limit'))  params.set('limit',  searchParams.get('limit')!);
  if (searchParams.get('offset')) params.set('offset', searchParams.get('offset')!);

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/pending-users?${params}`, {
      headers: adminHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/pending-users BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
