/**
 * POST /api/admin/notifications/send-to-user
 *
 * BFF proxy → notification service POST /api/admin/notifications/send-to-user
 *
 * Body: { email, name, subject, bodyHtml }
 *
 * Sends a one-off custom email to a specific customer.
 * The notification service logs the send to email_log.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const NOTIFICATION_SVC = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const upstream = await fetch(
      `${NOTIFICATION_SVC}/api/admin/notifications/send-to-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? '',
        },
        body:   JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'NOTIFICATION_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
