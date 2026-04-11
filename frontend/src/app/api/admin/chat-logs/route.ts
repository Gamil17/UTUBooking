import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';
import redis from '@/lib/redis';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = Math.min(500, Math.max(1, parseInt(limitParam ?? '100', 10)));

  const raw = await redis.lrange('ai:logs', -limit, -1);
  const logs = raw
    .map((entry) => { try { return JSON.parse(entry); } catch { return null; } })
    .filter(Boolean)
    .reverse(); // newest first

  return NextResponse.json({ logs, count: logs.length });
}
