import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, topic } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim() || !topic?.trim()) {
      return NextResponse.json({ message: 'Please fill in all required fields.' }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Whitelist topic values to prevent injection into downstream templates/tickets
    const VALID_TOPICS = new Set(['flights', 'hotels', 'hajj', 'cars', 'payments', 'tech', 'visa', 'privacy', 'other']);
    if (!VALID_TOPICS.has(topic.trim().toLowerCase())) {
      return NextResponse.json({ message: 'Invalid topic.' }, { status: 400 });
    }

    // In production: forward to email service (AWS SES / SendGrid) or internal ticketing system.
    // Log for now so submissions aren't silently dropped.
    console.log('[contact-form]', {
      name: name.trim(),
      email: email.trim(),
      topic: topic.trim(),
      ref: body.ref?.trim() || '',
      messageLength: message.trim().length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Unable to process your message. Please email support@utubooking.com directly.' }, { status: 500 });
  }
}
