/**
 * BFF: DELETE /api/admin/country-admins/[id]
 * → admin service DELETE /admin/api/country-admins/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SVC = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const adminHeader = () => ({ 'x-admin-secret': process.env.ADMIN_SECRET ?? '' });

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res  = await fetch(`${ADMIN_SVC}/admin/api/country-admins/${id}`, {
      method:  'DELETE',
      headers: adminHeader(),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/country-admins DELETE BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
