/**
 * BFF: GET  /api/admin/tenants   → list tenants (?search=&limit=&offset=)
 *       POST /api/admin/tenants  → create tenant
 * → whitelabel service /api/admin/tenants
 *
 * Note: whitelabel service uses Authorization: Bearer <ADMIN_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const WL_SVC     = process.env.WHITELABEL_SERVICE_URL ?? 'http://localhost:3009';
const bearerHeader = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
  ...extra,
});

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  ['search', 'limit', 'offset'].forEach((k) => {
    const v = searchParams.get(k);
    if (v) params.set(k, v);
  });

  try {
    const res  = await fetch(`${WL_SVC}/api/admin/tenants?${params}`, {
      headers: bearerHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/tenants GET BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));

  try {
    const res  = await fetch(`${WL_SVC}/api/admin/tenants`, {
      method:  'POST',
      headers: bearerHeader({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/tenants POST BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
