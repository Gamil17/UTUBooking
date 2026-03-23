'use strict';

require('dotenv').config();
const express      = require('express');
const flightsRouter = require('./src/routes/flights.router');
const errorHandler  = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '64kb' }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'flight-service' }));

// Routes
app.use('/api/v1/flights', flightsRouter);

// Error handler — must be last
app.use(errorHandler);

module.exports = app;
