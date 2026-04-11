/**
 * BFF: GET /api/admin/loyalty/members/[userId]/ledger
 * → loyalty service GET /api/admin/loyalty/members/:userId/ledger
 *
 * Returns the last 50 points transactions for a loyalty member.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const LOYALTY_SVC = process.env.LOYALTY_SERVICE_URL ?? 'http://localhost:3008';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const res  = await fetch(
      `${LOYALTY_SVC}/api/admin/loyalty/members/${userId}/ledger`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache:   'no-store',
      },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/loyalty/members/ledger BFF]', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
