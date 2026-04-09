'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LOCALE_CURRENCY } from '@/i18n/config';
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
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm mb-3 overflow-hidden flex animate-pulse">
      <div className="w-52 h-36 bg-utu-border-default shrink-0" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-utu-border-default rounded w-3/4" />
            <div className="h-3 bg-utu-bg-muted rounded w-1/4" />
          </div>
          <div className="space-y-1 items-end flex flex-col shrink-0">
            <div className="h-5 bg-utu-border-default rounded w-20" />
            <div className="h-3 bg-utu-bg-muted rounded w-14" />
          </div>
        </div>
        <div className="h-3 bg-utu-bg-muted rounded w-2/3" />
        <div className="flex gap-1">
          {[60, 48, 72].map((w, i) => (
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
        <path d="M19 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 3a3 3 0 110 6 3 3 0 010-6zm6 14H6v-1a6 6 0 0112 0v1z"/>
      </svg>
      <p className="text-utu-text-muted text-sm">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HotelsSearchPage() {
  const rawSP  = useSearchParams();
  const router = useRouter();
  const t      = useTranslations('hotelResults');
  const tS     = useTranslations('search');
  const locale = useLocale();
  const currency = LOCALE_CURRENCY[locale as keyof typeof LOCALE_CURRENCY] ?? 'SAR';

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
        currency,
        maxOffers:   '40',
      });
      const res = await fetch(`/api/hotels/search?${qs}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<{ results: HotelOffer[]; count: number }>;
    },
    enabled: !!(searchParams.destination && searchParams.checkIn && searchParams.checkOut),
  });

  // Derive default filters from data — user overrides layered on top via setFilters
  const defaultFilters = useMemo(
    () => (data?.results?.length ? buildInitialHotelFilters(data.results) : null),
    [data],
  );
  const effectiveFilters = filters ?? defaultFilters;

  // ── Filtered + sorted results ─────────────────────────────────────────────
  const displayedHotels = useMemo(() => {
    if (!data?.results || !effectiveFilters) return [];

    let result = data.results.filter((o) => {
      if (effectiveFilters.stars.size > 0) {
        const s = o.stars ? Math.round(o.stars) : 0;
        if (!effectiveFilters.stars.has(s as 1 | 2 | 3 | 4 | 5)) return false;
      }
      if (effectiveFilters.reviewMin > 0) {
        const score = o.reviewScore ?? 0;
        if (score < effectiveFilters.reviewMin) return false;
      }
      if (o.pricePerNight < effectiveFilters.priceMin || o.pricePerNight > effectiveFilters.priceMax) return false;
      if (effectiveFilters.distanceMax < effectiveFilters.distanceCap && o.distanceHaramM != null) {
        if (o.distanceHaramM > effectiveFilters.distanceMax) return false;
      }
      if (effectiveFilters.propertyTypes.size > 0) {
        if (!effectiveFilters.propertyTypes.has(o.propertyType ?? '')) return false;
      }
      if (effectiveFilters.amenities.size > 0) {
        for (const a of effectiveFilters.amenities) {
          if (!o.amenities?.includes(a)) return false;
        }
      }
      if (effectiveFilters.freeCancelOnly && !o.freeCancellation) return false;
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
          (b.reviewScore ?? 0) - (a.reviewScore ?? 0));
      case 'closest':
        return [...result].sort((a, b) =>
          (a.distanceHaramM ?? 999999) - (b.distanceHaramM ?? 999999));
      default:
        return result;
    }
  }, [data, effectiveFilters, sortBy, searchParams.freeCancelOnly]);

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
    <div className="min-h-screen bg-utu-bg-page">

      {/* ── Sticky search bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-utu-bg-card shadow-sm border-b border-utu-border-default">
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
            {data?.results && effectiveFilters ? (
              <HotelFilters
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

          {/* ── Results area ────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-utu-bg-card rounded-xl border border-utu-border-default shadow-sm p-1">
                {SORT_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      sortBy === key
                        ? 'bg-utu-navy text-white'
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
                    {displayedHotels.length} / {data.count ?? data.results.length} {t('resultsCount')}
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
          <div className="absolute bottom-0 left-0 right-0 bg-utu-bg-page rounded-t-2xl max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-utu-text-primary">{t('filters')}</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default"
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
              className="w-full mt-4 bg-utu-navy text-white font-semibold py-3 rounded-xl text-sm"
            >
              Show {displayedHotels.length} hotels
            </button>
          </div>
        </dialog>
      )}

    </div>
  );
}
