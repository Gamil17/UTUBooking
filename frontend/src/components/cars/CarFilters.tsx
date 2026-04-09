'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { CarOffer } from '@/lib/api';

// ─── FilterState ──────────────────────────────────────────────────────────────
export interface CarFilterState {
  categories:     Set<string>;
  suppliers:      Set<string>;
  seats:          Set<4 | 5 | 6>;   // 6 means 6+
  transmission:   Set<string>;
  fuelTypes:      Set<string>;
  priceBracket:   number | null;     // lower bound of selected bracket (0/200/400/600/800)
  priceMin:       number;
  priceMax:       number;
  priceFloor:     number;
  priceCap:       number;
  freeCancelOnly: boolean;
  hasAC:          boolean;
}

export function buildInitialCarFilters(offers: CarOffer[]): CarFilterState {
  if (!offers.length) {
    return {
      categories: new Set(), suppliers: new Set(), seats: new Set(),
      transmission: new Set(), fuelTypes: new Set(), priceBracket: null,
      priceMin: 0, priceMax: 9999, priceFloor: 0, priceCap: 9999,
      freeCancelOnly: false, hasAC: false,
    };
  }
  const prices = offers.map((o) => o.pricePerDay);
  const floor  = Math.floor(Math.min(...prices));
  const cap    = Math.ceil(Math.max(...prices));
  return {
    categories: new Set(), suppliers: new Set(), seats: new Set(),
    transmission: new Set(), fuelTypes: new Set(), priceBracket: null,
    priceMin: floor, priceMax: cap, priceFloor: floor, priceCap: cap,
    freeCancelOnly: false, hasAC: false,
  };
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-utu-border-default pb-4 mb-4">
      <h3 className="text-xs font-bold text-utu-text-secondary uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  offers:   CarOffer[];
  filters:  CarFilterState;
  onChange: (f: CarFilterState) => void;
}

// ─── Price brackets (amounts; labels built dynamically with offer currency) ────
const PRICE_BRACKET_RANGES = [
  { min: 0,   max: 200  },
  { min: 200, max: 400  },
  { min: 400, max: 600  },
  { min: 600, max: 800  },
  { min: 800, max: null },
];

function fmtBracket(min: number, max: number | null, currency: string): string {
  const fmt = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });
  return max === null ? `${fmt(min)}+` : `${fmt(min)} – ${fmt(max)}`;
}

