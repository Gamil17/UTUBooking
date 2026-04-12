import { NextRequest, NextResponse } from 'next/server';

/**
 * Public route — no user auth required.
 * Called by AdvertisingPartnerForm on /advertise/partner.
 * Validates input, then forwards to the admin service using ADMIN_SECRET.
 */

const ADMIN_SERVICE  = process.env.ADMIN_SERVICE_URL        ?? 'http://localhost:3012';
const NOTIF_SERVICE  = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';
const PARTNERS_EMAIL = process.env.PARTNERS_EMAIL           ?? 'partners@utubooking.com';

const VALID_COMPANY_TYPES = new Set([
  'tourism_board','airline','hotel','ota','attractions',
  'car_rental','travel_tech','consumer_brands',
  'financial_payments','halal_brands','other',
]);
const VALID_REGIONS = new Set([
  'saudi_arabia','uae','gulf_gcc','mena',
  'muslim_world','se_asia','s_asia','global',
]);
const VALID_GOALS = new Set([
  'performance_marketing','brand_awareness','lead_generation',
  'app_growth','retargeting','product_launch','market_entry',
]);
const VALID_BUDGETS = new Set([
  'under_10k','10k_50k','50k_200k','over_200k','lets_discuss',
]);

const COMPANY_TYPE_LABELS: Record<string, string> = {
  tourism_board:      'Tourism Board / DMO',
  airline:            'Airline',
  hotel:              'Hotel / Hospitality',
  ota:                'OTA / Travel Platform',
  attractions:        'Attractions / Experiences',
  car_rental:         'Car Rental',
  travel_tech:        'Travel Tech',
  consumer_brands:    'Consumer Brands',
  financial_payments: 'Financial / Payments',
  halal_brands:       'Halal Brands',
  other:              'Other',
};

const REGION_LABELS: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia',
  uae:          'UAE',
  gulf_gcc:     'Gulf / GCC',
  mena:         'MENA',
  muslim_world: 'Muslim World',
  se_asia:      'SE Asia',
  s_asia:       'South Asia',
  global:       'Global',
};

const GOAL_LABELS: Record<string, string> = {
  performance_marketing: 'Performance Marketing',
  brand_awareness:       'Brand Awareness',
  lead_generation:       'Lead Generation',
  app_growth:            'App Growth',
  retargeting:           'Retargeting',
  product_launch:        'Product Launch',
  market_entry:          'Market Entry',
};

const BUDGET_LABELS: Record<string, string> = {
  under_10k:    'Under SAR 10,000',
  '10k_50k':    'SAR 10,000 – 50,000',
  '50k_200k':   'SAR 50,000 – 200,000',
  over_200k:    'SAR 200,000+',
  lets_discuss: "Let's discuss",
};

// ── Email helpers ─────────────────────────────────────────────────────────────

