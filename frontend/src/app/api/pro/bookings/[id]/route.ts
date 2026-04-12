import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    // Portal users may only update purpose/notes — status changes go via admin
    const { purpose, notes } = body;
    const up = await fetch(`${ADMIN}/api/admin/corporate/bookings/${params.id}`, {
      method: 'PATCH', headers: hdr,
      body: JSON.stringify({ purpose, notes }),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
