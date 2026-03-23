const axios = require('axios');
const redis = require('../db/redis');
const repo  = require('../db/wallet.repo');

const SUPPORTED = ['SAR', 'AED', 'KWD', 'JOD', 'MAD', 'TND', 'PKR', 'INR', 'USD'];
const CACHE_KEY = 'fx:rates:USD';
const CACHE_TTL = 300; // 5 minutes — reduced from 15 min for PKR (high-inflation market)

// Static fallback rates (1 USD = X currency) — updated periodically by hand
// PKR note: Pakistan experiences high inflation; always prefer live API over static
const STATIC_RATES = {
  SAR: 3.7500,
  AED: 3.6725,
  KWD: 0.3072,
  JOD: 0.7090,
  MAD: 10.060,
  TND: 3.1050,
  PKR: 280.00,  // approximate — use live API; PKR depreciates ~20–30% annually
  INR: 83.50,   // approximate — moderately stable; live API preferred
  USD: 1,
};

/**
 * Shared base-rate fetcher used by both getRate() and getAllRates().
 * Returns a map of { [currency]: rateVsUSD } via 3-level fallback:
 *   1. Redis cache  (15 min TTL)
 *   2. ExchangeRate-API v6 (live)
 *   3. Hardcoded static rates
 *
 * DB persistence of all pairs happens as a fire-and-forget side effect of level 2.
 */
async function _fetchBaseRates() {
  // 1. Redis cache
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('[fx] Redis read failed:', err.message);
  }

  // 2. Live API (URL built lazily so env var is always current)
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (apiKey) {
    try {
      const { data } = await axios.get(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
        { timeout: 5000 },
      );
      const rates = data.conversion_rates;

      // Cache in Redis (non-fatal)
      redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(rates)).catch(() => {});

      // Persist all supported pairs to DB (fire-and-forget, non-fatal)
      Promise.all(
        SUPPORTED.flatMap((a) =>
          SUPPORTED.filter((b) => b !== a).map((b) =>
            repo.upsertFxRate(a, b, rates[b] / rates[a]).catch(() => {}),
          ),
        ),
      ).catch(() => {});

      return rates;
    } catch (err) {
      console.warn('[fx] API fetch failed:', err.message);
    }
  }

  // 3. Static fallback (DB fallback happens inside getRate only, for single-pair lookup)
  return STATIC_RATES;
}

/**
 * Return cross-rate: how many `toCcy` you get per 1 `fromCcy`.
 * Uses USD as settlement base: rate = toRate / fromRate.
 *
 * 4-level fallback:
 *   1. Redis cache (via _fetchBaseRates)
 *   2. ExchangeRate-API v6 (via _fetchBaseRates)
 *   3. PostgreSQL fx_rates table (single-pair DB lookup)
 *   4. Hardcoded static rates
 */
async function getRate(fromCcy, toCcy) {
  if (fromCcy === toCcy) return 1;

  const rates = await _fetchBaseRates();

  // If we got real rates from cache or API, use them
  if (rates !== STATIC_RATES && rates[fromCcy] && rates[toCcy]) {
    return rates[toCcy] / rates[fromCcy];
  }

  // 3. DB fallback (single pair — more precise than static)
  try {
    const dbRate = await repo.getFxRate(fromCcy, toCcy);
    if (dbRate !== null) return dbRate;
  } catch (err) {
    console.warn('[fx] DB fallback failed:', err.message);
  }

  // 4. Static fallback
  const fromBase = STATIC_RATES[fromCcy] ?? 1;
  const toBase   = STATIC_RATES[toCcy]   ?? 1;
  return toBase / fromBase;
}

/**
 * Return all cross-rates between SUPPORTED currencies.
 * Returns: { SAR: { AED: 0.98, KWD: ..., ... }, AED: { ... }, ... }
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

module.exports = { getRate, getAllRates, SUPPORTED };
