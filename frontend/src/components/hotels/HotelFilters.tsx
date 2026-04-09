'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { HotelOffer } from '@/lib/api';

// ─── FilterState ──────────────────────────────────────────────────────────────
export interface HotelFilterState {
  stars:          Set<1 | 2 | 3 | 4 | 5>;
  reviewMin:      number;          // 0 = no minimum
  priceMin:       number;
  priceMax:       number;
  priceFloor:     number;
  priceCap:       number;
  distanceMax:    number;          // meters; 999999 = no cap
  distanceCap:    number;          // max across all offers
  propertyTypes:  Set<string>;
  amenities:      Set<string>;
  freeCancelOnly: boolean;
}

export function buildInitialHotelFilters(offers: HotelOffer[]): HotelFilterState {
  if (!offers.length) {
    return {
      stars: new Set(), reviewMin: 0, priceMin: 0, priceMax: 99999,
      priceFloor: 0, priceCap: 99999, distanceMax: 999999, distanceCap: 999999,
      propertyTypes: new Set(), amenities: new Set(), freeCancelOnly: false,
    };
  }
  const prices    = offers.map((o) => o.pricePerNight);
  const distances = offers.map((o) => o.distanceHaramM ?? 0).filter(Boolean);
  const floor     = Math.min(...prices);
  const cap       = Math.max(...prices);
  const distCap   = distances.length ? Math.max(...distances) : 999999;
  return {
    stars: new Set(), reviewMin: 0, priceMin: floor, priceMax: cap,
    priceFloor: floor, priceCap: cap, distanceMax: distCap, distanceCap: distCap,
    propertyTypes: new Set(), amenities: new Set(), freeCancelOnly: false,
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
  offers:   HotelOffer[];
  filters:  HotelFilterState;
  onChange: (f: HotelFilterState) => void;
}

// ─── HotelFilters ─────────────────────────────────────────────────────────────
export default function HotelFilters({ offers, filters, onChange }: Props) {
  const t  = useTranslations('hotelResults');
  const tP = useTranslations('partner');
  const currency = offers[0]?.currency ?? 'SAR';
  const fmtAmt = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });

  // ── Derived stats ────────────────────────────────────────────────────────
  const starCounts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    offers.forEach((o) => { if (o.stars) c[Math.round(o.stars)] = (c[Math.round(o.stars)] ?? 0) + 1; });
    return c;
  }, [offers]);

  const topAmenities = useMemo(() => {
    const count = new Map<string, number>();
    offers.forEach((o) => o.amenities?.forEach((a) => count.set(a, (count.get(a) ?? 0) + 1)));
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([a]) => a);
  }, [offers]);

  const propertyTypeList = useMemo(() => {
    const types = new Set<string>();
    offers.forEach((o) => { if (o.propertyType) types.add(o.propertyType); });
    return Array.from(types).sort();
  }, [offers]);

  const hasDistances = offers.some((o) => o.distanceHaramM != null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function toggleStar(s: 1 | 2 | 3 | 4 | 5) {
    const next = new Set(filters.stars);
    if (next.has(s)) { next.delete(s); } else { next.add(s); }
    onChange({ ...filters, stars: next });
  }
  function togglePropertyType(pt: string) {
    const next = new Set(filters.propertyTypes);
    if (next.has(pt)) { next.delete(pt); } else { next.add(pt); }
    onChange({ ...filters, propertyTypes: next });
  }
  function toggleAmenity(a: string) {
    const next = new Set(filters.amenities);
    if (next.has(a)) { next.delete(a); } else { next.add(a); }
    onChange({ ...filters, amenities: next });
  }
  function reset() { onChange(buildInitialHotelFilters(offers)); }

  // Distance display helper
  function fmtDist(m: number) {
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
  }

  const REVIEW_PRESETS = [
    { min: 9, label: t('wonderful') },
    { min: 8, label: t('veryGood')  },
    { min: 7, label: t('good')      },
  ];

  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-utu-text-primary">{t('filters')}</h2>
        <button onClick={reset} className="text-xs text-emerald-700 hover:underline">{t('clearFilters')}</button>
      </div>

      {/* Free Cancellation quick toggle */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-utu-border-default">
        <span className="text-sm text-utu-text-secondary">{tP('freeCancellation')}</span>
        <button
          role="switch"
          aria-checked={filters.freeCancelOnly}
          onClick={() => onChange({ ...filters, freeCancelOnly: !filters.freeCancelOnly })}
          className={`w-10 h-5 rounded-full transition-colors relative ${filters.freeCancelOnly ? 'bg-emerald-600' : 'bg-utu-border-default'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-utu-bg-card rounded-full shadow transition-transform ${filters.freeCancelOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Star Rating */}
      <Section title={t('stars')}>
        <div className="flex gap-1.5 flex-wrap">
          {([5, 4, 3, 2, 1] as const).map((s) => {
            const active = filters.stars.has(s);
            const count  = starCounts[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => toggleStar(s)}
                disabled={count === 0}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40 ${
                  active
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-utu-border-default bg-slate-50 text-utu-text-secondary hover:bg-utu-bg-muted'
                }`}
              >
                <svg className={`w-3 h-3 ${active ? 'text-amber-400' : 'text-utu-text-muted'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                {s}
                <span className="text-[10px] text-utu-text-muted ms-0.5">({count})</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Review Score */}
      <Section title={t('reviewScore')}>
        <div className="flex flex-col gap-1">
          {REVIEW_PRESETS.map(({ min, label }) => {
            const active = filters.reviewMin === min;
            return (
              <button
                key={min}
                onClick={() => onChange({ ...filters, reviewMin: active ? 0 : min })}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-utu-border-default bg-slate-50 text-utu-text-secondary hover:bg-utu-bg-muted'
                }`}
              >
                <span className="bg-emerald-700 text-white text-[9px] font-bold px-1 py-0.5 rounded">{min}+</span>
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Price Range */}
      <Section title={t('priceRange')}>
        <div className="flex justify-between text-xs text-utu-text-muted mb-2">
          <span>{fmtAmt(filters.priceMin)}</span>
          <span>{fmtAmt(filters.priceMax)}</span>
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
          <div className="w-full h-1 bg-utu-border-default rounded-full" style={{ zIndex: 1 }} />
        </div>
      </Section>

      {/* Distance from Haram (only when relevant) */}
      {hasDistances && (
        <Section title={t('distanceHaram')}>
          <div className="grid grid-cols-2 gap-1.5">
            {[500, 1000, 3000, 5000].map((m) => {
              const active = filters.distanceMax === m;
              return (
                <button
                  key={m}
                  onClick={() => onChange({ ...filters, distanceMax: active ? filters.distanceCap : m })}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    active
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-utu-border-default bg-slate-50 text-utu-text-secondary hover:bg-utu-bg-muted'
                  }`}
                >
                  &lt; {fmtDist(m)}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Property Type */}
      {propertyTypeList.length > 0 && (
        <Section title={t('propertyType')}>
          <div className="flex flex-col gap-1">
            {propertyTypeList.map((pt) => (
              <label key={pt} className="flex items-center gap-2 cursor-pointer hover:bg-utu-bg-muted rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filters.propertyTypes.has(pt)}
                  onChange={() => togglePropertyType(pt)}
                  className="rounded border-utu-border-strong text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex-1 text-utu-text-secondary text-xs">{pt}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Amenities */}
      {topAmenities.length > 0 && (
        <Section title={t('amenities')}>
          <div className="flex flex-col gap-1">
            {topAmenities.map((a) => (
              <label key={a} className="flex items-center gap-2 cursor-pointer hover:bg-utu-bg-muted rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filters.amenities.has(a)}
                  onChange={() => toggleAmenity(a)}
                  className="rounded border-utu-border-strong text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex-1 text-utu-text-secondary text-xs">{a}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

    </div>
  );
}
