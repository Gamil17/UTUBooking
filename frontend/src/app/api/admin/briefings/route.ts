/**
 * BFF proxy: /api/admin/briefings
 *
 * GET  /api/admin/briefings          — list briefings (paginated)
 * POST /api/admin/briefings/generate — manual trigger (separate route file)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN   = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET  = process.env.ADMIN_SECRET ?? '';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.toString();
  const path   = search ? `/api/admin/briefings?${search}` : '/api/admin/briefings';

  try {
    const up = await fetch(`${ADMIN}${path}`, {
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