// ─── CarFilters ───────────────────────────────────────────────────────────────
export default function CarFilters({ offers, filters, onChange }: Props) {
  const t = useTranslations('carResults');

  // ── Derived stats ─────────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const c = new Map<string, number>();
    offers.forEach((o) => c.set(o.category, (c.get(o.category) ?? 0) + 1));
    return c;
  }, [offers]);

  const supplierCounts = useMemo(() => {
    const c = new Map<string, number>();
    offers.forEach((o) => c.set(o.supplier, (c.get(o.supplier) ?? 0) + 1));
    return Array.from(c.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [offers]);

  const fuelTypeCounts = useMemo(() => {
    const c = new Map<string, number>();
    offers.forEach((o) => {
      const ft = o.fuelType;
      if (ft) c.set(ft, (c.get(ft) ?? 0) + 1);
    });
    return c;
  }, [offers]);

  const transmissionCounts = useMemo(() => {
    const c = new Map<string, number>();
    offers.forEach((o) => c.set(o.transmission, (c.get(o.transmission) ?? 0) + 1));
    return c;
  }, [offers]);

  const currency = offers[0]?.currency ?? 'SAR';

  const bracketCounts = useMemo(() => {
    return PRICE_BRACKET_RANGES.map(({ min, max }) => ({
      min, max,
      count: offers.filter((o) => o.pricePerDay >= min && (max === null || o.pricePerDay < max)).length,
    }));
  }, [offers]);

  const seatBuckets = useMemo(() => {
    const c = { 4: 0, 5: 0, 6: 0 };
    offers.forEach((o) => {
      const s = o.seats ?? 0;
      if (s <= 4) c[4]++;
      else if (s === 5) c[5]++;
      else c[6]++;
    });
    return c;
  }, [offers]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleSet<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set);
    if (next.has(val)) { next.delete(val); } else { next.add(val); }
    return next;
  }
  function reset() { onChange(buildInitialCarFilters(offers)); }

  const CATEGORY_LABELS: Record<string, string> = {
    compact:   t('compact'),
    'mid-size': t('midSize'),
    large:     t('large'),
    luxury:    t('luxury'),
    minivan:   t('minivan'),
    suv:       t('suv'),
  };

  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-utu-text-primary">{t('filters')}</h2>
        <button onClick={reset} className="text-xs text-emerald-700 hover:underline">{t('clearFilters')}</button>
      </div>

      {/* Free Cancellation */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-utu-border-default">
        <span className="text-sm text-utu-text-secondary">{t('freeCancellationBadge')}</span>
        <button
          role="switch"
          aria-checked={filters.freeCancelOnly}
          onClick={() => onChange({ ...filters, freeCancelOnly: !filters.freeCancelOnly })}
          className={`w-10 h-5 rounded-full transition-colors relative ${filters.freeCancelOnly ? 'bg-emerald-600' : 'bg-utu-border-default'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-utu-bg-card rounded-full shadow transition-transform ${filters.freeCancelOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Car Category */}
      {categoryCounts.size > 0 && (
        <Section title={t('category')}>
          <div className="flex flex-col gap-1">
            {Array.from(categoryCounts.entries()).map(([cat, count]) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-utu-bg-muted rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filters.categories.has(cat)}
                  onChange={() => onChange({ ...filters, categories: toggleSet(filters.categories, cat) })}
                  className="rounded border-utu-border-strong text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex-1 text-utu-text-secondary text-xs capitalize">
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <span className="text-[10px] text-utu-text-muted bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Price per day */}
      <Section title={t('pricePerDay')}>
        <div className="flex flex-col gap-1 mb-3">
          {bracketCounts.map(({ min, max, count }) => {
            const label = fmtBracket(min, max, currency);
            const active = filters.priceBracket === min;
            return (
              <button
                key={min}
                onClick={() => onChange({ ...filters, priceBracket: active ? null : min })}
                disabled={count === 0}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-colors disabled:opacity-40 ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-utu-border-default bg-slate-50 text-utu-text-secondary hover:bg-utu-bg-muted'
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] text-utu-text-muted bg-utu-bg-card px-1.5 py-0.5 rounded-full border border-utu-border-default">{count}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Seats */}
      <Section title={t('seats')}>
        <div className="flex gap-2">
          {([4, 5, 6] as const).map((s) => {
            const active = filters.seats.has(s);
            const count = seatBuckets[s];
            return (
              <button
                key={s}
                onClick={() => onChange({ ...filters, seats: toggleSet(filters.seats, s) })}
                disabled={count === 0}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40 ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-utu-border-default bg-slate-50 text-utu-text-secondary hover:bg-utu-bg-muted'
                }`}
              >
                {s === 6 ? '6+' : s}
                <span className="block text-[9px] text-utu-text-muted">{count}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Supplier */}
      {supplierCounts.length > 0 && (
        <Section title={t('supplier')}>
          <div className="flex flex-col gap-1">
            {supplierCounts.map(([supplier, count]) => (
              <label key={supplier} className="flex items-center gap-2 cursor-pointer hover:bg-utu-bg-muted rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filters.suppliers.has(supplier)}
                  onChange={() => onChange({ ...filters, suppliers: toggleSet(filters.suppliers, supplier) })}
                  className="rounded border-utu-border-strong text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex-1 text-utu-text-secondary text-xs">{supplier}</span>
                <span className="text-[10px] text-utu-text-muted bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Transmission */}
      {transmissionCounts.size > 0 && (
        <Section title={t('transmission')}>
          <div className="flex flex-col gap-1">
            {Array.from(transmissionCounts.entries()).map(([trans, count]) => (
              <label key={trans} className="flex items-center gap-2 cursor-pointer hover:bg-utu-bg-muted rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filters.transmission.has(trans)}
                  onChange={() => onChange({ ...filters, transmission: toggleSet(filters.transmission, trans) })}
                  className="rounded border-utu-border-strong text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex-1 text-utu-text-secondary text-xs capitalize">{trans}</span>
                <span className="text-[10px] text-utu-text-muted bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Fuel type */}
      {fuelTypeCounts.size > 0 && (
        <Section title={t('fuelType')}>
          <div className="flex flex-col gap-1">
            {Array.from(fuelTypeCounts.entries()).map(([ft, count]) => (
              <label key={ft} className="flex items-center gap-2 cursor-pointer hover:bg-utu-bg-muted rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filters.fuelTypes.has(ft)}
                  onChange={() => onChange({ ...filters, fuelTypes: toggleSet(filters.fuelTypes, ft) })}
                  className="rounded border-utu-border-strong text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex-1 text-utu-text-secondary text-xs">{ft}</span>
                <span className="text-[10px] text-utu-text-muted bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Air Conditioning */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-utu-text-secondary">{t('airConditioning')}</span>
        <button
          role="switch"
          aria-checked={filters.hasAC}
          onClick={() => onChange({ ...filters, hasAC: !filters.hasAC })}
          className={`w-10 h-5 rounded-full transition-colors relative ${filters.hasAC ? 'bg-emerald-600' : 'bg-utu-border-default'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-utu-bg-card rounded-full shadow transition-transform ${filters.hasAC ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

    </div>
  );
}
