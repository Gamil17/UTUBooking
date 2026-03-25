/**
 * formatting.ts — Locale-aware price and number formatting for UTUBooking.
 *
 * Key rule: always use Intl.NumberFormat with the correct BCP-47 locale +
 * currency code. Never hardcode 'en-SA' or 'SAR' for non-Arabic locales.
 *
 * Indian numbering system (hi): uses South Asian grouping — 12,34,567
 * (lakh/crore) NOT Western 1,234,567. Intl.NumberFormat('hi-IN') handles
 * this automatically — do not implement manually.
 */

import { LOCALE_CURRENCY } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

// ── BCP-47 locale tags for Intl APIs ─────────────────────────────────────────
// These map our short locale codes to the full BCP-47 tags that Intl needs.
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  fr: 'fr-FR',
  tr: 'tr-TR',
  id: 'id-ID',
  ms: 'ms-MY',
  ur: 'ur-PK',
  hi: 'hi-IN',   // Indian numbering: 12,34,567 grouping via Intl
  fa: 'fa-IR',
  // EU/Global (Phase 8–12)
  de: 'de-DE',
  'en-GB': 'en-GB',
  it: 'it-IT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  'es-419': 'es-419',
};

// ── formatPrice ──────────────────────────────────────────────────────────────
/**
 * Format a price amount for the given locale with the correct currency symbol
 * and number grouping system.
 *
 * @example
 * formatPrice(1234567, 'hi')  // "₹12,34,567"  (Indian lakh/crore grouping)
 * formatPrice(1234567, 'en')  // "$1,234,567"
 * formatPrice(8400,    'ar')  // "٨٬٤٠٠ ر.س."
 * formatPrice(8400,    'ur')  // "PKR 8,400"
 * formatPrice(450000,  'id')  // "Rp 450.000"
 *
 * @param amount  - Raw numeric amount (no pre-formatting)
 * @param locale  - UTUBooking locale code (en/ar/fr/tr/id/ms/ur/hi/fa)
 * @param options - Optional overrides (currency, fractionDigits)
 */
export function formatPrice(
  amount: number,
  locale: Locale,
  options: { currency?: string; maximumFractionDigits?: number } = {},
): string {
  const currency = options.currency ?? LOCALE_CURRENCY[locale];
  const intlLocale = INTL_LOCALE[locale];
  const fractionDigits = options.maximumFractionDigits ?? defaultFractionDigits(currency);

  return new Intl.NumberFormat(intlLocale, {
    style:                 'currency',
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount);
}

// ── formatNumber ─────────────────────────────────────────────────────────────
/**
 * Format a plain number (no currency) using the locale's grouping system.
 * Use for distances, counts, quantities.
 *
 * @example
 * formatNumber(1234567, 'hi')  // "12,34,567"  (Indian grouping)
 * formatNumber(1234567, 'en')  // "1,234,567"
 * formatNumber(1234567, 'ar')  // "١٬٢٣٤٬٥٦٧"  (Eastern-Arabic numerals)
 */
export function formatNumber(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(amount);
}

// ── formatDistance ───────────────────────────────────────────────────────────
/**
 * Format a distance in metres to the correct unit + locale string.
 * Sub-1000m: display in metres. 1000m+: display in km with 1 decimal.
 *
 * @example
 * formatDistance(350,  'hi')  // "350 मीटर"
 * formatDistance(1200, 'ar')  // "١٫٢ كم"
 * formatDistance(350,  'en')  // "350 m"
 */
export function formatDistance(metres: number, locale: Locale): string {
  const intlLocale = INTL_LOCALE[locale];

  if (metres < 1000) {
    const n = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(metres);
    return `${n} ${DISTANCE_UNIT_M[locale]}`;
  }

  const km = metres / 1000;
  const n  = new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(km);
  return `${n} ${DISTANCE_UNIT_KM[locale]}`;
}

// ── Localised distance unit labels ───────────────────────────────────────────
const DISTANCE_UNIT_M: Record<Locale, string> = {
  en: 'm',
  ar: 'م',
  fr: 'm',
  tr: 'm',
  id: 'm',
  ms: 'm',
  ur: 'میٹر',
  hi: 'मीटर',
  fa: 'متر',
  // EU/Global (Phase 8–12) — all metric
  de: 'm',
  'en-GB': 'm',
  it: 'm',
  nl: 'm',
  pl: 'm',
  es: 'm',
  'pt-BR': 'm',
  'es-419': 'm',
};

const DISTANCE_UNIT_KM: Record<Locale, string> = {
  en: 'km',
  ar: 'كم',
  fr: 'km',
  tr: 'km',
  id: 'km',
  ms: 'km',
  ur: 'کلومیٹر',
  hi: 'कि.मी.',
  fa: 'کیلومتر',
  // EU/Global (Phase 8–12) — all metric
  de: 'km',
  'en-GB': 'km',
  it: 'km',
  nl: 'km',
  pl: 'km',
  es: 'km',
  'pt-BR': 'km',
  'es-419': 'km',
};

// ── Helper: sensible fraction digit defaults per currency ─────────────────────
function defaultFractionDigits(currency: string): number {
  // Zero-decimal currencies
  const zeroDecimal = ['IDR', 'IRR', 'PKR', 'INR'];
  if (zeroDecimal.includes(currency)) return 0;
  // Standard 2-decimal currencies
  return 2;
}
