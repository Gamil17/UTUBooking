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
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters.',
    'any.required': 'Password is required.',
  });

const refreshToken = Joi
  .string()
  .required()
  .messages({ 'any.required': 'refreshToken is required.' });

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = Joi.object({ email, password }).options({ stripUnknown: true });

const loginSchema    = Joi.object({ email, password }).options({ stripUnknown: true });

const refreshSchema  = Joi.object({ refreshToken }).options({ stripUnknown: true });

const logoutSchema   = Joi.object({ refreshToken }).options({ stripUnknown: true });

// ─── Validate helper ─────────────────────────────────────────────────────────

function validate(schema, data) {
  return schema.validate(data, { abortEarly: false });
}

module.exports = { registerSchema, loginSchema, refreshSchema, logoutSchema, validate };
