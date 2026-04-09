const Joi = require('joi');

// ─── Shared field definitions ─────────────────────────────────────────────────

const email = Joi
  .string()
  .email({ tlds: { allow: false } })
  .max(255)
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'A valid email address is required.',
    'any.required': 'Email is required.',
  });

const password = Joi
  .string()
  .min(8)
  .max(128)
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[0-9]/, 'number')
  .required()
  .messages({
    'string.min':               'Password must be at least 8 characters.',
    'string.pattern.name':      'Password must contain at least one {#name} letter.',
    'string.pattern.base':      'Password must contain at least one lowercase letter, one uppercase letter, and one number.',
    'any.required':             'Password is required.',
  });

const refreshToken = Joi
  .string()
  .required()
  .messages({ 'any.required': 'refreshToken is required.' });

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email,
  password,
  name: Joi.string().min(2).max(100).trim().required().messages({
    'string.min':   'Name must be at least 2 characters.',
    'any.required': 'Full name is required.',
  }),
  country: Joi.string().length(2).uppercase().required().messages({
    'string.length': 'Country must be a 2-letter ISO code (e.g. SA, AE, TR).',
    'any.required':  'Country is required.',
  }),
}).options({ stripUnknown: true });

const loginSchema    = Joi.object({ email, password }).options({ stripUnknown: true });

const refreshSchema  = Joi.object({ refreshToken }).options({ stripUnknown: true });

const logoutSchema   = Joi.object({ refreshToken }).options({ stripUnknown: true });

const forgotPasswordSchema = Joi
  .object({ email })
  .options({ stripUnknown: true });

const resetPasswordSchema = Joi
  .object({
    token: Joi.string().min(1).required().messages({
      'any.required': 'Reset token is required.',
    }),
    password,
  })
  .options({ stripUnknown: true });

// ─── Validate helper ─────────────────────────────────────────────────────────

function validate(schema, data) {
  return schema.validate(data, { abortEarly: false });
}

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validate,
};
