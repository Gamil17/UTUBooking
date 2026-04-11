/**
 * BFF: GET /api/admin/country-admins  → list country admins
 *       POST /api/admin/country-admins → assign country admin
 * → admin service GET/POST /admin/api/country-admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SVC = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const adminHeader = (extra: Record<string, string> = {}) => ({
  'x-admin-secret': process.env.ADMIN_SECRET ?? '',
  ...extra,
});

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/country-admins`, {
      headers: adminHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/country-admins GET BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/country-admins`, {
      method:  'POST',
      headers: adminHeader({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/country-admins POST BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
