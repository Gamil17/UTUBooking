/**
 * Booking.com Demand API v3.1 Adapter
 *
 * Implements the same HotelAdapter interface as ../hotelbeds.js
 * (searchHotels, getHotelDetails, checkAvailability + createBooking).
 *
 * Auth: HTTP Basic — Authorization: Basic base64(affiliateId:apiKey)
 * Docs: https://developers.booking.com/demand/docs
 *
 * Apply at: https://developers.booking.com
 * Approval time: 2–4 weeks
 *
 * Env vars:
 *   BOOKINGCOM_USERNAME   affiliate_id from Partner Centre
 *   BOOKINGCOM_PASSWORD   api_key from Partner Centre
 *   BOOKINGCOM_ENV        'test' | 'production'  (default: 'test')
 *   REDIS_URL
 *
 * Makkah/Haram proximity:
 *   Mirrors Hotelbeds behaviour — Makkah searches use 500 m geo-filter
 *   around Al-Masjid Al-Haram (21.4225°N, 39.8262°E).
 *
 * Redis cache key: bkcom:search:{sha256(sortedParams)}   TTL: 600 s (10 min)
 * (Booking.com allows 10 min per their rate-limit guidance)
 */

import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import Redis from 'ioredis';

// ─── Config ───────────────────────────────────────────────────────────────────

const ENV      = (process.env.BOOKINGCOM_ENV ?? 'test') as 'test' | 'production';
const BASE_URL = ENV === 'production'
  ? 'https://demandapi.booking.com/3.1'
  : 'https://demandapi-sandbox.booking.com/3.1';

// Al-Masjid Al-Haram coordinates (mirrors hotelbeds.js constant)
const HARAM_LAT       = 21.4225;
const HARAM_LON       = 39.8262;
const HARAM_RADIUS_KM = 0.5;

const MAKKAH_CODES = new Set(['MCM', 'MKH', 'MKK', 'MAKKAH', 'MECCA']);

const SEARCH_TTL = 600;   // 10 min — search results (Booking.com rate-limit guidance)
const DETAIL_TTL = 3600;  // 1 hr  — hotel content

// ─── Redis (non-fatal, same pattern as hotelbeds.js) ──────────────────────────

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err: Error) =>
  console.warn('[bookingcom-cache] Redis error:', err.message),
);

async function _cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = await redis.get(key);
    return r ? (JSON.parse(r) as T) : null;
  } catch {
    return null;
  }
}

