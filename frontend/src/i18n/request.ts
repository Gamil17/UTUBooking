import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { parseTenantHeader } from '@/lib/tenant';
import { LOCALES, DEFAULT_LOCALE, type Locale } from './config';

/**
 * next-intl messages-only mode (no URL routing).
 * Reads the tenant locale injected by Edge Middleware via x-tenant-config,
 * maps it to supported UI locales, then imports the matching JSON message bundle.
 *
 * Locale priority:
 *  1. Exact match in LOCALES array (e.g. "de", "pl", "pt-BR")
 *  2. Hyphenated exact match (e.g. "en-GB", "es-419")
 *  3. Base-language fallback (e.g. "en-AU" → "en")
 *  4. Explicit overrides for known regional variants
 *  5. Default: "en"
 */
function mapTenantLocaleToUI(tenantLocale: string): Locale {
  // 1. Exact match (handles "de", "nl", "pl", "es", "pt-BR", "es-419", "en-GB", etc.)
  if (LOCALES.includes(tenantLocale as Locale)) {
    return tenantLocale as Locale;
  }

  const base = tenantLocale.split('-')[0].toLowerCase();
  const lower = tenantLocale.toLowerCase();

  // 2a. American English + Canadian English → en-US
  if (lower === 'en-us' || lower === 'en-ca') return 'en-US';

  // 2b-can. Canadian French → fr (Quebec Law 25 / Bill 96; no separate fr-CA bundle needed)
  if (lower === 'fr-ca') return 'fr';

  // 2b. British English variants → en-GB
  if (lower === 'en-gb' || lower === 'en-ie' || lower === 'en-au' || lower === 'en-nz') {
    return 'en-GB';
  }

  // 3. Latin American Spanish variants → es-419
  //    (es-MX, es-AR, es-CO, es-CL, es-PE, es-VE, es-419)
  if (base === 'es' && lower !== 'es') {
    // es-ES (Spain) → es; all other es-* → es-419
    if (lower === 'es-es') return 'es';
    return 'es-419';
  }

  // 4. Brazilian Portuguese → pt-BR; European Portuguese → es fallback to 'en'
  if (base === 'pt') {
    if (lower === 'pt-br') return 'pt-BR';
    // pt-PT not in our locale set — fall through to default
    return DEFAULT_LOCALE;
  }

  // 5. Base-language matches — covers dialects not explicitly listed above
  if (base === 'de') return 'de';
  if (base === 'it') return 'it';
  if (base === 'nl') return 'nl';
  if (base === 'pl') return 'pl';
  if (base === 'es') return 'es';
  if (base === 'tr') return 'tr';
  if (base === 'id') return 'id';
  if (base === 'ms') return 'ms';
  if (base === 'ur') return 'ur';
  if (base === 'hi') return 'hi';
  if (base === 'fa') return 'fa';
  if (base === 'fr') return 'fr';
  if (base === 'ar') return 'ar';
  if (base === 'en') return 'en';

  return DEFAULT_LOCALE;
}

// Country code → preferred locale override (used by middleware for US users)
// Separate from tenant locale mapping — handles IP-based geolocation routing.
export function countryCodeToLocale(countryCode: string): Locale | null {
  const map: Partial<Record<string, Locale>> = {
    US: 'en-US',
    GB: 'en-GB',
    DE: 'de',
    FR: 'fr',
    IT: 'it',
    NL: 'nl',
    PL: 'pl',
    ES: 'es',
    TR: 'tr',
    ID: 'id',
    MY: 'ms',
    PK: 'ur',
    IN: 'hi',
    IR: 'fa',
    SA: 'ar',
    AE: 'ar',
    BR: 'pt-BR',
  };
  return map[countryCode] ?? null;
}

export default getRequestConfig(async () => {
  const headersList = await headers();

  // x-locale-override: set by middleware for Quebec French (fr) and Canadian English (en-US)
  const localeOverride = headersList.get('x-locale-override');
  if (localeOverride && LOCALES.includes(localeOverride as Locale)) {
    const messages = (await import(`../../locales/${localeOverride}.json`)).default;
    return { locale: localeOverride as Locale, messages };
  }

  const tenantConfig = parseTenantHeader(headersList.get('x-tenant-config'));
  const locale = mapTenantLocaleToUI(tenantConfig.locale);
  const messages = (await import(`../../locales/${locale}.json`)).default;

  return { locale, messages };
});
