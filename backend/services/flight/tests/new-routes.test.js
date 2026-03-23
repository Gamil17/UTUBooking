'use strict';

/**
 * new-routes.test.js
 *
 * Jest + supertest suite for the 5 new airlines and 5 new airport routes
 * added in the March 2026 supplier expansion sprint.
 *
 * New airlines: FZ (Flydubai), F3 (Flyadeal), XY (Flynas), 3O (Air Arabia Maroc), BJ (Nouvelair)
 * New airports: AMM, KWI, BAH, CMN, TUN
 *
 * The Amadeus adapter is mocked so these tests run offline without GDS credentials.
 */

const request   = require('supertest');
const app       = require('../app');

// ─── Mock the Amadeus adapter ────────────────────────────────────────────────
jest.mock('../../../adapters/amadeus', () => {
  const { AmadeusAdapterError } = jest.requireActual('../../../adapters/amadeus');

  /**
   * Factory: build a minimal raw offer that the FlightOffer.from() mapper accepts.
   */
  function makeRawOffer({ flightNum, airlineCode, originIata, destinationIata, price = 450 }) {
    return {
      id:              `mock-${flightNum}`,
      flightNum,
      airlineCode,
      originIata,
      destinationIata,
      departureAt:     '2026-04-01T08:00:00+03:00',
      arrivalAt:       '2026-04-01T10:30:00+03:00',
      cabinClass:      'ECONOMY',
      price,
      currency:        'SAR',
      durationMinutes: 150,
      stops:           0,
      isRefundable:    false,
      baggageIncluded: false,
      source:          'amadeus',
    };
  }

  // Route table: key = `ORIGIN-DEST`, value = array of raw offers
  const ROUTE_TABLE = {
    'DXB-AMM': [makeRawOffer({ flightNum: 'FZ901', airlineCode: 'FZ', originIata: 'DXB', destinationIata: 'AMM', price: 420 })],
    'RUH-AMM': [
      makeRawOffer({ flightNum: 'XY105', airlineCode: 'XY', originIata: 'RUH', destinationIata: 'AMM', price: 380 }),
      makeRawOffer({ flightNum: 'F3210', airlineCode: 'F3', originIata: 'RUH', destinationIata: 'AMM', price: 360 }),
    ],
    'DXB-KWI': [makeRawOffer({ flightNum: 'FZ703', airlineCode: 'FZ', originIata: 'DXB', destinationIata: 'KWI', price: 390 })],
    'RUH-KWI': [makeRawOffer({ flightNum: 'XY220', airlineCode: 'XY', originIata: 'RUH', destinationIata: 'KWI', price: 310 })],
    'DXB-BAH': [makeRawOffer({ flightNum: 'FZ505', airlineCode: 'FZ', originIata: 'DXB', destinationIata: 'BAH', price: 350 })],
    'RUH-BAH': [makeRawOffer({ flightNum: 'F3318', airlineCode: 'F3', originIata: 'RUH', destinationIata: 'BAH', price: 290 })],
    'CMN-TUN': [
      makeRawOffer({ flightNum: '3O441', airlineCode: '3O', originIata: 'CMN', destinationIata: 'TUN', price: 520 }),
      makeRawOffer({ flightNum: 'BJ102', airlineCode: 'BJ', originIata: 'CMN', destinationIata: 'TUN', price: 490 }),
    ],
    'JED-CMN': [makeRawOffer({ flightNum: '3O877', airlineCode: '3O', originIata: 'JED', destinationIata: 'CMN', price: 980 })],
    'JED-TUN': [makeRawOffer({ flightNum: 'BJ210', airlineCode: 'BJ', originIata: 'JED', destinationIata: 'TUN', price: 870 })],
    'RUH-CMN': [makeRawOffer({ flightNum: 'XY531', airlineCode: 'XY', originIata: 'RUH', destinationIata: 'CMN', price: 1050 })],
    'RUH-TUN': [makeRawOffer({ flightNum: 'F3620', airlineCode: 'F3', originIata: 'RUH', destinationIata: 'TUN', price: 920 })],
    'AMM-CMN': [makeRawOffer({ flightNum: '3O553', airlineCode: '3O', originIata: 'AMM', destinationIata: 'CMN', price: 1100 })],
    'AMM-TUN': [makeRawOffer({ flightNum: 'BJ340', airlineCode: 'BJ', originIata: 'AMM', destinationIata: 'TUN', price: 980 })],
    'KWI-BAH': [makeRawOffer({ flightNum: 'FZ611', airlineCode: 'FZ', originIata: 'KWI', destinationIata: 'BAH', price: 280 })],
  };

  return {
    AmadeusAdapterError,
    searchFlights: jest.fn(async (params) => {
      const key = `${params.origin}-${params.destination}`;
      return ROUTE_TABLE[key] ?? [];
    }),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function flightSearch(origin, destination, extras = {}) {
  return request(app)
    .get('/api/v1/flights/search')
    .query({ origin, destination, date: '2026-04-01', adults: 1, ...extras })
    .set('Authorization', 'Bearer test-jwt-token');
}

function assertFlightOfferShape(offer) {
  expect(offer).toMatchObject({
    flightNum:       expect.any(String),
    airlineCode:     expect.any(String),
    originIata:      expect.any(String),
    destinationIata: expect.any(String),
    price:           expect.any(Number),
    currency:        expect.any(String),
    durationMinutes: expect.any(Number),
    stops:           expect.any(Number),
  });
  expect(offer.price).toBeGreaterThan(0);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Track B — New airline × new airport routes', () => {

  // ── Flydubai (FZ) ────────────────────────────────────────────────────────
  describe('Flydubai (FZ)', () => {
    test('DXB → AMM returns Flydubai offer', async () => {
      const res = await flightSearch('DXB', 'AMM');
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      const fz = res.body.results.find((o) => o.airlineCode === 'FZ');
      expect(fz).toBeDefined();
      assertFlightOfferShape(fz);
    });

    test('DXB → KWI returns Flydubai offer', async () => {
      const res = await flightSearch('DXB', 'KWI');
      expect(res.status).toBe(200);
      const fz = res.body.results.find((o) => o.airlineCode === 'FZ');
      expect(fz).toBeDefined();
      assertFlightOfferShape(fz);
    });

    test('DXB → BAH returns Flydubai offer', async () => {
      const res = await flightSearch('DXB', 'BAH');
      expect(res.status).toBe(200);
      const fz = res.body.results.find((o) => o.airlineCode === 'FZ');
      expect(fz).toBeDefined();
    });

    test('KWI → BAH returns Flydubai offer', async () => {
      const res = await flightSearch('KWI', 'BAH');
      expect(res.status).toBe(200);
      const fz = res.body.results.find((o) => o.airlineCode === 'FZ');
      expect(fz).toBeDefined();
    });
  });

  // ── Flynas (XY) ──────────────────────────────────────────────────────────
  describe('Flynas (XY)', () => {
    test('RUH → AMM returns Flynas offer', async () => {
      const res = await flightSearch('RUH', 'AMM');
      expect(res.status).toBe(200);
      const xy = res.body.results.find((o) => o.airlineCode === 'XY');
      expect(xy).toBeDefined();
      assertFlightOfferShape(xy);
    });

    test('RUH → KWI returns Flynas offer', async () => {
      const res = await flightSearch('RUH', 'KWI');
      expect(res.status).toBe(200);
      const xy = res.body.results.find((o) => o.airlineCode === 'XY');
      expect(xy).toBeDefined();
    });

    test('RUH → CMN returns Flynas offer', async () => {
      const res = await flightSearch('RUH', 'CMN');
      expect(res.status).toBe(200);
      const xy = res.body.results.find((o) => o.airlineCode === 'XY');
      expect(xy).toBeDefined();
    });
  });

  // ── Flyadeal (F3) ────────────────────────────────────────────────────────
  describe('Flyadeal (F3)', () => {
    test('RUH → AMM includes Flyadeal offer', async () => {
      const res = await flightSearch('RUH', 'AMM');
      expect(res.status).toBe(200);
      const f3 = res.body.results.find((o) => o.airlineCode === 'F3');
      expect(f3).toBeDefined();
      assertFlightOfferShape(f3);
    });

    test('RUH → BAH returns Flyadeal offer', async () => {
      const res = await flightSearch('RUH', 'BAH');
      expect(res.status).toBe(200);
      const f3 = res.body.results.find((o) => o.airlineCode === 'F3');
      expect(f3).toBeDefined();
    });

    test('RUH → TUN returns Flyadeal offer', async () => {
      const res = await flightSearch('RUH', 'TUN');
      expect(res.status).toBe(200);
      const f3 = res.body.results.find((o) => o.airlineCode === 'F3');
      expect(f3).toBeDefined();
    });
  });

  // ── Air Arabia Maroc (3O) ─────────────────────────────────────────────────
  describe('Air Arabia Maroc (3O)', () => {
    test('CMN → TUN includes Air Arabia Maroc offer', async () => {
      const res = await flightSearch('CMN', 'TUN');
      expect(res.status).toBe(200);
      const ao = res.body.results.find((o) => o.airlineCode === '3O');
      expect(ao).toBeDefined();
      assertFlightOfferShape(ao);
    });

    test('JED → CMN returns Air Arabia Maroc offer', async () => {
      const res = await flightSearch('JED', 'CMN');
      expect(res.status).toBe(200);
      const ao = res.body.results.find((o) => o.airlineCode === '3O');
      expect(ao).toBeDefined();
    });

    test('AMM → CMN returns Air Arabia Maroc offer', async () => {
      const res = await flightSearch('AMM', 'CMN');
      expect(res.status).toBe(200);
      const ao = res.body.results.find((o) => o.airlineCode === '3O');
      expect(ao).toBeDefined();
    });
  });

  // ── Nouvelair (BJ) ────────────────────────────────────────────────────────
  describe('Nouvelair (BJ)', () => {
    test('CMN → TUN includes Nouvelair offer', async () => {
      const res = await flightSearch('CMN', 'TUN');
      expect(res.status).toBe(200);
      const bj = res.body.results.find((o) => o.airlineCode === 'BJ');
      expect(bj).toBeDefined();
      assertFlightOfferShape(bj);
    });

    test('JED → TUN returns Nouvelair offer', async () => {
      const res = await flightSearch('JED', 'TUN');
      expect(res.status).toBe(200);
      const bj = res.body.results.find((o) => o.airlineCode === 'BJ');
      expect(bj).toBeDefined();
    });

    test('AMM → TUN returns Nouvelair offer', async () => {
      const res = await flightSearch('AMM', 'TUN');
      expect(res.status).toBe(200);
      const bj = res.body.results.find((o) => o.airlineCode === 'BJ');
      expect(bj).toBeDefined();
    });
  });

  // ── FlightOffer shape assertions ──────────────────────────────────────────
  describe('FlightOffer response shape', () => {
    test('all offers in DXB→AMM have required fields', async () => {
      const res = await flightSearch('DXB', 'AMM');
      expect(res.status).toBe(200);
      res.body.results.forEach(assertFlightOfferShape);
    });

    test('response envelope has source, count, page, limit, results', async () => {
      const res = await flightSearch('RUH', 'AMM');
      expect(res.body).toMatchObject({
        source:  expect.any(String),
        count:   expect.any(Number),
        page:    expect.any(Number),
        limit:   expect.any(Number),
        results: expect.any(Array),
      });
    });
  });

  // ── Airport validation ────────────────────────────────────────────────────
  describe('Airport validation', () => {
    test('search to disabled airport returns 400 with bilingual message', async () => {
      const res = await flightSearch('DXB', 'XYZ');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('AIRPORT_NOT_ENABLED');
      expect(res.body.message).toBeTruthy();
      expect(res.body.messageAr).toBeTruthy();
    });

    test('search from disabled airport returns 400', async () => {
      const res = await flightSearch('XYZ', 'AMM');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('AIRPORT_NOT_ENABLED');
    });

    test('all 5 new airports are accepted (no 400)', async () => {
      const newAirports = ['AMM', 'KWI', 'BAH', 'CMN', 'TUN'];
      for (const ap of newAirports) {
        const res = await flightSearch('DXB', ap);
        expect(res.status).not.toBe(400);
      }
    });
  });

  // ── Pricing checks ────────────────────────────────────────────────────────
  describe('Pricing', () => {
    test('all offers have price > 0 and currency set', async () => {
      const routes = [
        ['DXB', 'AMM'], ['RUH', 'KWI'], ['DXB', 'BAH'],
        ['CMN', 'TUN'], ['JED', 'CMN'], ['JED', 'TUN'],
      ];
      for (const [o, d] of routes) {
        const res = await flightSearch(o, d);
        if (res.body.count > 0) {
          res.body.results.forEach((offer) => {
            expect(offer.price).toBeGreaterThan(0);
            expect(['SAR', 'AED', 'USD']).toContain(offer.currency);
          });
        }
      }
    });
  });
});
