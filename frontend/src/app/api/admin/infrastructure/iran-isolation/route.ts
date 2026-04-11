/**
 * GET /api/admin/infrastructure/iran-isolation
 *
 * BFF proxy — forwards to admin service iran isolation check.
 * Runs 5 OFAC compliance checks:
 *   1. Cross-region data audit  — no IR records in non-Iran DB shards
 *   2. Auth token isolation     — no Iran-origin sessions in shared Redis
 *   3. Analytics event isolation — no fa-locale events in shared analytics
 *   4. API gateway routing      — Iran gateway on separate infrastructure
 *   5. Finance report isolation — no IRR/Iran data in shared finance tables
 *
 * FAIL results must be escalated to Legal Agent within 24 hours.
 * See legal/iran/feasibility-brief.md
 *
 * Authorization: admin cookie (utu_admin_token) — same as all admin BFF routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${ADMIN_SERVICE_URL}/api/admin/infrastructure/iran-isolation`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
        },
        signal: AbortSignal.timeout(90_000), // checks hit all DB shards + Redis — allow 90s
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'ADMIN_SERVICE_UNAVAILABLE', detail: message },
      { status: 503 }
    );
  }
}
