/**
 * GET /api/wallet/balance
 * Proxies to wallet service GET /api/v1/wallet/balance
 * Returns: { userId, wallets: [{ id, currency, balance }] }
 */

import { NextRequest, NextResponse } from 'next/server';

const WALLET_SVC = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3010';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${WALLET_SVC}/api/v1/wallet/balance`, {
      headers: { authorization: authHeader },
      cache:   'no-store',
      signal:  AbortSignal.timeout(8_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'WALLET_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
