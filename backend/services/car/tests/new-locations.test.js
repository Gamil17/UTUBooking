'use strict';

/**
 * new-locations.test.js
 *
 * Jest + supertest + nock tests for the 5 new CarTrawler airport locations:
 *   AMM (Jordan · JOD) · KWI (Kuwait · KWD) · BAH (Bahrain · BHD)
 *   CMN (Morocco · MAD) · TUN (Tunisia · TND)
 *
 * Tests:
 *   1. Per-location: availability, offer shape, SAR pricing, supplier validation
 *   2. Cross-location one-way: AMM → BAH
 *   3. Unknown location → 404 bilingual response
 *   4. FX conversion sanity checks (static rate ranges)
 */

const request = require('supertest');
const nock    = require('nock');
const app     = require('../app');

// ─── OTA XML mock factory ─────────────────────────────────────────────────────

const CT_BASE_URL = process.env.CARTRAWLER_BASE_URL || 'https://ota.cartrawler.com';
const CT_PATH     = '/cartrawlerota/s/xml';

function buildOtaRS({ locationCode, vendorCode, vendorName, acrissCode, totalAmount, currency, seats = 5 }) {
  const perDay = (parseFloat(totalAmount) / 4).toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_VehAvailRateRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.008">
  <VehAvailRSCore>
    <VehVendorAvails>
      <VehVendorAvail>
        <Vendor Code="${vendorCode}" CompanyName="${vendorName}"/>
        <VehAvails>
          <VehAvail>
            <VehAvailCore Status="Available">
              <Vehicle AcrissCode="${acrissCode}" PassengerQuantity="${seats}"/>
              <RentalRate>
                <VehicleCharges>
                  <VehicleCharge Amount="${perDay}" CurrencyCode="${currency}" Description="Base Rate"/>
                </VehicleCharges>
              </RentalRate>
              <TotalCharge EstimatedTotalAmount="${totalAmount}" CurrencyCode="${currency}"/>
              <PickUpLocation LocationCode="${locationCode}"/>
              <ReturnLocation LocationCode="${locationCode}"/>
            </VehAvailCore>
          </VehAvail>
        </VehAvails>
      </VehVendorAvail>
    </VehVendorAvails>
  </VehAvailRSCore>
</OTA_VehAvailRateRS>`;
}

function buildCrossLocationRS() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_VehAvailRateRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.008">
  <VehAvailRSCore>
    <VehVendorAvails>
      <VehVendorAvail>
        <Vendor Code="ZI" CompanyName="Avis"/>
        <VehAvails>
          <VehAvail>
            <VehAvailCore Status="Available">
              <Vehicle AcrissCode="CDAR" PassengerQuantity="5"/>
              <TotalCharge EstimatedTotalAmount="140.00" CurrencyCode="JOD"/>
              <PickUpLocation LocationCode="AMM"/>
              <ReturnLocation LocationCode="BAH"/>
            </VehAvailCore>
          </VehAvail>
        </VehAvails>
      </VehVendorAvail>
    </VehVendorAvails>
  </VehAvailRSCore>
</OTA_VehAvailRateRS>`;
}

// ─── Location fixtures ────────────────────────────────────────────────────────

const FIXTURES = [
  { code: 'AMM', currency: 'JOD', vendorCode: 'ZE', vendorName: 'Hertz',   acrissCode: 'CDAR', totalAmount: '100.00', expectedSuppliers: ['Hertz', 'Avis', 'Budget', 'Europcar'] },
  { code: 'KWI', currency: 'KWD', vendorCode: 'ZE', vendorName: 'Hertz',   acrissCode: 'IDAR', totalAmount: '60.00',  expectedSuppliers: ['Hertz', 'Avis', 'Al-Mulla'] },
  { code: 'BAH', currency: 'BHD', vendorCode: 'ZI', vendorName: 'Avis',    acrissCode: 'CDAR', totalAmount: '80.00',  expectedSuppliers: ['Hertz', 'Avis', 'Budget'] },
  { code: 'CMN', currency: 'MAD', vendorCode: 'ZE', vendorName: 'Hertz',   acrissCode: 'EDMR', totalAmount: '1400.00',expectedSuppliers: ['Hertz', 'Avis', 'Europcar', 'Sixt'] },
  { code: 'TUN', currency: 'TND', vendorCode: 'ZT', vendorName: 'Europcar',acrissCode: 'CDAR', totalAmount: '320.00', expectedSuppliers: ['Hertz', 'Europcar', 'Topcar'] },
];

