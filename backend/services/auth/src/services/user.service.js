const bcrypt     = require('bcryptjs');
const { pool }   = require('../db/pg');

const BCRYPT_ROUNDS = 12; // cost factor: ~250ms on modern hardware

// ─── Queries ──────────────────────────────────────────────────────────────────

async function findByEmail(email) {
  // Returns user regardless of status — callers check status themselves
  // so pending/rejected users get proper error messages rather than INVALID_CREDENTIALS
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role, COALESCE(status, 'active') AS status
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, role, COALESCE(status, 'active') AS status
       FROM users
      WHERE id = $1
        AND COALESCE(status, 'active') = 'active'
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function touchLastSeen(userId) {
  await pool.query(
    `UPDATE users SET last_seen_at = NOW() WHERE id = $1`,
    [userId]
  );
}

async function emailExists(email) {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return rows.length > 0;
}

async function createUser({ email, password, name, country }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const displayName  = name?.trim() || email.split('@')[0];
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, name, status, country)
          VALUES ($1, $2, 'user', $3, 'pending', $4)
     RETURNING id, email, role, status`,
    [email.toLowerCase().trim(), passwordHash, displayName, country?.toUpperCase() || null]
  );
  return rows[0];
}

async function createCorporateUser({ email, password, name, corporate_account_id }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const displayName  = name?.trim() || email.split('@')[0];
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, name, status, corporate_account_id)
          VALUES ($1, $2, 'corporate', $3, 'active', $4)
     RETURNING id, email, role, status, corporate_account_id`,
    [email.toLowerCase().trim(), passwordHash, displayName, corporate_account_id]
  );
  return rows[0];
}

// Returns true if plaintext matches the stored bcrypt hash
async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

async function updatePassword(userId, newPlaintext) {
  const passwordHash = await bcrypt.hash(newPlaintext, BCRYPT_ROUNDS);
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, userId]
  );
}

module.exports = { findByEmail, findById, emailExists, createUser, createCorporateUser, verifyPassword, touchLastSeen, updatePassword };
