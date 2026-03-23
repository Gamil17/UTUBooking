'use strict';

const Joi = require('joi');

const uuid = Joi.string().uuid({ version: 'uuidv4' }).required();

// POST /api/v1/bookings
const createBookingSchema = Joi.object({
  productType: Joi.string().valid('hotel', 'flight', 'car').required(),
  offerId:     uuid,
  totalPrice:  Joi.number().positive().precision(2).required(),
  currency:    Joi.string().valid('SAR', 'AED', 'USD', 'JOD', 'EGP', 'MAD', 'TND').default('SAR'),
  meta:        Joi.object().optional(),
}).options({ stripUnknown: true });

// GET /api/v1/bookings  (list query params)
const listBookingsSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'failed').optional(),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
}).options({ stripUnknown: true });

function validate(schema, data) {
  return schema.validate(data, { abortEarly: false });
}

module.exports = { createBookingSchema, listBookingsSchema, validate };
