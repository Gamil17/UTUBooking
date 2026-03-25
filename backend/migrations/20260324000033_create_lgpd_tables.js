'use strict';

/**
 * Migration: LGPD compliance tables (Brazil market — Phase 12)
 *
 * Tables:
 *   lgpd_breach_log  — ANPD breach notification log (Art. 48 — 72h window)
 *   lgpd_access_log  — Data subject request log (Art. 18 — 15 business days SLA)
 *
 * LGPD consent events reuse the existing `consent_logs` table (already has
 * a `law` column). No separate consent table needed for Brazil.
 *
 * Data residency: Run ONLY on sa-east-1 (São Paulo) database.
 * NEVER run on US, EU, CA, or other region shards.
 *
 * Law references:
 *   Art. 18 — Data subject rights (access, correction, anonymization,
 *              portability, deletion, revocation)
 *   Art. 41 — Mandatory DPO (Encarregado) for large-scale processing
 *   Art. 48 — Breach notification: ANPD + data subjects within 72 hours
 */

exports.up = async function up(knex) {
  // ── lgpd_breach_log ────────────────────────────────────────────────────────
  // Art. 48: Incidents involving personal data must be notified to ANPD
  // and affected data subjects within a reasonable timeframe (72h per regulation).
  await knex.schema.createTable('lgpd_breach_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.timestamp('descoberto_em').notNullable();          // when breach was discovered
    t.timestamp('contido_em');                           // when breach was contained
    t.text('descricao').notNullable();                   // nature of breach in PT-BR
    t.text('dados_afetados').notNullable();              // categories of affected data
    t.integer('usuarios_estimados');                     // estimated affected users
    t.boolean('alto_risco').notNullable().defaultTo(false); // high risk to data subjects
    t.timestamp('anpd_notificado_em');                   // ANPD notification timestamp
    t.timestamp('titulares_notificados_em');             // data subjects notification timestamp
    t.text('medidas_remediacoes');                       // remediation steps
    t.string('reportado_por', 200);                      // internal reporter
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.comment('LGPD Art. 48 breach log. Keep for minimum 5 years (Receita Federal records retention).');
  });

  // ── lgpd_access_log ────────────────────────────────────────────────────────
  // Tracks LGPD data subject requests — 15 business days SLA (Art. 18).
  await knex.schema.createTable('lgpd_access_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().index();
    t.string('tipo_solicitacao', 50).notNullable(); // 'acesso'|'correcao'|'exclusao'|'portabilidade'|'revogacao'|'anonimizacao'
    t.string('status', 20).notNullable().defaultTo('pendente'); // pendente|cumprido|recusado
    t.timestamp('solicitado_em').notNullable().defaultTo(knex.fn.now());
    t.timestamp('prazo_em').notNullable();            // 15 business days from request
    t.timestamp('cumprido_em');
    t.text('motivo_recusa');                          // if recusado
    t.string('cumprido_por', 200);
    t.jsonb('metadata').defaultTo('{}');

    t.comment('LGPD Art. 18 data subject request log — 15 business day SLA.');
  });

  // ── Index ──────────────────────────────────────────────────────────────────
  await knex.schema.raw(`
    CREATE INDEX lgpd_access_pending ON lgpd_access_log (status, prazo_em) WHERE status = 'pendente';
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('lgpd_access_log');
  await knex.schema.dropTableIfExists('lgpd_breach_log');
};
