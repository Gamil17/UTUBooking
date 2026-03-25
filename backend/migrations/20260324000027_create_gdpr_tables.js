/* eslint-disable camelcase */
'use strict';

/**
 * Migration: 20260324000027_create_gdpr_tables
 *
 * GDPR (EU) 2016/679 + UK GDPR compliance tables.
 * Must be run on ALL shard DBs (KSA, UAE, KWT, JOR, MAR, TUN, Istanbul).
 *
 * Creates:
 *   consent_logs      — granular consent audit log (Art. 7 — controller bears proof burden)
 *   erasure_requests  — Art. 17 right-to-erasure queue tracked through completion
 *   data_exports      — Art. 15/20 export/portability request tracking + download link
 *
 * Alters:
 *   users.deleted_at  — soft-delete column for GDPR erasure (Art. 17)
 *                       PII is anonymised immediately; row kept for FK integrity + 7-yr tax law
 *
 * Run: npm run migrate
 *      (or: DATABASE_URL=... npx node-pg-migrate up)
 *
 * Note: Migration 20260324000026 created consent_log (singular) in knex format.
 * This migration uses node-pg-migrate (pgm) — the project standard — and creates
 * consent_logs (plural) with a leaner schema matching the GDPR banner output.
 * Both tables are kept; consent_logs is the canonical GDPR audit table going forward.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {

  // ── 1. consent_logs — immutable GDPR consent audit trail ──────────────────
  //
  // IMMUTABLE: never UPDATE rows. Withdrawal = new INSERT with granted=false.
  // Retained permanently — Art. 7(1) requires the controller to prove consent.
  //
  pgm.createType('gdpr_consent_type', [
    'necessary',   // Strictly necessary (always granted; logged for completeness)
    'analytics',   // Usage analytics
    'marketing',   // Marketing & personalisation
    'all',         // Bulk accept-all action
  ]);

  pgm.createTable('consent_logs', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type:       'uuid',
      // SET NULL on user erasure — log row kept (Art. 7 proof requirement)
      references: '"users"',
      onDelete:   'SET NULL',
      comment:    'NULL after user erasure — log is retained for legal proof',
    },
    consent_type: {
      type:    'gdpr_consent_type',
      notNull: true,
    },
    granted: {
      type:    'boolean',
      notNull: true,
      comment: 'true=accepted, false=declined or withdrawn',
    },
    timestamp: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    ip_address: {
      type:    'inet',
      comment: 'Visitor IP at consent time — required for Art. 7 audit evidence',
    },
    user_agent: {
      type: 'text',
    },
    consent_version: {
      type:    'varchar(20)',
      notNull: true,
      default: '1.0',
      comment: 'Version of consent notice shown — bump when privacy policy changes',
    },
    law: {
      type:    'varchar(10)',
      notNull: true,
      default: 'GDPR',
      comment: 'GDPR | KVKK | DPDP — allows shared table across jurisdictions',
    },
  });

  pgm.createIndex('consent_logs', 'user_id');
  pgm.createIndex('consent_logs', 'timestamp');
  pgm.createIndex('consent_logs', ['user_id', 'consent_type', 'timestamp'], {
    name: 'idx_consent_logs_user_type_ts',
  });
  // Partial index for DPO dashboard: recent EU consent activity
  pgm.createIndex('consent_logs', 'timestamp', {
    name:  'idx_consent_logs_gdpr_recent',
    where: "law = 'GDPR'",
  });

  pgm.sql(`
    COMMENT ON TABLE consent_logs IS
      'Immutable GDPR/KVKK/DPDP consent audit. Never UPDATE — withdrawal = new INSERT. Art. 7(1).';
  `);

  // ── 2. erasure_requests — Art. 17 right-to-erasure workflow ───────────────
  //
  // Tracks every erasure request from receipt → DPO review → completion.
  // Retained 7 years post-completion (Art. 17(3)(e) + tax law).
  // user_id is NOT a FK — the referenced user may already be deleted.
  //
  pgm.createType('erasure_status', ['pending', 'in_progress', 'completed', 'rejected']);

  pgm.createTable('erasure_requests', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type:    'uuid',
      comment: 'No FK — user may be deleted by the time this is processed',
    },
    email_snapshot: {
      type:    'varchar(255)',
      notNull: true,
      comment: 'Email at request time — user_id alone insufficient after anonymisation',
    },
    requested_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    completed_at: {
      type:    'timestamptz',
      comment: 'NULL until DPO marks complete; Art. 12 requires response within 30 days',
    },
    status: {
      type:    'erasure_status',
      notNull: true,
      default: 'pending',
    },
    law: {
      type:    'varchar(10)',
      notNull: true,
      default: 'GDPR',
    },
    reason: {
      type:    'text',
      comment: 'User-supplied reason (optional)',
    },
    ip_address: {
      type: 'inet',
    },
    user_agent: {
      type: 'text',
    },
    dpo_notes: {
      type:    'text',
      comment: 'DPO internal notes — not surfaced to user',
    },
  });

  pgm.createIndex('erasure_requests', 'user_id');
  pgm.createIndex('erasure_requests', 'requested_at');
  // DPO dashboard: pending requests only
  pgm.createIndex('erasure_requests', 'status', {
    name:  'idx_erasure_requests_pending',
    where: "status IN ('pending', 'in_progress')",
  });
  // SLA breach detection: requests older than 25 days still pending
  pgm.createIndex('erasure_requests', 'requested_at', {
    name:  'idx_erasure_requests_sla',
    where: "status = 'pending' AND completed_at IS NULL",
  });

  pgm.sql(`
    COMMENT ON TABLE erasure_requests IS
      'Art. 17 erasure workflow. Retained 7 years post-completion (tax law + Art. 17(3)(e)).';
  `);

  // ── 3. data_exports — Art. 15/20 access + portability request tracking ────
  //
  // Each export generates a signed S3 URL with a 24-hour expiry.
  // The row is retained for audit; download_url becomes invalid after expires_at.
  //
  pgm.createTable('data_exports', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type:       'uuid',
      references: '"users"',
      onDelete:   'SET NULL',
    },
    requested_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    export_type: {
      type:    'varchar(20)',
      notNull: true,
      default: 'access',
      comment: 'access (Art.15) | portability (Art.20)',
    },
    format: {
      type:    'varchar(20)',
      notNull: true,
      default: 'json',
      comment: 'json | json-ld | csv',
    },
    download_url: {
      type:    'text',
      comment: 'Signed S3 URL — valid until expires_at; NULL while generating',
    },
    expires_at: {
      type:    'timestamptz',
      comment: '24 hours after generation; URL becomes invalid after this',
    },
    generated_at: {
      type:    'timestamptz',
      comment: 'NULL while pending; set when file is ready',
    },
    file_size_bytes: {
      type:    'integer',
    },
    ip_address: {
      type: 'inet',
    },
    law: {
      type:    'varchar(10)',
      notNull: true,
      default: 'GDPR',
    },
  });

  pgm.createIndex('data_exports', 'user_id');
  pgm.createIndex('data_exports', 'requested_at');
  // Cleanup job: expired but still linked exports
  pgm.createIndex('data_exports', 'expires_at', {
    name:  'idx_data_exports_expired',
    where: 'expires_at IS NOT NULL AND download_url IS NOT NULL',
  });

  pgm.sql(`
    COMMENT ON TABLE data_exports IS
      'Art. 15 (access) + Art. 20 (portability) export requests. Download URLs expire after 24h.';
  `);

  // ── 4. users.deleted_at — soft delete for GDPR erasure ───────────────────
  //
  // When a user exercises Art. 17 erasure:
  //   1. PII columns are set to NULL / anonymised values immediately
  //   2. deleted_at is set to NOW()
  //   3. Row is retained for 7 years (FK integrity + tax records in bookings/payments)
  //   4. All application queries must filter WHERE deleted_at IS NULL
  //
  pgm.addColumn('users', {
    deleted_at: {
      type:    'timestamptz',
      comment: 'GDPR Art. 17 soft-delete. NULL = active. Set by erasure_requests workflow.',
    },
    gdpr_consent_given: {
      type:    'boolean',
      default: false,
      comment: 'True when EU user accepted GDPR consent banner. Mirrors latest consent_logs row.',
    },
    gdpr_consent_at: {
      type:    'timestamptz',
      comment: 'Timestamp of most recent GDPR consent acceptance.',
    },
    gdpr_consent_version: {
      type:    'varchar(20)',
      comment: 'Consent notice version shown at gdpr_consent_at.',
    },
  });

  // Partial index — application uses this for active-user queries
  pgm.createIndex('users', 'deleted_at', {
    name:  'idx_users_active',
    where: 'deleted_at IS NULL',
  });

  // DPO dashboard: recently soft-deleted users
  pgm.createIndex('users', 'deleted_at', {
    name:  'idx_users_deleted_at',
    where: 'deleted_at IS NOT NULL',
  });

  pgm.createIndex('users', 'gdpr_consent_at', {
    name:  'idx_users_gdpr_consent',
    where: 'gdpr_consent_given = true',
  });

  pgm.sql(`
    COMMENT ON COLUMN users.deleted_at IS
      'GDPR Art. 17 soft delete. PII anonymised on set. Row kept 7 years for tax/FK integrity.';
  `);
};

exports.down = (pgm) => {
  // Remove columns from users first (before dropping types used by new tables)
  pgm.dropIndex('users', [], { name: 'idx_users_gdpr_consent',   ifExists: true });
  pgm.dropIndex('users', [], { name: 'idx_users_deleted_at',     ifExists: true });
  pgm.dropIndex('users', [], { name: 'idx_users_active',         ifExists: true });
  pgm.dropColumn('users', ['deleted_at', 'gdpr_consent_given', 'gdpr_consent_at', 'gdpr_consent_version']);

  pgm.dropTable('data_exports');
  pgm.dropTable('erasure_requests');
  pgm.dropTable('consent_logs');

  pgm.dropType('erasure_status',    { ifExists: true });
  pgm.dropType('gdpr_consent_type', { ifExists: true });
};
