'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LocaleDatePicker from '@/components/DatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HotelSearchParams {
  destination:    string;
  checkIn:        string;
  checkOut:       string;
  adults:         number;
  children:       number;
  rooms:          number;
  freeCancelOnly: boolean;
}

interface Props {
  initialParams: HotelSearchParams;
  onSearch:      (p: HotelSearchParams) => void;
  isLoading:     boolean;
}

// ─── HotelSearchBar ───────────────────────────────────────────────────────────
export default function HotelSearchBar({ initialParams, onSearch, isLoading }: Props) {
  const t      = useTranslations('search');
  const locale = useLocale();

  const [params, setParams]         = useState<HotelSearchParams>(initialParams);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  // Close guests popup when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (guestsRef.current && !guestsRef.current.contains(e.target as Node)) {
        setGuestsOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function set<K extends keyof HotelSearchParams>(key: K, value: HotelSearchParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function handleSearch() {
    if (!params.destination || !params.checkIn || !params.checkOut) return;
    onSearch(params);
  }

  const canSearch = !!(params.destination && params.checkIn && params.checkOut);

  const guestSummary = [
    `${params.adults} ${t('adultsLabel')}`,
    ...(params.children > 0 ? [`${params.children} ${t('childrenLabel')}`] : []),
    `${params.rooms} ${t('roomsLabel')}`,
  ].join(' · ');

  return (
    <div className="py-3">
      {/* Free cancellation toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={params.freeCancelOnly}
          onClick={() => set('freeCancelOnly', !params.freeCancelOnly)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            params.freeCancelOnly
              ? 'bg-emerald-700 border-emerald-700'
              : 'border-utu-border-strong bg-utu-bg-card'
          }`}
        >
          {params.freeCancelOnly && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5"/>
            </svg>
          )}
        </button>
        <span className="text-xs text-utu-text-secondary">{t('freeCancelOnly')}</span>
      </div>

      {/* Search inputs */}
      <div className="flex items-end gap-2 flex-wrap lg:flex-nowrap">

        {/* Destination */}
        <div className="flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            {t('destination')}
          </label>
          <input
            type="text"
            value={params.destination}
            onChange={(e) => set('destination', e.target.value)}
            placeholder={t('destinationHint')}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Check-in */}
        <div className="flex-1 min-w-[130px]">
          <LocaleDatePicker
            label={t('checkIn')}
            value={params.checkIn}
            onChange={(v) => set('checkIn', v)}
            lang={locale}
            min={new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Check-out */}
        <div className="flex-1 min-w-[130px]">
          <LocaleDatePicker
            label={t('checkOut')}
            value={params.checkOut}
            onChange={(v) => set('checkOut', v)}
            lang={locale}
            min={params.checkIn || new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Guests & Rooms popup */}
        <div ref={guestsRef} className="relative flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            {t('guests')}
          </label>
          <button
            type="button"
            onClick={() => setGuestsOpen((v) => !v)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 text-start bg-utu-bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between"
          >
            <span className="truncate">{guestSummary}</span>
            <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${guestsOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {guestsOpen && (
            <div className="absolute top-full mt-1 start-0 end-0 min-w-[220px] bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-xl z-50 p-4 space-y-3">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-utu-text-primary">{t('adultsLabel')}</div>
                  <div className="text-[10px] text-utu-text-muted">Ages 18+</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set('adults', Math.max(1, params.adults - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-utu-border-default text-utu-text-muted hover:border-emerald-400 hover:text-emerald-700">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14"/></svg>
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-utu-text-primary">{params.adults}</span>
                  <button type="button" onClick={() => set('adults', Math.min(12, params.adults + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-utu-border-default text-utu-text-muted hover:border-emerald-400 hover:text-emerald-700">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-utu-text-primary">{t('childrenLabel')}</div>
                  <div className="text-[10px] text-utu-text-muted">Ages 0–17</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set('children', Math.max(0, params.children - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-utu-border-default text-utu-text-muted hover:border-emerald-400 hover:text-emerald-700">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14"/></svg>
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-utu-text-primary">{params.children}</span>
                  <button type="button" onClick={() => set('children', Math.min(6, params.children + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-utu-border-default text-utu-text-muted hover:border-emerald-400 hover:text-emerald-700">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>

              {/* Rooms */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-utu-text-primary">{t('roomsLabel')}</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set('rooms', Math.max(1, params.rooms - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-utu-border-default text-utu-text-muted hover:border-emerald-400 hover:text-emerald-700">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14"/></svg>
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-utu-text-primary">{params.rooms}</span>
                  <button type="button" onClick={() => set('rooms', Math.min(8, params.rooms + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-utu-border-default text-utu-text-muted hover:border-emerald-400 hover:text-emerald-700">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGuestsOpen(false)}
                className="w-full mt-1 bg-emerald-700 text-white text-sm font-semibold py-2 rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch || isLoading}
          className="h-[42px] px-6 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0"
        >
          {isLoading
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
              </svg>
            )
          }
          {t('searchHotels')}
        </button>
      </div>
    </div>
  );
}
