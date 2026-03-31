'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LocaleDatePicker from '@/components/DatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CarSearchParams {
  pickupLocation:   string;
  dropoffLocation:  string;
  pickupDate:       string;
  pickupTime:       string;  // 'HH:00'
  dropoffDate:      string;
  dropoffTime:      string;  // 'HH:00'
  driverAge30to65:  boolean;
  differentDropoff: boolean;
}

interface Props {
  initialParams: CarSearchParams;
  onSearch:      (p: CarSearchParams) => void;
  isLoading:     boolean;
}

// ─── Time options (00:00 – 23:00) ────────────────────────────────────────────
const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hh  = String(h).padStart(2, '0');
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { value: `${hh}:00`, label: `${h12}:00 ${ampm}` };
});

// ─── CarSearchBar ─────────────────────────────────────────────────────────────
export default function CarSearchBar({ initialParams, onSearch, isLoading }: Props) {
  const t      = useTranslations('search');
  const tCR    = useTranslations('carResults');
  const locale = useLocale();

  const [params, setParams] = useState<CarSearchParams>(initialParams);

  function set<K extends keyof CarSearchParams>(key: K, value: CarSearchParams[K]) {
    setParams((p) => {
      const next = { ...p, [key]: value };
      // Keep dropoffLocation in sync when not using different dropoff
      if (key === 'pickupLocation' && !p.differentDropoff) {
        next.dropoffLocation = value as string;
      }
      return next;
    });
  }

  function toggleDifferentDropoff() {
    setParams((p) => ({
      ...p,
      differentDropoff: !p.differentDropoff,
      dropoffLocation: !p.differentDropoff ? '' : p.pickupLocation,
    }));
  }

  function handleSearch() {
    if (!params.pickupLocation || !params.pickupDate || !params.dropoffDate) return;
    onSearch(params);
  }

  const canSearch = !!(
    params.pickupLocation && params.pickupDate && params.dropoffDate &&
    params.dropoffDate >= params.pickupDate
  );

  return (
    <div className="py-3 space-y-3">

      {/* Row 1: Main inputs */}
      <div className="flex items-end gap-2 flex-wrap lg:flex-nowrap">

        {/* Pickup location */}
        <div className="flex-[2] min-w-[180px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            {t('pickupLocation')}
          </label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={params.pickupLocation}
              onChange={(e) => set('pickupLocation', e.target.value)}
              placeholder={t('pickupLocationHint')}
              className="w-full border border-slate-200 rounded-xl ps-9 pe-8 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {params.pickupLocation && (
              <button
                type="button"
                onClick={() => set('pickupLocation', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Pick-up date */}
        <div className="flex-1 min-w-[130px]">
          <LocaleDatePicker
            label={t('pickupDate')}
            value={params.pickupDate}
            onChange={(v) => set('pickupDate', v)}
            lang={locale}
            min={new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Pick-up time */}
        <div className="w-28 shrink-0">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            {t('pickupTime')}
          </label>
          <select
            value={params.pickupTime}
            onChange={(e) => set('pickupTime', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Drop-off date */}
        <div className="flex-1 min-w-[130px]">
          <LocaleDatePicker
            label={t('dropoffDate')}
            value={params.dropoffDate}
            onChange={(v) => set('dropoffDate', v)}
            lang={locale}
            min={params.pickupDate || new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Drop-off time */}
        <div className="w-28 shrink-0">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            {t('dropoffTime')}
          </label>
          <select
            value={params.dropoffTime}
            onChange={(e) => set('dropoffTime', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
          {t('searchCars')}
        </button>
      </div>

      {/* Row 2: Options */}
      <div className="flex items-center gap-6 flex-wrap">

        {/* Different dropoff */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="checkbox"
            aria-checked={params.differentDropoff}
            onClick={toggleDifferentDropoff}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              params.differentDropoff
                ? 'bg-emerald-700 border-emerald-700'
                : 'border-gray-300 bg-white'
            }`}
          >
            {params.differentDropoff && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5"/>
              </svg>
            )}
          </button>
          <span className="text-xs text-gray-600">{t('differentDropoff')}</span>
        </label>

        {/* Driver age */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="checkbox"
            aria-checked={params.driverAge30to65}
            onClick={() => set('driverAge30to65', !params.driverAge30to65)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              params.driverAge30to65
                ? 'bg-emerald-700 border-emerald-700'
                : 'border-gray-300 bg-white'
            }`}
          >
            {params.driverAge30to65 && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5"/>
              </svg>
            )}
          </button>
          <span className="text-xs text-gray-600">{t('driverAge')}</span>
        </label>

        {/* Different dropoff location input */}
        {params.differentDropoff && (
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              {t('dropoffLocation')}
            </label>
            <input
              type="text"
              value={params.dropoffLocation}
              onChange={(e) => set('dropoffLocation', e.target.value)}
              placeholder={t('pickupLocationHint')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
