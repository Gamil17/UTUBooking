// frontend/src/i18n/config.ts
// Supports Phase 3 (fr) + Phase 5, 6, and 7 languages

export const LOCALES = ['en','ar','fr','tr','id','ms','ur','hi','fa'] as const;
export type Locale = typeof LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';

// RTL languages — Arabic, Urdu, Farsi
export const RTL_LOCALES: Locale[] = ['ar','ur','fa'];
export const isRTL = (locale: Locale) => RTL_LOCALES.includes(locale);

// Font per language — CRITICAL: Urdu uses Nastaliq, NOT standard Arabic font
export const LOCALE_FONTS: Record<Locale, string> = {
  en: 'Inter, sans-serif',
  ar: 'Noto Sans Arabic, sans-serif',
  fr: 'Inter, sans-serif',        // French uses standard Latin
  tr: 'Inter, sans-serif',        // Turkish uses standard Latin
  id: 'Inter, sans-serif',        // Bahasa uses standard Latin
  ms: 'Inter, sans-serif',        // Malay uses standard Latin
  ur: 'Noto Nastaliq Urdu, serif', // Urdu — Nastaliq calligraphic script
  hi: 'Noto Sans Devanagari, sans-serif', // Hindi — Devanagari script
  fa: 'Vazirmatn, sans-serif',    // Farsi/Persian — Perso-Arabic script
};

// Currency per market
export const LOCALE_CURRENCY: Record<Locale, string> = {
  en:'USD', ar:'SAR', fr:'EUR', tr:'TRY', id:'IDR', ms:'MYR', ur:'PKR', hi:'INR', fa:'IRR'
};