const PICKUP_DATE  = '2026-04-01';
const DROPOFF_DATE = '2026-04-05'; // 4 days

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

afterEach(() => nock.cleanAll());

// ─── 1. Per-location availability + pricing ───────────────────────────────────

describe.each(FIXTURES)(
  'Location $code — availability & pricing',
  ({ code, currency, vendorCode, vendorName, acrissCode, totalAmount, expectedSuppliers }) => {
    const query = { pickupLocation: code, dropoffLocation: code, pickupDate: PICKUP_DATE, dropoffDate: DROPOFF_DATE, driverAge: 30 };

    beforeEach(() => {
      nock(CT_BASE_URL).post(CT_PATH)
        .reply(200, buildOtaRS({ locationCode: code, vendorCode, vendorName, acrissCode, totalAmount, currency }), { 'Content-Type': 'application/xml' });
    });

    it(`returns 200 with non-empty results`, async () => {
      const res = await request(app).get('/api/v1/cars/search').query(query);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
    });

    it(`offers have all required fields`, async () => {
      const res = await request(app).get('/api/v1/cars/search').query(query);
      expect(res.status).toBe(200);
      for (const offer of res.body.results) {
        expect(offer).toHaveProperty('vehicleType');
        expect(offer).toHaveProperty('vendorName');
        expect(offer).toHaveProperty('pricePerDay');
        expect(offer).toHaveProperty('totalPrice');
        expect(offer).toHaveProperty('currency');
        expect(offer).toHaveProperty('pickupLocation');
      }
    });

    it(`prices converted to SAR (pricePerDay > 0, currency = 'SAR')`, async () => {
      const res = await request(app).get('/api/v1/cars/search').query(query);
      expect(res.status).toBe(200);
      for (const offer of res.body.results) {
        expect(offer.currency).toBe('SAR');
        expect(offer.pricePerDay).toBeGreaterThan(0);
        expect(offer.totalPrice).toBeGreaterThan(0);
      }
    });

    it(`supplier in enabled list for ${code}`, async () => {
      const res = await request(app).get('/api/v1/cars/search').query(query);
      expect(res.status).toBe(200);
      for (const offer of res.body.results) {
        expect(expectedSuppliers).toContain(offer.vendorName);
      }
    });

    it(`pickupLocation matches ${code}`, async () => {
      const res = await request(app).get('/api/v1/cars/search').query(query);
      expect(res.status).toBe(200);
      for (const offer of res.body.results) {
        expect(offer.pickupLocation).toBe(code);
      }
    });

    it(`originalCurrency preserved as ${currency}`, async () => {
      const res = await request(app).get('/api/v1/cars/search').query(query);
      expect(res.status).toBe(200);
      for (const offer of res.body.results) {
        expect(offer.originalCurrency).toBe(currency);
        expect(offer.originalTotalPrice).toBeGreaterThan(0);
      }
    });
  },
);

// ─── 2. Cross-location (one-way): AMM → BAH ──────────────────────────────────

describe('Cross-location: AMM → BAH (one-way)', () => {
  beforeEach(() => {
    nock(CT_BASE_URL).post(CT_PATH)
      .reply(200, buildCrossLocationRS(), { 'Content-Type': 'application/xml' });
  });

  const query = { pickupLocation: 'AMM', dropoffLocation: 'BAH', pickupDate: PICKUP_DATE, dropoffDate: DROPOFF_DATE, driverAge: 30 };

  it('returns 200 with results', async () => {
    const res = await request(app).get('/api/v1/cars/search').query(query);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });

  it('offers priced in SAR', async () => {
    const res = await request(app).get('/api/v1/cars/search').query(query);
    for (const offer of res.body.results) {
      expect(offer.currency).toBe('SAR');
      expect(offer.pricePerDay).toBeGreaterThan(0);
    }
  });

  it('pickupLocation = AMM, dropoffLocation = BAH', async () => {
    const res = await request(app).get('/api/v1/cars/search').query(query);
    const offer = res.body.results[0];
    expect(offer.pickupLocation).toBe('AMM');
    expect(offer.dropoffLocation).toBe('BAH');
  });
});

