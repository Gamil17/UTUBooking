/**
 * CarTrawler Adapter
 *
 * API:   CarTrawler OTA (Open Travel Alliance) XML API
 * Docs:  https://docs.cartrawler.com/ota/
 * Auth:  POS element — RequestorID Type="16", ID=clientId, MessagePassword=password
 *
 * Env vars:
 *   CARTRAWLER_CLIENT_ID   — issued by CarTrawler
 *   CARTRAWLER_PASSWORD    — API password
 *   CARTRAWLER_BASE_URL    — default: https://ota.cartrawler.com/cartrawlerota/s/xml
 *   CARTRAWLER_RESIDENT_COUNTRY — ISO country code for pricing context (default: SA)
 *
 * Supported coverage: JED, RUH (KSA) · DXB, AUH (UAE) · CAI (Egypt) · AMM (Jordan) · KWI (Kuwait) · BAH (Bahrain) · CMN (Morocco) · TUN (Tunisia)
 *
 * Redis cache key: cartrawler:search:{sha256(params)}  TTL: 600 s (10 min)
 *                  cartrawler:vehicle:{vehicleCode}     TTL: 600 s (10 min)
 *
 * Maps to the canonical CarOffer schema (see services/car/src/models/CarOffer.js).
 */

'use strict';

require('dotenv').config();
const axios  = require('axios');
const crypto = require('crypto');
const Redis  = require('ioredis');
const { parseStringPromise, Builder } = require('xml2js');

const BASE_URL          = process.env.CARTRAWLER_BASE_URL || 'https://ota.cartrawler.com/cartrawlerota/s/xml';
const CLIENT_ID         = process.env.CARTRAWLER_CLIENT_ID;
const PASSWORD          = process.env.CARTRAWLER_PASSWORD;
const RESIDENT_COUNTRY  = process.env.CARTRAWLER_RESIDENT_COUNTRY || 'SA';
const CACHE_TTL         = 600; // 10 minutes

// OTA XML namespace
const OTA_NS = 'http://www.opentravel.org/OTA/2003/05';

// Locations this adapter is configured to serve
const SUPPORTED_LOCATIONS = new Set(['JED', 'RUH', 'DXB', 'AUH', 'CAI', 'AMM', 'KWI', 'BAH', 'CMN', 'TUN']);

// ─── xml2js setup ─────────────────────────────────────────────────────────────

const XML_PARSE_OPTS = {
  explicitArray: false,  // single child → object (not array)
  mergeAttrs:    true,   // XML attributes merged into object without '$' prefix
  explicitRoot:  true,   // keep root tag as the top-level key
};

const xmlBuilder = new Builder({
  xmldec:     { version: '1.0', encoding: 'UTF-8' },
  renderOpts: { pretty: false },
  headless:   false,
});

// Safe array coercion — xml2js may return object or array depending on count
function _arr(val) { return Array.isArray(val) ? val : val != null ? [val] : []; }

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[cartrawler-cache] Redis error:', err.message));

async function _cacheGet(key) {
  try { const r = await redis.get(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
async function _cacheSet(key, data, ttl = CACHE_TTL) {
  try { await redis.setex(key, ttl, JSON.stringify(data)); } catch { /* non-fatal */ }
}
function _cacheKey(namespace, params) {
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
  return `cartrawler:${namespace}:${crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex')}`;
}

// ─── Auth / POS builder ───────────────────────────────────────────────────────

function _pos() {
  return {
    POS: {
      Source: {
        RequestorID: {
          $: { Type: '16', ID: CLIENT_ID, MessagePassword: PASSWORD },
        },
      },
    },
  };
}

function _echoToken() {
  return crypto.randomBytes(8).toString('hex');
}

function _timestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '');
}

// ─── HTTP transport ───────────────────────────────────────────────────────────

/**
 * POST an OTA XML request and return the parsed response object.
 * @param {string} xmlBody — full XML string
 * @param {number} [timeout] — ms (default 20 000)
 * @returns {Promise<object>}
 */
async function _post(xmlBody, timeout = 20000) {
  let res;
  try {
    res = await axios.post(BASE_URL, xmlBody, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        Accept:         'application/xml',
      },
      timeout,
    });
  } catch (err) {
    throw new CartrawlerAdapterError(
      err.response?.data ?? err.message,
      err.response?.status ?? 502,
      err.response?.data
    );
  }

  const parsed = await parseStringPromise(res.data, XML_PARSE_OPTS);

  // OTA errors are signalled by a top-level <Errors> element
  const root = Object.values(parsed)[0];
  const errors = root?.Errors?.Error;
  if (errors) {
    const first = _arr(errors)[0];
    const msg = first?._ ?? first ?? 'CarTrawler API error';
    const code = first?.Code ?? first?.Type ?? 400;
    throw new CartrawlerAdapterError(String(msg), Number(code) || 400, parsed);
  }

  return parsed;
}

