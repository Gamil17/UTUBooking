'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LOCALE_CURRENCY } from '@/i18n/config';
import { useQuery } from '@tanstack/react-query';
import type { CarOffer } from '@/lib/api';
import CarCard from '@/components/cars/CarCard';
import CarFilters, {
  type CarFilterState,
  buildInitialCarFilters,
} from '@/components/cars/CarFilters';
import CarSearchBar, { type CarSearchParams } from '@/components/cars/CarSearchBar';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey = 'recommended' | 'cheapest' | 'most_popular';

// ─── URL param helpers ────────────────────────────────────────────────────────
function parseParams(sp: ReturnType<typeof useSearchParams>): CarSearchParams {
  return {
    pickupLocation:   sp.get('pickupLocation')  ?? '',
    dropoffLocation:  sp.get('dropoffLocation') ?? '',
    pickupDate:       sp.get('pickupDate')       ?? '',
    pickupTime:       sp.get('pickupTime')       ?? '10:00',
    dropoffDate:      sp.get('dropoffDate')      ?? '',
    dropoffTime:      sp.get('dropoffTime')      ?? '10:00',
    driverAge30to65:  sp.get('driverAge30to65')  !== 'false',
    differentDropoff: sp.get('differentDropoff') === 'true',
  };
}

function buildQS(p: CarSearchParams) {
  return new URLSearchParams({
    pickupLocation:   p.pickupLocation,
    dropoffLocation:  p.dropoffLocation,
    pickupDate:       p.pickupDate,
    pickupTime:       p.pickupTime,
    dropoffDate:      p.dropoffDate,
    dropoffTime:      p.dropoffTime,
    driverAge30to65:  String(p.driverAge30to65),
    differentDropoff: String(p.differentDropoff),
  }).toString();
}

// ─── Category icon strip ──────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'mid-size', label: 'Mid-size' },
  { key: 'compact',  label: 'Small'    },
  { key: 'large',    label: 'Large'    },
  { key: 'suv',      label: 'SUV'      },
  { key: 'minivan',  label: 'Minivan'  },
  { key: 'luxury',   label: 'Luxury'   },
] as const;

function CarIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm mb-3 overflow-hidden flex animate-pulse">
      <div className="w-52 h-40 bg-utu-border-default shrink-0" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-utu-border-default rounded w-1/2" />
            <div className="h-3 bg-utu-bg-muted rounded w-1/4" />
          </div>
          <div className="space-y-1 flex flex-col items-end shrink-0">
            <div className="h-5 bg-utu-border-default rounded w-24" />
            <div className="h-3 bg-utu-bg-muted rounded w-16" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-utu-bg-muted rounded" />
          ))}
        </div>
        <div className="flex gap-1.5">
          {[80, 100, 60].map((w, i) => (
            <div key={i} className="h-5 bg-utu-bg-muted rounded-full" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <svg className="w-14 h-14 mx-auto text-utu-border-default mb-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
      <p className="text-utu-text-muted text-sm">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CarsSearchPage() {
  const rawSP  = useSearchParams();
  const router = useRouter();
  const t        = useTranslations('carResults');
  const tS       = useTranslations('search');
  const locale   = useLocale();
  const currency = LOCALE_CURRENCY[locale as keyof typeof LOCALE_CURRENCY] ?? 'SAR';

  const [searchParams, setSearchParams] = useState<CarSearchParams>(() => parseParams(rawSP));
  const [sortBy,       setSortBy]       = useState<SortKey>('recommended');
  const [filters,      setFilters]      = useState<CarFilterState | null>(null);
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────
  const { data, isFetching, isError } = useQuery({
    queryKey: ['cars', searchParams],
    queryFn: async () => {
      const qs = new URLSearchParams({
        pickupLocation:  searchParams.pickupLocation,
        dropoffLocation: searchParams.dropoffLocation || searchParams.pickupLocation,
        pickupDate:      searchParams.pickupDate,
        pickupTime:      searchParams.pickupTime,
        dropoffDate:     searchParams.dropoffDate,
        dropoffTime:     searchParams.dropoffTime,
        currency,
        maxOffers:       '40',
      });
      const res = await fetch(`/api/cars/search?${qs}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<{ results: CarOffer[]; count: number }>;
    },
    enabled: !!(searchParams.pickupLocation && searchParams.pickupDate && searchParams.dropoffDate),
  });

  // Derive default filters from data — no useEffect needed; user overrides are layered on top
  const defaultFilters = useMemo(
    () => (data?.results?.length ? buildInitialCarFilters(data.results) : null),
    [data],
  );
  const effectiveFilters = filters ?? defaultFilters;

  // ── Filtered + sorted results ───────────────────────────────────────────
  const displayedCars = useMemo(() => {
    if (!data?.results || !effectiveFilters) return [];

    const result = data.results.filter((o) => {
      // Category strip quick filter
      if (activeCategory && o.category !== activeCategory) return false;
      // Sidebar filters
      if (effectiveFilters.categories.size > 0 && !effectiveFilters.categories.has(o.category)) return false;
      if (effectiveFilters.suppliers.size > 0 && !effectiveFilters.suppliers.has(o.supplier)) return false;
      if (effectiveFilters.seats.size > 0) {
        const s = o.seats ?? 0;
        const bucket: 4 | 5 | 6 = s <= 4 ? 4 : s === 5 ? 5 : 6;
        if (!effectiveFilters.seats.has(bucket)) return false;
      }
      if (effectiveFilters.transmission.size > 0 && !effectiveFilters.transmission.has(o.transmission)) return false;
      if (effectiveFilters.fuelTypes.size > 0) {
        const ft = o.fuelType ?? '';
        if (!effectiveFilters.fuelTypes.has(ft)) return false;
      }
      if (effectiveFilters.priceBracket !== null) {
        const nextBracket = [200, 400, 600, 800, Infinity];
        const idx = [0, 200, 400, 600, 800].indexOf(effectiveFilters.priceBracket);
        const max = nextBracket[idx] ?? Infinity;
        if (o.pricePerDay < effectiveFilters.priceBracket || o.pricePerDay >= max) return false;
      }
      if (effectiveFilters.freeCancelOnly && !o.freeCancellation) return false;
      if (effectiveFilters.hasAC && !o.hasAC) return false;
      return true;
    });

    switch (sortBy) {
      case 'cheapest':
        return [...result].sort((a, b) => a.pricePerDay - b.pricePerDay);
      case 'most_popular':
        return [...result].sort((a, b) =>
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
      default:
        return result;
    }
  }, [data, effectiveFilters, sortBy, activeCategory]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSearch = useCallback((p: CarSearchParams) => {
    setSearchParams(p);
    setFilters(null);
    setActiveCategory(null);
    router.replace(`/cars/search?${buildQS(p)}`, { scroll: false });
  }, [router]);

  const handleSelect = useCallback((id: string) => {
    const offer = data?.results.find((o) => o.id === id);
    if (!offer) return;
    const pickupMs  = new Date(searchParams.pickupDate).getTime();
    const dropoffMs = new Date(searchParams.dropoffDate).getTime();
    const days      = Math.max(1, Math.round((dropoffMs - pickupMs) / 86_400_000));
    const params    = new URLSearchParams({
      offerId:        id,
      name:           offer.name,
      category:       offer.category,
      supplier:       offer.supplier,
      pickupLocation: offer.pickupLocation,
      pickupDate:     searchParams.pickupDate,
      dropoffDate:    searchParams.dropoffDate,
      days:           String(days),
      pricePerDay:    String(offer.pricePerDay),
      totalPrice:     String(offer.totalPrice),
      currency:       offer.currency ?? 'SAR',
    });
    router.push(`/checkout/cars?${params}`);
  }, [data, router, searchParams]);

  const SORT_TABS: { key: SortKey; label: string }[] = [
    { key: 'recommended',  label: t('recommended')  },
    { key: 'cheapest',     label: t('cheapest')      },
    { key: 'most_popular', label: t('mostPopular')   },
  ];

  // Top pick = first offer after sorting
  const topPickId = displayedCars[0]?.id ?? null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky search bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-utu-bg-card shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <CarSearchBar
            initialParams={searchParams}
            onSearch={handleSearch}
            isLoading={isFetching}
          />
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Left sidebar (desktop) ─────────────────────────────────── */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-[7rem]">
            {data?.results && effectiveFilters ? (
              <CarFilters
                offers={data.results}
                filters={effectiveFilters}
                onChange={setFilters}
              />
            ) : (
              <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 animate-pulse space-y-3">
                {[72, 56, 88, 48, 64].map((w, i) => (
                  <div key={i} className="h-3 bg-utu-border-default rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
          </aside>

          {/* ── Results area ──────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Category icon strip */}
            {data?.results && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                {CATEGORIES.map(({ key, label }) => {
                  const count = data.results.filter((o) => o.category === key).length;
                  if (count === 0) return null;
                  const active = activeCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(active ? null : key)}
                      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border text-xs font-medium shrink-0 transition-colors ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-utu-border-default bg-utu-bg-card text-utu-text-secondary hover:bg-utu-bg-muted'
                      }`}
                    >
                      <CarIcon />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-utu-bg-card rounded-xl border border-utu-border-default shadow-sm p-1">
                {SORT_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      sortBy === key
                        ? 'bg-emerald-700 text-white'
                        : 'text-utu-text-muted hover:text-utu-text-primary hover:bg-utu-bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Result count + mobile filter button */}
              <div className="flex items-center gap-3">
                {!isFetching && data && (
                  <span className="text-xs text-utu-text-muted">
                    {displayedCars.length} / {data.count ?? data.results.length} {t('resultsCount')}
                  </span>
                )}
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-semibold border border-utu-border-default rounded-xl px-3 py-1.5 bg-utu-bg-card hover:bg-utu-bg-muted"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M10 20h4"/>
                  </svg>
                  {t('filters')}
                </button>
              </div>
            </div>

            {/* Error */}
            {isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
                Could not load cars. Please try again.
              </div>
            )}

            {/* No search yet */}
            {!searchParams.pickupLocation && (
              <EmptyState message={tS('searchCars')} />
            )}

            {/* Loading skeletons */}
            {isFetching && (
              <>{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</>
            )}

            {/* No results */}
            {!isFetching && data && displayedCars.length === 0 && (
              <EmptyState message={t('noResults')} />
            )}

            {/* Car cards */}
            {!isFetching && displayedCars.map((offer) => (
              <CarCard
                key={offer.id}
                offer={offer}
                isTopPick={offer.id === topPickId}
                onSelect={handleSelect}
              />
            ))}
          </main>
        </div>
      </div>

      {/* ── Mobile filter dialog ───────────────────────────────────────────── */}
      {filtersOpen && data?.results && filters && (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 p-0 w-full h-full bg-transparent"
          onClick={(e) => e.target === e.currentTarget && setFiltersOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-2xl max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-utu-text-primary">{t('filters')}</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default"
              >
                ✕
              </button>
            </div>
            <CarFilters
              offers={data.results}
              filters={effectiveFilters}
              onChange={(f) => setFilters(f)}
            />
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full mt-4 bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm"
            >
              Show {displayedCars.length} cars
            </button>
          </div>
        </dialog>
      )}

    </div>
  );
}
