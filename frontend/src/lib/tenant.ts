/**
 * Tenant configuration types and utilities for white-label B2B partners.
 * Used by middleware.ts (edge), layout.tsx (RSC), and TenantProvider (client).
 */

export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  locale: string;
  enabledModules: string[];
  hidePlatformBranding: boolean;
}

/** UTUBooking own-brand defaults — used when no partner tenant matches. */
export const DEFAULT_TENANT: TenantConfig = {
  id: 'utubooking',
  slug: 'utubooking',
  name: 'UTUBooking',
  logoUrl: null,
  primaryColor: '#1E3A5F',
  secondaryColor: '#111827',
  currency: 'SAR',
  locale: 'en',
  enabledModules: ['hotel', 'flight', 'car'],
  hidePlatformBranding: false,
};

/** Parse the x-tenant-config header set by middleware.ts into a TenantConfig. */
export function parseTenantHeader(headerValue: string | null): TenantConfig {
  if (!headerValue) return DEFAULT_TENANT;
  try {
    const raw = JSON.parse(decodeURIComponent(headerValue));
    return {
      id:                   raw.id,
      slug:                 raw.slug,
      name:                 raw.name,
      logoUrl:              raw.logo_url ?? null,
      primaryColor:         raw.primary_color ?? DEFAULT_TENANT.primaryColor,
      secondaryColor:       raw.secondary_color ?? DEFAULT_TENANT.secondaryColor,
      currency:             raw.currency ?? DEFAULT_TENANT.currency,
      locale:               raw.locale ?? DEFAULT_TENANT.locale,
      enabledModules:       raw.enabled_modules ?? DEFAULT_TENANT.enabledModules,
      hidePlatformBranding: raw.hide_platform_branding ?? false,
    };
  } catch {
    return DEFAULT_TENANT;
  }
}

/** Return HTML lang and dir attributes based on tenant locale. */
export function getLocaleAttrs(locale: string): { lang: string; dir: 'ltr' | 'rtl' } {
  const base = locale.split('-')[0].toLowerCase();
  const rtlBases = ['ar', 'ur', 'fa', 'he', 'yi'];
  return {
    lang: locale,
    dir:  rtlBases.includes(base) ? 'rtl' : 'ltr',
  };
}
