'use strict';

/**
 * UTUBooking Phase 4 — Artillery Processor: booking-flow-500c
 *
 * Provides helper functions used in the booking-flow-500c.yml scenario.
 * All functions are exposed on the Artillery context via `module.exports`.
 *
 * Market distribution (mirrors production traffic):
 *   KSA  70% — largest market, Makkah/Madinah primary destinations
 *   UAE  20% — second market, Dubai origin
 *   Other 10% — JOR, MAR, TUN, KWT
 */

const { faker } = require('@faker-js/faker');

// ── Hotel IDs seeded in staging DB ─────────────────────────────────────────
const HOTEL_IDS_BY_CITY = {
  Makkah:  ['MCM001', 'MCM002', 'MCM003', 'MCM004', 'MCM005', 'MCM006', 'MCM007'],
  Madinah: ['MED001', 'MED002', 'MED003', 'MED004'],
  Riyadh:  ['RUH001', 'RUH002', 'RUH003'],
  Dubai:   ['DXB001', 'DXB002'],
};

// ── Country code distribution (ISO alpha-3) ─────────────────────────────────
const COUNTRY_DISTRIBUTION = [
  ...Array(70).fill('SAU'),   // 70% KSA
  ...Array(20).fill('ARE'),   // 20% UAE
  ...Array(5).fill('JOR'),    // 5% Jordan
  ...Array(3).fill('MAR'),    // 3% Morocco
  ...Array(2).fill('TUN'),    // 2% Tunisia
];

// ── Locations for search ────────────────────────────────────────────────────
const LOCATIONS = [
  ...Array(60).fill('Makkah'),    // 60% Makkah (Hajj/Umrah)
  ...Array(25).fill('Madinah'),   // 25% Madinah
  ...Array(10).fill('Riyadh'),    // 10% Riyadh
  ...Array(5).fill('Dubai'),      // 5% Dubai
];

// ── Staging user pool (100 pre-seeded test accounts) ────────────────────────
// Real credentials match backend/seeds/staging-users.json
const USER_POOL_SIZE = 100;

function generateEmail() {
  const idx = Math.floor(Math.random() * USER_POOL_SIZE);
  return `loadtest_user_${String(idx).padStart(3, '0')}@staging.utubooking.com`;
}

function pickLocation() {
  return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
}

function randomCountryCode() {
  return COUNTRY_DISTRIBUTION[Math.floor(Math.random() * COUNTRY_DISTRIBUTION.length)];
}

// Check-in: 30–90 days in the future (avoid same-day for staging)
function checkInDate() {
  const daysAhead = 30 + Math.floor(Math.random() * 60);
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// Check-out: 2–7 nights after check-in
function checkOutDate() {
  const checkIn = new Date(checkInDate());
  const nights = 2 + Math.floor(Math.random() * 6);
  checkIn.setDate(checkIn.getDate() + nights);
  return checkIn.toISOString().split('T')[0];
}

function randomGuests() {
  const weights = [0, 1, 1, 2, 2, 2, 3, 3, 4]; // weighted: mostly 2-3 guests
  return weights[Math.floor(Math.random() * weights.length)] + 1;
}

function randomFirstName() {
  const names = [
    'Mohammed', 'Ahmad', 'Abdullah', 'Omar', 'Ali', 'Khalid', 'Fahad',
    'Fatima', 'Aisha', 'Nora', 'Sara', 'Maryam', 'Layla', 'Hana',
    'Yusuf', 'Ibrahim', 'Hassan', 'Hamza', 'Tariq', 'Walid',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function randomLastName() {
  const names = [
    'Al-Rashid', 'Al-Saud', 'Al-Hamdan', 'Al-Ghamdi', 'Al-Zahrani',
    'Al-Shehri', 'Al-Harbi', 'Al-Otaibi', 'Al-Qahtani', 'Al-Asiri',
    'Benali', 'Mansouri', 'Khalil', 'Hassan', 'Abdullah',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

// Saudi mobile: +9665XXXXXXXX (05XXXXXXXX format)
function randomSaudiPhone() {
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `+9665${suffix}`;
}

// For Mada card test tokens
function randomCardSuffix() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// ── Artillery `beforeRequest` hook ─────────────────────────────────────────
// Injects custom headers for request tracing in staging
function setTraceHeaders(requestParams, context, ee, next) {
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Load-Test'] = 'artillery-500c';
  requestParams.headers['X-Request-ID'] = `lt-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  return next();
}

// ── Artillery `afterResponse` hook ─────────────────────────────────────────
// Log non-2xx responses to stdout for post-test analysis
function logErrors(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.error(
      `[LOAD_TEST_ERROR] ${response.statusCode} ${requestParams.method} ${requestParams.url}`,
      `| body: ${String(response.body).substring(0, 200)}`
    );
    ee.emit('counter', `http.${response.statusCode}`, 1);
  }
  return next();
}

module.exports = {
  // Data generators (called from YAML via {{ functionName() }})
  generateEmail,
  pickLocation,
  randomCountryCode,
  checkInDate,
  checkOutDate,
  randomGuests,
  randomFirstName,
  randomLastName,
  randomSaudiPhone,
  randomCardSuffix,

  // Artillery lifecycle hooks
  setTraceHeaders,
  logErrors,
};
