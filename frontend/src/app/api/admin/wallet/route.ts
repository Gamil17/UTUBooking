/**
 * BFF: /api/admin/wallet
 *
 * GET ?view=stats    → wallet service GET /api/admin/wallet/stats
 * GET ?view=balances → wallet service GET /api/admin/wallet/balances (+ passthrough params)
 * GET ?view=user&userId=X → wallet service GET /api/admin/wallet/balances/:userId
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const WALLET_SERVICE = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3010';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const view             = searchParams.get('view') ?? 'stats';
  const secret           = process.env.ADMIN_SECRET ?? '';

  try {
    let upstreamUrl: string;

    if (view === 'user') {
      const userId = searchParams.get('userId');
      if (!userId) return NextResponse.json({ error: 'MISSING_USER_ID' }, { status: 400 });
      upstreamUrl = `${WALLET_SERVICE}/api/admin/wallet/balances/${encodeURIComponent(userId)}`;
    } else if (view === 'balances') {
      const qs = new URLSearchParams();
      for (const [k, v] of searchParams.entries()) {
        if (k !== 'view') qs.set(k, v);
      }
      upstreamUrl = `${WALLET_SERVICE}/api/admin/wallet/balances?${qs.toString()}`;
    } else {
      upstreamUrl = `${WALLET_SERVICE}/api/admin/wallet/stats`;
    }

    const res = await fetch(upstreamUrl, {
      headers: { 'x-admin-secret': secret },
      signal:  AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'WALLET_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
