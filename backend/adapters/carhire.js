/**
 * Hotelbeds Car Hire Adapter
 *
 * API:   Hotelbeds Car Rental API v1
 * Docs:  https://developer.hotelbeds.com/documentation/transfers/transfer-api/
 * Auth:  Same signature as hotel adapter — Api-Key + SHA256(ApiKey + Secret + UnixTimestamp)
 *
 * Env vars (shared with hotelbeds.js):
 *   HOTELBEDS_API_KEY
 *   HOTELBEDS_SECRET
 *   HOTELBEDS_CAR_BASE_URL  — default: https://api.hotelbeds.com/car-rental-api/1.0
 *
 * Redis cache key: car:search:{sha256(params)}  TTL: 300 s (5 min)
 *
 * Amount convention: Hotelbeds returns prices as decimal strings in the
 * requested currency. We store as NUMERIC(10,2).
 */

'use strict';

require('dotenv').config();
const axios  = require('axios');
const crypto = require('crypto');
const Redis  = require('ioredis');

const BASE_URL = process.env.HOTELBEDS_CAR_BASE_URL || 'https://api.hotelbeds.com/car-rental-api/1.0';
const CACHE_TTL = 300;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[carhire-cache] Redis error:', err.message));

async function _cacheGet(key) {
  try { const r = await redis.get(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
async function _cacheSet(key, data) {
  try { await redis.setex(key, CACHE_TTL, JSON.stringify(data)); } catch { /* non-fatal */ }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function _buildHeaders() {
  const ts  = Math.floor(Date.now() / 1000).toString();
  const sig = crypto
    .createHash('sha256')
    .update(`${process.env.HOTELBEDS_API_KEY}${process.env.HOTELBEDS_SECRET}${ts}`)
    .digest('hex');

  return {
    'Api-Key':        process.env.HOTELBEDS_API_KEY,
    'X-Signature':    sig,
    Accept:           'application/json',
    'Accept-Encoding':'gzip',
    'Content-Type':   'application/json',
  };
}

// ─── CarOffer DTO ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} CarOffer
 * @property {string}  id               — Hotelbeds vehicle code + rate hash
 * @property {string}  vendorCode       — ACRISS vendor code (e.g. 'ZD' = Dollar)
 * @property {string}  vendorName       — Display name
 * @property {string}  vehicleType      — sedan | suv | van | compact | luxury
 * @property {string}  transmission     — automatic | manual
 * @property {number}  seats            — passenger capacity
 * @property {string}  pickupLocation   — IATA or Hotelbeds location code
 * @property {string}  dropoffLocation  — same format
 * @property {string}  pickupDate       — ISO date
 * @property {string}  dropoffDate      — ISO date
 * @property {number}  days             — rental duration
 * @property {number}  pricePerDay      — in requested currency
 * @property {number}  totalPrice       — pricePerDay × days
 * @property {string}  currency
 * @property {boolean} airconIncluded
 * @property {boolean} unlimitedMileage
 * @property {string}  source           — 'hotelbeds'
 */

function _toCarOffer(raw, pickupDate, dropoffDate, currency) {
  const days       = _daysBetween(pickupDate, dropoffDate);
  const totalPrice = parseFloat(raw.rateDetails?.totalAmount ?? raw.totalAmount ?? 0);
  const perDay     = days > 0 ? +(totalPrice / days).toFixed(2) : totalPrice;

  // ACRISS code: position 0=category, 1=type, 2=transmission, 3=fuel/AC
  const acriss       = (raw.vehicle?.acrissCode ?? '    ').toUpperCase();
  const vehicleType  = _mapVehicleCategory(acriss[0]);
  const transmission = 'MNABD'.includes(acriss[2]) ? 'automatic' : 'manual';
  const aircon       = acriss[3] !== 'N';

  return {
    id:              `${raw.vehicle?.code ?? raw.id}:${raw.rateDetails?.rateKey ?? raw.rateKey ?? ''}`,
    vendorCode:      raw.company?.code ?? '',
    vendorName:      raw.company?.name ?? '',
    vehicleType,
    transmission,
    seats:           parseInt(raw.vehicle?.seats ?? 5, 10),
    pickupLocation:  raw.pickUp?.code   ?? raw.pickupCode   ?? '',
    dropoffLocation: raw.dropOff?.code  ?? raw.dropoffCode  ?? '',
    pickupDate,
    dropoffDate,
    days,
    pricePerDay:     perDay,
    totalPrice,
    currency,
    airconIncluded:      aircon,
    unlimitedMileage:    (raw.rateDetails?.mileage ?? '').toLowerCase().includes('unlimited'),
    source:          'hotelbeds',
    raw,
  };
}

function _mapVehicleCategory(code) {
  const map = { M: 'compact', E: 'compact', C: 'compact', D: 'sedan', I: 'sedan',
                J: 'suv',     S: 'suv',     R: 'suv',     F: 'sedan', G: 'sedan',
                P: 'van',     L: 'luxury',  X: 'sedan',   U: 'suv',   W: 'van' };
  return map[code] ?? 'sedan';
}

function _daysBetween(from, to) {
  return Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
}

function _cacheKey(params) {
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
  return `car:search:${crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex')}`;
}

// ─── searchCars ───────────────────────────────────────────────────────────────

/**
 * Searches available rental cars.
 *
 * @param {object} params
 * @param {string} params.pickupLocation   — IATA code (e.g. 'JED')
 * @param {string} [params.dropoffLocation]— defaults to pickupLocation (same-station return)
 * @param {string} params.pickupDate       — 'YYYY-MM-DD'
 * @param {string} params.dropoffDate      — 'YYYY-MM-DD'
 * @param {string} [params.vehicleType]    — sedan|suv|van|compact|luxury (optional filter)
 * @param {string} [params.currency]       — default 'SAR'
 * @param {number} [params.maxOffers]      — default 20
 *
 * @returns {Promise<CarOffer[]>}
 * @throws  {CarHireAdapterError}
 */
async function searchCars({
  pickupLocation,
  dropoffLocation,
  pickupDate,
  dropoffDate,
  vehicleType,
  currency    = 'SAR',
  maxOffers   = 20,
}) {
  const params = { pickupLocation, dropoffLocation: dropoffLocation ?? pickupLocation,
                   pickupDate, dropoffDate, vehicleType, currency, maxOffers };
  const key = _cacheKey(params);

  const cached = await _cacheGet(key);
  if (cached) return cached;

  let res;
  try {
    res = await axios.get(`${BASE_URL}/vehicles`, {
      headers: _buildHeaders(),
      timeout: 20000,
      params: {
        pickUpFrom:    pickupDate,
        dropOffTo:     dropoffDate,
        pickUpCode:    pickupLocation,
        dropOffCode:   dropoffLocation ?? pickupLocation,
        currency,
        language:      'en',
        limit:         maxOffers,
      },
    });
  } catch (err) {
    throw new CarHireAdapterError(
      err.response?.data?.message ?? err.message,
      err.response?.status ?? 502,
      err.response?.data
    );
  }

  let vehicles = res.data?.vehicles ?? res.data?.data ?? [];

  // Optional client-side filter on vehicle type (Hotelbeds API doesn't always accept it)
  if (vehicleType) {
    vehicles = vehicles.filter((v) => {
      const acriss = (v.vehicle?.acrissCode ?? '').toUpperCase();
      return _mapVehicleCategory(acriss[0]) === vehicleType.toLowerCase();
    });
  }

  const offers = vehicles.slice(0, maxOffers)
    .map((v) => _toCarOffer(v, pickupDate, dropoffDate, currency));

  await _cacheSet(key, offers);
  return offers;
}

// ─── getCarPrice ──────────────────────────────────────────────────────────────

/**
 * Re-checks price for a specific car offer (rate key check).
 *
 * @param {object} offer — CarOffer (with offer.raw containing rateKey)
 * @returns {Promise<CarOffer>}
 */
async function getCarPrice(offer) {
  const rateKey = offer.raw?.rateDetails?.rateKey ?? offer.raw?.rateKey;
  if (!rateKey) throw new CarHireAdapterError('Missing rateKey in offer', 400);

  let res;
  try {
    res = await axios.get(`${BASE_URL}/vehicles/checkrate`, {
      headers: _buildHeaders(),
      timeout: 15000,
      params:  { rateKey },
    });
  } catch (err) {
    throw new CarHireAdapterError(
      err.response?.data?.message ?? err.message,
      err.response?.status ?? 502,
      err.response?.data
    );
  }

  const vehicle = res.data?.vehicle ?? res.data;
  return _toCarOffer(vehicle, offer.pickupDate, offer.dropoffDate, offer.currency);
}

// ─── Error type ───────────────────────────────────────────────────────────────

class CarHireAdapterError extends Error {
  constructor(message, statusCode = 502, raw = null) {
    super(message);
    this.name       = 'CarHireAdapterError';
    this.statusCode = statusCode;
    this.raw        = raw;
  }
}

module.exports = { searchCars, getCarPrice, CarHireAdapterError, _toCarOffer };
