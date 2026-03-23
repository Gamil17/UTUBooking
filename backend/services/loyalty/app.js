'use strict';

require('dotenv').config();
const express       = require('express');
const loyaltyRouter = require('./src/routes/loyalty.router');
const errorHandler  = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'loyalty-service' }));

app.use('/api/v1/loyalty', loyaltyRouter);

app.use(errorHandler);

module.exports = app;
