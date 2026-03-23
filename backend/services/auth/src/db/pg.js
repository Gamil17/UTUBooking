require('dotenv').config();
const { Pool } = require('pg');

// Auth service: writes only — single primary pool (no read replica needed)
const pool = new Pool({
  connectionString:        process.env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg] unexpected pool error:', err.message);
});

module.exports = { pool };
