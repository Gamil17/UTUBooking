'use strict';

/**
 * Booking.com Demand API v3.1 Adapter — plain-JS port of bookingCom.ts
 *
 * This file is the CommonJS equivalent of bookingCom.ts. It exists so that
 * the hotel-service (plain Node.js, no TypeScript compiler) can require() it
 * without ts-node or a build step.
 *
 * Keep logic in sync with bookingCom.ts.
 *
 * Env vars:
 *   BOOKINGCOM_USERNAME   affiliate_id from Partner Centre
 *   BOOKINGCOM_PASSWORD   api_key from Partner Centre
 *   BOOKINGCOM_ENV        'test' | 'production'  (default: 'test')
 *   REDIS_URL
 */

const axios  = require('axios');
const crypto = require('crypto');
const Redis  = require('ioredis');

// ─── Config ───────────────────────────────────────────────────────────────────

const ENV      = process.env.BOOKINGCOM_ENV ?? 'test';
const BASE_URL = ENV === 'production'
  ? 'https://demandapi.booking.com/3.1'
  : 'https://demandapi-sandbox.booking.com/3.1';

const HARAM_LAT       = 21.4225;
const HARAM_LON       = 39.8262;
const HARAM_RADIUS_KM = 0.5;

const MAKKAH_CODES = new Set(['MCM', 'MKH', 'MKK', 'MAKKAH', 'MECCA']);

const SEARCH_TTL = 600;   // 10 min
const DETAIL_TTL = 3600;  // 1 hr

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[bookingcom-cache] Redis error:', err.message));

