/**
 * GET /api/admin/marketing/consent?email=&country=&status=granted|revoked|all&page=&limit=
 * Read-only view of marketing consent log.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(`${ADMIN}/api/admin/marketing/consent${qs ? `?${qs}` : ''}`, {
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
