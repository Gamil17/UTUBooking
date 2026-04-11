/**
 * GET /api/sales/overdue — deals with past-due next_action_date
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(`${SALES}/api/sales/overdue${qs ? `?${qs}` : ''}`, {
      headers: { 'Authorization': `Bearer ${process.env.SALES_SECRET ?? ''}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
