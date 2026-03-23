'use strict';

/**
 * Artillery processor: generates randomized request data.
 * Hajj-season dates, Makkah geolocation, Saudi guest profiles.
 */

// Hajj 2026: Zul-Hijja 8-13 ≈ May 24-29 2026.
// Peak booking window is 3-8 months before: Sep 2025 - Feb 2026.
// Use realistic future check-in dates for load test.
const HAJJ_CHECK_INS = [
  '2026-05-24', '2026-05-25', '2026-05-26',
  '2026-05-27', '2026-05-28',
];

const FLIGHT_ORIGINS = ['JED', 'RUH', 'DMM', 'CAI', 'KUL', 'IST', 'LHR', 'CGK'];

const PRICE_RANGES = [500, 1000, 1500, 2000, 3000, 5000];

function setHotelSearchParams(requestParams, context, ee, next) {
  const checkIn = HAJJ_CHECK_INS[Math.floor(Math.random() * HAJJ_CHECK_INS.length)];
  const nights = Math.floor(Math.random() * 7) + 3; // 3-10 nights
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkIn);
  checkOutDate.setDate(checkInDate.getDate() + nights);

  context.vars.checkIn = checkIn;
  context.vars.checkOut = checkOutDate.toISOString().split('T')[0];
  context.vars.guests = Math.floor(Math.random() * 4) + 1;
  context.vars.priceMax = PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];

  return next();
}

function setFlightSearchParams(requestParams, context, ee, next) {
  const flightDate = HAJJ_CHECK_INS[Math.floor(Math.random() * HAJJ_CHECK_INS.length)];
  // Fly in 1-3 days before check-in
  const flightDateObj = new Date(flightDate);
  flightDateObj.setDate(flightDateObj.getDate() - Math.floor(Math.random() * 3) - 1);

  context.vars.origin = FLIGHT_ORIGINS[Math.floor(Math.random() * FLIGHT_ORIGINS.length)];
  context.vars.flightDate = flightDateObj.toISOString().split('T')[0];
  context.vars.adults = Math.floor(Math.random() * 4) + 1;

  return next();
}

module.exports = { setHotelSearchParams, setFlightSearchParams };
