'use strict';

const repo = require('../db/loyalty.repo');
const { earnSchema, redeemSchema, rewardsQuerySchema, validate } = require('../validators/loyalty.validator');

// GET /api/v1/loyalty/account
async function getAccount(req, res, next) {
  try {
    const account = await repo.getAccount(req.user.id);

    if (!account) {
      // Auto-create a new account on first access
      return res.json({
        tier:           'silver',
        points:         0,
        lifetimePoints: 0,
        nextTierAt:     5000,
        nextTierName:   'gold',
      });
    }

    const { nextTierAt, nextTierName } = repo.nextTierInfo(account.lifetime_points);

    return res.json({
      tier:           account.tier,
      points:         account.points,
      lifetimePoints: account.lifetime_points,
      nextTierAt,
      nextTierName,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/loyalty/earn
async function earn(req, res, next) {
  try {
    const { error, value } = validate(earnSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const result = await repo.earnPoints(req.user.id, value.bookingId, value.amountSAR);
    const { nextTierAt, nextTierName } = repo.nextTierInfo(result.lifetime_points);

    return res.status(201).json({
      earned:         result.earned,
      points:         result.points,
      lifetimePoints: result.lifetime_points,
      tier:           result.tier,
      nextTierAt,
      nextTierName,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/loyalty/redeem
async function redeem(req, res, next) {
  try {
    const { error, value } = validate(redeemSchema, req.body);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const reward = await repo.getRewardById(value.rewardId);
    if (!reward) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Reward not found' });
    }
    if (!reward.is_active || (reward.valid_until && new Date(reward.valid_until) < new Date())) {
      return res.status(400).json({ error: 'REWARD_UNAVAILABLE', message: 'Reward is no longer available' });
    }

    const result = await repo.redeemReward(req.user.id, reward);

    return res.json({
      discountSAR: result.discountSAR,
      token:       result.token,
      rewardName:  result.rewardName,
      message:     `${result.rewardName} redeemed successfully`,
    });
  } catch (err) {
    if (err.name === 'INSUFFICIENT_POINTS') {
      return res.status(400).json({ error: err.name, message: err.message });
    }
    next(err);
  }
}

// GET /api/v1/loyalty/rewards
async function getRewards(req, res, next) {
  try {
    const { error, value } = validate(rewardsQuerySchema, req.query);
    if (error) {
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }

    const { rewards, count } = await repo.getActiveRewards(value);
    return res.json({ count, page: value.page, limit: value.limit, results: rewards });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAccount, earn, redeem, getRewards };
