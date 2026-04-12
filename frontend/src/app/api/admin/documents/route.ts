/**
 * BFF proxy: /api/admin/documents
 *
 * GET  — list generated documents
 * POST — generate a new document (forwards to /api/admin/documents/generate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN   = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET  = process.env.ADMIN_SECRET ?? '';
const TIMEOUT = 60_000; // Claude document generation takes up to 30s

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.toString();
  const path   = search ? `/api/admin/documents?${search}` : '/api/admin/documents';

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

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: string;
  try { body = await req.text(); } catch { body = '{}'; }

  try {
    const up = await fetch(`${ADMIN}/api/admin/documents/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
      body,
      cache:   'no-store',
      signal:  AbortSignal.timeout(TIMEOUT),
    });
    const json: unknown = await up.json().catch(() => ({}));
    return NextResponse.json(json, { status: up.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[bff/documents]', message);
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message }, { status: 503 });
  }
}
