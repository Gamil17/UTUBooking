/**
 * Hotelbeds Hotel API v1 Adapter
 *
 * Auth:  SHA-256(ApiKey + Secret + UnixTimestampSeconds) per request
 * Docs:  https://developer.hotelbeds.com/documentation/hotels/booking-api/
 * crypto is a Node.js built-in — no npm install required.
 *
 * Env vars:
 *   HOTELBEDS_API_KEY
 *   HOTELBEDS_SECRET
 *   HOTELBEDS_BASE_URL   default: https://api.hotelbeds.com/hotel-api/1.0
 *   REDIS_URL
 *
 * Makkah/Haram proximity:
 *   When isHajj or isUmrah is true (or destination is a Makkah code),
 *   searchHotels switches to geolocation mode and returns only hotels
 *   within 500 m of Al-Masjid Al-Haram (21.4225°N, 39.8262°E).
 *
 * Redis cache key: hotel:search:{sha256(sortedParams)}   TTL: 300 s (5 min)
 */

'use strict';

require('dotenv').config();
const axios  = require('axios');
const crypto = require('crypto');
const Redis  = require('ioredis');

const BASE_URL         = process.env.HOTELBEDS_BASE_URL || 'https://api.hotelbeds.com/hotel-api/1.0';
const CONTENT_BASE_URL = 'https://api.hotelbeds.com/hotel-content-api/1.0';

// Al-Masjid Al-Haram coordinates (Grand Mosque, Makkah)
const HARAM_LAT       = 21.4225;
const HARAM_LON       = 39.8262;
const HARAM_RADIUS_KM = 0.5; // 500 m

// Hotelbeds destination codes recognised as Makkah
const MAKKAH_CODES = new Set(['MCM', 'MKH', 'MKK', 'MAKKAH', 'MECCA']);

// ─── Redis (non-fatal) ─────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[hotelbeds-cache] Redis error:', err.message));

const SEARCH_TTL = 300;  // 5 min — search results
const DETAIL_TTL = 3600; // 1 hr  — hotel content (rarely changes)

