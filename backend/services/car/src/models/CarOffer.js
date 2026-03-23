'use strict';

/**
 * CarOffer DTO
 *
 * Canonical shape for car rental results.
 * Maps to car_offers DB table (see migration 20260307000004_create_car_offers.js).
 */
class CarOffer {
  constructor({
    id, vendorCode, vendorName, vehicleType, transmission, seats,
    pickupLocation, dropoffLocation, pickupDate, dropoffDate, days,
    pricePerDay, totalPrice, currency, airconIncluded, unlimitedMileage,
    source = 'hotelbeds', raw = null,
  }) {
    this.id               = id;
    this.vendorCode       = vendorCode;
    this.vendorName       = vendorName;
    this.vehicleType      = vehicleType;
    this.transmission     = transmission;
    this.seats            = seats;
    this.pickupLocation   = pickupLocation;
    this.dropoffLocation  = dropoffLocation;
    this.pickupDate       = pickupDate;
    this.dropoffDate      = dropoffDate;
    this.days             = days;
    this.pricePerDay      = pricePerDay;
    this.totalPrice       = totalPrice;
    this.currency         = currency;
    this.airconIncluded   = airconIncluded;
    this.unlimitedMileage = unlimitedMileage;
    this.source           = source;
    this._raw             = raw;
  }

  toJSON() {
    return {
      id: this.id, vendorCode: this.vendorCode, vendorName: this.vendorName,
      vehicleType: this.vehicleType, transmission: this.transmission, seats: this.seats,
      pickupLocation: this.pickupLocation, dropoffLocation: this.dropoffLocation,
      pickupDate: this.pickupDate, dropoffDate: this.dropoffDate, days: this.days,
      pricePerDay: this.pricePerDay, totalPrice: this.totalPrice, currency: this.currency,
      airconIncluded: this.airconIncluded, unlimitedMileage: this.unlimitedMileage,
      source: this.source,
    };
  }

  toDbRow() {
    return {
      vendor_id:        this.vendorCode,
      vehicle_type:     this.vehicleType,
      transmission:     this.transmission,
      seats:            this.seats,
      pickup_location:  this.pickupLocation,
      dropoff_location: this.dropoffLocation,
      pickup_date:      this.pickupDate,
      dropoff_date:     this.dropoffDate,
      price_per_day:    this.pricePerDay,
      currency:         this.currency,
      aircon_included:  this.airconIncluded,
      raw_payload:      this._raw,
    };
  }

  static from(adapterResult) {
    return new CarOffer(adapterResult);
  }
}

module.exports = CarOffer;
