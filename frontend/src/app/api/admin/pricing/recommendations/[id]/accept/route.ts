/**
 * BFF: POST /api/admin/pricing/recommendations/[id]/accept
 * → pricing service POST /pricing/recommendations/:id/accept
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, upstreamAdminHeader } from '@/lib/admin-bff-auth';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:80/api/v1';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/pricing/recommendations/${id}/accept`, {
      method:  'POST',
      headers: { ...upstreamAdminHeader(), 'Content-Type': 'application/json' },
      body:    '{}',
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[admin/pricing/accept BFF] error:', err);
    return NextResponse.json({ error: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}
