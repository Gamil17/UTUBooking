/**
 * AirAsia Airline Adapter — Malaysia (AK / D7 / Z2 / XT)
 *
 * Uses the AirAsia Open Partner API (direct, not GDS).
 * Apply for partner access at: https://developer.airasia.com
 * Contact: partners@airasia.com
 *
 * Authentication:
 *   OAuth2 Client Credentials — token endpoint:
 *   POST https://auth.airasia.com/oauth/token
 *   Token TTL: 3600s — cached at 90% (3240s) to avoid clock skew.
 *
 * Required env vars:
 *   AIRASIA_CLIENT_ID      — OAuth2 client ID from developer portal
 *   AIRASIA_CLIENT_SECRET  — OAuth2 client secret
 *   AIRASIA_PARTNER_ID     — partner identifier assigned by AirAsia
 *   AIRASIA_SANDBOX        — 'true' to use sandbox environment
 *
 * Key routes covered:
 *   KUL ↔ JED  — highest-volume budget Hajj/Umrah route from Malaysia
 *   KUL ↔ MED  — Madinah direct (AirAsia X D7 long-haul)
 *   KUL ↔ RUH  — Riyadh via AirAsia X
 *   PEN ↔ JED  — Penang direct charter + scheduled
 *   JHB ↔ KUL  — domestic feed for Johor Bahru pilgrims
 *   BKI ↔ KUL  — domestic feed for Sabah pilgrims
 *
 * Carrier codes operated by AirAsia Group (Malaysia):
 *   AK  — AirAsia Malaysia (short-haul)
 *   D7  — AirAsia X (long-haul: KUL-JED, KUL-MED, KUL-RUH)
 *   Note: Both filtered via this adapter.
 *
 * Loyalty:
 *   AirAsia BIG Loyalty program.
 *   BIG Points accrual injected when bigMemberId is provided in traveler object.
 *
 * Caching:
 *   Redis key: `flight:airasia:search:{sha256(params)}` — 180s TTL
 *   Auth token: `airasia:oauth:token` — 3240s TTL
 */

'use strict';

import crypto from 'crypto';
import { createClient as createRedisClient } from 'redis';

// ─── Config ───────────────────────────────────────────────────────────────────

const CLIENT_ID     = process.env.AIRASIA_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.AIRASIA_CLIENT_SECRET ?? '';
const PARTNER_ID    = process.env.AIRASIA_PARTNER_ID    ?? '';
const SANDBOX       = process.env.AIRASIA_SANDBOX       === 'true';

const BASE_URL   = SANDBOX
  ? 'https://sandbox-api.airasia.com/v2'
  : 'https://openapi.airasia.com/v2';
const AUTH_URL   = SANDBOX
  ? 'https://sandbox-auth.airasia.com/oauth/token'
  : 'https://auth.airasia.com/oauth/token';

/** AirAsia Group Malaysian carrier codes (short-haul + long-haul). */
const AA_CARRIERS: readonly string[] = ['AK', 'D7'];

const CACHE_TTL_SEC   = 180;
const TOKEN_TTL_SEC   = 3240; // 90% of 3600s

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AirAsiaSearchParams {
  origin:        string;          // IATA 3-letter code (e.g. 'KUL')
  destination:   string;          // IATA 3-letter code (e.g. 'JED')
  date:          string;          // 'YYYY-MM-DD'
  adults?:       number;          // default: 1
  cabinClass?:   'ECONOMY' | 'PREMIUM_FLATBED'; // AirAsia X only has Economy + Premium Flatbed
  currency?:     string;          // default: 'MYR'
  maxOffers?:    number;          // default: 20
  bigMemberId?:  string;          // BIG Loyalty member ID (for points estimation display)
}

export interface AirAsiaTraveler {
  id:           string;
  firstName:    string;
  lastName:     string;
  dateOfBirth:  string;   // 'YYYY-MM-DD'
  gender:       'MALE' | 'FEMALE';
  nationality:  string;   // ISO 3166-1 alpha-2
  passportNumber: string;
  passportExpiry: string; // 'YYYY-MM-DD'
  email:        string;
  phone:        string;   // E.164
  bigMemberId?: string;   // AirAsia BIG Loyalty number (optional)
}

