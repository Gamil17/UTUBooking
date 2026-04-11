require('dotenv').config();
const express        = require('express');
const authRouter     = require('./src/routes/auth.router');
const adminRouter    = require('./src/routes/admin.router');
const careersRouter  = require('./src/routes/careers.router');
const contactRouter  = require('./src/routes/contact.router');
const { publicRouter: jobsPublicRouter, adminRouter: jobsAdminRouter } = require('./src/routes/jobs.router');
const { publicRouter: blogPublicRouter, adminRouter: blogAdminRouter } = require('./src/routes/blog.router');
const { publicRouter: promosPublicRouter, adminRouter: promosAdminRouter } = require('./src/routes/promos.router');
const gdprRouter     = require('./src/routes/gdpr.router');
const ccpaRouter     = require('./src/routes/ccpa.router');
const pipedaRouter   = require('./src/routes/pipeda.router');
const lgpdRouter      = require('./src/routes/lgpd.router');
const whatsappRouter  = require('./src/routes/whatsapp.router');
const authMiddleware  = require('./src/middleware/auth.middleware');
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
app.use('/api/auth',           authRouter);
app.use('/api/admin',          adminRouter);
app.use('/api/admin/careers',  careersRouter);
app.use('/api/admin/contact',  contactRouter);
app.use('/api/admin/jobs',     jobsAdminRouter);
app.use('/api/jobs',           jobsPublicRouter);
app.use('/api/admin/blog',     blogAdminRouter);
app.use('/api/blog',           blogPublicRouter);
app.use('/api/admin/promos',   promosAdminRouter);
app.use('/api/promos',         promosPublicRouter);
// GDPR user rights — Art. 15/17/20 endpoints (JWT required)
app.use('/api/user/gdpr', authMiddleware, gdprRouter);
// CCPA user rights — Cal. Civ. Code §1798.100+ (JWT required)
app.use('/api/user/ccpa', authMiddleware, ccpaRouter);
// PIPEDA + Quebec Law 25 user rights — Canadian Privacy (JWT required)
app.use('/api/user/pipeda', authMiddleware, pipedaRouter);
// LGPD user rights — Brazilian Lei Geral de Proteção de Dados (JWT required)
app.use('/api/user/lgpd',   authMiddleware, lgpdRouter);
// WhatsApp opt-in / opt-out + Meta webhook (x-internal-secret gated)
app.use('/api/v1/whatsapp', whatsappRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ error: 'NOT_FOUND' })
);

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
