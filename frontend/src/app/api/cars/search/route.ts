import { NextRequest, NextResponse } from 'next/server';

const CAR_SERVICE = process.env.INTERNAL_CAR_SERVICE_URL ?? 'http://car-service:3005';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();

  try {
    const upstream = await fetch(`${CAR_SERVICE}/api/v1/cars/search?${qs}`, {
      cache: 'no-store',
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'CAR_SERVICE_UNAVAILABLE', message: (err as Error).message },
      { status: 503 },
    );
  }
}
