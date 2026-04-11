/**
 * BFF: GET /api/admin/wallet/transactions
 *
 * Proxies to wallet service GET /api/admin/wallet/transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const WALLET_SERVICE = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3010';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const upstream = await fetch(
      `${WALLET_SERVICE}/api/admin/wallet/transactions${qs ? `?${qs}` : ''}`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        signal:  AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'WALLET_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
