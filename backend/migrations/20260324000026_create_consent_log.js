/**
 * Migration: 20260324000026_create_consent_log
 *
 * Creates:
 *   consent_log       — immutable GDPR/KVKK/DPDP consent audit trail
 *   gdpr_erasure_log  — Art. 17 right-to-erasure request log (retained 7 years)
 *
 * Run: node backend/migrations/run.js 20260324000026
 *
 * IMPORTANT: These tables must be created on ALL shard DBs (KSA, UAE, KWT, JOR, MAR, TUN, Istanbul).
 * The shard-router writes user data to the user's home shard — consent is co-located.
 */

exports.up = async function up(knex) {
  // ── consent_log — immutable append-only audit table ───────────────────────
  await knex.schema.createTableIfNotExists('consent_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('email').nullable();
    table
      .enu('consent_type', ['necessary', 'analytics', 'marketing', 'all'], {
        useNative:   true,
        enumName:    'consent_type_enum',
        existingType: false,
      })
      .notNullable();
    table.boolean('granted').notNullable();
    table
      .enu('law', ['GDPR', 'KVKK', 'DPDP'], {
        useNative:   true,
        enumName:    'consent_law_enum',
        existingType: false,
      })
      .notNullable();
    table.text('version').notNullable().defaultTo('1.0');
    table.specificType('ip_address', 'INET').nullable();
    table.text('user_agent').nullable();
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('withdrawn_at', { useTz: true }).nullable();
  });

  await knex.schema.raw(`
    COMMENT ON TABLE consent_log IS
      'Immutable consent audit log — GDPR Art. 7(1), KVKK md.5/1, DPDP §6. Never update, only insert.';
  `);

  // ── Indexes ────────────────────────────────────────────────────────────────
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_consent_log_user_id   ON consent_log (user_id);
    CREATE INDEX IF NOT EXISTS idx_consent_log_law       ON consent_log (law);
    CREATE INDEX IF NOT EXISTS idx_consent_log_timestamp ON consent_log (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_consent_log_type_user ON consent_log (user_id, consent_type, timestamp DESC);
  `);

  // ── gdpr_erasure_log — retained 7 years even after user erasure ───────────
  await knex.schema.createTableIfNotExists('gdpr_erasure_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable();                      // NOT a FK — user may be deleted
    table.text('email_snapshot').notNullable();            // Snapshot at request time
    table.text('law').notNullable().defaultTo('GDPR');
    table.text('reason').nullable();
    table.specificType('ip_address', 'INET').nullable();
    table.text('user_agent').nullable();
    table.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true }).nullable(); // DPO marks completion
    table.text('notes').nullable();
  });

  await knex.schema.raw(`
    COMMENT ON TABLE gdpr_erasure_log IS
      'Erasure request audit — retained 7 years per GDPR Art. 17(3)(e) and tax law.';

    CREATE INDEX IF NOT EXISTS idx_erasure_log_user_id ON gdpr_erasure_log (user_id);
    CREATE INDEX IF NOT EXISTS idx_erasure_log_status  ON gdpr_erasure_log (completed_at)
      WHERE completed_at IS NULL;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('gdpr_erasure_log');
  await knex.schema.dropTableIfExists('consent_log');
  await knex.schema.raw(`
    DROP TYPE IF EXISTS consent_type_enum;
    DROP TYPE IF EXISTS consent_law_enum;
  `);
};
