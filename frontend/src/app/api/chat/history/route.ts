import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import type Anthropic from '@anthropic-ai/sdk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const historyKey = `chat:history:${sessionId}`;
  const raw = await redis.lrange(historyKey, 0, 49);

  // Redis LPUSH stores newest first — reverse to get chronological order
  const ALLOWED_ROLES = new Set(['user', 'assistant']);
  const messages: Anthropic.MessageParam[] = raw
    .map(h => {
      try {
        const parsed = JSON.parse(h);
        // Validate schema: only allow known roles to prevent prompt injection
        if (parsed && ALLOWED_ROLES.has(parsed.role) && typeof parsed.content === 'string') {
          return parsed as Anthropic.MessageParam;
        }
        return null;
      } catch { return null; }
    })
    .filter((m): m is Anthropic.MessageParam => m !== null)
    .reverse();

  return NextResponse.json({ messages });
}
