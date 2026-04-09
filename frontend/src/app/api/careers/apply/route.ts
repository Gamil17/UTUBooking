import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    const name        = (data.get('name')        as string | null)?.trim() ?? '';
    const email       = (data.get('email')       as string | null)?.trim() ?? '';
    const role        = (data.get('role')        as string | null)?.trim() ?? '';
    const coverLetter = (data.get('coverLetter') as string | null)?.trim() ?? '';
    const phone       = (data.get('phone')       as string | null)?.trim() ?? '';
    const linkedinUrl = (data.get('linkedinUrl') as string | null)?.trim() ?? '';
    const cv          = data.get('cv') as File | null;

    // Required field validation
    if (!name || !email || !role || !coverLetter) {
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
    if (role.length > 200) {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
    }
    if (coverLetter.length > 5000) {
      return NextResponse.json(
        { message: 'Cover letter must be under 5,000 characters.' },
        { status: 400 }
      );
    }

    // CV file validation (if provided)
    if (cv && cv.size > 0) {
      if (!ACCEPTED_MIME.has(cv.type)) {
        return NextResponse.json(
          { message: 'CV must be a PDF, DOC, or DOCX file.' },
          { status: 400 }
        );
      }
      if (cv.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { message: 'CV file must be under 5 MB.' },
          { status: 400 }
        );
      }
    }

    // In production: save CV to S3 and forward to HR system or SendGrid.
    // Log metadata for now so submissions aren't silently dropped.
    console.log('[careers-apply]', {
      name,
      email,
      role,
      phone,
      linkedinUrl,
      coverLetterLength: coverLetter.length,
      cv: cv && cv.size > 0
        ? { name: cv.name, size: cv.size, type: cv.type }
        : null,
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
