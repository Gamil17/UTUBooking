/**
 * BFF: GET /api/admin/platform-stats
 * → admin service GET /admin/api/stats
 *
 * Returns: { users, pending, hotels, flights, cars, revenue }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SVC = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const adminHeader = () => ({ 'x-admin-secret': process.env.ADMIN_SECRET ?? '' });

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/stats`, {
      headers: adminHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/platform-stats BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
