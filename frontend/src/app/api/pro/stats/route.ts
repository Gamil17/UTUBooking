import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/** GET /api/pro/stats — portal dashboard KPIs (scoped to JWT's corporate_account_id) */
export async function GET(req: NextRequest) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const qs  = new URLSearchParams({ account_id: claims.corporate_account_id });
    const up  = await fetch(`${ADMIN}/api/admin/corporate/portal-stats?${qs}`, {
      headers: hdr, signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
