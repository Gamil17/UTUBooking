'use strict';

const { Router }           = require('express');
const bookingController     = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/authenticate');

const router = Router();

// ── Service-to-service: by referenceNo (uses ADMIN_SECRET, not user JWT) ──────
router.get('/by-ref/:ref', (req, res, next) => {
  const secret = process.env.ADMIN_SECRET;
  const provided = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  return next();
}, bookingController.getBookingByRef);

// All other booking routes require a valid user JWT
router.use(authenticateToken);

router.post('/',      bookingController.createBooking);
router.get('/',       bookingController.listBookings);
router.get('/:id',    bookingController.getBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
