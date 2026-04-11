/**
 * POST /api/loyalty/redeem
 * Proxies to loyalty service POST /api/v1/loyalty/redeem
 *
 * Requires: Authorization: Bearer <user_jwt>
 * Body:     { rewardId: string }
 * Returns:  { discountSAR, token, rewardName, message }
 */

import { NextRequest, NextResponse } from 'next/server';

const LOYALTY_SVC = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

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
    const upstream = await fetch(`${LOYALTY_SVC}/api/v1/loyalty/redeem`, {
      method:  'POST',
      headers: {
        authorization:  authHeader,
        'content-type': 'application/json',
      },
      body:   JSON.stringify(body),
      cache:  'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'LOYALTY_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
