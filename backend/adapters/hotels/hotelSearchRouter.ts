/**
 * Hotel Search Router
 *
 * Single entry point for hotel availability searches across all markets.
 * Routes requests to the correct upstream adapter based on destination / country:
 *
 *   EU + UK city searches  →  Booking.com Demand API  (bookingCom.ts)
 *   Makkah / Madinah       →  Hotelbeds               (hotelbeds.js)
 *   All other markets      →  Hotelbeds (default)
 *
 * Returns a merged, deduplicated, ranked HotelOffer[] sorted by price.
 *
 * Usage:
 *   import { searchHotelsRouted } from './hotelSearchRouter';
 *   const offers = await searchHotelsRouted({ destination, checkIn, checkOut, guests, countryCode });
 */

import { searchHotels as searchHotelsBC, BookingComError } from './bookingCom';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { overlayPartnerData } = require('../../hotel-service/src/services/partnership.service') as {
  overlayPartnerData: (offers: HotelOffer[]) => Promise<HotelOffer[]>;
};
// hotelbeds.js is CommonJS — use require + type cast
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hotelbeds = require('../hotelbeds.js') as {
  searchHotels: (
    destination: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    opts?: Record<string, unknown>,
  ) => Promise<HotelOffer[]>;
  HotelbedsError: new (message: string, statusCode?: number) => Error;
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface HotelOffer {
  id:               string;
  name:             { en: string; ar: string | null };
  stars:            number | null;
  distanceHaramM:   number | null;
  address:          string;
  city:             string;
  images:           string[];
  amenities:        string[];
  halalAmenities:   Record<string, boolean> | null;
  isHalalFriendly:  boolean;
  pricePerNight:    number;
  totalPrice:       number;
  currency:         string;
  checkIn:          string;
  checkOut:         string;
  nights:           number;
  freeCancellation: boolean;
  rateKey:          string | null;
  availability:     boolean;
  source:           'hotelbeds' | 'bookingcom';
  reviewScore?:     number | null;
  // Direct partnership fields — set by partnership.service overlayPartnerData()
  isDirectPartner?: boolean;
  commissionRate?:  number;          // e.g. 15.0 = 15%
  partnerTier?:     'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface SearchParams {
  destination:  string;        // city name, IATA, or Booking.com city ID
  checkIn:      string;        // 'YYYY-MM-DD'
  checkOut:     string;        // 'YYYY-MM-DD'
  guests:       number;
  countryCode?: string;        // ISO-2 user country (used to pick EU vs non-EU adapter)
  stars?:       number;
  priceMin?:    number;
  priceMax?:    number;
  currency?:    string;
  isHajj?:      boolean;
  isUmrah?:     boolean;
}

// ─── EU market detection ───────────────────────────────────────────────────────

/**
 * ISO-2 country codes served by Booking.com (EU + UK markets).
 * These get routed to the Booking.com adapter for better local inventory coverage.
 */
const EU_COUNTRY_CODES = new Set([
  'GB', 'DE', 'FR', 'NL', 'ES', 'IT', 'PL', 'BE', 'AT', 'SE',
  'NO', 'DK', 'FI', 'PT', 'IE', 'CH', 'CZ', 'HU', 'RO', 'GR',
]);

/**
 * Makkah / Madinah destination codes — always routed to Hotelbeds.
 */
const HARAM_DESTINATIONS = new Set([
  'MCM', 'MKH', 'MKK', 'MAKKAH', 'MECCA', 'MED', 'MDE', 'MADINAH', 'MEDINA',
]);

function _isHaramDestination(destination: string, isHajj: boolean, isUmrah: boolean): boolean {
  if (isHajj || isUmrah) return true;
  return HARAM_DESTINATIONS.has(destination.toUpperCase());
}

function _isEuSearch(destination: string, countryCode?: string): boolean {
  if (countryCode && EU_COUNTRY_CODES.has(countryCode.toUpperCase())) return true;
  // Fallback: city name heuristics for common EU cities when countryCode not provided
  const dest = destination.toLowerCase();
  const EU_CITY_NAMES = [
    'london', 'manchester', 'birmingham', 'glasgow',
    'berlin', 'munich', 'frankfurt', 'hamburg', 'cologne',
    'paris', 'lyon', 'marseille',
    'amsterdam', 'rotterdam',
    'madrid', 'barcelona',
    'rome', 'milan',
    'warsaw', 'krakow',
    'brussels', 'vienna', 'stockholm', 'oslo', 'copenhagen',
  ];
  return EU_CITY_NAMES.some((c) => dest.includes(c));
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Remove duplicate hotels by normalized name + city match.
 * When both adapters return the same property, keep the lower-priced result.
 */
function _deduplicate(offers: HotelOffer[]): HotelOffer[] {
  const seen = new Map<string, HotelOffer>();
  for (const offer of offers) {
    const key = `${offer.name.en.toLowerCase().replace(/\W+/g, '')}|${offer.city.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || offer.pricePerNight < existing.pricePerNight) {
      seen.set(key, offer);
    }
  }
  return Array.from(seen.values());
}

// ─── searchHotelsRouted ───────────────────────────────────────────────────────

/**
 * Route a hotel search to the correct upstream adapter(s).
 *
 * Strategy:
 *  1. Haram/Hajj/Umrah destination → Hotelbeds only (specialist Makkah inventory)
 *  2. EU + UK destination          → Booking.com primary; Hotelbeds as fallback
 *  3. All other destinations       → Hotelbeds only
 *
 * @returns Ranked HotelOffer[] (cheapest first; Haram searches sorted by proximity)
 */
export async function searchHotelsRouted(params: SearchParams): Promise<HotelOffer[]> {
  const {
    destination,
    checkIn,
    checkOut,
    guests,
    countryCode,
    stars,
    priceMin,
    priceMax,
    currency,
    isHajj  = false,
    isUmrah = false,
  } = params;

  // 1 — Haram: always Hotelbeds only (best Makkah/Madinah inventory)
  //     After fetch, overlay direct-partnership metadata so UI can badge partner hotels.
  if (_isHaramDestination(destination, isHajj, isUmrah)) {
    const haramOffers = await hotelbeds.searchHotels(destination, checkIn, checkOut, guests, {
      stars, priceMin, priceMax,
      currency: currency ?? 'SAR',
      isHajj, isUmrah,
    });
    return overlayPartnerData(haramOffers);
  }

  // 2 — EU + UK: Booking.com primary, Hotelbeds fallback
  if (_isEuSearch(destination, countryCode)) {
    const euCurrency = currency ?? 'EUR';
    let bcOffers: HotelOffer[] = [];

    try {
      bcOffers = (await searchHotelsBC(destination, checkIn, checkOut, guests, {
        stars, priceMin, priceMax,
        currency: euCurrency,
        isHajj: false, isUmrah: false,
      })) as HotelOffer[];
    } catch (err) {
      if (err instanceof BookingComError) {
        console.warn(`[hotelSearchRouter] Booking.com unavailable for ${destination} — falling back to Hotelbeds:`, err.message);
      } else {
        throw err;
      }
    }

    // If Booking.com returned results, use them (+ optional Hotelbeds merge for Makkah)
    if (bcOffers.length > 0) {
      return bcOffers.sort((a, b) => a.pricePerNight - b.pricePerNight);
    }

    // Hotelbeds fallback if Booking.com returned 0 results
    try {
      const hbOffers = await hotelbeds.searchHotels(destination, checkIn, checkOut, guests, {
        stars, priceMin, priceMax, currency: euCurrency,
      });
      return hbOffers.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } catch {
      return []; // no inventory from either source
    }
  }

  // 3 — All other markets: Hotelbeds only
  const allOffers = await hotelbeds.searchHotels(destination, checkIn, checkOut, guests, {
    stars, priceMin, priceMax,
    currency: currency ?? 'SAR',
    isHajj, isUmrah,
  });
  return allOffers;
}

/**
 * Search both adapters in parallel and merge + deduplicate results.
 * Use when you want the broadest possible inventory (e.g. EU city where
 * both Hotelbeds and Booking.com have strong supply).
 *
 * @returns Merged, deduplicated, price-sorted HotelOffer[]
 */
export async function searchHotelsBothSources(params: SearchParams): Promise<HotelOffer[]> {
  const {
    destination, checkIn, checkOut, guests,
    countryCode, stars, priceMin, priceMax, currency,
    isHajj = false, isUmrah = false,
  } = params;

  const euCurrency = currency ?? (_isEuSearch(destination, countryCode) ? 'EUR' : 'SAR');
  const opts = { stars, priceMin, priceMax, currency: euCurrency, isHajj, isUmrah };

  const [bcResult, hbResult] = await Promise.allSettled([
    searchHotelsBC(destination, checkIn, checkOut, guests, opts) as Promise<HotelOffer[]>,
    hotelbeds.searchHotels(destination, checkIn, checkOut, guests, opts),
  ]);

  const bcOffers = bcResult.status === 'fulfilled' ? bcResult.value : [];
  const hbOffers = hbResult.status === 'fulfilled' ? hbResult.value : [];

  if (bcResult.status === 'rejected') {
    console.warn('[hotelSearchRouter] Booking.com parallel fetch error:', (bcResult.reason as Error).message);
  }
  if (hbResult.status === 'rejected') {
    console.warn('[hotelSearchRouter] Hotelbeds parallel fetch error:', (hbResult.reason as Error).message);
  }

  const merged = _deduplicate([...bcOffers, ...hbOffers]);
  return merged.sort((a, b) => a.pricePerNight - b.pricePerNight);
}

export default { searchHotelsRouted, searchHotelsBothSources };