// ─── CarOffer DTO ─────────────────────────────────────────────────────────────

/**
 * Maps a raw CarTrawler VehAvail node to the canonical CarOffer shape.
 *
 * @param {object} vehAvail   — VehAvail element (contains VehAvailCore)
 * @param {object} vendor     — Vendor element from VehVendorAvail
 * @param {string} pickupDate — 'YYYY-MM-DD'
 * @param {string} dropoffDate
 * @param {string} currency
 * @returns {object} CarOffer-compatible plain object
 */
function _toCarOffer(vehAvail, vendor, pickupDate, dropoffDate, currency) {
  const core     = vehAvail.VehAvailCore ?? vehAvail;
  const vehicle  = core.Vehicle  ?? core.VehicleInfo ?? {};
  const charge   = core.TotalCharge ?? {};
  const rental   = core.RentalRate  ?? {};

  // ACRISS code: [0]=category [1]=type [2]=transmission [3]=fuel/AC
  const acriss       = (vehicle.AcrissCode ?? vehicle.VehicleCode ?? '    ').toUpperCase().padEnd(4);
  const vehicleType  = _mapVehicleCategory(acriss[0]);
  const transmission = 'MNABD'.includes(acriss[2]) ? 'automatic' : 'manual';
  const aircon       = acriss[3] !== 'N';

  const totalPrice  = parseFloat(charge.EstimatedTotalAmount ?? charge.RateTotalAmount ?? 0);
  const chargeCcy   = charge.CurrencyCode ?? currency;
  const days        = _daysBetween(pickupDate, dropoffDate);
  const pricePerDay = days > 0 ? +(totalPrice / days).toFixed(2) : totalPrice;

  // Check mileage from VehicleCharges or RateQualifier
  const charges       = _arr(rental.VehicleCharges?.VehicleCharge);
  const mileageCharge = charges.find((c) => (c.Description ?? '').toLowerCase().includes('mile'));
  const unlimitedMileage = (mileageCharge?.Description ?? rental.RateQualifier?.RatePlanName ?? '')
    .toLowerCase().includes('unlimited');

  // Pick-up / drop-off codes
  const pickupCode  = core.PickUpLocation?.LocationCode  ?? core.PickUpLocation  ?? '';
  const dropoffCode = core.ReturnLocation?.LocationCode  ?? core.ReturnLocation  ?? pickupCode;

  // Vendor
  const vendorCode = vendor?.Code  ?? '';
  const vendorName = vendor?.CompanyName ?? vendor?.Name ?? vendorCode;

  // Unique ID: vendorCode + ACRISS + pickupDate
  const id = `ct:${vendorCode}:${acriss}:${pickupDate}`.toLowerCase();

  return {
    id,
    vendorCode,
    vendorName,
    vehicleType,
    transmission,
    seats:            parseInt(vehicle.PassengerQuantity ?? 5, 10),
    pickupLocation:   pickupCode,
    dropoffLocation:  dropoffCode,
    pickupDate,
    dropoffDate,
    days,
    pricePerDay,
    totalPrice,
    currency:         chargeCcy,
    airconIncluded:   aircon,
    unlimitedMileage,
    source:           'cartrawler',
    raw:              { vehAvail, vendor },
  };
}

function _mapVehicleCategory(code) {
  const map = {
    M: 'compact', E: 'compact', C: 'compact',
    D: 'sedan',   I: 'sedan',   F: 'sedan', G: 'sedan', X: 'sedan',
    J: 'suv',     S: 'suv',     R: 'suv',   U: 'suv',
    P: 'van',     W: 'van',
    L: 'luxury',
  };
  return map[code] ?? 'sedan';
}

function _daysBetween(from, to) {
  return Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
}

/** Normalise 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss' → 'YYYY-MM-DDTHH:mm:ss' */
function _dt(dateStr, time = '10:00:00') {
  return dateStr.includes('T') ? dateStr : `${dateStr}T${time}`;
}

// ─── searchCars ───────────────────────────────────────────────────────────────

