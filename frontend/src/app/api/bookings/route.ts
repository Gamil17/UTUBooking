/**
 * GET  /api/bookings          — list authenticated user's bookings
 * POST /api/bookings          — create a new booking (status: pending)
 *
 * Proxies to the internal booking service, forwarding the JWT
 * Authorization header supplied by the client.
 */

import { NextRequest, NextResponse } from 'next/server';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3006';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const qs  = req.nextUrl.searchParams.toString();
    const url = `${BOOKING_SERVICE}/api/v1/bookings${qs ? `?${qs}` : ''}`;
    const upstream = await fetch(url, {
      headers: { Authorization: auth },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'BOOKING_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body     = await req.json();
    const upstream = await fetch(`${BOOKING_SERVICE}/api/v1/bookings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'BOOKING_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
