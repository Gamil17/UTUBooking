'use strict';

/**
 * cartrawler.service.patch.js
 *
 * Enables 5 new CarTrawler airport locations (AMM, KWI, BAH, CMN, TUN) and
 * adds automatic SAR conversion for local currencies (JOD, KWD, BHD, MAD, TND).
 *
 * Drop-in replacement for direct cartrawler adapter calls in search.controller.js:
 *
 *   // Before:
 *   const ct = require('../../../../adapters/cartrawler');
 *   const offers = await ct.searchCars(...);
 *
 *   // After:
 *   const ct = require('./cartrawler.service.patch');
 *   const offers = await ct.searchCarsWithConversion(params);
 *
 * Implementation notes:
 *   - SUPPORTED_LOCATIONS Set is patched at module-load time via Set.add()
 *     so the base adapter also accepts the new codes (defence in depth).
 *   - Location validation uses cartrawler-locations.json as the authoritative
 *     source — enabled:false disables a location without code changes.
 *   - Currency conversion uses car-fx.service.js (Redis → API → static fallback).
 *   - Cross-location (one-way) rentals: pickup airport currency used for conversion.
 *
 * ⚠️ Code review required from outsourced dev team before merging changes to
 *    search.controller.js (per backend/CLAUDE.md).
 */

const Redis       = require('ioredis');
const cartrawler  = require('../../../../../adapters/cartrawler');
const carFx       = require('./car-fx.service');
const locations   = require('../config/cartrawler-locations.json');

// ─── Patch SUPPORTED_LOCATIONS at load time ───────────────────────────────────

const NEW_LOCATIONS = ['AMM', 'KWI', 'BAH', 'CMN', 'TUN'];
NEW_LOCATIONS.forEach((code) => cartrawler.SUPPORTED_LOCATIONS.add(code));

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[ct-patch] Redis error:', err.message));

const LOCATION_CACHE_TTL = 3600; // 60 min per spec

// ─── Location validation ──────────────────────────────────────────────────────

/**
 * Resolve and cache location config for a given IATA code.
 * Redis key: car:locations:{CODE}  TTL: 60 min
 *
 * @param {string} code
 * @returns {Promise<object>} location config from cartrawler-locations.json
 * @throws  {LocationError} 404 if unknown or disabled
 */
