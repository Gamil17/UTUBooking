/**
 * PrivacyPreferences model
 *
 * One row per user — tracks CCPA opt-out and optional GDPR consent blob.
 * Uses upsert (INSERT ... ON CONFLICT DO UPDATE) — not append-only.
 * For the immutable consent audit trail, use ConsentLog.ts instead.
 */

import { Pool } from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrivacyPreferencesRow {
  id:                 string;
  user_id:            string;
  ccpa_opted_out:     boolean;
  ccpa_opted_out_at:  Date | null;
  gdpr_consent:       Record<string, boolean> | null;
  ip_address:         string | null;
  user_agent:         string | null;
  updated_at:         Date;
}

export interface UpsertCcpaOpts {
  userId:    string;
  optedOut:  boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpsertGdprOpts {
  userId:      string;
  gdprConsent: Record<string, boolean>;
}

// ── Repository ────────────────────────────────────────────────────────────────

export class PrivacyPreferencesRepository {
  constructor(private readonly pool: Pool) {}

  /** Upsert CCPA opt-out status for a user. */
  async setCcpaOptOut(opts: UpsertCcpaOpts): Promise<PrivacyPreferencesRow> {
    const { userId, optedOut, ipAddress, userAgent } = opts;

    const result = await this.pool.query<PrivacyPreferencesRow>(
      `INSERT INTO privacy_preferences
         (user_id, ccpa_opted_out, ccpa_opted_out_at, ip_address, user_agent, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET ccpa_opted_out    = EXCLUDED.ccpa_opted_out,
             ccpa_opted_out_at = CASE
               WHEN EXCLUDED.ccpa_opted_out = TRUE THEN NOW()
               ELSE NULL
             END,
             ip_address        = EXCLUDED.ip_address,
             user_agent        = EXCLUDED.user_agent,
             updated_at        = NOW()
       RETURNING *`,
      [
        userId,
        optedOut,
        optedOut ? new Date() : null,
        ipAddress ?? null,
        userAgent ?? null,
      ],
    );

    return result.rows[0];
  }

  /** Get current preferences for a user. Returns null if no row exists. */
  async findByUserId(userId: string): Promise<PrivacyPreferencesRow | null> {
    const result = await this.pool.query<PrivacyPreferencesRow>(
      `SELECT * FROM privacy_preferences WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  /** Check if a user has opted out of CCPA data sale/sharing. */
  async isCcpaOptedOut(userId: string): Promise<boolean> {
    const row = await this.findByUserId(userId);
    return row?.ccpa_opted_out ?? false;
  }

  /** Update GDPR consent blob (supplement to immutable consent_log). */
  async setGdprConsent(opts: UpsertGdprOpts): Promise<void> {
    const { userId, gdprConsent } = opts;

    await this.pool.query(
      `INSERT INTO privacy_preferences
         (user_id, gdpr_consent, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET gdpr_consent = EXCLUDED.gdpr_consent,
             updated_at   = NOW()`,
      [userId, JSON.stringify(gdprConsent)],
    );
  }

  /**
   * Return all opted-out user IDs for a given countryCode shard.
   * Used by email marketing service to exclude opted-out US users.
   */
  async getOptedOutUserIds(): Promise<string[]> {
    const result = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM privacy_preferences WHERE ccpa_opted_out = TRUE`,
    );
    return result.rows.map((r) => r.user_id);
  }

  /**
   * Delete preferences row — called by CCPA delete endpoint and GDPR erasure.
   * The user row itself is anonymised by the erasure handler.
   */
  async deleteByUserId(userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM privacy_preferences WHERE user_id = $1`,
      [userId],
    );
  }
}

export default PrivacyPreferencesRepository;
