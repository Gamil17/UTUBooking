import { NextRequest, NextResponse } from 'next/server';
import type { TenantConfig } from '@/lib/tenant';

const WHITELABEL_SERVICE_URL = process.env.WHITELABEL_SERVICE_URL || 'http://whitelabel-service:3009';

/** In-memory cache: domain → { config, expires } — 60s TTL, max 200 entries */
const tenantCache = new Map<string, { config: TenantConfig; expires: number }>();
const CACHE_MAX = 200;

function extractDomain(request: NextRequest): string {
  return request.headers.get('host') ?? '';
}

async function resolveTenant(domain: string): Promise<TenantConfig | null> {
  const mainDomains = ['utubooking.com', 'www.utubooking.com', 'localhost:3000', 'localhost'];
  if (mainDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return null;
  }

  const now = Date.now();
  const cached = tenantCache.get(domain);
  if (cached && cached.expires > now) return cached.config;

  try {
    const res = await fetch(
      `${WHITELABEL_SERVICE_URL}/api/tenants/by-domain?domain=${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return null;
    const config: TenantConfig = await res.json();

    if (tenantCache.size >= CACHE_MAX) {
      tenantCache.delete(tenantCache.keys().next().value!);
    }
    tenantCache.set(domain, { config, expires: now + 60_000 });
    return config;
  } catch {
    return null;
  }
}

// User locale cookie name — written by LocaleSwitcher component on the client
const USER_LOCALE_COOKIE = 'utu_locale';

// Affiliate referral cookie — 30-day attribution window
const AFFILIATE_REF_COOKIE = 'utu_ref';
const AFFILIATE_REF_REGEX  = /^UTU-[A-Z0-9]{1,10}-[A-Z0-9]{1,6}$/i;

// ── Admin auth guard ──────────────────────────────────────────────────────────
const ADMIN_COOKIE = 'utu_admin_token';

/**
 * Derive the expected session token using the Web Crypto API
 * (Edge runtime compatible — no Node.js 'crypto' module needed).
 * Matches the derivation in /api/admin/auth and admin-bff-auth.ts:
 *   sha256("admin-session:<ADMIN_SECRET>") → hex string
 */
async function deriveAdminToken(secret: string): Promise<string> {
  const enc    = new TextEncoder();
  const buf    = await crypto.subtle.digest('SHA-256', enc.encode(`admin-session:${secret}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Only guard /admin paths — exempt /admin/login
  if (!pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/admin/login')) return null;

  const adminSecret = process.env.ADMIN_SECRET ?? '';
  if (!adminSecret) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const cookie        = request.cookies.get(ADMIN_COOKIE)?.value ?? '';
  const expectedToken = await deriveAdminToken(adminSecret);

  if (!cookie || cookie !== expectedToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return null;
}

export async function middleware(request: NextRequest) {
  // Admin guard runs first — short-circuits before tenant resolution
  const adminRedirect = await checkAdminAuth(request);
  if (adminRedirect) return adminRedirect;

  const domain = extractDomain(request);
  const tenantConfig = await resolveTenant(domain);

  // ── Build modified request headers ────────────────────────────────────────
  // IMPORTANT: In Next.js App Router, headers() in server components reads the
  // INCOMING REQUEST headers, not response headers. We must pass custom data via
  // NextResponse.next({ request: { headers } }) — not response.headers.set().
  const requestHeaders = new Headers(request.headers);

  // Expose the current pathname to server components (used by root layout for
  // maintenance-mode check and other path-sensitive server-side logic).
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // Tenant white-label config
  if (tenantConfig) {
    requestHeaders.set('x-tenant-id', tenantConfig.id);
    requestHeaders.set('x-tenant-config', encodeURIComponent(JSON.stringify(tenantConfig)));
  }

  // Visitor country code for compliance banners (KVKK, GDPR, CCPA, DPDP, etc.)
  // Cloudflare: CF-IPCountry | Vercel: x-vercel-ip-country — both ISO 3166-1 alpha-2
  const countryCode =
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-vercel-ip-country') ??
    '';
  if (countryCode) {
    requestHeaders.set('x-country-code', countryCode);
  }

  // ── Locale resolution priority ────────────────────────────────────────────
  // 1. Quebec French — legal requirement (Law 25 / Bill 96), overrides user pref
  // 2. Canadian English
  // 3. User's manual language cookie (set by LocaleSwitcher)
  const regionCode = request.headers.get('cf-region-code') ?? '';
  const acceptLang = request.headers.get('accept-language') ?? '';
  const isQuebec   = countryCode === 'CA' && regionCode === 'QC';
  const isFrenchCA = acceptLang.toLowerCase().startsWith('fr-ca') ||
                     acceptLang.toLowerCase().startsWith('fr-');

  if (isQuebec || (countryCode === 'CA' && isFrenchCA)) {
    requestHeaders.set('x-locale-override', 'fr');
  } else if (countryCode === 'CA') {
    requestHeaders.set('x-locale-override', 'en-US');
  } else {
    // User's manually chosen language — set by LocaleSwitcher via cookie
    const userLocale = request.cookies.get(USER_LOCALE_COOKIE)?.value;
    if (userLocale) {
      requestHeaders.set('x-locale-override', userLocale);
      requestHeaders.set('x-user-locale', userLocale);
    }
  }

  // ── Affiliate referral tracking ───────────────────────────────────────────
  // If a ?ref=UTU-XXXXX-XXXX query param is present AND the cookie isn't already
  // set (first-touch attribution), stamp the cookie and signal the client to
  // fire a click-tracking call.
  const incomingRef  = request.nextUrl.searchParams.get('ref') ?? '';
  const existingRef  = request.cookies.get(AFFILIATE_REF_COOKIE)?.value ?? '';
  const isValidRef   = AFFILIATE_REF_REGEX.test(incomingRef);

  if (isValidRef && !existingRef) {
    // Pass the ref to the client via a request header so AffiliateRefTracker
    // can pick it up and fire the tracking POST without a full page refresh.
    requestHeaders.set('x-affiliate-ref', incomingRef.toUpperCase());
  } else if (existingRef) {
    // Forward existing cookie value so server components can read it
    requestHeaders.set('x-affiliate-ref', existingRef);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Stamp the 30-day cookie on the response when a new valid ref arrives
  if (isValidRef && !existingRef) {
    response.cookies.set(AFFILIATE_REF_COOKIE, incomingRef.toUpperCase(), {
      maxAge:   30 * 24 * 60 * 60, // 30 days
      path:     '/',
      httpOnly: true,
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json).*)',
  ],
};
