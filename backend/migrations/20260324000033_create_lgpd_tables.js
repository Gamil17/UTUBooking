'use strict';

/**
 * Migration: LGPD compliance tables (Brazil market — Phase 12)
 *
 * Tables:
 *   lgpd_breach_log  — ANPD breach notification log (Art. 48 — 72h window)
 *   lgpd_access_log  — Data subject request log (Art. 18 — 15 business days SLA)
 *
 * Data residency: Run ONLY on sa-east-1 (São Paulo) database.
 * NEVER run on US, EU, CA, or other region shards.
 */

exports.up = async (pgm) => {
  // ── lgpd_breach_log ────────────────────────────────────────────────────────
  pgm.createTable('lgpd_breach_log', {
    id:                      { type: 'UUID',        primaryKey: true, default: pgm.func('gen_random_uuid()') },
    descoberto_em:           { type: 'TIMESTAMPTZ', notNull: true },
    contido_em:              { type: 'TIMESTAMPTZ' },
    descricao:               { type: 'TEXT',        notNull: true },
    dados_afetados:          { type: 'TEXT',        notNull: true },
    usuarios_estimados:      { type: 'INTEGER' },
    alto_risco:              { type: 'BOOLEAN',     notNull: true, default: false },
    anpd_notificado_em:      { type: 'TIMESTAMPTZ' },
    titulares_notificados_em:{ type: 'TIMESTAMPTZ' },
    medidas_remediacoes:     { type: 'TEXT' },
    reportado_por:           { type: 'VARCHAR(200)' },
    metadata:                { type: 'JSONB' },
    created_at:              { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.sql(`ALTER TABLE lgpd_breach_log ALTER COLUMN metadata SET DEFAULT '{}'`);

  pgm.sql(`COMMENT ON TABLE lgpd_breach_log IS
    'LGPD Art. 48 breach log. Keep for minimum 5 years (Receita Federal records retention).'`);

  // ── lgpd_access_log ────────────────────────────────────────────────────────
  pgm.createTable('lgpd_access_log', {
    id:               { type: 'UUID',        primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:          { type: 'UUID',        notNull: true },
    tipo_solicitacao: { type: 'VARCHAR(50)', notNull: true },
    status:           { type: 'VARCHAR(20)', notNull: true, default: 'pendente' },
    solicitado_em:    { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
    prazo_em:         { type: 'TIMESTAMPTZ', notNull: true },
    cumprido_em:      { type: 'TIMESTAMPTZ' },
    motivo_recusa:    { type: 'TEXT' },
    cumprido_por:     { type: 'VARCHAR(200)' },
    metadata:         { type: 'JSONB' },
  }, { ifNotExists: true });

  pgm.sql(`ALTER TABLE lgpd_access_log ALTER COLUMN metadata SET DEFAULT '{}'`);

  pgm.sql(`COMMENT ON TABLE lgpd_access_log IS
    'LGPD Art. 18 data subject request log — 15 business day SLA.'`);

  // ── Index ──────────────────────────────────────────────────────────────────
  pgm.createIndex('lgpd_access_log', ['status', 'prazo_em'], {
    name:  'lgpd_access_pending',
    where: "status = 'pendente'",
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('lgpd_access_log',  { ifExists: true });
  pgm.dropTable('lgpd_breach_log',  { ifExists: true });
};
