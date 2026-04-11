import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE  = process.env.AUTH_SERVICE_URL  ?? 'http://localhost:3001';

const VALID_TOPICS = new Set([
  'flights', 'hotels', 'hajj', 'cars', 'payments', 'tech', 'visa', 'privacy', 'affiliate', 'other',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, topic, ref: bookingRef } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim() || !topic?.trim()) {
      return NextResponse.json({ message: 'Please fill in all required fields.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!VALID_TOPICS.has(topic.trim().toLowerCase())) {
      return NextResponse.json({ message: 'Invalid topic.' }, { status: 400 });
    }

    const upstream = await fetch(`${AUTH_SERVICE}/api/admin/contact/enquiries`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET ?? '',
      },
      body: JSON.stringify({
        name:       name.trim(),
        email:      email.trim(),
        topic:      topic.trim().toLowerCase(),
        message:    message.trim(),
        bookingRef: bookingRef?.trim() || '',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.message || 'Unable to submit your message.' },
        { status: upstream.status },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process your message. Please email support@utubooking.com directly.' },
      { status: 500 },
    );
  }
}
