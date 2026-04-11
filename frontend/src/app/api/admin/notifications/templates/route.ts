/**
 * GET  /api/admin/notifications/templates — list templates
 * POST /api/admin/notifications/templates — create template
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const NOTIFY = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${NOTIFY}/api/admin/notifications/templates`, {
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const body = await req.json();
    const up = await fetch(`${NOTIFY}/api/admin/notifications/templates`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
        'Content-Type':  'application/json',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
