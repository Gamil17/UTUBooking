'use strict';

/**
 * hotel.repo.js — Local DB fallback for hotel search
 *
 * Used when external providers (Hotelbeds, Booking.com) are unavailable,
 * typically in local dev without API keys.
 */

const { Pool } = require('pg');

let _pool = null;

function _getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    _pool.on('error', (err) => console.error('[hotel.repo] DB pool error:', err.message));
  }
  return _pool;
}

/**
 * Search hotel_offers in local DB — mirrors the shape returned by the Hotelbeds adapter.
 *
 * @param {string} location     e.g. 'Makkah'
 * @param {string} checkIn      ISO date string
 * @param {string} checkOut     ISO date string
 * @param {number} guests
 * @param {object} opts         { stars, priceMin, priceMax, currency, isHajj, isUmrah, halalFriendly }
 * @returns {Promise<object[]>}
 */
async function searchLocalHotels(location, checkIn, checkOut, guests, opts = {}) {
  const pool = _getPool();

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
  );

  const conditions = [`LOWER(location) LIKE LOWER($1)`, `is_active = true`];
  const values     = [`%${location}%`];
  let   idx        = 2;

  if (opts.stars) {
    conditions.push(`stars = $${idx++}`);
    values.push(opts.stars);
  }
  if (opts.priceMin != null) {
    conditions.push(`price_per_night >= $${idx++}`);
    values.push(opts.priceMin);
  }
  if (opts.priceMax != null) {
    conditions.push(`price_per_night <= $${idx++}`);
    values.push(opts.priceMax);
  }
  if (opts.isHajj) {
    conditions.push(`is_hajj_package = true`);
  }
  if (opts.isUmrah) {
    conditions.push(`is_umrah_package = true`);
  }
  if (opts.halalFriendly) {
    conditions.push(`is_halal_friendly = true`);
  }

  const sql = `
    SELECT id, hotel_id, name, name_ar, stars, location,
           distance_haram_m, price_per_night, currency,
           is_hajj_package, is_umrah_package, amenities,
           halal_amenities, is_halal_friendly
    FROM hotel_offers
    WHERE ${conditions.join(' AND ')}
    ORDER BY distance_haram_m ASC NULLS LAST, price_per_night ASC
  `;

  const { rows } = await pool.query(sql, values);

  return rows.map((row) => ({
    id:               row.id,
    hotelId:          row.hotel_id,
    name:             { en: row.name, ar: row.name_ar || row.name },
    stars:            row.stars,
    city:             row.location,
    location:         row.location,
    distanceHaramM:   row.distance_haram_m,
    pricePerNight:    parseFloat(row.price_per_night),
    totalPrice:       parseFloat(row.price_per_night) * nights,
    currency:         row.currency,
    nights,
    guests,
    isHajjPackage:    row.is_hajj_package,
    isUmrahPackage:   row.is_umrah_package,
    amenities:        row.amenities || [],
    isHalalFriendly:  row.is_halal_friendly,
    halalAmenities:   row.halal_amenities,
    source:           'local',
  }));
}

module.exports = { searchLocalHotels };
