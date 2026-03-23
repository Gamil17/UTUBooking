'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

const readPool = new Pool({
  connectionString: process.env.READ_DATABASE_URL ?? process.env.DATABASE_URL,
  max: 20,
});

module.exports = { pool, readPool };
