/**
 * Pegasus Airlines (PC) Flight Adapter — Sabre GDS
 *
 * Uses Sabre Bargain Finder Max (BFM) REST API with carrier preference
 * filtering for PC (Pegasus) and TK codeshare flights.
 *
 * Key Umrah / Turkey-launch routes:
 *  SAW (Istanbul Sabiha Gökçen) ↔ JED (King Abdulaziz International)
 *  IST (Istanbul Atatürk)       ↔ RUH (King Khalid International)
 *
 * Interface mirrors sabre.js so the flight-service controller can treat
 * both adapters interchangeably:
 *   searchFlights(params)            → FlightOffer[]
 *   getFlightPrice(offer)            → FlightOffer
 *   createFlightOrder(offer, trav)   → order object
 *
 * Env:  SABRE_CLIENT_ID, SABRE_CLIENT_SECRET, SABRE_TOKEN_URL,
 *       SABRE_BASE_URL, SABRE_PCC, REDIS_URL
 *
 * Redis cache key: flight:pegasus:search:{sha256(params)}  TTL: 180 s
 */

import axios  from 'axios';
import crypto from 'crypto';
import Redis  from 'ioredis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlightOffer {
  id:              string;
  flightNum:       string;
  airlineCode:     string;          // 'PC' | 'TK'
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
  source:          'sabre-pegasus';
  raw:             unknown;
}

export interface PegasusSearchParams {
  origin:       string;            // IATA — e.g. 'SAW' | 'IST'
  destination:  string;            // IATA — e.g. 'JED' | 'RUH'
  date:         string;            // 'YYYY-MM-DD'
  adults:       number;
  cabinClass?:  string;            // ECONOMY | BUSINESS | FIRST  (default: ECONOMY)
  currency?:    string;            // ISO 4217  (default: TRY)
  maxOffers?:   number;            // default 20
}

export interface PegasusTraveler {
  firstName:        string;
  lastName:         string;
  dateOfBirth:      string;        // 'YYYY-MM-DD'
  gender:           'M' | 'F';
  email:            string;
  phone:            string;        // digits only, no country code
  phoneCountryCode: string;        // e.g. '90' for Turkey
  documentType:     string;        // 'PP' = passport
  documentNumber:   string;
  documentExpiry:   string;        // 'YYYY-MM-DD'
  nationality:      string;        // ISO 3166-1 alpha-2, e.g. 'TR'
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL  = process.env.SABRE_BASE_URL  ?? 'https://api.sabre.com';
const TOKEN_URL = process.env.SABRE_TOKEN_URL ?? 'https://api.sabre.com/v2/auth/token';
const SABRE_PCC = process.env.SABRE_PCC       ?? '';
const CACHE_TTL = 180;  // seconds

/**
 * Pegasus (PC) is the primary carrier; TK codeshares are surfaced so
 * passengers can choose between the two carriers on overlapping routes.
 */
const CARRIER_CODES: readonly string[] = ['TK', 'PC'];

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err: Error) => console.warn('[pegasus-cache] Redis error:', err.message));

async function _cacheGet(key: string): Promise<FlightOffer[] | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as FlightOffer[]) : null;
  } catch { return null; }
}

async function _cacheSet(key: string, data: FlightOffer[]): Promise<void> {
  try { await redis.setex(key, CACHE_TTL, JSON.stringify(data)); } catch { /* non-fatal */ }
}

function _cacheKey(params: PegasusSearchParams): string {
  const sorted = Object.fromEntries(
    Object.keys(params).sort().map((k) => [k, (params as Record<string, unknown>)[k]])
  );
  const hash = crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return `flight:pegasus:search:${hash}`;
}

// ─── OAuth2 token (in-process, 85% of 7-day Sabre TTL) ───────────────────────

let _tokenCache = { token: '', expiresAt: 0 };

async function _getAccessToken(): Promise<string> {
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

  const ttlMs = ((res.data.expires_in as number) ?? 604800) * 1000 * 0.85;
  _tokenCache = {
    token:     res.data.access_token as string,
    expiresAt: Date.now() + ttlMs,
  };
  return _tokenCache.token;
}

