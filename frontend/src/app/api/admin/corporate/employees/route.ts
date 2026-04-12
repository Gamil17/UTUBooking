import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/** GET /api/admin/corporate/employees — list employees (account_id optional) */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  ['account_id','status','department','search','page','limit'].forEach(k => {
    const v = searchParams.get(k); if (v) qs.set(k, v);
  });

  try {
    const up = await fetch(
      `${ADMIN}/api/admin/corporate/employees?${qs}`,
      { headers: hdr, signal: AbortSignal.timeout(10_000) }
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

/** PATCH /api/admin/corporate/employees — update employee (id in body) */
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const { id, ...data } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });

    const up = await fetch(
      `${ADMIN}/api/admin/corporate/employees/${id}`,
      { method: 'PATCH', headers: hdr, body: JSON.stringify(data), signal: AbortSignal.timeout(10_000) }
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
