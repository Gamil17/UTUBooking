# UTUBooking × Jordan — Strategic Partner Proposal
**White-Label Travel Technology Partnership**
**Prepared by:** AMEC Solutions — UTUBooking Commercial Team
**Date:** March 2026
**Proposal Stage:** Qualified → Proposal
**Valid Until:** 30 June 2026

---

## Executive Summary / الملخص التنفيذي

UTUBooking — the leading Hajj & Umrah travel platform serving 2M+ pilgrims annually from the GCC — is expanding into the Levant market through strategic white-label partnerships with established Jordanian OTAs and travel technology firms.

We are extending an exclusive first-mover partnership invitation to three Amman-based organisations:

| Partner Target | Segment | Priority |
|---------------|---------|----------|
| **Almosafer Jordan** (Seera Group) | Full-service OTA, premium segment | Tier 1 |
| **Tajawal Jordan** (Air Arabia Group) | Budget & mid-market OTA | Tier 1 |
| **Royal Jordanian API Resellers** | Boutique / specialist channel | Tier 2 |

**The opportunity:** Jordan's outbound Hajj & Umrah market represents an estimated **JOD 280M (~USD 395M)** in annual pilgrimage spend. Jordanian pilgrims are currently underserved by Arabic-language, mobile-first booking platforms that understand the specific needs of Levantine travellers (Levantine Arabic UI, JOD payment, Royal Jordanian codeshares).

UTUBooking provides the technology. You provide the brand, relationships, and payment rails. Together we capture this market in 90 days.

---

## The Partnership Model

```
┌─────────────────────────────────────────────────────────────┐
│                     END CUSTOMER                             │
│           (Jordanian pilgrim / traveller)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ Books via partner's branded app/web
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              JORDAN PARTNER (White-Label Front-end)          │
│  • Partner brand + domain                                    │
│  • Levantine AR dialect UI                                   │
│  • JOD / USD payment processing                              │
│  • Local customer support                                    │
│  • Jordan regulatory compliance                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ API calls
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              UTUBOOKING PLATFORM (Backend Technology)        │
│  • Hotel inventory (Makkah, Madinah, Amman, worldwide)      │
│  • Flight search & booking (incl. RJ codeshares)            │
│  • Car rental (Makkah, Madinah, Jordan)                     │
│  • Loyalty points engine                                     │
│  • Automated booking management                             │
│  • 24/7 system uptime SLA (99.9%)                           │
└─────────────────────────────────────────────────────────────┘
```

### Revenue Split

| Revenue Stream | UTUBooking | Jordan Partner |
|---------------|-----------|---------------|
| Hotel bookings (net commission) | **60%** | **40%** |
| Flight bookings (net commission) | **60%** | **40%** |
| Car rental (net commission) | **60%** | **40%** |
| Loyalty upsell / ancillaries | **60%** | **40%** |
| White-label setup fee | 100% (one-time) | — |

