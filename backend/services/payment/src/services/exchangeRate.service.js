'use strict';

const { createClient } = require('../db/redis');

const CACHE_KEY = 'exchange_rates:usd_base';
const CACHE_TTL = 3600; // 1 hour

/**
 * Static fallback rates (USD base) used when the API key is absent
 * or the external request fails. Rates are approximate as of 2026-Q1.
 */
const FALLBACK_RATES = {
  USD: 1.0,
  SAR: 3.75,
  AED: 3.67,
  JOD: 0.71,
  MAD: 10.05,
  TND: 3.12,
  EGP: 30.90,
};

let redisClient = null;

function getRedis() {
  if (!redisClient) redisClient = createClient();
  return redisClient;
}

/**
 * Fetch the full rate map (USD as base) from ExchangeRate-API v6.
 * Caches the result in Redis for CACHE_TTL seconds.
 * Falls back to FALLBACK_RATES if the API key is missing or the call fails.
 *
 * @returns {Promise<Record<string, number>>} Rate map keyed by currency code.
 */
async function getRateMap() {
  const redis = getRedis();

  const cached = await redis.get(CACHE_KEY).catch(() => null);
  if (cached) return JSON.parse(cached);

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) return FALLBACK_RATES;

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`ExchangeRate-API ${res.status}`);

    const data = await res.json();
    const rates = data.conversion_rates;

    await redis
      .set(CACHE_KEY, JSON.stringify(rates), 'EX', CACHE_TTL)
      .catch(() => { /* non-fatal — cache miss on next call */ });

    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

/**
 * Convert an amount between two currencies using USD as an intermediary.
 *
 * @param {string} from   Source currency code (e.g. 'USD')
 * @param {string} to     Target currency code (e.g. 'MAD')
 * @param {number} amount Amount in the source currency
 * @returns {Promise<number>} Converted amount, rounded to 2 decimal places
 */
async function getRate(from, to, amount) {
  if (from === to) return amount;

  const rates = await getRateMap();

  const fromRate = rates[from.toUpperCase()];
  const toRate   = rates[to.toUpperCase()];

  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency pair: ${from}/${to}`);
  }

  // Convert via USD base: amount → USD → target
  const usdAmount = amount / fromRate;
  return Math.round(usdAmount * toRate * 100) / 100;
}

module.exports = { getRate, getRateMap };
