/**
 * BFF: /api/admin/loyalty/rewards
 *
 * GET  → loyalty service GET /api/admin/loyalty/rewards (paginated list)
 * POST → loyalty service POST /api/admin/loyalty/rewards (create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const LOYALTY_SERVICE = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const qs = req.nextUrl.searchParams.toString();

  try {
    const res = await fetch(
      `${LOYALTY_SERVICE}/api/admin/loyalty/rewards${qs ? `?${qs}` : ''}`,
      { headers: { 'x-admin-secret': adminSecret } },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/loyalty/rewards BFF] GET error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const adminSecret = process.env.ADMIN_SECRET ?? '';

  try {
    const payload = await req.json();
    const res = await fetch(`${LOYALTY_SERVICE}/api/admin/loyalty/rewards`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/loyalty/rewards BFF] POST error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
