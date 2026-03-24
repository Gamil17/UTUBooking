'use strict';

'use strict';

const { Router }       = require('express');
const flightCtrl       = require('../controllers/flightCtrl');
const departuresCtrl   = require('../controllers/departures.controller');

const router = Router();

// GET  /api/v1/flights/search                    — Amadeus primary, Sabre failover
router.get('/search', flightCtrl.searchFlights);

// POST /api/v1/flights/order                     — GDS dispatch by offer.source
router.post('/order', flightCtrl.createOrder);

// GET  /api/v1/flights/departures?countryCode=US&tripType=umrah
//   Returns ordered list of suggested departure airports for Muslim travel packages
router.get('/departures', departuresCtrl.getDepartures);

module.exports = router;
