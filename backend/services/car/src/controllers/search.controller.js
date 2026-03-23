'use strict';

const { validate } = require('../validators/search.validator');
const CarOffer     = require('../models/CarOffer');
const carhire      = require('../../../../adapters/carhire');

async function searchCars(req, res, next) {
  try {
    // 1. Validate
    const { error, value } = validate(req.query);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { pickupDate, dropoffDate } = value;

    // 2. Cross-validate dates
    if (dropoffDate <= pickupDate) {
      return res.status(400).json({
        error:   'INVALID_DATES',
        message: 'dropoffDate must be after pickupDate',
      });
    }

    // 3. Search (adapter handles Redis caching)
    let rawOffers;
    try {
      rawOffers = await carhire.searchCars(value);
    } catch (err) {
      err.statusCode = err.statusCode ?? 502;
      return next(err);
    }

    // 4. Optional client-side transmission filter (adapter doesn't support it)
    let offers = (rawOffers ?? []).map((r) => CarOffer.from(r));
    if (value.transmission) {
      offers = offers.filter((o) => o.transmission === value.transmission);
    }

    return res.json({
      source:  'hotelbeds',
      count:   offers.length,
      results: offers,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchCars };
