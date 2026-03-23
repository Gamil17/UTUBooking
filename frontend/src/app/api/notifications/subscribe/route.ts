import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const PUSH_SUB_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** POST /api/notifications/subscribe — persist push subscription to Redis */
export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = (await req.json()) as {
      subscription: PushSubscriptionJSON;
      userId: string;
    };

    if (!subscription?.endpoint || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription or userId' },
        { status: 400 }
      );
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
    const { userId } = (await req.json()) as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    await redis.del(`push:sub:${userId}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications/subscribe] DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
