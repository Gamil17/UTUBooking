import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    // Prevent portal users from changing account_id
    delete body.account_id;
    const up = await fetch(`${ADMIN}/api/admin/corporate/employees/${params.id}`, {
      method: 'PATCH', headers: hdr, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const up = await fetch(`${ADMIN}/api/admin/corporate/employees/${params.id}`, {
      method: 'DELETE', headers: hdr, signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
