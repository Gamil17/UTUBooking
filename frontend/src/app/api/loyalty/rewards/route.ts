/**
 * GET /api/loyalty/rewards
 * Proxies to loyalty service GET /api/v1/loyalty/rewards
 *
 * Requires: Authorization: Bearer <user_jwt>
 * Forwards: ?page=&limit=&type=
 * Returns:  { count, page, limit, results: LoyaltyReward[] }
 */

import { NextRequest, NextResponse } from 'next/server';

const LOYALTY_SVC = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();

  try {
    const upstream = await fetch(
      `${LOYALTY_SVC}/api/v1/loyalty/rewards${qs ? `?${qs}` : ''}`,
      {
        headers: { authorization: authHeader },
        cache:   'no-store',
        signal:  AbortSignal.timeout(8_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'LOYALTY_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
