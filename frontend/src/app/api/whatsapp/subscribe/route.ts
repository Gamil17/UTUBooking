/**
 * POST /api/whatsapp/subscribe   — Opt in to WhatsApp marketing (Brazil)
 * DELETE /api/whatsapp/subscribe — Opt out
 *
 * LGPD compliance:
 *  - Opt-in is only accepted after the user has acknowledged the LGPD consent banner.
 *  - Consent is logged to POST /api/compliance/consent (law='LGPD', type='marketing_whatsapp').
 *  - Phone number stored in Redis `wa:broadcast:BR` SET + `wa:sub:BR:{userId}`.
 *  - Opt-out removes from both keys and logs a withdrawal consent record.
 *
 * Auth: JWT bearer token via x-auth-token or Authorization header.
 *       userId extracted from token payload — never trust client-sent userId.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL   = process.env.INTERNAL_AUTH_SERVICE_URL ?? 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

// ─── POST — subscribe ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { phone: string; lgpdConsent: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, lgpdConsent } = body;

  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }

  if (!lgpdConsent) {
    return NextResponse.json(
      { error: 'LGPD consent required to subscribe to WhatsApp messages' },
      { status: 422 },
    );
  }

  // Validate E.164-ish format (BR numbers: +55 + 10-11 digits)
  const e164 = phone.replace(/\s+/g, '');
  if (!/^\+?[1-9]\d{9,14}$/.test(e164)) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
  }

  // Forward to auth service which owns the consent log + Redis subscriber list
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/whatsapp/subscribe`, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-internal-secret': INTERNAL_SECRET,
        // Forward auth token so the auth service can extract userId
        'Authorization':    req.headers.get('Authorization') ?? '',
      },
      body: JSON.stringify({ phone: e164, lgpdConsent }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Subscribe failed' },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true, subscribed: true });
  } catch (err) {
    console.error('[/api/whatsapp/subscribe] upstream error:', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// ─── DELETE — unsubscribe ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  let body: { phone: string } = { phone: '' };
  try {
    body = await req.json();
  } catch {
    // body may be empty on DELETE — that's OK; auth service uses JWT userId
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/whatsapp/subscribe`, {
      method:  'DELETE',
      headers: {
        'Content-Type':     'application/json',
        'x-internal-secret': INTERNAL_SECRET,
        'Authorization':    req.headers.get('Authorization') ?? '',
      },
      body: JSON.stringify({ phone: body?.phone ?? '' }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'Unsubscribe failed' }, { status: res.status });
    }

    return NextResponse.json({ ok: true, subscribed: false });
  } catch (err) {
    console.error('[/api/whatsapp/subscribe] unsubscribe error:', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
