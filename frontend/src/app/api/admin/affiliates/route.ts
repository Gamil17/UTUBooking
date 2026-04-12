/**
 * BFF: /api/admin/affiliates
 * ?view=stats
 * ?view=applications&status=&platform=&search=&page=&limit=
 * ?view=partners&tier=&status=&platform=&search=&page=&limit=
 * ?view=payouts&partner_id=&status=&page=&limit=
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` };

const endpointMap: Record<string, string> = {
  stats:        'stats',
  applications: 'applications',
  partners:     'partners',
  payouts:      'payouts',
};

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view') ?? 'stats';

  const qs = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== 'view') qs.set(k, v);
  }
  const suffix   = qs.toString() ? `?${qs.toString()}` : '';
  const endpoint = endpointMap[view] ?? 'stats';

  try {
    const up = await fetch(`${ADMIN}/api/admin/affiliates/${endpoint}${suffix}`, {
      headers: hdr, cache: 'no-store', signal: AbortSignal.timeout(12_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
