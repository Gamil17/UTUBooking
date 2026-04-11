'use strict';

/**
 * Platform settings reader for the pricing service.
 * Reads from Redis key `settings:platform` (written by the admin UI BFF).
 * Caches in-process for 60 seconds.
 * Falls back to hardcoded defaults if Redis is unavailable.
 */

const redis = require('../db/redis');

const REDIS_KEY = 'settings:platform';
const CACHE_TTL = 60_000; // 1 minute

const DEFAULTS = {
  pricing: {
    hajj_surge_multiplier:   1.8,
    umrah_peak_multiplier:   1.3,
    demand_window_days:      30,
    min_confidence_to_apply: 75,
  },
};

let _cache   = null;
let _cacheAt = 0;

/**
 * Returns merged pricing settings with defaults as fallback.
 * Cached in memory for 60 s.
 */
async function getPricingSettings() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
    return _cache.pricing;
  }
  try {
    const raw    = await redis.get(REDIS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    _cache = {
      pricing: { ...DEFAULTS.pricing, ...(parsed.pricing ?? {}) },
    };
    _cacheAt = Date.now();
    return _cache.pricing;
  } catch {
    return DEFAULTS.pricing;
  }
}

module.exports = { getPricingSettings };
