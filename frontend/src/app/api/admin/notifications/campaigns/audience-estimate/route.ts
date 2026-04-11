/**
 * GET /api/admin/notifications/campaigns/audience-estimate?segment=<JSON>
 * Returns estimated recipient count for a target segment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const NOTIFY = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const qs = req.nextUrl.searchParams.toString();
  try {
    const up = await fetch(`${NOTIFY}/api/admin/notifications/campaigns/audience-estimate${qs ? `?${qs}` : ''}`, {
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