export interface FlightOffer {
  id:             string;
  flightNum:      string;   // e.g. 'AK-732' or 'D7-206'
  airlineCode:    string;   // 'AK' or 'D7'
  airlineName:    string;   // 'AirAsia' or 'AirAsia X'
  originIata:     string;
  destinationIata:string;
  departureAt:    string;   // ISO 8601
  arrivalAt:      string;   // ISO 8601
  cabinClass:     string;
  price:          number;
  currency:       string;
  durationMinutes:number;
  stops:          number;
  isRefundable:   boolean;
  baggageKg:      number;   // included checked baggage kg (0 if bare fare)
  isBundled:      boolean;  // true if baggage is included in the fare
  bigPointsEarned:number;   // estimated BIG Points earned
  fareFamily:     string;   // 'BARE' | 'VALUE' | 'PREMIUM' | 'FLATBED'
  availableSeats: number;
  source:         'airasia';
  _fareKey:       string;   // internal — required for repricing and booking
}

export interface AirAsiaOrderResult {
  bookingReference: string; // 6-character AirAsia PNR
  status:           'CONFIRMED' | 'PENDING' | 'FAILED';
  totalAmount:      number;
  currency:         string;
  paymentDeadline:  string; // ISO 8601 — payment must complete before this time
  eTickets:         { passengerId: string; eTicketNumber: string }[];
}

export class AirAsiaAdapterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly aaErrorCode?: string,
  ) {
    super(message);
    this.name = 'AirAsiaAdapterError';
  }
}

// ─── Redis ────────────────────────────────────────────────────────────────────

let _redis: ReturnType<typeof createRedisClient> | null = null;

function getRedis() {
  if (!_redis) {
    _redis = createRedisClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    _redis.on('error', (e: Error) => console.error('[airasia-adapter] redis error:', e));
    _redis.connect().catch((e: Error) => console.error('[airasia-adapter] redis connect failed:', e));
  }
  return _redis;
}

// ─── OAuth2 token management ──────────────────────────────────────────────────

const TOKEN_CACHE_KEY = 'airasia:oauth:token';

async function getAccessToken(): Promise<string> {
  // Check Redis first
  try {
    const cached = await getRedis().get(TOKEN_CACHE_KEY);
    if (cached) return cached;
  } catch { /* non-fatal */ }

  // Request new token
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         'flights:read bookings:write',
  });

  const res = await fetch(AUTH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
    signal:  AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AirAsiaAdapterError(
      `AirAsia OAuth2 failed (${res.status}): ${text}`,
      res.status,
      'AUTH_FAILED',
    );
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  const ttl  = Math.round((data.expires_in ?? 3600) * 0.9);

  try {
    await getRedis().setEx(TOKEN_CACHE_KEY, ttl, data.access_token);
  } catch { /* non-fatal */ }

  return data.access_token;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function aaRequest<T>(
  method: 'GET' | 'POST',
  path:   string,
  body?:  unknown,
): Promise<T> {
  const token = await getAccessToken();
  const res   = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Partner-Id':  PARTNER_ID,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    let msg  = `AirAsia API error ${res.status}`;
    let code: string | undefined;
    try {
      const err = await res.json() as { message?: string; error_code?: string };
      if (err.message)    msg  = err.message;
      if (err.error_code) code = err.error_code;
    } catch { /* ignore */ }
    // Invalidate token on 401 so next call re-authenticates
    if (res.status === 401) {
      await getRedis().del(TOKEN_CACHE_KEY).catch(() => null);
    }
    throw new AirAsiaAdapterError(msg, res.status, code);
  }

  return res.json() as Promise<T>;
}

// ─── BIG Points estimation ────────────────────────────────────────────────────

/**
 * Estimates BIG Points earned per booking.
 * AirAsia BIG accrual:
 *   Bare fares:     1 BIG Point per MYR 1 spent
 *   Value/Standard: 2 BIG Points per MYR 1
 *   Premium Flatbed:3 BIG Points per MYR 1
 */
