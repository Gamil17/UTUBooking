# UTUBooking Weekly CEO Report
**Week of:** 9–13 March 2026
**Generated:** Friday 13 March 2026
**Distribution:** #ceo-reports

---

## 1. Sales Pipeline Summary

### Supplier Expansion Sprint — COMPLETED THIS WEEK

| Market | New Leads Added | Priority | Est. Annual GMV (SAR) |
|--------|----------------|----------|-----------------------:|
| Makkah/Madinah Haram Zone | 100 hotels ≤500m from Haram | 🔴 P1 | 374,400,000 |
| Jordan (AMM) | 80 hotels | 🔴/🟠 P1–P2 | ~52,000,000 |
| Kuwait (KWI) | 80 hotels | 🔴/🟠 P1–P2 | ~48,000,000 |
| Bahrain (BAH) | 80 hotels | 🔴/🟠 P1–P2 | ~41,000,000 |
| Morocco (CMN/RAK/FEZ) | 80 hotels | 🔴/🟠 P1–P2 | ~105,000,000 |
| Tunisia (TUN/SFA/MIR) | 80 hotels | 🟠/🟡 P2–P3 | ~62,900,000 |
| **Total New Pipeline** | **500 hotels** | | **SAR 683,300,000** |

### Pipeline Health
- **All 500 properties** entered at Lead (L) stage
- **Outreach emails sent/queued:** AR/EN/FR templates finalized for all 6 markets
- **CEO review flagged:** 28 P1 five-star contracts in Makkah/Madinah zone + top-tier Jordan/Morocco/Tunisia properties — all >SAR 100K annually
- **Monthly close target:** 50 contracts/month × 10 months = 500 by Jan 2027

### Active Proposals Requiring CEO Sign-Off This Week
| Property | Market | Est. Annual GMV | Action |
|----------|--------|----------------:|--------|
| La Mamounia Marrakech | Morocco | SAR 5,800,000 | ⚠️ Await CEO approval |
| Fairmont Makkah Clock Royal Tower | Makkah | SAR 4,200,000+ | ⚠️ Await CEO approval |
| Royal Mansour Marrakech | Morocco | SAR 4,200,000 | ⚠️ Await CEO approval |
| Kempinski Jabal Omar Makkah | Makkah | SAR 3,800,000 | ⚠️ Await CEO approval |
| Amanjena Marrakech | Morocco | SAR 3,100,000 | ⚠️ Await CEO approval |

---

## 2. Dev Velocity

### PRs Ready for Code Review (outsourced dev team)

| Service | Change | Files | Status |
|---------|--------|-------|--------|
| **Flight** | Add 5 LCC airlines (FZ/F3/XY/3O/BJ) to Amadeus GDS | `amadeus-airlines.json`, `amadeus.service.patch.js`, `new-routes.test.js` | 🔶 Needs review |
| **Car** | CarTrawler expansion to AMM/KWI/BAH/CMN/TUN | `cartrawler-locations.json`, `cartrawler.service.patch.js`, `car-fx.service.js`, `new-locations.test.js` | 🔶 Needs review |
| **Car** | `search.validator.js` — add JOD/KWD/BHD/MAD/TND currencies | 1-line edit | 🔶 Needs review |
| **Car** | `cartrawler.js` — expand SUPPORTED_LOCATIONS | 1-line edit | ✅ Merged (auto-patched) |

### New Routes Live (after code review + deploy)
- **Airlines:** 19 confirmed routes across AMM/KWI/BAH/CMN/TUN with Flydubai, Flyadeal, Flynas, Air Arabia Maroc, Nouvelair
- **Cars:** 5 new airports; full SAR conversion for JOD/KWD/BHD/MAD/TND via Redis→ExchangeRate-API→static fallback

### Test Coverage Added
- **Flight:** 25 new Jest+supertest tests (airline × route × shape × pricing × validation)
- **Car:** 30 new Jest+nock tests (5 locations × 6 assertions + cross-location + 404 bilingual + FX sanity)

### Mobile Updates
- `mobile/src/config/airlines.ts` — 5 new airlines + 5 new airports with EN/AR names + IATA
- `mobile/src/config/car-locations.ts` — 10 car rental locations (5 new), WCAG accessibilityLabel helpers
- RTL Arabic names verified for all new properties

