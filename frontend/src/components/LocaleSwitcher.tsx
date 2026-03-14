'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LOCALES, type Locale } from '@/i18n/config';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  fr: 'Français',
  tr: 'Türkçe',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  ur: 'اردو',
  hi: 'हिन्दी',
  fa: 'فارسی',
};

export default function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleChangeLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Redirect to same page with new locale in header
    // This requires server-side handling via middleware
    const url = new URL(window.location.href);
    url.searchParams.set('locale', newLocale);
    window.location.href = url.toString();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={t('language')}
        title={LOCALE_NAMES[locale]}
      >
        <GlobeAltIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            {LOCALES.map((loc) => (
              <button
                key={loc}
                onClick={() => handleChangeLocale(loc)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex justify-between items-center ${
                  locale === loc
                    ? 'bg-green-50 text-green-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                role="menuitem"
              >
                <span>{LOCALE_NAMES[loc]}</span>
                {locale === loc && (
                  <span className="text-green-600 font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
