/**
 * Migration 030 — Add 'affirm' to payment_method enum
 *
 * Affirm BNPL added for US market (Phase 10).
 * Minimum booking amount: $200 USD (enforced at application layer).
 *
 * NOTE: PostgreSQL enum additions are irreversible — down() is intentionally a no-op.
 * Run on ALL shard DBs:
 *   ./backend/scripts/migrate-all-shards.sh MIGRATION=20260324000030
 */

exports.up = (pgm) => {
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'affirm'`);
};

exports.down = (_pgm) => {
  // PostgreSQL does not support removing enum values.
  // To rollback: rename the type and recreate without 'affirm' — requires table rewrites.
  // In practice, leave this value in place and stop routing to it at application layer.
};
