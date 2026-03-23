'use strict';

const Joi = require('joi');

const CURRENCIES = ['SAR', 'AED', 'USD', 'JOD', 'EGP', 'MAD', 'TND'];
const LOCALES    = ['en', 'ar', 'ar-SA', 'ar-JO', 'ar-EG', 'ar-MA', 'ar-TN', 'fr', 'fr-MA', 'fr-TN'];
const MODULES    = ['hotel', 'flight', 'car'];

const createTenantSchema = Joi.object({
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(2)
    .max(50)
    .required()
    .messages({ 'string.pattern.base': 'slug must be lowercase alphanumeric with hyphens only' }),

  name: Joi.string().min(2).max(200).required(),

  domain: Joi.string()
    .hostname()
    .required()
    .messages({ 'string.hostname': 'domain must be a valid hostname' }),

  custom_domain: Joi.string().hostname().optional().allow(null, ''),

  logo_url: Joi.string().uri().optional().allow(null, ''),

  primary_color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default('#10B981')
    .messages({ 'string.pattern.base': 'primary_color must be a 6-digit hex color e.g. #10B981' }),

  secondary_color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default('#111827'),

  currency: Joi.string().valid(...CURRENCIES).default('USD'),

  locale: Joi.string().valid(...LOCALES).default('en'),

  // tenant_configs fields — included in create payload for convenience
  commission_rates: Joi.object({
    hotel:  Joi.number().min(0).max(1).default(0.60),
    flight: Joi.number().min(0).max(1).default(0.60),
    car:    Joi.number().min(0).max(1).default(0.60),
  }).default({ hotel: 0.60, flight: 0.60, car: 0.60 }),

  enabled_modules: Joi.array()
    .items(Joi.string().valid(...MODULES))
    .min(1)
    .default(['hotel', 'flight', 'car']),

  hide_platform_branding: Joi.boolean().default(false),

  revenue_share_pct: Joi.number().min(0).max(100).default(40.00),
});

const updateTenantSchema = createTenantSchema.fork(
  ['slug', 'name', 'domain'],
  (field) => field.optional()
);

function validateCreate(body) {
  return createTenantSchema.validate(body, { abortEarly: false, stripUnknown: true });
}

function validateUpdate(body) {
  return updateTenantSchema.validate(body, { abortEarly: false, stripUnknown: true });
}

module.exports = { validateCreate, validateUpdate };