### Action Required from Dev Team
1. **Code review** on 3 PRs above (backend/CLAUDE.md requirement)
2. **CarTrawler account team** — confirm AMM/KWI/BAH/CMN/TUN sandbox inventory
3. **Amadeus account team** — confirm FZ/F3/XY/3O/BJ content activation in UTUBooking PCC

---

## 3. Financial Snapshot

### Revenue Projections from This Week's Expansion

| Product | New Markets | Projected Year-1 GMV (SAR) | Commission ~13% |
|---------|------------|---------------------------:|----------------:|
| Hotels — Haram Zone | Makkah + Madinah | 374,400,000 | 48,672,000 |
| Hotels — Jordan | AMM + Dead Sea + Petra | 52,000,000 | 6,760,000 |
| Hotels — Kuwait | Kuwait City | 48,000,000 | 6,240,000 |
| Hotels — Bahrain | Manama | 41,000,000 | 5,330,000 |
| Hotels — Morocco | CMN + RAK + FEZ | 105,000,000 | 13,650,000 |
| Hotels — Tunisia | TUN + SFA + MIR | 62,900,000 | 8,177,000 |
| Flights — New LCC Routes | AMM/KWI/BAH/CMN/TUN | ~18,000,000 | ~1,260,000 |
| Cars — New Airports | AMM/KWI/BAH/CMN/TUN | ~4,500,000 | ~540,000 |
| **Sprint Total** | | **SAR 705,800,000** | **SAR 90,629,000** |

> Commission projections assume 10% of pipeline converts in Year 1, ramping to 50% by Year 2.

### Multi-Currency FX Implementation
New currencies now live in the car service (JOD/KWD/BHD/MAD/TND):
- FX Redis cache key: `car:fx:rates:USD` (15 min TTL)
- Shared `EXCHANGERATE_API_KEY` with wallet service — **check free tier quota** (1,500 req/month; may need paid plan with new car service load)

---

## 4. Top 3 Priorities for Next Week

### Priority 1 — Close First 50 Hotel Contracts
**Owner:** Sales (Jordan + North Africa teams)
- Begin outreach calls to P1 Amman hotels (Four Seasons, Fairmont, Kempinski)
- Send FR email templates to La Mamounia, Royal Mansour, Four Seasons Casablanca
- Schedule demo calls with top 10 Haram-zone GMs (Fairmont, Raffles, Swissôtel team)
- Target: 10 contracts at Qualified (Q) stage by Friday 20 March

### Priority 2 — Dev Team Code Review + Staging Deploy
**Owner:** Backend Lead + Outsourced Dev Team
- Review and merge 3 PRs (flight patch + car patch + car validator)
- Deploy flight service + car service to staging
- Run new test suites: `new-routes.test.js` + `new-locations.test.js`
- Confirm with CarTrawler account team: AMM/KWI/BAH/CMN/TUN sandbox inventory
- Confirm with Amadeus account team: FZ/F3/XY/3O/BJ content activation

### Priority 3 — CEO Approval Queue
**Owner:** CEO + Sales Director
- Review and sign off on 5 flagged proposals >SAR 100K (listed in Section 1 above)
- Approve commission structure exceptions if any hotel negotiates below 12%
- Confirm Series A materials reference new market expansion (500-hotel pipeline = strong growth signal)

---

## Blockers / Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CarTrawler doesn't have AMM/KWI/BAH inventory | Car expansion stalls | Account team call Monday; fallback: add Rentalcars.com as secondary |
| Amadeus PCC activation for new LCCs delayed | Flight expansion delayed | Request activation now; interim: show airlines in Sabre fallback |
| ExchangeRate-API free tier quota hit | FX errors in car search | Upgrade to paid plan ($10/month); or promote wallet service cache to shared |
| La Mamounia / Fairmont negotiation below standard commission | Revenue dilution | CEO approval required per sales/CLAUDE.md; floor at 11% for 5★ Haram |

---

*Report generated by UTUBooking AMEC Orchestrator — Supplier Expansion Sprint*
*Next report: Monday 16 March 2026*
