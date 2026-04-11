/**
 * Catch-all BFF: /api/payments/[...path]
 *
 * Thin proxy from the browser to the payment microservice (port 3007).
 * Covers all user-facing payment gateway routes:
 *
 *   POST /api/payments/stripe/element/initiate
 *   POST /api/payments/paypal/initiate
 *   POST /api/payments/paypal/capture
 *   POST /api/payments/affirm/initiate
 *   POST /api/payments/affirm/confirm
 *   POST /api/payments/twint/initiate
 *   GET  /api/payments/twint/status/:checkoutId
 *   POST /api/payments/iyzico/initiate
 *   POST /api/payments/ipay88/initiate
 *   POST /api/payments/razorpay/initiate
 *   POST /api/payments/razorpay/verify
 *   POST /api/payments/interac/initiate
 *   GET  /api/payments/interac/return
 *   POST /api/payments/pix/initiate
 *   GET  /api/payments/pix/status/:intentId
 *   POST /api/payments/boleto/initiate
 *   POST /api/payments/mercadopago/initiate
 *   GET  /api/payments/midtrans/status/:orderId  (already handled by dedicated route — also covered here)
 *
 * BLOCKED paths (webhook/callback routes are server-to-server — never proxied via Next.js):
 *   webhook, notification, callback, response
 */

import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_SVC = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3007';

// Paths that must never be proxied from the browser
const BLOCKED_SEGMENTS = new Set(['webhook', 'notification', 'callback', 'response']);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // Block server-to-server webhook/callback paths
  if (path.some((seg) => BLOCKED_SEGMENTS.has(seg.toLowerCase()))) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const subPath = path.join('/');

  // Preserve query string (e.g. for status polling)
  const qs = req.nextUrl.search;

  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const raw = await req.text();
      body = raw || undefined;
    } catch {
      body = undefined;
    }
  }

  try {
    const upstream = await fetch(
      `${PAYMENT_SVC}/api/payments/${subPath}${qs}`,
      {
        method:   req.method,
        headers:  forwardHeaders,
        body,
        redirect: 'manual',   // let redirects pass through (e.g. interac/return → 302)
        signal:   AbortSignal.timeout(20_000),
      },
    );

    // Pass redirects (3xx) straight through to the browser
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location') ?? '/';
      return NextResponse.redirect(location, { status: upstream.status });
    }

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error(`[payments BFF] ${req.method} /${subPath} error:`, err);
    return NextResponse.json({ error: 'PAYMENT_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
