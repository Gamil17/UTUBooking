/**
 * POST /api/compliance/erasure
 *
 * Records a DPDP Act 2023 §13 right-to-erasure request.
 * The actual deletion is performed by the DPO / ops team within 30 days.
 *
 * Also supports GDPR (EU) and KVKK (Turkey) erasure requests via the same endpoint.
 *
 * Storage:
 *   Redis RPUSH dpdp:erasure:queue  — pending erasure queue (permanent, no TTL)
 *   Redis SET   dpdp:erasure:{userId} — latest request per user
 *
 * The DPO reviews this queue and marks completion in the DB
 * (dpdp_erasure_completed_at column — see migration 20260324000025).
 *
 * Body: { userId, email, law: 'DPDP' | 'GDPR' | 'KVKK', reason? }
 */

import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

interface ErasureBody {
  userId:   string;
  email:    string;
  law?:     string;
  reason?:  string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ErasureBody;
  try {
    body = await request.json() as ErasureBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, email, law = 'DPDP', reason } = body;

  const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const VALID_LAWS = new Set(['dpdp', 'gdpr', 'kvkk', 'lgpd', 'ccpa', 'pipeda', 'pdpa']);

  if (!userId?.trim() || !UUID_RE.test(userId.trim())) {
    return NextResponse.json({ error: 'userId must be a valid UUID' }, { status: 400 });
  }
  if (!email?.trim() || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'valid email is required' }, { status: 400 });
  }
  if (!VALID_LAWS.has((law ?? '').toLowerCase())) {
    return NextResponse.json({ error: `Unsupported law: ${law}` }, { status: 400 });
  }

  const ip = (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );

  const record = JSON.stringify({
    userId:    userId.trim(),
    email:     email.trim().toLowerCase(),
    law,
    reason:    reason?.trim() ?? '',
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    requestedAt: new Date().toISOString(),
    status:    'pending',  // DPO updates this to 'completed' in DB
  });

  const prefix      = law.toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeUserId  = userId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  try {
    // Queue for DPO processing (permanent — no TTL)
    await redis.rpush(`${prefix}:erasure:queue`, record);

    // Per-user record — 365-day TTL (overwritten if user re-requests)
    await redis.setex(`${prefix}:erasure:${safeUserId}`, 60 * 60 * 24 * 365, record);
  } catch (err) {
    console.error('[erasure] Redis write failed:', err);
    return NextResponse.json({ ok: false, warning: 'Queue unavailable' }, { status: 207 });
  }

  return NextResponse.json({
    ok:      true,
    message: 'Erasure request received. Your data will be deleted within 30 days per DPDP §13.',
    messageHi: 'आपका अनुरोध प्राप्त हुआ। DPDP §13 के अनुसार 30 दिनों के भीतर आपका डेटा हटाया जाएगा।',
  });
}
