require('dotenv').config();
const express = require('express');
const hotelsRouter = require('./src/routes/hotels.router');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'hotel-service' }));

app.use('/api/v1/hotels', hotelsRouter);

app.use(errorHandler);

module.exports = app;
