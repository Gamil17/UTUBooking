import { NextRequest, NextResponse } from 'next/server';

/**
 * Public click-tracking endpoint.
 * Called by AffiliateRefTracker when a visitor lands with ?ref=UTU-XXXXX-XXXX.
 * Rate-limited by the CDN / WAF in production (Cloudflare).
 *
 * POST /api/affiliates/track
 * Body: { ref: string }
 */

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const VALID_REF     = /^UTU-[A-Z0-9]{1,10}-[A-Z0-9]{1,6}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ref  = (body?.ref ?? '').trim();

    if (!ref || !VALID_REF.test(ref)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Fire-and-forget to admin service — we don't block the response on this
    fetch(`${ADMIN_SERVICE}/api/admin/affiliates/clicks`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
      },
      body:   JSON.stringify({ referral_code: ref.toUpperCase() }),
      signal: AbortSignal.timeout(5_000),
    }).catch((err) => {
      // Non-critical: log but don't surface to client
      console.warn('[affiliates/track] upstream error:', err?.message);
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