async function _cacheSet(key: string, data: unknown, ttl = SEARCH_TTL): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch { /* non-fatal */ }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function _buildHeaders(): Record<string, string> {
  const username  = process.env.BOOKINGCOM_USERNAME ?? '';
  const password  = process.env.BOOKINGCOM_PASSWORD ?? '';
  const token     = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    Authorization:  `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
    'Accept-Encoding': 'gzip',
  };
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function _nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
  ));
}

function _haversineM(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function _isMakkahSearch(
  destination: string,
  isHajj: boolean,
  isUmrah: boolean,
): boolean {
  if (isHajj || isUmrah) return true;
  return MAKKAH_CODES.has(String(destination ?? '').toUpperCase());
}

function _cacheKey(params: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.keys(params).sort().map((k) => [k, params[k]]),
  );
  return `bkcom:search:${crypto
    .createHash('sha256')
    .update(JSON.stringify(sorted))
    .digest('hex')}`;
}

// ─── DTO types (mirrors HotelOffer from hotelbeds.js) ─────────────────────────

export interface HalalAmenities {
  no_alcohol:        boolean;
  halal_food:        boolean;
  prayer_room:       boolean;
  qibla_direction:   boolean;
  zamzam_water:      boolean;
  female_only_floor: boolean;
  no_pork:           boolean;
}

export interface HotelOffer {
  id:              string;
  bookingcomId:    string;
  hotelbedsCode:   null;           // null — this result is from Booking.com
  name:            { en: string; ar: string | null };
  stars:           number | null;
  distanceHaramM:  number | null;
  latitude:        number | null;
  longitude:       number | null;
  address:         string;
  city:            string;
  images:          string[];
  amenities:       string[];
  halalAmenities:  HalalAmenities | null;
  isHalalFriendly: boolean;
  pricePerNight:   number;
  totalPrice:      number;
  currency:        string;
  checkIn:         string;
  checkOut:        string;
  nights:          number;
  freeCancellation: boolean;
  rateKey:         string | null;  // bookingcom: <hotelId>/<rateId>
  availability:    boolean;
  source:          'bookingcom';
}

/**
 * Maps Booking.com facility list to UTUBooking halal_amenities schema.
 * Uses keyword matching on facility name strings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _extractHalalAmenitiesBC(facilities: any[]): { halalAmenities: HalalAmenities; isHalalFriendly: boolean } | null {
  if (!facilities?.length) return null;

  const names = facilities.map((f: any) =>
    (f.name ?? f.facility_name ?? f.description ?? '').toLowerCase(),
  );

  const amenities: HalalAmenities = {
    no_alcohol:         names.some((n) => n.includes('no alcohol') || n.includes('alcohol free') || n.includes('alcohol-free')),
    halal_food:         names.some((n) => n.includes('halal food') || n.includes('halal menu') || n.includes('halal restaurant') || n.includes('halal dining')),
    prayer_room:        names.some((n) => n.includes('prayer room') || n.includes('prayer space') || n.includes('musalla') || n.includes('mosque') || n.includes('prayer mat')),
    qibla_direction:    names.some((n) => n.includes('qibla') || n.includes('kiblah')),
    zamzam_water:       names.some((n) => n.includes('zamzam') || n.includes('zam zam')),
    female_only_floor:  names.some((n) => n.includes('female only') || n.includes('ladies only') || n.includes("women's floor")),
    no_pork:            names.some((n) => n.includes('no pork') || n.includes('pork free') || n.includes('pork-free')),
  };

  const isHalalFriendly = amenities.halal_food || amenities.prayer_room || amenities.no_alcohol;
  if (!Object.values(amenities).some(Boolean)) return null;

  return { halalAmenities: amenities, isHalalFriendly };
}

interface SearchOpts {
  stars?:    number;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  isHajj?:   boolean;
  isUmrah?:  boolean;
}

// ─── DTO mapper ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _toHotelOffer(raw: any, opts: {
  checkIn: string;
  checkOut: string;
  currency: string;
}): HotelOffer {
  const nights = _nightsBetween(opts.checkIn, opts.checkOut);

  const lat = raw.location?.latitude  ? parseFloat(raw.location.latitude)  : null;
  const lon = raw.location?.longitude ? parseFloat(raw.location.longitude) : null;
  const distanceHaramM = (lat && lon)
    ? _haversineM(lat, lon, HARAM_LAT, HARAM_LON)
    : null;

  const totalPrice    = parseFloat(raw.composite_price_breakdown?.gross_amount?.value
    ?? raw.price?.total
    ?? raw.min_total_price
    ?? 0);
  const pricePerNight = parseFloat((totalPrice / Math.max(nights, 1)).toFixed(2));

  const freeCancellation: boolean =
    raw.is_free_cancellable ?? raw.free_cancellation ?? false;

  const rateKey = raw.block_id
    ? `${raw.hotel_id}/${raw.block_id}`
    : null;

  return {
    id:              String(raw.hotel_id ?? raw.id),
    bookingcomId:    String(raw.hotel_id ?? raw.id),
    hotelbedsCode:   null,
    name: {
      en: raw.hotel_name ?? raw.name ?? '',
      ar: null,  // Booking.com returns localised name via Accept-Language if configured
    },
    stars:           raw.stars ? parseInt(raw.stars, 10) : null,
    distanceHaramM,
    latitude:        lat,
    longitude:       lon,
    address:         raw.address?.address_line_1 ?? raw.address ?? '',
    city:            raw.city_name ?? raw.city ?? '',
    images:          _extractImages(raw.main_photo_url, raw.photos),
    amenities:       _extractFacilities(raw.hotel_facilities ?? raw.facilities ?? []),
    ...( () => {
      const h = _extractHalalAmenitiesBC(raw.hotel_facilities ?? raw.facilities ?? []);
      return { halalAmenities: h?.halalAmenities ?? null, isHalalFriendly: h?.isHalalFriendly ?? false };
    })(),
    pricePerNight,
    totalPrice,
    currency:        opts.currency,
    checkIn:         opts.checkIn,
    checkOut:        opts.checkOut,
    nights,
    freeCancellation,
    rateKey,
    availability:    true,
    source:          'bookingcom',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _extractImages(mainPhotoUrl: string | null, photos: any[]): string[] {
  const out: string[] = [];
  if (mainPhotoUrl) out.push(mainPhotoUrl);
  if (Array.isArray(photos)) {
    for (const p of photos.slice(0, 8)) {
      const url = p.url_max ?? p.url ?? p.uri;
      if (url && !out.includes(url)) out.push(url);
    }
  }
  return out.slice(0, 8);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _extractFacilities(facilities: any[]): string[] {
  if (!Array.isArray(facilities)) return [];
  return facilities
    .slice(0, 15)
    .map((f) => f.name ?? f.facility_name ?? f)
    .filter((name) => typeof name === 'string' && name.length > 0) as string[];
}

// ─── searchHotels ─────────────────────────────────────────────────────────────

/**
 * Search hotel availability via Booking.com Demand API.
 *
 * @param destination   Booking.com city ID, destination name, or Makkah code
 * @param checkIn       'YYYY-MM-DD'
 * @param checkOut      'YYYY-MM-DD'
 * @param guests        number of adult guests
 * @param opts          optional filters (stars, priceMin, priceMax, currency, isHajj, isUmrah)
 * @returns             HotelOffer[]
 */
export async function searchHotels(
  destination: string,
  checkIn:     string,
  checkOut:    string,
  guests:      number | string,
  opts:        SearchOpts = {},
): Promise<HotelOffer[]> {
  const {
    stars,
    priceMin,
    priceMax,
    currency = 'EUR',
    isHajj  = false,
    isUmrah = false,
  } = opts;

  const key = _cacheKey({
    destination, checkIn, checkOut, guests,
    stars, priceMin, priceMax, currency, isHajj, isUmrah,
    src: 'bkcom',
  });

  const cached = await _cacheGet<HotelOffer[]>(key);
  if (cached) return cached;

  // Booking.com Demand API — POST /accommodations/search
  const body: Record<string, unknown> = {
    checkin:        checkIn,
    checkout:       checkOut,
    guests:         [{ adults: parseInt(String(guests), 10), children: [] }],
    currency,
    extras:         ['hotel_info', 'hotel_facilities', 'photos'],
    ...(stars && { filter: { stars: [parseInt(String(stars), 10)] } }),
    ...(priceMin !== undefined && {
      price_filter_currency: currency,
      price_filter_min:      priceMin,
    }),
    ...(priceMax !== undefined && {
      price_filter_max: priceMax,
    }),
  };

  // Makkah: use geolocation search within 500 m of Haram
  if (_isMakkahSearch(destination, isHajj, isUmrah)) {
    Object.assign(body, {
      latitude:  HARAM_LAT,
      longitude: HARAM_LON,
      radius:    HARAM_RADIUS_KM * 1000,  // Booking.com uses metres
    });
  } else {
    body.city_ids = [destination];
  }

  let res: AxiosResponse;
  try {
    res = await axios.post(`${BASE_URL}/accommodations/search`, body, {
      headers: _buildHeaders(),
      timeout: 25000,
    });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
    throw new BookingComError(
      e.response?.data?.message ?? e.message ?? 'Booking.com search failed',
      e.response?.status ?? 502,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawHotels: any[] = res.data?.result ?? res.data?.hotels ?? res.data?.data ?? [];
  let offers = rawHotels.map((h) =>
    _toHotelOffer(h, { checkIn, checkOut, currency }),
  );

  // Makkah secondary filter (API radius is approximate)
  if (_isMakkahSearch(destination, isHajj, isUmrah)) {
    offers = offers
      .filter((o) => o.distanceHaramM === null || o.distanceHaramM <= 500)
      .sort((a, b) => (a.distanceHaramM ?? 9999) - (b.distanceHaramM ?? 9999));
  }

  await _cacheSet(key, offers, SEARCH_TTL);
  return offers;
}

// ─── getHotelDetails ──────────────────────────────────────────────────────────

/**
 * Fetch full hotel content (all photos, facilities, coordinates, description).
 *
 * @param hotelId   Booking.com hotel_id
 */
export async function getHotelDetails(hotelId: string | number): Promise<object> {
  const cacheKey = `bkcom:detail:${hotelId}`;
  const cached   = await _cacheGet<object>(cacheKey);
  if (cached) return cached;

  let res: AxiosResponse;
  try {
    res = await axios.get(`${BASE_URL}/accommodations/${hotelId}`, {
      headers: _buildHeaders(),
      timeout: 15000,
      params:  { extras: 'hotel_info,hotel_facilities,photos,location' },
    });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
    throw new BookingComError(
      e.response?.data?.message ?? e.message ?? 'Booking.com detail fetch failed',
      e.response?.status ?? 502,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = res.data?.hotel ?? res.data;
  const lat = raw.location?.latitude  ? parseFloat(raw.location.latitude)  : null;
  const lon = raw.location?.longitude ? parseFloat(raw.location.longitude) : null;

  const detail = {
    id:           String(raw.hotel_id ?? hotelId),
    bookingcomId: String(raw.hotel_id ?? hotelId),
    name: { en: raw.hotel_name ?? raw.name ?? '', ar: null },
    stars:           raw.stars ? parseInt(raw.stars, 10) : null,
    distanceHaramM:  (lat && lon) ? _haversineM(lat, lon, HARAM_LAT, HARAM_LON) : null,
    latitude:        lat,
    longitude:       lon,
    address:         raw.address?.address_line_1 ?? raw.address ?? '',
    city:            raw.city_name ?? raw.city ?? '',
    country:         raw.country_code ?? '',
    description:     raw.hotel_description ?? raw.description ?? '',
    images:          _extractImages(raw.main_photo_url, raw.photos ?? []),
    amenities:       (raw.hotel_facilities ?? raw.facilities ?? [])
      .map((f: { name?: string; facility_name?: string }) =>
        ({ name: f.name ?? f.facility_name ?? '', groupName: '' }))
      .filter((f: { name: string }) => f.name),
    checkInTime:     raw.checkin?.from ?? '15:00',
    checkOutTime:    raw.checkout?.until ?? '12:00',
    phones:          (raw.phone_number ? [raw.phone_number] : []),
    source:          'bookingcom',
  };

  await _cacheSet(cacheKey, detail, DETAIL_TTL);
  return detail;
}

// ─── checkAvailability ────────────────────────────────────────────────────────

/**
 * Re-check rates and availability for a specific hotel + rate combo.
 * Call this immediately before booking to confirm the price is still valid.
 *
 * @param hotelId   Booking.com hotel_id
 * @param rateId    block_id from the original search result
 * @returns         { rateKey, net, currency, freeCancellation, ... }
 */
export async function checkAvailability(
  hotelId: string,
  rateId:  string,
): Promise<{
  rateKey:             string;
  net:                 number;
  currency:            string;
  freeCancellation:    boolean;
  cancellationPolicies: unknown[];
  boardName:           string;
}> {
  let res: AxiosResponse;
  try {
    res = await axios.post(`${BASE_URL}/accommodations/rates`, {
      hotel_ids: [hotelId],
      block_ids: [rateId],
    }, {
      headers: _buildHeaders(),
      timeout: 15000,
    });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
    throw new BookingComError(
      e.response?.data?.message ?? e.message ?? 'Booking.com rate check failed',
      e.response?.status ?? 502,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const block: any = res.data?.result?.[0] ?? res.data?.blocks?.[0];
  if (!block) {
    throw new BookingComError('Rate no longer available — block not found', 410);
  }

  const net              = parseFloat(block.price?.total ?? block.min_total_price ?? 0);
  const freeCancellation = block.is_free_cancellable ?? false;
  const policies         = block.cancellation_policies ?? [];

  return {
    rateKey:             `${hotelId}/${rateId}`,
    net,
    currency:            block.price?.currency ?? 'EUR',
    freeCancellation,
    cancellationPolicies: policies,
    boardName:           block.mealplan_description ?? block.board ?? '',
  };
}

// ─── createBooking ────────────────────────────────────────────────────────────

/**
 * Create a confirmed booking via the Booking.com Demand API.
 *
 * Booking.com Demand API bookings require prior customer authentication
 * through OAuth2 (Booking.com login). For B2B affiliate flows,
 * use the business_model: 'agency' endpoint.
 *
 * @param rateKey   '<hotelId>/<blockId>' from checkAvailability()
 * @param traveler  { firstName, lastName, email, phone }
 * @param _payment  unused — Booking.com handles payment directly
 * @param clientRef optional internal reference (e.g. UTU-20260307-XXXX)
 */
export async function createBooking(
  rateKey:    string,
  traveler:   { firstName: string; lastName: string; email: string; phone?: string },
  _payment:   unknown = null,
  clientRef:  string | null = null,
): Promise<{
  bookingRef:           string;
  status:               string;
  hotel:                { code: string; name: string };
  totalNet:             number;
  currency:             string;
  freeCancellation:     boolean;
  cancellationPolicies: unknown[];
  clientReference:      string;
  source:               'bookingcom';
  raw:                  unknown;
}> {
  const [hotelId, blockId] = rateKey.split('/');
  const ref = clientRef ?? `UTU-${Date.now()}`;

  let res: AxiosResponse;
  try {
    res = await axios.post(`${BASE_URL}/orders`, {
      hotel_id:         hotelId,
      block_id:         blockId,
      customer:         {
        first_name:   traveler.firstName,
        last_name:    traveler.lastName,
        email:        traveler.email,
        telephone:    traveler.phone ?? '',
      },
      affiliate_ref:    ref,
      business_model:   'agency',
    }, {
      headers: _buildHeaders(),
      timeout: 30000,
    });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
    throw new BookingComError(
      e.response?.data?.message ?? e.message ?? 'Booking.com booking failed',
      e.response?.status ?? 502,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking: any = res.data?.booking ?? res.data?.reservation ?? res.data;
  if (!booking) throw new BookingComError('Empty booking response from Booking.com', 502);

  return {
    bookingRef:           String(booking.order_id ?? booking.booking_ref ?? booking.id ?? ''),
    status:               booking.status ?? 'CONFIRMED',
    hotel: {
      code: String(hotelId),
      name: booking.hotel_name ?? '',
    },
    totalNet:             parseFloat(booking.price?.total ?? booking.total_price ?? 0),
    currency:             booking.price?.currency ?? 'EUR',
    freeCancellation:     booking.is_free_cancellable ?? false,
    cancellationPolicies: booking.cancellation_policies ?? [],
    clientReference:      ref,
    source:               'bookingcom',
    raw:                  booking,
  };
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class BookingComError extends Error {
  statusCode: number;
  status:     number;
  raw:        unknown;

  constructor(message: string, statusCode = 502, raw: unknown = null) {
    super(message);
    this.name       = 'BookingComError';
    this.statusCode = statusCode;
    this.status     = statusCode;
    this.raw        = raw;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export default {
  searchHotels,
  getHotelDetails,
  checkAvailability,
  createBooking,
  BookingComError,
  _haversineM,  // exported for unit tests
};
