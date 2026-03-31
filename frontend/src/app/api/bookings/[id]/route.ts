/**
 * GET    /api/bookings/[id]  — get single booking detail
 * DELETE /api/bookings/[id]  — cancel a pending booking
 *
 * Proxies to the internal booking service with JWT forwarding.
 */

import { NextRequest, NextResponse } from 'next/server';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL ?? 'http://booking-service:3006';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = req.headers.get('Authorization');
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const upstream = await fetch(
      `${BOOKING_SERVICE}/api/v1/bookings/${params.id}`,
      { headers: { Authorization: auth }, cache: 'no-store' },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'BOOKING_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = req.headers.get('Authorization');
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const upstream = await fetch(
      `${BOOKING_SERVICE}/api/v1/bookings/${params.id}`,
      { method: 'DELETE', headers: { Authorization: auth } },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'BOOKING_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
