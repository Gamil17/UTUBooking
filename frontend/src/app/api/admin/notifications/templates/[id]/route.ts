/**
 * GET    /api/admin/notifications/templates/[id] — get template
 * PATCH  /api/admin/notifications/templates/[id] — update template
 * DELETE /api/admin/notifications/templates/[id] — delete template
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const NOTIFY = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const up = await fetch(`${NOTIFY}/api/admin/notifications/templates/${id}`, {
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const up = await fetch(`${NOTIFY}/api/admin/notifications/templates/${id}`, {
      method:  'PATCH',
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

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const up = await fetch(`${NOTIFY}/api/admin/notifications/templates/${id}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` },
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
