const Joi = require('joi');

const uuid     = Joi.string().uuid({ version: 'uuidv4' }).required();
const currency = Joi.string().valid('SAR', 'AED', 'USD').default('SAR');
const amount   = Joi.number().positive().precision(2).required();
const httpsUrl = Joi.string().uri({ scheme: ['https'] }).optional();

// ─── STC Pay: initiate ────────────────────────────────────────────────────────
// Ref: backend/docs/stcpay-api.md § Request – Payment Initiation
// Amount accepted as SAR decimal; gateway converts to fils (× 100) internally.
const stcpayInitiateSchema = Joi.object({
  bookingId:  uuid,
  amount,
  currency,
  successUrl: httpsUrl,  // optional redirect on payment success
  failureUrl: httpsUrl,  // optional redirect on payment failure
}).options({ stripUnknown: true });

// ─── Moyasar Mada: charge ─────────────────────────────────────────────────────
const madaChargeSchema = Joi.object({
  bookingId:   uuid,
  amount,
  currency,
  description: Joi.string().max(255).optional(),
  source: Joi.object({
    type:  Joi.string().valid('mada').required(),
    token: Joi.string().required(),  // token from Moyasar.js
    name:  Joi.string().max(100).required(),
    month: Joi.string().pattern(/^\d{2}$/).required(),
    year:  Joi.string().pattern(/^\d{2}$/).required(),
  }).required(),
}).options({ stripUnknown: true });

// ─── Stripe: initiate ─────────────────────────────────────────────────────────
const stripeInitiateSchema = Joi.object({
  bookingId:   uuid,
  amount,
  currency:    Joi.string().valid('SAR', 'AED', 'USD', 'EUR', 'GBP').default('SAR'),
  description: Joi.string().max(255).optional(),
}).options({ stripUnknown: true });

// ─── Helper ───────────────────────────────────────────────────────────────────
function validate(schema, data) {
  return schema.validate(data, { abortEarly: false });
}

module.exports = {
  stcpayInitiateSchema,
  madaChargeSchema,
  stripeInitiateSchema,
  validate,
};
