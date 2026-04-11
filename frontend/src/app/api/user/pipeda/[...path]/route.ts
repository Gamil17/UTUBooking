/**
 * Catch-all BFF: /api/user/pipeda/[...path]
 *
 * Forwards all PIPEDA / Quebec Law 25 user-rights requests to the auth service.
 * Preserves the HTTP method and passes the user's JWT.
 *
 * Backend routes (auth service, mounted at /api/user/pipeda):
 *   GET  /access           — s.4.9 right of access
 *   POST /correct          — s.4.9.5 right of correction
 *   POST /withdraw-consent — s.4.3.8 withdrawal of consent
 *   POST /erase            — Quebec Law 25 s.28.1 right of erasure
 *   GET  /portability      — Quebec Law 25 s.27 data portability
 *   GET  /consents         — current consent state
 *
 * Rate-limited server-side: 5 requests / 15 min per user.
 */

import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.INTERNAL_AUTH_SERVICE_URL ?? 'http://localhost:3001';

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const subPath  = path.join('/');
  const auth     = req.headers.get('authorization') ?? '';

  const forwardHeaders: Record<string, string> = {
    Authorization: auth,
    'x-forwarded-for':
      req.headers.get('x-forwarded-for') ??
      req.headers.get('x-real-ip') ??
      '',
  };

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const ct = req.headers.get('content-type') ?? '';
    forwardHeaders['content-type'] = ct;
    body = req.body ?? undefined;
  }

  try {
    const res = await fetch(`${AUTH_SERVICE}/api/user/pipeda/${subPath}`, {
      method:  req.method,
      headers: forwardHeaders,
      body,
      // @ts-expect-error — Next.js fetch accepts duplex for streaming bodies
      duplex: body ? 'half' : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export const GET    = handler;
export const POST   = handler;
export const DELETE = handler;
export const PUT    = handler;
export const PATCH  = handler;
