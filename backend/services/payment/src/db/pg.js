require('dotenv').config();
const { Pool } = require('pg');

// Payment service: all writes go to primary. Audit log reads can use replica.
const pool = new Pool({
  connectionString:        process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

// Read pool for payment audit log queries (non-critical reads)
const readPool = new Pool({
  connectionString:        process.env.READ_DATABASE_URL || process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg] unexpected pool error:', err.message);
});
readPool.on('error', (err) => {
  console.error('[pg-read] unexpected pool error:', err.message);
});

module.exports = { pool, readPool };
