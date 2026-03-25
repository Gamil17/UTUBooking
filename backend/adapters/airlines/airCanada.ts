/**
 * Air Canada (AC) Flight Adapter — Amadeus GDS
 *
 * Wraps the base Amadeus SDK with AC-specific filtering:
 *  - Restricts search to carrier code AC via `includedAirlineCodes`
 *  - Injects Aeroplan frequent-flyer number into flight orders
 *  - Estimates Aeroplan points accrual on returned offers
 *
 * Key Hajj / Umrah routes:
 *  YYZ (Toronto Pearson)   ↔ JED (King Abdulaziz International)
 *  YUL (Montreal Trudeau)  ↔ JED
 *  Note: Air Canada partners with Emirates for JED connections via DXB
 *
 * SDK:  amadeus (existing — no new npm package)
 * Env:  AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET, AMADEUS_HOSTNAME
 *       REDIS_URL
 *
 * Redis cache key: flight:ac:search:{sha256(params)}  TTL: 180 s
 */

import Amadeus from 'amadeus';
import crypto  from 'crypto';
import Redis   from 'ioredis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlightOffer {
  id:              string;
  flightNum:       string;
  airlineCode:     'AC';
  originIata:      string;
  destinationIata: string;
  departureAt:     string;
  arrivalAt:       string;
  cabinClass:      string;
  price:           number;
  currency:        string;
  durationMinutes: number;
  stops:           number;
  isRefundable:    boolean;
  baggageIncluded: boolean;
  /** Estimated Aeroplan points earned (economy: ~1.25 pts/CAD, business: ~2.5 pts/CAD) */
  aeroplanPoints:  number;
  source:          'amadeus-ac';
  raw:             unknown;
}

export interface ACSearchParams {
  origin:       string;          // IATA code — e.g. 'YYZ' | 'YUL'
  destination:  string;          // IATA code — e.g. 'JED'
  date:         string;          // 'YYYY-MM-DD'
  adults:       number;
  cabinClass?:  string;          // ECONOMY | BUSINESS | FIRST  (default: ECONOMY)
  currency?:    string;          // ISO 4217  (default: CAD)
  maxOffers?:   number;          // 1–250      (default: 20)
}

export interface ACTraveler {
  id:           string;
  dateOfBirth:  string;          // 'YYYY-MM-DD'
  name:         { firstName: string; lastName: string };
  gender:       'MALE' | 'FEMALE';
  contact: {
    emailAddress: string;
    phones: Array<{ deviceType: string; countryCallingCode: string; number: string }>;
  };
  documents: Array<{
    documentType:    string;     // 'PASSPORT'
    number:          string;
    expiryDate:      string;
    issuanceCountry: string;
    nationality:     string;
    holder:          boolean;
  }>;
  /** Air Canada Aeroplan frequent-flyer number (optional) */
  aeroplan?: string;
}

// ─── Client setup ─────────────────────────────────────────────────────────────

const amadeus = new Amadeus({
  clientId:     process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  hostname:     (process.env.AMADEUS_HOSTNAME ?? 'test') as 'test' | 'production',
});

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err: Error) => console.warn('[ac-cache] Redis error:', err.message));

const CACHE_TTL  = 180;  // seconds
const AC_CARRIER = 'AC';

// Aeroplan accrual estimates (points per CAD of base fare)
const AEROPLAN_RATE: Record<string, number> = {
  economy:           1.25,
  'premium economy': 1.75,
  business:          2.5,
  first:             3.0,
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function _cacheGet(key: string): Promise<FlightOffer[] | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as FlightOffer[]) : null;
  } catch { return null; }
}

async function _cacheSet(key: string, data: FlightOffer[]): Promise<void> {
  try { await redis.setex(key, CACHE_TTL, JSON.stringify(data)); } catch { /* non-fatal */ }
}

function _cacheKey(params: ACSearchParams): string {
  const sorted = Object.fromEntries(
    Object.keys(params).sort().map((k) => [k, (params as Record<string, unknown>)[k]])
  );
  const hash = crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return `flight:ac:search:${hash}`;
}

