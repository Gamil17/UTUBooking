/**
 * GET  /api/sales/hotel-partners/[id]/activities  — list activity log
 * POST /api/sales/hotel-partners/[id]/activities  — log an activity
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';
const hdr   = (body = false) => ({
  'Authorization': `Bearer ${process.env.SALES_SECRET ?? ''}`,
  ...(body ? { 'Content-Type': 'application/json' } : {}),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(
      `${SALES}/api/sales/hotel-partners/${id}/activities${qs ? `?${qs}` : ''}`,
      { headers: hdr(), cache: 'no-store', signal: AbortSignal.timeout(10_000) },
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const up   = await fetch(`${SALES}/api/sales/hotel-partners/${id}/activities`, {
      method: 'POST', headers: hdr(true), body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
