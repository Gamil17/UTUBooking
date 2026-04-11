import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}`, 'Content-Type': 'application/json' };

const endpointMap: Record<string, string> = {
  stats:                'stats',
  rules:                'rules',
  blackouts:            'blackouts',
  overrides:            'overrides',
  targets:              'targets',
  'ai-recommendations': 'ai-recommendations',
  'ai-revpar':          'ai-revpar',
};

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view') ?? 'stats';
  const endpoint = endpointMap[view];
  if (!endpoint) return NextResponse.json({ error: 'INVALID_VIEW' }, { status: 400 });
  const qs = new URLSearchParams(searchParams);
  qs.delete('view');
  const query = qs.toString();
  try {
    const up = await fetch(`${ADMIN}/api/admin/revenue/${endpoint}${query ? '?' + query : ''}`, {
      headers: hdr,
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action');
  const recId  = searchParams.get('rec_id');
  if (!action || !recId) return NextResponse.json({ error: 'action and rec_id are required' }, { status: 400 });
  if (action !== 'accept' && action !== 'reject') return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  try {
    const body = await req.json().catch(() => ({}));
    const up = await fetch(`${ADMIN}/api/admin/revenue/ai-recommendations/${recId}/${action}`, {
      method: 'POST', headers: hdr, body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