/**
 * Search available cars from CarTrawler.
 *
 * @param {string} pickup      — IATA airport code (JED | RUH | DXB | AUH | CAI)
 * @param {string} dropoff     — IATA code; defaults to pickup (same-station return)
 * @param {string} pickupDate  — 'YYYY-MM-DD'
 * @param {string} returnDate  — 'YYYY-MM-DD'
 * @param {number} [driverAge] — default 30
 * @param {object} [opts]
 * @param {string} [opts.currency]      — default 'SAR'
 * @param {string} [opts.vehicleType]   — optional client-side filter (sedan|suv|van|compact|luxury)
 * @param {number} [opts.maxOffers]     — default 20
 *
 * @returns {Promise<object[]>}  Array of CarOffer-compatible objects
 * @throws  {CartrawlerAdapterError}
 */
async function searchCars(pickup, dropoff, pickupDate, returnDate, driverAge = 30, opts = {}) {
  const {
    currency    = 'SAR',
    vehicleType = null,
    maxOffers   = 20,
  } = opts;

  const dropoffCode = dropoff ?? pickup;

  if (!SUPPORTED_LOCATIONS.has(pickup)) {
    throw new CartrawlerAdapterError(`Unsupported pickup location: ${pickup}`, 400);
  }

  const cacheParams = { pickup, dropoff: dropoffCode, pickupDate, returnDate, driverAge, currency };
  const key = _cacheKey('search', cacheParams);

  const cached = await _cacheGet(key);
  if (cached) return cached;

  // ── Build OTA_VehAvailRateRQ ──────────────────────────────────────────────
  const reqObj = {
    OTA_VehAvailRateRQ: {
      $: {
        xmlns:      OTA_NS,
        EchoToken:  _echoToken(),
        TimeStamp:  _timestamp(),
        Version:    '1.008',
      },
      ..._pos(),
      VehAvailRQCore: {
        $: { Status: 'Available' },
        VehRentalCore: {
          $: {
            PickUpDateTime: _dt(pickupDate, '10:00:00'),
            ReturnDateTime: _dt(returnDate, '10:00:00'),
          },
          PickUpLocation: { $: { CodeContext: 'IATA', LocationCode: pickup } },
          ReturnLocation: { $: { CodeContext: 'IATA', LocationCode: dropoffCode } },
        },
        DriverType: { $: { Age: String(driverAge) } },
      },
      VehAvailRQInfo: {
        Customer: {
          Primary: {
            CitizenCountryName: { $: { Code: RESIDENT_COUNTRY } },
          },
        },
        TPA_Extensions: {
          MaxResponses: { $: { Value: String(maxOffers) } },
          Currency:     { $: { Code: currency } },
        },
      },
    },
  };

  const parsed = await _post(xmlBuilder.buildObject(reqObj));

  // ── Parse OTA_VehAvailRateRS ──────────────────────────────────────────────
  const rs       = parsed.OTA_VehAvailRateRS;
  const vendorAvails = _arr(rs?.VehAvailRSCore?.VehVendorAvails?.VehVendorAvail);

  const offers = [];

  for (const vendorAvail of vendorAvails) {
    const vendor   = vendorAvail.Vendor ?? {};
    const vehItems = _arr(vendorAvail.VehAvails?.VehAvail);

    for (const vehAvail of vehItems) {
      offers.push(_toCarOffer(vehAvail, vendor, pickupDate, returnDate, currency));
    }
  }

  // Optional client-side filter
  const filtered = vehicleType
    ? offers.filter((o) => o.vehicleType === vehicleType.toLowerCase())
    : offers;

  const result = filtered.slice(0, maxOffers);
  await _cacheSet(key, result);
  return result;
}

// ─── getCarDetails ────────────────────────────────────────────────────────────

/**
 * Retrieve rate rules and full details for a specific vehicle code.
 *
 * @param {string} vehicleCode  — ACRISS code, e.g. 'ECAR'
 * @param {object} [context]    — optional pickup/dropoff/dates from a prior search
 * @returns {Promise<object>}   Extended CarOffer with additional details
 * @throws  {CartrawlerAdapterError}
 */
