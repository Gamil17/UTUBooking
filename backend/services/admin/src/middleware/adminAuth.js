'use strict';

/**
 * adminAuth — Bearer token middleware for admin routes.
 * Validates against ADMIN_SECRET environment variable.
 * Same pattern as pricing + whitelabel services.
 */
function adminAuth(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization || authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({
      error:   'UNAUTHORIZED',
      message: 'Valid admin token required',
    });
  }
  next();
}

module.exports = adminAuth;
