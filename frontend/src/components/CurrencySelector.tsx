'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';

const CURRENCIES = [
  { code: 'SAR', name: 'Saudi Arabian Riyal' },
  { code: 'AED', name: 'Emirates Dirham' },
  { code: 'AOA', name: 'Angolan Kwanza' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'BWP', name: 'Botswana Pula' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CDF', name: 'Congolese Franc' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'GHS', name: 'Ghana Cedi' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'IQD', name: 'Iraqi Dinar' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'KRW', name: 'Korean Won' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MOP', name: 'Macanese Pataca' },
  { code: 'MUR', name: 'Mauritian Rupee' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'NAD', name: 'Namibian Dollar' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'YER', name: 'Yemeni Rial' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
];

const STORAGE_KEY = 'utu_currency';
const DEFAULT = CURRENCIES[0]; // SAR

export default function CurrencySelector() {
  const t = useTranslations('common');
  const locale = useLocale();
  const [selected, setSelected] = useState(DEFAULT);
  const [isOpen, setIsOpen]     = useState(false);
  const [search, setSearch]     = useState('');
  const [mounted, setMounted]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  function closeDropdown() {
    setSearch('');
    setIsOpen(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage (SSR-unavailable), must run after hydration
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = CURRENCIES.find((c) => c.code === saved);
      if (found) setSelected(found);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchRef.current?.focus(), 50);
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDropdown(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleSelect = useCallback((currency: typeof DEFAULT) => {
    setSelected(currency);
    localStorage.setItem(STORAGE_KEY, currency.code);
    closeDropdown();
  }, []);

  const displayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale, 'en'], { type: 'currency' });
    } catch {
      return null;
    }
  }, [locale]);

  const localizedName = useCallback(
    (code: string, fallback: string) => displayNames?.of(code) ?? fallback,
    [displayNames]
  );

  const q = search.trim().toLowerCase();
  const filtered = q
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (displayNames?.of(c.code) ?? '').toLowerCase().includes(q)
      )
    : CURRENCIES;

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-12 pb-4 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeDropdown(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Select currency"
        >
          <div className="bg-utu-bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-utu-border-default">
              <h2 className="text-base font-semibold text-utu-text-primary">{t('currency')}</h2>
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
              <div className="flex items-center gap-2 border-2 border-utu-blue rounded-xl px-3 py-2">
                <svg className="w-4 h-4 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
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

            {/* List */}
            <div className="overflow-y-auto px-4 py-3">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-utu-text-muted py-8">{t('noResults')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                  {filtered.map((currency) => {
                    const isSelected = currency.code === selected.code;
                    return (
                      <button
                        key={currency.code}
                        onClick={() => handleSelect(currency)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'text-utu-text-primary'
                            : 'text-utu-text-secondary hover:bg-utu-bg-muted'
                        }`}
                      >
                        <span className="text-sm font-bold shrink-0 w-10">{currency.code}</span>
                        <span className="flex-1 text-xs text-utu-text-muted truncate">{localizedName(currency.code, currency.name)}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-utu-blue shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
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
        className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-utu-bg-card/10"
        aria-label="Select currency"
      >
        {selected.code}
      </button>

      {mounted && createPortal(modal, document.body)}
    </>
  );
}