async function getCarDetails(vehicleCode, context = {}) {
  const key = _cacheKey('vehicle', { vehicleCode, ...context });
  const cached = await _cacheGet(key);
  if (cached) return cached;

  const {
    pickup     = '',
    dropoff    = '',
    pickupDate = '',
    returnDate = '',
    driverAge  = 30,
    currency   = 'SAR',
  } = context;

  // ── Build OTA_VehRateRuleRQ ───────────────────────────────────────────────
  const reqObj = {
    OTA_VehRateRuleRQ: {
      $: {
        xmlns:     OTA_NS,
        EchoToken: _echoToken(),
        TimeStamp: _timestamp(),
        Version:   '1.003',
      },
      ..._pos(),
      RentalInfo: {
        ...(pickupDate && {
          VehRentalCore: {
            $: {
              PickUpDateTime: _dt(pickupDate, '10:00:00'),
              ReturnDateTime: _dt(returnDate || pickupDate, '10:00:00'),
            },
            ...(pickup  && { PickUpLocation: { $: { CodeContext: 'IATA', LocationCode: pickup } } }),
            ...(dropoff && { ReturnLocation: { $: { CodeContext: 'IATA', LocationCode: dropoff } } }),
          },
        }),
        VehicleInfo: { $: { AcrissCode: vehicleCode } },
        ...(driverAge && { DriverType: { $: { Age: String(driverAge) } } }),
        TPA_Extensions: {
          Currency: { $: { Code: currency } },
        },
      },
    },
  };

  const parsed = await _post(xmlBuilder.buildObject(reqObj));

  // ── Parse OTA_VehRateRuleRS ───────────────────────────────────────────────
  const rs      = parsed.OTA_VehRateRuleRS;
  const segment = rs?.VehRentalCore ?? rs?.RentalInfo ?? {};
  const vehicle = segment.VehicleInfo ?? segment.Vehicle ?? {};
  const rate    = _arr(segment.RentalRateDetails?.RentalRate ?? segment.RentalRate)[0] ?? {};
  const total   = rate.TotalCharge ?? segment.TotalCharge ?? {};

  const acriss       = (vehicle.AcrissCode ?? vehicleCode ?? '    ').toUpperCase().padEnd(4);
  const transmission = 'MNABD'.includes(acriss[2]) ? 'automatic' : 'manual';
  const aircon       = acriss[3] !== 'N';

  const totalPrice  = parseFloat(total.EstimatedTotalAmount ?? total.RateTotalAmount ?? 0);
  const days        = pickupDate && returnDate ? _daysBetween(pickupDate, returnDate) : 1;
  const pricePerDay = days > 0 ? +(totalPrice / days).toFixed(2) : totalPrice;

  const details = {
    id:               `ct:details:${vehicleCode.toLowerCase()}`,
    vehicleCode:      acriss,
    vehicleType:      _mapVehicleCategory(acriss[0]),
    transmission,
    seats:            parseInt(vehicle.PassengerQuantity ?? 5, 10),
    doors:            parseInt(vehicle.DoorCount ?? 4, 10),
    baggageQuantity:  parseInt(vehicle.BaggageQuantity ?? 2, 10),
    airconIncluded:   aircon,
    fuelType:         vehicle.FuelType ?? '',
    unlimitedMileage: (rate.RateQualifier?.RatePlanName ?? '').toLowerCase().includes('unlimited'),
    pickupDate:       pickupDate || null,
    dropoffDate:      returnDate || null,
    days,
    pricePerDay,
    totalPrice,
    currency,
    source:           'cartrawler',
    rateRules:        _extractRateRules(rs),
    raw:              parsed,
  };

  await _cacheSet(key, details);
  return details;
}

function _extractRateRules(rs) {
  const rules = [];
  const items = _arr(rs?.VehRentalCore?.RentalRateDetails?.PaymentRules?.PaymentRule
                  ?? rs?.PaymentRules?.PaymentRule);
  for (const rule of items) {
    rules.push({
      type:        rule.RuleType  ?? rule.Type  ?? '',
      description: rule._ ?? rule.Description ?? '',
      penalty:     parseFloat(rule.Percent ?? rule.Amount ?? 0),
    });
  }
  return rules;
}

// ─── createCarReservation ─────────────────────────────────────────────────────

/**
 * Create a car reservation with CarTrawler.
 *
 * @param {object} vehicle — CarOffer (from searchCars or getCarDetails)
 * @param {object} driver
 * @param {string} driver.firstName
 * @param {string} driver.lastName
 * @param {string} driver.email
 * @param {string} driver.phone        — E.164 format, e.g. '+966501234567'
 * @param {string} [driver.countryCode] — ISO 2-letter, e.g. 'SA'
 * @param {object} payment
 * @param {string} payment.cardType    — '1'=Visa '2'=Mastercard '3'=Amex (OTA code)
 * @param {string} payment.cardNumber  — PAN (16-digit string)
 * @param {string} payment.expireDate  — 'MMYY' e.g. '1227'
 * @param {string} payment.seriesCode  — CVV/CVC
 * @param {string} payment.holderName
 *
 * @returns {Promise<object>} Reservation confirmation
 * @throws  {CartrawlerAdapterError}
 */