function applicantConfirmationHtml(name: string, company: string, goal: string, budget: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#1E3A5F;padding:28px 32px;text-align:center">
            <span style="display:inline-block;background:#FBBF24;color:#1E3A5F;font-weight:900;font-size:14px;padding:6px 14px;border-radius:8px;letter-spacing:1px">UTUBooking</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px">
            <h1 style="margin:0 0 8px;font-size:22px;color:#1E3A5F;font-weight:800">Enquiry Received!</h1>
            <p style="margin:0 0 20px;color:#64748b;font-size:15px">Hi ${name}, thanks for reaching out about advertising on UTUBooking.</p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:130px">Company</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:600">${company}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Goal</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:600">${GOAL_LABELS[goal] ?? goal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Budget</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:600">${BUDGET_LABELS[budget] ?? budget}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Status</td>
                  <td style="padding:6px 0;color:#f59e0b;font-size:13px;font-weight:700">Under Review</td>
                </tr>
              </table>
            </div>

            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7">
              Our partnerships team will review your enquiry within <strong>2 business days</strong> and reach out to discuss how we can help you reach 3M+ Hajj and Umrah travellers.
            </p>

            <p style="margin:0;color:#94a3b8;font-size:13px">
              Questions? Reply to this email or contact us at
              <a href="mailto:${PARTNERS_EMAIL}" style="color:#2563EB">${PARTNERS_EMAIL}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
            <p style="margin:0;color:#cbd5e1;font-size:12px">UTUBooking.com — AMEC Solutions · Saudi Arabia Tourism License</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function adminAlertHtml(
  name: string, company: string, email: string, phone: string | null,
  companyType: string, region: string, goal: string, budget: string, message: string | null,
): string {
  return `
<table style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;border-collapse:collapse;width:100%;max-width:560px">
  <tr><td colspan="2" style="background:#1E3A5F;color:#fff;padding:16px 20px;font-weight:800;font-size:16px">
    New Advertising Enquiry
  </td></tr>
  <tr><td style="padding:10px 20px;color:#64748b;width:130px">Name</td><td style="padding:10px 20px;font-weight:600">${name}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b">Company</td><td style="padding:10px 20px;font-weight:600">${company}</td></tr>
  <tr><td style="padding:10px 20px;color:#64748b">Email</td><td style="padding:10px 20px"><a href="mailto:${email}" style="color:#2563EB">${email}</a></td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b">Phone</td><td style="padding:10px 20px">${phone ?? '—'}</td></tr>
  <tr><td style="padding:10px 20px;color:#64748b">Type</td><td style="padding:10px 20px">${COMPANY_TYPE_LABELS[companyType] ?? companyType}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b">Region</td><td style="padding:10px 20px">${REGION_LABELS[region] ?? region}</td></tr>
  <tr><td style="padding:10px 20px;color:#64748b">Goal</td><td style="padding:10px 20px">${GOAL_LABELS[goal] ?? goal}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b">Budget</td><td style="padding:10px 20px">${BUDGET_LABELS[budget] ?? budget}</td></tr>
  ${message ? `<tr><td style="padding:10px 20px;color:#64748b;vertical-align:top">Message</td><td style="padding:10px 20px">${message}</td></tr>` : ''}
  <tr><td colspan="2" style="padding:16px 20px">
    <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/advertising"
       style="display:inline-block;background:#1E3A5F;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px">
      Review in Admin → Advertising
    </a>
  </td></tr>
</table>`.trim();
}

async function sendEmail(payload: { email: string; name: string; subject: string; bodyHtml: string }) {
  return fetch(`${NOTIF_SERVICE}/api/admin/notifications/send-to-user`, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'x-admin-secret': process.env.ADMIN_SECRET ?? '',
    },
    body:   JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  }).catch((err) => {
    console.warn('[advertise/enquiry] email send failed:', err?.message);
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name, company_name, work_email, phone,
      company_type, region, goal, budget_range, message, consent,
    } = body ?? {};

    if (!full_name?.trim())    return NextResponse.json({ message: 'Full name is required.' }, { status: 400 });
    if (!company_name?.trim()) return NextResponse.json({ message: 'Company name is required.' }, { status: 400 });
    if (!work_email?.trim())   return NextResponse.json({ message: 'Work email is required.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(work_email.trim())) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (company_type && !VALID_COMPANY_TYPES.has(company_type)) {
      return NextResponse.json({ message: 'Invalid company type.' }, { status: 400 });
    }
    if (region && !VALID_REGIONS.has(region)) {
      return NextResponse.json({ message: 'Invalid region.' }, { status: 400 });
    }
    if (goal && !VALID_GOALS.has(goal)) {
      return NextResponse.json({ message: 'Invalid goal.' }, { status: 400 });
    }
    if (budget_range && !VALID_BUDGETS.has(budget_range)) {
      return NextResponse.json({ message: 'Invalid budget range.' }, { status: 400 });
    }

    const upstream = await fetch(`${ADMIN_SERVICE}/api/admin/advertising/enquiries`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
      },
      body: JSON.stringify({
        full_name:    full_name.trim(),
        company_name: company_name.trim(),
        work_email:   work_email.trim().toLowerCase(),
        phone:        phone?.trim()   || null,
        company_type: company_type    || 'other',
        region:       region          || 'global',
        goal:         goal            || 'brand_awareness',
        budget_range: budget_range    || 'lets_discuss',
        message:      message?.trim() || null,
        consent:      consent === true,
        source:       'website',
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

    // Fire-and-forget emails — never block the 200 response
    const applicantEmail = sendEmail({
      email:    work_email.trim().toLowerCase(),
      name:     full_name.trim(),
      subject:  'Your UTUBooking Advertising Enquiry — We\'ll Be in Touch',
      bodyHtml: applicantConfirmationHtml(
        full_name.trim(), company_name.trim(),
        goal || 'brand_awareness', budget_range || 'lets_discuss',
      ),
    });

    const adminEmail = sendEmail({
      email:    PARTNERS_EMAIL,
      name:     'UTUBooking Partners Team',
      subject:  `New Advertising Enquiry — ${company_name.trim()} (${COMPANY_TYPE_LABELS[company_type] ?? company_type})`,
      bodyHtml: adminAlertHtml(
        full_name.trim(), company_name.trim(), work_email.trim().toLowerCase(),
        phone?.trim() || null,
        company_type || 'other', region || 'global',
        goal || 'brand_awareness', budget_range || 'lets_discuss',
        message?.trim() || null,
      ),
    });

    Promise.all([applicantEmail, adminEmail]).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process your enquiry. Please email partners@utubooking.com directly.' },
      { status: 500 },
    );
  }
}
