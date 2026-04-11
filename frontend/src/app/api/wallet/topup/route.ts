/**
 * POST /api/wallet/topup
 * Proxies to wallet service POST /api/v1/wallet/topup
 * Body:    { currency: string, amount: number }
 * Returns: { walletId, currency, amount, newBalance }
 */

import { NextRequest, NextResponse } from 'next/server';

const WALLET_SVC = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3010';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${WALLET_SVC}/api/v1/wallet/topup`, {
      method:  'POST',
      headers: { authorization: authHeader, 'content-type': 'application/json' },
      body:    JSON.stringify(body),
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'WALLET_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
