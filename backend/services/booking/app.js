'use strict';

require('dotenv').config();
const express         = require('express');
const bookingsRouter  = require('./src/routes/bookings.router');
const errorHandler    = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'booking-service' }));

app.use('/api/v1/bookings', bookingsRouter);

app.use(errorHandler);

module.exports = app;
