/**
 * GET /api/admin/marketing/timeline?month=YYYY-MM&page=&limit=
 * Unified content calendar + campaigns timeline.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(`${ADMIN}/api/admin/marketing/timeline${qs ? `?${qs}` : ''}`, {
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      cache:   'no-store',
      signal:  AbortSignal.timeout(12_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