// ─── DTO mapping ──────────────────────────────────────────────────────────────

function _parseDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? '0', 10) * 60) + parseInt(match[2] ?? '0', 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _toFlightOffer(raw: Record<string, any>): FlightOffer {
  const itinerary = raw.itineraries?.[0] ?? {};
  const segments  = itinerary.segments ?? [];
  const firstSeg  = segments[0] ?? {};
  const lastSeg   = segments[segments.length - 1] ?? firstSeg;

  const price    = parseFloat(raw.price?.grandTotal ?? raw.price?.total ?? 0);
  const currency = (raw.price?.currency ?? 'CAD') as string;

  const cabinClass = (
    raw.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin ?? 'ECONOMY'
  ).toLowerCase().replace('_', ' ');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baggageIncluded = raw.travelerPricings?.some((tp: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tp.fareDetailsBySegment?.some((fd: any) => (fd.includedCheckedBags?.quantity ?? 0) > 0)
  ) ?? false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isRefundable = raw.travelerPricings?.some((tp: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tp.fareDetailsBySegment?.some((fd: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fd.amenities?.some((a: any) =>
        a.amenityType === 'REFUNDABLE_TICKET' && a.isChargeable === false
      )
    )
  ) ?? false;

  // Estimate Aeroplan points: convert price to CAD (if needed) then apply rate
  const priceCAD    = currency === 'CAD' ? price : price * 1.36;  // approximate USD→CAD
  const rate        = AEROPLAN_RATE[cabinClass] ?? AEROPLAN_RATE.economy;
  const aeroplanPoints = Math.round(priceCAD * rate);

  return {
    id:              raw.id as string,
    flightNum:       `${firstSeg.carrierCode ?? AC_CARRIER}${firstSeg.number ?? ''}`,
    airlineCode:     'AC',
    originIata:      firstSeg.departure?.iataCode ?? '',
    destinationIata: lastSeg.arrival?.iataCode ?? '',
    departureAt:     firstSeg.departure?.at ?? '',
    arrivalAt:       lastSeg.arrival?.at ?? '',
    cabinClass,
    price,
    currency,
    durationMinutes: _parseDuration(itinerary.duration),
    stops:           Math.max(0, segments.length - 1),
    isRefundable,
    baggageIncluded,
    aeroplanPoints,
    source:          'amadeus-ac',
    raw,
  };
}

// ─── searchFlights ────────────────────────────────────────────────────────────

/**
 * Search Air Canada flights via Amadeus Flight Offers Search API.
 * Restricts results to AC operating/marketing carrier only.
 *
 * Supported Hajj / Umrah routes:
 *  YYZ ↔ JED  (Toronto Pearson ↔ Jeddah King Abdulaziz)
 *  YUL ↔ JED  (Montreal Trudeau ↔ Jeddah King Abdulaziz)
 *  Note: codeshare legs via Emirates (EK) may appear for JED connections
 *
 * @throws {AirCanadaAdapterError} on upstream API failure
 */
export async function searchFlights(params: ACSearchParams): Promise<FlightOffer[]> {
  const {
    origin, destination, date, adults,
    cabinClass = 'ECONOMY',
    currency   = 'CAD',
    maxOffers  = 20,
  } = params;

  const key    = _cacheKey(params);
  const cached = await _cacheGet(key);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any;
  try {
    response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode:      origin,
      destinationLocationCode: destination,
      departureDate:           date,
      adults:                  String(adults),
      travelClass:             cabinClass.toUpperCase(),
      currencyCode:            currency,
      max:                     String(maxOffers),
      includedAirlineCodes:    AC_CARRIER,   // ← AC carrier filter
    });
  } catch (err: unknown) {
    const e = err as { response?: { result?: { errors?: Array<{ detail?: string }> }; statusCode?: number } };
    throw new AirCanadaAdapterError(
      e.response?.result?.errors?.[0]?.detail ?? (err as Error).message,
      e.response?.statusCode ?? 502,
      e.response?.result
    );
  }

  const offers = ((response.data ?? []) as Record<string, unknown>[]).map(_toFlightOffer);
  await _cacheSet(key, offers);
  return offers;
}

// ─── getFlightPrice ───────────────────────────────────────────────────────────

/**
 * Re-price a single AC offer (guaranteed fare before booking).
 * Pass the FlightOffer returned by searchFlights.
 */
export async function getFlightPrice(offer: FlightOffer): Promise<FlightOffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any;
  try {
    response = await amadeus.shopping.flightOffers.pricing.post(
      JSON.stringify({
        data: {
          type:         'flight-offers-pricing',
          flightOffers: [offer.raw],
        },
      })
    );
  } catch (err: unknown) {
    const e = err as { response?: { result?: { errors?: Array<{ detail?: string }> }; statusCode?: number } };
    throw new AirCanadaAdapterError(
      e.response?.result?.errors?.[0]?.detail ?? (err as Error).message,
      e.response?.statusCode ?? 502,
      e.response?.result
    );
  }

  const repricedRaw = response.data?.flightOffers?.[0];
  if (!repricedRaw) {
    throw new AirCanadaAdapterError('Empty pricing response from Amadeus', 502);
  }
  return _toFlightOffer(repricedRaw as Record<string, unknown>);
}

// ─── createFlightOrder ────────────────────────────────────────────────────────

/**
 * Book an Air Canada flight via Amadeus Flight Orders API.
 *
 * If `traveler.aeroplan` is provided, it is passed as a loyaltyProgram
 * entry so Aeroplan points accrue to the member's account.
 *
 * @param offer    — repriced FlightOffer from getFlightPrice()
 * @param traveler — passenger(s); include `aeroplan` for loyalty accrual
 */
export async function createFlightOrder(
  offer:    FlightOffer,
  traveler: ACTraveler | ACTraveler[]
): Promise<{
  orderId:      string;
  status:       string;
  pnr:          string | null;
  flightOffers: FlightOffer[];
  travelers:    ACTraveler[];
  raw:          unknown;
}> {
  const travelers = Array.isArray(traveler) ? traveler : [traveler];

  // Build Amadeus traveler payloads; inject Aeroplan as a loyaltyProgram
  const amadeustravelers = travelers.map((t) => ({
    id:          t.id,
    dateOfBirth: t.dateOfBirth,
    name:        t.name,
    gender:      t.gender,
    contact:     t.contact,
    documents:   t.documents,
    // Aeroplan loyalty accrual — only included when number is present
    ...(t.aeroplan
      ? {
          loyaltyPrograms: [{
            programOwner: AC_CARRIER,   // Air Canada IATA code
            id:           t.aeroplan,   // Aeroplan membership number
          }],
        }
      : {}),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any;
  try {
    response = await amadeus.booking.flightOrders.post(
      JSON.stringify({
        data: {
          type:         'flight-order',
          flightOffers: [offer.raw],
          travelers:    amadeustravelers,
        },
      })
    );
  } catch (err: unknown) {
    const e = err as { response?: { result?: { errors?: Array<{ detail?: string }> }; statusCode?: number } };
    throw new AirCanadaAdapterError(
      e.response?.result?.errors?.[0]?.detail ?? (err as Error).message,
      e.response?.statusCode ?? 502,
      e.response?.result
    );
  }

  const order = response.data;
  if (!order) {
    throw new AirCanadaAdapterError('Empty order response from Amadeus', 502);
  }

  return {
    orderId:      order.id as string,
    status:       order.flightOffers?.[0]?.lastTicketingDate ? 'confirmed' : 'pending',
    pnr:          order.associatedRecords?.[0]?.reference ?? null,
    flightOffers: ((order.flightOffers ?? []) as Record<string, unknown>[]).map(_toFlightOffer),
    travelers,
    raw:          order,
  };
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class AirCanadaAdapterError extends Error {
  statusCode: number;
  raw:        unknown;

  constructor(message: string, statusCode = 502, raw: unknown = null) {
    super(message);
    this.name       = 'AirCanadaAdapterError';
    this.statusCode = statusCode;
    this.raw        = raw;
  }
}
