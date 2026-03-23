/**
 * Batik Air Malaysia Airline Adapter (OD)
 *
 * Uses Sabre Bargain Finder Max (BFM) REST API — same GDS as the base sabre.js adapter.
 * Batik Air Malaysia (formerly Malindo Air) is the Lion Air Group full-service arm in Malaysia.
 * IATA: OD  |  ICAO: MXD  |  Hub: KUL (KLIA2 secondary, KLIA primary)
 *
 * Note: Distinct from Batik Air Indonesia (IATA: ID). Both are Lion Group carriers.
 *
 * Sabre credentials shared with the base Sabre adapter:
 *   SABRE_CLIENT_ID, SABRE_CLIENT_SECRET, SABRE_PCC
 *
 * Carrier filter: OD (primary) + MH codeshare where operated by OD.
 * For purely MH-operated flights use the Amadeus adapter (MH is in Amadeus GDS).
 *
 * Key routes:
 *   KUL ↔ JED  — Umrah/Hajj premium market (OD full-service, 20 kg baggage included)
 *   KUL ↔ MED  — Madinah direct
 *   KUL ↔ RUH  — Riyadh corporate + Umrah
 *   PEN ↔ KUL  — Northern Malaysia feed for Penang pilgrims
 *   JHB ↔ KUL  — Southern Malaysia feed for Johor Bahru pilgrims
 *   BKI ↔ KUL  — Sabah feed (Kota Kinabalu pilgrims to KUL hub for Hajj connection)
 *
 * Caching:
 *   Redis key: `flight:batik-my:search:{sha256(params)}` — 180s TTL
 *   OAuth2 token: `sabre:oauth:token` — shared with base sabre.js
 */

'use strict';

import crypto from 'crypto';
import { createClient as createRedisClient } from 'redis';

// ─── Config ───────────────────────────────────────────────────────────────────

const SABRE_CLIENT_ID     = process.env.SABRE_CLIENT_ID     ?? '';
const SABRE_CLIENT_SECRET = process.env.SABRE_CLIENT_SECRET ?? '';
const SABRE_PCC           = process.env.SABRE_PCC           ?? '';
const SANDBOX             = process.env.SABRE_SANDBOX        === 'true';

const SABRE_BASE  = SANDBOX
  ? 'https://api.cert.sabre.com'
  : 'https://api.sabre.com';

/** Carrier codes to filter: OD primary + MH as codeshare partner. */
const CARRIER_CODES: readonly string[] = ['OD', 'MH'];

/** Only return offers operated by OD (strip pure MH metal). */
const OD_OPERATED = 'OD';

const CACHE_TTL_SEC = 180;
const TOKEN_TTL_SEC = Math.round(7 * 24 * 3600 * 0.85); // 85% of 7-day Sabre TTL

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatikMySearchParams {
  origin:      string;      // IATA 3-letter code (e.g. 'KUL')
  destination: string;      // IATA 3-letter code (e.g. 'JED')
  date:        string;      // 'YYYY-MM-DD'
  adults?:     number;      // default: 1
  cabinClass?: 'Economy' | 'Business';
  currency?:   string;      // default: 'MYR'
  maxOffers?:  number;      // default: 20
}

export interface BatikMyTraveler {
  id:             string;
  firstName:      string;
  lastName:       string;
  dateOfBirth:    string;   // 'YYYY-MM-DD'
  gender:         'M' | 'F';
  nationality:    string;   // ISO 3166-1 alpha-2
  passportNumber: string;
  passportExpiry: string;   // 'YYYY-MM-DD'
  email:          string;
  phone:          string;   // E.164; Malaysian default country code: '+60'
}

export interface FlightOffer {
  id:             string;
  flightNum:      string;   // e.g. 'OD-178'
  airlineCode:    'OD';
  airlineName:    'Batik Air Malaysia';
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
  baggageKg:      number;   // included: 20 kg domestic, 30 kg international
  source:         'batik-my';
  _raw:           unknown;  // full Sabre response itinerary (for booking)
}

export interface BatikMyOrderResult {
  pnr:       string;
  status:    'CONFIRMED' | 'ON_HOLD';
  totalFare: number;
  currency:  string;
  segments:  { flightNum: string; origin: string; destination: string; departureAt: string }[];
}

