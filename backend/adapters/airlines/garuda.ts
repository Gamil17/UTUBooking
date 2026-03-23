/**
 * Garuda Indonesia Airline Adapter
 *
 * Uses the Garuda Indonesia partner REST API (api.ga.group / GarudaID B2B).
 *
 * Authentication: API key passed as X-Api-Key header.
 *   Set env var GARUDA_API_KEY. Obtain from Garuda Indonesia partner portal.
 *
 * Key routes served:
 *   CGK ↔ JED  — busiest Umrah route globally; Garuda GA-981/GA-984
 *   CGK ↔ MED  — Madinah direct; Garuda GA-985/GA-986
 *   SUB ↔ JED  — Surabaya Umrah charter + scheduled
 *   DPS ↔ JED  — Bali via CGK
 *   CGK ↔ SUB/DPS/UPG — Indonesian domestic legs for connection
 *
 * GarudaMiles loyalty:
 *   Members earn miles on all operated segments.
 *   Pass loyaltyNumber in the traveler object → included in PNR remarks.
 *
 * Caching: Redis key `flight:garuda:search:{sha256(params)}` — 180s TTL.
 *
 * Sandbox / Production toggle:
 *   GARUDA_SANDBOX=true → uses sandbox.api.ga.group
 *   (default: production)
 *
 * Error handling:
 *   Non-2xx responses throw GarudaAdapterError with statusCode + message.
 *   Rate limit (429) and server errors (5xx) are re-thrown; callers should
 *   implement retry / fallback to Amadeus GDS.
 */

'use strict';

import crypto from 'crypto';
import { createClient as createRedisClient } from 'redis';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY   = process.env.GARUDA_API_KEY ?? '';
const SANDBOX   = process.env.GARUDA_SANDBOX === 'true';
const BASE_URL  = SANDBOX
  ? 'https://sandbox.api.ga.group/v1'
  : 'https://api.ga.group/v1';

const GA_CARRIER     = 'GA';
const CACHE_TTL_SEC  = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GarudaSearchParams {
  origin:       string;       // IATA 3-letter airport code (e.g. 'CGK')
  destination:  string;       // IATA 3-letter airport code (e.g. 'JED')
  date:         string;       // ISO 8601 date 'YYYY-MM-DD'
  adults?:      number;       // default: 1
  cabinClass?:  'ECONOMY' | 'BUSINESS' | 'FIRST';
  currency?:    string;       // default: 'IDR'
  maxOffers?:   number;       // default: 20
  loyaltyNumber?: string;     // GarudaMiles member number — for miles accrual display
}

export interface GarudaTraveler {
  id:           string;       // unique within the order (e.g. '1')
  firstName:    string;
  lastName:     string;
  dateOfBirth:  string;       // 'YYYY-MM-DD'
  gender:       'MALE' | 'FEMALE';
  nationality:  string;       // ISO 3166-1 alpha-2 country code
  passportNumber: string;
  passportExpiry: string;     // 'YYYY-MM-DD'
  email:        string;
  phone:        string;       // E.164 format, e.g. '+6281234567890'
  garudaMiles?: string;       // GarudaMiles frequent-flyer number (optional)
}

export interface FlightOffer {
  id:             string;
  flightNum:      string;     // e.g. 'GA-981'
  airlineCode:    string;     // 'GA'
  airlineName:    string;     // 'Garuda Indonesia'
  originIata:     string;
  destinationIata:string;
  departureAt:    string;     // ISO 8601
  arrivalAt:      string;     // ISO 8601
  cabinClass:     string;
  price:          number;
  currency:       string;
  durationMinutes:number;
  stops:          number;
  isRefundable:   boolean;
  baggageKg:      number;     // included checked baggage (kg)
  milesEarned:    number;     // estimated GarudaMiles earned
  fareClass:      string;     // fare basis code
  availableSeats: number;
  source:         'garuda';
  _offerId:       string;     // internal — required for pricing + booking calls
}

export interface GarudaOrderResult {
  pnr:           string;      // Garuda PNR / booking reference
  ticketNumbers: string[];    // e-ticket numbers (issued immediately or on payment)
  status:        'CONFIRMED' | 'ON_HOLD' | 'TICKETED';
  totalAmount:   number;
  currency:      string;
  passengers:    { id: string; name: string; ticketNumber?: string }[];
}

export class GarudaAdapterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly garudaCode?: string,
  ) {
    super(message);
    this.name = 'GarudaAdapterError';
  }
}

// ─── Redis client (shared singleton via env var) ──────────────────────────────

let _redis: ReturnType<typeof createRedisClient> | null = null;

