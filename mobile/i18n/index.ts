import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from './en';
import ar from './ar';
import fr from './fr';
import tr from './tr';
import id from './id';
import ms from './ms';
import fa from './fa';
import hi from './hi';
import ur from './ur';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Lang = 'en' | 'ar' | 'fr' | 'tr' | 'id' | 'ms' | 'fa' | 'hi' | 'ur';

const RTL_LANGS: Lang[] = ['ar', 'fa', 'ur'];

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  tr: { translation: tr },
  id: { translation: id },
  ms: { translation: ms },
  fa: { translation: fa },
  hi: { translation: hi },
  ur: { translation: ur },
} as const;

export type Translations = typeof en;

// ─── Init ─────────────────────────────────────────────────────────────────────
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng:          'en',
    fallbackLng:  'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

// ─── RTL helper ───────────────────────────────────────────────────────────────
/**
 * Call this whenever the active language changes.
 * Forces RN's layout engine to mirror to RTL for Arabic, Farsi, and Urdu.
 * The app must be restarted (or use Expo's `Updates.reloadAsync`) for the
 * change to propagate fully to native views.
 */
export function applyRTL(lang: Lang): void {
  const shouldBeRTL = RTL_LANGS.includes(lang);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
  }
}

/** Returns true for locales that measure distance in km by convention. */
export function usesKilometres(lang: Lang): boolean {
  return ['tr', 'id', 'ms', 'fa', 'hi', 'ur'].includes(lang);
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
