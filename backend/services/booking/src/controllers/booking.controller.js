'use strict';

/**
 * Booking Controller
 *
 * POST   /api/v1/bookings          — create booking (status: pending, awaiting payment)
 * GET    /api/v1/bookings          — list user's bookings
 * GET    /api/v1/bookings/:id      — get booking detail
 * DELETE /api/v1/bookings/:id      — cancel booking (pending only)
 *
 * Auth: req.user is populated by JWT middleware (auth service).
 * The booking record is created in 'pending' status.
 * The payment service updates status to 'confirmed' via its webhook handler.
 */

const { createBookingSchema, listBookingsSchema, validate } = require('../validators/booking.validator');
const repo = require('../db/booking.repo');
const { v4: uuidv4 } = require('uuid');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a human-readable booking reference: UTU-YYYYMMDD-XXXX */
function _generateRef() {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `UTU-${date}-${rand}`;
}

// ─── POST /api/v1/bookings ────────────────────────────────────────────────────

async function createBooking(req, res, next) {
  try {
    const { error, value } = validate(createBookingSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const userId = req.user.id; // set by authenticateToken middleware
    const { productType, offerId, totalPrice, currency, meta } = value;

    const booking = await repo.createBooking({
      userId,
      productType,
      offerId,
      totalPrice,
      currency,
      referenceNo: _generateRef(),
      meta,
    });

    return res.status(201).json({
      bookingId:   booking.id,
      referenceNo: booking.reference_no,
      status:      booking.status,
      productType: booking.product_type,
      totalPrice:  booking.total_price,
      currency:    booking.currency,
      createdAt:   booking.created_at,
      message:     'Booking created. Proceed to payment to confirm.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/bookings ─────────────────────────────────────────────────────

async function listBookings(req, res, next) {
  try {
    const { error, value } = validate(listBookingsSchema, req.query);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const bookings = await repo.listUserBookings(req.user.id, value);
    return res.json({ count: bookings.length, results: bookings });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/bookings/:id ─────────────────────────────────────────────────

async function getBooking(req, res, next) {
  try {
    const booking = await repo.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found' });
    }

    // Users can only see their own bookings
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    return res.json(booking);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/bookings/:id ──────────────────────────────────────────────

async function cancelBooking(req, res, next) {
  try {
    const cancelled = await repo.cancelBooking(req.params.id, req.user.id);

    if (!cancelled) {
      return res.status(409).json({
        error:   'CANNOT_CANCEL',
        message: 'Booking not found, already confirmed, or does not belong to you',
      });
    }

    return res.json({
      bookingId: cancelled.id,
      status:    cancelled.status,
      message:   'Booking cancelled successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBooking, listBookings, getBooking, cancelBooking };
