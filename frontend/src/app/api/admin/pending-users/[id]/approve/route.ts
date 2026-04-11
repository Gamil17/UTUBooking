/**
 * BFF: POST /api/admin/pending-users/[id]/approve
 * → admin service POST /admin/api/users/:id/approve
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

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/users/${id}/approve`, {
      method:  'POST',
      headers: adminHeader(),
      body:    '{}',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/pending-users/approve BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
