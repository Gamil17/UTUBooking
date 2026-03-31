/**
 * POST /api/admin/auth — validate admin token, set httpOnly cookie
 * GET  /api/admin/auth — verify cookie is valid (used by layout)
 */

import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'utu_admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  return process.env.ADMIN_SECRET ?? '';
}

/** POST — exchange the submitted token for a session cookie */
export async function POST(req: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { token?: string };
  if (!body.token || body.token !== secret) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, secret, {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/admin',
    maxAge:   COOKIE_MAX_AGE,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

/** GET — verify the session cookie is still valid */
export async function GET(req: NextRequest) {
  const secret = getSecret();
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  if (!secret || cookie !== secret) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

/** DELETE — log out (clear cookie) */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/admin' });
  return res;
}
