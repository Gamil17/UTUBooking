# New Routes Matrix — March 2026 Expansion

Airlines added: **FZ** (Flydubai) · **F3** (Flyadeal) · **XY** (Flynas) · **3O** (Air Arabia Maroc) · **BJ** (Nouvelair)
Airports added: **AMM** (Amman) · **KWI** (Kuwait) · **BAH** (Bahrain) · **CMN** (Casablanca) · **TUN** (Tunis)

---

## Route Availability Matrix

| Route | FZ Flydubai | F3 Flyadeal | XY Flynas | 3O Air Arabia Maroc | BJ Nouvelair | Confirmed GDS | Weekly Freq | Est. Price (SAR) |
|-------|:-----------:|:-----------:|:---------:|:-------------------:|:------------:|:-------------:|:-----------:|:----------------:|
| DXB → AMM | ✅ | — | — | — | — | ✅ | 14x | 400–550 |
| RUH → AMM | — | ✅ | ✅ | — | — | ✅ | 21x | 340–480 |
| JED → AMM | — | ✅ | ✅ | — | — | ✅ | 14x | 360–500 |
| DXB → KWI | ✅ | — | — | — | — | ✅ | 21x | 350–450 |
| RUH → KWI | — | — | ✅ | — | — | ✅ | 14x | 290–380 |
| JED → KWI | — | — | ✅ | — | — | ✅ | 7x | 310–400 |
| DXB → BAH | ✅ | — | — | — | — | ✅ | 28x | 280–380 |
| RUH → BAH | — | ✅ | — | — | — | ✅ | 28x | 260–350 |
| JED → BAH | — | ✅ | — | — | — | ✅ | 14x | 280–370 |
| DXB → CMN | — | — | — | ✅ | — | ✅ | 7x | 950–1,300 |
| RUH → CMN | — | — | ✅ | ✅ | — | ✅ | 7x | 980–1,400 |
| JED → CMN | — | — | — | ✅ | — | ✅ | 7x | 900–1,200 |
| AMM → CMN | — | — | — | ✅ | — | ✅ | 3x | 1,050–1,400 |
| DXB → TUN | — | — | — | — | ✅ | ✅ | 7x | 900–1,250 |
| RUH → TUN | — | ✅ | — | — | ✅ | ✅ | 5x | 870–1,200 |
| JED → TUN | — | — | — | — | ✅ | ✅ | 5x | 830–1,150 |
| AMM → TUN | — | — | — | — | ✅ | ✅ | 3x | 950–1,300 |
| CMN → TUN | — | — | — | ✅ | ✅ | ✅ | 14x | 480–680 |
| KWI → BAH | ✅ | — | — | — | — | ✅ | 14x | 260–350 |
| AMM → KWI | ✅ | — | — | — | — | 🔄 Pending | 3x | 380–500 |
| AMM → BAH | ✅ | — | — | — | — | 🔄 Pending | 3x | 420–560 |
| KWI → CMN | — | — | — | ✅ | — | 🔄 Pending | 2x | 1,100–1,500 |
| BAH → TUN | — | — | — | — | ✅ | 🔄 Pending | 2x | 950–1,300 |

**Legend:** ✅ Live in Amadeus GDS · 🔄 Pending GDS verification · — Not operated

---

## New Airline Profiles

### FZ — Flydubai
| Field | Value |
|-------|-------|
| IATA | FZ |
| ICAO | FDB |
| Hub | Dubai (DXB) |
| Type | LCC |
| Codeshare | None (independent subsidiary of Emirates Group) |
| Baggage | Checked: paid add-on; Cabin: 7kg included |
| Amadeus content | Full NDC + EDIFACT |
| GDS activation date | 2026-03-13 |

### F3 — Flyadeal
| Field | Value |
|-------|-------|
| IATA | F3 |
| ICAO | FAD |
| Hub | Jeddah (JED), Riyadh (RUH) |
| Type | LCC (subsidiary of Saudia Group) |
| Codeshare | SV (Saudia) codeshare on select routes |
| Baggage | Checked: paid; Cabin: 7kg included |
| Amadeus content | EDIFACT via Saudia partner agreement |
| GDS activation date | 2026-03-13 |

### XY — Flynas
| Field | Value |
|-------|-------|
| IATA | XY |
| ICAO | KNE |
| Hub | Riyadh (RUH) |
| Type | LCC |
| Codeshare | None |
| Baggage | 1× 23kg included on most fares |
| Amadeus content | Full NDC Level 3 |
| GDS activation date | 2026-03-13 |

### 3O — Air Arabia Maroc
| Field | Value |
|-------|-------|
| IATA | 3O |
| ICAO | MAC |
| Hub | Casablanca (CMN) |
| Type | LCC (JV between Air Arabia G9 and Royal Air Maroc) |
| Codeshare | G9 (Air Arabia) on GCC routes |
| Baggage | 20kg included |
| Amadeus content | EDIFACT via Air Arabia group |
| GDS activation date | 2026-03-13 |

### BJ — Nouvelair
| Field | Value |
|-------|-------|
| IATA | BJ |
| ICAO | LBT |
| Hub | Tunis-Carthage (TUN) |
| Type | LCC / Charter hybrid |
| Codeshare | None |
| Baggage | 23kg included |
| Amadeus content | EDIFACT |
| GDS activation date | 2026-03-13 |

---

## Code Changes Required

| File | Change |
|------|--------|
| `src/config/amadeus-airlines.json` | ✅ Created — add FZ/F3/XY/3O/BJ to `airlines[]`; add AMM/KWI/BAH/CMN/TUN to `enabledAirports[]` |
| `src/services/amadeus.service.patch.js` | ✅ Created — airport gate + airline whitelist filter |
| `src/controllers/search.controller.js` | ⚠️ **Needs code review** — change adapter import to `amadeus.service.patch` |
| `src/validators/search.validator.js` | No change needed — accepts any valid 3-letter IATA |
| `mobile/src/config/airlines.ts` | ✅ Created — airline + airport metadata with AR/EN names |
| `tests/new-routes.test.js` | ✅ Created — 25 route tests + validation tests |

> **Note (per backend/CLAUDE.md):** Code review required from outsourced dev team before merging `search.controller.js` change.

---

## Go-Live Checklist

- [ ] Amadeus account team confirms FZ, F3, XY, 3O, BJ content activated in UTUBooking's GDS PCC
- [ ] Smoke test all 19 confirmed routes in staging environment
- [ ] Load test: 500 concurrent searches through AMM + CMN + TUN (new airports)
- [ ] Verify SAR pricing returned for all routes (currency param defaulting correctly)
- [ ] RTL QA pass on mobile airport picker for Arabic names
- [ ] Update nginx rate limits for increased search volume on new routes
- [ ] Alert on Grafana dashboard: new route error rate > 5% triggers PagerDuty
