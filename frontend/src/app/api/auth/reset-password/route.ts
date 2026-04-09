import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token?.trim() || !password?.trim()) {
      return NextResponse.json({ message: 'Token and password are required.' }, { status: 400 });
    }

    const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    const upstream = await fetch(`${authServiceUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), password }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
