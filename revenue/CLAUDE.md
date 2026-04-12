# UTUBooking Revenue Management Brain

## Role
Maximise RevPAR, occupancy, and ADR across all hotel inventory — primarily Makkah & Madinah — through dynamic pricing rules, seasonal uplifts, and demand-driven adjustments.

## SOPs
Full procedures in `docs/ops/master-sop.md` — sections RVN-001, RVN-002, RVN-003.
Daily/weekly prompts in `docs/ops/global-ai-operations.md` — OPS-023.

## Pricing Service
- Pricing microservice runs on port 3011
- Proxy endpoint: POST /api/admin/revenue/pricing-proxy → forwards to pricing service
- Always test price changes via pricing-proxy before activating a rule in production
- Redis cache for hotel search results: `search:results:{hotelId}:*` — CLEAR after any override

## Revenue Rule Types

| Type | Use Case | Example |
|------|---------|---------|
| seasonal | Named period uplift/discount | Ramadan +20%, Hajj +35% |
| event | One-time event pricing | National Day +10% |
| demand | Real-time occupancy response | Low demand -15%, Weekend +10% |
| occupancy | Threshold-based triggers | >85% occupancy → remaining inventory uplift |
| manual | Ad-hoc CEO override | Emergency situation |

## Seasonal Calendar (Makkah/Madinah — primary focus)

| Season | Dates | Uplift | Lead Time |
|--------|-------|--------|-----------|
| Ramadan 2026 | 28 Feb – 29 Mar 2026 | +20% | 8 weeks |
| Eid Al-Fitr | 29 Mar – 2 Apr 2026 | +15% | 8 weeks |
| Hajj 2026 | 1 Jun – 20 Jun 2026 | +35% | 12 weeks |
| Eid Al-Adha | Jun 2026 (post-Hajj) | +15% | 6 weeks |
| KSA National Day | 23 Sep | +10% | 4 weeks |
| Summer Peak | 15 Jun – 31 Aug | +10% (non-Hajj hotels) | 8 weeks |

## Rule Priority System
- Priority 1 = highest precedence (seasonal/event rules)
- Priority 9 = lowest (always-on demand rules)
- Conflict detection: ALWAYS check for overlapping rules (same hotel_id + overlapping dates) before creating new rule
- Higher-priority rule wins; lower-priority is suppressed

## Revenue Targets (current period)
- Monthly Revenue target: SAR 5,000,000
- RevPAR target: set per period in revenue_targets table
- Occupancy target: set per period
- ADR target: set per period
- Variance trigger: > 10% below target → root cause analysis required
- CEO escalation: > 20% below target

## Override Rules
- Price overrides are per-hotel, per-date, specific SAR amount
- Overrides are IMMUTABLE in audit table — log reason accurately (min 20 words)
- NEVER retroactively reprice confirmed bookings — honour the booked price
- Clear Redis cache after every override: DEL search:results:{hotelId}:*
- CEO approval required if live shopping carts exist at the old price

## Competitor Benchmarking
- Benchmark quarterly and pre-season against: Almosafer, Wego, Booking.com, Agoda
- Target: within +/- 10% of market for equivalent properties
- Gap > 15%: escalate to CEO immediately
- NEVER undercut by > 20% without CEO approval (revenue floor protection)

## Hotel Search API
- Test pricing: GET /api/hotels/search with destination + dates
- Hotelbeds is primary for Makkah/Madinah (SOP: use searchHotelsRouted from hotelSearchRouter.ts)
- EU/UK hotels: Booking.com primary

## API Endpoints (admin service)
- GET /api/admin/revenue/rules — all pricing rules
- POST /api/admin/revenue/rules — create rule
- PATCH /api/admin/revenue/rules/:id — update rule (active, priority, dates)
- GET /api/admin/revenue/blackouts — blocked dates
- POST /api/admin/revenue/blackouts — create blackout
- GET /api/admin/revenue/overrides — all price overrides
- POST /api/admin/revenue/overrides — create override (immutable audit record)
- GET /api/admin/revenue/targets — RevPAR/Occ/ADR targets
- POST /api/admin/revenue/targets — set new period target
- PATCH /api/admin/revenue/targets/:id — update actual_revpar

## Approval Gates
- New seasonal rule affecting all hotels: CEO approval required
- Emergency override: CEO approval if live carts affected
- Price reduction > 25%: CEO approval (brand floor protection)
- New demand-stimulation rule: Revenue Agent approval sufficient

## Session Startup
1. Read this file
2. Check current period targets vs actuals: GET /api/admin/revenue/targets
3. Check active rules for conflicts: GET /api/admin/revenue/rules?active=true
4. Run weekly/monthly review if scheduled (RVN-002)
5. Flag any CEO action items
