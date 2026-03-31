'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { FlightOffer } from '@/lib/api';

// ─── Airline colour (same hash as FlightCard) ─────────────────────────────────
const AIRLINE_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-amber-500',
  'bg-indigo-600',  'bg-teal-600', 'bg-rose-500',
  'bg-violet-600',  'bg-orange-500',
];
function airlineColor(code: string) {
  return AIRLINE_COLORS[code.charCodeAt(0) % AIRLINE_COLORS.length];
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─── Time block icons (inline SVG) ────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function SunIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

const TIME_BLOCKS = [
  { key: 0 as const, label: '00–06', icon: <MoonIcon /> },
  { key: 1 as const, label: '06–12', icon: <SunIcon /> },
  { key: 2 as const, label: '12–18', icon: <SunIcon /> },
  { key: 3 as const, label: '18–24', icon: <MoonIcon /> },
];

// ─── FilterState ──────────────────────────────────────────────────────────────
export interface FilterState {
  stops:           Set<0 | 1 | 2>;
  priceMin:        number;
  priceMax:        number;
  priceFloor:      number;
  priceCap:        number;
  departureBlocks: Set<0 | 1 | 2 | 3>;
  airlines:        Set<string>;
  maxDuration:     number;
  maxDurationCap:  number;
  baggageOnly:     boolean;
}

export function buildInitialFilters(offers: FlightOffer[]): FilterState {
  if (!offers.length) {
    return {
      stops: new Set(), priceMin: 0, priceMax: 99999, priceFloor: 0,
      priceCap: 99999, departureBlocks: new Set(), airlines: new Set(),
      maxDuration: 9999, maxDurationCap: 9999, baggageOnly: false,
    };
  }
  const prices    = offers.map((o) => o.price);
  const durations = offers.map((o) => o.durationMinutes);
  const floor     = Math.min(...prices);
  const cap       = Math.max(...prices);
  const maxDurCap = Math.max(...durations);
  return {
    stops: new Set(), priceMin: floor, priceMax: cap, priceFloor: floor,
    priceCap: cap, departureBlocks: new Set(), airlines: new Set(),
    maxDuration: maxDurCap, maxDurationCap: maxDurCap, baggageOnly: false,
  };
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── FlightFilters ────────────────────────────────────────────────────────────
interface Props {
  offers:   FlightOffer[];
  filters:  FilterState;
  onChange: (f: FilterState) => void;
}

export default function FlightFilters({ offers, filters, onChange }: Props) {
  const t = useTranslations('flightResults');

  // ── Derived stats ────────────────────────────────────────────────────────
  const stopCounts = useMemo(() => {
    const c = { 0: 0, 1: 0, 2: 0 };
    offers.forEach((o) => {
      const k = o.stops >= 2 ? 2 : o.stops as 0 | 1;
      c[k]++;
    });
    return c;
  }, [offers]);

  const airlineStats = useMemo(() => {
    const map = new Map<string, number>();
    offers.forEach((o) => {
      const cur = map.get(o.airlineCode);
      if (cur === undefined || o.price < cur) map.set(o.airlineCode, o.price);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [offers]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function toggleStop(s: 0 | 1 | 2) {
    const next = new Set(filters.stops);
    next.has(s) ? next.delete(s) : next.add(s);
    onChange({ ...filters, stops: next });
  }
  function toggleBlock(b: 0 | 1 | 2 | 3) {
    const next = new Set(filters.departureBlocks);
    next.has(b) ? next.delete(b) : next.add(b);
    onChange({ ...filters, departureBlocks: next });
  }
  function toggleAirline(code: string) {
    const next = new Set(filters.airlines);
    next.has(code) ? next.delete(code) : next.add(code);
    onChange({ ...filters, airlines: next });
  }
  function reset() {
    onChange(buildInitialFilters(offers));
  }

  const stopLabels = [t('direct'), t('oneStop'), t('twoStops')];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">{t('filters')}</h2>
        <button onClick={reset} className="text-xs text-emerald-700 hover:underline">{t('clearFilters')}</button>
      </div>

      {/* Stops */}
      <Section title={t('stops')}>
        {([0, 1, 2] as const).map((s) => {
          const active = filters.stops.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleStop(s)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl mb-1.5 border text-sm transition-colors ${
                active
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-gray-100 bg-slate-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{stopLabels[s]}</span>
              <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{stopCounts[s]}</span>
            </button>
          );
        })}
      </Section>

      {/* Price range */}
      <Section title={t('priceRange')}>
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>SAR {filters.priceMin.toLocaleString('en-SA')}</span>
          <span>SAR {filters.priceMax.toLocaleString('en-SA')}</span>
        </div>
        <div className="relative h-5 flex items-center">
          <input
            type="range"
            min={filters.priceFloor}
            max={filters.priceCap}
            value={filters.priceMin}
            onChange={(e) => onChange({ ...filters, priceMin: Math.min(Number(e.target.value), filters.priceMax - 1) })}
            className="absolute w-full h-1 appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: 3 }}
          />
          <input
            type="range"
            min={filters.priceFloor}
            max={filters.priceCap}
            value={filters.priceMax}
            onChange={(e) => onChange({ ...filters, priceMax: Math.max(Number(e.target.value), filters.priceMin + 1) })}
            className="absolute w-full h-1 appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: 4 }}
          />
          <div
            className="absolute h-1 bg-emerald-500 rounded-full pointer-events-none"
            style={{
              left:  `${((filters.priceMin - filters.priceFloor) / (filters.priceCap - filters.priceFloor || 1)) * 100}%`,
              right: `${100 - ((filters.priceMax - filters.priceFloor) / (filters.priceCap - filters.priceFloor || 1)) * 100}%`,
              zIndex: 2,
            }}
          />
          <div className="w-full h-1 bg-gray-200 rounded-full" style={{ zIndex: 1 }} />
        </div>
      </Section>

      {/* Departure time */}
      <Section title={t('departTime')}>
        <div className="grid grid-cols-2 gap-1.5">
          {TIME_BLOCKS.map((block) => {
            const active = filters.departureBlocks.has(block.key);
            return (
              <button
                key={block.key}
                onClick={() => toggleBlock(block.key)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-gray-100 bg-slate-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {block.icon}
                {block.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Airlines */}
      <Section title={t('airlines')}>
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {airlineStats.map(([code, lowestPrice]) => {
            const checked = filters.airlines.has(code);
            return (
              <label key={code} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAirline(code)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${airlineColor(code)}`}>
                  <span className="text-white text-[9px] font-bold">{code.slice(0, 2)}</span>
                </div>
                <span className="flex-1 text-gray-700 text-xs">{code}</span>
                <span className="text-xs text-gray-400">SAR {lowestPrice.toLocaleString('en-SA')}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Max Duration */}
      <Section title={t('maxDuration')}>
        <p className="text-xs text-gray-500 mb-2">Up to {fmtDuration(filters.maxDuration)}</p>
        <input
          type="range"
          min={0}
          max={filters.maxDurationCap}
          value={filters.maxDuration}
          onChange={(e) => onChange({ ...filters, maxDuration: Number(e.target.value) })}
          className="w-full accent-emerald-600"
        />
      </Section>

      {/* Baggage */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{t('baggageIncluded')}</span>
        <button
          role="switch"
          aria-checked={filters.baggageOnly}
          onClick={() => onChange({ ...filters, baggageOnly: !filters.baggageOnly })}
          className={`w-10 h-5 rounded-full transition-colors relative ${filters.baggageOnly ? 'bg-emerald-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.baggageOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

    </div>
  );
}
