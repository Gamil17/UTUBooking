/**
 * GET /api/loyalty/status — returns the logged-in user's loyalty account
 *
 * Forwards the user's JWT (Authorization header) to the loyalty service.
 * Returns 401 if no token is present. The client (LoyaltyStatusWidget)
 * reads the token from sessionStorage and attaches it as a Bearer header.
 */

import { NextRequest, NextResponse } from 'next/server';

const LOYALTY_SERVICE = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${LOYALTY_SERVICE}/api/v1/loyalty/account`, {
      headers: { authorization: authHeader },
      cache:   'no-store',
      signal:  AbortSignal.timeout(8_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'LOYALTY_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
