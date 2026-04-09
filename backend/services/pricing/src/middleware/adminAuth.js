'use strict';

const { timingSafeEqual } = require('crypto');

/**
 * Require Bearer ADMIN_SECRET in Authorization header.
 * Only called by UTUBooking ops tooling / admin dashboard.
 */
function adminAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'ADMIN_NOT_CONFIGURED' });
  }
  const provided = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const expected = secret;
  let authorized = false;
  try {
    authorized = provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch { /* length mismatch handled by === check above */ }
  if (!authorized) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid admin token required' });
  }
  next();
}

module.exports = adminAuth;
