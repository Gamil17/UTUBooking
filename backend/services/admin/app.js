'use strict';

/**
 * UTUBooking Admin Service (port 3012)
 *
 * Exposes internal infrastructure management endpoints.
 * All routes require Bearer <ADMIN_SECRET> authorization.
 *
 * Routes:
 *   GET  /health                                 — service liveness probe
 *   GET  /api/admin/infrastructure/health        — multi-region DB + Redis health
 *   GET  /api/admin/infrastructure/routing-audit — data residency routing audit
 *   GET  /api/admin/infrastructure/iran-isolation — OFAC isolation check (post-legal-clearance only)
 */

require('dotenv').config();

const express            = require('express');
const infraHealthRouter  = require('./src/routes/infrastructure.health');
const iranIsolationRouter = require('./src/routes/iran.isolation');

const PORT = parseInt(process.env.ADMIN_PORT ?? '3012', 10);
const app  = express();

app.use(express.json({ limit: '64kb' }));

// Liveness probe — no auth required (used by ECS health check target)
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'admin-service', ts: new Date().toISOString() })
);

app.use('/api/admin/infrastructure', infraHealthRouter);
app.use('/api/admin/infrastructure', iranIsolationRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[admin-service] unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`[admin-service] listening on port ${PORT}`)
  );
}

module.exports = app;
