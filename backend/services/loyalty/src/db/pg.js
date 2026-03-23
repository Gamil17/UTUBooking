'use strict';

const { Pool } = require('pg');

// Write pool: points ledger writes, reward redemptions → primary
const pool = new Pool({
  connectionString:        process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

// Read pool: points balance reads, reward catalog → read replica
const readPool = new Pool({
  connectionString:        process.env.READ_DATABASE_URL || process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('[loyalty-service] pg pool error:', err.message));
readPool.on('error', (err) => console.error('[loyalty-service] pg-read pool error:', err.message));

module.exports = { pool, readPool };
