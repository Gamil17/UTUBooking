'use client';

/**
 * HalalRestaurantList
 *
 * Fetches and displays halal restaurants near a hotel/city center.
 * Calls GET /api/poi/halal?lat=...&lng=...&radius=...
 * Used on hotel detail pages and US city guide pages.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface PoiResult {
  id:               string;
  name:             string;
  address:          string;
  lat:              number | null;
  lng:              number | null;
  rating:           number | null;
  userRatingsTotal: number;
  priceLevel:       number | null;
  openNow:          boolean | null;
  types:            string[];
  photos:           string[];
  source:           string;
}

interface Props {
  lat:      number;
  lng:      number;
  radius?:  number;
  cityName: string;
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <span className="text-amber-400 text-xs" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span className="text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function PriceLevel({ level }: { level: number | null }) {
  if (level === null) return null;
  return (
    <span className="text-gray-500 text-xs" aria-label={`Price level ${level} of 4`}>
      {'$'.repeat(level + 1)}
    </span>
  );
}

export default function HalalRestaurantList({ lat, lng, radius = 1500, cityName }: Props) {
  const t = useTranslations('cityGuide');
  const [results,  setResults]  = useState<PoiResult[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/poi/halal?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to load'); return; }
      setResults(data.results ?? []);
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [lat, lng, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
        <span className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-sm">{t('loadingRestaurants')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={load}
          className="text-sm text-emerald-600 underline min-h-[44px] px-4"
        >
          {t('retryBtn')}
        </button>
      </div>
    );
  }

  if (!results.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">{t('noRestaurants')}</p>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((place) => (
        <div
          key={place.id}
          className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:shadow-sm transition-shadow"
          role="article"
          aria-label={place.name}
        >
          {/* Photo */}
          {place.photos[0] ? (
            <img
              src={place.photos[0]}
              alt={place.name}
              className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-xl">
              🥩
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{place.name}</p>
            <p className="text-xs text-gray-500 truncate">{place.address}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <StarRating rating={place.rating} />
              {place.userRatingsTotal > 0 && (
                <span className="text-xs text-gray-400">({place.userRatingsTotal.toLocaleString()})</span>
              )}
              <PriceLevel level={place.priceLevel} />
              {place.openNow !== null && (
                <span className={`text-xs font-medium ${place.openNow ? 'text-emerald-600' : 'text-red-500'}`}>
                  {place.openNow ? 'Open' : 'Closed'}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400 text-center pt-1">
        Halal restaurants within {(radius / 1000).toFixed(1)} km · {cityName}
      </p>
    </div>
  );
}
