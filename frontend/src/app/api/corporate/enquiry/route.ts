import { NextRequest, NextResponse } from 'next/server';

/**
 * Public route — no user auth required.
 * Called by the CorporateEnquiryForm on /partners#business.
 * Validates input, then forwards to the admin service using ADMIN_SECRET.
 */

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      company_name, contact_name, email, phone,
      traveler_count, destinations, travel_dates, message,
      // Enhanced application fields (Phase 6)
      job_title, company_size, industry, country,
      estimated_monthly_budget_sar, hear_about_us,
      source,
    } = body ?? {};

    if (!company_name?.trim()) return NextResponse.json({ message: 'Company name is required.' }, { status: 400 });
    if (!contact_name?.trim()) return NextResponse.json({ message: 'Contact name is required.' }, { status: 400 });
    if (!email?.trim())        return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }

    const upstream = await fetch(`${ADMIN_SERVICE}/api/admin/corporate/enquiries`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
      },
      body: JSON.stringify({
        company_name:                 company_name.trim(),
        contact_name:                 contact_name.trim(),
        email:                        email.trim().toLowerCase(),
        phone:                        phone?.trim()        || null,
        traveler_count:               parseInt(traveler_count ?? '1', 10),
        destinations:                 destinations?.trim() || null,
        travel_dates:                 travel_dates?.trim() || null,
        message:                      message?.trim()      || null,
        source:                       source || 'website',
        // Enhanced fields
        job_title:                    job_title?.trim()    || null,
        company_size:                 company_size         || null,
        industry:                     industry             || null,
        country:                      country              || null,
        estimated_monthly_budget_sar: estimated_monthly_budget_sar ?? null,
        hear_about_us:                hear_about_us        || null,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.message || 'Unable to submit your enquiry.' },
        { status: upstream.status },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process your enquiry. Please email corporate@utubooking.com directly.' },
      { status: 500 },
    );
  }
}
