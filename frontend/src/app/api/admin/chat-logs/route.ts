import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import redis from '@/lib/redis';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false; // buffers differ in length
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await redis.lrange('ai:logs', -100, -1);
  const logs = raw.map(entry => {
    try { return JSON.parse(entry); } catch { return null; }
  }).filter(Boolean);

  return NextResponse.json({ logs, count: logs.length });
}
