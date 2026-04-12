'use strict';

require('dotenv').config();

const express = require('express');
const jwt     = require('jsonwebtoken');
const { timingSafeEqual } = require('crypto');

const app = express();
app.use(express.json({ limit: '64kb' }));

// ── Auth middleware ───────────────────────────────────────────────────────────

const ADMIN_ROLES = new Set(['admin', 'country_admin', 'super_admin']);

// Service-to-service calls use x-admin-secret header (same pattern as admin service)
function checkAdminSecret(req) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!provided) return false;
  try {
    const a = Buffer.from(secret);
    const b = Buffer.alloc(a.length);
    Buffer.from(provided).copy(b);
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const SERVICE_ACCOUNT = {
  sub: 'system', email: 'system@internal',
  role: 'super_admin', name: 'System',
};

// Any admin role — used for most workflow operations
function requireAdmin(req, res, next) {
  if (checkAdminSecret(req)) {
    // Service-to-service: honour x-initiated-by header so the real actor is recorded
    const initiatedBy = req.headers['x-initiated-by'];
    req.user = initiatedBy
      ? { ...SERVICE_ACCOUNT, email: initiatedBy }
      : SERVICE_ACCOUNT;
    return next();
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (!ADMIN_ROLES.has(payload.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

// Super-admin only — for activating/archiving definitions
function requireSuperAdmin(req, res, next) {
  if (checkAdminSecret(req)) { req.user = SERVICE_ACCOUNT; return next(); }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'super_admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'workflow-service', port: 3014 })
);

// ── Routes ────────────────────────────────────────────────────────────────────

const definitionsRouter = require('./src/routes/definitions.router');
const instancesRouter   = require('./src/routes/instances.router');
const approvalsRouter   = require('./src/routes/approvals.router');
const tasksRouter       = require('./src/routes/tasks.router');
const analyticsRouter   = require('./src/routes/analytics.router');

app.use('/api/workflow/definitions', requireAdmin, definitionsRouter);
app.use('/api/workflow/instances',   requireAdmin, instancesRouter);
app.use('/api/workflow/approvals',   requireAdmin, approvalsRouter);
app.use('/api/workflow/tasks',       requireAdmin, tasksRouter);
app.use('/api/workflow/analytics',   requireAdmin, analyticsRouter);

// ── Start SLA timer ───────────────────────────────────────────────────────────
// Runs every 15 minutes: checks SLA deadlines, sends reminders, escalates overdue steps

const { startSlaTimer } = require('./src/engine/sla-timer');
startSlaTimer();

// ── 404 / Error ───────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error('[workflow-service]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

module.exports = app;
