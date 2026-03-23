'use strict';

require('dotenv').config();
const express      = require('express');
const carsRouter   = require('./src/routes/cars.router');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'car-service' }));

app.use('/api/v1/cars', carsRouter);

app.use(errorHandler);

module.exports = app;
