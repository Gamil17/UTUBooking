/**
 * POST /api/hotel-partners/apply
 *
 * Public-facing BFF for hotel partner applications.
 * Validates the form, forwards to the admin CRM hotel-partners endpoint,
 * and fires confirmation emails (non-blocking) to the applicant and our team.
 */

import { NextRequest, NextResponse } from 'next/server';

const SALES_URL    = process.env.SALES_SERVICE_URL  ?? 'http://localhost:3013';
const SALES_SECRET = process.env.SALES_SECRET ?? process.env.ADMIN_SECRET ?? '';
const NOTIFY_URL   = process.env.NOTIFY_SERVICE_URL ?? 'http://localhost:3002';

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_PROPERTY_TYPES = new Set(['hotel', 'apartment', 'resort', 'guesthouse', 'other']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Fire-and-forget email ─────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch(`${NOTIFY_URL}/api/notify/email`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': SALES_SECRET,
      },
      body:   JSON.stringify({ to, subject, html }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Non-blocking — log in prod but never fail the user request
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const {
    hotel_name,
    contact_name,
    contact_email,
    phone,
    property_type,
    city,
    country,
    stars,
    room_count,
    otas,
    message,
    consent,
  } = body as {
    hotel_name:    string;
    contact_name:  string;
    contact_email: string;
    phone?:        string;
    property_type?: string;
    city:          string;
    country:       string;
    stars?:        string;
    room_count?:   string;
    otas?:         string[];
    message?:      string;
    consent:       boolean;
  };

  // Required field validation
  if (!hotel_name?.trim())    return NextResponse.json({ error: 'hotel_name is required' }, { status: 400 });
  if (!contact_name?.trim())  return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
  if (!contact_email?.trim() || !EMAIL_RE.test(contact_email))
    return NextResponse.json({ error: 'A valid work email is required' }, { status: 400 });
  if (!city?.trim())          return NextResponse.json({ error: 'city is required' }, { status: 400 });
  if (!country?.trim())       return NextResponse.json({ error: 'country is required' }, { status: 400 });
  if (!consent)               return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
  if (property_type && !VALID_PROPERTY_TYPES.has(property_type))
    return NextResponse.json({ error: 'invalid property_type' }, { status: 400 });

  // Build the notes field — combines optional form inputs not in the DB schema
  const notesParts: string[] = [];
  if (property_type) notesParts.push(`Type: ${property_type}`);
  if (room_count)    notesParts.push(`Rooms: ${room_count}`);
  if (phone)         notesParts.push(`Phone: ${phone}`);
  if (otas?.length)  notesParts.push(`OTAs: ${otas.join(', ')}`);
  if (message)       notesParts.push(`Message: ${message}`);
  const notes = notesParts.join(' | ') || null;

  // Normalise country code — if 'OTHER' pass null
  const countryCode = country === 'OTHER' ? null : country.slice(0, 2).toUpperCase();

  // Forward to sales service hotel-partners endpoint
  const crmPayload = {
    hotel_name:      hotel_name.trim(),
    contact_name:    contact_name.trim(),
    contact_email:   contact_email.toLowerCase().trim(),
    city:            city.trim(),
    country:         countryCode,
    stars:           stars ? parseInt(stars, 10) : null,
    outreach_status: 'not_contacted',
    priority:        2, // website applications are mid-priority; team can promote to P1
    notes,
  };

  try {
    const crmRes = await fetch(`${SALES_URL}/api/sales/hotel-partners`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SALES_SECRET}`,
      },
      body:   JSON.stringify(crmPayload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!crmRes.ok) {
      const err = await crmRes.json().catch(() => ({}));
      console.error('[hotel-partners/apply] CRM error:', crmRes.status, err);
      return NextResponse.json(
        { error: 'Unable to submit your application. Please try again or email partners@utubooking.com.' },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error('[hotel-partners/apply] fetch error:', err);
    return NextResponse.json(
      { error: 'Service unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  // Fire-and-forget confirmation emails
  const applicantHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1E3A5F">Application Received</h2>
      <p>Hi ${contact_name},</p>
      <p>Thank you for applying to list <strong>${hotel_name}</strong> on UTUBooking.</p>
      <p>Our partnerships team will review your application and be in touch within <strong>2 business days</strong>.</p>
      <p style="color:#64748b;font-size:13px">Questions? Reply to this email or contact us at <a href="mailto:partners@utubooking.com">partners@utubooking.com</a></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">UTUBooking Hotel Partners — Reaching 3M+ Hajj &amp; Umrah Travelers</p>
    </div>
  `;

  const adminHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1E3A5F">New Hotel Partner Application</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b;width:140px">Property</td><td><strong>${hotel_name}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Location</td><td>${city}${countryCode ? `, ${countryCode}` : ''}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Contact</td><td>${contact_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Email</td><td><a href="mailto:${contact_email}">${contact_email}</a></td></tr>
        ${phone ? `<tr><td style="padding:6px 0;color:#64748b">Phone</td><td>${phone}</td></tr>` : ''}
        ${stars ? `<tr><td style="padding:6px 0;color:#64748b">Stars</td><td>${stars}-star</td></tr>` : ''}
        ${room_count ? `<tr><td style="padding:6px 0;color:#64748b">Rooms</td><td>${room_count}</td></tr>` : ''}
        ${otas?.length ? `<tr><td style="padding:6px 0;color:#64748b">Current OTAs</td><td>${otas.join(', ')}</td></tr>` : ''}
        ${message ? `<tr><td style="padding:6px 0;color:#64748b">Message</td><td>${message}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px"><a href="/admin/sales" style="background:#1E3A5F;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">View in Admin CRM</a></p>
    </div>
  `;

  sendEmail(contact_email, 'Your UTUBooking Hotel Partner Application', applicantHtml);
  sendEmail('partners@utubooking.com', `New Hotel Partner Application: ${hotel_name} (${city})`, adminHtml);

  return NextResponse.json({ success: true }, { status: 201 });
}
