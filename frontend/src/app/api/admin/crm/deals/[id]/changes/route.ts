/**
 * GET /api/admin/crm/deals/[id]/changes — field-level audit trail for a deal
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';
const hdr   = () => ({ 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` });

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(`${SALES}/api/sales/deals/${id}/changes${qs ? `?${qs}` : ''}`,
      { headers: hdr(), cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
