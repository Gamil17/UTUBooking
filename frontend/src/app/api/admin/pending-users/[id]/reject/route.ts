/**
 * BFF: POST /api/admin/pending-users/[id]/reject
 * → admin service POST /admin/api/users/:id/reject
 * Body: { reason?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SVC = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const adminHeader = () => ({ 'x-admin-secret': process.env.ADMIN_SECRET ?? '', 'Content-Type': 'application/json' });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const payload = await req.json().catch(() => ({}));

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/users/${id}/reject`, {
      method:  'POST',
      headers: adminHeader(),
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/pending-users/reject BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
