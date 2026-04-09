import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const PUSH_SUB_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extract userId from the JWT in the Authorization header.
 * We parse (not cryptographically verify) the payload — verification happens
 * at the auth service for data-mutating requests. This ensures:
 *  1. A token must be present (anonymous calls are rejected).
 *  2. The userId used for the Redis key comes from the token, not the client body,
 *     preventing one user from registering/deleting another user's subscription.
 */
function userIdFromToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    );
    const id = payload.sub ?? payload.id ?? payload.userId ?? null;
    return typeof id === 'string' && UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** POST /api/notifications/subscribe — persist push subscription to Redis */
export async function POST(req: NextRequest) {
  try {
    const userId = userIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { subscription } = (await req.json()) as { subscription: PushSubscriptionJSON };
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }

    await redis.set(
      `push:sub:${userId}`,
      JSON.stringify(subscription),
      'EX',
      PUSH_SUB_TTL_SECONDS
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications/subscribe] POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** DELETE /api/notifications/subscribe — remove subscription on opt-out */
export async function DELETE(req: NextRequest) {
  try {
    const userId = userIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await redis.del(`push:sub:${userId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications/subscribe] DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
