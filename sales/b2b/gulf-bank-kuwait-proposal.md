# White-Label Partnership Proposal
## Gulf Bank Travel Rewards — UTUBooking API + SDK Integration

**Date:** March 14, 2026
**Prepared by:** AMEC / UTUBooking Sales Team
**Pipeline Stage:** Proposal
**Deal Value:** KWD 180,000+ Year 1 (estimated) — ⚠️ FLAG FOR CEO REVIEW (>SAR 100K)
**Proposal Language:** English (bilingual EN/AR version available on request)

---

## Executive Summary

Gulf Bank's Travel Rewards cardholders currently redeem points through a third-party portal that takes users outside the Gulf Bank app — creating friction, drop-off, and missed revenue. UTUBooking offers a **fully co-branded or white-label hotel and flight booking engine** that embeds directly inside the Gulf Bank mobile app and internet banking portal, keeping cardholders in-app while unlocking a new commission revenue stream.

> **Gulf Bank earns 2% commission on every booking. UTUBooking retains 5% margin. Zero infrastructure cost to Gulf Bank.**

Our platform already powers Hajj & Umrah hotel inventory across Makkah and Madinah — the highest-value travel segment for GCC banking customers — with live availability from Hotelbeds, Amadeus, and Sabre.

---

## The Opportunity

| Metric | Estimate |
|--------|----------|
| Gulf Bank active credit cardholders | ~320,000 |
| Travel spend per cardholder (annual) | KWD 1,200 avg |
| Addressable booking volume (10% capture) | KWD 38.4M |
| Gulf Bank 2% commission (Year 1 estimate) | **KWD 768,000** |
| UTUBooking integration fee (one-time) | KWD 28,000 |
| UTUBooking API license (annual) | KWD 18,000 |

Gulf Bank retains full control of the customer relationship. UTUBooking operates invisibly in the background.

---

## What Gulf Bank Gets

### 1. Embedded Booking Widget (SDK)
- React Native SDK + Web SDK — drops into Gulf Bank's existing app in **2–4 weeks**
- Full Gulf Bank branding: logo, colors, Arabic/English UI
- Hajj & Umrah packages prioritized (highest-margin, highest-demand segment for KWT customers)
- Points redemption integration — API accepts Gulf Bank reward points as payment offset

### 2. Hotel & Flight Inventory
- **Hotels:** 500,000+ properties worldwide via Hotelbeds; Makkah/Madinah priority stock
- **Flights:** Live GDS pricing via Amadeus (primary) + Sabre (fallback)
- **Cars:** CarTrawler global car rental
- All inventory live-priced in KWD and SAR

### 3. Commission Dashboard (Admin Portal)
- Real-time booking volume, revenue, and commission reports
- Export to Gulf Bank finance formats (Excel / PDF)
- Cardholder booking history accessible for customer service

### 4. Compliance & Security
- PCI DSS — all card data handled by UTUBooking payment layer (STC Pay, Moyasar, Stripe)
- Gulf Bank never touches raw card data for travel payments
- Data residency: Kuwait + KSA (AWS Bahrain me-south-1)

---

## Integration Models

| Model | Description | Time to Live |
|-------|-------------|--------------|
| **Co-branded widget** | UTUBooking UI with Gulf Bank logo/colors inside iframe or webview | 2 weeks |
| **SDK (recommended)** | Native React Native components — seamless in-app experience | 4 weeks |
| **Full white-label API** | Gulf Bank builds their own UI; UTUBooking provides REST API + webhook | 8–12 weeks |

**Recommendation: SDK model** — fastest to market, lowest Gulf Bank engineering cost, highest conversion rate vs. webview redirect.

---

## Revenue Share Structure

```
Customer pays KWD 200 for hotel booking
├── UTUBooking collects payment
├── Pays supplier net rate ~KWD 190
├── Gross margin = KWD 10 (5.26%)
│   ├── Gulf Bank share: KWD 4.00 (2%)  ← deposited monthly to Gulf Bank settlement account
│   └── UTUBooking share: KWD 5.26 (retained margin, net of 2% payout)
└── Points offset: if cardholder redeems 5,000 pts = KWD 10 → Gulf Bank absorbs from rewards budget
```

Settlements: monthly wire transfer to Gulf Bank treasury, USD or KWD.

---

## Pricing

| Item | Fee |
|------|-----|
| One-time integration & SDK setup | **KWD 28,000** |
| Annual API license + SLA support | **KWD 18,000 / year** |
| Commission to Gulf Bank | **2% of gross booking value** |
| Points redemption API | Included |
| Dedicated account manager (GCC) | Included |
| Arabic localization + RTL UI | Included |

**No per-transaction fees. No minimum booking volume.**

Payment terms: 50% on contract signing, 50% on go-live.

---

## Implementation Timeline

| Week | Milestone |
|------|-----------|
| 1–2 | Contract signing, technical onboarding, API credentials provisioned |
| 3–4 | SDK integration into Gulf Bank staging app, branding applied |
| 5 | UAT (User Acceptance Testing) — Gulf Bank QA team |
| 6 | Soft launch: internal staff pilot (500 users) |
| 7–8 | Full cardholder rollout + marketing campaign |
| 12 | First commission settlement |

---

## Why UTUBooking

- **Hajj & Umrah specialists** — best hotel inventory near Haram; this is our core market
- **Arabic-first** — RTL UI, bilingual support, Arab customer service team
- **GCC compliance** — VAT-ready (KSA 15%, Kuwait 0%), Saudi CB & CBK-compatible data flows
- **Proven stack** — processing live Hajj bookings at scale with 99.9% uptime SLA
- **AI-powered pricing** — dynamic hotel recommendations updated every 6 hours (vs. static rates from legacy portals)

---

## Next Steps

1. ✅ Proposal delivered — pending Gulf Bank review
2. 📅 **Request:** 30-minute technical demo with Gulf Bank digital banking + IT teams
3. 📋 NDA + Data Processing Agreement (DPA) to be signed before API sandbox access
4. 🔧 Sandbox environment provisioned within 48h of NDA signing

**Contact:** sales@utubooking.com | WhatsApp: +966 5X XXX XXXX

---

*⚠️ Internal Note: Deal value exceeds SAR 100K equivalent. CEO review required before sending.*
*Pipeline stage: Proposal. Next action: schedule demo call with Gulf Bank Digital team.*