export class BatikMyAdapterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly sabreCode?: string,
  ) {
    super(message);
    this.name = 'BatikMyAdapterError';
  }
}

// ─── Redis ────────────────────────────────────────────────────────────────────

let _redis: ReturnType<typeof createRedisClient> | null = null;

function getRedis() {
  if (!_redis) {
    _redis = createRedisClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    _redis.on('error', (e: Error) => console.error('[batik-my-adapter] redis error:', e));
    _redis.connect().catch((e: Error) => console.error('[batik-my-adapter] redis connect failed:', e));
  }
  return _redis;
}

// ─── Sabre OAuth2 ─────────────────────────────────────────────────────────────
// Shares token with the base sabre.js adapter via the same Redis key.

const TOKEN_CACHE_KEY = 'sabre:oauth:token';

async function getSabreToken(): Promise<string> {
  try {
    const cached = await getRedis().get(TOKEN_CACHE_KEY);
    if (cached) return cached;
  } catch { /* non-fatal */ }

  const credentials = Buffer.from(
    `${encodeURIComponent(SABRE_CLIENT_ID)}:${encodeURIComponent(SABRE_CLIENT_SECRET)}`
  ).toString('base64');

  const res = await fetch(`${SABRE_BASE}/v2/auth/token`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:   'grant_type=client_credentials',
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new BatikMyAdapterError(`Sabre auth failed (${res.status})`, res.status, 'AUTH_FAILED');
  }

  const data = await res.json() as { access_token: string };

  try {
    await getRedis().setEx(TOKEN_CACHE_KEY, TOKEN_TTL_SEC, data.access_token);
  } catch { /* non-fatal */ }

  return data.access_token;
}

// ─── Sabre request helper ─────────────────────────────────────────────────────

