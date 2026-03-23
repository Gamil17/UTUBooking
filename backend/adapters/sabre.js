/**
 * Sabre GDS Flight Adapter — Fallback
 *
 * API:   Sabre REST APIs — Bargain Finder Max (BFM) + Air Book
 * Docs:  https://developer.sabre.com/docs/rest_apis/air/search/bargain_finder_max
 * Auth:  OAuth2 client_credentials (token endpoint per region)
 *
 * Env vars:
 *   SABRE_CLIENT_ID      — 'V1:<username>:<password>:<domain>' base64-encoded
 *   SABRE_CLIENT_SECRET  — client secret
 *   SABRE_TOKEN_URL      — token endpoint (differs by region)
 *                          default: https://api.sabre.com/v2/auth/token
 *   SABRE_BASE_URL       — REST base URL
 *                          default: https://api.sabre.com
 *   SABRE_PCC            — Pseudo City Code (your Sabre agent PCC)
 *
 * This adapter implements the same interface as amadeus.js so the flight
 * service controller can treat both interchangeably:
 *   searchFlights(params)    → FlightOffer[]
 *   getFlightPrice(offer)    → FlightOffer
 *   createFlightOrder(offer, traveler) → order object
 *
 * Redis cache: flight:sabre:search:{sha256(params)}  TTL: 180 s (3 min)
 */

'use strict';

require('dotenv').config();
const axios  = require('axios');
const crypto = require('crypto');
const Redis  = require('ioredis');

// ─── Config ────────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.SABRE_BASE_URL   || 'https://api.sabre.com';
const TOKEN_URL   = process.env.SABRE_TOKEN_URL  || 'https://api.sabre.com/v2/auth/token';
const SABRE_PCC   = process.env.SABRE_PCC        || '';
const CACHE_TTL   = 180; // seconds

// ─── Redis (non-fatal) ─────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[sabre-cache] Redis error:', err.message));

async function _cacheGet(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function _cacheSet(key, data) {
  try { await redis.setex(key, CACHE_TTL, JSON.stringify(data)); } catch { /* non-fatal */ }
}

// ─── OAuth2 token cache ────────────────────────────────────────────────────────
// Sabre tokens are valid for 7 days; we cache in-process with a 6-day window.

let _tokenCache = { token: null, expiresAt: 0 };

async function _getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const credentials = Buffer.from(
    `${process.env.SABRE_CLIENT_ID}:${process.env.SABRE_CLIENT_SECRET}`
  ).toString('base64');

  const res = await axios.post(
    TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    }
  );

  const ttlMs = (res.data.expires_in ?? 604800) * 1000 * 0.85; // 85% of TTL
  _tokenCache = {
    token:     res.data.access_token,
    expiresAt: Date.now() + ttlMs,
  };

  return _tokenCache.token;
}

