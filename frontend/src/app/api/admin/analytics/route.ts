import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

const endpointMap: Record<string, string> = {
  stats:         'stats',
  'kpi-targets': 'kpi-targets',
  'kpi-summary': 'kpi-targets/summary',
  dashboards:    'dashboards',
  reports:       'reports',
  alerts:        'alerts',
};

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view') ?? 'stats';
  const endpoint = endpointMap[view];
  if (!endpoint) return NextResponse.json({ error: 'INVALID_VIEW' }, { status: 400 });
  const qs = new URLSearchParams(searchParams);
  qs.delete('view');
  const query = qs.toString();
  try {
    const up = await fetch(`${ADMIN}/api/admin/analytics/${endpoint}${query ? '?' + query : ''}`, {
      headers: hdr,
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
