import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken } from '@/lib/portal-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

/** GET /api/pro/account — fetch own account settings */
export async function GET(req: NextRequest) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const up = await fetch(
      `${ADMIN}/api/admin/corporate/accounts/${claims.corporate_account_id}`,
      { headers: hdr, signal: AbortSignal.timeout(10_000) }
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

/** PATCH /api/pro/account — update travel policy fields only (allow-listed) */
export async function PATCH(req: NextRequest) {
  const claims = verifyPortalToken(req);
  if (!claims) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const raw = await req.json().catch(() => ({}));

    // Portal users may change travel-policy and VAT/billing fields, not tier/status/contract
    const PORTAL_ALLOWED = [
      'max_flight_class', 'max_hotel_stars', 'per_diem_sar',
      'advance_booking_days', 'preferred_airlines',
      'vat_number', 'vat_country', 'billing_address',
      'billing_contact_name', 'billing_contact_email',
    ];
    const body: Record<string, unknown> = {};
    for (const k of PORTAL_ALLOWED) {
      if (raw[k] !== undefined) body[k] = raw[k];
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'NOTHING_TO_UPDATE' }, { status: 400 });
    }

    const up = await fetch(
      `${ADMIN}/api/admin/corporate/accounts/${claims.corporate_account_id}`,
      {
        method: 'PATCH', headers: hdr,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      }
    );
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
