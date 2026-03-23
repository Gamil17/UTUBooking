'use strict';

const Joi = require('joi');

const iataCode = Joi.string().length(3).uppercase().required();

const flightSearchSchema = Joi.object({
  origin:      iataCode,
  destination: iataCode,
  date:        Joi.string().isoDate().required(),           // 'YYYY-MM-DD'
  returnDate:  Joi.string().isoDate().optional(),           // 'YYYY-MM-DD' — round trip
  adults:      Joi.number().integer().min(1).max(9).default(1),
  cabinClass:  Joi.string()
                  .valid('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST')
                  .default('ECONOMY'),
  currency:    Joi.string().valid('SAR', 'AED', 'USD', 'MYR', 'IDR', 'INR', 'PKR').default('SAR'),
  maxOffers:   Joi.number().integer().min(1).max(50).default(20),
}).options({ stripUnknown: true });

function validate(data) {
  return flightSearchSchema.validate(data, { abortEarly: false });
}

module.exports = { flightSearchSchema, validate };
