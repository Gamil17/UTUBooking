import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/** GET /api/admin/corporate/trip-groups — list all trip groups (account_id optional) */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  ['account_id','status','page','limit'].forEach(k => {
    const v = searchParams.get(k); if (v) qs.set(k, v);
  });

  try {
    const up = await fetch(
      `${ADMIN}/api/admin/corporate/trip-groups?${qs}`,
      { headers: hdr, signal: AbortSignal.timeout(10_000) }
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
