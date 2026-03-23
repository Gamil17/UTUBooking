import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await redis.lrange('ai:logs', -100, -1);
  const logs = raw.map(entry => {
    try { return JSON.parse(entry); } catch { return null; }
  }).filter(Boolean);

  return NextResponse.json({ logs, count: logs.length });
}
