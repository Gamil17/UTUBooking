'use strict';

/**
 * JWT access token middleware (stateless verify — no Redis check needed here,
 * that is handled by auth-service on login/refresh).
 * Populates req.user = { id, email, role }.
 */

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing access token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    return res.status(401).json({ error: 'UNAUTHORIZED', message });
  }
}

module.exports = { authenticateToken };
