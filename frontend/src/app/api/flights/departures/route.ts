import { NextRequest, NextResponse } from 'next/server';

const FLIGHT_SERVICE = process.env.INTERNAL_FLIGHT_SERVICE_URL ?? 'http://flight-service:3004';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();

  try {
    const upstream = await fetch(`${FLIGHT_SERVICE}/api/v1/flights/departures?${qs}`, {
      cache: 'no-store',
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'FLIGHT_SERVICE_UNAVAILABLE', message: (err as Error).message },
      { status: 503 },
    );
  }
}
