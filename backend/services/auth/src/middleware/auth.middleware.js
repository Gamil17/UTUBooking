'use strict';

/**
 * authMiddleware — verifies JWT access token on protected routes.
 *
 * Populates req.user = { id, email, role, countryCode } on success.
 * Returns 401 for missing/expired/invalid tokens.
 *
 * Used by: GDPR router at /api/user/gdpr/*
 */

const tokenService = require('../services/token.service');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:   'UNAUTHORIZED',
      message: 'Authorization header with Bearer token required.',
    });
  }

  const token = authHeader.slice(7); // strip 'Bearer '

  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error:   expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: expired
        ? 'Access token has expired. Please refresh.'
        : 'Invalid access token.',
    });
  }

  // Populate req.user from JWT claims
  req.user = {
    id:          payload.sub,
    email:       payload.email,
    role:        payload.role,
    countryCode: payload.countryCode ?? payload.country ?? 'SA',
  };

  next();
}

module.exports = authMiddleware;