async function _cacheGet(key) {
  try { const r = await redis.get(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
async function _cacheSet(key, data, ttl = SEARCH_TTL) {
  try { await redis.setex(key, ttl, JSON.stringify(data)); } catch { /* non-fatal */ }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

function _buildHeaders() {
  const ts  = Math.floor(Date.now() / 1000);
  const sig = crypto
    .createHash('sha256')
    .update(`${process.env.HOTELBEDS_API_KEY}${process.env.HOTELBEDS_SECRET}${ts}`)
    .digest('hex');
  return {
    'Api-Key':         process.env.HOTELBEDS_API_KEY,
    'X-Signature':     sig,
    Accept:            'application/json',
    'Accept-Encoding': 'gzip',
    'Content-Type':    'application/json',
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function _nightsBetween(checkIn, checkOut) {
  return Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
}

/**
 * Haversine distance in metres between two lat/lon points.
 */
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

/**
 * Returns { price, rateKey, freeCancellation } for the cheapest available rate
 * across all rooms in a Hotelbeds availability hotel object.
 */
function _bestRate(hotel) {
  let best = null;
  for (const room of (hotel.rooms ?? [])) {
    for (const rate of (room.rates ?? [])) {
      const net = parseFloat(rate.net ?? rate.sellingRate ?? 0);
      if (net <= 0) continue;
      const policies      = rate.cancellationPolicies ?? [];
      const freeCancelFlag =
        policies.length === 0 || parseFloat(policies[0]?.amount ?? 1) === 0;
      if (!best || net < best.price) {
        best = { price: net, rateKey: rate.rateKey ?? null, freeCancellation: freeCancelFlag };
      }
    }
  }
  return best ?? { price: parseFloat(hotel.minRate ?? 0), rateKey: null, freeCancellation: false };
}

function _extractImages(images) {
  if (!images?.length) return [];
  return images
    .sort((a, b) => (a.visualOrder ?? 99) - (b.visualOrder ?? 99))
    .slice(0, 8)
    .map((img) => img.path ? `https://photos.hotelbeds.com/giata/bigger/${img.path}` : null)
    .filter(Boolean);
}

function _extractFacilities(facilities) {
  if (!facilities?.length) return [];
  return facilities
    .slice(0, 15)
    .map((f) => f.facilityName || f.description || '')
    .filter(Boolean);
}

/**
 * Maps Hotelbeds facility list to UTUBooking halal_amenities schema.
 * Uses keyword matching against facility names/descriptions — more resilient
 * than hardcoding numeric facility codes (catalog varies by region).
 *
 * @param {Array} facilities  raw facilities array from Hotelbeds content API
 * @returns {{ halalAmenities: object, isHalalFriendly: boolean } | null}
 */
function _extractHalalAmenities(facilities) {
  if (!facilities?.length) return null;

  const names = facilities.map((f) =>
    (f.facilityName || f.description || '').toLowerCase(),
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

function _isMakkahSearch(destination, isHajj, isUmrah) {
  if (isHajj || isUmrah) return true;
  return MAKKAH_CODES.has(String(destination ?? '').toUpperCase());
}

function _cacheKey(params) {
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
  return `hotel:search:${crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex')}`;
}

// ─── HotelOffer DTO mapper ─────────────────────────────────────────────────────

function _toHotelOffer(raw, { checkIn, checkOut, currency = 'SAR' }) {
  const nights = _nightsBetween(checkIn, checkOut);
  const { price, rateKey, freeCancellation } = _bestRate(raw);
  const pricePerNight = parseFloat((price / Math.max(nights, 1)).toFixed(2));

  const lat = raw.latitude  ? parseFloat(raw.latitude)  : null;
  const lon = raw.longitude ? parseFloat(raw.longitude) : null;
  const distanceHaramM = (lat && lon) ? _haversineM(lat, lon, HARAM_LAT, HARAM_LON) : null;

  const halal = _extractHalalAmenities(raw.facilities);

  return {
    id:               String(raw.code),
    hotelbedsCode:    String(raw.code),
    name:             { en: raw.name || '', ar: null },
    stars:            raw.categoryCode ? parseInt(raw.categoryCode, 10) : null,
    distanceHaramM,
    address:          raw.address?.content ?? '',
    city:             raw.destinationName ?? '',
    images:           _extractImages(raw.images),
    amenities:        _extractFacilities(raw.facilities),
    halalAmenities:   halal?.halalAmenities  ?? null,
    isHalalFriendly:  halal?.isHalalFriendly ?? false,
    pricePerNight,
    totalPrice:       parseFloat((pricePerNight * nights).toFixed(2)),
    currency,
    checkIn,
    checkOut,
    nights,
    freeCancellation,
    rateKey,
    availability:     true,
    source:           'hotelbeds',
  };
}

// ─── searchHotels ─────────────────────────────────────────────────────────────

/**
 * Search hotel availability.
 *
 * @param {string} destination  — Hotelbeds destination code (e.g. 'MCM') or IATA
 * @param {string} checkIn      — 'YYYY-MM-DD'
 * @param {string} checkOut     — 'YYYY-MM-DD'
 * @param {number} guests       — number of adult guests
 * @param {object} [opts]
 * @param {number}  [opts.stars]
 * @param {number}  [opts.priceMin]
 * @param {number}  [opts.priceMax]
 * @param {string}  [opts.currency]   default 'SAR'
 * @param {boolean} [opts.isHajj]     activates 500 m Haram proximity mode
 * @param {boolean} [opts.isUmrah]    activates 500 m Haram proximity mode
 *
 * @returns {Promise<HotelOffer[]>}
 * @throws  {HotelbedsError}
 */
async function searchHotels(destination, checkIn, checkOut, guests, opts = {}) {
  const { stars, priceMin, priceMax, currency = 'SAR', isHajj = false, isUmrah = false } = opts;

  const key = _cacheKey({ destination, checkIn, checkOut, guests,
                          stars, priceMin, priceMax, currency, isHajj, isUmrah });

  // 1. Cache hit
  const cached = await _cacheGet(key);
  if (cached) return cached;

  // 2. Build request body
  const body = {
    stay:        { checkIn, checkOut },
    occupancies: [{ rooms: 1, adults: parseInt(guests, 10), children: 0 }],
    currency,
    filter: {
      minCategory: stars ? parseInt(stars, 10) : 1,
      maxCategory: stars ? parseInt(stars, 10) : 5,
      ...(priceMin !== undefined && { minRate: parseFloat(priceMin) }),
      ...(priceMax !== undefined && { maxRate: parseFloat(priceMax) }),
    },
  };

  // 3. Makkah proximity: use geolocation with 500 m radius around Haram
  if (_isMakkahSearch(destination, isHajj, isUmrah)) {
    body.geolocation = {
      latitude:  HARAM_LAT,
      longitude: HARAM_LON,
      radius:    HARAM_RADIUS_KM,
      unit:      'km',
    };
  } else {
    body.destination = { code: destination };
  }

  // 4. Call Hotelbeds
  let res;
  try {
    res = await axios.post(`${BASE_URL}/hotels`, body, {
      headers: _buildHeaders(),
      timeout: 20000,
    });
  } catch (err) {
    throw new HotelbedsError(
      err.response?.data?.error?.message ?? err.message,
      err.response?.status ?? 502
    );
  }

  const hotels = res.data?.hotels?.hotels ?? [];
  let offers   = hotels.map((h) => _toHotelOffer(h, { checkIn, checkOut, currency }));

  // 5. For Makkah: secondary filter + sort by distance (API radius is approximate)
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
 * Fetches full hotel content (all photos, all facilities, coordinates,
 * description, bilingual name) from the Hotelbeds Content API.
 *
 * @param {string|number} hotelCode
 * @returns {Promise<object>} enriched hotel detail
 * @throws  {HotelbedsError}
 */
async function getHotelDetails(hotelCode) {
  const key    = `hotel:detail:${hotelCode}`;
  const cached = await _cacheGet(key);
  if (cached) return cached;

  let res;
  try {
    res = await axios.get(`${CONTENT_BASE_URL}/hotels/${hotelCode}/details`, {
      headers: { ..._buildHeaders(), 'Accept-Language': 'en,ar' },
      timeout: 15000,
      params:  { language: 'ENG', useSecondaryLanguage: true },
    });
  } catch (err) {
    throw new HotelbedsError(
      err.response?.data?.error?.message ?? err.message,
      err.response?.status ?? 502
    );
  }

  const raw = res.data?.hotel ?? res.data;
  const lat = raw.coordinates?.latitude  ? parseFloat(raw.coordinates.latitude)  : null;
  const lon = raw.coordinates?.longitude ? parseFloat(raw.coordinates.longitude) : null;

  const detail = {
    id:            String(raw.code),
    hotelbedsCode: String(raw.code),
    name: {
      en: raw.name?.content ?? '',
      ar: raw.name?.languageAlternativeContent
            ?.find((l) => l.languageCode === 'ARA')?.content ?? null,
    },
    stars:           raw.category?.simpleCode ? parseInt(raw.category.simpleCode, 10) : null,
    distanceHaramM:  (lat && lon) ? _haversineM(lat, lon, HARAM_LAT, HARAM_LON) : null,
    latitude:        lat,
    longitude:       lon,
    address:         raw.address?.content ?? '',
    city:            raw.city?.content ?? '',
    country:         raw.countryCode ?? 'SA',
    description:     raw.description?.content ?? '',
    images: (raw.images ?? [])
      .sort((a, b) => (a.visualOrder ?? 99) - (b.visualOrder ?? 99))
      .map((img) => ({
        url:     img.path ? `https://photos.hotelbeds.com/giata/bigger/${img.path}` : null,
        type:    img.imageTypeCode ?? 'GEN',
        caption: img.description?.content ?? null,
      }))
      .filter((i) => i.url),
    amenities: (raw.facilities ?? [])
      .map((f) => ({
        name:      f.facilityName?.content ?? f.description?.content ?? '',
        groupName: f.facilityGroupName?.content ?? '',
      }))
      .filter((f) => f.name),
    checkInTime:  raw.checkIn?.time  ?? '15:00',
    checkOutTime: raw.checkOut?.time ?? '12:00',
    phones:       (raw.phones ?? []).map((p) => p.phoneNumber),
    source:       'hotelbeds',
  };

  await _cacheSet(key, detail, DETAIL_TTL);
  return detail;
}

// ─── checkRates ───────────────────────────────────────────────────────────────

/**
 * Re-prices a rate key to get the guaranteed price before booking.
 * Always call this immediately before createBooking.
 *
 * @param {string} rateKey — from a HotelOffer.rateKey
 * @returns {Promise<object>} { rateKey, net, currency, freeCancellation, cancellationPolicies, ... }
 * @throws  {HotelbedsError}
 */
async function checkRates(rateKey) {
  let res;
  try {
    res = await axios.post(
      `${BASE_URL}/checkrates`,
      { rooms: [{ rateKey }] },
      { headers: _buildHeaders(), timeout: 15000 }
    );
  } catch (err) {
    throw new HotelbedsError(
      err.response?.data?.error?.message ?? err.message,
      err.response?.status ?? 502
    );
  }

  const hotel = res.data?.hotel;
  const room  = hotel?.rooms?.[0];
  const rate  = room?.rates?.[0];

  if (!rate) {
    throw new HotelbedsError('Rate no longer available', 410);
  }

  const policies       = rate.cancellationPolicies ?? [];
  const freeCancelFlag = policies.length === 0 || parseFloat(policies[0]?.amount ?? 1) === 0;

  return {
    rateKey:              rate.rateKey,
    net:                  parseFloat(rate.net ?? rate.sellingRate),
    currency:             hotel.currency ?? 'SAR',
    freeCancellation:     freeCancelFlag,
    cancellationPolicies: policies,
    boardName:            rate.boardName ?? '',
    rooms:                rate.rooms     ?? 1,
    adults:               rate.adults    ?? 1,
  };
}

// ─── createBooking ────────────────────────────────────────────────────────────

/**
 * Creates a confirmed hotel booking with Hotelbeds.
 *
 * @param {string} rateKey  — confirmed rate key from checkRates()
 * @param {object} traveler — lead guest
 *   { firstName, lastName, email, phone }
 * @param {object} [payment] — card details (required for AT_WEB rates only)
 *   { cardType: 'VI'|'MC'|'AX', cardNumber, cardHolder, expiryMonth, expiryYear, cvv }
 * @param {string} [clientRef] — internal ref (e.g. UTU-20260307-XXXX)
 *
 * @returns {Promise<object>}
 *   { bookingRef, status, hotel, totalNet, currency, freeCancellation, cancellationPolicies }
 * @throws  {HotelbedsError}
 */
async function createBooking(rateKey, traveler, payment = null, clientRef = null) {
  const body = {
    holder: {
      name:    traveler.firstName.toUpperCase(),
      surname: traveler.lastName.toUpperCase(),
    },
    rooms: [{
      rateKey,
      paxes: [{
        roomId:  1,
        type:    'AD',
        name:    traveler.firstName.toUpperCase(),
        surname: traveler.lastName.toUpperCase(),
      }],
    }],
    clientReference: clientRef ?? `UTU-${Date.now()}`,
    remark:          'UTUBooking automated reservation',
  };

  // Attach payment card for AT_WEB rates (card-at-booking)
  if (payment?.cardNumber) {
    body.paymentData = {
      paymentCard: {
        cardType:       payment.cardType,
        cardNumber:     payment.cardNumber,
        cardHolderName: payment.cardHolder,
        expiryDate:     `${payment.expiryMonth}/${payment.expiryYear}`,
        cardCVC:        payment.cvv,
      },
      contactData: {
        email:       traveler.email,
        phoneNumber: traveler.phone ?? '',
      },
    };
  }

  let res;
  try {
    res = await axios.post(`${BASE_URL}/bookings`, body, {
      headers: _buildHeaders(),
      timeout: 30000,
    });
  } catch (err) {
    throw new HotelbedsError(
      err.response?.data?.error?.message ?? err.message,
      err.response?.status ?? 502
    );
  }

  const booking = res.data?.booking;
  if (!booking) throw new HotelbedsError('Empty booking response from Hotelbeds', 502);

  const rate     = booking.hotel?.rooms?.[0]?.rates?.[0] ?? {};
  const policies = rate.cancellationPolicies ?? [];

  return {
    bookingRef:           booking.reference,
    status:               booking.status,   // 'CONFIRMED' | 'ON_REQUEST'
    hotel: {
      code:    String(booking.hotel?.code ?? ''),
      name:    booking.hotel?.name ?? '',
    },
    rooms:                booking.hotel?.rooms ?? [],
    totalNet:             parseFloat(booking.totalNet ?? 0),
    currency:             booking.currency ?? 'SAR',
    freeCancellation:     policies.length === 0 || parseFloat(policies[0]?.amount ?? 1) === 0,
    cancellationPolicies: policies,
    clientReference:      booking.clientReference,
    raw:                  booking,
  };
}

// ─── Error type ───────────────────────────────────────────────────────────────

class HotelbedsError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'HotelbedsError';
    this.statusCode = statusCode;
    this.status     = statusCode; // legacy alias kept for hotel-service controller
    this.raw        = raw;
  }
}

module.exports = {
  searchHotels,
  getHotelDetails,
  checkRates,
  createBooking,
  HotelbedsError,
  _toHotelOffer,  // exported for unit tests
  _haversineM,    // exported for unit tests
};
