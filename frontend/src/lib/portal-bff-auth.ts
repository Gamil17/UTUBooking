/**
 * Server-side portal JWT verifier — used in Next.js API routes under /api/pro/*.
 *
 * Manually verifies an HMAC-SHA256 JWT using the same JWT_SECRET as the
 * auth service, without requiring any additional npm package.
 *
 * Only passes for tokens with role='corporate' and a valid corporate_account_id.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export interface PortalClaims {
  sub:                  string;  // user.id
  email:                string;
  role:                 'corporate';
  corporate_account_id: string;
  exp:                  number;
}

export function verifyPortalToken(req: NextRequest): PortalClaims | null {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  const secret = process.env.JWT_SECRET ?? '';
  if (!secret) return null;

  // Recompute signature
  const expected = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  // Timing-safe comparison — protect against timing attacks
  try {
    const expectedBuf = Buffer.from(expected);
    const actualBuf   = Buffer.from(sigB64);
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null;
  } catch {
    return null;
  }

  // Decode and validate payload
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    if (payload.role !== 'corporate')                     return null;
    if (!payload.corporate_account_id)                    return null;
    return payload as PortalClaims;
  } catch {
    return null;
  }
}
