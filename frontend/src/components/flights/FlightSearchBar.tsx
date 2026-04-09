'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LocaleDatePicker from '@/components/DatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TripType = 'oneway' | 'roundtrip' | 'multicity';
export type CabinClass = 'economy' | 'business' | 'first' | 'premium_economy';

export interface SearchBarParams {
  from:     string;
  to:       string;
  depart:   string;
  return:   string;
  tripType: TripType;
  cabin:    CabinClass;
  adults:   number;
}

interface Props {
  initialParams: SearchBarParams;
  onSearch:      (p: SearchBarParams) => void;
  isLoading:     boolean;
}

// ─── SwapIcon ─────────────────────────────────────────────────────────────────
function SwapIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4" />
    </svg>
  );
}

// ─── FlightSearchBar ──────────────────────────────────────────────────────────
export default function FlightSearchBar({ initialParams, onSearch, isLoading }: Props) {
  const t      = useTranslations('search');
  const tFR    = useTranslations('flightResults');
  const locale = useLocale();

  const [params, setParams] = useState<SearchBarParams>(initialParams);

  function set<K extends keyof SearchBarParams>(key: K, value: SearchBarParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function swap() {
    setParams((p) => ({ ...p, from: p.to, to: p.from }));
  }

  function handleSearch() {
    if (!params.from || !params.to || !params.depart) return;
    onSearch(params);
  }

  const TRIP_TYPES: { key: TripType; label: string }[] = [
    { key: 'oneway',    label: t('oneWay')   },
    { key: 'roundtrip', label: t('roundTrip') },
    { key: 'multicity', label: t('multiCity') },
  ];

  const CABINS: { key: CabinClass; label: string }[] = [
    { key: 'economy',         label: t('economy')        },
    { key: 'premium_economy', label: t('premiumEconomy') },
    { key: 'business',        label: t('business')       },
    { key: 'first',           label: t('first')          },
  ];

  const canSearch = !!(params.from && params.to && params.depart);

  return (
    <div className="py-3">
      {/* Trip type + cabin row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {/* Trip type pills */}
        <div className="flex items-center bg-slate-100 rounded-full p-0.5 gap-0.5">
          {TRIP_TYPES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => key !== 'multicity' && set('tripType', key)}
              className={`relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                params.tripType === key
                  ? 'bg-utu-bg-card text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              } ${key === 'multicity' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {label}
              {key === 'multicity' && (
                <span className="ms-1 text-[9px] text-slate-400 font-normal">{t('comingSoon')}</span>
              )}
            </button>
          ))}
        </div>

        {/* Cabin class */}
        <select
          value={params.cabin}
          onChange={(e) => set('cabin', e.target.value as CabinClass)}
          className="text-xs border border-slate-200 rounded-full px-3 py-1.5 bg-utu-bg-card text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {CABINS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Adults counter */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-full px-3 py-1 bg-utu-bg-card">
          <button
            type="button"
            onClick={() => set('adults', Math.max(1, params.adults - 1))}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-emerald-700"
            aria-label="Decrease adults"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14"/></svg>
          </button>
          <span className="text-xs font-semibold text-slate-700 w-10 text-center">
            {params.adults} {t('adults')}
          </span>
          <button
            type="button"
            onClick={() => set('adults', Math.min(9, params.adults + 1))}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-emerald-700"
            aria-label="Increase adults"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>

      {/* Main search inputs row */}
      <div className="flex items-end gap-2 flex-wrap lg:flex-nowrap">
        {/* From */}
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('from')}</label>
          <input
            type="text"
            value={params.from}
            onChange={(e) => set('from', e.target.value.toUpperCase().slice(0, 3))}
            placeholder={t('fromHint')}
            maxLength={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
          />
        </div>

        {/* Swap */}
        <button
          type="button"
          onClick={swap}
          title={t('swap')}
          className="w-9 h-9 mb-0.5 flex items-center justify-center rounded-full border border-slate-200 bg-utu-bg-card hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-emerald-700 transition-colors shrink-0"
        >
          <SwapIcon />
        </button>

        {/* To */}
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('to')}</label>
          <input
            type="text"
            value={params.to}
            onChange={(e) => set('to', e.target.value.toUpperCase().slice(0, 3))}
            placeholder={t('toHint')}
            maxLength={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
          />
        </div>

        {/* Depart date */}
        <div className="flex-1 min-w-[130px]">
          <LocaleDatePicker
            label={t('departDate')}
            value={params.depart}
            onChange={(v) => set('depart', v)}
            lang={locale}
            min={new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Return date (round-trip only) */}
        {params.tripType === 'roundtrip' && (
          <div className="flex-1 min-w-[130px]">
            <LocaleDatePicker
              label={t('returnDate')}
              value={params.return}
              onChange={(v) => set('return', v)}
              lang={locale}
              min={params.depart || new Date().toISOString().slice(0, 10)}
            />
          </div>
        )}

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            )
          }
          {tFR('recommended') ? t('searchFlights') : 'Search'}
        </button>
      </div>
    </div>
  );
}
