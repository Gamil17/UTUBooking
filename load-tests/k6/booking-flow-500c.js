/**
 * UTUBooking Phase 4 — k6 Load Test: 500 Concurrent Full Booking Flow
 *
 * Parallel load test tool to Artillery (for cross-validation of P95/P99 results).
 * Covers: Auth → Hotel Search → Hotel Detail → Create Booking → STC Pay
 *
 * Run:
 *   LOAD_TEST_API_URL=https://api-staging.utubooking.com \
 *   k6 run load-tests/k6/booking-flow-500c.js
 *
 * Output: k6 summary + influxDB/CloudWatch metrics (via K6_OUT env var)
 *
 * Thresholds:
 *   http_req_duration p(95) < 800ms — full booking flow
 *   http_req_duration p(99) < 2000ms
 *   http_req_failed < 0.5%
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = __ENV.LOAD_TEST_API_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    // Main scenario: ramp to 500 VUs, sustain for 5 minutes
    booking_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 50  },   // warm-up
        { duration: '2m',  target: 500 },   // ramp to 500 concurrent
        { duration: '5m',  target: 500 },   // sustain 500 concurrent
        { duration: '1m',  target: 0   },   // cool-down
      ],
      gracefulRampDown: '30s',
    },
    // Secondary: search-only users from North Africa (via EU-West endpoint)
    search_only_na: {
      executor: 'constant-vus',
      vus: 50,
      duration: '9m',
      startTime: '0s',
      env: { SCENARIO: 'search_only' },
    },
  },

  thresholds: {
    // Full flow P95/P99
    'http_req_duration{scenario:booking_flow}': [
      'p(95)<800',
      'p(99)<2000',
    ],
    // Error rate
    'http_req_failed': ['rate<0.005'],  // < 0.5%
    // Individual step thresholds
    'step_duration{step:auth}':    ['p(95)<300'],
    'step_duration{step:search}':  ['p(95)<500'],
    'step_duration{step:booking}': ['p(95)<600'],
    'step_duration{step:payment}': ['p(95)<1500'],
    // Custom counters
    'booking_success': ['count>1000'],   // At least 1000 successful bookings over the test
  },

  // k6 summary output
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
};

// ── Custom Metrics ────────────────────────────────────────────────────────────

const stepDuration = new Trend('step_duration', true);
const bookingSuccess = new Counter('booking_success');
const paymentErrors = new Counter('payment_errors');
const authErrors = new Counter('auth_errors');
const errorRate = new Rate('error_rate');

// ── Data Generators ───────────────────────────────────────────────────────────

const LOCATIONS = [
  ...Array(60).fill('Makkah'),
  ...Array(25).fill('Madinah'),
  ...Array(10).fill('Riyadh'),
  ...Array(5).fill('Dubai'),
];

const FIRST_NAMES = [
  'Mohammed', 'Ahmad', 'Abdullah', 'Omar', 'Ali', 'Khalid', 'Fahad',
  'Fatima', 'Aisha', 'Nora', 'Sara', 'Maryam', 'Layla',
];

const LAST_NAMES = [
  'Al-Rashid', 'Al-Saud', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Shehri',
  'Al-Harbi', 'Al-Otaibi', 'Al-Qahtani', 'Benali', 'Mansouri',
];

function generateEmail(vuId) {
  return `loadtest_user_${String(vuId % 100).padStart(3, '0')}@staging.utubooking.com`;
}

function randomSaudiPhone() {
  return `+9665${String(randomIntBetween(10000000, 99999999))}`;
}

function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// ── Common Headers ────────────────────────────────────────────────────────────

function authHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Load-Test': 'k6-500c',
    'X-Request-ID': `k6-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  };
}

// ── Main Virtual User Flow ────────────────────────────────────────────────────

export default function () {
  const vuId = __VU;
  const scenario = __ENV.SCENARIO || 'full_booking';

  if (scenario === 'search_only') {
    searchOnlyFlow(vuId);
    return;
  }

  fullBookingFlow(vuId);
}

function fullBookingFlow(vuId) {
  let authToken = null;
  let bookingId = null;

  // ── Step 1: Auth ────────────────────────────────────────────────────────
  group('auth', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        email: generateEmail(vuId),
        password: 'TestPass123!',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    stepDuration.add(Date.now() - t0, { step: 'auth' });

    const ok = check(res, {
      'auth: status 200': (r) => r.status === 200,
      'auth: has accessToken': (r) => {
        try { return JSON.parse(r.body).accessToken !== undefined; }
        catch { return false; }
      },
    });

    if (!ok) {
      authErrors.add(1);
      errorRate.add(1);
      return;
    }

    authToken = JSON.parse(res.body).accessToken;
    errorRate.add(0);
  });

  if (!authToken) return;
  sleep(0.5);

  // ── Step 2: Hotel Search ────────────────────────────────────────────────
  let hotelId = null;
  let totalAmount = null;
  const checkIn = futureDate(30 + randomIntBetween(0, 60));
  const checkOut = futureDate(30 + randomIntBetween(0, 60) + randomIntBetween(2, 7));
  const location = randomItem(LOCATIONS);

  group('hotel_search', () => {
    const t0 = Date.now();
    const res = http.get(
      `${BASE_URL}/api/v1/hotels/search?location=${location}&checkIn=${checkIn}&checkOut=${checkOut}&guests=2`,
      { headers: authHeaders(authToken) }
    );
    stepDuration.add(Date.now() - t0, { step: 'search' });

    const ok = check(res, {
      'search: status 200': (r) => r.status === 200,
      'search: has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.results) && body.results.length > 0;
        } catch { return false; }
      },
    });

    if (ok) {
      const body = JSON.parse(res.body);
      hotelId = body.results[0].id;
    } else {
      errorRate.add(1);
    }
  });

  if (!hotelId) return;
  sleep(1);  // User browses results

  // ── Step 3: Hotel Detail ────────────────────────────────────────────────
  group('hotel_detail', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/hotels/${hotelId}`,
      { headers: authHeaders(authToken) }
    );
    check(res, { 'detail: status 200': (r) => r.status === 200 });
  });

  sleep(2);  // User reads hotel details

  // ── Step 4: Create Booking ──────────────────────────────────────────────
  group('create_booking', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/bookings`,
      JSON.stringify({
        hotelId,
        checkIn,
        checkOut,
        guests: 2,
        guestDetails: {
          firstName: randomItem(FIRST_NAMES),
          lastName: randomItem(LAST_NAMES),
          phone: randomSaudiPhone(),
          nationality: 'SAU',
        },
      }),
      { headers: authHeaders(authToken) }
    );
    stepDuration.add(Date.now() - t0, { step: 'booking' });

    const ok = check(res, {
      'booking: status 201': (r) => r.status === 201,
      'booking: has bookingId': (r) => {
        try { return JSON.parse(r.body).bookingId !== undefined; }
        catch { return false; }
      },
    });

    if (ok) {
      const body = JSON.parse(res.body);
      bookingId = body.bookingId;
      totalAmount = body.totalAmount;
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  });

  if (!bookingId) return;
  sleep(1);  // User reviews booking before paying

  // ── Step 5: STC Pay ────────────────────────────────────────────────────
  group('payment', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/payments/stcpay`,
      JSON.stringify({
        bookingId,
        amount: totalAmount,
        currency: 'SAR',
        stcPayMobile: randomSaudiPhone(),
      }),
      { headers: authHeaders(authToken) }
    );
    stepDuration.add(Date.now() - t0, { step: 'payment' });

    const ok = check(res, {
      'payment: status 200': (r) => r.status === 200,
      'payment: status is completed/pending': (r) => {
        try {
          const s = JSON.parse(r.body).status;
          return s === 'completed' || s === 'pending';
        } catch { return false; }
      },
    });

    if (ok) {
      bookingSuccess.add(1);
      errorRate.add(0);
    } else {
      paymentErrors.add(1);
      errorRate.add(1);
    }
  });

  sleep(randomIntBetween(1, 3));
}

function searchOnlyFlow(vuId) {
  // Light search-only flow for North Africa / browsing users
  const t0 = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: generateEmail(vuId + 200), password: 'TestPass123!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) return;
  const authToken = JSON.parse(res.body).accessToken;

  http.get(
    `${BASE_URL}/api/v1/hotels/search?location=Makkah&checkIn=${futureDate(45)}&checkOut=${futureDate(50)}&guests=2`,
    { headers: authHeaders(authToken) }
  );

  sleep(randomIntBetween(3, 8));
}

// ── Summary Report ────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const p95 = data.metrics['http_req_duration'] ?
    data.metrics['http_req_duration'].values['p(95)'] : 0;
  const p99 = data.metrics['http_req_duration'] ?
    data.metrics['http_req_duration'].values['p(99)'] : 0;
  const errorPct = data.metrics['http_req_failed'] ?
    (data.metrics['http_req_failed'].values.rate * 100).toFixed(2) : 0;
  const bookings = data.metrics['booking_success'] ?
    data.metrics['booking_success'].values.count : 0;

  const passed = p95 < 800 && p99 < 2000 && parseFloat(errorPct) < 0.5;

  const summary = {
    timestamp: new Date().toISOString(),
    scenario: '500-concurrent-booking-flow',
    sla: {
      p95_ms: Math.round(p95),
      p99_ms: Math.round(p99),
      error_rate_pct: errorPct,
      successful_bookings: bookings,
      passed,
    },
    thresholds_passed: Object.entries(data.metrics)
      .filter(([, m]) => m.thresholds)
      .every(([, m]) => Object.values(m.thresholds).every(t => !t.ok === false)),
  };

  console.log('\n=== UTUBooking Load Test Summary ===');
  console.log(`P95: ${summary.sla.p95_ms}ms (threshold: <800ms) — ${summary.sla.p95_ms < 800 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`P99: ${summary.sla.p99_ms}ms (threshold: <2000ms) — ${summary.sla.p99_ms < 2000 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Error rate: ${summary.sla.error_rate_pct}% (threshold: <0.5%) — ${parseFloat(errorPct) < 0.5 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Successful bookings: ${bookings}`);
  console.log(`Overall: ${passed ? '✓ SLA MET' : '✗ SLA BREACHED'}`);

  return {
    'reports/load-test-500c-results.json': JSON.stringify(summary, null, 2),
    stdout: JSON.stringify(summary),
  };
}
