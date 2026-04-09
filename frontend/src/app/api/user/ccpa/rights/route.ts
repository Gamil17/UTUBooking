/**
 * GET /api/user/ccpa/rights
 * Proxies to backend auth service CCPA router.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const AUTH_SERVICE = process.env.INTERNAL_AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const headersList = await headers();
  const auth = headersList.get('authorization') ?? req.headers.get('authorization') ?? '';

  try {
    const res = await fetch(`${AUTH_SERVICE}/api/user/ccpa/rights`, {
      method:  'GET',
      headers: { 'Authorization': auth },
      signal:  AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
