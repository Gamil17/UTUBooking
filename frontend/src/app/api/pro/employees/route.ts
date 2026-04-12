import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

export async function GET(req: NextRequest) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams({ account_id: claims.corporate_account_id });
  if (searchParams.get('search'))     qs.set('search',     searchParams.get('search')!);
  if (searchParams.get('status'))     qs.set('status',     searchParams.get('status')!);
  if (searchParams.get('department')) qs.set('department', searchParams.get('department')!);
  if (searchParams.get('page'))       qs.set('page',       searchParams.get('page')!);
  if (searchParams.get('limit'))      qs.set('limit',      searchParams.get('limit')!);

  try {
    const up = await fetch(`${ADMIN}/api/admin/corporate/employees?${qs}`, {
      headers: hdr, signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    // Enforce account_id from JWT — portal users can only create employees for their own account
    const up = await fetch(`${ADMIN}/api/admin/corporate/employees`, {
      method: 'POST',
      headers: hdr,
      body: JSON.stringify({ ...body, account_id: claims.corporate_account_id }),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
