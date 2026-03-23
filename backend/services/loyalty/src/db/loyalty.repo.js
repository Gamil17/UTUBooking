'use strict';

const { pool } = require('./pg');

// ── Tier thresholds ─────────────────────────────────────────────────────────

const TIERS = [
  { name: 'platinum', min: 20000 },
  { name: 'gold',     min: 5000  },
  { name: 'silver',   min: 0     },
];

function computeTier(lifetimePoints) {
  for (const t of TIERS) {
    if (lifetimePoints >= t.min) return t.name;
  }
  return 'silver';
}

function nextTierInfo(lifetimePoints) {
  const idx = TIERS.findIndex((t) => lifetimePoints >= t.min);
  if (idx === 0) return { nextTierName: null, nextTierAt: null }; // already platinum
  const next = TIERS[idx - 1];
  return { nextTierName: next.name, nextTierAt: next.min };
}

// ── Account queries ─────────────────────────────────────────────────────────

async function getAccount(userId) {
  const { rows } = await pool.query(
    'SELECT id, user_id, tier, points, lifetime_points, created_at, updated_at FROM loyalty_accounts WHERE user_id = $1',
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Award points for a completed booking.
 * Uses an upsert + atomic increment inside a transaction.
 * Returns the updated account row.
 */
async function earnPoints(userId, bookingId, amountSAR) {
  const earned = Math.round(Number(amountSAR) * 10); // 1 SAR = 10 pts

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert loyalty account
    const upsertRes = await client.query(
      `INSERT INTO loyalty_accounts (user_id, tier, points, lifetime_points)
       VALUES ($1, 'silver', $2, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET points          = loyalty_accounts.points + $2,
             lifetime_points = loyalty_accounts.lifetime_points + $2,
             updated_at      = NOW()
       RETURNING id, user_id, points, lifetime_points`,
      [userId, earned],
    );

    const account = upsertRes.rows[0];
    const newTier = computeTier(account.lifetime_points);

    // Update tier if changed
    await client.query(
      'UPDATE loyalty_accounts SET tier = $1, updated_at = NOW() WHERE user_id = $2',
      [newTier, userId],
    );

    // Record ledger entry
    await client.query(
      `INSERT INTO points_ledger (user_id, booking_id, points, action, note)
       VALUES ($1, $2, $3, 'earn', $4)`,
      [userId, bookingId, earned, `Earned ${earned} pts for booking ${bookingId}`],
    );

    await client.query('COMMIT');

    return { ...account, tier: newTier, earned };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Redeem a reward.
 * Deducts points from redeemable balance (not lifetime_points).
 * Returns { discountSAR, token }.
 */
async function redeemReward(userId, reward) {
  const { v4: uuidv4 } = require('uuid');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the account row
    const accRes = await client.query(
      'SELECT id, points FROM loyalty_accounts WHERE user_id = $1 FOR UPDATE',
      [userId],
    );

    const account = accRes.rows[0];
    if (!account) {
      const err = new Error('Loyalty account not found');
      err.statusCode = 404;
      err.name = 'NOT_FOUND';
      throw err;
    }

    if (account.points < reward.points_cost) {
      const err = new Error('Insufficient points');
      err.statusCode = 400;
      err.name = 'INSUFFICIENT_POINTS';
      throw err;
    }

    await client.query(
      'UPDATE loyalty_accounts SET points = points - $1, updated_at = NOW() WHERE user_id = $2',
      [reward.points_cost, userId],
    );

    await client.query(
      `INSERT INTO points_ledger (user_id, points, action, note)
       VALUES ($1, $2, 'redeem', $3)`,
      [userId, -reward.points_cost, `Redeemed reward: ${reward.name_en}`],
    );

    await client.query('COMMIT');

    return {
      discountSAR: Number(reward.discount_sar),
      token: uuidv4(),
      rewardName: reward.name_en,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Rewards catalog ─────────────────────────────────────────────────────────

async function getActiveRewards({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT id, name_en, name_ar, points_cost, type, discount_sar, valid_until
     FROM rewards
     WHERE is_active = true
       AND (valid_until IS NULL OR valid_until > NOW())
     ORDER BY points_cost ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM rewards
     WHERE is_active = true AND (valid_until IS NULL OR valid_until > NOW())`,
  );
  return { rewards: rows, count: countRes.rows[0].count };
}

async function getRewardById(rewardId) {
  const { rows } = await pool.query(
    `SELECT id, name_en, name_ar, points_cost, type, discount_sar, valid_until, is_active
     FROM rewards WHERE id = $1`,
    [rewardId],
  );
  return rows[0] ?? null;
}

module.exports = {
  computeTier,
  nextTierInfo,
  getAccount,
  earnPoints,
  redeemReward,
  getActiveRewards,
  getRewardById,
};
