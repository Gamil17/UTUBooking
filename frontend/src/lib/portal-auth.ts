/**
 * Client-side portal auth utilities.
 * Token is stored in sessionStorage so it only lives for the browser session.
 * All functions are safe to call in both browser and SSR (they guard with typeof window).
 */

export const PORTAL_TOKEN_KEY = 'utu_access_token';

export interface PortalClaims {
  sub:                  string;
  email:                string;
  role:                 string;
  corporate_account_id: string;
  exp:                  number;
}

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(PORTAL_TOKEN_KEY);
}

export function clearPortalToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PORTAL_TOKEN_KEY);
  }
}

/** Decode JWT payload without verifying — client-side only for display purposes. */
export function decodePortalToken(token: string): PortalClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded  = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json    = atob(padded.padEnd(padded.length + (4 - padded.length % 4) % 4, '='));
    return JSON.parse(json) as PortalClaims;
  } catch {
    return null;
  }
}

export function isPortalTokenValid(token: string): boolean {
  const decoded = decodePortalToken(token);
  if (!decoded)                              return false;
  if (decoded.role !== 'corporate')          return false;
  if (!decoded.corporate_account_id)         return false;
  if (decoded.exp * 1000 < Date.now())       return false;
  return true;
}

/** Returns decoded claims if token exists and is valid, otherwise null. */
export function getPortalClaims(): PortalClaims | null {
  const token = getPortalToken();
  if (!token) return null;
  if (!isPortalTokenValid(token)) return null;
  return decodePortalToken(token);
}
