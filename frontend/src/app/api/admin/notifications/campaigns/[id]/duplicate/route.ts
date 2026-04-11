/**
 * POST /api/admin/notifications/campaigns/[id]/duplicate — clone campaign as new draft
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const NOTIFY = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const up = await fetch(`${NOTIFY}/api/admin/notifications/campaigns/${id}/duplicate`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
        'Content-Type':  'application/json',
      },
      body:   '{}',
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
