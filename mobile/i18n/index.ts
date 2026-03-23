import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from './en';
import ar from './ar';
import fr from './fr';
import tr from './tr';
import id from './id';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Lang = 'en' | 'ar' | 'fr' | 'tr' | 'id';

// Flatten the nested translation object to the shape react-i18next expects.
// We expose the raw objects as "resources" so screens can import them directly
// via useTranslation() — but we also export a typed helper for convenience.
const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  tr: { translation: tr },
  id: { translation: id },
} as const;

export type Translations = typeof en;

// ─── Init ─────────────────────────────────────────────────────────────────────
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng:          'en',
    fallbackLng:  'en',
    // Disable key-based interpolation — our strings are plain values or
    // typed functions, not ICU / {{var}} templates.
    interpolation: { escapeValue: false },
    // react-i18next: keep Suspense off; we render synchronously.
    react: { useSuspense: false },
  });

// ─── RTL helper ───────────────────────────────────────────────────────────────
/**
 * Call this whenever the active language changes.
 * Forces RN's layout engine to mirror to RTL for Arabic and LTR for English.
 * The app must be restarted (or use Expo's `Updates.reloadAsync`) for the
 * change to propagate fully to native views.
 */
export function applyRTL(lang: Lang): void {
  const shouldBeRTL = lang === 'ar';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
  }
}

/** Returns true for locales that measure distance in km by convention. */
export function usesKilometres(lang: Lang): boolean {
  return lang === 'tr' || lang === 'id';
}

/**
 * Switch language + apply RTL direction.
 * Returns a Promise that resolves when i18next has finished changing language.
 */
export async function switchLanguage(lang: Lang): Promise<void> {
  await i18n.changeLanguage(lang);
  applyRTL(lang);
}

export default i18n;
