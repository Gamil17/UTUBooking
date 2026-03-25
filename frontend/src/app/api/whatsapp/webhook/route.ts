/**
 * GET  /api/whatsapp/webhook  — Meta webhook verification (hub.challenge handshake)
 * POST /api/whatsapp/webhook  — Inbound WhatsApp events (opt-outs, delivery receipts)
 *
 * Security:
 *  - GET: verified by hub.verify_token matching WHATSAPP_VERIFY_TOKEN env var.
 *  - POST: verified by X-Hub-Signature-256 HMAC header using META_WHATSAPP_TOKEN.
 *          (Meta sends the app secret as the HMAC key, not the access token —
 *           set META_WHATSAPP_APP_SECRET separately for webhook signature verification.)
 *
 * Register this URL in Meta Business Suite:
 *   WhatsApp → Configuration → Webhook → Callback URL: https://utubooking.com/api/whatsapp/webhook
 *   Subscribed fields: messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN  ?? '';
const APP_SECRET   = process.env.META_WHATSAPP_APP_SECRET ?? '';
const BACKEND_URL  = process.env.INTERNAL_AUTH_SERVICE_URL ?? 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

// ─── GET — hub.challenge verification ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    // Respond with the challenge string as plain text (Meta requirement)
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST — inbound events ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify X-Hub-Signature-256 (HMAC-SHA256 of raw body with app secret)
  if (APP_SECRET) {
    const signature = req.headers.get('x-hub-signature-256') ?? '';
    const expected  = `sha256=${createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')}`;
    if (signature !== expected) {
      console.warn('[whatsapp/webhook] Signature mismatch — possible spoofed request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Forward to backend auth service for processing (opt-out handling, delivery logs)
  try {
    await fetch(`${BACKEND_URL}/api/v1/whatsapp/webhook`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-fatal — Meta expects 200 regardless, retry if we 5xx
    console.error('[whatsapp/webhook] backend forward error:', err);
  }

  // Meta requires a 200 response within 20 seconds; always respond OK
  return NextResponse.json({ ok: true }, { status: 200 });
}