async function _cacheGet(key) {
  try {
    const r = await redis.get(key);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

async function _cacheSet(key, data, ttl = SEARCH_TTL) {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch { /* non-fatal */ }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function _buildHeaders() {
  const username = process.env.BOOKINGCOM_USERNAME ?? '';
  const password = process.env.BOOKINGCOM_PASSWORD ?? '';
  const token    = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    Authorization:    `Basic ${token}`,
    'Content-Type':   'application/json',
    Accept:           'application/json',
    'Accept-Encoding': 'gzip',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _nightsBetween(checkIn, checkOut) {
  return Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
  ));
}

function _haversineM(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function _isMakkahSearch(destination, isHajj, isUmrah) {
  if (isHajj || isUmrah) return true;
  return MAKKAH_CODES.has(String(destination ?? '').toUpperCase());
}

function _cacheKey(params) {
  const sorted = Object.fromEntries(
    Object.keys(params).sort().map((k) => [k, params[k]]),
  );
  return `bkcom:search:${crypto
    .createHash('sha256')
    .update(JSON.stringify(sorted))
    .digest('hex')}`;
}

function _extractImages(mainPhotoUrl, photos) {
  const out = [];
  if (mainPhotoUrl) out.push(mainPhotoUrl);
  if (Array.isArray(photos)) {
    for (const p of photos.slice(0, 8)) {
      const url = p.url_max ?? p.url ?? p.uri;
      if (url && !out.includes(url)) out.push(url);
    }
  }
  return out.slice(0, 8);
}

function _extractFacilities(facilities) {
  if (!Array.isArray(facilities)) return [];
  return facilities
    .slice(0, 15)
    .map((f) => f.name ?? f.facility_name ?? f)
    .filter((name) => typeof name === 'string' && name.length > 0);
}

function _extractHalalAmenitiesBC(facilities) {
  if (!facilities?.length) return null;

  const names = facilities.map((f) =>
    (f.name ?? f.facility_name ?? f.description ?? '').toLowerCase(),
  );

  const amenities = {
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

function _toHotelOffer(raw, { checkIn, checkOut, currency }) {
  const nights = _nightsBetween(checkIn, checkOut);

  const lat = raw.location?.latitude  ? parseFloat(raw.location.latitude)  : null;
  const lon = raw.location?.longitude ? parseFloat(raw.location.longitude) : null;
  const distanceHaramM = (lat && lon) ? _haversineM(lat, lon, HARAM_LAT, HARAM_LON) : null;

  const totalPrice    = parseFloat(raw.composite_price_breakdown?.gross_amount?.value
    ?? raw.price?.total
    ?? raw.min_total_price
    ?? 0);
  const pricePerNight = parseFloat((totalPrice / Math.max(nights, 1)).toFixed(2));

  const freeCancellation = raw.is_free_cancellable ?? raw.free_cancellation ?? false;
  const rateKey = raw.block_id ? `${raw.hotel_id}/${raw.block_id}` : null;

  const halal = _extractHalalAmenitiesBC(raw.hotel_facilities ?? raw.facilities ?? []);

  return {
    id:              String(raw.hotel_id ?? raw.id),
    bookingcomId:    String(raw.hotel_id ?? raw.id),
    hotelbedsCode:   null,
    name: {
      en: raw.hotel_name ?? raw.name ?? '',
      ar: null,
    },
    stars:           raw.stars ? parseInt(raw.stars, 10) : null,
    distanceHaramM,
    latitude:        lat,
    longitude:       lon,
    address:         raw.address?.address_line_1 ?? raw.address ?? '',
    city:            raw.city_name ?? raw.city ?? '',
    images:          _extractImages(raw.main_photo_url, raw.photos),
    amenities:       _extractFacilities(raw.hotel_facilities ?? raw.facilities ?? []),
    halalAmenities:  halal?.halalAmenities ?? null,
    isHalalFriendly: halal?.isHalalFriendly ?? false,
    pricePerNight,
    totalPrice,
    currency,
    checkIn,
    checkOut,
    nights,
    freeCancellation,
    rateKey,
    availability:    true,
    source:          'bookingcom',
  };
}

// ─── searchHotels ─────────────────────────────────────────────────────────────

async function searchHotels(destination, checkIn, checkOut, guests, opts = {}) {
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

  const cached = await _cacheGet(key);
  if (cached) return cached;

  const body = {
    checkin:  checkIn,
    checkout: checkOut,
    guests:   [{ adults: parseInt(String(guests), 10), children: [] }],
    currency,
    extras:   ['hotel_info', 'hotel_facilities', 'photos'],
    ...(stars && { filter: { stars: [parseInt(String(stars), 10)] } }),
    ...(priceMin !== undefined && { price_filter_currency: currency, price_filter_min: priceMin }),
    ...(priceMax !== undefined && { price_filter_max: priceMax }),
  };

  if (_isMakkahSearch(destination, isHajj, isUmrah)) {
    Object.assign(body, {
      latitude:  HARAM_LAT,
      longitude: HARAM_LON,
      radius:    HARAM_RADIUS_KM * 1000,
    });
  } else {
    body.city_ids = [destination];
  }

  let res;
  try {
    res = await axios.post(`${BASE_URL}/accommodations/search`, body, {
      headers: _buildHeaders(),
      timeout: 25000,
    });
  } catch (err) {
    throw new BookingComError(
      err.response?.data?.message ?? err.message ?? 'Booking.com search failed',
      err.response?.status ?? 502,
    );
  }

  const rawHotels = res.data?.result ?? res.data?.hotels ?? res.data?.data ?? [];
  let offers = rawHotels.map((h) => _toHotelOffer(h, { checkIn, checkOut, currency }));

  if (_isMakkahSearch(destination, isHajj, isUmrah)) {
    offers = offers
      .filter((o) => o.distanceHaramM === null || o.distanceHaramM <= 500)
      .sort((a, b) => (a.distanceHaramM ?? 9999) - (b.distanceHaramM ?? 9999));
  }

  await _cacheSet(key, offers, SEARCH_TTL);
  return offers;
}

// ─── getHotelDetails ──────────────────────────────────────────────────────────

async function getHotelDetails(hotelId) {
  const cacheKey = `bkcom:detail:${hotelId}`;
  const cached   = await _cacheGet(cacheKey);
  if (cached) return cached;

  let res;
  try {
    res = await axios.get(`${BASE_URL}/accommodations/${hotelId}`, {
      headers: _buildHeaders(),
      timeout: 15000,
      params:  { extras: 'hotel_info,hotel_facilities,photos,location' },
    });
  } catch (err) {
    throw new BookingComError(
      err.response?.data?.message ?? err.message ?? 'Booking.com detail fetch failed',
      err.response?.status ?? 502,
    );
  }

  const raw = res.data?.hotel ?? res.data;
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
      .map((f) => ({ name: f.name ?? f.facility_name ?? '', groupName: '' }))
      .filter((f) => f.name),
    checkInTime:     raw.checkin?.from ?? '15:00',
    checkOutTime:    raw.checkout?.until ?? '12:00',
    phones:          (raw.phone_number ? [raw.phone_number] : []),
    source:          'bookingcom',
  };

  await _cacheSet(cacheKey, detail, DETAIL_TTL);
  return detail;
}

// ─── checkAvailability ────────────────────────────────────────────────────────

async function checkAvailability(hotelId, rateId) {
  let res;
  try {
    res = await axios.post(`${BASE_URL}/accommodations/rates`, {
      hotel_ids: [hotelId],
      block_ids: [rateId],
    }, {
      headers: _buildHeaders(),
      timeout: 15000,
    });
  } catch (err) {
    throw new BookingComError(
      err.response?.data?.message ?? err.message ?? 'Booking.com rate check failed',
      err.response?.status ?? 502,
    );
  }

  const block = res.data?.result?.[0] ?? res.data?.blocks?.[0];
  if (!block) throw new BookingComError('Rate no longer available — block not found', 410);

  const net              = parseFloat(block.price?.total ?? block.min_total_price ?? 0);
  const freeCancellation = block.is_free_cancellable ?? false;
  const policies         = block.cancellation_policies ?? [];

  return {
    rateKey:              `${hotelId}/${rateId}`,
    net,
    currency:             block.price?.currency ?? 'EUR',
    freeCancellation,
    cancellationPolicies: policies,
    boardName:            block.mealplan_description ?? block.board ?? '',
  };
}

// ─── createBooking ────────────────────────────────────────────────────────────

async function createBooking(rateKey, traveler, _payment = null, clientRef = null) {
  const [hotelId, blockId] = rateKey.split('/');
  const ref = clientRef ?? `UTU-${Date.now()}`;

  let res;
  try {
    res = await axios.post(`${BASE_URL}/orders`, {
      hotel_id:       hotelId,
      block_id:       blockId,
      customer: {
        first_name: traveler.firstName,
        last_name:  traveler.lastName,
        email:      traveler.email,
        telephone:  traveler.phone ?? '',
      },
      affiliate_ref:  ref,
      business_model: 'agency',
    }, {
      headers: _buildHeaders(),
      timeout: 30000,
    });
  } catch (err) {
    throw new BookingComError(
      err.response?.data?.message ?? err.message ?? 'Booking.com booking failed',
      err.response?.status ?? 502,
    );
  }

  const booking = res.data?.booking ?? res.data?.reservation ?? res.data;
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

class BookingComError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'BookingComError';
    this.statusCode = statusCode;
    this.status     = statusCode;
    this.raw        = raw;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  searchHotels,
  getHotelDetails,
  checkAvailability,
  createBooking,
  BookingComError,
  _haversineM,  // exported for unit tests
};