async function getLocationConfig(code) {
  const upper = code.toUpperCase();
  const cacheKey = `car:locations:${upper}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* non-fatal */ }

  const loc = locations.locations[upper];
  if (!loc || !loc.enabled) {
    throw new LocationError(
      `Location ${upper} is not available for car rental`,
      `الموقع ${upper} غير متاح لتأجير السيارات حالياً`,
      upper,
    );
  }

  redis.setex(cacheKey, LOCATION_CACHE_TTL, JSON.stringify(loc)).catch(() => {});
  return loc;
}

/**
 * Validate both pickup and dropoff — throws LocationError if either is disabled.
 *
 * @param {string} pickup
 * @param {string} dropoff
 * @returns {Promise<{ pickupLoc, dropoffLoc }>}
 */
async function validateLocations(pickup, dropoff) {
  const [pickupLoc, dropoffLoc] = await Promise.all([
    getLocationConfig(pickup),
    getLocationConfig(dropoff),
  ]);
  return { pickupLoc, dropoffLoc };
}

// ─── Currency conversion ──────────────────────────────────────────────────────

/**
 * Convert a single offer's price fields from local currency to SAR.
 * Attaches originalCurrency, originalPricePerDay, originalTotalPrice, fxRate.
 *
 * @param {object} offer     — raw CarOffer from cartrawler adapter
 * @param {string} localCcy  — native currency of the pickup airport
 * @returns {Promise<object>}
 */
async function _convertOfferToSAR(offer, localCcy) {
  const offerCcy = offer.currency ?? localCcy;
  if (offerCcy === 'SAR') {
    return {
      ...offer,
      currency:            'SAR',
      originalCurrency:    'SAR',
      originalPricePerDay: offer.pricePerDay,
      originalTotalPrice:  offer.totalPrice,
    };
  }

  const rate = await carFx.getRate(offerCcy, 'SAR');

  return {
    ...offer,
    pricePerDay:         parseFloat((offer.pricePerDay * rate).toFixed(2)),
    totalPrice:          parseFloat((offer.totalPrice  * rate).toFixed(2)),
    currency:            'SAR',
    originalCurrency:    offerCcy,
    originalPricePerDay: offer.pricePerDay,
    originalTotalPrice:  offer.totalPrice,
    fxRate:              rate,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search cars with location validation + SAR conversion.
 *
 * Accepts all locations in cartrawler-locations.json (enabled:true),
 * including the 5 new airports: AMM, KWI, BAH, CMN, TUN.
 *
 * All prices in the returned offers are denominated in SAR.
 * Original local-currency amounts are preserved in originalPricePerDay /
 * originalTotalPrice / originalCurrency fields.
 *
 * @param {object} params
 * @param {string} params.pickupLocation   — IATA airport code
 * @param {string} [params.dropoffLocation]— defaults to pickupLocation (same-station)
 * @param {string} params.pickupDate       — 'YYYY-MM-DD'
 * @param {string} params.dropoffDate      — 'YYYY-MM-DD'
 * @param {number} [params.driverAge]      — default 30
 * @param {string} [params.vehicleType]    — sedan|suv|van|compact|luxury
 * @param {number} [params.maxOffers]      — default 20
 *
 * @returns {Promise<object[]>} CarOffer array priced in SAR
 * @throws  {LocationError}           404 — unknown or disabled airport
 * @throws  {CartrawlerAdapterError}  502 — upstream GDS failure
 */
async function searchCarsWithConversion(params) {
  const {
    pickupLocation,
    dropoffLocation,
    pickupDate,
    dropoffDate,
    driverAge   = 30,
    vehicleType = null,
    maxOffers   = 20,
  } = params;

  const pickup  = pickupLocation.toUpperCase();
  const dropoff = (dropoffLocation ?? pickupLocation).toUpperCase();

  // Validate — throws LocationError (statusCode 404) for unknown/disabled airports
  const { pickupLoc } = await validateLocations(pickup, dropoff);

  // Delegate XML I/O to base adapter (SUPPORTED_LOCATIONS already patched above)
  const rawOffers = await cartrawler.searchCars(
    pickup,
    dropoff,
    pickupDate,
    dropoffDate,
    driverAge,
    { currency: pickupLoc.currency, vehicleType, maxOffers },
  );

  // Convert all offer prices to SAR
  const converted = await Promise.all(
    rawOffers.map((offer) => _convertOfferToSAR(offer, pickupLoc.currency)),
  );

  return converted;
}

/**
 * List all enabled locations (sync).
 * @returns {object[]}
 */
function listEnabledLocations() {
  return Object.values(locations.locations).filter((l) => l.enabled);
}

/**
 * Check if an IATA code is enabled (sync, no I/O).
 * @param {string} code
 * @returns {boolean}
 */
function isLocationEnabled(code) {
  const loc = locations.locations[code?.toUpperCase()];
  return !!(loc && loc.enabled);
}

// ─── Error class ──────────────────────────────────────────────────────────────

class LocationError extends Error {
  constructor(messageEn, messageAr, locationCode) {
    super(messageEn);
    this.name         = 'LocationError';
    this.statusCode   = 404;
    this.messageAr    = messageAr;
    this.locationCode = locationCode;
  }

  toJSON() {
    return {
      error:        'LOCATION_NOT_AVAILABLE',
      message:      this.message,
      messageAr:    this.messageAr,
      locationCode: this.locationCode,
    };
  }
}

module.exports = {
  searchCarsWithConversion,
  getLocationConfig,
  validateLocations,
  listEnabledLocations,
  isLocationEnabled,
  LocationError,
};
