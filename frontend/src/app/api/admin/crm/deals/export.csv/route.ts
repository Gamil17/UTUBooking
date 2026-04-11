/**
 * GET /api/sales/deals/export.csv  — proxy CSV download
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${SALES}/api/sales/deals/export.csv`, {
      headers: { 'Authorization': `Bearer ${process.env.SALES_SECRET ?? ''}` },
      signal: AbortSignal.timeout(15_000),
    });
    const csv = await up.text();
    return new NextResponse(csv, {
      status: up.status,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': up.headers.get('Content-Disposition') ?? 'attachment; filename="crm-deals.csv"',
      },
    });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
