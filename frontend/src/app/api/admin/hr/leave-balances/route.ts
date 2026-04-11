import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

// POST — seed default balance rows for all active employees for a given year
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const body = await req.json();
    const up   = await fetch(`${ADMIN}/api/admin/hr/leave/balances/seed`, {
      method: 'POST', headers: hdr, body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