function getRedis() {
  if (!_redis) {
    _redis = createRedisClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    _redis.on('error', (e: Error) => console.error('[garuda-adapter] redis error:', e));
    _redis.connect().catch((e: Error) => console.error('[garuda-adapter] redis connect failed:', e));
  }
  return _redis;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function gaRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'X-Api-Key':     API_KEY,
      'X-Partner-Id':  process.env.GARUDA_PARTNER_ID ?? '',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    let msg = `Garuda API error ${res.status}`;
    let garudaCode: string | undefined;
    try {
      const err = await res.json() as { message?: string; code?: string };
      if (err.message) msg = err.message;
      garudaCode = err.code;
    } catch { /* ignore parse error */ }
    throw new GarudaAdapterError(msg, res.status, garudaCode);
  }

  return res.json() as Promise<T>;
}

// ─── Miles estimation ─────────────────────────────────────────────────────────

/**
 * Estimates GarudaMiles earned for a given fare.
 * Garuda accrual tiers (approximate):
 *   Economy (Y/B/M/H/Q): 0.50 miles per km
 *   Economy Flex (K/L/N): 0.75 miles/km
 *   Business (C/D/Z):    1.50 miles/km
 *   First (F/A):         2.00 miles/km
 *
 * CGK-JED great-circle distance ≈ 7,640 km (via standard route).
 */
const MILES_PER_KM: Record<string, number> = {
  Y: 0.50, B: 0.50, M: 0.50, H: 0.50, Q: 0.50,
  K: 0.75, L: 0.75, N: 0.75,
  C: 1.50, D: 1.50, Z: 1.50,
  F: 2.00, A: 2.00,
};

function estimateMilesEarned(fareClass: string, durationMinutes: number): number {
  // Estimate distance from duration (average Garuda cruising speed ≈ 870 km/h)
  const estimatedKm  = (durationMinutes / 60) * 870;
  const ratePerKm    = MILES_PER_KM[fareClass?.[0]?.toUpperCase() ?? 'Y'] ?? 0.50;
  return Math.round(estimatedKm * ratePerKm);
}

// ─── Response normaliser ──────────────────────────────────────────────────────

interface GarudaRawOffer {
  offerId:        string;
  flightNumber:   string;
  departure: {
    iata: string;
    at:   string;   // ISO 8601
  };
  arrival: {
    iata: string;
    at:   string;
  };
  cabinClass:     string;
  fareClass:      string;
  totalPrice:     number;
  currency:       string;
  durationMinutes:number;
  stops:          number;
  isRefundable:   boolean;
  checkedBaggageKg: number;
  seatsAvailable: number;
}

function normaliseOffer(raw: GarudaRawOffer): FlightOffer {
  return {
    id:              `ga-${raw.offerId}`,
    flightNum:       raw.flightNumber,
    airlineCode:     GA_CARRIER,
    airlineName:     'Garuda Indonesia',
    originIata:      raw.departure.iata,
    destinationIata: raw.arrival.iata,
    departureAt:     raw.departure.at,
    arrivalAt:       raw.arrival.at,
    cabinClass:      raw.cabinClass,
    price:           raw.totalPrice,
    currency:        raw.currency,
    durationMinutes: raw.durationMinutes,
    stops:           raw.stops,
    isRefundable:    raw.isRefundable,
    baggageKg:       raw.checkedBaggageKg,
    milesEarned:     estimateMilesEarned(raw.fareClass, raw.durationMinutes),
    fareClass:       raw.fareClass,
    availableSeats:  raw.seatsAvailable,
    source:          'garuda',
    _offerId:        raw.offerId,
  };
}

// ─── searchFlights ────────────────────────────────────────────────────────────

/**
 * Searches Garuda Indonesia flights via the partner availability API.
 * Results cached in Redis for CACHE_TTL_SEC seconds.
 *
 * @param params  GarudaSearchParams
 * @returns       Normalised FlightOffer[] sorted by price ascending
 */
export async function searchFlights(params: GarudaSearchParams): Promise<FlightOffer[]> {
  const {
    origin,
    destination,
    date,
    adults      = 1,
    cabinClass  = 'ECONOMY',
    currency    = 'IDR',
    maxOffers   = 20,
  } = params;

  // ── Cache check ───────────────────────────────────────────────────────────
  const cacheKey = `flight:garuda:search:${
    crypto.createHash('sha256')
      .update(JSON.stringify({ origin, destination, date, adults, cabinClass, currency }))
      .digest('hex')
  }`;

  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as FlightOffer[];
  } catch { /* non-fatal — continue without cache */ }

  // ── API call ──────────────────────────────────────────────────────────────
  const requestBody = {
    origin:      origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departureDate: date,
    passengers: {
      adults,
      children: 0,
      infants:  0,
    },
    cabinClass,
    currency,
    directOnly: false,    // allow CGK-JED via layover (e.g. some routes via KUL)
    limit:      maxOffers,
  };

  const response = await gaRequest<{ offers: GarudaRawOffer[]; total: number }>(
    'POST',
    '/flights/availability',
    requestBody,
  );

  const offers = (response.offers ?? [])
    .filter((o) => o.seatsAvailable > 0)
    .map(normaliseOffer)
    .sort((a, b) => a.price - b.price)
    .slice(0, maxOffers);

  // ── Cache set ─────────────────────────────────────────────────────────────
  try {
    await getRedis().setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(offers));
  } catch { /* non-fatal */ }

  return offers;
}

