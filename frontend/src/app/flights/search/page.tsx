'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LOCALE_CURRENCY } from '@/i18n/config';
import { useQuery } from '@tanstack/react-query';
import type { FlightOffer } from '@/lib/api';
import FlightCard from '@/components/flights/FlightCard';
import FlightFilters, { type FilterState, buildInitialFilters } from '@/components/flights/FlightFilters';
import FlightSearchBar, { type SearchBarParams } from '@/components/flights/FlightSearchBar';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey = 'recommended' | 'cheapest' | 'fastest' | 'departure';

// ─── URL param helpers ────────────────────────────────────────────────────────
function parseParams(sp: ReturnType<typeof useSearchParams>): SearchBarParams {
  return {
    from:     (sp.get('from') ?? '').toUpperCase(),
    to:       (sp.get('to')   ?? '').toUpperCase(),
    depart:   sp.get('depart')   ?? '',
    return:   sp.get('return')   ?? '',
    tripType: (sp.get('tripType') as SearchBarParams['tripType']) ?? 'oneway',
    cabin:    (sp.get('cabin')   as SearchBarParams['cabin'])    ?? 'economy',
    adults:   Math.max(1, parseInt(sp.get('adults') ?? '1', 10)),
  };
}

function buildQS(p: SearchBarParams) {
  const base: Record<string, string> = {
    from: p.from, to: p.to, depart: p.depart,
    tripType: p.tripType, cabin: p.cabin, adults: String(p.adults),
  };
  if (p.tripType === 'roundtrip' && p.return) base.return = p.return;
  return new URLSearchParams(base).toString();
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-4 mb-3 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-utu-border-default shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-4 bg-utu-border-default rounded" />
            <div className="flex-1 h-2 bg-utu-bg-muted rounded" />
            <div className="w-10 h-4 bg-utu-border-default rounded" />
          </div>
          <div className="w-2/3 h-2 bg-utu-bg-muted rounded" />
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="w-20 h-5 bg-utu-border-default rounded" />
          <div className="w-16 h-8 bg-utu-border-default rounded-xl" />
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
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
      <p className="text-utu-text-muted text-sm">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FlightsSearchPage() {
  const rawSP  = useSearchParams();
  const router = useRouter();
  const locale   = useLocale();
  const currency = LOCALE_CURRENCY[locale as keyof typeof LOCALE_CURRENCY] ?? 'SAR';
  const t        = useTranslations('flightResults');
  const tSearch  = useTranslations('search');

  const [searchParams, setSearchParams] = useState<SearchBarParams>(() => parseParams(rawSP));
  const [sortBy,   setSortBy]   = useState<SortKey>('recommended');
  const [filters,  setFilters]  = useState<FilterState | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Data fetch ─────────────────────────────────────────────────────────
  const { data, isFetching, isError } = useQuery({
    queryKey: ['flights', searchParams],
    queryFn: async () => {
      const qs = new URLSearchParams({
        origin:      searchParams.from,
        destination: searchParams.to,
        date:        searchParams.depart,
        adults:      String(searchParams.adults),
        cabinClass:  searchParams.cabin.toUpperCase().replace('_', '_'),
        currency,
        maxOffers:   '50',
        ...(searchParams.tripType === 'roundtrip' && searchParams.return
          ? { returnDate: searchParams.return } : {}),
      });
      const res = await fetch(`/api/flights/search?${qs}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<{ results: FlightOffer[]; count: number }>;
    },
    enabled: !!(searchParams.from && searchParams.to && searchParams.depart),
  });

  // Derive default filters from data — user overrides layered on top via setFilters
  const defaultFilters = useMemo(
    () => (data?.results?.length ? buildInitialFilters(data.results) : null),
    [data],
  );
  const effectiveFilters = filters ?? defaultFilters;

  // ── Tag computation ────────────────────────────────────────────────────
  const offerTags = useMemo(() => {
    if (!data?.results?.length) return new Map<string, string[]>();
    const minPrice    = Math.min(...data.results.map((o) => o.price));
    const minDuration = Math.min(...data.results.map((o) => o.durationMinutes));
    return new Map(
      data.results.map((o) => [o.id, [
        ...(o.price === minPrice              ? ['cheapest']   : []),
        ...(o.durationMinutes === minDuration && o.stops === 0 ? ['best_value'] : []),
        ...(o.stops === 0                     ? ['direct']     : []),
      ]])
    );
  }, [data]);

  // ── Filtered + sorted results ──────────────────────────────────────────
  const displayedOffers = useMemo(() => {
    if (!data?.results || !effectiveFilters) return [];

    const result = data.results.filter((o) => {
      if (effectiveFilters.stops.size > 0) {
        const k = o.stops >= 2 ? 2 : o.stops as 0 | 1 | 2;
        if (!effectiveFilters.stops.has(k)) return false;
      }
      if (o.price < effectiveFilters.priceMin || o.price > effectiveFilters.priceMax) return false;
      if (effectiveFilters.departureBlocks.size > 0) {
        const block = Math.floor(new Date(o.departureAt).getHours() / 6) as 0 | 1 | 2 | 3;
        if (!effectiveFilters.departureBlocks.has(block)) return false;
      }
      if (effectiveFilters.airlines.size > 0 && !effectiveFilters.airlines.has(o.airlineCode)) return false;
      if (o.durationMinutes > effectiveFilters.maxDuration) return false;
      if (effectiveFilters.baggageOnly && !o.baggageIncluded) return false;
      return true;
    });

    switch (sortBy) {
      case 'cheapest':   return [...result].sort((a, b) => a.price - b.price);
      case 'fastest':    return [...result].sort((a, b) => a.durationMinutes - b.durationMinutes);
      case 'departure':  return [...result].sort((a, b) =>
        new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime());
      default:           return result;
    }
  }, [data, effectiveFilters, sortBy]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSearch = useCallback((p: SearchBarParams) => {
    setSearchParams(p);
    setFilters(null);
    router.replace(`/flights/search?${buildQS(p)}`, { scroll: false });
  }, [router]);

  const handleSelect = useCallback((id: string) => {
    const offer = data?.results.find((o) => o.id === id);
    if (!offer) return;
    const params = new URLSearchParams({
      offerId:   id,
      from:      offer.originIata,
      to:        offer.destinationIata,
      depart:    offer.departureAt,
      airline:   offer.airlineCode,
      flightNum: offer.flightNum,
      cabin:     offer.cabinClass.toLowerCase(),
      adults:    String(searchParams.adults),
      price:     String(offer.price),
      currency:  offer.currency,
      duration:  String(offer.durationMinutes),
      stops:     String(offer.stops),
      ...(searchParams.tripType === 'roundtrip' && searchParams.return
        ? { return: searchParams.return } : {}),
    });
    router.push(`/checkout/flights?${params}`);
  }, [data, router, searchParams]);

  const isReturn = searchParams.tripType === 'roundtrip';

  const SORT_TABS: { key: SortKey; label: string }[] = [
    { key: 'recommended', label: t('recommended') },
    { key: 'cheapest',    label: t('cheapest')    },
    { key: 'fastest',     label: t('fastest')     },
    { key: 'departure',   label: t('departureTime') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* ── Sticky search bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-utu-bg-card shadow-sm border-b border-utu-border-default">
        <div className="max-w-7xl mx-auto px-4">
          <FlightSearchBar
            initialParams={searchParams}
            onSearch={handleSearch}
            isLoading={isFetching}
          />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Left sidebar (desktop) ──────────────────────────────────── */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-[5.5rem]">
            {data?.results && effectiveFilters ? (
              <FlightFilters
                offers={data.results}
                filters={effectiveFilters}
                onChange={setFilters}
              />
            ) : (
              <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 animate-pulse space-y-3">
                {[72, 56, 88, 48].map((w, i) => (
                  <div key={i} className={`h-3 bg-utu-border-default rounded`} style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
          </aside>

          {/* ── Results area ─────────────────────────────────────────────── */}
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
                    {displayedOffers.length} / {data.count ?? data.results.length} {t('resultsCount').replace('{count}', '')}
                  </span>
                )}
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-semibold border border-utu-border-default rounded-xl px-3 py-1.5 bg-utu-bg-card hover:bg-utu-bg-muted"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M10 20h4" />
                  </svg>
                  {t('filters')}
                </button>
              </div>
            </div>

            {/* Error */}
            {isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
                Could not load flights. Please try again.
              </div>
            )}

            {/* No search yet */}
            {!searchParams.from && !searchParams.to && (
              <EmptyState message={tSearch('searchFlights')} />
            )}

            {/* Loading skeletons */}
            {isFetching && (
              <>{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</>
            )}

            {/* No results */}
            {!isFetching && data && displayedOffers.length === 0 && (
              <EmptyState message={t('noResults')} />
            )}

            {/* Flight cards */}
            {!isFetching && displayedOffers.map((offer) => (
              <FlightCard
                key={offer.id}
                offer={offer}
                isReturn={isReturn}
                tags={offerTags.get(offer.id) ?? []}
                onSelect={handleSelect}
              />
            ))}
          </main>
        </div>
      </div>

      {/* ── Mobile filter dialog ────────────────────────────────────────────── */}
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
            <FlightFilters
              offers={data.results}
              filters={filters}
              onChange={(f) => { setFilters(f); }}
            />
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full mt-4 bg-utu-navy text-white font-semibold py-3 rounded-xl text-sm"
            >
              Show {displayedOffers.length} flights
            </button>
          </div>
        </dialog>
      )}

    </div>
  );
}
