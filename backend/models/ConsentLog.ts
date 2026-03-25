/**
 * ConsentLog — GDPR consent audit record
 *
 * Table: consent_log
 * Retention: permanent (no delete) — GDPR requires provable consent history.
 *            If user erases: user_id is anonymised but log rows retained
 *            for legal compliance (Art. 7(1) — controller bears burden of proof).
 *
 * Also used for KVKK (TR) and DPDP (IN) logs with law = 'KVKK' | 'DPDP'.
 */

import { Pool } from 'pg';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ConsentLaw  = 'GDPR' | 'KVKK' | 'DPDP';
export type ConsentType = 'necessary' | 'analytics' | 'marketing' | 'all';

export interface ConsentRecord {
  id:          string;           // UUID PK
  userId:      string | null;    // NULL for anonymous/pre-auth consent
  email:       string | null;    // Snapshot at time of consent (user may change email later)
  consentType: ConsentType;
  granted:     boolean;
  law:         ConsentLaw;
  version:     string;           // Consent version — bump when privacy policy changes
  ipAddress:   string;
  userAgent:   string;
  timestamp:   Date;
  withdrawnAt: Date | null;      // Populated when user later withdraws this consent
}

export interface CreateConsentInput {
  userId?:     string;
  email?:      string;
  consentType: ConsentType;
  granted:     boolean;
  law:         ConsentLaw;
  version?:    string;
  ipAddress:   string;
  userAgent:   string;
}

// ── Migration SQL ──────────────────────────────────────────────────────────────
// Run via: backend/migrations/20260324000026_create_consent_log.js

export const MIGRATION_UP = `
CREATE TABLE IF NOT EXISTS consent_log (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  email        TEXT,
  consent_type TEXT         NOT NULL CHECK (consent_type IN ('necessary','analytics','marketing','all')),
  granted      BOOLEAN      NOT NULL,
  law          TEXT         NOT NULL CHECK (law IN ('GDPR','KVKK','DPDP')),
  version      TEXT         NOT NULL DEFAULT '1.0',
  ip_address   INET,
  user_agent   TEXT,
  timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ
);

CREATE INDEX idx_consent_log_user_id   ON consent_log (user_id);
CREATE INDEX idx_consent_log_law       ON consent_log (law);
CREATE INDEX idx_consent_log_timestamp ON consent_log (timestamp DESC);

CREATE TABLE IF NOT EXISTS gdpr_erasure_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID,
  email_snapshot TEXT        NOT NULL,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  law            TEXT        NOT NULL DEFAULT 'GDPR',
  notes          TEXT
);

COMMENT ON TABLE consent_log IS 'Immutable consent audit log — GDPR Art. 7(1), KVKK md.5/1, DPDP §6';
COMMENT ON TABLE gdpr_erasure_log IS 'Erasure request log — retained 7 years per GDPR Art. 17(3)(e)';
`;

export const MIGRATION_DOWN = `
DROP TABLE IF EXISTS gdpr_erasure_log;
DROP TABLE IF EXISTS consent_log;
`;

// ── Repository ────────────────────────────────────────────────────────────────

export class ConsentLogRepository {
  constructor(private pool: Pool) {}

  /**
   * Append a new consent record.
   * consent_log is IMMUTABLE — never update, only insert.
   */
  async create(input: CreateConsentInput): Promise<ConsentRecord> {
    const { rows } = await this.pool.query<ConsentRecord>(
      `INSERT INTO consent_log
         (user_id, email, consent_type, granted, law, version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)
       RETURNING *`,
      [
        input.userId   ?? null,
        input.email    ?? null,
        input.consentType,
        input.granted,
        input.law,
        input.version  ?? '1.0',
        input.ipAddress,
        input.userAgent,
      ],
    );
    return rows[0];
  }

  /**
   * Fetch all consent records for a user, most recent first.
   * Used by GET /api/user/gdpr/consents.
   */
  async findByUserId(userId: string): Promise<ConsentRecord[]> {
    const { rows } = await this.pool.query<ConsentRecord>(
      `SELECT * FROM consent_log WHERE user_id = $1 ORDER BY timestamp DESC`,
      [userId],
    );
    return rows;
  }

  /**
   * Mark a specific consent as withdrawn.
   * Creates a new denial record (immutable log pattern) rather than updating.
   */
  async withdraw(
    userId:      string,
    consentType: ConsentType,
    law:         ConsentLaw,
    ipAddress:   string,
    userAgent:   string,
  ): Promise<ConsentRecord> {
    return this.create({
      userId,
      consentType,
      granted:   false,
      law,
      version:   '1.0',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get the latest decision for each consent type for a user.
   * Used to determine current consent state.
   */
  async latestChoices(userId: string, law: ConsentLaw): Promise<Partial<Record<ConsentType, boolean>>> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT ON (consent_type)
         consent_type, granted
       FROM consent_log
       WHERE user_id = $1 AND law = $2
       ORDER BY consent_type, timestamp DESC`,
      [userId, law],
    );
    const result: Partial<Record<ConsentType, boolean>> = {};
    for (const row of rows) {
      result[row.consent_type as ConsentType] = row.granted as boolean;
    }
    return result;
  }
}
