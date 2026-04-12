import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/**
 * POST /api/pro/approvals/:id?action=approve|reject
 *
 * Portal users (company admins) approve or reject out-of-policy booking requests.
 * The approver identity is taken from the JWT claims (not trusted from the request body).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'INVALID_ACTION', message: 'action must be approve or reject' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const payload = action === 'approve'
      ? { approved_by: claims.email }
      : { reason: body.reason, rejected_by: claims.email };

    const up = await fetch(`${ADMIN}/api/admin/corporate/bookings/${params.id}/${action}`, {
      method: 'POST', headers: hdr,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
