import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/** GET /api/pro/invoices/:yearMonth — fetch generated invoice for a billing period */
export async function GET(
  req: NextRequest,
  { params }: { params: { yearMonth: string } }
) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { yearMonth } = params;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 });
  }

  try {
    const up = await fetch(
      `${ADMIN}/api/admin/corporate/accounts/${claims.corporate_account_id}/invoice/${yearMonth}`,
      { headers: hdr, signal: AbortSignal.timeout(15_000) }
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
