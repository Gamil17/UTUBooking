// frontend/src/i18n/config.ts
// Phase 8-12 update: 8 → 16 locales

export const LOCALES = [
  // Phase 1-7 (Middle East, South/SE Asia)
  'en', 'ar', 'fr', 'tr', 'id', 'ms', 'ur', 'hi', 'fa',
  // Phase 8 — Europe (UK + EU mainland)
  'de',     // German — eu-central-1 (Frankfurt)
  'en-GB',  // British English — eu-west-2 (London)
  'it',     // Italian — eu-central-1
  'nl',     // Dutch — eu-central-1
  // Phase 9 — More Europe
  'pl',     // Polish — eu-central-1
  'es',     // Spanish (Castilian) — eu-central-1 / eu-west-1
  'sv',     // Swedish
  'ru',     // Russian
  // Phase 10 — US Launch
  'en-US',  // American English — us-east-1 (Virginia); USD + US date format
  // Phase 12 — Americas
  'pt-BR',  // Brazilian Portuguese — sa-east-1 (São Paulo)
  'es-419', // Latin American Spanish — sa-east-1 + us-east-1
  // Phase 13 — East Asia & Southeast Asia expansion
  'ja',     // Japanese — ap-northeast-1 (Tokyo)
  'ko',     // Korean — ap-northeast-2 (Seoul)
  'th',     // Thai — ap-southeast-1 (Singapore)
  'vi',     // Vietnamese — ap-southeast-1
  'zh-CN',  // Simplified Chinese — ap-east-1 (Hong Kong) / cn-north-1
  'zh-HK',  // Traditional Chinese (HK) — ap-east-1
  'zh-TW',  // Traditional Chinese (TW) — ap-northeast-1
] as const;

export type Locale = typeof LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';

// RTL languages — Arabic, Urdu, Farsi
export const RTL_LOCALES: Locale[] = ['ar', 'ur', 'fa'];
export const isRTL = (locale: Locale) => RTL_LOCALES.includes(locale);

// CJK languages requiring specific font handling
export const CJK_LOCALES: Locale[] = ['ja', 'ko', 'zh-CN', 'zh-HK', 'zh-TW'];

// Font per language
// CRITICAL: Urdu uses Nastaliq (NOT standard Arabic font)
// European languages all use Inter (Latin script)
export const LOCALE_FONTS: Record<Locale, string> = {
  // Phase 1-7
  en:       'Inter, sans-serif',
  ar:       'Noto Sans Arabic, sans-serif',
  fr:       'Inter, sans-serif',
  tr:       'Inter, sans-serif',
  id:       'Inter, sans-serif',
  ms:       'Inter, sans-serif',
  ur:       'Noto Nastaliq Urdu, serif',
  hi:       'Noto Sans Devanagari, sans-serif',
  fa:       'Vazirmatn, sans-serif',
  // Phase 8-12 — all Latin script
  de:       'Inter, sans-serif',
  'en-GB':  'Inter, sans-serif',
  'en-US':  'Inter, sans-serif',
  it:       'Inter, sans-serif',
  nl:       'Inter, sans-serif',
  pl:       'Inter, sans-serif',
  es:       'Inter, sans-serif',
  sv:       'Inter, sans-serif',
  ru:       'Inter, sans-serif',
  'pt-BR':  'Inter, sans-serif',
  'es-419': 'Inter, sans-serif',
  // Phase 13 — East Asia
  ja:       'Noto Sans JP, Inter, sans-serif',
  ko:       'Noto Sans KR, Inter, sans-serif',
  th:       'Noto Sans Thai, Inter, sans-serif',
  vi:       'Inter, sans-serif',
  'zh-CN':  'Noto Sans SC, Inter, sans-serif',
  'zh-HK':  'Noto Sans HK, Inter, sans-serif',
  'zh-TW':  'Noto Sans TC, Inter, sans-serif',
};

// Settlement currency per market locale
export const LOCALE_CURRENCY: Record<Locale, string> = {
  // Phase 1-7
  en:       'USD',
  ar:       'SAR',
  fr:       'EUR',
  tr:       'TRY',
  id:       'IDR',
  ms:       'MYR',
  ur:       'PKR',
  hi:       'INR',
  fa:       'IRR',
  // Phase 8-12
  de:       'EUR',
  'en-GB':  'GBP',
  'en-US':  'USD',
  it:       'EUR',
  nl:       'EUR',
  pl:       'PLN',
  es:       'EUR',
  'pt-BR':  'BRL',
  'es-419': 'USD', // Mixed LATAM — USD as display default; override per country via tenant config
  sv:       'SEK',
  ru:       'RUB',
  // Phase 13 — East Asia
  ja:       'JPY',
  ko:       'KRW',
  th:       'THB',
  vi:       'VND',
  'zh-CN':  'CNY',
  'zh-HK':  'HKD',
  'zh-TW':  'TWD',
};

// ── Phase 4: Country → Currency map ──────────────────────────────────────────
// 'ar' locale alone cannot distinguish SA/AE/JO/KW/BH/MA/TN — each has a
// different currency. Use this map when you have a country code (from IP geo,
// user profile, or white-label tenant config) to pick the right currency.
// Re-exported from formatting.ts for convenience; source of truth is there.
export { COUNTRY_CURRENCY } from '@/utils/formatting';

// Locale display names (for language picker UI)
export const LOCALE_NAMES: Record<Locale, string> = {
  en:       'English',
  ar:       'العربية',
  fr:       'Français',
  tr:       'Türkçe',
  id:       'Bahasa Indonesia',
  ms:       'Bahasa Melayu',
  ur:       'اردو',
  hi:       'हिन्दी',
  fa:       'فارسی',
  de:       'Deutsch',
  'en-GB':  'English (UK)',
  'en-US':  'English (US)',
  it:       'Italiano',
  nl:       'Nederlands',
  pl:       'Polski',
  es:       'Español',
  'pt-BR':  'Português (Brasil)',
  'es-419': 'Español (Latinoamérica)',
  sv:       'Svenska',
  ru:       'Русский',
  // Phase 13 — East Asia
  ja:       '日本語',
  ko:       '한국어',
  th:       'ภาษาไทย',
  vi:       'Tiếng Việt',
  'zh-CN':  '简体中文',
  'zh-HK':  '繁體中文 (HK)',
  'zh-TW':  '繁體中文 (TW)',
};
