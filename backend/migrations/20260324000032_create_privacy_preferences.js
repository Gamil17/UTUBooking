/**
 * Migration: privacy_preferences table
 *
 * Stores per-user CCPA opt-out status and GDPR consent blob.
 * One row per user — upserted on change (not append-only like consent_log).
 *
 * Run on ALL shard DBs:
 *   bash backend/scripts/migrate-all-shards.sh
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('privacy_preferences', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type:       'uuid',
      notNull:    true,
      unique:     true,
      references: '"users"(id)',
      onDelete:   'CASCADE',
    },
    ccpa_opted_out: {
      type:    'boolean',
      notNull: true,
      default: false,
    },
    ccpa_opted_out_at: {
      type:    'timestamptz',
      notNull: false,
    },
    // Optional: store GDPR preferences as JSON blob (supplement to consent_log)
    gdpr_consent: {
      type:    'jsonb',
      notNull: false,
    },
    ip_address: {
      type:    'inet',
      notNull: false,
    },
    user_agent: {
      type:    'text',
      notNull: false,
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addIndex('privacy_preferences', ['user_id']);
  pgm.addIndex('privacy_preferences', ['ccpa_opted_out'], {
    where: 'ccpa_opted_out = TRUE',
    name:  'idx_privacy_prefs_ccpa_opted_out',
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('privacy_preferences');
};
