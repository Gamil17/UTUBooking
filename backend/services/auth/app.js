require('dotenv').config();
const express        = require('express');
const authRouter     = require('./src/routes/auth.router');
const gdprRouter     = require('./src/routes/gdpr.router');
const ccpaRouter     = require('./src/routes/ccpa.router');
const pipedaRouter   = require('./src/routes/pipeda.router');
const lgpdRouter     = require('./src/routes/lgpd.router');
const authMiddleware = require('./src/middleware/auth.middleware');
const errorHandler   = require('./src/middleware/errorHandler');

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));

// Reject requests with Content-Type other than application/json on POST routes
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(415).json({
        error:   'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
      });
    }
  }
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'auth-service', ts: new Date().toISOString() })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
// GDPR user rights — Art. 15/17/20 endpoints (JWT required)
app.use('/api/user/gdpr', authMiddleware, gdprRouter);
// CCPA user rights — Cal. Civ. Code §1798.100+ (JWT required)
app.use('/api/user/ccpa', authMiddleware, ccpaRouter);
// PIPEDA + Quebec Law 25 user rights — Canadian Privacy (JWT required)
app.use('/api/user/pipeda', authMiddleware, pipedaRouter);
// LGPD user rights — Brazilian Lei Geral de Proteção de Dados (JWT required)
app.use('/api/user/lgpd',   authMiddleware, lgpdRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ error: 'NOT_FOUND' })
);

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
