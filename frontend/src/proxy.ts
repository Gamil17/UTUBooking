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

// ── Admin auth guard ──────────────────────────────────────────────────────────
const ADMIN_COOKIE = 'utu_admin_token';

function checkAdminAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Only guard /admin paths — exempt /admin/login and /api/admin/auth
  if (!pathname.startsWith('/admin')) return null;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login')) return null;

  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const cookie      = request.cookies.get(ADMIN_COOKIE)?.value ?? '';

  if (!adminSecret || cookie !== adminSecret) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return null;
}

export async function proxy(request: NextRequest) {
  // Admin guard runs first — short-circuits before tenant resolution
  const adminRedirect = checkAdminAuth(request);
  if (adminRedirect) return adminRedirect;

  const domain = extractDomain(request);
  const tenantConfig = await resolveTenant(domain);

  // ── Build modified request headers ────────────────────────────────────────
  // IMPORTANT: In Next.js App Router, headers() in server components reads the
  // INCOMING REQUEST headers, not response headers. We must pass custom data via
  // NextResponse.next({ request: { headers } }) — not response.headers.set().
  const requestHeaders = new Headers(request.headers);

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

  // Pass modified request headers to server components
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json).*)',
  ],
};
