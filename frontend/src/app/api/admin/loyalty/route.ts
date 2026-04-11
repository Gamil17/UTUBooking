/**
 * BFF: /api/admin/loyalty
 *
 * GET ?view=stats   → loyalty service GET /api/admin/loyalty/stats
 * GET ?view=members → loyalty service GET /api/admin/loyalty/members (+ passthrough params)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const LOYALTY_SERVICE = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view') ?? 'stats';

  const adminSecret = process.env.ADMIN_SECRET ?? '';

  try {
    let upstreamUrl: string;
    if (view === 'members') {
      const qs = new URLSearchParams();
      for (const [k, v] of searchParams.entries()) {
        if (k !== 'view') qs.set(k, v);
      }
      upstreamUrl = `${LOYALTY_SERVICE}/api/admin/loyalty/members?${qs.toString()}`;
    } else {
      upstreamUrl = `${LOYALTY_SERVICE}/api/admin/loyalty/stats`;
    }

    const res = await fetch(upstreamUrl, {
      headers: { 'x-admin-secret': adminSecret },
    });

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/loyalty BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
