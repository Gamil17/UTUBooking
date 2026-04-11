/**
 * GET /api/admin/crm/contacts         — paginated contact directory
 * GET /api/admin/crm/contacts?search= — search contacts across all deals
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(`${SALES}/api/sales/contacts${qs ? `?${qs}` : ''}`, {
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