async function sabreRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const token = await getSabreToken();
  const res = await fetch(`${SABRE_BASE}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    let msg  = `Sabre API error ${res.status}`;
    let code: string | undefined;
    try {
      const err = await res.json() as { message?: string; errorCode?: string };
      if (err.message)   msg  = err.message;
      if (err.errorCode) code = err.errorCode;
    } catch { /* ignore */ }
    if (res.status === 401) {
      await getRedis().del(TOKEN_CACHE_KEY).catch(() => null);
    }
    throw new BatikMyAdapterError(msg, res.status, code);
  }

  return res.json() as Promise<T>;
}

// ─── Duration parser ──────────────────────────────────────────────────────────

function parseDurationMinutes(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0', 10) * 60) + parseInt(m[2] ?? '0', 10);
}

// ─── Response normaliser ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseItinerary(it: any, currency: string): FlightOffer | null {
  try {
    const option = it.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.[0];
    const segs   = option?.FlightSegment ?? [];
    if (!segs.length) return null;

    const first = segs[0];
    const last  = segs[segs.length - 1];

    // Only include OD-operated metal
    const carrier = first.OperatingAirline?.['@Code'] ?? first.MarketingAirline?.['@Code'];
    if (carrier !== OD_OPERATED) return null;

    const fareInfo  = it.AirItineraryPricingInfo?.ItinTotalFare;
    const totalFare = parseFloat(fareInfo?.TotalFare?.['@Amount'] ?? '0');
    const cabin     = first.BookingClassAvails?.BookingClassAvail?.[0]?.['@CabinType'] ?? 'Economy';
    const duration  = parseDurationMinutes(option?.['@ElapsedTime'] ?? 'PT0M');

    // Included baggage: OD domestic 20kg, international 30kg
    const isIntl    = first.DepartureAirport?.['@LocationCode'] !== first.ArrivalAirport?.['@LocationCode'];
    const baggageKg = isIntl ? 30 : 20;

    return {
      id:              `od-${crypto.randomBytes(6).toString('hex')}`,
      flightNum:       `OD-${first.FlightNumber ?? ''}`,
      airlineCode:     'OD',
      airlineName:     'Batik Air Malaysia',
      originIata:      first.DepartureAirport?.['@LocationCode'] ?? '',
      destinationIata: last.ArrivalAirport?.['@LocationCode'] ?? '',
      departureAt:     first.DepartureDateTime ?? '',
      arrivalAt:       last.ArrivalDateTime ?? '',
      cabinClass:      cabin,
      price:           totalFare,
      currency,
      durationMinutes: duration,
      stops:           segs.length - 1,
      isRefundable:    false, // OD standard fares are non-refundable; upsell at booking
      baggageKg,
      source:          'batik-my',
      _raw:            it,
    };
  } catch {
    return null;
  }
}

// ─── searchFlights ────────────────────────────────────────────────────────────

export async function searchFlights(params: BatikMySearchParams): Promise<FlightOffer[]> {
  const {
    origin,
    destination,
    date,
    adults     = 1,
    cabinClass = 'Economy',
    currency   = 'MYR',
    maxOffers  = 20,
  } = params;

  const cacheKey = `flight:batik-my:search:${
    crypto.createHash('sha256')
      .update(JSON.stringify({ origin, destination, date, adults, cabinClass, currency }))
      .digest('hex')
  }`;

  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as FlightOffer[];
  } catch { /* non-fatal */ }

  const bfmBody = {
    OTA_AirLowFareSearchRQ: {
      Version:           '4.3.0',
      POS: {
        Source: [{
          PseudoCityCode: SABRE_PCC,
          RequestorID:    { Type: '1', ID: '1', CompanyName: { Code: 'TN' } },
        }],
      },
      OriginDestinationInformation: [{
        RPH:             '1',
        DepartureDateTime: `${date}T00:00:00`,
        OriginLocation:   { LocationCode: origin.toUpperCase() },
        DestinationLocation: { LocationCode: destination.toUpperCase() },
        TPA_Extensions: {
          CabinPref: { Cabin: cabinClass, PreferLevel: 'Preferred' },
        },
      }],
      TravelPreferences: {
        MaxStopsQuantity: 1,
        CurrencyCode:     currency,
        TPA_Extensions: {
          NumTrips: { Number: maxOffers },
        },
        VendorPref: CARRIER_CODES.map((code) => ({
          Code:         code,
          Type:         'Marketing',
          PreferLevel:  'Preferred',
        })),
      },
      TravelerInfoSummary: {
        SeatsRequested: [adults],
        AirTravelerAvail: [{
          PassengerTypeQuantity: [{ Code: 'ADT', Quantity: adults }],
        }],
      },
      TPA_Extensions: { IntelliSellTransaction: { RequestType: { Name: '200ITINS' } } },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await sabreRequest<any>(
    'POST',
    '/v4.3.0/shop/flights',
    bfmBody,
  );

  const itineraries: unknown[] =
    response?.OTA_AirLowFareSearchRS?.PricedItineraries?.PricedItinerary ?? [];

  const offers = itineraries
    .map((it) => normaliseItinerary(it, currency))
    .filter((o): o is FlightOffer => o !== null)
    .sort((a, b) => a.price - b.price)
    .slice(0, maxOffers);

  try {
    // Strip _raw before caching to save Redis memory
    const cacheable = offers.map(({ _raw: _, ...o }) => o);
    await getRedis().setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(cacheable));
  } catch { /* non-fatal */ }

  return offers;
}

// ─── getFlightPrice ───────────────────────────────────────────────────────────

export async function getFlightPrice(offer: FlightOffer): Promise<FlightOffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await sabreRequest<any>(
    'POST',
    '/v1.8.0/air/price',
    {
      OTA_AirPriceRQ: {
        PricedItineraries: { PricedItinerary: [offer._raw] },
        TPA_Extensions:    { DemandPricingByShoppingID: { shopping_id: '' } },
      },
    },
  );

  const raw = response?.OTA_AirPriceRS?.PricedItineraries?.PricedItinerary?.[0];
  if (!raw) throw new BatikMyAdapterError('No repriced itinerary returned', 502);
  return normaliseItinerary(raw, offer.currency) ?? offer;
}

// ─── createFlightOrder ────────────────────────────────────────────────────────

function _extractSegments(raw: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const it = raw as any;
  return (
    it?.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.[0]?.FlightSegment ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((seg: any) => ({
    flightNum:   `${seg.MarketingAirline?.['@Code']}${seg.FlightNumber}`,
    origin:      seg.DepartureAirport?.['@LocationCode'] ?? '',
    destination: seg.ArrivalAirport?.['@LocationCode'] ?? '',
    departureAt: seg.DepartureDateTime ?? '',
    rph:         seg['@RPH'] ?? '1',
    classOfService: seg.BookingClassAvails?.BookingClassAvail?.[0]?.['@ResBookDesigCode'] ?? 'Y',
  }));
}

export async function createFlightOrder(
  offer:     FlightOffer,
  travelers: BatikMyTraveler[],
): Promise<BatikMyOrderResult> {
  const segs = _extractSegments(offer._raw);

  const airItinerary = {
    AirItinerary: {
      OriginDestinationOptions: {
        OriginDestinationOption: [{
          FlightSegment: segs.map((s: ReturnType<typeof _extractSegments>[number]) => ({
            DepartureDateTime:   s.departureAt,
            FlightNumber:        s.flightNum.replace(/^[A-Z]+/, ''),
            Status:              'NN',
            ResBookDesigCode:    s.classOfService,
            DepartureAirport:    { LocationCode: s.origin },
            ArrivalAirport:      { LocationCode: s.destination },
            MarketingAirline:    { Code: OD_OPERATED, FlightNumber: s.flightNum.replace(/^[A-Z]+/, '') },
          })),
        }],
      },
    },
  };

  const travelerInfo = {
    CustomerInfos: {
      CustomerInfo: travelers.map((t, i) => ({
        PassengerType:  { Code: 'ADT' },
        PersonName: {
          NameNumber:  `${i + 1}.1`,
          GivenName:   t.firstName.toUpperCase(),
          Surname:     t.lastName.toUpperCase(),
        },
        Email: [{ Address: t.email, Type: 'TO' }],
        Phone: [{ PhoneNumber: t.phone, PhoneUseType: 'H' }],
        Document: [{
          DocType:       'Passport',
          DocID:         t.passportNumber,
          ExpireDate:    t.passportExpiry,
          DocNation:     t.nationality,
          BirthDate:     t.dateOfBirth,
          Gender:        t.gender === 'M' ? 'M' : 'F',
        }],
      })),
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await sabreRequest<any>(
    'POST',
    '/v2.4.0/passenger/records',
    {
      CreatePassengerNameRecordRQ: {
        version:          '2.4.0',
        targetCity:       SABRE_PCC,
        ...airItinerary,
        ...travelerInfo,
        PostProcessing: {
          EndTransactionRQ: {
            Source: { ReceivedFrom: `UTUBOOKING-OD` },
          },
        },
      },
    },
  );

  const pnr      = response?.CreatePassengerNameRecordRS?.ItineraryRef?.ID ?? '';
  const fareInfo = response?.CreatePassengerNameRecordRS?.AirPrice?.[0]?.PriceQuote
                     ?.MiscInformation?.SignatureLine?.total ?? 0;

  return {
    pnr,
    status:    pnr ? 'CONFIRMED' : 'ON_HOLD',
    totalFare: typeof fareInfo === 'number' ? fareInfo : offer.price,
    currency:  offer.currency,
    segments:  segs.map((s: ReturnType<typeof _extractSegments>[number]) => ({
      flightNum:   s.flightNum,
      origin:      s.origin,
      destination: s.destination,
      departureAt: s.departureAt,
    })),
  };
}

// ─── Reference data ───────────────────────────────────────────────────────────

export const BATIK_MY_KEY_ROUTES: ReadonlyArray<{
  origin: string; destination: string; label: string;
}> = [
  { origin: 'KUL', destination: 'JED', label: 'Kuala Lumpur → Jeddah (Batik Air Malaysia, Umrah/Hajj)' },
  { origin: 'KUL', destination: 'MED', label: 'Kuala Lumpur → Madinah (Batik Air Malaysia)' },
  { origin: 'KUL', destination: 'RUH', label: 'Kuala Lumpur → Riyadh (Batik Air Malaysia)' },
  { origin: 'PEN', destination: 'KUL', label: 'Penang → Kuala Lumpur (feed route)' },
  { origin: 'JHB', destination: 'KUL', label: 'Johor Bahru → Kuala Lumpur (feed route)' },
  { origin: 'BKI', destination: 'KUL', label: 'Kota Kinabalu → Kuala Lumpur (Sabah feed)' },
];
