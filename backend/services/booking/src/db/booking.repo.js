'use strict';

const pool = require('./pg');

/**
 * Create a new booking record.
 * @param {object} data
 * @param {string} data.userId
 * @param {string} data.productType  — 'hotel' | 'flight' | 'car'
 * @param {string} data.offerId      — UUID of the offer row
 * @param {number} data.totalPrice
 * @param {string} data.currency
 * @param {string} data.referenceNo  — human-readable booking ref (e.g. UTU-20260307-ABC1)
 * @param {object} [data.meta]       — arbitrary jsonb payload
 */
async function createBooking({ userId, productType, offerId, totalPrice, currency, referenceNo, meta = {} }) {
  const { rows } = await pool.query(
    `INSERT INTO bookings
       (user_id, product_type, offer_id, total_price, currency, reference_no, status, meta)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     RETURNING *`,
    [userId, productType, offerId, totalPrice, currency, referenceNo, meta]
  );
  return rows[0];
}

/**
 * Update booking status (and optionally confirmed_at).
 */
async function updateBookingStatus(bookingId, status) {
  const confirmedAt = status === 'confirmed' ? new Date() : null;
  const { rows } = await pool.query(
    `UPDATE bookings
     SET status = $1, confirmed_at = COALESCE($2, confirmed_at), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, confirmedAt, bookingId]
  );
  return rows[0] ?? null;
}

/**
 * Fetch a single booking by ID, including payment status.
 */
async function getBookingById(bookingId) {
  const { rows } = await pool.query(
    `SELECT b.*, p.status AS payment_status, p.method AS payment_method
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE b.id = $1
     LIMIT 1`,
    [bookingId]
  );
  return rows[0] ?? null;
}

/**
 * List bookings for a user with optional status filter.
 */
async function listUserBookings(userId, { status, limit = 20, offset = 0 } = {}) {
  const conditions = ['b.user_id = $1'];
  const values     = [userId];

  if (status) {
    values.push(status);
    conditions.push(`b.status = $${values.length}`);
  }

  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT b.*, p.status AS payment_status
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return rows;
}

/**
 * Cancel a booking (only if status is 'pending').
 */
async function cancelBooking(bookingId, userId) {
  const { rows } = await pool.query(
    `UPDATE bookings
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING *`,
    [bookingId, userId]
  );
  return rows[0] ?? null;
}

/**
 * Persist Mehram verification data collected during PK/IN Hajj/Umrah checkout.
 * @param {string} bookingId
 * @param {object} payload — from MehramVerification.buildMehramPayload()
 */
async function updateMehramData(bookingId, {
  mehram_required,
  mehram_companion_name,
  mehram_relationship,
  mehram_group_operator,
  mehram_verified_at,
}) {
  const { rows } = await pool.query(
    `UPDATE bookings
     SET mehram_required       = $1,
         mehram_companion_name = $2,
         mehram_relationship   = $3,
         mehram_group_operator = $4,
         mehram_verified_at    = $5,
         updated_at            = NOW()
     WHERE id = $6
     RETURNING id, mehram_required, mehram_verified_at`,
    [mehram_required, mehram_companion_name, mehram_relationship, mehram_group_operator, mehram_verified_at, bookingId]
  );
  return rows[0] ?? null;
}

module.exports = { createBooking, updateBookingStatus, getBookingById, listUserBookings, cancelBooking, updateMehramData };
