/**
 * BFF proxy: /api/admin/expense-analyzer/:id
 *
 * GET  — fetch existing AI analysis for an expense claim
 * POST — run AI expense analysis (takes 10-15s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN   = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET  = process.env.ADMIN_SECRET ?? '';
const TIMEOUT = 45_000;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const up = await fetch(`${ADMIN}/api/admin/expense-analyzer/${params.id}`, {
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const up = await fetch(`${ADMIN}/api/admin/expense-analyzer/${params.id}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
      cache:   'no-store',
      signal:  AbortSignal.timeout(TIMEOUT),
    });
    const json: unknown = await up.json().catch(() => ({}));
    return NextResponse.json(json, { status: up.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[bff/expense-analyzer]', message);
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message }, { status: 503 });
  }
}
