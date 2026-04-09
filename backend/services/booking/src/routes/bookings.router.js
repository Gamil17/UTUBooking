'use strict';

const { Router }           = require('express');
const { timingSafeEqual }  = require('crypto');
const bookingController     = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/authenticate');

const router = Router();

function safeEqual(a, b) {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ── Service-to-service: by referenceNo (uses ADMIN_SECRET, not user JWT) ──────
router.get('/by-ref/:ref', (req, res, next) => {
  const secret   = process.env.ADMIN_SECRET;
  const provided = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (!secret || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  return next();
}, bookingController.getBookingByRef);

// ── Service-to-service: buyer contact for payment gateways (uses INTERNAL_API_SECRET) ──
router.get('/:id/contact', (req, res, next) => {
  const secret   = process.env.INTERNAL_API_SECRET;
  const provided = req.headers['x-internal-secret'] ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  return next();
}, bookingController.getBookingContact);

// All other booking routes require a valid user JWT
router.use(authenticateToken);

router.post('/',      bookingController.createBooking);
router.get('/',       bookingController.listBookings);
router.get('/:id',    bookingController.getBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
