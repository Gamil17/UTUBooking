'use strict';

const Joi = require('joi');

const isoDate    = Joi.string().isoDate().required();
const iataCode   = Joi.string().min(3).max(10).uppercase().required();

const carSearchSchema = Joi.object({
  pickupLocation:   iataCode,
  dropoffLocation:  Joi.string().min(3).max(10).uppercase().optional(), // defaults to pickupLocation
  pickupDate:       isoDate,
  dropoffDate:      isoDate,
  vehicleType:      Joi.string().valid('sedan', 'suv', 'van', 'compact', 'luxury').optional(),
  transmission:     Joi.string().valid('automatic', 'manual').optional(),
  currency:         Joi.string().valid('SAR', 'AED', 'USD', 'JOD', 'KWD', 'BHD', 'MAD', 'TND').default('SAR'),
  maxOffers:        Joi.number().integer().min(1).max(50).default(20),
}).options({ stripUnknown: true });

function validate(data) {
  return carSearchSchema.validate(data, { abortEarly: false });
}

module.exports = { carSearchSchema, validate };
