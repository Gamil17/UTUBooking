'use strict';

/**
 * Partnership Service
 *
 * Matches live hotel search results against the hotel_partnerships table
 * and overlays direct-partner metadata (isDirectPartner, commissionRate,
 * tier, partnerPerks) onto HotelOffer objects.
 *
 * Strategy:
 *  1. Primary match: hotelbedsCode === offer.id  (exact)
 *  2. Fallback match: normalised hotel name contains partner name slug
 *
 * In production, partner records are loaded from the DB (via getShardPool('SA'))
 * and cached in Redis for 10 minutes to avoid per-request DB hits.
 * In dev/test, falls back to backend/config/hotel-partnerships.json.
 */

const path = require('path');
const { createClient } = require('ioredis');

// ─── Redis client (shared — reuse if already initialised) ─────────────────────
let _redis = null;
function _getRedis() {
  if (!_redis) {
    _redis = new createClient({ host: process.env.REDIS_HOST || '127.0.0.1', port: 6379 });
    _redis.on('error', (err) => console.error('[partnership.service] Redis error:', err.message));
  }
  return _redis;
}

// ─── DB pool (only imported in prod) ─────────────────────────────────────────
let _getShardPool = null;
function _getPool(countryCode) {
  if (!_getShardPool) {
    // Dynamic require so service boots in test environments without a DB
    try {
      ({ getShardPool: _getShardPool } = require('../../shared/shard-router.js'));
    } catch {
      return null;
    }
  }
  return _getShardPool(countryCode);
}

// ─── Config fallback (dev / offline) ──────────────────────────────────────────
let _localPartners = null;
function _loadLocalPartners() {
  if (!_localPartners) {
    try {
      const cfg = require(path.resolve(__dirname, '../../../../config/hotel-partnerships.json'));
      _localPartners = cfg.partners || [];
    } catch {
      _localPartners = [];
    }
  }
  return _localPartners;
}

const CACHE_KEY = 'partnerships:active';
const CACHE_TTL_SEC = 600; // 10 minutes

// ─── Load partners ─────────────────────────────────────────────────────────────

/**
 * Return all active partners, from Redis cache → DB → local JSON fallback.
 * @returns {Promise<Array>}
 */
async function _loadPartners() {
  const redis = _getRedis();

  // 1. Redis cache
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* cache miss — continue */ }

  // 2. DB
  const pool = _getPool('SA');
  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT
           hotelbeds_hotel_code AS "hotelbedsCode",
           hotel_name_en        AS "nameEn",
           hotel_name_ar        AS "nameAr",
           commission_rate      AS "commissionRate",
           tier,
           distance_haram_m     AS "distanceHaramM",
           partner_perks        AS "perks",
           status
         FROM hotel_partnerships
         WHERE status = 'active'
           AND contract_end >= CURRENT_DATE`
      );

      try {
        await redis.setex(CACHE_KEY, CACHE_TTL_SEC, JSON.stringify(rows));
      } catch { /* non-fatal */ }

      return rows;
    } catch (err) {
      console.error('[partnership.service] DB query failed, using local fallback:', err.message);
    }
  }

  // 3. Local JSON fallback (dev / test)
  return _loadLocalPartners().filter((p) => p.status === 'active');
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Normalise a hotel name to a slug for fuzzy matching.
 * "Swissotel Makkah" → "swissotel makkah"
 */
function _slug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

/**
 * Find a partner record that matches a HotelOffer, or null.
 * @param {object} offer  - HotelOffer from Hotelbeds or Booking.com adapter
 * @param {Array}  partners
 * @returns {object|null}
 */
function _matchPartner(offer, partners) {
  // Primary: exact Hotelbeds code match
  const byCode = partners.find((p) => p.hotelbedsCode === offer.id);
  if (byCode) return byCode;

  // Fallback: name slug match (handles minor name variations)
  const offerSlug = _slug(offer.name?.en || '');
  return partners.find((p) => {
    const partnerSlug = _slug(p.nameEn);
    // Both strings must be at least 6 chars to avoid false positives
    return partnerSlug.length >= 6 && offerSlug.includes(partnerSlug);
  }) || null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Overlay direct-partner metadata onto an array of HotelOffers.
 *
 * Fields added to matching offers:
 *   isDirectPartner  {boolean}  true
 *   commissionRate   {number}   e.g. 15.0
 *   partnerTier      {string}   'bronze' | 'silver' | 'gold' | 'platinum'
 *   partnerPerks     {object}   amenity flags from the partnership record
 *
 * Non-matching offers are returned unchanged (isDirectPartner: false).
 *
 * @param {Array} offers - HotelOffer[]
 * @returns {Promise<Array>}  same array, mutated in-place
 */
async function overlayPartnerData(offers) {
  if (!offers || offers.length === 0) return offers;

  let partners;
  try {
    partners = await _loadPartners();
  } catch (err) {
    console.error('[partnership.service] Failed to load partners — skipping overlay:', err.message);
    return offers; // degrade gracefully; don't block search results
  }

  if (!partners.length) return offers;

  for (const offer of offers) {
    const partner = _matchPartner(offer, partners);
    if (partner) {
      offer.isDirectPartner = true;
      offer.commissionRate  = Number(partner.commissionRate);
      offer.partnerTier     = partner.tier;
      // Merge partner perks into halalAmenities so the UI halal-filter can use them
      offer.halalAmenities  = { ...(offer.halalAmenities || {}), ...(partner.perks || {}) };
      offer.distanceHaramM  = offer.distanceHaramM ?? partner.distanceHaramM ?? null;
    } else {
      offer.isDirectPartner = false;
    }
  }

  // Re-sort: platinum/gold direct partners float to top within the same price band (±10%)
  offers.sort((a, b) => {
    const TIER_WEIGHT = { platinum: 0, gold: 1, silver: 2, bronze: 3, undefined: 4 };
    const priceBandA = Math.floor(a.pricePerNight / 10) * 10;
    const priceBandB = Math.floor(b.pricePerNight / 10) * 10;
    if (priceBandA !== priceBandB) return priceBandA - priceBandB; // cheapest first
    // Same price band: direct partners by tier first
    if (a.isDirectPartner !== b.isDirectPartner) return a.isDirectPartner ? -1 : 1;
    return (TIER_WEIGHT[a.partnerTier] ?? 4) - (TIER_WEIGHT[b.partnerTier] ?? 4);
  });

  return offers;
}

/**
 * Invalidate the Redis partner cache (call after admin creates/updates a partnership).
 */
async function invalidatePartnerCache() {
  const redis = _getRedis();
  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    console.warn('[partnership.service] Cache invalidation failed:', err.message);
  }
}

/**
 * Return all active partners for a given country (used by admin/sales dashboards).
 * @param {string} countryCode ISO-2
 * @returns {Promise<Array>}
 */
async function getPartnersByCountry(countryCode) {
  const all = await _loadPartners();
  return all.filter((p) => p.countryCode === countryCode.toUpperCase());
}

module.exports = { overlayPartnerData, invalidatePartnerCache, getPartnersByCountry };
