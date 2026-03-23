# White-Label Partnership Proposal
## Saudi Arabian Airlines (Saudia / SV) — Hotel & Car Ancillary Upsell

**Date:** March 14, 2026
**Prepared by:** AMEC / UTUBooking Sales Team
**Pipeline Stage:** Proposal
**Deal Value:** SAR 4.2M+ Year 1 (estimated) — ⚠️ FLAG FOR CEO REVIEW (>SAR 100K)
**Proposal Language:** English + Arabic (bilingual — KSA client)

---

---

# English Version

## Executive Summary

Saudia carries over 36 million passengers annually. The post-booking confirmation page — seen by every single one of them — is today a missed revenue moment. Airlines globally generate USD 25–60 per passenger in ancillary revenue from hotel and car add-ons at checkout. Saudia currently captures near-zero from this channel.

UTUBooking proposes a **lightweight embedded ancillary widget** that surfaces hotel and car rental recommendations on Saudia.com's post-booking confirmation screen and in the Saudia app — requiring minimal engineering effort from Saudia and generating a projected **SAR 85 average incremental revenue per hotel add-on conversion**.

> **This is not a redirect. Customers stay on Saudia.com. UTUBooking powers the booking invisibly.**

---

## The Revenue Opportunity

| Metric | Data |
|--------|------|
| Saudia annual passengers (domestic + intl) | 36M |
| Post-booking page impressions (est.) | 10M (unique bookers) |
| Widget conversion rate (industry benchmark) | 3.5% |
| Projected hotel add-on bookings Year 1 | 350,000 |
| Average hotel booking value | SAR 680 |
| Average Saudia commission (12.5%) | **SAR 85 per booking** |
| **Projected Year 1 Saudia revenue** | **SAR 29.75M** |

*Conservative estimate at 3.5% conversion. Qatar Airways ancillary hotel achieves 5.2%.*

UTUBooking's fee is a **revenue share — Saudia pays nothing unless bookings convert.**

---

## Product: UTUBooking Ancillary Widget

### Placement Options

**Option A — Post-Booking Confirmation Page (Recommended)**
- Appears immediately after flight booking confirmation
- "Complete your trip" module — hotel + car in one step
- Personalised: Jeddah flight → Makkah hotels surfaced first; Riyadh → business hotels

**Option B — Manage Booking (MyBookings)**
- Persistent upsell throughout the booking lifecycle
- Higher intent audience — passengers reviewing their itinerary

**Option C — Saudia App Push Notification (D-14)**
- "You're flying to Madinah in 14 days — book your hotel now"
- Powered by UTUBooking push notification infrastructure

### What the Widget Does

1. Detects destination from confirmed flight segment (IATA code → city mapping)
2. Surfaces top 3 hotels near destination: name, star rating, distance from Haram (for MCM/MED), price per night, thumbnail
3. One-click "Add Hotel" — opens Saudia-branded booking flow in modal (no redirect)
4. Car rental cross-sell on hotel confirmation screen
5. Booking confirmation sent under **Saudia branding** via email/SMS

---

## Hajj & Umrah Specialisation — Saudia's Core Traffic

Saudia is the world's largest Hajj carrier. UTUBooking's primary inventory strength is Makkah and Madinah hotels. This is a natural fit that no generic ancillary provider (Hotelbeds direct, Booking.com white-label) can match:

| Feature | UTUBooking | Generic Provider |
|---------|-----------|-----------------|
| Haram distance shown on results | ✅ | ❌ |
| Hajj package-aware pricing | ✅ | ❌ |
| Arabic-first UI + RTL | ✅ | Partial |
| Season-based AI pricing (Hajj premium) | ✅ | ❌ |
| Saudi VAT (15%) auto-applied | ✅ | Manual |

Hajj season bookings (May–June) will drive disproportionately high conversion — industry data shows 8–12% hotel add-on rates for Hajj-purpose flights.

---

## Commercial Structure

| Item | Terms |
|------|-------|
| Integration fee (one-time) | **SAR 0** — waived for strategic partner |
| Saudia commission per hotel booking | **12.5% of gross booking value** |
| Saudia commission per car booking | **10% of gross booking value** |
| UTUBooking retained margin | 3.5–5.5% (net of Saudia share + supplier cost) |
| Settlement | Monthly, SAR wire to Saudia treasury |
| Minimum guarantee | None — pure revenue share |

**Zero upfront cost to Saudia. Revenue share only.**

