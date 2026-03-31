'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:        process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 5_000,
});

const readPool = new Pool({
  connectionString:        process.env.READ_DATABASE_URL || process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error',     (err) => console.error('[notification-db] pool error:', err.message));
readPool.on('error', (err) => console.error('[notification-db-read] pool error:', err.message));

module.exports = { pool, readPool };