// ─── 3. Unknown / unavailable location → 404 ─────────────────────────────────

describe('Unknown/unavailable location', () => {
  it('returns 404 for unknown code XYZ', async () => {
    const res = await request(app).get('/api/v1/cars/search')
      .query({ pickupLocation: 'XYZ', dropoffLocation: 'XYZ', pickupDate: PICKUP_DATE, dropoffDate: DROPOFF_DATE, driverAge: 30 });
    expect(res.status).toBe(404);
  });

  it('404 body has bilingual error (message + messageAr)', async () => {
    const res = await request(app).get('/api/v1/cars/search')
      .query({ pickupLocation: 'XYZ', dropoffLocation: 'XYZ', pickupDate: PICKUP_DATE, dropoffDate: DROPOFF_DATE, driverAge: 30 });
    expect(res.body.error).toBe('LOCATION_NOT_AVAILABLE');
    expect(typeof res.body.message).toBe('string');
    expect(typeof res.body.messageAr).toBe('string');
  });

  it('all 5 new airports accepted (no 404)', async () => {
    for (const { code, currency, vendorCode, vendorName, acrissCode, totalAmount } of FIXTURES) {
      nock(CT_BASE_URL).post(CT_PATH)
        .reply(200, buildOtaRS({ locationCode: code, vendorCode, vendorName, acrissCode, totalAmount, currency }), { 'Content-Type': 'application/xml' });
      const res = await request(app).get('/api/v1/cars/search')
        .query({ pickupLocation: code, dropoffLocation: code, pickupDate: PICKUP_DATE, dropoffDate: DROPOFF_DATE, driverAge: 30 });
      expect(res.status).not.toBe(404);
      nock.cleanAll();
    }
  });
});

// ─── 4. FX conversion sanity (static rates) ──────────────────────────────────

describe('FX rates — static fallback sanity', () => {
  const carFx = require('../src/services/car-fx.service');

  it('JOD → SAR ≈ 5.29 (±30%)', async () => {
    const rate = await carFx.getRate('JOD', 'SAR');
    expect(rate).toBeGreaterThan(3.7);
    expect(rate).toBeLessThan(6.9);
  });

  it('KWD → SAR ≈ 12.21 (±30%)', async () => {
    const rate = await carFx.getRate('KWD', 'SAR');
    expect(rate).toBeGreaterThan(8.5);
    expect(rate).toBeLessThan(15.9);
  });

  it('BHD → SAR ≈ 9.94 (±30%)', async () => {
    const rate = await carFx.getRate('BHD', 'SAR');
    expect(rate).toBeGreaterThan(7.0);
    expect(rate).toBeLessThan(12.9);
  });

  it('MAD → SAR ≈ 0.373 (±30%)', async () => {
    const rate = await carFx.getRate('MAD', 'SAR');
    expect(rate).toBeGreaterThan(0.26);
    expect(rate).toBeLessThan(0.49);
  });

  it('TND → SAR ≈ 1.21 (±30%)', async () => {
    const rate = await carFx.getRate('TND', 'SAR');
    expect(rate).toBeGreaterThan(0.85);
    expect(rate).toBeLessThan(1.57);
  });

  it('SAR → SAR = 1 (identity)', async () => {
    expect(await carFx.getRate('SAR', 'SAR')).toBe(1);
  });

  it('toSAR(100, "JOD") returns a positive number', async () => {
    const sar = await carFx.toSAR(100, 'JOD');
    expect(sar).toBeGreaterThan(0);
    expect(typeof sar).toBe('number');
  });
});
