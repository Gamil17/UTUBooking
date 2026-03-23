'use strict';

const { Router }           = require('express');
const bookingController     = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/authenticate');

const router = Router();

// All booking routes require a valid JWT
router.use(authenticateToken);

router.post('/',    bookingController.createBooking);
router.get('/',     bookingController.listBookings);
router.get('/:id',  bookingController.getBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
