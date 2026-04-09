import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Return 200 regardless to prevent email enumeration
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Forward to auth service for actual token generation and email dispatch.
    // Falls back gracefully if auth service is unavailable — user still sees success message.
    const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    try {
      await fetch(`${authServiceUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Log but don't surface — client always receives success to prevent enumeration
      console.error('[forgot-password] auth service unreachable');
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
