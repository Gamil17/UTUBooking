'use strict';

const { Pool } = require('pg');

// Write pool: new bookings, status updates → primary
const pool = new Pool({
  connectionString:        process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

// Read pool: trip history, booking lookup → read replica
const readPool = new Pool({
  connectionString:        process.env.READ_DATABASE_URL || process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('[booking-db] pool error:', err.message));
readPool.on('error', (err) => console.error('[booking-db-read] pool error:', err.message));

module.exports = { pool, readPool };
