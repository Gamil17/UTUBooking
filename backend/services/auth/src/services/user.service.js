const bcrypt     = require('bcrypt');
const { pool }   = require('../db/pg');

const BCRYPT_ROUNDS = 12; // cost factor: ~250ms on modern hardware

// ─── Queries ──────────────────────────────────────────────────────────────────

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role
       FROM users
      WHERE email = $1
        AND is_active = TRUE
      LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, role
       FROM users
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function emailExists(email) {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return rows.length > 0;
}

async function createUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role)
          VALUES ($1, $2, 'user')
     RETURNING id, email, role`,
    [email.toLowerCase().trim(), passwordHash]
  );
  return rows[0];
}

// Returns true if plaintext matches the stored bcrypt hash
async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

module.exports = { findByEmail, findById, emailExists, createUser, verifyPassword };
