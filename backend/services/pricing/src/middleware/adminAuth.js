'use strict';

/**
 * Require Bearer ADMIN_SECRET in Authorization header.
 * Only called by UTUBooking ops tooling / admin dashboard.
 */
function adminAuth(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization || authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid admin token required' });
  }
  next();
}

module.exports = adminAuth;
