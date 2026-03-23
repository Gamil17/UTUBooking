'use strict';

/**
 * flightCtrl.js — Flight Search & Order Controller
 *
 * Handles GET /api/v1/flights/search and POST /api/v1/flights/order.
 *
 * Failover strategy (search):
 *   1. Amadeus (primary GDS, SDK-based, results cached 3 min)
 *      → success → return results tagged source='amadeus'
 *   2. AmadeusAdapterError → retry with Sabre (BFM REST, cached 3 min)
 *      → success → return results tagged source='sabre'
 *   3. Both fail → 502 with combined error detail
 *
 * Order strategy:
 *   The client must indicate which GDS the offer came from via offer.source.
 *   'amadeus' → createFlightOrder (Amadeus)
 *   'sabre'   → createSabreOrder  (Sabre PNR)
 *
 * NOTE: The existing search.controller.js at this path has equivalent search
 * logic. flightCtrl.js adds order handling and uses the named
 * searchFlightsSabre / createSabreOrder positional-arg exports.
 */

const { validate }              = require('../validators/search.validator');
const FlightOffer               = require('../models/FlightOffer');

const amadeus                   = require('../../../../adapters/amadeus');
const sabre                     = require('../../../../adapters/sabre');
const { AmadeusAdapterError }   = require('../../../../adapters/amadeus');
const { SabreAdapterError }     = require('../../../../adapters/sabre');

// ─── searchFlights ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/flights/search
 *
 * Query params (validated by Joi search.validator):
 *   origin, destination, date, adults, cabinClass?, currency?, maxOffers?,
 *   returnDate?, page?, limit?
 */
async function searchFlights(req, res, next) {
  try {
    // 1. Joi validation
    const { error, value } = validate(req.query);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const {
      origin, destination, date, returnDate,
      adults, cabinClass, currency, maxOffers,
    } = value;

    // 2. Cross-validate dates
    if (returnDate && returnDate <= date) {
      return res.status(400).json({
        error:   'INVALID_DATES',
        message: 'returnDate must be after date',
      });
    }

    const searchParams = { origin, destination, date, adults, cabinClass, currency, maxOffers };

    // 3. Amadeus (primary) — adapter handles caching internally
    let rawOffers;
    let usedSource = 'amadeus';

    try {
      rawOffers = await amadeus.searchFlights(searchParams);
    } catch (amadeusErr) {
      if (!(amadeusErr instanceof AmadeusAdapterError)) {
        return next(amadeusErr); // unexpected error — don't mask it
      }

      // 4. Sabre failover — use positional-arg wrapper
      console.warn(
        `[flightCtrl] Amadeus error (${amadeusErr.statusCode}): ${amadeusErr.message} — failing over to Sabre`
      );

      try {
        rawOffers  = await sabre.searchFlightsSabre(
          origin, destination, date, cabinClass,
          { adults, currency, maxOffers }
        );
        usedSource = 'sabre';
      } catch (sabreErr) {
        // 5. Both GDS failed
        const combinedMsg =
          `Amadeus (${amadeusErr.statusCode}): ${amadeusErr.message} | ` +
          `Sabre (${sabreErr.statusCode ?? 502}): ${sabreErr.message}`;
        console.error(`[flightCtrl] Both GDS failed — ${combinedMsg}`);

        return res.status(502).json({
          error:   'UPSTREAM_UNAVAILABLE',
          message: 'All flight data sources are currently unavailable. Please try again shortly.',
          detail:  process.env.NODE_ENV !== 'production' ? combinedMsg : undefined,
        });
      }
    }

    // 6. Normalise to canonical FlightOffer DTOs
    const offers = (rawOffers ?? []).map((r) => FlightOffer.from(r));

    const page  = parseInt(req.query.page  ?? 1,          10);
    const limit = parseInt(req.query.limit ?? maxOffers,   10);

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

// ─── createOrder ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/flights/order
 *
 * Body:
 *   {
 *     offer:    FlightOffer  (must include .source and .raw for correct GDS dispatch),
 *     traveler: object       (GDS-specific traveler shape)
 *   }
 *
 * Routes to the correct GDS based on offer.source.
 */
async function createOrder(req, res, next) {
  try {
    const { offer, traveler } = req.body ?? {};

    if (!offer || !traveler) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        message: 'Request body must include offer and traveler',
      });
    }

    if (!offer.raw) {
      return res.status(400).json({
        error:   'INVALID_OFFER',
        message: 'offer.raw is required — pass the full offer object returned by the search endpoint',
      });
    }

    const source = (offer.source ?? 'amadeus').toLowerCase();
    let order;

    if (source === 'sabre') {
      try {
        order = await sabre.createSabreOrder(offer, traveler);
      } catch (err) {
        const sabreErr = err instanceof SabreAdapterError ? err : new SabreAdapterError(err.message, 502);
        return res.status(sabreErr.statusCode).json({
          error:   'BOOKING_FAILED',
          source:  'sabre',
          message: sabreErr.message,
        });
      }
    } else {
      // Default: Amadeus
      try {
        order = await amadeus.createFlightOrder(offer.raw, traveler);
      } catch (amadeusErr) {
        if (!(amadeusErr instanceof AmadeusAdapterError)) return next(amadeusErr);

        // Amadeus booking failed — attempt Sabre as last resort if offer has raw Sabre data
        console.warn(
          `[flightCtrl] Amadeus order failed (${amadeusErr.statusCode}): ${amadeusErr.message}` +
          (offer.raw?.AirItinerary ? ' — retrying with Sabre' : '')
        );

        // Only retry with Sabre if the offer's raw payload is a Sabre PricedItinerary
        if (offer.raw?.AirItinerary) {
          try {
            order = await sabre.createSabreOrder(offer, traveler);
            order.source = 'sabre'; // tag the fallback source
          } catch (sabreErr) {
            return res.status(502).json({
              error:   'BOOKING_FAILED',
              message: 'Booking failed on all available GDS.',
              detail:  process.env.NODE_ENV !== 'production'
                ? `Amadeus: ${amadeusErr.message} | Sabre: ${sabreErr.message}`
                : undefined,
            });
          }
        } else {
          return res.status(amadeusErr.statusCode).json({
            error:   'BOOKING_FAILED',
            source:  'amadeus',
            message: amadeusErr.message,
          });
        }
      }
    }

    return res.status(201).json({
      source:  order.source ?? source,
      orderId: order.orderId,
      pnr:     order.pnr,
      status:  order.status,
      offer:   FlightOffer.from(order.flightOffers?.[0] ?? offer),
      travelers: order.travelers,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchFlights, createOrder };
