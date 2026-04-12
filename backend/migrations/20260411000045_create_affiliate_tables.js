/* eslint-disable camelcase */
'use strict';

/**
 * Migration 045 — Affiliate Program tables
 *
 * Creates three tables:
 *   affiliate_applications — inbound partner applications from the public form
 *   affiliate_partners     — approved affiliates with referral codes + commission config
 *   affiliate_payouts      — payout records linked to partners (monthly commissions)
 *
 * The affiliates.router.js in the admin service also has a bootstrap()
 * that issues CREATE TABLE IF NOT EXISTS — so re-running is safe.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ── affiliate_applications ────────────────────────────────────────────────
  pgm.createTable('affiliate_applications', {
    id:            { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name:          { type: 'text', notNull: true },
    email:         { type: 'text', notNull: true },
    website:       { type: 'text', notNull: false, default: null },
    platform: {
      type: 'text', notNull: true, default: 'other',
      check: "platform IN ('blog','youtube','instagram','twitter','telegram','tiktok','other')",
    },
    audience_size: {
      type: 'text', notNull: true, default: 'under_1k',
      check: "audience_size IN ('under_1k','1k_10k','10k_100k','over_100k')",
    },
    message:       { type: 'text', notNull: false, default: null },
    status: {
      type: 'text', notNull: true, default: 'pending',
      check: "status IN ('pending','reviewing','approved','rejected')",
    },
    admin_notes:   { type: 'text', notNull: false, default: null },
    reviewed_by:   { type: 'text', notNull: false, default: null },
    reviewed_at:   { type: 'timestamptz', notNull: false, default: null },
    created_at:    { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at:    { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.createIndex('affiliate_applications', 'status',  { ifNotExists: true, name: 'idx_affiliate_apps_status' });
  pgm.createIndex('affiliate_applications', 'email',   { ifNotExists: true, name: 'idx_affiliate_apps_email' });

  // ── affiliate_partners ────────────────────────────────────────────────────
  pgm.createTable('affiliate_partners', {
    id:              { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    application_id:  { type: 'uuid', notNull: false, default: null,
                       references: '"affiliate_applications"', onDelete: 'SET NULL' },
    name:            { type: 'text', notNull: true },
    email:           { type: 'text', notNull: true, unique: true },
    website:         { type: 'text', notNull: false, default: null },
    platform: {
      type: 'text', notNull: true, default: 'other',
      check: "platform IN ('blog','youtube','instagram','twitter','telegram','tiktok','other')",
    },
    audience_size: {
      type: 'text', notNull: true, default: 'under_1k',
      check: "audience_size IN ('under_1k','1k_10k','10k_100k','over_100k')",
    },
    tier: {
      type: 'text', notNull: true, default: 'starter',
      check: "tier IN ('elite','pro','starter')",
    },
    status: {
      type: 'text', notNull: true, default: 'active',
      check: "status IN ('active','paused','terminated')",
    },
    commission_pct:    { type: 'numeric(5,2)', notNull: true, default: 3.00 },
    referral_code:     { type: 'text', notNull: false, unique: true, default: null },
    payout_method: {
      type: 'text', default: 'bank_transfer',
      check: "payout_method IN ('bank_transfer','paypal','wise','stc_pay','other')",
    },
    payout_details:    { type: 'text', notNull: false, default: null },
    total_clicks:      { type: 'integer', notNull: true, default: 0 },
    total_bookings:    { type: 'integer', notNull: true, default: 0 },
    total_earned_sar:  { type: 'numeric(14,2)', notNull: true, default: 0 },
    total_paid_sar:    { type: 'numeric(14,2)', notNull: true, default: 0 },
    notes:             { type: 'text', notNull: false, default: null },
    joined_at:         { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    created_at:        { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at:        { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.createIndex('affiliate_partners', 'email',  { ifNotExists: true, name: 'idx_affiliate_partners_email' });

  // ── affiliate_payouts ─────────────────────────────────────────────────────
  pgm.createTable('affiliate_payouts', {
    id:             { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    partner_id:     { type: 'uuid', notNull: false, default: null,
                      references: '"affiliate_partners"', onDelete: 'CASCADE' },
    partner_name:   { type: 'text', notNull: true },
    amount_sar:     { type: 'numeric(14,2)', notNull: true },
    period_start:   { type: 'date', notNull: true },
    period_end:     { type: 'date', notNull: true },
    bookings_count: { type: 'integer', notNull: true, default: 0 },
    status: {
      type: 'text', notNull: true, default: 'pending',
      check: "status IN ('pending','processing','paid','cancelled')",
    },
    payment_ref:    { type: 'text', notNull: false, default: null },
    notes:          { type: 'text', notNull: false, default: null },
    paid_at:        { type: 'timestamptz', notNull: false, default: null },
    created_at:     { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at:     { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.createIndex('affiliate_payouts', 'partner_id', { ifNotExists: true, name: 'idx_affiliate_payouts_partner' });
};

exports.down = (pgm) => {
  pgm.dropTable('affiliate_payouts',    { ifExists: true, cascade: true });
  pgm.dropTable('affiliate_partners',   { ifExists: true, cascade: true });
  pgm.dropTable('affiliate_applications', { ifExists: true, cascade: true });
};