function estimateBigPoints(fareFamily: string, priceMYR: number): number {
  const rate = fareFamily === 'FLATBED' || fareFamily === 'PREMIUM' ? 3
             : fareFamily === 'VALUE'                               ? 2
             : 1;
  return Math.round(priceMYR * rate);
}

// ─── Response normaliser ──────────────────────────────────────────────────────

interface AirAsiaRawOffer {
  fareKey:         string;
  flightNumber:    string;    // e.g. 'AK732' or 'D7206'
  carrierCode:     string;    // 'AK' | 'D7'
  origin:          string;
  destination:     string;
  departureTime:   string;    // ISO 8601
  arrivalTime:     string;    // ISO 8601
  cabinClass:      string;
  fareFamily:      string;
  totalPrice:      number;
  currency:        string;
  durationMinutes: number;
  transitCount:    number;    // stops (0 = direct)
  isRefundable:    boolean;
  includedBaggageKg: number;
  availableSeats:  number;
}

function normaliseOffer(raw: AirAsiaRawOffer): FlightOffer {
  const carrier   = raw.carrierCode === 'D7' ? 'D7' : 'AK';
  const flightNum = `${carrier}-${raw.flightNumber.replace(/^[A-Z]+/, '')}`;
  return {
    id:              `aa-${raw.fareKey.slice(0, 16)}`,
    flightNum,
    airlineCode:     carrier,
    airlineName:     carrier === 'D7' ? 'AirAsia X' : 'AirAsia',
    originIata:      raw.origin,
    destinationIata: raw.destination,
    departureAt:     raw.departureTime,
    arrivalAt:       raw.arrivalTime,
    cabinClass:      raw.cabinClass,
    price:           raw.totalPrice,
    currency:        raw.currency,
    durationMinutes: raw.durationMinutes,
    stops:           raw.transitCount,
    isRefundable:    raw.isRefundable,
    baggageKg:       raw.includedBaggageKg,
    isBundled:       raw.includedBaggageKg > 0,
    bigPointsEarned: estimateBigPoints(raw.fareFamily, raw.totalPrice),
    fareFamily:      raw.fareFamily,
    availableSeats:  raw.availableSeats,
    source:          'airasia',
    _fareKey:        raw.fareKey,
  };
}

// ─── searchFlights ────────────────────────────────────────────────────────────

/**
 * Searches AirAsia flights via the Partner API.
 * Results cached in Redis for CACHE_TTL_SEC seconds.
 *
 * @param params  AirAsiaSearchParams
 * @returns       Normalised FlightOffer[] sorted by price ascending
 */
export async function searchFlights(params: AirAsiaSearchParams): Promise<FlightOffer[]> {
  const {
    origin,
    destination,
    date,
    adults      = 1,
    cabinClass  = 'ECONOMY',
    currency    = 'MYR',
    maxOffers   = 20,
  } = params;

  const cacheKey = `flight:airasia:search:${
    crypto.createHash('sha256')
      .update(JSON.stringify({ origin, destination, date, adults, cabinClass, currency }))
      .digest('hex')
  }`;

  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as FlightOffer[];
  } catch { /* non-fatal */ }

  const body = {
    origin:        origin.toUpperCase(),
    destination:   destination.toUpperCase(),
    departureDate: date,
    passengers: { adults, children: 0, infants: 0 },
    cabinClass,
    currency,
    carriers:      AA_CARRIERS,
    maxResults:    maxOffers,
  };

  const response = await aaRequest<{ flights: AirAsiaRawOffer[] }>(
    'POST',
    '/flights/search',
    body,
  );

  const offers = (response.flights ?? [])
    .filter((f) => f.availableSeats > 0 && AA_CARRIERS.includes(f.carrierCode))
    .map(normaliseOffer)
    .sort((a, b) => a.price - b.price)
    .slice(0, maxOffers);

  try {
    await getRedis().setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(offers));
  } catch { /* non-fatal */ }

  return offers;
}

// ─── getFlightPrice ───────────────────────────────────────────────────────────

/**
 * Re-prices a specific AirAsia fare key before booking.
 * AirAsia fares are volatile — always reprice immediately before order creation.
 *
 * @param offer  FlightOffer from searchFlights()
 * @returns      Updated FlightOffer with current price
 */
