/**
 * BFF: GET /api/admin/bookings
 * Supports:
 *   ?view=stats         → booking service GET /api/admin/bookings/stats
 *   ?search=&status=&product_type=&limit=&offset=  → booking list
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const BOOKING_SVC = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3006';
const adminHeader = () => ({ 'x-admin-secret': process.env.ADMIN_SECRET ?? '' });

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Proxy stats view
  if (searchParams.get('view') === 'stats') {
    try {
      const res  = await fetch(`${BOOKING_SVC}/api/admin/bookings/stats`, {
        headers: adminHeader(),
        cache:   'no-store',
      });
      const body = await res.json();
      return NextResponse.json(body, { status: res.status });
    } catch (err) {
      console.error('[admin/bookings/stats BFF]', err);
      return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
    }
  }

  // List bookings
  const params = new URLSearchParams();
  ['search', 'status', 'product_type', 'limit', 'offset'].forEach((k) => {
    const v = searchParams.get(k);
    if (v) params.set(k, v);
  });

  try {
    const res  = await fetch(`${BOOKING_SVC}/api/admin/bookings?${params}`, {
      headers: adminHeader(),
      cache:   'no-store',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/bookings BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
