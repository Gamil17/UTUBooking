import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3007';

/**
 * POST /api/payments/midtrans/charge
 *
 * Thin proxy to the payment microservice.
 * Accepts the same body the payment service expects:
 *   { bookingId, amount, paymentType, bank?, customerName?, customerEmail?,
 *     customerPhone?, gopayCallbackUrl? }
 *
 * Returns the payment-service response verbatim (JSON).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${PAYMENT_SERVICE_URL}/api/payments/midtrans/charge`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(15_000),
      }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[midtrans/charge proxy] error:', err);
    return NextResponse.json(
      { error: 'Payment service unavailable' },
      { status: 503 }
    );
  }
}
