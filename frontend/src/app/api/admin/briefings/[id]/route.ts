/**
 * BFF proxy: GET /api/admin/briefings/:id
 * Returns the full briefing (including content_md).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN  = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET = process.env.ADMIN_SECRET ?? '';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const up = await fetch(`${ADMIN}/api/admin/briefings/${params.id}`, {
      headers: { 'x-admin-secret': SECRET },
      cache:   'no-store',
    });
    const json: unknown = await up.json().catch(() => ({}));
    return NextResponse.json(json, { status: up.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message }, { status: 503 });
  }
}
