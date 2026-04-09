'use strict';

/**
 * Migration: PIPEDA + Quebec Law 25 compliance tables (Canada market)
 *
 * Tables:
 *   pipeda_consent_log  — Append-only consent events (PIPEDA s.4.3 + QC Law 25)
 *   pipeda_breach_log   — Breach notification log (PIPEDA s.10.1 + QC Law 25 s.3.5)
 *   pipeda_access_log   — Data access request log (PIPEDA s.4.9 — 30-day SLA)
 *
 * Data residency: Run ONLY on ca-central-1 (Montreal) database.
 * NEVER run on US, EU, or other region shards.
 */

exports.up = async (pgm) => {
  // ── Enums ──────────────────────────────────────────────────────────────────
  pgm.createType('pipeda_law', ['PIPEDA', 'QUEBEC_LAW25', 'PIPA_AB', 'PIPA_BC']);
  pgm.createType('pipeda_consent_type', [
    'marketing_email',
    'marketing_sms',
    'analytics',
    'third_party_sharing',
    'personalization',
    'push_notifications',
  ]);

  // ── pipeda_consent_log ─────────────────────────────────────────────────────
  pgm.createTable('pipeda_consent_log', {
    id:           { type: 'UUID',                primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:      { type: 'UUID',                notNull: true },
    law:          { type: 'pipeda_law',          notNull: true, default: 'PIPEDA' },
    consent_type: { type: 'pipeda_consent_type', notNull: true },
    granted:      { type: 'BOOLEAN',             notNull: true },
    purpose:      { type: 'VARCHAR(500)',         notNull: true },
    language:     { type: 'VARCHAR(5)',           notNull: true, default: 'en' },
    ip_address:   { type: 'VARCHAR(45)' },
    user_agent:   { type: 'VARCHAR(500)' },
    source:       { type: 'VARCHAR(100)',         notNull: true },
    version:      { type: 'VARCHAR(50)' },
    created_at:   { type: 'TIMESTAMPTZ',         notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.sql(`COMMENT ON TABLE pipeda_consent_log IS
    'Append-only PIPEDA consent log. Withdrawal = new row with granted=false. Never UPDATE.'`);

  // ── pipeda_breach_log ──────────────────────────────────────────────────────
  pgm.createTable('pipeda_breach_log', {
    id:                           { type: 'UUID',        primaryKey: true, default: pgm.func('gen_random_uuid()') },
    discovered_at:                { type: 'TIMESTAMPTZ', notNull: true },
    contained_at:                 { type: 'TIMESTAMPTZ' },
    description:                  { type: 'TEXT',        notNull: true },
    affected_data:                { type: 'TEXT',        notNull: true },
    estimated_users_affected:     { type: 'INTEGER' },
    real_risk_significant_harm:   { type: 'BOOLEAN',     notNull: true, default: false },
    opc_notified_at:              { type: 'TIMESTAMPTZ' },
    cai_notified_at:              { type: 'TIMESTAMPTZ' },
    users_notified_at:            { type: 'TIMESTAMPTZ' },
    remediation_steps:            { type: 'TEXT' },
    reported_by:                  { type: 'VARCHAR(200)' },
    metadata:                     { type: 'JSONB' },
    created_at:                   { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.sql(`ALTER TABLE pipeda_breach_log ALTER COLUMN metadata SET DEFAULT '{}'`);

  pgm.sql(`COMMENT ON TABLE pipeda_breach_log IS
    'Breach notification log per PIPEDA s.10.1 and Quebec Law 25 s.3.5. Keep for 24 months.'`);

  // ── pipeda_access_log ─────────────────────────────────────────────────────
  pgm.createTable('pipeda_access_log', {
    id:           { type: 'UUID',        primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:      { type: 'UUID',        notNull: true },
    request_type: { type: 'VARCHAR(50)', notNull: true },
    law:          { type: 'VARCHAR(20)', notNull: true, default: 'PIPEDA' },
    status:       { type: 'VARCHAR(20)', notNull: true, default: 'pending' },
    requested_at: { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
    due_at:       { type: 'TIMESTAMPTZ', notNull: true },
    fulfilled_at: { type: 'TIMESTAMPTZ' },
    denial_reason:{ type: 'TEXT' },
    fulfilled_by: { type: 'VARCHAR(200)' },
    metadata:     { type: 'JSONB' },
  }, { ifNotExists: true });

  pgm.sql(`ALTER TABLE pipeda_access_log ALTER COLUMN metadata SET DEFAULT '{}'`);

  pgm.sql(`COMMENT ON TABLE pipeda_access_log IS
    'Data subject request log — PIPEDA 30-day SLA. Extended to 60 days only with user notice.'`);

  // ── Indexes ────────────────────────────────────────────────────────────────
  pgm.createIndex('pipeda_consent_log', ['user_id', 'law', 'consent_type', 'created_at'], {
    name: 'pipeda_consent_user_law',
  });
  pgm.createIndex('pipeda_access_log', ['status', 'due_at'], {
    name:  'pipeda_access_pending',
    where: "status = 'pending'",
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('pipeda_access_log',   { ifExists: true });
  pgm.dropTable('pipeda_breach_log',   { ifExists: true });
  pgm.dropTable('pipeda_consent_log',  { ifExists: true });
  pgm.dropType('pipeda_consent_type',  { ifExists: true });
  pgm.dropType('pipeda_law',           { ifExists: true });
};