async function _headers(): Promise<Record<string, string>> {
  const token = await _getAccessToken();
  return {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

// ─── DTO mapping ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _toFlightOffer(raw: Record<string, any>, currency = 'TRY'): FlightOffer {
  const itin     = raw.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.[0];
  const segments = (itin?.FlightSegment ?? []) as Record<string, unknown>[];
  const firstSeg = (segments[0] ?? {}) as Record<string, any>;
  const lastSeg  = (segments[segments.length - 1] ?? firstSeg) as Record<string, any>;

  const pricing  = (raw.AirItineraryPricingInfo?.[0] ?? {}) as Record<string, any>;
  const totalAmt = parseFloat(pricing.ItinTotalFare?.TotalFare?.Amount ?? 0);
  const fareAmt  = parseFloat(pricing.ItinTotalFare?.BaseFare?.Amount  ?? totalAmt);

  // Duration: sum segment elapsed times (minutes)
  const durationMinutes = segments.reduce((acc: number, s: any) => {
    return acc + (parseInt(s['@ElapsedTime'] ?? s.ElapsedTime ?? 0, 10) || 0);
  }, 0);

  const cabinMap: Record<string, string> = {
    Y: 'economy', C: 'business', F: 'first', W: 'premium economy',
  };
  const cabinCode  = firstSeg.ResBookDesigCode ?? 'Y';
  const cabinClass = cabinMap[cabinCode as string] ?? 'economy';

  const passFare        = pricing.PTC_FareBreakdowns?.PTC_FareBreakdown?.[0];
  const baggageIncluded =
    (passFare?.FareInfos?.FareInfo?.[0]?.TPA_Extensions?.BaggageAllowance?.NumberOfPieces ?? 0) > 0;

  const id = String(raw['@SequenceNumber'] ?? crypto.randomUUID());

  return {
    id,
    flightNum:       `${firstSeg.MarketingAirline?.['@Code'] ?? ''}${firstSeg['@FlightNumber'] ?? ''}`,
    airlineCode:     (firstSeg.MarketingAirline?.['@Code'] ?? firstSeg.OperatingAirline?.['@Code'] ?? '') as string,
    originIata:      firstSeg.DepartureAirport?.['@LocationCode'] ?? '',
    destinationIata: lastSeg.ArrivalAirport?.['@LocationCode'] ?? '',
    departureAt:     `${firstSeg['@DepartureDateTime'] ?? ''}`,
    arrivalAt:       `${lastSeg['@ArrivalDateTime'] ?? ''}`,
    cabinClass,
    price:           totalAmt || fareAmt,
    currency,
    durationMinutes,
    stops:           Math.max(0, segments.length - 1),
    isRefundable:    false,  // Sabre BFM doesn't expose refundability in standard response
    baggageIncluded,
    source:          'sabre-pegasus',
    raw,
  };
}

// ─── searchFlights ────────────────────────────────────────────────────────────

/**
 * Search Pegasus Airlines flights via Sabre BFM with PC + TK carrier filter.
 * Results are cached in Redis for 3 minutes.
 *
 * Supported Umrah routes:
 *  SAW ↔ JED  (Sabiha Gökçen ↔ Jeddah — primary budget Umrah route)
 *  IST ↔ RUH  (Istanbul Atatürk ↔ Riyadh)
 *
 * @throws {PegasusAdapterError} on upstream API failure
 */
export async function searchFlights(params: PegasusSearchParams): Promise<FlightOffer[]> {
  const {
    origin, destination, date, adults,
    cabinClass = 'ECONOMY',
    currency   = 'TRY',
    maxOffers  = 20,
  } = params;

  const key    = _cacheKey(params);
  const cached = await _cacheGet(key);
  if (cached) return cached;

  const body = {
    OTA_AirLowFareSearchRQ: {
      Version: '4.3.0',
      POS: {
        Source: [{
          PseudoCityCode: SABRE_PCC,
          RequestorID: { Type: '1', ID: '1', CompanyName: { Code: 'TN' } },
        }],
      },
      OriginDestinationInformation: [{
        RPH: '1',
        DepartureDateTime:   `${date}T00:00:00`,
        OriginLocation:      { LocationCode: origin },
        DestinationLocation: { LocationCode: destination },
      }],
      TravelPreferences: {
        // Prefer PC (Pegasus) and TK (codeshare) carriers
        VendorPref: CARRIER_CODES.map((code) => ({
          Code:        code,
          Type:        'Marketing',
          PreferLevel: 'Preferred',
        })),
        CabinPref:        [{ Cabin: cabinClass[0], PreferLevel: 'Preferred' }],
        MaxStopsQuantity: 2,
      },
      TravelerInfoSummary: {
        SeatsRequested:   [adults],
        AirTravelerAvail: [{
          PassengerTypeQuantity: [{ Code: 'ADT', Quantity: adults }],
        }],
        PriceRequestInformation: { CurrencyCode: currency },
      },
      TPA_Extensions: {
        IntelliSellTransaction: {
          RequestType: { Name: '200ITINS' },
        },
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any;
  try {
    res = await axios.post(
      `${BASE_URL}/v4.3.0/shop/flights?mode=live&limit=${maxOffers}`,
      body,
      { headers: await _headers(), timeout: 20000 }
    );
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number } };
    throw new PegasusAdapterError(
      e.response?.data?.message ?? (err as Error).message,
      e.response?.status ?? 502,
      e.response?.data
    );
  }

  const itineraries: Record<string, any>[] =
    res.data?.OTA_AirLowFareSearchRS?.PricedItineraries?.PricedItinerary ?? [];

  // Post-filter: keep only itineraries whose every segment is operated/marketed by PC or TK
  const filtered = itineraries.filter((it) => {
    const segs: any[] =
      it.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.[0]?.FlightSegment ?? [];
    return segs.every((seg) =>
      CARRIER_CODES.includes(
        (seg.MarketingAirline?.['@Code'] ?? seg.OperatingAirline?.['@Code']) as string
      )
    );
  });

  const offers = filtered.map((it) => _toFlightOffer(it, currency));
  await _cacheSet(key, offers);
  return offers;
}

// ─── getFlightPrice ───────────────────────────────────────────────────────────

/**
 * Re-price a single Pegasus itinerary using the Sabre Air Price API.
 * Pass the FlightOffer.raw (PricedItinerary) from searchFlights.
 */
export async function getFlightPrice(offer: FlightOffer): Promise<FlightOffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any;
  try {
    res = await axios.post(
      `${BASE_URL}/v1.8.0/air/price`,
      {
        OTA_AirPriceRQ: {
          PricedItineraries: {
            PricedItinerary: [offer.raw],
          },
        },
      },
      { headers: await _headers(), timeout: 15000 }
    );
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number } };
    throw new PegasusAdapterError(
      e.response?.data?.message ?? (err as Error).message,
      e.response?.status ?? 502,
      e.response?.data
    );
  }

  const repriced = res.data?.OTA_AirPriceRS?.PricedItineraries?.PricedItinerary?.[0];
  if (!repriced) {
    throw new PegasusAdapterError('Empty pricing response from Sabre', 502);
  }

  const currency: string =
    res.data?.OTA_AirPriceRS?.PricedItineraries
      ?.PricedItinerary?.[0]?.AirItineraryPricingInfo?.[0]
      ?.ItinTotalFare?.TotalFare?.CurrencyCode ?? 'TRY';

  return _toFlightOffer(repriced as Record<string, any>, currency);
}