async function createCarReservation(vehicle, driver, payment) {
  const {
    pickupLocation, dropoffLocation, pickupDate, dropoffDate,
    vendorCode, raw,
  } = vehicle;

  // Prefer the ACRISS code from raw, fall back to vehicleCode field
  const acrissCode = raw?.vehAvail?.VehAvailCore?.Vehicle?.AcrissCode
                  ?? raw?.vehAvail?.VehAvailCore?.Vehicle?.VehicleCode
                  ?? vehicle.vehicleCode
                  ?? '';

  // ── Build OTA_VehResRQ ────────────────────────────────────────────────────
  const reqObj = {
    OTA_VehResRQ: {
      $: {
        xmlns:     OTA_NS,
        EchoToken: _echoToken(),
        TimeStamp: _timestamp(),
        Version:   '1.008',
      },
      ..._pos(),
      VehResRQCore: {
        VehRentalCore: {
          $: {
            PickUpDateTime: _dt(pickupDate, '10:00:00'),
            ReturnDateTime: _dt(dropoffDate, '10:00:00'),
          },
          PickUpLocation: { $: { CodeContext: 'IATA', LocationCode: pickupLocation } },
          ReturnLocation: { $: { CodeContext: 'IATA', LocationCode: dropoffLocation } },
        },
        Customer: {
          Primary: {
            PersonName: {
              GivenName:  driver.firstName,
              Surname:    driver.lastName,
            },
            Email: driver.email,
            Telephone: { $: { PhoneNumber: driver.phone, PhoneTechType: '1' } },
            ...(driver.countryCode && {
              CitizenCountryName: { $: { Code: driver.countryCode } },
            }),
          },
        },
        ...(vendorCode && { VendorPref: { $: { Code: vendorCode } } }),
        VehicleRef: { $: { AcrissCode: acrissCode } },
      },
      VehResRQInfo: {
        PaymentPref: {
          Guarantee: {
            PaymentCard: {
              $: {
                CardType:   payment.cardType,
                CardNumber: payment.cardNumber,
                ExpireDate: payment.expireDate,
                SeriesCode: payment.seriesCode,
              },
              CardHolderName: payment.holderName,
            },
          },
        },
      },
    },
  };

  const parsed = await _post(xmlBuilder.buildObject(reqObj), 30000);

  // ── Parse OTA_VehResRS ────────────────────────────────────────────────────
  const rs      = parsed.OTA_VehResRS;
  const segment = rs?.VehResSegment ?? rs?.VehResSegments?.VehResSegment;
  const segCore = segment?.VehSegmentCore ?? segment ?? {};

  // Confirmation IDs — OTA spec uses an array of ConfID elements
  const confIds  = _arr(segCore.ConfID ?? segCore.UniqueID);
  const bookingRef = confIds.find((c) => c.Type === '14' || c.Type === '1')?.ID
                  ?? confIds[0]?.ID
                  ?? confIds[0]?._ ?? '';

  // Confirmed vehicle details
  const confirmedVehicle  = segCore.Vehicle ?? segCore.VehicleInfo ?? {};
  const confirmedCharge   = segCore.TotalCharge ?? {};
  const confirmedAcriss   = (confirmedVehicle.AcrissCode ?? acrissCode ?? '    ').toUpperCase().padEnd(4);

  const confirmedTotal = parseFloat(
    confirmedCharge.EstimatedTotalAmount ?? confirmedCharge.RateTotalAmount ?? vehicle.totalPrice ?? 0
  );

  const reservation = {
    confirmationNumber: bookingRef,
    status:             bookingRef ? 'confirmed' : 'pending',
    vehicle: {
      ...vehicle,
      // Refresh price/details from confirmed response if available
      totalPrice: confirmedTotal || vehicle.totalPrice,
      vehicleType: _mapVehicleCategory(confirmedAcriss[0]) || vehicle.vehicleType,
      transmission: 'MNABD'.includes(confirmedAcriss[2]) ? 'automatic' : 'manual',
    },
    driver: {
      firstName:   driver.firstName,
      lastName:    driver.lastName,
      email:       driver.email,
      phone:       driver.phone,
    },
    currency:     confirmedCharge.CurrencyCode ?? vehicle.currency,
    totalPrice:   confirmedTotal || vehicle.totalPrice,
    bookedAt:     new Date().toISOString(),
    source:       'cartrawler',
    raw:          parsed,
  };

  return reservation;
}

// ─── Error class ──────────────────────────────────────────────────────────────

class CartrawlerAdapterError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(typeof message === 'object' ? JSON.stringify(message) : message);
    this.name       = 'CartrawlerAdapterError';
    this.statusCode = statusCode;
    this.raw        = raw;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  searchCars,
  getCarDetails,
  createCarReservation,
  SUPPORTED_LOCATIONS,
  CartrawlerAdapterError,
  _toCarOffer, // exported for unit testing
};
