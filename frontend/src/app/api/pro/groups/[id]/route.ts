import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/** GET /api/pro/groups/:id/bookings — travellers in this group trip */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const up = await fetch(`${ADMIN}/api/admin/corporate/trip-groups/${params.id}/bookings`, {
      headers: hdr, signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

/** PATCH /api/pro/groups/:id — update group name / status */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const up = await fetch(`${ADMIN}/api/admin/corporate/trip-groups/${params.id}`, {
      method: 'PATCH', headers: hdr,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

/** DELETE /api/pro/groups/:id — cancel the group trip */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const up = await fetch(`${ADMIN}/api/admin/corporate/trip-groups/${params.id}`, {
      method: 'DELETE', headers: hdr, signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
