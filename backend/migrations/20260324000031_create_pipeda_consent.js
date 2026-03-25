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
 *
 * Law requirements:
 *   - PIPEDA: consent log, breach notification (72h to OPC), access rights
 *   - Quebec Law 25: stricter breach (72h to CAI + users), portability, erasure
 */

exports.up = async function up(knex) {
  // ── pipeda_consent_log ─────────────────────────────────────────────────────
  // Immutable (append-only) — withdrawal = new row with granted=false.
  // DO NOT add UPDATE permissions to this table in pg_hba.conf.
  await knex.schema.raw(`
    CREATE TYPE pipeda_law AS ENUM ('PIPEDA', 'QUEBEC_LAW25', 'PIPA_AB', 'PIPA_BC');
    CREATE TYPE pipeda_consent_type AS ENUM (
      'marketing_email',
      'marketing_sms',
      'analytics',
      'third_party_sharing',
      'personalization',
      'push_notifications'
    );
  `);

  await knex.schema.createTable('pipeda_consent_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().index();
    t.specificType('law', 'pipeda_law').notNullable().defaultTo('PIPEDA');
    t.specificType('consent_type', 'pipeda_consent_type').notNullable();
    t.boolean('granted').notNullable();
    t.string('purpose', 500).notNullable();        // plain-English purpose description
    t.string('language', 5).notNullable().defaultTo('en'); // 'en' or 'fr' (QC)
    t.string('ip_address', 45);                    // INET — stored as text for simplicity
    t.string('user_agent', 500);
    t.string('source', 100).notNullable();         // 'web', 'mobile', 'phone'
    t.string('version', 50);                       // privacy policy version at time of consent
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // No updated_at — this table is immutable
    t.comment('Append-only PIPEDA consent log. Withdrawal = new row with granted=false. Never UPDATE.');
  });

  // ── pipeda_breach_log ──────────────────────────────────────────────────────
  // PIPEDA s.10.1: log breaches + OPC notification within 72h if RRSH.
  // Quebec Law 25 s.3.5: notify CAI + affected users within 72h.
  await knex.schema.createTable('pipeda_breach_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.timestamp('discovered_at').notNullable();
    t.timestamp('contained_at');
    t.text('description').notNullable();           // nature of breach
    t.text('affected_data').notNullable();          // categories of data involved
    t.integer('estimated_users_affected');          // best estimate
    t.boolean('real_risk_significant_harm').notNullable().defaultTo(false); // RRSH determination
    t.timestamp('opc_notified_at');                // OPC notification timestamp
    t.timestamp('cai_notified_at');                // CAI (Quebec) notification timestamp
    t.timestamp('users_notified_at');              // when affected users were notified
    t.text('remediation_steps');
    t.string('reported_by', 200);                  // internal team/person
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.comment('Breach notification log per PIPEDA s.10.1 and Quebec Law 25 s.3.5. Keep for 24 months (OPC may request).');
  });

  // ── pipeda_access_log ─────────────────────────────────────────────────────
  // Tracks data access requests — PIPEDA requires response within 30 days.
  await knex.schema.createTable('pipeda_access_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().index();
    t.string('request_type', 50).notNullable(); // 'access'|'correct'|'erase'|'portability'|'withdraw_consent'
    t.string('law', 20).notNullable().defaultTo('PIPEDA');
    t.string('status', 20).notNullable().defaultTo('pending'); // pending|fulfilled|denied|extended
    t.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('due_at').notNullable();          // requested_at + 30 days
    t.timestamp('fulfilled_at');
    t.text('denial_reason');                      // if status=denied
    t.string('fulfilled_by', 200);                // internal agent/system
    t.jsonb('metadata').defaultTo('{}');

    t.comment('Data subject request log — PIPEDA 30-day SLA. Extended to 60 days only with user notice.');
  });

  // ── Indexes ────────────────────────────────────────────────────────────────
  await knex.schema.raw(`
    CREATE INDEX pipeda_consent_user_law ON pipeda_consent_log (user_id, law, consent_type, created_at DESC);
    CREATE INDEX pipeda_access_pending ON pipeda_access_log (status, due_at) WHERE status = 'pending';
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('pipeda_access_log');
  await knex.schema.dropTableIfExists('pipeda_breach_log');
  await knex.schema.dropTableIfExists('pipeda_consent_log');
  await knex.schema.raw(`
    DROP TYPE IF EXISTS pipeda_consent_type;
    DROP TYPE IF EXISTS pipeda_law;
  `);
};
