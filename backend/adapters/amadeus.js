/**
 * Amadeus GDS Flight Adapter
 *
 * SDK:   npm install amadeus
 * Docs:  https://developers.amadeus.com/self-service/category/flights
 * Auth:  OAuth2 client_credentials (handled automatically by SDK)
 *
 * Env vars:
 *   AMADEUS_CLIENT_ID      — API key from Amadeus self-service portal
 *   AMADEUS_CLIENT_SECRET  — API secret
 *   AMADEUS_HOSTNAME       — 'test' (sandbox) | 'production'
 *
 * Amount convention: Amadeus returns prices as decimal strings in the
 * requested currency. We store as NUMERIC(10,2) in PostgreSQL.
 *
 * Redis cache key: flight:search:{sha256(sortedParams)}  TTL: 180 s (3 min)
 */

'use strict';

require('dotenv').config();
const Amadeus = require('amadeus');
const crypto  = require('crypto');
const Redis   = require('ioredis');

// ─── Amadeus client ────────────────────────────────────────────────────────────

const amadeus = new Amadeus({
  clientId:     process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  hostname:     process.env.AMADEUS_HOSTNAME || 'test', // 'test' = sandbox
});

// ─── Redis client (non-fatal on failure) ──────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[amadeus-cache] Redis error:', err.message));

const CACHE_TTL = 180; // seconds

async function _cacheGet(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function _cacheSet(key, data) {
  try {
    await redis.setex(key, CACHE_TTL, JSON.stringify(data));
  } catch {
    // non-fatal
  }
}

// ─── FlightOffer DTO ──────────────────────────────────────────────────────────
// Maps Amadeus v2 flightOffers shape → internal schema (matches flight_offers migration)

/**
 * @typedef {object} FlightOffer
 * @property {string}  id               — Amadeus offer ID (used for pricing/booking)
 * @property {string}  flightNum        — first segment flight number (e.g. "SV123")
 * @property {string}  airlineCode      — marketing carrier IATA code (e.g. "SV")
 * @property {string}  originIata       — departure airport code
 * @property {string}  destinationIata  — arrival airport code
 * @property {string}  departureAt      — ISO 8601 datetime
 * @property {string}  arrivalAt        — ISO 8601 datetime
 * @property {string}  cabinClass       — economy | premium_economy | business | first
 * @property {number}  price            — total price as decimal
 * @property {string}  currency         — ISO 4217 currency code
 * @property {number}  durationMinutes  — total journey duration in minutes
 * @property {number}  stops            — number of connections
 * @property {boolean} isRefundable     — true if any fare basis is refundable
 * @property {boolean} baggageIncluded  — true if checked bag is included
 * @property {object}  raw              — full Amadeus response object for audit
 */

/**
 * Maps one Amadeus flightOffer object → FlightOffer DTO.
 * Amadeus itinerary[0] = outbound leg; segment[0] = first segment.
 */
function _toFlightOffer(raw) {
  const itinerary = raw.itineraries?.[0] ?? {};
  const segments  = itinerary.segments ?? [];
  const firstSeg  = segments[0] ?? {};
  const lastSeg   = segments[segments.length - 1] ?? firstSeg;

  // Duration: Amadeus returns ISO 8601 duration string e.g. "PT2H30M"
  const durationMinutes = _parseDuration(itinerary.duration);

  // Price
  const price    = parseFloat(raw.price?.grandTotal ?? raw.price?.total ?? 0);
  const currency = raw.price?.currency ?? 'SAR';

  // Cabin class — read from first traveler pricing
  const cabinClass = (
    raw.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin ?? 'ECONOMY'
  ).toLowerCase().replace('_', ' '); // 'PREMIUM_ECONOMY' → 'premium economy'

  // Baggage: at least one checked bag included?
  const baggageIncluded = raw.travelerPricings?.some((tp) =>
    tp.fareDetailsBySegment?.some((fd) => {
      const qty = fd.includedCheckedBags?.quantity ?? 0;
      return qty > 0;
    })
  ) ?? false;

  // Refundable: check fare basis — Amadeus doesn't always expose this;
  // we check amenities if present, otherwise default false
  const isRefundable = raw.travelerPricings?.some((tp) =>
    tp.fareDetailsBySegment?.some((fd) =>
      fd.amenities?.some((a) => a.amenityType === 'REFUNDABLE_TICKET' && a.isChargeable === false)
    )
  ) ?? false;

  return {
    id:              raw.id,
    flightNum:       `${firstSeg.carrierCode ?? ''}${firstSeg.number ?? ''}`,
    airlineCode:     firstSeg.carrierCode ?? '',
    originIata:      firstSeg.departure?.iataCode ?? '',
    destinationIata: lastSeg.arrival?.iataCode ?? '',
    departureAt:     firstSeg.departure?.at ?? '',
    arrivalAt:       lastSeg.arrival?.at ?? '',
    cabinClass,
    price,
    currency,
    durationMinutes,
    stops:           Math.max(0, segments.length - 1),
    isRefundable,
    baggageIncluded,
    raw,
  };
}

/** Parses ISO 8601 duration string → total minutes. e.g. "PT2H30M" → 150 */
function _parseDuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? 0, 10) * 60) + parseInt(match[2] ?? 0, 10);
}

/** Builds a deterministic Redis cache key from search params. */
function _cacheKey(params) {
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
  const hash   = crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return `flight:search:${hash}`;
}

// ─── searchFlights ────────────────────────────────────────────────────────────

