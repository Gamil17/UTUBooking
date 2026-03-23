/**
 * POST /api/compliance/consent
 *
 * Records a KVKK consent decision for audit purposes.
 * KVKK requires proof of consent with timestamp, IP, and version.
 *
 * Storage:
 *  - Redis RPUSH kvkk:consent:log  — ordered audit log (no TTL; permanent)
 *  - Redis SET   kvkk:consent:{ip} — latest decision per IP (90-day TTL)
 *
 * Body: { consentGiven: boolean, locale: string, consentVersion: string, law: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

interface ConsentBody {
  consentGiven:    boolean;
  locale:          string;
  consentVersion?: string;
  law?:            string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ConsentBody;
  try {
    body = await request.json() as ConsentBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { consentGiven, locale, consentVersion = '1.0', law = 'KVKK' } = body;

  if (typeof consentGiven !== 'boolean') {
    return NextResponse.json({ error: 'consentGiven must be boolean' }, { status: 400 });
  }

  // Resolve visitor IP for audit record
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const record = JSON.stringify({
    consentGiven,
    locale,
    consentVersion,
    law,
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    timestamp: new Date().toISOString(),
  });

  // Use law-specific Redis key prefix so KVKK and DPDP logs are separate
  const prefix = (law ?? 'KVKK').toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    // Append to permanent audit log (data law requires records for duration of data processing)
    await redis.rpush(`${prefix}:consent:log`, record);

    // Store latest decision per IP — 90-day TTL (overwritten on re-consent)
    await redis.setex(`${prefix}:consent:${ip}`, 60 * 60 * 24 * 90, record);
  } catch (err) {
    // Log the failure but don't block the user — cookie was already set client-side.
    console.error('[kvkk-consent] Redis write failed:', err);
    return NextResponse.json({ ok: false, warning: 'Audit log unavailable' }, { status: 207 });
  }

  return NextResponse.json({ ok: true });
}
