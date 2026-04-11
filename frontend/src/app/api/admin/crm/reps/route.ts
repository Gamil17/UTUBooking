/**
 * GET  /api/admin/crm/reps — list all sales reps with their quotas
 * POST /api/admin/crm/reps — create a sales rep
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';
const hdr   = (body = false) => ({
  'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
  ...(body ? { 'Content-Type': 'application/json' } : {}),
});

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${SALES}/api/sales/reps`,
      { headers: hdr(), cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const body = await req.json();
    const up   = await fetch(`${SALES}/api/sales/reps`,
      { method: 'POST', headers: hdr(true), body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
