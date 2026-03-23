require('dotenv').config();
const express      = require('express');
const authRouter   = require('./src/routes/auth.router');
const errorHandler = require('./src/middleware/errorHandler');

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
app.use('/api/auth', authRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ error: 'NOT_FOUND' })
);

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
