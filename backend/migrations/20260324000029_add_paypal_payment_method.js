/**
 * Migration: Add PayPal payment_method enum value
 *
 * New value:
 *   paypal  — PayPal Orders API v2 (US primary, global fallback)
 *
 * Run against all shard DBs:
 *   bash backend/scripts/migrate-all-shards.sh
 *
 * Run against a single DB:
 *   DATABASE_URL=<connection_string> npm run migrate:up
 */

// node-pg-migrate API: pgm object — NOT knex syntax

exports.up = (pgm) => {
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'paypal'`);
};

// PostgreSQL does not support removing enum values — down migration is a no-op.
exports.down = (pgm) => {
  pgm.sql(`
    -- Cannot remove enum values in PostgreSQL.
    -- This migration is intentionally irreversible.
    SELECT 1;
  `);
};
