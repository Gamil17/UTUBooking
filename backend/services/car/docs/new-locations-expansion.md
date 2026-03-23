# Car Rental — New Locations Expansion (March 2026)

Five new CarTrawler airport locations added: AMM · KWI · BAH · CMN · TUN

---

## Location Summary

| Location | CarTrawler Code | Country | Currency | Suppliers | Status |
|----------|----------------|---------|----------|-----------|--------|
| Queen Alia Int'l Airport (AMM) | AMM | Jordan (JO) | JOD | Hertz, Avis, Budget, Europcar | ✅ Implemented |
| Kuwait Int'l Airport (KWI) | KWI | Kuwait (KW) | KWD | Hertz, Avis, Al-Mulla | ✅ Implemented |
| Bahrain Int'l Airport (BAH) | BAH | Bahrain (BH) | BHD | Hertz, Avis, Budget | ✅ Implemented |
| Mohammed V Int'l Airport (CMN) | CMN | Morocco (MA) | MAD | Hertz, Avis, Europcar, Sixt | ✅ Implemented |
| Tunis-Carthage Int'l Airport (TUN) | TUN | Tunisia (TN) | TND | Hertz, Europcar, Topcar | ✅ Implemented |

---

## Pricing Benchmarks (per day, local currency)

| Location | Economy | Midsize | SUV | Luxury |
|----------|---------|---------|-----|--------|
| AMM (JOD) | 25–35 | 30–40 | 40–60 | 65–120 |
| KWI (KWD) | 15–20 | 18–25 | 25–35 | 40–80 |
| BAH (BHD) | 20–28 | 25–35 | 35–50 | 55–100 |
| CMN (MAD) | 300–420 | 380–520 | 500–750 | 800–1,500 |
| TUN (TND) | 80–110 | 100–130 | 130–180 | 200–380 |

## SAR Equivalent Benchmarks (indicative, static FX)

| Location | Economy/day SAR | Midsize/day SAR | SUV/day SAR |
|----------|----------------|----------------|------------|
| AMM | 94–131 | 113–150 | 150–225 |
| KWI | 184–245 | 220–306 | 306–428 |
| BAH | 199–278 | 248–348 | 348–497 |
| CMN | 112–157 | 142–194 | 187–280 |
| TUN | 96–132 | 120–156 | 156–216 |

---

## FX Static Fallback Rates

| Currency | 1 USD = | 1 unit = SAR |
|----------|---------|-------------|
| JOD | 0.7090 | ~5.29 |
| KWD | 0.3072 | ~12.21 |
| BHD | 0.3770 | ~9.94 |
| MAD | 10.060 | ~0.373 |
| TND | 3.1050 | ~1.208 |

Redis cache: `car:fx:rates:USD` (15 min TTL). Falls back to ExchangeRate-API v6, then static.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/config/cartrawler-locations.json` | Single source of truth — all enabled airports, currencies, suppliers |
| `src/services/cartrawler.service.patch.js` | Location validation + SAR conversion layer; patches SUPPORTED_LOCATIONS |
| `src/services/car-fx.service.js` | FX service (JOD/KWD/BHD/MAD/TND support); Redis→API→static fallback |
| `tests/new-locations.test.js` | Jest + nock tests: per-location, cross-location, 404, FX sanity |
| `mobile/src/config/car-locations.ts` | TypeScript location registry with AR/EN names + helper functions |

## Existing Files to Modify

### 1. `backend/adapters/cartrawler.js` line 40
Update `SUPPORTED_LOCATIONS` initializer (patch service already does this at runtime, but updating source is recommended for documentation clarity):
```js
// Change from:
const SUPPORTED_LOCATIONS = new Set(['JED', 'RUH', 'DXB', 'AUH', 'CAI']);
// To:
const SUPPORTED_LOCATIONS = new Set(['JED', 'RUH', 'DXB', 'AUH', 'CAI', 'AMM', 'KWI', 'BAH', 'CMN', 'TUN']);
```

### 2. `backend/services/car/src/validators/search.validator.js` line 15
```js
// Change from:
currency: Joi.string().valid('SAR', 'AED', 'USD').default('SAR'),
// To:
currency: Joi.string().valid('SAR', 'AED', 'USD', 'JOD', 'KWD', 'BHD', 'MAD', 'TND').default('SAR'),
```

### 3. `backend/services/car/src/controllers/search.controller.js`
Wire in the patch service for location validation + SAR conversion. Requires **code review from outsourced dev team** before merge (per `backend/CLAUDE.md`).

---

## Redis Keys

| Key | TTL | Purpose |
|-----|-----|---------|
| `car:locations:{CODE}` | 3600 s | Cached location config per airport |
| `car:fx:rates:USD` | 900 s | FX base rates (car service namespace) |
| `cartrawler:search:{sha256}` | 600 s | CarTrawler search result cache (existing) |

---

## Go-Live Checklist

### AMM — Jordan
- [ ] CarTrawler account team: confirm AMM inventory in OTA sandbox
- [ ] E2E sandbox test with real credentials passes
- [ ] JOD → SAR conversion within 2% of mid-market rate
- [ ] Arabic strings reviewed by native Jordanian speaker
- [ ] Legal: international driver's license not required for most GCC residents in Jordan
- [ ] Deploy + health check + mobile smoke test (iPhone 14 + Samsung S23)

### KWI — Kuwait
- [ ] CarTrawler: confirm KWI inventory + Al-Mulla supplier code
- [ ] KWD → SAR conversion validated (KWD pegged; low drift risk)
- [ ] Arabic strings reviewed
- [ ] Legal: GCC residents can rent with national driving license
- [ ] Deploy + smoke test

### BAH — Bahrain
- [ ] CarTrawler: confirm BAH inventory
- [ ] BHD → SAR: BHD pegged to USD at 0.3769 — validate monthly
- [ ] Cross-border note: BAH ↔ SAR land route; confirm one-way terms
- [ ] Deploy + smoke test

### CMN — Morocco
- [ ] CarTrawler: confirm CMN inventory (Hertz/Avis/Europcar/Sixt)
- [ ] MAD → SAR conversion validated
- [ ] French supplier names: normalise to English in CarOffer.vendorName
- [ ] International driver's license: display requirement in booking UI
- [ ] Arabic strings reviewed (Moroccan context)
- [ ] Deploy + smoke test

### TUN — Tunisia
- [ ] CarTrawler: confirm TUN inventory + Topcar supplier code
- [ ] TND → SAR conversion validated (non-convertible currency; treasury settlement)
- [ ] International driver's license: display requirement in booking UI
- [ ] Deploy + smoke test

---

## Rollback Plan

1. Set `"enabled": false` in `cartrawler-locations.json` for affected airport
2. Redeploy car-service — config is read on each request (no restart needed for JSON changes with require cache invalidation, or restart if cached)
3. No database migration required — all new data is config-file + Redis cache driven

---

## Estimated Inventory

| Location | Economy | Midsize | SUV | Luxury | Minivan | Est. Total |
|----------|---------|---------|-----|--------|---------|-----------|
| AMM | ~45 | ~30 | ~20 | ~8 | ~10 | ~113 |
| KWI | ~30 | ~20 | ~15 | ~5 | ~8 | ~78 |
| BAH | ~25 | ~18 | ~12 | ~4 | ~6 | ~65 |
| CMN | ~50 | ~35 | ~25 | ~10 | ~12 | ~132 |
| TUN | ~35 | ~25 | ~18 | ~6 | ~8 | ~92 |

*Estimates based on CarTrawler category data for similar-tier airports. Confirm with account team.*