// ─── getFlightPrice ───────────────────────────────────────────────────────────

/**
 * Re-prices a specific flight offer.
 * Should be called before booking to confirm the fare is still available.
 *
 * @param offer  A FlightOffer returned by searchFlights()
 * @returns      Updated FlightOffer with current price
 */
export async function getFlightPrice(offer: FlightOffer): Promise<FlightOffer> {
  const response = await gaRequest<{ offer: GarudaRawOffer }>(
    'POST',
    '/flights/pricing',
    { offerId: offer._offerId },
  );

  return normaliseOffer(response.offer);
}

// ─── createFlightOrder ────────────────────────────────────────────────────────

/**
 * Creates a Garuda Indonesia booking (PNR) for a priced offer.
 * Includes GarudaMiles loyalty number injection when provided.
 *
 * @param offer     A repriced FlightOffer (from getFlightPrice)
 * @param travelers Array of GarudaTraveler objects
 * @returns         GarudaOrderResult with PNR and ticket numbers
 */
export async function createFlightOrder(
  offer: FlightOffer,
  travelers: GarudaTraveler[],
): Promise<GarudaOrderResult> {
  const passengers = travelers.map((t, i) => ({
    passengerId:  String(i + 1),
    type:         'ADT',          // adult — extend for CHD/INF if needed
    firstName:    t.firstName.toUpperCase(),
    lastName:     t.lastName.toUpperCase(),
    dateOfBirth:  t.dateOfBirth,
    gender:       t.gender,
    nationality:  t.nationality,
    document: {
      type:       'PASSPORT',
      number:     t.passportNumber,
      expiry:     t.passportExpiry,
      issuingCountry: t.nationality,
    },
    contact: {
      email: t.email,
      phone: t.phone,
    },
    // GarudaMiles — injected as frequentFlyer when provided
    ...(t.garudaMiles ? {
      frequentFlyer: {
        programCode: 'GA',
        memberNumber: t.garudaMiles,
      },
    } : {}),
  }));

  const orderBody = {
    offerId:    offer._offerId,
    passengers,
    contactEmail: travelers[0]?.email ?? '',
    contactPhone: travelers[0]?.phone ?? '',
  };

  const response = await gaRequest<{
    pnr:          string;
    status:       'CONFIRMED' | 'ON_HOLD' | 'TICKETED';
    ticketNumbers:string[];
    totalAmount:  number;
    currency:     string;
    passengers:   { id: string; name: string; ticketNumber?: string }[];
  }>('POST', '/orders', orderBody);

  return {
    pnr:           response.pnr,
    ticketNumbers: response.ticketNumbers ?? [],
    status:        response.status,
    totalAmount:   response.totalAmount,
    currency:      response.currency,
    passengers:    response.passengers ?? [],
  };
}

// ─── Key domestic + Hajj routes (reference data) ─────────────────────────────

/** High-priority routes for pre-loading suggestions and display ordering. */
export const GARUDA_KEY_ROUTES: ReadonlyArray<{ origin: string; destination: string; label: string }> = [
  { origin: 'CGK', destination: 'JED', label: 'Jakarta → Jeddah (Umrah/Hajj)' },
  { origin: 'CGK', destination: 'MED', label: 'Jakarta → Madinah' },
  { origin: 'SUB', destination: 'JED', label: 'Surabaya → Jeddah (Umrah)' },
  { origin: 'DPS', destination: 'JED', label: 'Bali → Jeddah (via Jakarta)' },
  { origin: 'CGK', destination: 'SUB', label: 'Jakarta → Surabaya (domestic)' },
  { origin: 'CGK', destination: 'DPS', label: 'Jakarta → Bali (domestic)' },
  { origin: 'CGK', destination: 'UPG', label: 'Jakarta → Makassar (domestic)' },
];

/** Indonesian airports covered by Garuda and partner carriers. */
export const INDONESIAN_AIRPORTS: ReadonlyArray<{
  iata: string; name: string; city: string; cityId: string;
}> = [
  { iata: 'CGK', name: 'Soekarno–Hatta International', city: 'Jakarta',   cityId: 'jakarta' },
  { iata: 'SUB', name: 'Juanda International Airport',  city: 'Surabaya',  cityId: 'surabaya' },
  { iata: 'DPS', name: 'Ngurah Rai International',      city: 'Bali',      cityId: 'bali' },
  { iata: 'UPG', name: 'Sultan Hasanuddin International',city: 'Makassar', cityId: 'makassar' },
];
