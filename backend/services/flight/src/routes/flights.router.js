'use strict';

const { Router }    = require('express');
const flightCtrl    = require('../controllers/flightCtrl');

const router = Router();

// GET  /api/v1/flights/search  — Amadeus primary, Sabre failover
router.get('/search', flightCtrl.searchFlights);

// POST /api/v1/flights/order   — GDS dispatch by offer.source
router.post('/order', flightCtrl.createOrder);

module.exports = router;
