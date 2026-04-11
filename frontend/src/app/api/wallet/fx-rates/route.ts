/**
 * GET /api/wallet/fx-rates
 * Public — no auth required.
 * Proxies to wallet service GET /api/v1/wallet/fx-rates
 * Returns: { rates: { [currency]: { [toCurrency]: rate } }, cachedAt }
 * Cache: 15 minutes (matches upstream Cache-Control)
 */

import { NextResponse } from 'next/server';

const WALLET_SVC = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3010';

export async function GET() {
  try {
    const upstream = await fetch(`${WALLET_SVC}/api/v1/wallet/fx-rates`, {
      next:   { revalidate: 900 }, // 15 min — matches upstream cache header
      signal: AbortSignal.timeout(8_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, {
      status:  upstream.status,
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'WALLET_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
