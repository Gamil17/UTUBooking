/**
 * POST /api/admin/payments/[paymentId]/refund
 *
 * BFF proxy → payment service POST /api/admin/payments/:id/refund
 *
 * Body: { amount?: number, reason?: string }
 *
 * The payment service handles:
 *  - Stripe gateway refund (if method === 'stripe')
 *  - DB update (payment.status → 'refunded', refunded_at, refund_amount)
 *  - Booking status update via booking service (best-effort)
 *
 * For non-Stripe gateways the record is marked 'refunded' (manual=true)
 * and ops completes the refund via the gateway's own dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3007';

export async function POST(
  req: NextRequest,
  { params }: { params: { paymentId: string } },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const upstream = await fetch(
      `${PAYMENT_SERVICE}/api/admin/payments/${params.paymentId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? '',
        },
        body:   JSON.stringify(body),
        signal: AbortSignal.timeout(30_000), // gateway calls can be slow
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'PAYMENT_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
