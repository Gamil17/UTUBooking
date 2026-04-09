/**
 * Departure Airport Suggestions Controller
 *
 * GET /api/v1/flights/departures?countryCode=US&tripType=umrah
 *
 * Returns an ordered list of suggested departure airports for a given country
 * and trip type (umrah or hajj). Detroit/DTW is listed first for US due to
 * the highest Muslim population density (Dearborn, MI).
 *
 * In-memory static data — no DB or cache needed. Data changes at most annually
 * when new US Muslim community hubs are added.
 */

'use strict';

const Joi = require('joi');

// ─── Static departure data ────────────────────────────────────────────────────

const US_UMRAH_HAJJ_DEPARTURES = [
  {
    iata:       'DTW',
    city:       'Detroit / Dearborn',
    name:       'Detroit Metropolitan Wayne County Airport',
    state:      'MI',
    muslimPop:  'very_large',  // Dearborn has highest Muslim pop density in US
    note:       'Nearest airport to Dearborn — largest Muslim community in the US',
  },
  {
    iata:       'JFK',
    city:       'New York City',
    name:       'John F. Kennedy International Airport',
    state:      'NY',
    muslimPop:  'large',
  },
  {
    iata:       'ORD',
    city:       'Chicago',
    name:       "O'Hare International Airport",
    state:      'IL',
    muslimPop:  'large',
  },
  {
    iata:       'IAD',
    city:       'Washington D.C.',
    name:       'Washington Dulles International Airport',
    state:      'VA',
    muslimPop:  'large',
  },
  {
    iata:       'LAX',
    city:       'Los Angeles',
    name:       'Los Angeles International Airport',
    state:      'CA',
    muslimPop:  'large',
  },
  {
    iata:       'IAH',
    city:       'Houston',
    name:       'George Bush Intercontinental Airport',
    state:      'TX',
    muslimPop:  'medium',
  },
];

// Maps to common Umrah/Hajj destinations from the US
const UMRAH_DESTINATIONS = ['JED', 'MED'];
const HAJJ_DESTINATIONS  = ['JED'];

const DEPARTURE_MAP = {
  US: {
    umrah: US_UMRAH_HAJJ_DEPARTURES,
    hajj:  US_UMRAH_HAJJ_DEPARTURES,
  },
};

const DESTINATION_MAP = {
  US: {
    umrah: UMRAH_DESTINATIONS,
    hajj:  HAJJ_DESTINATIONS,
  },
};

// ─── Validation ───────────────────────────────────────────────────────────────

const departuresSchema = Joi.object({
  countryCode: Joi.string().length(2).uppercase().required(),
  tripType:    Joi.string().valid('umrah', 'hajj').default('umrah'),
}).options({ stripUnknown: true });

// ─── Handler ──────────────────────────────────────────────────────────────────

function getDepartures(req, res) {
  const { error, value: params } = departuresSchema.validate(req.query, {
    abortEarly: false,
    convert:    true,
  });

  if (error) {
    return res.status(400).json({
      error:   'VALIDATION_ERROR',
      details: error.details.map((d) => d.message),
    });
  }

  const { countryCode, tripType } = params;
  const departures    = DEPARTURE_MAP[countryCode]?.[tripType];
  const destinations  = DESTINATION_MAP[countryCode]?.[tripType];

  if (!departures) {
    return res.status(200).json({
      countryCode,
      tripType,
      destinations: UMRAH_DESTINATIONS,
      departures:   [],
      message:      `No departure suggestions available for ${countryCode}. Use IATA origin codes directly.`,
    });
  }

  return res.json({
    countryCode,
    tripType,
    destinations,
    departures,
  });
}

module.exports = { getDepartures };
