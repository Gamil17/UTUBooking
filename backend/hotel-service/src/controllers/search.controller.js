const { validate } = require('../validators/search.validator');
const { searchHotels, HotelbedsError } = require('../../../adapters/hotelbeds');
// Redis caching is handled inside the hotelbeds adapter (5-min TTL)

async function searchHotelsHandler(req, res, next) {
  // 1. Validate input
  const { error, value: params } = validate(req.query);
  if (error) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: error.details.map((d) => d.message),
    });
  }

  // 2. Cross-validate dates
  if (new Date(params.checkOut) <= new Date(params.checkIn)) {
    return res.status(400).json({
      error: 'INVALID_DATES',
      message: 'checkOut must be after checkIn',
    });
  }

  // 3. Call Hotelbeds adapter (caching handled inside adapter)
  let results;
  try {
    results = await searchHotels(
      params.location,
      params.checkIn,
      params.checkOut,
      params.guests,
      {
        stars:     params.stars,
        priceMin:  params.priceMin,
        priceMax:  params.priceMax,
        currency:  params.currency,
        isHajj:    params.isHajj,
        isUmrah:   params.isUmrah,
      }
    );
  } catch (err) {
    return next(err);
  }

  return res.json({
    source: 'live',
    count: results.length,
    page: params.page,
    limit: params.limit,
    results,
  });
}

module.exports = { searchHotelsHandler };
