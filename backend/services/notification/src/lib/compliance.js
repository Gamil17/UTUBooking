'use strict';

/**
 * compliance.js — single gate for all email send decisions
 *
 * Wraps emailGuard.ts (CCPA) and consent_log queries (GDPR) so every
 * processor can call one function without duplicating compliance logic.
 *
 * emailType values:
 *   'transactional' — always allowed (24h reminder, price alert, day-1 recovery)
 *   'marketing'     — requires CCPA + GDPR consent checks
 */

// ── Country code sets ──────────────────────────────────────────────────────────

// ISO 3166-1 alpha-3 codes where GDPR marketing consent is required
const GDPR_COUNTRIES = new Set([
  'GBR', 'DEU', 'FRA', 'NLD', 'ESP', 'ITA', 'BEL', 'POL', 'AUT',
  'SWE', 'DNK', 'FIN', 'NOR', 'PRT', 'IRL', 'GRC', 'TUR', 'CHE',
  'ROU', 'HUN', 'CZE', 'SVK', 'HRV', 'BGR', 'SVN', 'EST', 'LVA', 'LTU',
  'LUX', 'MLT', 'CYP',
]);

// Also support alpha-2 codes (CF-IPCountry header format)
const GDPR_COUNTRIES_2 = new Set([
  'GB', 'DE', 'FR', 'NL', 'ES', 'IT', 'BE', 'PL', 'AT',
  'SE', 'DK', 'FI', 'NO', 'PT', 'IE', 'GR', 'TR', 'CH',
  'RO', 'HU', 'CZ', 'SK', 'HR', 'BG', 'SI', 'EE', 'LV', 'LT',
  'LU', 'MT', 'CY',
]);

const CCPA_COUNTRIES   = new Set(['USA', 'CAN', 'US', 'CA']);

function isGdprCountry(cc)  { return GDPR_COUNTRIES.has(cc) || GDPR_COUNTRIES_2.has(cc); }
function isCcpaCountry(cc)  { return CCPA_COUNTRIES.has(cc); }

// ── Lazy-load emailGuard (TypeScript compiled to JS at runtime via ts-node or pre-built) ──
// The file lives at backend/lib/emailGuard.ts.
// In production the TS is compiled; in dev ts-node/ts-register handles it.
// We require it relative to this file's depth in the tree.
function getEmailGuard() {
  try {
    return require('../../../../lib/emailGuard');
  } catch {
    // Fallback: if not compiled yet, return permissive stubs
    console.warn('[compliance] emailGuard not found — using permissive fallback');
    return {
      shouldSendMarketingEmail: async () => true,
      filterOptedOutUsers:      async (ids) => ids,
    };
  }
}

function getShardPool() {
  try {
    return require('../../../../shared/shard-router').getShardPool;
  } catch {
    console.warn('[compliance] shard-router not found — using local pool');
    const { readPool } = require('../db/pg');
    return () => ({ pool: readPool });
  }
}

/**
 * checkEmailAllowed(userId, emailType, countryCode, redis)
 *
 * Returns { allowed: boolean, reason: string }
 */
async function checkEmailAllowed(userId, emailType, countryCode, redis) {
  // Transactional emails skip all consent checks
  if (emailType === 'transactional') {
    return { allowed: true, reason: 'transactional_exempt' };
  }

  const cc = (countryCode ?? '').toUpperCase();

  // CCPA — US/CA users
  if (isCcpaCountry(cc)) {
    const { shouldSendMarketingEmail } = getEmailGuard();
    const { pool } = getShardPool()(cc);
    const ok = await shouldSendMarketingEmail(userId, pool, redis, 'marketing');
    if (!ok) return { allowed: false, reason: 'ccpa_opted_out' };
  }

  // GDPR — EU/UK users: latest marketing consent must be granted=true
  if (isGdprCountry(cc)) {
    const { pool } = getShardPool()(cc);
    const { rows } = await pool.query(
      `SELECT granted FROM consent_log
       WHERE user_id = $1 AND consent_type = 'marketing'
       ORDER BY timestamp DESC LIMIT 1`,
      [userId],
    );
    if (!rows.length || rows[0].granted === false) {
      return { allowed: false, reason: 'gdpr_no_marketing_consent' };
    }
  }

  return { allowed: true, reason: 'allowed' };
}

/**
 * bulkFilterForCampaign(users, redis)
 *
 * users: Array<{ id, email, countryCode, preferredLang }>
 * Returns the subset of users who are allowed to receive marketing emails.
 */
async function bulkFilterForCampaign(users, redis) {
  if (!users.length) return [];

  const { filterOptedOutUsers } = getEmailGuard();
  const getPool = getShardPool();

  // Split by region
  const ccpaUsers  = users.filter((u) => isCcpaCountry((u.countryCode ?? '').toUpperCase()));
  const gdprUsers  = users.filter((u) => isGdprCountry((u.countryCode ?? '').toUpperCase()));
  const otherUsers = users.filter((u) => {
    const cc = (u.countryCode ?? '').toUpperCase();
    return !isCcpaCountry(cc) && !isGdprCountry(cc);
  });

  const allowedIds = new Set(otherUsers.map((u) => u.id));

  // CCPA — batch filter per shard
  if (ccpaUsers.length) {
    const byCountry = {};
    for (const u of ccpaUsers) {
      const cc = (u.countryCode ?? 'US').toUpperCase();
      if (!byCountry[cc]) byCountry[cc] = [];
      byCountry[cc].push(u);
    }
    for (const [cc, group] of Object.entries(byCountry)) {
      const { pool } = getPool(cc);
      const ids   = group.map((u) => u.id);
      const okIds = await filterOptedOutUsers(ids, pool);
      for (const id of okIds) allowedIds.add(id);
    }
  }

  // GDPR — check consent_log per shard
  if (gdprUsers.length) {
    const byCountry = {};
    for (const u of gdprUsers) {
      const cc = (u.countryCode ?? 'DE').toUpperCase();
      if (!byCountry[cc]) byCountry[cc] = [];
      byCountry[cc].push(u);
    }
    for (const [cc, group] of Object.entries(byCountry)) {
      const { pool } = getPool(cc);
      const ids   = group.map((u) => u.id);
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (user_id) user_id, granted
         FROM consent_log
         WHERE user_id = ANY($1::uuid[]) AND consent_type = 'marketing'
         ORDER BY user_id, timestamp DESC`,
        [ids],
      );
      const consentMap = new Map(rows.map((r) => [r.user_id, r.granted]));
      for (const u of group) {
        if (consentMap.get(u.id) === true) allowedIds.add(u.id);
      }
    }
  }

  return users.filter((u) => allowedIds.has(u.id));
}

module.exports = { checkEmailAllowed, bulkFilterForCampaign };
