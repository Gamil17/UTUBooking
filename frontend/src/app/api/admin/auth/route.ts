/**
 * POST /api/admin/auth — validate admin token, set httpOnly cookie
 * GET  /api/admin/auth — verify cookie is valid (used by layout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';

const COOKIE_NAME = 'utu_admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  return process.env.ADMIN_SECRET ?? '';
}

function safeEqual(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false; // lengths differ
  }
}

/** Derive a stable session token from the secret (not the raw secret itself) */
function deriveSessionToken(secret: string): string {
  return createHash('sha256').update(`admin-session:${secret}`).digest('hex');
}

/** POST — exchange the submitted token for a session cookie */
export async function POST(req: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { token?: string };
  if (!body.token || !safeEqual(body.token, secret)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Store a derived token in the cookie — not the raw secret — so cookie
  // interception doesn't directly expose the admin secret.
  const sessionToken = deriveSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  // path:'/' so the cookie is sent to /api/admin/* BFF routes as well as /admin/* pages.
  // The cookie value is a derived token, not the raw secret (see deriveSessionToken).
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   COOKIE_MAX_AGE,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

/** GET — verify the session cookie is still valid */
export async function GET(req: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  const expected = deriveSessionToken(secret);
  if (!safeEqual(cookie, expected)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

/** DELETE — log out (clear cookie) */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
