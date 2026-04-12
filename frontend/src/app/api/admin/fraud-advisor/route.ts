import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN   = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET  = process.env.ADMIN_SECRET ?? '';
const TIMEOUT = 45_000;

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${ADMIN}/api/admin/fraud-advisor`, {
      headers: { 'x-admin-secret': SECRET }, cache: 'no-store',
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch (err) {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message: (err as Error).message }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${ADMIN}/api/admin/fraud-advisor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
      cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch (err) {
    console.error('[bff/fraud-advisor]', (err as Error).message);
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message: (err as Error).message }, { status: 503 });
  }
}