export async function getFlightPrice(offer: FlightOffer): Promise<FlightOffer> {
  const response = await aaRequest<{ flight: AirAsiaRawOffer }>(
    'POST',
    '/flights/price',
    { fareKey: offer._fareKey },
  );
  return normaliseOffer(response.flight);
}

// ─── createFlightOrder ────────────────────────────────────────────────────────

/**
 * Creates an AirAsia booking for a priced offer.
 * Injects BIG Loyalty member IDs when provided.
 *
 * @param offer     A repriced FlightOffer (from getFlightPrice)
 * @param travelers Array of AirAsiaTraveler
 * @returns         AirAsiaOrderResult with booking reference
 */
export async function createFlightOrder(
  offer:     FlightOffer,
  travelers: AirAsiaTraveler[],
): Promise<AirAsiaOrderResult> {
  const passengers = travelers.map((t, i) => ({
    passengerId:     String(i + 1),
    passengerType:   'ADT',
    firstName:       t.firstName.toUpperCase(),
    lastName:        t.lastName.toUpperCase(),
    dateOfBirth:     t.dateOfBirth,
    gender:          t.gender,
    nationality:     t.nationality,
    passportNumber:  t.passportNumber,
    passportExpiry:  t.passportExpiry,
    contactEmail:    t.email,
    contactPhone:    t.phone,
    ...(t.bigMemberId ? { bigMemberId: t.bigMemberId } : {}),
  }));

  const response = await aaRequest<{
    bookingReference: string;
    status:           string;
    totalAmount:      number;
    currency:         string;
    paymentDeadline:  string;
    eTickets?:        { passengerId: string; eTicketNumber: string }[];
  }>('POST', '/bookings', {
    fareKey:    offer._fareKey,
    passengers,
    contactEmail: travelers[0]?.email ?? '',
    contactPhone: travelers[0]?.phone ?? '',
    partnerId:    PARTNER_ID,
  });

  return {
    bookingReference: response.bookingReference,
    status:           response.status as AirAsiaOrderResult['status'],
    totalAmount:      response.totalAmount,
    currency:         response.currency,
    paymentDeadline:  response.paymentDeadline,
    eTickets:         response.eTickets ?? [],
  };
}

// ─── Reference data ───────────────────────────────────────────────────────────

/** High-priority AirAsia routes for Malaysian Hajj/Umrah market. */
export const AIRASIA_KEY_ROUTES: ReadonlyArray<{
  origin: string; destination: string; carrier: string; label: string;
}> = [
  { origin: 'KUL', destination: 'JED', carrier: 'D7', label: 'Kuala Lumpur → Jeddah (AirAsia X, Umrah/Hajj)' },
  { origin: 'KUL', destination: 'MED', carrier: 'D7', label: 'Kuala Lumpur → Madinah (AirAsia X)' },
  { origin: 'KUL', destination: 'RUH', carrier: 'D7', label: 'Kuala Lumpur → Riyadh (AirAsia X)' },
  { origin: 'PEN', destination: 'JED', carrier: 'AK', label: 'Penang → Jeddah (AirAsia)' },
  { origin: 'JHB', destination: 'KUL', carrier: 'AK', label: 'Johor Bahru → Kuala Lumpur (domestic feed)' },
  { origin: 'BKI', destination: 'KUL', carrier: 'AK', label: 'Kota Kinabalu → Kuala Lumpur (domestic feed)' },
];

/** Malaysian airports served by AirAsia. */
export const MY_AIRPORTS_AIRASIA: ReadonlyArray<{
  iata: string; name: string; city: string;
}> = [
  { iata: 'KUL', name: 'Kuala Lumpur International Airport (KLIA)',   city: 'Kuala Lumpur' },
  { iata: 'PEN', name: 'Penang International Airport',                 city: 'Penang' },
  { iata: 'JHB', name: 'Senai International Airport',                  city: 'Johor Bahru' },
  { iata: 'BKI', name: 'Kota Kinabalu International Airport',          city: 'Kota Kinabalu' },
  { iata: 'KBR', name: 'Sultan Ismail Petra Airport',                  city: 'Kota Bharu' },
  { iata: 'KUA', name: 'Kuantan Airport',                              city: 'Kuantan' },
];
