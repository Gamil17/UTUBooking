'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { HotelOffer } from '@/lib/api';
import HotelSearchCard from '@/components/hotels/HotelSearchCard';
import HotelFilters, {
  type HotelFilterState,
  buildInitialHotelFilters,
} from '@/components/hotels/HotelFilters';
import HotelSearchBar, { type HotelSearchParams } from '@/components/hotels/HotelSearchBar';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey = 'recommended' | 'cheapest' | 'topRated' | 'closest';

// ─── URL param helpers ────────────────────────────────────────────────────────
function parseParams(sp: ReturnType<typeof useSearchParams>): HotelSearchParams {
  return {
    destination:    sp.get('destination') ?? '',
    checkIn:        sp.get('checkIn')     ?? '',
    checkOut:       sp.get('checkOut')    ?? '',
    adults:         Math.max(1, parseInt(sp.get('adults')   ?? '2', 10)),
    children:       Math.max(0, parseInt(sp.get('children') ?? '0', 10)),
    rooms:          Math.max(1, parseInt(sp.get('rooms')    ?? '1', 10)),
    freeCancelOnly: sp.get('freeCancelOnly') === 'true',
  };
}

function buildQS(p: HotelSearchParams) {
  return new URLSearchParams({
    destination:    p.destination,
    checkIn:        p.checkIn,
    checkOut:       p.checkOut,
    adults:         String(p.adults),
    children:       String(p.children),
    rooms:          String(p.rooms),
    freeCancelOnly: String(p.freeCancelOnly),
  }).toString();
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 overflow-hidden flex animate-pulse">
      <div className="w-52 h-36 bg-gray-200 shrink-0" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/4" />
          </div>
          <div className="space-y-1 items-end flex flex-col shrink-0">
            <div className="h-5 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-100 rounded w-14" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="flex gap-1">
          {[60, 48, 72].map((w, i) => (
            <div key={i} className="h-5 bg-gray-100 rounded-full" style={{ width: `${w}px` }} />
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
      <svg className="w-14 h-14 mx-auto text-gray-200 mb-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 3a3 3 0 110 6 3 3 0 010-6zm6 14H6v-1a6 6 0 0112 0v1z"/>
      </svg>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HotelsSearchPage() {
  const rawSP  = useSearchParams();
  const router = useRouter();
  const t      = useTranslations('hotelResults');
  const tS     = useTranslations('search');

  const [searchParams, setSearchParams] = useState<HotelSearchParams>(() => parseParams(rawSP));
  const [sortBy,      setSortBy]      = useState<SortKey>('recommended');
  const [filters,     setFilters]     = useState<HotelFilterState | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const { data, isFetching, isError } = useQuery({
    queryKey: ['hotels', searchParams],
    queryFn: async () => {
      const qs = new URLSearchParams({
        destination: searchParams.destination,
        checkIn:     searchParams.checkIn,
        checkOut:    searchParams.checkOut,
        adults:      String(searchParams.adults),
        children:    String(searchParams.children),
        rooms:       String(searchParams.rooms),
        currency:    'SAR',
        maxOffers:   '40',
      });
      const res = await fetch(`/api/hotels/search?${qs}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<{ results: HotelOffer[]; count: number }>;
    },
    enabled: !!(searchParams.destination && searchParams.checkIn && searchParams.checkOut),
  });

  // Initialise filters when data first loads
  useEffect(() => {
    if (data?.results?.length) {
      setFilters(buildInitialHotelFilters(data.results));
    }
  }, [data]);

  // ── Filtered + sorted results ─────────────────────────────────────────────
  const displayedHotels = useMemo(() => {
    if (!data?.results || !filters) return [];

    let result = data.results.filter((o) => {
      if (filters.stars.size > 0) {
        const s = o.stars ? Math.round(o.stars) : 0;
        if (!filters.stars.has(s as 1 | 2 | 3 | 4 | 5)) return false;
      }
      if (filters.reviewMin > 0) {
        const score = (o as any).reviewScore ?? 0;
        if (score < filters.reviewMin) return false;
      }
      if (o.pricePerNight < filters.priceMin || o.pricePerNight > filters.priceMax) return false;
      if (filters.distanceMax < filters.distanceCap && o.distanceHaramM != null) {
        if (o.distanceHaramM > filters.distanceMax) return false;
      }
      if (filters.propertyTypes.size > 0) {
        if (!filters.propertyTypes.has((o as any).propertyType ?? '')) return false;
      }
      if (filters.amenities.size > 0) {
        for (const a of filters.amenities) {
          if (!o.amenities?.includes(a)) return false;
        }
      }
      if (filters.freeCancelOnly && !o.freeCancellation) return false;
      return true;
    });

    // Apply freeCancelOnly from search bar params too
    if (searchParams.freeCancelOnly) {
      result = result.filter((o) => o.freeCancellation);
    }

    switch (sortBy) {
      case 'cheapest':
        return [...result].sort((a, b) => a.pricePerNight - b.pricePerNight);
      case 'topRated':
        return [...result].sort((a, b) =>
          ((b as any).reviewScore ?? 0) - ((a as any).reviewScore ?? 0));
      case 'closest':
        return [...result].sort((a, b) =>
          (a.distanceHaramM ?? 999999) - (b.distanceHaramM ?? 999999));
      default:
        return result;
    }
  }, [data, filters, sortBy, searchParams.freeCancelOnly]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback((p: HotelSearchParams) => {
    setSearchParams(p);
    setFilters(null);
    router.replace(`/hotels/search?${buildQS(p)}`, { scroll: false });
  }, [router]);

  const handleSelect = useCallback((rateKey: string) => {
    const offer = data?.results.find((o) => (o.rateKey ?? o.id) === rateKey);
    if (!offer) return;
    const params = new URLSearchParams({
      rateKey,
      name:          offer.name.en ?? '',
      checkIn:       offer.checkIn,
      checkOut:      offer.checkOut,
      nights:        String(offer.nights),
      pricePerNight: String(offer.pricePerNight),
      totalPrice:    String(offer.totalPrice),
      currency:      offer.currency,
      city:          offer.city,
      stars:         String(offer.stars ?? 0),
      rooms:         String(searchParams.rooms),
      adults:        String(searchParams.adults),
      ...(offer.images?.[0] ? { image: offer.images[0] } : {}),
    });
    router.push(`/checkout/hotels?${params}`);
  }, [data, router, searchParams]);

  const SORT_TABS: { key: SortKey; label: string }[] = [
    { key: 'recommended', label: t('recommended') },
    { key: 'cheapest',    label: t('cheapest')    },
    { key: 'topRated',    label: t('topRated')    },
    { key: 'closest',     label: t('closest')     },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky search bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <HotelSearchBar
            initialParams={searchParams}
            onSearch={handleSearch}
            isLoading={isFetching}
          />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Left sidebar (desktop) ─────────────────────────────────── */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-[5.5rem]">
            {data?.results && filters ? (
              <HotelFilters
                offers={data.results}
                filters={filters}
                onChange={setFilters}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
                {[72, 56, 88, 48, 64].map((w, i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
          </aside>

          {/* ── Results area ────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1">
                {SORT_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      sortBy === key
                        ? 'bg-emerald-700 text-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Result count + mobile filter button */}
              <div className="flex items-center gap-3">
                {!isFetching && data && (
                  <span className="text-xs text-gray-500">
                    {displayedHotels.length} / {data.count ?? data.results.length} {t('resultsCount')}
                  </span>
                )}
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-xl px-3 py-1.5 bg-white hover:bg-gray-50"
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
                Could not load hotels. Please try again.
              </div>
            )}

            {/* No search yet */}
            {!searchParams.destination && (
              <EmptyState message={tS('searchHotels')} />
            )}

            {/* Loading skeletons */}
            {isFetching && (
              <>{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</>
            )}

            {/* No results */}
            {!isFetching && data && displayedHotels.length === 0 && (
              <EmptyState message={t('noResults')} />
            )}

            {/* Hotel cards */}
            {!isFetching && displayedHotels.map((offer) => (
              <HotelSearchCard
                key={offer.id}
                offer={offer}
                onSelect={handleSelect}
              />
            ))}
          </main>
        </div>
      </div>

      {/* ── Mobile filter dialog ─────────────────────────────────────────────── */}
      {filtersOpen && data?.results && filters && (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 p-0 w-full h-full bg-transparent"
          onClick={(e) => e.target === e.currentTarget && setFiltersOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-2xl max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">{t('filters')}</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <HotelFilters
              offers={data.results}
              filters={filters}
              onChange={(f) => setFilters(f)}
            />
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full mt-4 bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm"
            >
              Show {displayedHotels.length} hotels
            </button>
          </div>
        </dialog>
      )}

    </div>
  );
}
