/**
 * GET  /api/admin/settings — read platform settings from Redis
 * PUT  /api/admin/settings — persist platform settings to Redis
 *
 * Settings are stored as JSON at Redis key `settings:platform`.
 * Falls back to hardcoded defaults if key is absent.
 *
 * Backend services read the same Redis key (with 60 s in-process cache)
 * so changes here take effect within ~1 minute across all services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';
import redis from '@/lib/redis';

const REDIS_KEY = 'settings:platform';

const DEFAULTS = {
  notifications: {
    recovery_delay_hours:    2,
    reminder_hours_before:   24,
    max_recovery_attempts:   3,
    price_alert_threshold:   10,
  },
  pricing: {
    hajj_surge_multiplier:   1.8,
    umrah_peak_multiplier:   1.3,
    demand_window_days:      30,
    min_confidence_to_apply: 75,
  },
  maintenance: {
    mode:    false,
    message: '',
  },
};

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const raw = await redis.get(REDIS_KEY);
    const data = raw ? JSON.parse(raw) : DEFAULTS;
    return NextResponse.json({ data });
  } catch {
    // Redis unavailable — return defaults so the UI still renders
    return NextResponse.json({ data: DEFAULTS });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  // Merge with defaults to ensure all required keys are present
  const merged = {
    notifications: { ...DEFAULTS.notifications, ...body.notifications },
    pricing:       { ...DEFAULTS.pricing,       ...body.pricing },
    maintenance:   { ...DEFAULTS.maintenance,   ...body.maintenance },
  };

  try {
    await redis.set(REDIS_KEY, JSON.stringify(merged));
    return NextResponse.json({ data: merged });
  } catch {
    return NextResponse.json({ error: 'REDIS_UNAVAILABLE' }, { status: 503 });
  }
}
