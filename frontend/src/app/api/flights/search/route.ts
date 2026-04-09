import { NextRequest, NextResponse } from 'next/server';

const FLIGHT_SERVICE = process.env.INTERNAL_FLIGHT_SERVICE_URL ?? 'http://localhost:3004';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();

  try {
    const upstream = await fetch(`${FLIGHT_SERVICE}/api/v1/flights/search?${qs}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[flights/search] upstream error:', err);
    return NextResponse.json(
      { error: 'FLIGHT_SERVICE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
