import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL ?? 'http://payment-service:3007';

/**
 * GET /api/payments/midtrans/status/[orderId]
 *
 * Thin proxy to the payment microservice status-polling endpoint.
 * Returns the live Midtrans transaction status.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${PAYMENT_SERVICE_URL}/api/payments/midtrans/status/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[midtrans/status proxy] error:', err);
    return NextResponse.json(
      { error: 'Payment service unavailable' },
      { status: 503 }
    );
  }
}
