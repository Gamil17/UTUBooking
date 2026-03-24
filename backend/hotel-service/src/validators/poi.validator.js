'use strict';

const Joi = require('joi');

const poiHalalSchema = Joi.object({
  lat:    Joi.number().min(-90).max(90).required(),
  lng:    Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(100).max(5000).default(1000),
}).options({ stripUnknown: true });

function validatePoiHalal(query) {
  return poiHalalSchema.validate(query, { abortEarly: false, convert: true });
}

module.exports = { validatePoiHalal };
