/* eslint-disable camelcase */
'use strict';

/**
 * Migration: add admin-facing columns to the users table.
 *
 * Adds columns required by admin.router.js and the admin/users dashboard:
 *   - name           : display name (derived from name_en; replaces per-query COALESCE)
 *   - locale         : user's active locale code (e.g. 'ar', 'tr') — was preferred_lang
 *   - country        : ISO-3166-1 alpha-2 country code (e.g. 'SA', 'TR')
 *   - status         : 'active' | 'suspended' (replaces boolean is_active)
 *   - suspension_reason : free-text reason recorded when a user is suspended
 *   - suspended_at   : timestamp when the suspension took effect
 *   - last_seen_at   : last successful JWT auth (updated on every login)
 *
 * Backward-compat:
 *   - is_active is kept but defaults are migrated so status mirrors it.
 *   - name defaults to COALESCE(name_en, email) so existing rows get a value.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ── New columns ────────────────────────────────────────────────────────────

  pgm.addColumn('users', {
    name: {
      type: 'varchar(255)',
      // Backfill from name_en; final fallback to email (cannot be null at display time)
      default: null,
    },
    locale: {
      type:    'varchar(10)',
      notNull: true,
      default: 'en',
    },
    country: {
      type:    'varchar(2)',   // ISO-3166-1 alpha-2
      default: null,
    },
    status: {
      type:    "varchar(20)",
      notNull: true,
      default: "'active'",
    },
    suspension_reason: {
      type:    'text',
      default: null,
    },
    suspended_at: {
      type:    'timestamptz',
      default: null,
    },
    last_seen_at: {
      type:    'timestamptz',
      default: null,
    },
  });

  // ── Backfill existing rows ─────────────────────────────────────────────────
  // Set name from name_en if present, else derive from email prefix
  pgm.sql(`
    UPDATE users
    SET name   = COALESCE(name_en, split_part(email, '@', 1)),
        locale = COALESCE(preferred_lang, 'en'),
        status = CASE WHEN is_active THEN 'active' ELSE 'suspended' END
    WHERE name IS NULL
  `);

  // ── Indexes ────────────────────────────────────────────────────────────────
  pgm.createIndex('users', 'status');
  pgm.createIndex('users', 'country');
  pgm.createIndex('users', 'last_seen_at');
};

exports.down = (pgm) => {
  pgm.dropIndex('users', 'last_seen_at');
  pgm.dropIndex('users', 'country');
  pgm.dropIndex('users', 'status');
  pgm.dropColumn('users', ['name', 'locale', 'country', 'status', 'suspension_reason', 'suspended_at', 'last_seen_at']);
};
