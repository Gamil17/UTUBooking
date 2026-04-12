/**
 * POST /api/pro/account/password
 *
 * Allows an authenticated corporate portal user to change their password.
 * Verifies the portal JWT, then forwards the request to the auth service
 * (POST /api/auth/change-password) with the user's own Bearer token so the
 * auth service can verify the current password and apply the update.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const AUTH = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));

    // Forward the request to the auth service using the user's own Bearer token
    // so the auth service can verify the current password against their account.
    const authHeader = req.headers.get('authorization') ?? '';
    const up = await fetch(`${AUTH}/api/auth/change-password`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': authHeader,
      },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    });

    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
