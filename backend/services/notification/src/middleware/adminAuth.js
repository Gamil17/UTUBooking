'use strict';

const { timingSafeEqual } = require('crypto');

/**
 * adminAuth — Bearer token middleware for admin routes.
 * Validates against ADMIN_SECRET environment variable.
 * Uses timingSafeEqual to prevent timing attacks.
 */
function adminAuth(req, res, next) {
  const secret   = process.env.ADMIN_SECRET ?? '';
  const provided = (req.headers.authorization ?? '').replace(/^Bearer\s+/, '');
  let ok = false;
  try { ok = !!secret && timingSafeEqual(Buffer.from(provided), Buffer.from(secret)); } catch { ok = false; }
  if (!ok) {
    return res.status(401).json({
      error:   'UNAUTHORIZED',
      message: 'Valid admin token required',
    });
  }
  next();
}

module.exports = adminAuth;
