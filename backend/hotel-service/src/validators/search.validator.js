const Joi = require('joi');

const searchSchema = Joi.object({
  location: Joi.string().min(2).max(100).required(),
  checkIn:  Joi.string().isoDate().required(),
  checkOut: Joi.string().isoDate().required(),
  guests:   Joi.number().integer().min(1).max(20).required(),
  stars:    Joi.number().integer().min(1).max(5).optional(),
  priceMin: Joi.number().min(0).optional(),
  priceMax: Joi.number().min(0).optional(),
  currency: Joi.string().valid('SAR', 'AED', 'USD').default('SAR'),
  isUmrah:       Joi.boolean().default(false),
  isHajj:        Joi.boolean().default(false),
  halal_friendly: Joi.boolean().default(false),
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(50).default(20),
});

function validate(query) {
  return searchSchema.validate(query, { abortEarly: false, convert: true });
}

module.exports = { validate };
