/**
 * Shared admin BFF auth helper.
 *
 * Import `isAdminAuthorized` in any Next.js API route that should be
 * restricted to the admin UI. Validates the utu_admin_token cookie (SHA-256
 * of "admin-session:<ADMIN_SECRET>") or a raw Bearer ADMIN_SECRET header.
 *
 * In development with no ADMIN_SECRET set, all requests are allowed.
 */

import { NextRequest } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';

const COOKIE_NAME = 'utu_admin_token';

function safeEqual(a: string, b: string): boolean {
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

export function isAdminAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  if (!adminSecret) return process.env.NODE_ENV !== 'production';

  const derivedToken = createHash('sha256').update(`admin-session:${adminSecret}`).digest('hex');

  // Cookie auth (browser admin UI)
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  if (cookie && safeEqual(cookie, derivedToken)) return true;

  // Bearer auth (scripts / curl)
  const bearer = req.headers.get('authorization') ?? '';
  const token  = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (token && safeEqual(token, adminSecret)) return true;

  return false;
}

/** Build upstream auth header using server-side ADMIN_SECRET. */
export function upstreamAdminHeader(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}` };
}
