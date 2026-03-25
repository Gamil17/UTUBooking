import { NextRequest, NextResponse } from 'next/server';
import type { TenantConfig } from '@/lib/tenant';

const WHITELABEL_SERVICE_URL = process.env.WHITELABEL_SERVICE_URL || 'http://whitelabel-service:3009';

/** In-memory cache: domain → { config, expires } — 60s TTL, max 200 entries */
const tenantCache = new Map<string, { config: TenantConfig; expires: number }>();
const CACHE_MAX = 200;

/**
 * Extract the full host (including port for local dev) from the request.
 */
function extractDomain(request: NextRequest): string {
  return request.headers.get('host') ?? '';
}

/**
 * Resolve tenant config from whitelabel-service with a 60s in-memory cache.
 * Returns null for the UTUBooking main domain (no tenant = own brand).
 */
async function resolveTenant(domain: string): Promise<TenantConfig | null> {
  // Skip resolution for UTUBooking's own domains and local dev
  const mainDomains = ['utubooking.com', 'www.utubooking.com', 'localhost:3000', 'localhost'];
  // Fix: use correct OR logic — exact match OR is a subdomain of a main domain
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

    // Evict oldest entry if at capacity (simple FIFO eviction)
    if (tenantCache.size >= CACHE_MAX) {
      tenantCache.delete(tenantCache.keys().next().value!);
    }
    tenantCache.set(domain, { config, expires: now + 60_000 });
    return config;
  } catch {
    // Non-fatal: fallback to main UTUBooking brand
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const domain = extractDomain(request);
  const tenantConfig = await resolveTenant(domain);

  const response = NextResponse.next();

  if (tenantConfig) {
    response.headers.set('x-tenant-id', tenantConfig.id);
    response.headers.set('x-tenant-config', encodeURIComponent(JSON.stringify(tenantConfig)));
  }

  // Propagate visitor country code for compliance banner targeting (KVKK, GDPR, etc.)
  // Cloudflare sets CF-IPCountry; Vercel sets x-vercel-ip-country. Both are ISO 3166-1 alpha-2.
  const countryCode =
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-vercel-ip-country') ??
    '';
  if (countryCode) {
    response.headers.set('x-country-code', countryCode);
  }

  // Quebec French routing — Law 25 / Bill 96 require French interface for QC residents.
  // Detection: Cloudflare cf-region-code header (QC) OR Accept-Language: fr-CA/fr-*.
  // Sets x-locale-override: fr so request.ts uses the French message bundle.
  const regionCode    = request.headers.get('cf-region-code') ?? '';
  const acceptLang    = request.headers.get('accept-language') ?? '';
  const isQuebec      = countryCode === 'CA' && regionCode === 'QC';
  const isFrenchCA    = acceptLang.toLowerCase().startsWith('fr-ca') ||
                        acceptLang.toLowerCase().startsWith('fr-');
  if (isQuebec || (countryCode === 'CA' && isFrenchCA)) {
    response.headers.set('x-locale-override', 'fr');
  } else if (countryCode === 'CA') {
    response.headers.set('x-locale-override', 'en-US');
  }

  return response;
}

export const config = {
  matcher: [
    // Match page routes only — exclude static assets, images, api routes, and known static files
    '/((?!_next/static|_next/image|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json).*)',
  ],
};