async function _headers() {
  const token = await _getAccessToken();
  return {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

// ─── FlightOffer DTO ───────────────────────────────────────────────────────────
// Maps Sabre BFM PricedItinerary shape → internal FlightOffer

/**
 * @param {object} raw   — one Sabre PricedItinerary element
 * @param {string} currency
 * @returns {FlightOffer}
 */
function _toFlightOffer(raw, currency = 'SAR') {
  const itin     = raw.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.[0];
  const segments = itin?.FlightSegment ?? [];
  const firstSeg = segments[0] ?? {};
  const lastSeg  = segments[segments.length - 1] ?? firstSeg;

  const pricing  = raw.AirItineraryPricingInfo?.[0] ?? {};
  const passFare = pricing.PTC_FareBreakdowns?.PTC_FareBreakdown?.[0];
  const totalAmt = parseFloat(
    pricing.ItinTotalFare?.TotalFare?.Amount ?? 0
  );
  const fareAmt  = parseFloat(
    pricing.ItinTotalFare?.BaseFare?.Amount ?? totalAmt
  );

  // Duration: sum segment elapsed time (minutes)
  const durationMinutes = segments.reduce((acc, s) => {
    return acc + (parseInt(s['@ElapsedTime'] ?? s.ElapsedTime ?? 0, 10) || 0);
  }, 0);

  // Cabin: read from first booking class
  const cabinMap = { Y: 'economy', C: 'business', F: 'first', W: 'premium economy' };
  const cabinCode = passFare?.FareInfos?.FareInfo?.[0]?.TPA_Extensions?.SeatsRemaining?.['@CabinClass']
    ?? firstSeg.ResBookDesigCode
    ?? 'Y';
  const cabinClass = cabinMap[cabinCode] ?? 'economy';

  // Baggage
  const baggageIncluded =
    (passFare?.FareInfos?.FareInfo?.[0]?.TPA_Extensions?.BaggageAllowance?.NumberOfPieces ?? 0) > 0;

  // Unique offer ID: use SequenceNumber if present
  const id = String(raw['@SequenceNumber'] ?? crypto.randomUUID());

  return {
    id,
    flightNum:       `${firstSeg.OperatingAirline?.['@Code'] ?? firstSeg.MarketingAirline?.['@Code'] ?? ''}${firstSeg['@FlightNumber'] ?? ''}`,
    airlineCode:     firstSeg.MarketingAirline?.['@Code'] ?? firstSeg.OperatingAirline?.['@Code'] ?? '',
    originIata:      firstSeg.DepartureAirport?.['@LocationCode'] ?? '',
    destinationIata: lastSeg.ArrivalAirport?.['@LocationCode'] ?? '',
    departureAt:     `${firstSeg['@DepartureDateTime'] ?? ''}`,
    arrivalAt:       `${lastSeg['@ArrivalDateTime'] ?? ''}`,
    cabinClass,
    price:           totalAmt || fareAmt,
    currency,
    durationMinutes,
    stops:           Math.max(0, segments.length - 1),
    isRefundable:    false, // Sabre BFM doesn't expose refundability in standard response
    baggageIncluded,
    source:          'sabre',
    raw,
  };
}

function _cacheKey(params) {
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
  const hash   = crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return `flight:sabre:search:${hash}`;
}

// ─── searchFlights ─────────────────────────────────────────────────────────────

/**
 * Searches available flights via Sabre Bargain Finder Max REST API.
 * Results cached in Redis for 3 minutes.
 *
 * @param {object} params
 * @param {string} params.origin
 * @param {string} params.destination
 * @param {string} params.date         — 'YYYY-MM-DD'
 * @param {number} params.adults
 * @param {string} [params.cabinClass] — ECONOMY | BUSINESS | FIRST
 * @param {string} [params.currency]   — default 'SAR'
 * @param {number} [params.maxOffers]  — default 20
 *
 * @returns {Promise<FlightOffer[]>}
 * @throws  {SabreAdapterError}
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

  // 1. Cache check
  const cached = await _cacheGet(key);
  if (cached) return cached;

  // 2. Live BFM call
  const body = {
    OTA_AirLowFareSearchRQ: {
      Version:    '4.3.0',
      POS: {
        Source: [{
          PseudoCityCode: SABRE_PCC,
          RequestorID: {
            Type: '1',
            ID:   '1',
            CompanyName: { Code: 'TN' },
          },
        }],
      },
      OriginDestinationInformation: [{
        RPH: '1',
        DepartureDateTime: `${date}T00:00:00`,
        OriginLocation:      { LocationCode: origin },
        DestinationLocation: { LocationCode: destination },
      }],
      TravelPreferences: {
        CabinPref: [{ Cabin: cabinClass[0], PreferLevel: 'Preferred' }], // E, C, F
        MaxStopsQuantity: 3,
      },
      TravelerInfoSummary: {
        SeatsRequested: [adults],
        AirTravelerAvail: [{
          PassengerTypeQuantity: [{ Code: 'ADT', Quantity: adults }],
        }],
        PriceRequestInformation: {
          CurrencyCode: currency,
        },
      },
      TPA_Extensions: {
        IntelliSellTransaction: {
          RequestType: { Name: '200ITINS' },
        },
      },
    },
  };

  let res;
  try {
    res = await axios.post(
      `${BASE_URL}/v4.3.0/shop/flights?mode=live&limit=${maxOffers}`,
      body,
      { headers: await _headers(), timeout: 20000 }
    );
  } catch (err) {
    throw new SabreAdapterError(
      err.response?.data?.message ?? err.message,
      err.response?.status ?? 502,
      err.response?.data
    );
  }

  const itineraries =
    res.data?.OTA_AirLowFareSearchRS?.PricedItineraries?.PricedItinerary ?? [];

  const offers = itineraries.map((it) => _toFlightOffer(it, currency));

  // 3. Cache
  await _cacheSet(key, offers);

  return offers;
}

// ─── getFlightPrice ────────────────────────────────────────────────────────────

/**
 * Re-prices a single Sabre itinerary using the Air Price API.
 * Pass the full raw PricedItinerary object from searchFlights.
 *
 * @param {object} offer — FlightOffer.raw (Sabre PricedItinerary)
 * @returns {Promise<FlightOffer>}
 * @throws  {SabreAdapterError}
 */
async function getFlightPrice(offer) {
  let res;
  try {
    res = await axios.post(
      `${BASE_URL}/v1.8.0/air/price`,
      {
        OTA_AirPriceRQ: {
          PricedItineraries: {
            PricedItinerary: [offer.raw ?? offer],
          },
        },
      },
      { headers: await _headers(), timeout: 15000 }
    );
  } catch (err) {
    throw new SabreAdapterError(
      err.response?.data?.message ?? err.message,
      err.response?.status ?? 502,
      err.response?.data
    );
  }

  const repriced =
    res.data?.OTA_AirPriceRS?.PricedItineraries?.PricedItinerary?.[0];

  if (!repriced) {
    throw new SabreAdapterError('Empty pricing response from Sabre', 502);
  }

  const currency = res.data?.OTA_AirPriceRS?.PricedItineraries
    ?.PricedItinerary?.[0]?.AirItineraryPricingInfo?.[0]
    ?.ItinTotalFare?.TotalFare?.CurrencyCode ?? 'SAR';

  return _toFlightOffer(repriced, currency);
}

// ─── createFlightOrder ─────────────────────────────────────────────────────────

/**
 * Books a flight using the Sabre Air Book REST endpoint.
 *
 * @param {object} offer    — FlightOffer.raw (from getFlightPrice)
 * @param {object} traveler — Traveler object:
 *   {
 *     firstName: string,
 *     lastName:  string,
 *     dateOfBirth: 'YYYY-MM-DD',
 *     gender: 'M' | 'F',
 *     email: string,
 *     phone: string,          // digits only, no country code
 *     phoneCountryCode: '966',
 *     documentType: 'PP',     // PP = passport
 *     documentNumber: string,
 *     documentExpiry: 'YYYY-MM-DD',
 *     nationality: 'SA',
 *   }
 *
 * @returns {Promise<object>} booking result
 *   { orderId, pnr, status, flightOffers, travelers, raw }
 * @throws {SabreAdapterError}
 */
async function createFlightOrder(offer, traveler) {
  const t = Array.isArray(traveler) ? traveler[0] : traveler;

  const body = {
    CreatePassengerNameRecordRQ: {
      version: '2.4.0',
      TravelItineraryAddInfo: {
        CustomerInfo: {
          ContactNumbers: {
            ContactNumber: [{
              Phone:        t.phone,
              PhoneUseType: 'H',
              CountryCode:  t.phoneCountryCode ?? '966',
            }],
          },
          Email: [{ Address: t.email, NameNumber: '1.1' }],
          PersonName: [{
            NameNumber:  '1.1',
            GivenName:   t.firstName,
            Surname:     t.lastName,
          }],
        },
      },
      AirBook: {
        RetryRebook: { Option: true },
        OriginDestinationInformation: {
          FlightSegment: _extractSegments(offer),
        },
      },
      AirPrice: [{ PriceRequestInformation: { Retain: true } }],
      SpecialReqDetails: {
        AddRemark: {
          RemarkInfo: {
            Remark: [{ Type: 'General', Text: 'UTUBooking automated reservation' }],
          },
        },
        AirSeat: { Seats: { Seat: [] } }, // no seat preference by default
      },
      PostProcessing: {
        RedisplayReservation: { waitInterval: 100 },
        EndTransaction: {
          Source: { ReceivedFrom: 'UTUBooking' },
        },
      },
    },
  };

  let res;
  try {
    res = await axios.post(
      `${BASE_URL}/v2.4.0/passenger/records`,
      body,
      { headers: await _headers(), timeout: 30000 }
    );
  } catch (err) {
    throw new SabreAdapterError(
      err.response?.data?.message ?? err.message,
      err.response?.status ?? 502,
      err.response?.data
    );
  }

  const record = res.data?.CreatePassengerNameRecordRS;
  const pnr    = record?.ItineraryRef?.ID ?? null;

  return {
    orderId:      pnr,
    pnr,
    status:       pnr ? 'confirmed' : 'pending',
    flightOffers: [offer],
    travelers:    [t],
    raw:          record ?? res.data,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extracts FlightSegment booking nodes from a raw Sabre PricedItinerary */
function _extractSegments(offer) {
  const raw = offer.raw ?? offer;
  return (
    raw.AirItinerary?.OriginDestinationOptions
      ?.OriginDestinationOption?.[0]?.FlightSegment ?? []
  ).map((seg) => ({
    ArrivalDateTime:   seg['@ArrivalDateTime'],
    DepartureDateTime: seg['@DepartureDateTime'],
    FlightNumber:      seg['@FlightNumber'],
    NumberInParty:     '1',
    ResBookDesigCode:  seg.ResBookDesigCode ?? 'Y',
    Status:            'NN',
    DestinationLocation: { LocationCode: seg.ArrivalAirport?.['@LocationCode'] },
    MarketingAirline:    { Code: seg.MarketingAirline?.['@Code'], FlightNumber: seg['@FlightNumber'] },
    OriginLocation:      { LocationCode: seg.DepartureAirport?.['@LocationCode'] },
  }));
}

// ─── Convenience wrappers (positional-arg API) ────────────────────────────────

/**
 * Positional-argument wrapper around searchFlights for use in failover chains.
 *
 * @param {string} origin  — IATA departure code
 * @param {string} dest    — IATA arrival code
 * @param {string} date    — 'YYYY-MM-DD'
 * @param {string} [cabin] — ECONOMY | BUSINESS | FIRST (default: ECONOMY)
 * @param {object} [opts]  — optional overrides: { adults, currency, maxOffers }
 * @returns {Promise<FlightOffer[]>}
 */
async function searchFlightsSabre(origin, dest, date, cabin = 'ECONOMY', opts = {}) {
  return searchFlights({
    origin,
    destination: dest,
    date,
    adults:     opts.adults     ?? 1,
    cabinClass: cabin.toUpperCase(),
    currency:   opts.currency   ?? 'SAR',
    maxOffers:  opts.maxOffers  ?? 20,
  });
}

/**
 * Positional-argument wrapper around createFlightOrder.
 * Accepts a FlightOffer (from searchFlightsSabre or searchFlights) and a
 * traveler object, then delegates to createFlightOrder.
 *
 * @param {object} offer    — FlightOffer (must include .raw with Sabre PricedItinerary)
 * @param {object} traveler — Sabre traveler shape (see createFlightOrder JSDoc)
 * @returns {Promise<object>} { orderId, pnr, status, flightOffers, travelers, raw }
 */
async function createSabreOrder(offer, traveler) {
  return createFlightOrder(offer, traveler);
}

// ─── Error type ───────────────────────────────────────────────────────────────

class SabreAdapterError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'SabreAdapterError';
    this.statusCode = statusCode;
    this.raw        = raw;
  }
}

module.exports = {
  searchFlights,
  searchFlightsSabre,
  getFlightPrice,
  createFlightOrder,
  createSabreOrder,
  SabreAdapterError,
  _toFlightOffer, // exported for unit tests
};
