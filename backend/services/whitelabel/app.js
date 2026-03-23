'use strict';

require('dotenv').config();
const express       = require('express');
const adminRouter   = require('./src/routes/admin.router');
const publicRouter  = require('./src/routes/public.router');
const errorHandler  = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'whitelabel-service' }));

// Admin routes — require Bearer ADMIN_SECRET
app.use('/api/admin/tenants', adminRouter);

// Public routes — branding lookup for middleware/edge, no auth required
app.use('/api/tenants', publicRouter);

app.use(errorHandler);

module.exports = app;
