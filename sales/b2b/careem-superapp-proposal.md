# White-Label Partnership Proposal
## Careem — Full API White-Label Travel Inventory (Hotel + Flight)

**Date:** March 14, 2026
**Prepared by:** AMEC / UTUBooking Sales Team
**Pipeline Stage:** Proposal
**Deal Value:** USD 2.4M+ Year 1 (volume pricing model) — ⚠️ FLAG FOR CEO REVIEW (>SAR 100K)
**Currency:** USD (international deal — Careem HQ: Dubai, UAE)
**Proposal Language:** English

---

## Executive Summary

Careem has 50+ million users and is actively expanding beyond ride-hailing into a full GCC super-app. Travel — specifically hotel and flight booking — is the highest-value category Careem does not yet own. Uber Eats disrupted food; Careem can own GCC travel the same way.

UTUBooking offers Careem a **complete, white-label travel API** that puts hotel and flight inventory under the Careem brand in weeks, not years. No licensing complexity. No supplier negotiations. No ops team to hire.

> **2 million+ Careem users in GCC searching for flights and hotels — powered by UTUBooking's infrastructure, branded as Careem.**

This is a volume deal. Our pricing scales aggressively with Careem's user base, and we are prepared to offer **exclusivity in the ride-hailing-to-travel vertical across GCC** for a committed volume tier.

---

## Why Careem, Why Now

| Signal | Implication |
|--------|-------------|
| Uber's 2024 travel pivot (Uber Travel launch) | Careem must respond or cede travel to Uber |
| GCC digital travel market: USD 12.4B by 2027 | Massive TAM, underserved by Arabic-first products |
| Careem Super App launch (food, grocery, payments) | Travel is the missing vertical |
| 2M+ MAU already searching travel on Careem | Revealed intent without a product to capture it |
| UTUBooking Hajj/Umrah specialty | Careem's core Arab Muslim user base — highest-value travel segment |

**First-mover advantage:** No GCC ride-hailing app has a native hotel booking product. Careem can own this category.

---

## The Product: UTUBooking Full API White-Label

Careem builds the UI. UTUBooking provides everything behind it.

### What Careem Gets via API

```
UTUBooking REST API endpoints (all under Careem brand):

Hotels
├── GET  /hotels/search       → live availability, 500K+ properties, Hotelbeds
├── GET  /hotels/:id          → property detail, photos, amenities
├── POST /hotels/book         → real-time booking + confirmation
└── GET  /hotels/booking/:ref → booking status, cancellation

Flights
├── GET  /flights/search      → GDS live pricing (Amadeus + Sabre fallback)
├── GET  /flights/offers/:id  → fare rules, baggage allowance
└── POST /flights/book        → ticketing + PNR creation

Cars
└── GET/POST /cars/search + /cars/book  → CarTrawler global inventory

Payments
└── STC Pay · Mada · Visa/Mastercard · Apple Pay (Careem Pay integration available)

Webhooks
└── booking.confirmed · booking.cancelled · payment.completed
```

### Arabic-First, RTL-Ready

All API responses include bilingual content:
- `name.en` + `name.ar` for hotels, airlines, destinations
- `distanceHaramM` field for Makkah/Madinah proximity (unique to UTUBooking)
- Currency: AED (default for Careem UAE), SAR, KWD, EGP all supported

---

## Volume Pricing Model

UTUBooking's model for Careem is **volume-tiered margin sharing** — the more Careem books, the lower UTUBooking's margin, the higher Careem's effective take rate.

### Hotel Bookings

| Monthly GMV (USD) | UTUBooking Margin | Careem Effective Take |
|-------------------|-------------------|-----------------------|
| $0 – $500K | 5.5% | ~2.5% |
| $500K – $2M | 4.5% | ~3.0% |
| $2M – $5M | 3.5% | ~3.5% |
| $5M+ | 2.8% | ~4.0% |

*Supplier net rates locked annually. Careem margin = booking value − supplier cost − UTUBooking margin.*

### Flight Bookings

| Monthly GMV (USD) | UTUBooking Margin | Careem Effective Take |
|-------------------|-------------------|-----------------------|
| $0 – $1M | 3.0% | ~1.5% |
| $1M – $5M | 2.5% | ~1.8% |
| $5M+ | 2.0% | ~2.2% |

### API License Fee

| Tier | Monthly API Calls | Annual License (USD) |
|------|-------------------|----------------------|
| Starter | Up to 500K | $36,000 |
| Growth (recommended) | Up to 5M | $84,000 |
| Enterprise | Unlimited | $180,000 |

*License fee credited against margin if GMV > $10M/month.*

---

## Exclusivity Offer

UTUBooking will grant Careem **category exclusivity in the ride-hailing-to-travel vertical** across UAE, KSA, Kuwait, Bahrain, Qatar, Jordan, Pakistan, and Egypt — for 24 months — in exchange for a committed minimum GMV of USD 8M/month by Month 12.

This means: no white-label deal with Uber, Lyft, or any ride-hailing competitor in GCC during the exclusivity period.

