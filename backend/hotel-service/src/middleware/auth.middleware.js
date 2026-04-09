'use strict';

/**
 * authMiddleware — JWT role-guard for hotel-service protected routes.
 *
 * Usage:
 *   router.use(authMiddleware(['admin', 'sales']));
 *   router.post('/cache/clear', authMiddleware(['admin']), handler);
 *
 * Populates req.user = { id, email, role, countryCode } on success.
 * Returns 401 for missing/invalid/expired tokens, 403 for wrong role.
 */

const jwt = require('jsonwebtoken');

/**
 * @param {string[]} allowedRoles - Roles that may access the route
 * @returns {import('express').RequestHandler}
 */
function authMiddleware(allowedRoles) {
  return function (req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing access token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error:   expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: expired ? 'Access token has expired. Please refresh.' : 'Invalid access token.',
      });
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      return res.status(403).json({
        error:   'FORBIDDEN',
        message: `Access restricted to: ${allowedRoles.join(', ')}`,
      });
    }

    req.user = {
      id:          payload.sub ?? payload.id,
      email:       payload.email,
      role:        payload.role,
      countryCode: payload.countryCode ?? payload.country ?? 'SA',
    };

    next();
  };
}

module.exports = { authMiddleware };
