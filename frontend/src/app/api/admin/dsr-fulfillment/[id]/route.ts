import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN   = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET  = process.env.ADMIN_SECRET ?? '';
const TIMEOUT = 60_000; // DSR compilation fans out across 8 shards — allow 60s

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${ADMIN}/api/admin/dsr-fulfillment/${params.id}`, {
      headers: { 'x-admin-secret': SECRET }, cache: 'no-store',
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch (err) {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message: (err as Error).message }, { status: 503 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const up = await fetch(`${ADMIN}/api/admin/dsr-fulfillment/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
      cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch (err) {
    console.error('[bff/dsr-fulfillment]', (err as Error).message);
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message: (err as Error).message }, { status: 503 });
  }
}
