import { NextRequest, NextResponse } from 'next/server';

const HOTEL_SERVICE = process.env.INTERNAL_HOTEL_SERVICE_URL ?? 'http://localhost:3003';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();

  try {
    const upstream = await fetch(`${HOTEL_SERVICE}/api/v1/hotels/search?${qs}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[hotels/search] upstream error:', err);
    return NextResponse.json(
      { error: 'HOTEL_SERVICE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
