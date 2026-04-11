/**
 * BFF: /api/admin/pricing
 *
 * GET ?view=recommendations&status=&page= → pricing service GET /pricing/recommendations
 * GET ?view=revpar&market=&period=        → pricing service GET /pricing/metrics/revpar
 * GET ?view=funnel&period=               → pricing service GET /pricing/metrics/funnel
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, upstreamAdminHeader } from '@/lib/admin-bff-auth';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:80/api/v1';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const view   = searchParams.get('view') ?? 'recommendations';
  const headers = upstreamAdminHeader();

  try {
    let upstreamUrl: string;

    if (view === 'revpar') {
      const qs = new URLSearchParams();
      if (searchParams.get('market')) qs.set('market', searchParams.get('market')!);
      if (searchParams.get('period')) qs.set('period', searchParams.get('period')!);
      upstreamUrl = `${API_URL}/pricing/metrics/revpar?${qs}`;
    } else if (view === 'funnel') {
      const qs = new URLSearchParams();
      if (searchParams.get('period')) qs.set('period', searchParams.get('period')!);
      upstreamUrl = `${API_URL}/pricing/metrics/funnel?${qs}`;
    } else {
      const qs = new URLSearchParams();
      if (searchParams.get('status')) qs.set('status', searchParams.get('status')!);
      if (searchParams.get('page'))   qs.set('page',   searchParams.get('page')!);
      upstreamUrl = `${API_URL}/pricing/recommendations?${qs}`;
    }

    const res  = await fetch(upstreamUrl, { headers, cache: 'no-store' });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/pricing BFF] GET error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
