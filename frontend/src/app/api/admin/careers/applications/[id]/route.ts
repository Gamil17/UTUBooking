/**
 * GET  /api/admin/careers/applications/[id]  — fetch single application
 * PATCH /api/admin/careers/applications/[id] — update status + notes
 * Proxies to AUTH_SERVICE with admin-secret.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
const COOKIE_NAME  = 'utu_admin_token';

function safeEqual(a: string, b: string): boolean {
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}
function deriveSessionToken(secret: string): string {
  return createHash('sha256').update(`admin-session:${secret}`).digest('hex');
}
function isAdminAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET ?? '';
  if (!secret) return false;
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  if (cookie && safeEqual(cookie, deriveSessionToken(secret))) return true;
  const bearer = req.headers.get('authorization') ?? '';
  const bearerToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  return bearerToken ? safeEqual(bearerToken, secret) : false;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const upstream = await fetch(
      `${AUTH_SERVICE}/api/admin/careers/applications/${id}`,
      {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET ?? '' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const upstream = await fetch(
      `${AUTH_SERVICE}/api/admin/careers/applications/${id}/status`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type':   'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? '',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'AUTH_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
