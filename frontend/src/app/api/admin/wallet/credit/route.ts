/**
 * BFF: POST /api/admin/wallet/credit
 *
 * Manually credit a user's wallet.
 * Body: { userId, currency, amount, note? }
 *
 * Proxies to wallet service POST /api/admin/wallet/credit
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const WALLET_SERVICE = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3010';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const upstream = await fetch(`${WALLET_SERVICE}/api/admin/wallet/credit`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET ?? '',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'WALLET_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
