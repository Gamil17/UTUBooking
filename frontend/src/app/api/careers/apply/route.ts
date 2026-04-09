import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, coverLetter, phone, linkedinUrl } = body;

    // Required field validation
    if (!name?.trim() || !email?.trim() || !role?.trim() || !coverLetter?.trim()) {
      return NextResponse.json(
        { message: 'Please fill in all required fields.' },
        { status: 400 }
      );
    }

    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Length guards
    if (role.trim().length > 200) {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
    }
    if (coverLetter.trim().length > 5000) {
      return NextResponse.json(
        { message: 'Cover letter must be under 5,000 characters.' },
        { status: 400 }
      );
    }

    // In production: forward to HR system or email service (AWS SES / SendGrid).
    // Log for now so submissions aren't silently dropped.
    console.log('[careers-apply]', {
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      phone: phone?.trim() || '',
      linkedinUrl: linkedinUrl?.trim() || '',
      coverLetterLength: coverLetter.trim().length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process your application. Please email careers@utubooking.com directly.' },
      { status: 500 }
    );
  }
}
