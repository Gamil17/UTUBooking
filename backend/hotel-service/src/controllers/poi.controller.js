/**
 * POI (Points of Interest) Controller
 *
 * GET /api/v1/hotels/poi/halal
 *   Returns halal restaurants near a given lat/lng using Google Places API.
 *   Results are cached in Redis for 24 hours per (lat4dp, lng4dp, radius) bucket.
 *
 * Env vars:
 *   GOOGLE_PLACES_API_KEY — Google Cloud project with Places API enabled
 *   REDIS_URL             — shared Redis instance
 *
 * Error responses:
 *   400 VALIDATION_ERROR  — missing/invalid lat, lng, or radius
 *   503 POI_SERVICE_UNAVAILABLE — Google Places API error (quota, network, etc.)
 */

'use strict';

const axios  = require('axios');
const Redis  = require('ioredis');
const { validatePoiHalal } = require('../validators/poi.validator');

const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const POI_TTL    = 86400; // 24 hours — halal restaurants don't change frequently

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[poi-cache] Redis error:', err.message));

function _cacheKey(lat, lng, radius) {
  // Truncate to 4 decimal places (~11 m precision) for spatial cache bucketing
  const latR = parseFloat(lat).toFixed(4);
  const lngR = parseFloat(lng).toFixed(4);
  return `poi:halal:${latR}:${lngR}:${radius}`;
}

function _mapPlace(place) {
  const photoRef = place.photos?.[0]?.photo_reference;
  const photoUrl = photoRef && process.env.GOOGLE_PLACES_API_KEY
    ? `${PLACES_URL.replace('/nearbysearch/json', '')}/photo?maxwidth=400&photoreference=${photoRef}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    : null;

  return {
    id:               place.place_id,
    name:             place.name,
    address:          place.vicinity ?? '',
    lat:              place.geometry?.location?.lat ?? null,
    lng:              place.geometry?.location?.lng ?? null,
    rating:           place.rating ?? null,
    userRatingsTotal: place.user_ratings_total ?? 0,
    priceLevel:       place.price_level ?? null,
    openNow:          place.opening_hours?.open_now ?? null,
    types:            place.types ?? [],
    photos:           photoUrl ? [photoUrl] : [],
    source:           'google_places',
  };
}

async function getHalalRestaurants(req, res, next) {
  const { error, value: params } = validatePoiHalal(req.query);
  if (error) {
    return res.status(400).json({
      error:   'VALIDATION_ERROR',
      details: error.details.map((d) => d.message),
    });
  }

  const { lat, lng, radius } = params;
  const cacheKey = _cacheKey(lat, lng, radius);

  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res
        .set('X-Cache', 'HIT')
        .json(JSON.parse(cached));
    }
  } catch { /* non-fatal — proceed to API */ }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:   'POI_SERVICE_UNAVAILABLE',
      message: 'GOOGLE_PLACES_API_KEY is not configured.',
    });
  }

  let response;
  try {
    response = await axios.get(PLACES_URL, {
      params: {
        location: `${lat},${lng}`,
        radius,
        type:     'restaurant',
        keyword:  'halal',
        key:      apiKey,
      },
      timeout: 10000,
    });
  } catch (err) {
    console.error('[poi] Google Places API error:', err.message);
    return res.status(503).json({
      error:   'POI_SERVICE_UNAVAILABLE',
      message: err.message ?? 'Google Places API unavailable',
    });
  }

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    console.error('[poi] Google Places API status:', response.data.status, response.data.error_message);
    return res.status(503).json({
      error:   'POI_SERVICE_UNAVAILABLE',
      message: `Google Places returned status: ${response.data.status}`,
    });
  }

  const results = (response.data.results ?? []).slice(0, 20).map(_mapPlace);

  const body = {
    source:  'google_places',
    count:   results.length,
    radius,
    center:  { lat, lng },
    results,
  };

  // Cache result
  try { await redis.setex(cacheKey, POI_TTL, JSON.stringify(body)); } catch { /* non-fatal */ }

  return res.set('X-Cache', 'MISS').json(body);
}

module.exports = { getHalalRestaurants };
