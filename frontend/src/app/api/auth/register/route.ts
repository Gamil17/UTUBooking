import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const upstream = await fetch(`${AUTH_SERVICE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => ({}));

    const res = NextResponse.json(data, { status: upstream.status });

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.headers.append('Set-Cookie', value);
      }
    });

    return res;
  } catch {
    return NextResponse.json(
      { message: 'Auth service unavailable. Please try again later.' },
      { status: 503 }
    );
  }
}
