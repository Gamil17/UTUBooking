import { NextRequest, NextResponse } from 'next/server';

/**
 * Public route — no user auth required.
 * Called by AffiliateApplyForm on /affiliates/apply.
 *
 * 1. Validates input
 * 2. Stores application via admin service
 * 3. Sends confirmation email to applicant (fire-and-forget)
 * 4. Sends alert email to partners team (fire-and-forget)
 */

const ADMIN_SERVICE  = process.env.ADMIN_SERVICE_URL        ?? 'http://localhost:3012';
const NOTIF_SERVICE  = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';
const PARTNERS_EMAIL = process.env.PARTNERS_EMAIL           ?? 'partners@utubooking.com';

const VALID_PLATFORMS = new Set(['blog','youtube','instagram','twitter','telegram','tiktok','other']);
const VALID_AUDIENCES = new Set(['under_1k','1k_10k','10k_100k','over_100k']);

// ── Email helpers ─────────────────────────────────────────────────────────────

const AUDIENCE_LABELS: Record<string, string> = {
  under_1k:   'Under 1,000',
  '1k_10k':   '1,000 – 10,000',
  '10k_100k': '10,000 – 100,000',
  over_100k:  '100,000+',
};

function applicantConfirmationHtml(name: string, platform: string, audience: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:#1E3A5F;padding:28px 32px;text-align:center">
            <span style="display:inline-block;background:#FBBF24;color:#1E3A5F;font-weight:900;font-size:14px;padding:6px 14px;border-radius:8px;letter-spacing:1px">UTUBooking</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px">
            <h1 style="margin:0 0 8px;font-size:22px;color:#1E3A5F;font-weight:800">Application Received!</h1>
            <p style="margin:0 0 20px;color:#64748b;font-size:15px">Hi ${name}, thanks for applying to the UTUBooking Affiliate Program.</p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:130px">Platform</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:600;text-transform:capitalize">${platform}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Monthly Audience</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:600">${AUDIENCE_LABELS[audience] ?? audience}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Status</td>
                  <td style="padding:6px 0;color:#f59e0b;font-size:13px;font-weight:700">Under Review</td>
                </tr>
              </table>
            </div>

            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7">
              Our team will review your application within <strong>2 business days</strong> and reach out to you at this email address.
              Once approved, you will receive your unique referral link and access to your affiliate dashboard.
            </p>

            <div style="background:#eff6ff;border-left:4px solid #2563EB;padding:14px 18px;border-radius:6px;margin-bottom:24px">
              <p style="margin:0;color:#1d4ed8;font-size:13px;font-weight:600">Commission Tiers</p>
              <p style="margin:6px 0 0;color:#1e40af;font-size:13px">Starter 3% · Pro 5% · Elite 8% (CPS — per confirmed booking)</p>
            </div>

            <p style="margin:0;color:#94a3b8;font-size:13px">
              Questions? Reply to this email or contact us at
              <a href="mailto:${PARTNERS_EMAIL}" style="color:#2563EB">${PARTNERS_EMAIL}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
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
  name: string, email: string, website: string | null,
  platform: string, audience: string, message: string | null,
): string {
  return `
<table style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;border-collapse:collapse;width:100%;max-width:560px">
  <tr><td colspan="2" style="background:#1E3A5F;color:#fff;padding:16px 20px;font-weight:800;font-size:16px">
    New Affiliate Application
  </td></tr>
  <tr><td style="padding:10px 20px;color:#64748b;width:130px">Name</td><td style="padding:10px 20px;font-weight:600">${name}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b">Email</td><td style="padding:10px 20px"><a href="mailto:${email}" style="color:#2563EB">${email}</a></td></tr>
  <tr><td style="padding:10px 20px;color:#64748b">Website</td><td style="padding:10px 20px">${website ?? '—'}</td></tr>
  <tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b">Platform</td><td style="padding:10px 20px;text-transform:capitalize">${platform}</td></tr>
  <tr><td style="padding:10px 20px;color:#64748b">Audience</td><td style="padding:10px 20px">${AUDIENCE_LABELS[audience] ?? audience}</td></tr>
  ${message ? `<tr style="background:#f8fafc"><td style="padding:10px 20px;color:#64748b;vertical-align:top">Message</td><td style="padding:10px 20px">${message}</td></tr>` : ''}
  <tr><td colspan="2" style="padding:16px 20px">
    <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/affiliates"
       style="display:inline-block;background:#1E3A5F;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px">
      Review in Admin → Affiliates
    </a>
  </td></tr>
</table>`.trim();
}

// ── Notification helper (fire-and-forget) ─────────────────────────────────────

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
    console.warn('[affiliates/apply] email send failed:', err?.message);
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, website, platform, audience_size, message } = body ?? {};

    // Validate
    if (!name?.trim())  return NextResponse.json({ message: 'Name is required.' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (platform && !VALID_PLATFORMS.has(platform)) {
      return NextResponse.json({ message: 'Invalid platform.' }, { status: 400 });
    }
    if (audience_size && !VALID_AUDIENCES.has(audience_size)) {
      return NextResponse.json({ message: 'Invalid audience size.' }, { status: 400 });
    }

    const cleanedPlatform = platform     || 'other';
    const cleanedAudience = audience_size || 'under_1k';

    // 1. Store application in admin service
    const upstream = await fetch(`${ADMIN_SERVICE}/api/admin/affiliates/applications`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
      },
      body: JSON.stringify({
        name:          name.trim(),
        email:         email.trim().toLowerCase(),
        website:       website?.trim() || null,
        platform:      cleanedPlatform,
        audience_size: cleanedAudience,
        message:       message?.trim() || null,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      if (upstream.status === 409) {
        return NextResponse.json({ message: 'An application with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ message: err.message || 'Unable to submit your application.' }, { status: upstream.status });
    }

    // 2. Send emails — both fire-and-forget; we don't block the response on these
    const applicantEmail = sendEmail({
      email:    email.trim().toLowerCase(),
      name:     name.trim(),
      subject:  'Your UTUBooking Affiliate Application — Under Review',
      bodyHtml: applicantConfirmationHtml(name.trim(), cleanedPlatform, cleanedAudience),
    });

    const adminEmail = sendEmail({
      email:   PARTNERS_EMAIL,
      name:    'UTUBooking Partners Team',
      subject: `New Affiliate Application — ${name.trim()} (${cleanedPlatform})`,
      bodyHtml: adminAlertHtml(
        name.trim(), email.trim().toLowerCase(),
        website?.trim() || null,
        cleanedPlatform, cleanedAudience, message?.trim() || null,
      ),
    });

    // Await both in background so they don't delay the 200 response
    Promise.all([applicantEmail, adminEmail]).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Unable to process your application. Please email partners@utubooking.com directly.' },
      { status: 500 },
    );
  }
}