/**
 * Searches available flights via Amadeus Flight Offers Search API.
 * Results are cached in Redis for 3 minutes.
 *
 * @param {object} params
 * @param {string} params.origin       — IATA departure airport code (e.g. 'JED')
 * @param {string} params.destination  — IATA arrival airport code (e.g. 'DXB')
 * @param {string} params.date         — ISO date 'YYYY-MM-DD'
 * @param {number} params.adults       — number of adult passengers (1–9)
 * @param {string} [params.cabinClass] — ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
 * @param {string} [params.currency]   — ISO 4217 currency code, default 'SAR'
 * @param {number} [params.maxOffers]  — max results (1–250), default 20
 *
 * @returns {Promise<FlightOffer[]>}
 * @throws  {AmadeusAdapterError} on upstream API failure
 */
async function searchFlights({
  origin,
  destination,
  date,
  adults,
  cabinClass = 'ECONOMY',
  currency   = 'SAR',
  maxOffers  = 20,
}) {
  const params = { origin, destination, date, adults, cabinClass, currency, maxOffers };
  const key    = _cacheKey(params);

  // 1. Cache hit
  const cached = await _cacheGet(key);
  if (cached) {
    return cached; // already FlightOffer[]
  }

  // 2. Live Amadeus call
  let response;
  try {
    response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode:      origin,
      destinationLocationCode: destination,
      departureDate:           date,
      adults:                  String(adults),
      travelClass:             cabinClass.toUpperCase(),
      currencyCode:            currency,
      max:                     String(maxOffers),
    });
  } catch (err) {
    throw new AmadeusAdapterError(
      err.response?.result?.errors?.[0]?.detail ?? err.message,
      err.response?.statusCode ?? 502,
      err.response?.result
    );
  }

  const offers = (response.data ?? []).map(_toFlightOffer);

  // 3. Cache results
  await _cacheSet(key, offers);

  return offers;
}

// ─── getFlightPrice ───────────────────────────────────────────────────────────

/**
 * Re-prices a single flight offer (guaranteed price before booking).
 * Amadeus requires the full offer object as returned by searchFlights.
 *
 * @param {object} offer — FlightOffer.raw (full Amadeus response object)
 * @returns {Promise<FlightOffer>} re-priced offer
 * @throws  {AmadeusAdapterError}
 */
async function getFlightPrice(offer) {
  let response;
  try {
    response = await amadeus.shopping.flightOffers.pricing.post(
      JSON.stringify({
        data: {
          type:         'flight-offers-pricing',
          flightOffers: [offer],
        },
      })
    );
  } catch (err) {
    throw new AmadeusAdapterError(
      err.response?.result?.errors?.[0]?.detail ?? err.message,
      err.response?.statusCode ?? 502,
      err.response?.result
    );
  }

  const repricedRaw = response.data?.flightOffers?.[0];
  if (!repricedRaw) {
    throw new AmadeusAdapterError('Empty pricing response from Amadeus', 502);
  }

  return _toFlightOffer(repricedRaw);
}

// ─── createFlightOrder ────────────────────────────────────────────────────────

/**
 * Books a flight by creating a flight order in Amadeus.
 *
 * @param {object} offer    — FlightOffer.raw (as returned by getFlightPrice)
 * @param {object} traveler — Amadeus traveler object shape:
 *   {
 *     id: '1',
 *     dateOfBirth: 'YYYY-MM-DD',
 *     name: { firstName: string, lastName: string },
 *     gender: 'MALE' | 'FEMALE',
 *     contact: {
 *       emailAddress: string,
 *       phones: [{ deviceType: 'MOBILE', countryCallingCode: '966', number: string }]
 *     },
 *     documents: [{
 *       documentType: 'PASSPORT',
 *       number: string,
 *       expiryDate: 'YYYY-MM-DD',
 *       issuanceCountry: 'SA',
 *       nationality: 'SA',
 *       holder: true
 *     }]
 *   }
 *
 * @returns {Promise<object>} Amadeus flight order response
 *   { orderId, status, flightOffers, travelers, ... }
 * @throws {AmadeusAdapterError}
 */
async function createFlightOrder(offer, traveler) {
  let response;
  try {
    response = await amadeus.booking.flightOrders.post(
      JSON.stringify({
        data: {
          type:         'flight-order',
          flightOffers: [offer],
          travelers:    Array.isArray(traveler) ? traveler : [traveler],
        },
      })
    );
  } catch (err) {
    throw new AmadeusAdapterError(
      err.response?.result?.errors?.[0]?.detail ?? err.message,
      err.response?.statusCode ?? 502,
      err.response?.result
    );
  }

  const order = response.data;
  if (!order) {
    throw new AmadeusAdapterError('Empty order response from Amadeus', 502);
  }

  return {
    orderId:      order.id,
    status:       order.flightOffers?.[0]?.lastTicketingDate ? 'confirmed' : 'pending',
    pnr:          order.associatedRecords?.[0]?.reference ?? null,
    flightOffers: (order.flightOffers ?? []).map(_toFlightOffer),
    travelers:    order.travelers ?? [],
    raw:          order,
  };
}

// ─── Error type ───────────────────────────────────────────────────────────────

class AmadeusAdapterError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'AmadeusAdapterError';
    this.statusCode = statusCode;
    this.raw        = raw;
  }
}

module.exports = {
  searchFlights,
  getFlightPrice,
  createFlightOrder,
  AmadeusAdapterError,
  _toFlightOffer, // exported for unit tests
};
