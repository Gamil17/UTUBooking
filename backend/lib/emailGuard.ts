/**
 * emailGuard — CCPA marketing email suppression
 *
 * Call `shouldSendMarketingEmail(userId, pool, redis)` before sending ANY
 * marketing email to a US user. Returns false (suppress) when the user has
 * opted out under CCPA.
 *
 * Transactional emails (booking confirmations, receipts, security alerts)
 * are exempt — pass `emailType: 'transactional'` to bypass CCPA check.
 *
 * Usage example:
 *   const ok = await shouldSendMarketingEmail(userId, pool, redis);
 *   if (!ok) return; // skip opted-out user
 */

import { Pool } from 'pg';

type Redis = {
  get: (key: string) => Promise<string | null>;
};

export type EmailType = 'marketing' | 'transactional';

/**
 * Returns true if the email should be sent, false if it should be suppressed.
 *
 * Check order (fast-path first):
 *  1. transactional → always allowed
 *  2. Redis opt-out cache (`ccpa:opted_out:{userId}`)
 *  3. DB fallback if cache miss
 */
export async function shouldSendMarketingEmail(
  userId:    string,
  pool:      Pool,
  redis:     Redis,
  emailType: EmailType = 'marketing',
): Promise<boolean> {
  // Transactional emails are always allowed regardless of opt-out
  if (emailType === 'transactional') return true;

  // 1. Check Redis cache (set by opt-out endpoint, 24h TTL)
  const cached = await redis.get(`ccpa:opted_out:${userId}`);
  if (cached === '1') return false;   // opted out
  if (cached === '0') return true;    // explicitly not opted out

  // 2. Cache miss — fall back to DB
  const result = await pool.query<{ ccpa_opted_out: boolean }>(
    `SELECT ccpa_opted_out FROM privacy_preferences WHERE user_id = $1`,
    [userId],
  );

  if (result.rows[0]?.ccpa_opted_out === true) return false;

  return true;
}

/**
 * Bulk filter: given a list of US user IDs, return only those who
 * have NOT opted out of marketing. Used by batch email jobs.
 *
 * @param userIds    — array of user UUIDs to check
 * @param pool       — DB pool for the US shard
 */
export async function filterOptedOutUsers(
  userIds: string[],
  pool:    Pool,
): Promise<string[]> {
  if (userIds.length === 0) return [];

  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM privacy_preferences
     WHERE user_id = ANY($1::uuid[])
       AND ccpa_opted_out = TRUE`,
    [userIds],
  );

  const optedOut = new Set(result.rows.map((r) => r.user_id));
  return userIds.filter((id) => !optedOut.has(id));
}
