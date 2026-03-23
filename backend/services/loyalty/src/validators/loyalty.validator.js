'use strict';

const Joi = require('joi');

const earnSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),
  amountSAR: Joi.number().positive().precision(2).max(1000000).required(),
});

const redeemSchema = Joi.object({
  rewardId: Joi.string().uuid().required(),
});

const rewardsQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

function validate(schema, data) {
  return schema.validate(data, { abortEarly: false, convert: true });
}

module.exports = { earnSchema, redeemSchema, rewardsQuerySchema, validate };
