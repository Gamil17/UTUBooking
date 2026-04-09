/**
 * Migration: 20260324000026_create_consent_log
 *
 * Creates:
 *   consent_log       — immutable GDPR/KVKK/DPDP consent audit trail
 *   gdpr_erasure_log  — Art. 17 right-to-erasure request log (retained 7 years)
 *
 * IMPORTANT: These tables must be created on ALL shard DBs (KSA, UAE, KWT, JOR, MAR, TUN, Istanbul).
 * The shard-router writes user data to the user's home shard — consent is co-located.
 */

exports.up = async (pgm) => {
  // ── Enums ──────────────────────────────────────────────────────────────────
  pgm.createType('consent_type_enum', ['necessary', 'analytics', 'marketing', 'all']);
  pgm.createType('consent_law_enum', ['GDPR', 'KVKK', 'DPDP']);

  // ── consent_log — immutable append-only audit table ───────────────────────
  pgm.createTable('consent_log', {
    id: {
      type:       'UUID',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type:       'UUID',
      references: '"users"(id)',
      onDelete:   'SET NULL',
      notNull:    false,
    },
    email:        { type: 'TEXT',              notNull: false },
    consent_type: { type: 'consent_type_enum', notNull: true },
    granted:      { type: 'BOOLEAN',           notNull: true },
    law:          { type: 'consent_law_enum',  notNull: true },
    version:      { type: 'TEXT',              notNull: true, default: '1.0' },
    ip_address:   { type: 'INET',              notNull: false },
    user_agent:   { type: 'TEXT',              notNull: false },
    timestamp: {
      type:    'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    withdrawn_at: { type: 'TIMESTAMPTZ', notNull: false },
  }, { ifNotExists: true });

  pgm.sql(`COMMENT ON TABLE consent_log IS
    'Immutable consent audit log — GDPR Art. 7(1), KVKK md.5/1, DPDP §6. Never update, only insert.'`);

  // ── Indexes ────────────────────────────────────────────────────────────────
  pgm.createIndex('consent_log', 'user_id',   { name: 'idx_consent_log_user_id',   ifNotExists: true });
  pgm.createIndex('consent_log', 'law',        { name: 'idx_consent_log_law',       ifNotExists: true });
  pgm.createIndex('consent_log', 'timestamp', { name: 'idx_consent_log_timestamp', ifNotExists: true });
  pgm.createIndex('consent_log', ['user_id', 'consent_type', 'timestamp'], {
    name:        'idx_consent_log_type_user',
    ifNotExists: true,
  });

  // ── gdpr_erasure_log — retained 7 years even after user erasure ───────────
  pgm.createTable('gdpr_erasure_log', {
    id: {
      type:       'UUID',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id:        { type: 'UUID', notNull: false },   // NOT a FK — user may be deleted
    email_snapshot: { type: 'TEXT', notNull: true },    // Snapshot at request time
    law:            { type: 'TEXT', notNull: true, default: 'GDPR' },
    reason:         { type: 'TEXT', notNull: false },
    ip_address:     { type: 'INET', notNull: false },
    user_agent:     { type: 'TEXT', notNull: false },
    requested_at: {
      type:    'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    completed_at: { type: 'TIMESTAMPTZ', notNull: false },   // DPO marks completion
    notes:        { type: 'TEXT',        notNull: false },
  }, { ifNotExists: true });

  pgm.sql(`
    COMMENT ON TABLE gdpr_erasure_log IS
      'Erasure request audit — retained 7 years per GDPR Art. 17(3)(e) and tax law.'
  `);

  pgm.createIndex('gdpr_erasure_log', 'user_id',      { name: 'idx_erasure_log_user_id', ifNotExists: true });
  pgm.createIndex('gdpr_erasure_log', 'completed_at', {
    name:        'idx_erasure_log_status',
    where:       'completed_at IS NULL',
    ifNotExists: true,
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('gdpr_erasure_log', { ifExists: true });
  pgm.dropTable('consent_log',      { ifExists: true });
  pgm.dropType('consent_law_enum',  { ifExists: true });
  pgm.dropType('consent_type_enum', { ifExists: true });
};
