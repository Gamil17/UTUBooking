/**
 * POST /api/user/ccpa/delete
 * Proxies to backend auth service CCPA router.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const AUTH_SERVICE = process.env.INTERNAL_AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const auth = headersList.get('authorization') ?? req.headers.get('authorization') ?? '';

  try {
    const res = await fetch(`${AUTH_SERVICE}/api/user/ccpa/delete`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   auth,
        'x-forwarded-for': req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '',
      },
      body:   JSON.stringify(await req.json().catch(() => ({}))),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
