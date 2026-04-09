'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

const LANGUAGES = [
  { code: 'en',     label: 'EN', name: 'English' },
  { code: 'ar',     label: 'AR', name: 'العربية' },
  { code: 'de',     label: 'DE', name: 'Deutsch' },
  { code: 'es',     label: 'ES', name: 'Español' },
  { code: 'fa',     label: 'FA', name: 'فارسی' },
  { code: 'fr',     label: 'FR', name: 'Français' },
  { code: 'hi',     label: 'HI', name: 'हिन्दी' },
  { code: 'id',     label: 'ID', name: 'Bahasa Indonesia' },
  { code: 'it',     label: 'IT', name: 'Italiano' },
  { code: 'ja',     label: 'JA', name: '日本語' },
  { code: 'ko',     label: 'KO', name: '한국어' },
  { code: 'ms',     label: 'MS', name: 'Bahasa Melayu' },
  { code: 'nl',     label: 'NL', name: 'Nederlands' },
  { code: 'pl',     label: 'PL', name: 'Polski' },
  { code: 'pt-BR',  label: 'PT', name: 'Português' },
  { code: 'ru',     label: 'RU', name: 'Русский' },
  { code: 'sv',     label: 'SV', name: 'Svenska' },
  { code: 'th',     label: 'TH', name: 'ภาษาไทย' },
  { code: 'tr',     label: 'TR', name: 'Türkçe' },
  { code: 'ur',     label: 'UR', name: 'اردو' },
  { code: 'vi',     label: 'VI', name: 'Tiếng Việt' },
  { code: 'zh-CN',  label: 'CN', name: '简体中文' },
  { code: 'zh-HK',  label: 'HK', name: '繁體中文 (HK)' },
  { code: 'zh-TW',  label: 'TW', name: '繁體中文 (TW)' },
  { code: 'en-GB',  label: 'EN', name: 'English (UK)' },
  { code: 'es-419', label: 'ES', name: 'Español (Latam)' },
];

const COOKIE_NAME = 'utu_locale';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function readLocaleCookie(): string {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : 'en';
}

export default function LocaleSwitcher() {
  const t = useTranslations('common');
  const router = useRouter();
  const [selected, setSelected] = useState(LANGUAGES[0]);
  const [isOpen, setIsOpen]     = useState(false);
  const [search, setSearch]     = useState('');
  // Portal requires document — only render after mount
  const [mounted, setMounted]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads locale cookie (SSR-unavailable), must run after hydration
    setMounted(true);
    const saved = readLocaleCookie();
    const found = LANGUAGES.find((l) => l.code === saved);
    if (found) setSelected(found);
  }, []);

  function closeDropdown() {
    setSearch('');
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchRef.current?.focus(), 50);
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDropdown(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSelect = useCallback((lang: typeof LANGUAGES[0]) => {
    if (lang.code === selected.code) { closeDropdown(); return; }
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(lang.code)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    setSelected(lang);
    closeDropdown();
    // router.refresh() sends a fresh server request so middleware re-reads the
    // new utu_locale cookie and sets x-locale-override — same effect as a hard
    // reload but without the white-flash / full page interruption.
    router.refresh();
  }, [selected.code, router]);

  const filtered = search.trim()
    ? LANGUAGES.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.label.toLowerCase().includes(search.toLowerCase())
      )
    : LANGUAGES;

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-12 pb-4 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeDropdown(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Select language"
    >
      <div className="bg-utu-bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-utu-border-default">
          <h2 className="text-base font-semibold text-utu-text-primary">Language</h2>
          <button
            onClick={() => closeDropdown()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-utu-text-muted hover:text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-utu-border-default">
          <div className="flex items-center gap-2 border-2 border-emerald-500 rounded-xl px-3 py-2">
            <svg className="w-4 h-4 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm text-utu-text-secondary placeholder-gray-400 outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-utu-text-muted py-8">{t('noResults')}</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
              {filtered.map((lang) => {
                const isSel = lang.code === selected.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSel ? 'text-utu-text-primary' : 'text-utu-text-secondary hover:bg-utu-bg-muted'
                    }`}
                  >
                    <span className="text-sm font-bold shrink-0 w-8">{lang.label}</span>
                    <span className="flex-1 text-xs text-utu-text-muted truncate">{lang.name}</span>
                    {isSel && (
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-emerald-200 hover:text-white transition-colors text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-utu-bg-card/10"
        aria-label="Select language"
      >
        {selected.label}
      </button>

      {/* Portal renders outside <header> — escapes z-40 stacking context */}
      {mounted && createPortal(modal, document.body)}
    </>
  );
}
