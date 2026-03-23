'use strict';

/**
 * Flight Search Controller
 *
 * GET /api/v1/flights/search
 *
 * Strategy:
 *   1. Validate query params with Joi
 *   2. Cross-validate: returnDate must be after date (if provided)
 *   3. Try Amadeus adapter (primary GDS, results cached 3 min in Redis)
 *   4. On AmadeusAdapterError → fall back to Sabre (also cached)
 *   5. Return normalised FlightOffer[] with source, count, pagination
 */

const { validate }          = require('../validators/search.validator');
const FlightOffer            = require('../models/FlightOffer');
const amadeus                = require('../../../../adapters/amadeus');
const sabre                  = require('../../../../adapters/sabre');
const { AmadeusAdapterError } = require('../../../../adapters/amadeus');

async function searchFlights(req, res, next) {
  try {
    // 1. Validate
    const { error, value } = validate(req.query);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { origin, destination, date, returnDate, adults, cabinClass, currency, maxOffers } = value;

    // 2. Cross-validate dates
    if (returnDate && returnDate <= date) {
      return res.status(400).json({
        error:   'INVALID_DATES',
        message: 'returnDate must be after date',
      });
    }

    const searchParams = { origin, destination, date, adults, cabinClass, currency, maxOffers };

    // 3. Try Amadeus (primary) — adapter handles Redis caching internally
    let rawOffers;
    let usedSource = 'amadeus';

    try {
      rawOffers = await amadeus.searchFlights(searchParams);
    } catch (amadeusErr) {
      if (amadeusErr instanceof AmadeusAdapterError) {
        // 4. Fallback to Sabre
        console.warn(
          `[flight-search] Amadeus failed (${amadeusErr.statusCode}): ${amadeusErr.message} — trying Sabre`
        );
        try {
          rawOffers  = await sabre.searchFlights(searchParams);
          usedSource = 'sabre';
        } catch (sabreErr) {
          // Both GDS failed — propagate with context
          sabreErr.message = `Amadeus: ${amadeusErr.message} | Sabre: ${sabreErr.message}`;
          sabreErr.statusCode = 502;
          return next(sabreErr);
        }
      } else {
        return next(amadeusErr);
      }
    }

    // 5. Normalise
    const offers = (rawOffers ?? []).map((r) => FlightOffer.from(r));

    // Simple pagination (adapter already limits results; page is informational here)
    const page  = parseInt(req.query.page ?? 1, 10);
    const limit = parseInt(req.query.limit ?? maxOffers, 10);

    return res.json({
      source:  usedSource,
      count:   offers.length,
      page,
      limit,
      results: offers,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchFlights };
