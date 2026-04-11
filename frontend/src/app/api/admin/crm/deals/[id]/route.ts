/**
 * GET    /api/sales/deals/[id]  — single deal + contacts + activities
 * PATCH  /api/sales/deals/[id]  — update
 * DELETE /api/sales/deals/[id]  — delete
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';
const hdr   = (body = false) => ({
  'Authorization': `Bearer ${process.env.SALES_SECRET ?? ''}`,
  ...(body ? { 'Content-Type': 'application/json' } : {}),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const up = await fetch(`${SALES}/api/sales/deals/${id}`,
      { headers: hdr(), cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const up   = await fetch(`${SALES}/api/sales/deals/${id}`,
      { method: 'PATCH', headers: hdr(true), body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const up = await fetch(`${SALES}/api/sales/deals/${id}`,
      { method: 'DELETE', headers: hdr(), signal: AbortSignal.timeout(10_000) });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
