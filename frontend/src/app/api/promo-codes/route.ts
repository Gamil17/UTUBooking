/**
 * GET /api/promo-codes
 * Public — returns active, non-expired promo codes for the /promo-codes display page.
 * 5-minute cache so it stays fresh without hammering the DB.
 */

import { NextResponse } from 'next/server';

export const revalidate = 300;

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function GET() {
  try {
    const upstream = await fetch(`${AUTH_SERVICE}/api/promos`, {
      next:   { revalidate: 300 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) return NextResponse.json({ data: [] }, { status: 200 });
    const data = await upstream.json().catch(() => ({ data: [] }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ data: [] });
  }
}