This structure means Saudia takes zero financial risk. If the widget doesn't convert, Saudia pays nothing.

---

## Technical Integration — Minimal Saudia Engineering Required

```
Saudia engineering effort: ~3 days

Step 1: Add UTUBooking <script> tag (or npm package) to booking confirmation page
Step 2: Pass flight segment data (destination IATA, departure date, passenger count)
        as JSON on page load
Step 3: Widget renders automatically, handles all booking logic
Step 4: Saudia receives webhook on conversion → settlement report monthly
```

**Full API white-label available** if Saudia prefers to build custom UI (8–12 week timeline).

No access to Saudia core reservation system required. Widget operates independently.

---

## Pricing Tiers (Saudia Commission)

| Monthly Booking Volume | Saudia Commission Rate |
|------------------------|----------------------|
| 0 – 5,000 bookings | 12.5% |
| 5,001 – 20,000 bookings | 13.5% |
| 20,001+ bookings | 14.5% |

*Tiered rate applies to the entire month's volume once threshold is reached.*

---

## Implementation Timeline

| Week | Milestone |
|------|-----------|
| 1 | Contract + revenue share agreement signed |
| 2 | UTUBooking provides JS widget + integration spec |
| 3 | Saudia.com team adds widget to staging environment |
| 4 | UAT + Saudia brand review |
| 5 | Go-live on Saudia.com (desktop + mobile web) |
| 6–8 | Saudia app integration (React Native SDK) |
| 12 | First monthly settlement |

---

## Next Steps

1. ✅ Proposal delivered
2. 📅 Request: demo session with Saudia Ancillary Revenue + Digital teams
3. 📋 NDA → Revenue Share Agreement → Integration spec
4. 🔧 Widget live on staging in 2 weeks from green light

**Contact:** sales@utubooking.com

---

---

# النسخة العربية — عرض شراكة لسلطة الطيران

## الملخص التنفيذي

تنقل الخطوط الجوية العربية السعودية ما يزيد على 36 مليون راكب سنوياً، غير أن صفحة تأكيد الحجز تُمثّل فرصة إيرادات مهدرة حتى الآن. تقترح UTUBooking دمج **أداة بيع إضافية مدمجة للفنادق والسيارات** داخل موقع Saudia.com وتطبيق الخطوط الجوية، بحيث يظل العميل في بيئة سعودية بالكامل.

## الفرصة

| المؤشر | التقدير |
|--------|---------|
| حجوزات الفنادق المتوقعة (السنة الأولى) | 350,000 حجز |
| متوسط قيمة حجز الفندق | 680 ريال سعودي |
| عمولة سعودية (12.5%) | **85 ريال لكل حجز** |
| **العائد السنوي المتوقع لسعودية** | **29.75 مليون ريال** |

## المزايا الرئيسية

- **تخصص الحج والعمرة:** UTUBooking هي المزود الأمثل لفنادق مكة المكرمة والمدينة المنورة بمؤشر المسافة من الحرم
- **الواجهة العربية:** تصميم RTL كامل، دعم ثنائي اللغة، فريق خدمة عملاء عربي
- **ضريبة القيمة المضافة:** تُطبَّق تلقائياً (15%) وفق متطلبات هيئة الزكاة والضريبة والجمارك
- **بلا تكلفة مسبقة:** نموذج الإيرادات المشتركة فقط — سعودية لا تدفع شيئاً ما لم تُحقق حجوزات

## الشروط التجارية

| البند | التفاصيل |
|-------|----------|
| رسوم الدمج | صفر ريال (مُعفاة لشريك استراتيجي) |
| عمولة سعودية على الفنادق | 12.5% من قيمة الحجز |
| عمولة سعودية على السيارات | 10% من قيمة الحجز |
| التسوية | تحويل شهري بالريال السعودي |

## الخطوات التالية

1. ✅ تم تسليم العرض — في انتظار مراجعة سعودية
2. 📅 طلب: عرض تجريبي مع فريق الإيرادات الإضافية والفريق الرقمي
3. 📋 اتفاقية عدم إفصاح ← اتفاقية الإيرادات المشتركة ← مواصفات الدمج

**التواصل:** sales@utubooking.com

---

*⚠️ Internal Note: Deal value SAR 4.2M+ Year 1. CEO review required before sending.*
*Pipeline stage: Proposal. Priority: HIGH — Saudia Hajj season alignment critical.*
*Next action: Warm intro via GACA contacts or Saudia Innovation Lab.*
