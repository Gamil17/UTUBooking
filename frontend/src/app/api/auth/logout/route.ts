import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    // Forward the refresh-token cookie so the auth service can invalidate it
    const cookie = req.headers.get('cookie') || '';

    const upstream = await fetch(`${AUTH_SERVICE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });

    // Clear the auth cookies regardless of upstream response
    res.cookies.set('access_token',  '', { maxAge: 0, path: '/' });
    res.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });

    // Forward any Set-Cookie from auth service (e.g. explicit cookie clears)
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.headers.append('Set-Cookie', value);
      }
    });

    return res;
  } catch {
    // Even if the auth service is unreachable, clear cookies client-side
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set('access_token',  '', { maxAge: 0, path: '/' });
    res.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
    return res;
  }
}
