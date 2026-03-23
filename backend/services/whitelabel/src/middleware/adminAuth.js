'use strict';

/**
 * Require Bearer ADMIN_SECRET in Authorization header.
 * Same pattern as the AI chat admin endpoint.
 * Not user-facing — only called by UTUBooking ops tooling.
 */
function adminAuth(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization || authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid admin token required' });
  }
  next();
}

module.exports = adminAuth;
