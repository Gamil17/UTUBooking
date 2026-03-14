import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { parseTenantHeader } from '@/lib/tenant';
import { LOCALES, DEFAULT_LOCALE, type Locale } from './config';

/**
 * next-intl messages-only mode (no URL routing).
 * Reads the tenant locale injected by Edge Middleware via x-tenant-config,
 * maps it to supported UI locales (en|ar|tr|id|ms|ur|hi|fa),
 * then imports the matching JSON message bundle.
 */
function mapTenantLocaleToUI(tenantLocale: string): Locale {
  const base = tenantLocale.split('-')[0].toLowerCase();

  // Direct match
  if (LOCALES.includes(base as Locale)) {
    return base as Locale;
  }

  // Regional fallbacks
  // Turkish: tr-* → tr
  if (base === 'tr') return 'tr';
  // Indonesian: id-* → id
  if (base === 'id') return 'id';
  // Malay: ms-* → ms
  if (base === 'ms') return 'ms';
  // Urdu: ur-* → ur
  if (base === 'ur') return 'ur';
  // Hindi: hi-* → hi
  if (base === 'hi') return 'hi';
  // Farsi/Persian: fa-* → fa
  if (base === 'fa') return 'fa';
  // French: fr-* → fr (from old 3-locale system)
  if (tenantLocale.startsWith('fr')) return 'fr';
  // Arabic: ar-* → ar
  if (tenantLocale.startsWith('ar')) return 'ar';

  // Default to English
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const headersList = await headers();
  const tenantConfig = parseTenantHeader(headersList.get('x-tenant-config'));

  const locale = mapTenantLocaleToUI(tenantConfig.locale);
  const messages = (await import(`../../locales/${locale}.json`)).default;

  return { locale, messages };
});
