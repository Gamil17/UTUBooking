require('dotenv').config();
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const redis  = require('./redis.service');

const ACCESS_TTL  = 15 * 60;        // 15 minutes (seconds)
const REFRESH_TTL = 7 * 24 * 3600;  // 7 days (seconds)

// ─── Key builders ─────────────────────────────────────────────────────────────

function refreshKey(userId, jti) {
  return `refresh:${userId}:${jti}`;
}

// ─── Access token ─────────────────────────────────────────────────────────────

function generateAccessToken(user) {
  const payload = {
    sub:   user.id,
    email: user.email,
    role:  user.role,
    type:  'access',
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TTL,
    algorithm: 'HS256',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

// ─── Refresh token ────────────────────────────────────────────────────────────

function generateRefreshToken(userId) {
  const jti = crypto.randomUUID(); // unique ID per token — enables per-token revocation
  const payload = { sub: userId, jti, type: 'refresh' };
  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    algorithm: 'HS256',
  });
  return { token, jti };
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
}

// ─── Redis lifecycle ──────────────────────────────────────────────────────────

async function storeRefreshToken(userId, jti) {
  // Value '1' — presence of key means valid; TTL matches JWT expiry
  await redis.setex(refreshKey(userId, jti), REFRESH_TTL, '1');
}

async function isRefreshTokenValid(userId, jti) {
  return redis.exists(refreshKey(userId, jti));
}

async function revokeRefreshToken(userId, jti) {
  await redis.del(refreshKey(userId, jti));
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  ACCESS_TTL,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
};