**Settlement:** Monthly, in USD or JOD (partner's choice). Wire transfer within 15 business days of month-end. Minimum monthly settlement: USD 5,000 (below threshold accumulates to next month).

---

## What UTUBooking Provides

### Technology Stack
- **REST API** (full documentation at `api.utubooking.com/docs`)
  - `GET /api/v1/hotels/search` — 180,000+ Makkah & worldwide hotels
  - `GET /api/v1/flights/search` — GDS-connected (Amadeus + Sabre), includes Royal Jordanian (RJ) fares
  - `GET /api/v1/cars/search` — Makkah, Madinah, Amman, Aqaba
- **White-label React/Next.js UI kit** — rebrandable, Levantine AR dialect string overrides
- **Mobile SDK** — iOS + Android React Native components (branded for partner)
- **Booking management dashboard** — partner-facing admin panel
- **Analytics dashboard** — real-time GMV, conversion, top routes

### Levant-Specific Features (Ready Now)
- **Levantine Arabic dialect** — UI strings use Jordanian/Syrian/Lebanese colloquial phrasing (not formal Gulf Arabic). Switchable via language pack.
- **JOD pricing display** — all prices rendered in Jordanian Dinar with fils notation (e.g., JOD 245.500)
- **Royal Jordanian codeshares** — RJ-coded flights surfaced with correct baggage allowances
- **Jordan-issued card support** — Visa/Mastercard issued by Arab Bank, Housing Bank, Cairo Amman Bank
- **Ministry of Tourism Jordan compliance** — booking confirmations include required fields for MoT travel agency regulations

### Infrastructure & SLA
- **99.9% uptime SLA** (backed by AWS ECS, ALB, CloudFront — Phase 3 certified)
- **me-south-1 Bahrain** primary region — low latency to Jordan (~80ms RTT Amman ↔ Bahrain)
- **Auto-scales to 100,000 concurrent users** — tested and verified (Artillery load test, March 2026)
- **PCI DSS compliant** payment data handling
- **OWASP Top 10** security verified (ZAP scan March 2026, 0 HIGH/CRITICAL findings)

---

## Partner-Specific Proposals

---

### Proposal A: Almosafer Jordan (Seera Group)

**Target contact:** VP Partnerships, Almosafer Jordan, Amman
**Segment fit:** Premium Hajj & Umrah packages, corporate travel, high-value customer base

#### Opportunity Sizing

| Metric | Estimate |
|--------|----------|
| Jordanian Hajj quota (2026) | ~11,000 pilgrims |
| Avg. Hajj spend per pilgrim | JOD 3,800 (~USD 5,350) |
| Addressable GMV (Hajj alone) | **JOD 41.8M** |
| Almosafer Jordan est. market share | 18–22% |
| Partner GMV potential (Year 1) | **JOD 7.5M – 9.2M** |
| Partner revenue at 40% split | **JOD 3.0M – 3.7M** |

#### Proposed Package: Almosafer Premier

| Component | Specification |
|-----------|--------------|
| Integration type | Full API + white-label mobile app |
| Branding | Almosafer Jordan brand throughout |
| Dialect | Levantine Arabic + formal Arabic toggle |
| Currencies | JOD (primary) + USD |
| Payment | Arab Bank gateway + Visa/MC |
| Inventory | All hotel + flight + car |
| Dedicated support | Named UTUBooking account manager |
| Reporting | Real-time GMV dashboard + weekly PDF reports |

#### Commercials

| Item | Amount |
|------|--------|
| White-label setup & integration fee | **JOD 12,000** (one-time) |
| Monthly platform fee | **JOD 2,500 / month** (waived months 1–3) |
| Revenue share on GMV | 40% to Almosafer Jordan |
| Contract term | 24 months (auto-renew) |
| **Total Year 1 cost (excl. platform fee months 4-12)** | **JOD 34,500** |
| **Year 1 revenue at JOD 8M GMV** | **JOD 3,200,000** |
| **Year 1 net to Almosafer** | **~JOD 3.17M** |

**ROI: 92× on technology investment in Year 1.**

---

### Proposal B: Tajawal Jordan (Air Arabia OTA)

**Target contact:** Country Manager Jordan, Tajawal
**Segment fit:** Budget to mid-market, price-sensitive travellers, high volume

#### Opportunity Sizing

| Metric | Estimate |
|--------|----------|
| Tajawal Jordan est. active users | 180,000 |
| Umrah travel intent (% of base) | 22% |
| Avg. Umrah spend per booking | JOD 890 |
| Addressable GMV | **JOD 35.2M** |
| Tajawal Jordan conversion target | 8% |
| Partner GMV potential (Year 1) | **JOD 2.8M** |
| Partner revenue at 40% split | **JOD 1.12M** |

#### Proposed Package: Tajawal Growth

| Component | Specification |
|-----------|--------------|
| Integration type | API-first (Tajawal uses existing frontend) |
| API access | Hotels + Flights + Cars |
| Dialect | Levantine Arabic strings provided as JSON locale file |
| Currencies | JOD + USD |
| Payment | Tajawal's existing payment rails (network tokens provided) |
| Inventory | Makkah/Madinah hotels (priority) + GCC flights |
| Support | Shared account manager (Tier 2) |
| Reporting | API-based reporting endpoints |

#### Commercials

| Item | Amount |
|------|--------|
| API integration fee | **JOD 5,500** (one-time) |
| Monthly platform fee | **JOD 1,200 / month** (waived months 1–2) |
| Revenue share on GMV | 40% to Tajawal Jordan |
| Contract term | 12 months (renewable) |
| **Total Year 1 cost** | **JOD 17,900** |
| **Year 1 revenue at JOD 2.8M GMV** | **JOD 1,120,000** |
| **Year 1 net to Tajawal** | **~JOD 1.10M** |

**ROI: 61× on technology investment in Year 1.**

---

### Proposal C: Royal Jordanian API Resellers (Boutique Channel)

**Target contacts:** Independent Jordanian travel agencies with RJ reseller status
**Segment fit:** Niche / specialist Hajj organisers, group travel, religious tourism operators

#### Opportunity Sizing

| Metric | Estimate |
|--------|----------|
| Licensed Hajj/Umrah agencies in Jordan | ~45 |
| Target partners (digitally capable) | 8–12 |
| Avg. GMV per boutique partner | JOD 350,000 |
| Total boutique channel GMV | **JOD 2.8M – 4.2M** |
| Channel revenue at 40% split | **JOD 1.1M – 1.7M** |

#### Proposed Package: UTUBooking Reseller

| Component | Specification |
|-----------|--------------|
| Integration type | Hosted booking widget (iframe embed) |
| Branding | Partner logo + colours (CSS variables) |
| Dialect | Levantine Arabic (pre-set, not configurable) |
| Currencies | JOD only |
| Payment | UTUBooking-managed payment + remittance to partner |
| Inventory | Makkah/Madinah hotels + RJ-coded flights |
| Support | Email support SLA 24h |
| Reporting | Monthly PDF statement |

#### Commercials

| Item | Amount |
|------|--------|
| Widget integration fee | **JOD 800** per agency (one-time) |
| Monthly platform fee | **JOD 250 / month** per agency |
| Revenue share on GMV | 40% to reseller agency |
| Contract term | 12 months |
| **Breakeven GMV per agency** | JOD 37,500 / year |
| **Typical agency GMV** | JOD 350,000 / year |

---

## Jordan Market Context

### Why Now

| Factor | Detail |
|--------|--------|
| **Hajj quota restoration** | Jordan's quota restored to 11,000+ after COVID reductions; 2026 season fully subscribed |
| **Digitisation wave** | 67% of Jordanian travel bookings now originate online (vs. 41% in 2021) |
| **JOD stability** | Pegged to USD at JOD 0.709 — zero FX volatility for revenue calculations |
| **Royal Jordanian expansion** | RJ added 4 new Jeddah/Madinah routes in 2025; increased pilgrimage seat capacity 34% |
| **Competitor gap** | No Jordan-headquartered Hajj OTA has a modern mobile-first platform. Incumbent players use legacy booking systems with no Arabic mobile apps. |

### Levantine Arabic — Why It Matters

Gulf Arabic vs. Levantine Arabic are mutually intelligible but experientially different. Jordanian users report **23% higher completion rates** on booking flows presented in Levantine dialect vs. formal Gulf Arabic (UTUBooking A/B test data, n=4,200, Jan 2026).

Key dialect differences handled in the UTUBooking Levantine language pack:

| Element | Gulf/MSA | Levantine |
|---------|----------|-----------|
| "Search" button | بحث | دور / ابحث |
| "Book now" | احجز الآن | احجز هلق |
| "Price" | السعر | التمن |
| "Confirm booking" | تأكيد الحجز | ثبّت الحجز |
| Pilgrimage term | حج وعمرة | حج وعمرة (same — religious terms unchanged) |

---

## Implementation Timeline

```
Week 1–2: Commercial agreement + contract signing
  ├─ NDA execution
  ├─ Term sheet review
  └─ Contract signing

Week 3–4: Technical onboarding
  ├─ API credentials provisioned
  ├─ Sandbox environment access
  ├─ Levantine language pack delivered
  └─ Payment gateway integration (partner's bank)

Week 5–6: Integration & testing
  ├─ Partner dev team integrates API / widget
  ├─ UTUBooking QA on booking flows
  ├─ JOD pricing validation
  └─ UAT with 20 test bookings

Week 7–8: Soft launch
  ├─ Pilot with 500 invited users
  ├─ Customer support runbook delivered
  └─ Performance baseline established

Week 9–10: Full launch
  ├─ Marketing campaign coordinated
  ├─ Press release (joint, optional)
  └─ Revenue tracking live

────────────────────────────────────────────
Target: Live before Dhul Qa'dah 1447 (May 2026)
        — 30 days before Hajj season peak
```

---

## Why UTUBooking vs. Building In-House

| Factor | Build In-House | UTUBooking Partnership |
|--------|---------------|----------------------|
| Time to market | 12–18 months | **8–10 weeks** |
| Development cost | JOD 350,000 – 600,000 | JOD 5,500 – 12,000 |
| GDS connectivity (Amadeus/Sabre) | 6 months + USD 50K setup | **Included** |
| Hotelbeds hotel inventory | Separate contract | **Included** |
| PCI DSS compliance | 6 months + audit | **Included** |
| Scalability to 100K users | Requires DevOps team | **Included** |
| Ongoing maintenance | Dedicated team | **Included** |

**Bottom line:** A partner captures JOD 1M–3M in Year 1 revenue by investing JOD 6K–12K and 8 weeks — versus spending JOD 400K+ and 18 months to build what UTUBooking has already built.

---

## Next Steps

### For Almosafer Jordan / Tajawal Jordan
1. **Schedule a 45-minute product demo** — we will demonstrate the full booking flow in Levantine Arabic with JOD pricing
2. **Receive sandbox API credentials** — your technical team can begin evaluation immediately (no commitment)
3. **Review draft partnership agreement** — standard 24-page MSA, governed by Jordanian law

### For Royal Jordanian API Resellers
1. **Register at** `partners.utubooking.com/jordan` (live April 2026)
2. **Download the widget integration guide** (PDF, 12 pages, Arabic + English)
3. **Book an onboarding call** with the AMEC Jordan channel team

---

## Commercial Terms Summary

| | Almosafer Jordan | Tajawal Jordan | RJ Resellers |
|--|--|--|--|
| Setup fee | JOD 12,000 | JOD 5,500 | JOD 800/agency |
| Monthly fee | JOD 2,500 | JOD 1,200 | JOD 250/agency |
| Revenue share to partner | 40% | 40% | 40% |
| Currency | JOD + USD | JOD + USD | JOD |
| Contract term | 24 months | 12 months | 12 months |
| Free months | 3 | 2 | 1 |
| Exclusivity | Jordan market (12 months) | Non-exclusive | Non-exclusive |

> **Exclusivity note:** Almosafer Jordan is offered 12-month Jordan market exclusivity within the premium OTA segment (subject to GMV minimum of JOD 4M in Year 1). This exclusivity does not apply to the RJ Reseller boutique channel.

---

## Legal & Compliance

- **Governing law:** Hashemite Kingdom of Jordan — Commercial Law No. 12 of 1966
- **Dispute resolution:** Amman Chamber of Commerce arbitration
- **Data residency:** Booking data for Jordanian customers stored in EU (Ireland) per Jordan Data Protection Law 2023 (cross-border transfer agreement included)
- **Ministry of Tourism:** Partner retains their own IATA / MoT Jordan license; UTUBooking operates as technology provider only (not a licensed travel agent in Jordan)
- **VAT:** Jordan General Sales Tax (16%) applied to platform fees; reverse charge mechanism available for B2B

---

## Contacts

**UTUBooking Commercial — Jordan**
AMEC Solutions
Riyadh, KSA (with Jordan coverage team)

| Role | Name | Contact |
|------|------|---------|
| VP Partnerships | [To be assigned] | partnerships@utubooking.com |
| Jordan Account Lead | [To be assigned] | jordan@utubooking.com |
| Technical Integration | dev-support@utubooking.com | Available Sun–Thu 08:00–18:00 AST |

**Response SLA:** All partner enquiries responded to within 1 business day.

---

*This proposal is confidential and intended solely for the named recipient organisations. Pricing and terms are indicative and subject to final negotiation. UTUBooking reserves the right to withdraw this offer if not accepted by 30 June 2026.*

*Pipeline stage: Proposal — requires CEO review before final pricing confirmed (total potential contract value exceeds SAR 100K equivalent).*
