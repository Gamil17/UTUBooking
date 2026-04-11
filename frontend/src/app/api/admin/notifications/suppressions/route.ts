/**
 * BFF: /api/admin/notifications/suppressions
 *
 * GET  ?page=&limit=&active=true|false&email=&suppressionType=
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const NOTIF = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';
const hdr   = { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' };

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const qs = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) qs.set(k, v);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  try {
    const up = await fetch(`${NOTIF}/api/admin/notifications/suppressions${suffix}`, {
      headers: hdr,
      cache:   'no-store',
      signal:  AbortSignal.timeout(12_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
