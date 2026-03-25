/**
 * Migration: Add European + TWINT payment_method enum values
 *
 * New values:
 *   sepa_debit    — SEPA Direct Debit (DE, FR, NL, BE, IT, ES, AT, etc.)
 *   ideal         — iDEAL (Netherlands — 65% market share)
 *   bancontact    — Bancontact (Belgium)
 *   klarna        — Klarna BNPL (UK, DE, FR, SE, AT, etc.)
 *   blik          — BLIK (Poland — 90% mobile market share)
 *   stripe_element — intermediate value before method is resolved from webhook
 *   twint         — TWINT (Switzerland — 80% Swiss mobile payments)
 *   apple_pay     — Apple Pay (already used but not in enum)
 *   google_pay    — Google Pay (already used but not in enum)
 *
 * Note: Giropay was discontinued by Stripe on 30 June 2024 — not added.
 *       Sofort deprecated by Stripe — not added (use klarna instead).
 *
 * Run against all shard DBs:
 *   bash backend/scripts/migrate-all-shards.sh
 *
 * Run against a single DB:
 *   DATABASE_URL=<connection_string> npm run migrate:up
 */

// node-pg-migrate API: pgm object — NOT knex syntax

exports.up = (pgm) => {
  // ALTER TYPE ... ADD VALUE is idempotent in PG 14+.
  // node-pg-migrate runs SQL directly via pgm.sql().
  // We add values one by one — PostgreSQL does not support adding multiple
  // enum values in a single ALTER TYPE statement.

  // Using IF NOT EXISTS (PostgreSQL 9.6+) prevents errors on re-run.
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'sepa_debit'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ideal'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bancontact'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'klarna'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'blik'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'stripe_element'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'twint'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'apple_pay'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'google_pay'`);
};

// PostgreSQL does not support removing enum values — down migration is a no-op.
// To roll back, create a new migration that recreates the enum without these values,
// but only if no rows use them.
exports.down = (pgm) => {
  pgm.sql(`
    -- Cannot remove enum values in PostgreSQL.
    -- This migration is intentionally irreversible.
    -- To roll back: verify no payments use the new values, then recreate the enum.
    SELECT 1;
  `);
};