// ─── createFlightOrder ────────────────────────────────────────────────────────

/**
 * Book a Pegasus flight via Sabre CreatePassengerNameRecord API.
 *
 * @param offer    — repriced FlightOffer from getFlightPrice()
 * @param traveler — passenger(s); phoneCountryCode defaults to '90' (Turkey)
 */
export async function createFlightOrder(
  offer:    FlightOffer,
  traveler: PegasusTraveler | PegasusTraveler[]
): Promise<{
  orderId:      string | null;
  pnr:          string | null;
  status:       string;
  flightOffers: FlightOffer[];
  travelers:    PegasusTraveler[];
  raw:          unknown;
}> {
  const travelers = Array.isArray(traveler) ? traveler : [traveler];
  const t         = travelers[0];

  const body = {
    CreatePassengerNameRecordRQ: {
      version: '2.4.0',
      TravelItineraryAddInfo: {
        CustomerInfo: {
          ContactNumbers: {
            ContactNumber: [{
              Phone:        t.phone,
              PhoneUseType: 'H',
              CountryCode:  t.phoneCountryCode ?? '90',    // Turkey default
            }],
          },
          Email:      [{ Address: t.email, NameNumber: '1.1' }],
          PersonName: [{
            NameNumber: '1.1',
            GivenName:  t.firstName,
            Surname:    t.lastName,
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
            Remark: [{ Type: 'General', Text: 'UTUBooking Pegasus reservation' }],
          },
        },
        AirSeat: { Seats: { Seat: [] } },
      },
      PostProcessing: {
        RedisplayReservation: { waitInterval: 100 },
        EndTransaction: {
          Source: { ReceivedFrom: 'UTUBooking' },
        },
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any;
  try {
    res = await axios.post(
      `${BASE_URL}/v2.4.0/passenger/records`,
      body,
      { headers: await _headers(), timeout: 30000 }
    );
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string }; status?: number } };
    throw new PegasusAdapterError(
      e.response?.data?.message ?? (err as Error).message,
      e.response?.status ?? 502,
      e.response?.data
    );
  }

  const record = res.data?.CreatePassengerNameRecordRS;
  const pnr    = (record?.ItineraryRef?.ID ?? null) as string | null;

  return {
    orderId:      pnr,
    pnr,
    status:       pnr ? 'confirmed' : 'pending',
    flightOffers: [offer],
    travelers,
    raw:          record ?? res.data,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extracts FlightSegment booking nodes from a raw Sabre PricedItinerary */
function _extractSegments(offer: FlightOffer): unknown[] {
  const raw = offer.raw as Record<string, any>;
  return (
    raw.AirItinerary?.OriginDestinationOptions
      ?.OriginDestinationOption?.[0]?.FlightSegment ?? []
  ).map((seg: any) => ({
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

// ─── Error type ───────────────────────────────────────────────────────────────

export class PegasusAdapterError extends Error {
  statusCode: number;
  raw:        unknown;

  constructor(message: string, statusCode = 502, raw: unknown = null) {
    super(message);
    this.name       = 'PegasusAdapterError';
    this.statusCode = statusCode;
    this.raw        = raw;
  }
}
