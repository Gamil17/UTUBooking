'use strict';

/**
 * car-fx.service.js
 *
 * FX rate service for the car rental microservice.
 * Supports JOD, KWD, BHD, MAD, TND (new) + SAR, AED, USD, EGP (existing).
 *
 * Fallback chain (mirrors wallet/src/services/fx.service.js):
 *   1. Redis cache  — key: car:fx:rates:USD  TTL: 15 min
 *   2. ExchangeRate-API v6 (live)
 *   3. Hardcoded static rates
 *
 * Env vars:
 *   EXCHANGERATE_API_KEY  — shared with wallet service (exchangerate-api.com free tier)
 *   REDIS_URL             — default: redis://localhost:6379
 */

const axios = require('axios');
const Redis = require('ioredis');

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED = ['SAR', 'AED', 'KWD', 'JOD', 'MAD', 'TND', 'BHD', 'USD', 'EGP'];

const CACHE_KEY = 'car:fx:rates:USD';
const CACHE_TTL = 900; // 15 minutes

/**
 * Static fallback rates (1 USD = X local currency).
 * Source: central bank mid-market rates, March 2026.
 * Update quarterly or when rate drifts >5% from market.
 */
const STATIC_RATES = {
  USD: 1,
  SAR: 3.7500,
  AED: 3.6725,
  KWD: 0.3072,   // 1 KWD = ~3.26 USD → 1 USD = 0.307 KWD → 1 KWD = 12.21 SAR
  JOD: 0.7090,   // 1 JOD = ~1.41 USD → 1 USD = 0.709 JOD → 1 JOD = ~5.29 SAR
  BHD: 0.3770,   // 1 BHD = ~2.65 USD → 1 USD = 0.377 BHD → 1 BHD = ~9.94 SAR
  MAD: 10.060,   // 1 MAD = ~0.099 USD → 1 USD = 10.06 MAD → 1 MAD = ~0.373 SAR
  TND: 3.1050,   // 1 TND = ~0.32 USD → 1 USD = 3.105 TND → 1 TND = ~1.21 SAR
  EGP: 48.500,
};

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[car-fx] Redis error:', err.message));

// ─── Internal: fetch base rates vs USD ───────────────────────────────────────

async function _fetchBaseRates() {
  // 1. Redis cache
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('[car-fx] Redis read failed:', err.message);
  }

  // 2. ExchangeRate-API v6 (live)
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (apiKey) {
    try {
      const { data } = await axios.get(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
        { timeout: 5000 },
      );
      const rates = data.conversion_rates;
      redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(rates)).catch(() => {});
      return rates;
    } catch (err) {
      console.warn('[car-fx] API fetch failed:', err.message);
    }
  }

  // 3. Static fallback
  return STATIC_RATES;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Cross-rate: how many `toCcy` per 1 `fromCcy`, using USD as settlement base.
 *
 * @param {string} fromCcy
 * @param {string} toCcy
 * @returns {Promise<number>}
 */
async function getRate(fromCcy, toCcy) {
  if (fromCcy === toCcy) return 1;
  const rates    = await _fetchBaseRates();
  const fromBase = rates[fromCcy] ?? STATIC_RATES[fromCcy] ?? 1;
  const toBase   = rates[toCcy]   ?? STATIC_RATES[toCcy]   ?? 1;
  return Number((toBase / fromBase).toFixed(8));
}

/**
 * Convert `amount` from `fromCcy` to SAR.
 *
 * @param {number} amount
 * @param {string} fromCcy
 * @returns {Promise<number>} SAR amount, 2dp
 */
async function toSAR(amount, fromCcy) {
  if (fromCcy === 'SAR') return parseFloat(amount.toFixed(2));
  const rate = await getRate(fromCcy, 'SAR');
  return parseFloat((amount * rate).toFixed(2));
}

/**
 * All cross-rates between SUPPORTED currencies.
 * @returns {Promise<object>}
 */
async function getAllRates() {
  const baseRates = await _fetchBaseRates();
  const result = {};
  for (const from of SUPPORTED) {
    result[from] = {};
    for (const to of SUPPORTED) {
      if (from !== to) {
        const fromBase = baseRates[from] ?? STATIC_RATES[from] ?? 1;
        const toBase   = baseRates[to]   ?? STATIC_RATES[to]   ?? 1;
        result[from][to] = Number((toBase / fromBase).toFixed(8));
      }
    }
  }
  return result;
}

module.exports = { getRate, toSAR, getAllRates, SUPPORTED, STATIC_RATES };
