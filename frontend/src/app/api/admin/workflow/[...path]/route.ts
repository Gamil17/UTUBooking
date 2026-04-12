/**
 * BFF catch-all proxy: /api/admin/workflow/[...path]
 *
 * Forwards all GET / POST / PATCH / DELETE requests to the admin service
 * at ADMIN_SERVICE_URL/api/admin/workflow/*, which in turn proxies to the
 * workflow engine microservice (port 3014).
 *
 * Auth: validates utu_admin_token cookie or Bearer ADMIN_SECRET header
 * before forwarding. Upstream call uses x-admin-secret for service-to-service auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN     = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET    = process.env.ADMIN_SECRET ?? '';
const TIMEOUT   = 20_000;

// Upstream headers — service-to-service auth
const upstreamHeaders = (extraHeaders?: Record<string, string>) => ({
  'Content-Type':   'application/json',
  'x-admin-secret': SECRET,
  ...extraHeaders,
});

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // 1. Auth gate
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // 2. Build upstream URL: preserve full path + query string
  const { path } = await params;
  const pathStr   = path.join('/');
  const qs        = req.nextUrl.search ?? '';
  const upstream  = `${ADMIN}/api/admin/workflow/${pathStr}${qs}`;

  // 3. Read body for mutating methods
  let body: string | undefined;
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    try { body = await req.text(); } catch { body = undefined; }
  }

  // 4. Forward
  try {
    const up = await fetch(upstream, {
      method:  req.method,
      headers: upstreamHeaders(),
      body:    body || undefined,
      cache:   'no-store',
      signal:  AbortSignal.timeout(TIMEOUT),
    });

    let json: unknown;
    try { json = await up.json(); } catch { json = {}; }

    return NextResponse.json(json, { status: up.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[bff/workflow/${pathStr}]`, message);
    return NextResponse.json(
      { error: 'WORKFLOW_SERVICE_UNAVAILABLE', message },
      { status: 503 },
    );
  }
}

export const GET    = proxy;
export const POST   = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;
