/**
 * GET /api/admin/payments/[paymentId]/audit
 *
 * BFF proxy → payment service GET /api/admin/payments/:paymentId/audit
 * Returns all audit log entries for one payment, ordered ASC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3007';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { paymentId } = await params;
  try {
    const upstream = await fetch(
      `${PAYMENT_SERVICE}/api/admin/payments/${encodeURIComponent(paymentId)}/audit`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache:   'no-store',
        signal:  AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'PAYMENT_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
