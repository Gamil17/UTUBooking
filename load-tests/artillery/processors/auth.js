'use strict';

/**
 * Artillery processor: handles JWT authentication for booking flow scenarios.
 * Injects Authorization: Bearer <token> into all requests after login.
 */

const got = require('got');

const TARGET = process.env.LOAD_TEST_API_URL || 'https://api.utubooking.com';

// Token cache: keyed by email, stores { token, expiresAt }
const tokenCache = new Map();

async function getToken() {
  const email = process.env.LOAD_TEST_USER_EMAIL;
  const cached = tokenCache.get(email);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const response = await got.post(`${TARGET}/api/v1/auth/login`, {
    json: {
      email,
      password: process.env.LOAD_TEST_USER_PASSWORD,
    },
    responseType: 'json',
  });

  const token = response.body.accessToken;
  // JWT access tokens expire in 15m; cache for 14m
  tokenCache.set(email, { token, expiresAt: Date.now() + 14 * 60_000 });
  return token;
}

function injectAuthToken(requestParams, context, ee, next) {
  getToken()
    .then((token) => {
      requestParams.headers = requestParams.headers || {};
      requestParams.headers['Authorization'] = `Bearer ${token}`;
      context.vars.accessToken = token;
      return next();
    })
    .catch((err) => {
      console.error('[auth processor] token fetch failed:', err.message);
      return next(err);
    });
}

module.exports = { injectAuthToken };
