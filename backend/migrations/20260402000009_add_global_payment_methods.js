/**
 * Migration 009 (2026-04-02) — Add remaining global payment_method enum values
 *
 * Adds enum values for all gateways added in Phases 5–12 that were missing
 * from the base migration and earlier patches 028–030.
 *
 * Missing values that caused enum violations at runtime:
 *   razorpay    — India + Bangladesh
 *   iyzico      — Turkey (TRY)
 *   midtrans    — Indonesia (IDR)
 *   ipay88      — Malaysia (MYR)
 *   jazzcash    — Pakistan (PKR primary)
 *   easypaisa   — Pakistan (PKR secondary)
 *   interac     — Canada (CAD, via Bambora/Worldline)
 *   mercadopago — LatAm (AR/CO/CL/UY/MX/PE)
 *   pix         — Brazil (BRL instant payment)
 *   boleto      — Brazil (BRL offline/banked fallback)
 *
 * Run against ALL shard DBs:
 *   bash backend/scripts/migrate-all-shards.sh
 *
 * Run against a single DB:
 *   DATABASE_URL=<connection_string> npm run migrate:up
 */

'use strict';

exports.up = (pgm) => {
  // ── payment_status: add 'redirected' ─────────────────────────────────────────
  // Used by redirect-based flows (MercadoPago, Interac) where the customer is
  // sent to the gateway's hosted page and we await their return/webhook.
  pgm.sql(`ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'redirected'`);

  // ── payment_method: add remaining gateway values ──────────────────────────────
  // ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent (PG 9.6+).
  // PostgreSQL requires one ALTER per value — no multi-value syntax.
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'razorpay'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'iyzico'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'midtrans'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ipay88'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'jazzcash'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'easypaisa'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'interac'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mercadopago'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pix'`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'boleto'`);
};

// PostgreSQL does not support removing enum values — down migration is a no-op.
exports.down = (_pgm) => {
  // To roll back: verify no payments use the new values, then recreate the enum.
};
