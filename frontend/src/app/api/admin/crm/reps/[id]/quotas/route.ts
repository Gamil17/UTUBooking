/**
 * POST /api/admin/crm/reps/[id]/quotas — assign or update a quarterly quota
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const up   = await fetch(`${SALES}/api/sales/reps/${id}/quotas`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