---

## Revenue Projection — Careem Travel (Year 1)

| Assumption | Value |
|-----------|-------|
| Careem MAU (travel feature) — Month 1 | 50,000 |
| Careem MAU (travel feature) — Month 12 | 400,000 |
| Hotel conversion rate | 4% of travel MAU monthly |
| Average hotel booking (AED) | AED 680 |
| Hotel GMV Year 1 | **AED 39.4M (~USD 10.7M)** |
| Careem take rate (blended, hotel) | ~3.2% |
| **Careem hotel revenue Year 1** | **USD 342K** |
| Flight GMV Year 1 (2x hotel MAU, lower ticket) | USD 18M |
| Careem take rate (blended, flight) | ~1.6% |
| **Careem flight revenue Year 1** | **USD 288K** |
| **Total Careem Year 1 travel revenue** | **~USD 630K** |

*Careem's primary gain is strategic (super-app completion, retention, LTV) — revenue scales significantly in Year 2–3 as the travel tab matures.*

---

## Technical Integration Path

### Phase 1 — API Integration (Weeks 1–6)
- UTUBooking provisions Careem sandbox API keys
- Careem engineering team integrates hotel search + booking
- Careem designs hotel listing + detail UI (UTUBooking provides Figma component library)
- Careem Pay ↔ UTUBooking payment webhook integration

### Phase 2 — Flight + Car (Weeks 7–12)
- Flight search + booking API integration
- Car rental (optional — can defer)
- Deep-link from ride receipt: "Your airport — need a hotel?"

### Phase 3 — AI Personalisation (Month 4+)
- UTUBooking AI pricing engine feeds Careem: "Prices rising in Makkah — book now"
- Demand signals from Careem ride patterns (airport pickups → hotel upsell)
- Loyalty sync: Careem Credits ↔ UTUBooking booking discounts

### Engineering Effort (Careem side)

| Component | Est. Careem Effort |
|-----------|-------------------|
| Hotel search + booking UI | 3–4 weeks (1 FE engineer) |
| API integration + auth | 1 week (1 BE engineer) |
| Careem Pay integration | 1 week (payments team) |
| QA + staging | 1 week |
| **Total to hotel MVP** | **~6 weeks** |

---

## Why UTUBooking (vs. Building In-House or Using Expedia/Booking)

| Factor | UTUBooking | Build In-House | Expedia/Booking WL |
|--------|-----------|----------------|-------------------|
| Arabic-first | ✅ | High cost | Partial |
| Hajj/Umrah specialty | ✅ | No supplier access | ❌ |
| GCC VAT compliance | ✅ auto | Manual | Manual |
| Time to market | 6 weeks | 12–18 months | 3–4 months |
| AI dynamic pricing | ✅ | N/A | ❌ |
| Revenue share model | ✅ | N/A | Fixed margin |
| GCC data residency | ✅ AWS Bahrain | Variable | ❌ US/EU |
| WhatsApp booking support | ✅ planned | N/A | ❌ |

---

## Proposed Commercial Terms Summary

| Item | Terms |
|------|-------|
| API license (Growth tier) | USD 84,000/year |
| UTUBooking hotel margin | 2.8–5.5% (volume-tiered) |
| UTUBooking flight margin | 2.0–3.0% (volume-tiered) |
| Exclusivity (GCC ride-hailing) | 24 months, conditioned on USD 8M GMV/month by Month 12 |
| Contract term | 3 years (with 12-month break clause) |
| Settlement | Monthly USD wire, net-30 |
| SLA uptime | 99.9% (backed by AWS SLA) |

---

## Implementation Timeline

| Month | Milestone |
|-------|-----------|
| M0 | Term sheet signed, API sandbox provisioned |
| M1 | Hotel search + booking live on Careem staging |
| M1.5 | Careem Pay integration complete |
| M2 | Hotel tab live in Careem app (UAE pilot — Dubai users) |
| M3 | KSA launch (Riyadh + Jeddah) |
| M4 | Flight booking live |
| M6 | Full GCC rollout (KW, BH, QA, JO) |
| M12 | Egypt + Pakistan expansion |

---

## Next Steps

1. ✅ Proposal delivered
2. 📅 **Request:** 45-minute business + technical demo with Careem Super App PM + CTO office
3. 📋 NDA → Term Sheet → API Integration Agreement
4. 🔧 Sandbox API keys + Postman collection provided within 24h of NDA

**Contact:** sales@utubooking.com | WhatsApp Business: +966 5X XXX XXXX
**Careem account lead:** [TBD — warm intro via Uber/Careem investor network preferred]

---

*⚠️ Internal Note: Deal value USD 2.4M+ Year 1 (>SAR 9M equivalent). CEO review required before sending.*
*Pipeline stage: Proposal. Priority: STRATEGIC — exclusivity angle must be approved by CEO.*
*Next action: Identify Careem VP Travel / Super App GM. Approach via LinkedIn or mutual VC contact.*
*Competing risk: If Uber Travel expands to GCC, Careem urgency increases — use as hook.*
