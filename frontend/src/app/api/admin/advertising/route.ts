import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr = { Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}` };

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view') ?? 'enquiries';

  try {
    if (view === 'stats') {
      const r = await fetch(`${ADMIN_SERVICE}/api/admin/advertising/stats`, {
        headers: hdr, cache: 'no-store', signal: AbortSignal.timeout(8_000),
      });
      if (!r.ok) throw new Error('upstream stats failed');
      return NextResponse.json(await r.json());
    }

    // enquiries list
    const qs = new URLSearchParams();
    for (const key of ['status', 'company_type', 'region', 'goal', 'search', 'limit', 'offset']) {
      const v = searchParams.get(key);
      if (v) qs.set(key, v);
    }

    const r = await fetch(`${ADMIN_SERVICE}/api/admin/advertising/enquiries?${qs}`, {
      headers: hdr, cache: 'no-store', signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) throw new Error('upstream enquiries failed');
    return NextResponse.json(await r.json());
  } catch (err) {
    console.error('[admin/advertising] GET error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
