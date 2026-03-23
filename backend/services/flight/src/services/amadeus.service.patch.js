'use strict';

/**
 * amadeus.service.patch.js
 *
 * Middleware layer that wraps the Amadeus adapter to:
 *   1. Enforce the airline whitelist from amadeus-airlines.json
 *   2. Validate that origin + destination airports are enabled
 *   3. Filter returned offers to whitelisted airlines only
 *   4. Return 400 (bilingual) for disabled airports, empty array for no results
 *
 * Usage — replace direct amadeus adapter import in search.controller.js:
 *
 *   // Before:
 *   const amadeus = require('../../../../adapters/amadeus');
 *
 *   // After:
 *   const amadeus = require('./amadeus.service.patch');
 *
 * The patch is a drop-in replacement exposing the same { searchFlights } API.
 */

const path          = require('path');
const config        = require('../config/amadeus-airlines.json');
const baseAmadeus   = require('../../../../adapters/amadeus');

const enabledAirports = new Set(config.contentFilters.enabledAirports);
const allowedAirlines = new Set(config.contentFilters.airlines);

/**
 * Returns a bilingual error payload for disabled airport codes.
 */
function disabledAirportError(code) {
  const meta = config.airportMetadata[code];
  const nameEn = meta ? `${meta.name} (${meta.city}, ${meta.country})` : code;
  const nameAr = meta ? `${meta.nameAr} (${meta.cityAr}، ${meta.countryAr})` : code;
  const nameHi = meta?.nameHi ? `${meta.nameHi} (${meta.cityHi ?? meta.city})` : null;

  return {
    error:   'AIRPORT_NOT_ENABLED',
    code,
    message:   `Flights to/from ${nameEn} are not yet available on this platform.`,
    messageAr: `الرحلات من/إلى ${nameAr} غير متاحة حالياً على هذه المنصة.`,
    ...(nameHi && { messageHi: `${nameHi} से/के लिए उड़ानें अभी इस प्लेटफॉर्म पर उपलब्ध नहीं हैं।` }),
  };
}

/**
 * Validates origin and destination against the enabled airports list.
 * Returns null if valid, or an error object if invalid.
 */
function validateAirports(origin, destination) {
  if (!enabledAirports.has(origin)) return disabledAirportError(origin);
  if (!enabledAirports.has(destination)) return disabledAirportError(destination);
  return null;
}

/**
 * Filters an array of raw Amadeus offer objects to only include whitelisted airlines.
 * Airlines not in the whitelist are silently dropped (not an error).
 */
function filterByAirline(rawOffers) {
  if (!Array.isArray(rawOffers)) return [];
  return rawOffers.filter((offer) => {
    const code = offer.airlineCode ?? offer.validatingAirlineCodes?.[0];
    return code && allowedAirlines.has(code);
  });
}

/**
 * Patched searchFlights — same signature as the base Amadeus adapter.
 *
 * @param {object} params - { origin, destination, date, adults, cabinClass, currency, maxOffers }
 * @returns {Promise<FlightOffer[]>}
 * @throws {DisabledAirportError} if either airport is not in enabledAirports
 * @throws {AmadeusAdapterError} if Amadeus GDS call fails (propagated from base adapter)
 */
async function searchFlights(params) {
  const { origin, destination } = params;

  // 1. Airport gate check
  const airportError = validateAirports(origin, destination);
  if (airportError) {
    const err      = new Error(airportError.message);
    err.statusCode = 400;
    err.payload    = airportError;
    throw err;
  }

  // 2. Build Amadeus request — inject airline filter as includedAirlineCodes
  const amadeusParams = {
    ...params,
    // Pass comma-separated IATA codes to Amadeus Shopping API
    includedAirlineCodes: [...allowedAirlines].join(','),
  };

  // 3. Call base Amadeus adapter (handles Redis caching, retries, AmadeusAdapterError)
  let rawOffers;
  try {
    rawOffers = await baseAmadeus.searchFlights(amadeusParams);
  } catch (err) {
    // Propagate AmadeusAdapterError so controller can fall back to Sabre
    throw err;
  }

  // 4. Client-side whitelist filter (defence-in-depth — Amadeus may return extras)
  const filtered = filterByAirline(rawOffers);

  return filtered;
}

module.exports = { searchFlights };
