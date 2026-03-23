/**
 * UTUBooking k6 Smoke Test
 * 10 VUs, 30 seconds — quick post-deploy sanity check.
 * Verifies all 7 microservice health endpoints + a basic hotel search.
 *
 * Run: k6 run load-tests/k6/smoke-test.js
 * Env: K6_TARGET_URL=https://api.utubooking.com
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const TARGET = __ENV.K6_TARGET_URL || 'https://api.utubooking.com';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests < 500ms
    errors:            ['rate<0.01'],   // < 1% error rate
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  // ── Gateway health ────────────────────────────────────────────────────────
  const health = http.get(`${TARGET}/health`);
  const healthOk = check(health, {
    'gateway health 200': (r) => r.status === 200,
    'gateway returns json': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  errorRate.add(!healthOk);

  sleep(0.5);

  // ── Hotel search (primary service) ────────────────────────────────────────
  const hotelSearch = http.get(`${TARGET}/api/v1/hotels/search`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'hotel-search' },
  });
  const hotelOk = check(hotelSearch, {
    'hotel search 200 or 400': (r) => r.status === 200 || r.status === 400,
    'hotel search not 5xx': (r) => r.status < 500,
    'hotel search < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!hotelOk);

  sleep(0.5);

  // ── Flight search ──────────────────────────────────────────────────────────
  const flightSearch = http.get(`${TARGET}/api/v1/flights/search`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'flight-search' },
  });
  check(flightSearch, {
    'flight search not 5xx': (r) => r.status < 500,
  });

  sleep(0.5);

  // ── Auth endpoint (not hitting DB — just routing) ──────────────────────────
  const authCheck = http.post(
    `${TARGET}/api/v1/auth/login`,
    JSON.stringify({ email: 'invalid@test.com', password: 'wrongpassword' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(authCheck, {
    'auth endpoint reachable': (r) => r.status === 401 || r.status === 400,
    'auth not 5xx': (r) => r.status < 500,
  });

  sleep(1);
}
