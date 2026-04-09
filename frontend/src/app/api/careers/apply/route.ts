import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

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

    // Persist to database via auth service
    // In production: upload CV to S3 first and include cv_s3_key in the payload.
    const upstream = await fetch(`${AUTH_SERVICE}/api/admin/careers/applications`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-admin-secret':  process.env.ADMIN_SECRET ?? '',
      },
      body: JSON.stringify({
        name,
        email,
        role,
        coverLetter,
        phone:       phone       || '',
        linkedinUrl: linkedinUrl || '',
        cvFilename:  cv && cv.size > 0 ? cv.name          : null,
        cvSizeBytes: cv && cv.size > 0 ? cv.size          : null,
        cvMimeType:  cv && cv.size > 0 ? cv.type          : null,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.message || 'Unable to submit application.' },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process your application. Please email careers@utubooking.com directly.' },
      { status: 500 }
    );
  }
}
