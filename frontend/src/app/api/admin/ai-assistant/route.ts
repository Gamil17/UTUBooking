/**
 * BFF proxy: POST /api/admin/ai-assistant
 *
 * Forwards the admin AI assistant chat request to the admin service.
 * Auth: validates utu_admin_token cookie or Bearer ADMIN_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN   = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const SECRET  = process.env.ADMIN_SECRET ?? '';
const TIMEOUT = 45_000; // AI calls can take up to 30s with multiple tool calls

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: string;
  try { body = await req.text(); } catch { body = '{}'; }

  try {
    const up = await fetch(`${ADMIN}/api/admin/ai-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': SECRET,
      },
      body,
      cache:  'no-store',
      signal: AbortSignal.timeout(TIMEOUT),
    });

    let json: unknown;
    try { json = await up.json(); } catch { json = {}; }
    return NextResponse.json(json, { status: up.status });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[bff/ai-assistant]', message);
    return NextResponse.json(
      { error: 'AI_SERVICE_UNAVAILABLE', message },
      { status: 503 },
    );
  }
}
