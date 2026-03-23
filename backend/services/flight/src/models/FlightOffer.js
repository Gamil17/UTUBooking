'use strict';

/**
 * FlightOffer DTO
 *
 * Canonical shape returned to API clients and stored in flight_offers table.
 * Both the Amadeus and Sabre adapters produce this shape — see backend/adapters/.
 *
 * DB column mapping (flight_offers migration):
 *   flight_num        → flightNum
 *   airline_code      → airlineCode
 *   origin_iata       → originIata
 *   destination_iata  → destinationIata
 *   departure_at      → departureAt
 *   arrival_at        → arrivalAt
 *   cabin_class       → cabinClass   (enum: economy/premium_economy/business/first)
 *   price             → price        (NUMERIC 10,2)
 *   currency          → currency
 *   duration_minutes  → durationMinutes
 *   stops             → stops
 *   is_refundable     → isRefundable
 *   baggage_included  → baggageIncluded
 *   raw_payload       → raw          (jsonb — not returned to client)
 */
class FlightOffer {
  constructor({
    id,
    flightNum,
    airlineCode,
    originIata,
    destinationIata,
    departureAt,
    arrivalAt,
    cabinClass,
    price,
    currency,
    durationMinutes,
    stops,
    isRefundable,
    baggageIncluded,
    source = 'amadeus',
    raw = null,
  }) {
    this.id              = id;
    this.flightNum       = flightNum;
    this.airlineCode     = airlineCode;
    this.originIata      = originIata;
    this.destinationIata = destinationIata;
    this.departureAt     = departureAt;
    this.arrivalAt       = arrivalAt;
    this.cabinClass      = cabinClass;
    this.price           = price;
    this.currency        = currency;
    this.durationMinutes = durationMinutes;
    this.stops           = stops;
    this.isRefundable    = isRefundable;
    this.baggageIncluded = baggageIncluded;
    this.source          = source;
    this._raw            = raw; // underscore — excluded from toJSON
  }

  /** Shape sent to API clients (raw payload excluded). */
  toJSON() {
    return {
      id:              this.id,
      flightNum:       this.flightNum,
      airlineCode:     this.airlineCode,
      originIata:      this.originIata,
      destinationIata: this.destinationIata,
      departureAt:     this.departureAt,
      arrivalAt:       this.arrivalAt,
      cabinClass:      this.cabinClass,
      price:           this.price,
      currency:        this.currency,
      durationMinutes: this.durationMinutes,
      stops:           this.stops,
      isRefundable:    this.isRefundable,
      baggageIncluded: this.baggageIncluded,
      source:          this.source,
    };
  }

  /** Shape for DB INSERT into flight_offers. */
  toDbRow() {
    return {
      flight_num:       this.flightNum,
      airline_code:     this.airlineCode,
      origin_iata:      this.originIata,
      destination_iata: this.destinationIata,
      departure_at:     this.departureAt,
      arrival_at:       this.arrivalAt,
      cabin_class:      this.cabinClass.toLowerCase().replace(' ', '_'),
      price:            this.price,
      currency:         this.currency,
      duration_minutes: this.durationMinutes,
      stops:            this.stops,
      is_refundable:    this.isRefundable,
      baggage_included: this.baggageIncluded,
      raw_payload:      this._raw,
    };
  }

  /**
   * Wraps a plain adapter result object (from amadeus.js or sabre.js) in a FlightOffer.
   * Both adapters already output the camelCase FlightOffer shape so this is a thin wrapper.
   */
  static from(adapterResult) {
    return new FlightOffer({
      id:              adapterResult.id,
      flightNum:       adapterResult.flightNum,
      airlineCode:     adapterResult.airlineCode,
      originIata:      adapterResult.originIata,
      destinationIata: adapterResult.destinationIata,
      departureAt:     adapterResult.departureAt,
      arrivalAt:       adapterResult.arrivalAt,
      cabinClass:      adapterResult.cabinClass,
      price:           adapterResult.price,
      currency:        adapterResult.currency,
      durationMinutes: adapterResult.durationMinutes,
      stops:           adapterResult.stops,
      isRefundable:    adapterResult.isRefundable    ?? false,
      baggageIncluded: adapterResult.baggageIncluded ?? false,
      source:          adapterResult.source          ?? 'amadeus',
      raw:             adapterResult.raw             ?? null,
    });
  }
}

module.exports = FlightOffer;
