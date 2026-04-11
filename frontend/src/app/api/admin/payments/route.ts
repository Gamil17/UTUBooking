/**
 * GET /api/admin/payments
 *
 * BFF proxy → payment service /api/admin/payments
 *
 * Forwards all query params unchanged, so the backend can handle:
 *   ?view=stats               — aggregate stat cards + gateway failures
 *   ?status=failed&page=2     — filterable paginated payment list
 *
 * Auth: utu_admin_token cookie (SHA256 of ADMIN_SECRET) or Bearer header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3007';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const upstream = await fetch(
      `${PAYMENT_SERVICE}/api/admin/payments${qs ? `?${qs}` : ''}`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache:   'no-store',
        signal:  AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'PAYMENT_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
