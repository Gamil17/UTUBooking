# UTUBooking — North Africa Partner Proposals
## Proposition de partenariat Afrique du Nord

**Version**: 1.0 | **Date**: 2026-03-10 | **Confidentiality**: Commercial-in-Confidence
**Review required**: CEO sign-off (>SAR 100K revenue share threshold)

---

## Executive Summary / Résumé Exécutif

UTUBooking is expanding its white-label B2B platform into the Maghreb, targeting the Morocco and Tunisia Hajj/Umrah travel market. Both countries combined represent approximately **12,500 Hajj pilgrims annually** at an estimated platform GMV of **MAD 384M (~USD 38M)** for Morocco and **TND 63M (~USD 20M)** for Tunisia.

The revenue model is a **60/40 split** (UTUBooking / Partner) on all platform-originated bookings. Each partner operates under their own brand powered by the UTUBooking white-label engine.

---

## PROPOSAL 1 — MOROCCO / MAROC

### Partner: Maroc Voyages

| Field | Details |
|-------|---------|
| **Entity** | Maroc Voyages S.A. (Casablanca) |
| **Tier** | Tier 1 — Full OTA Integration |
| **Locale** | `fr-MA` (French) + `ar-MA` (Darija Arabic) |
| **Currency** | MAD (Moroccan Dirham) |
| **Subdomain** | `marocvoyages.utubooking.com` |
| **Custom Domain** | `booking.marocvoyages.ma` (CNAME to UTUBooking CDN) |

### Market Context

Morocco's Ministry of Habous allocates approximately **8,000 Hajj pilgrims per year**. The average package cost is **MAD 48,000 per pilgrim** (flights + accommodation + ground transport), yielding a total market GMV of **MAD 384M** (~USD 38M).

Key payment rails:
- **CIH Bank** — dominant for Moroccan pilgrims paying installments
- **BMCE Bank (Bank of Africa)** — corporate accounts for travel agencies
- **CMI (Centre Monétique Interbancaire)** — card processing (Visa/Mastercard)

Royal Air Maroc operates **codeshare routes** with Saudia on CMN–JED and CMN–MED. Maroc Voyages is an authorized RA Maroc GSA with access to blocked seating.

### Technical Integration

```
Tenant Config:
{
  "slug":             "marocvoyages",
  "name":             "Maroc Voyages",
  "domain":           "marocvoyages.utubooking.com",
  "custom_domain":    "booking.marocvoyages.ma",
  "currency":         "MAD",
  "locale":           "fr-MA",
  "primary_color":    "#C8102E",
  "secondary_color":  "#006233",
  "enabled_modules":  ["hotel", "flight", "car"],
  "hide_platform_branding": true,
  "commission_rates": { "hotel": 0.60, "flight": 0.60, "car": 0.60 },
  "revenue_share_pct": 40.00
}
```

### Commercial Terms

| Metric | Value |
|--------|-------|
| Hajj quota (annual) | ~8,000 pilgrims |
| Avg package value | MAD 48,000 |
| Projected GMV (Year 1) | MAD 384,000,000 |
| UTUBooking take (60%) | MAD 230,400,000 (~USD 22.9M) |
| Partner share (40%) | MAD 153,600,000 (~USD 15.3M) |
| Integration fee (one-time) | MAD 120,000 |
| Annual SLA fee | MAD 60,000 |

**CEO Review Flag**: Annual revenue share exceeds SAR 100K threshold. Sign-off required before contract execution.

### Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Tenant provisioning | Week 1 | API key + subdomain live |
| Brand assets integration | Week 1–2 | Logo, colors, CNAME cert |
| CMI payment gateway | Week 2–3 | Card processing live |
| CIH Bank installments | Week 3–4 | 3/6-month installment plans |
| UAT + Hajj content load | Week 4–6 | 50+ Makkah hotels, 10 flight routes |
| Go-live | Week 7 | Production launch |

---

## PROPOSAL 2 — TUNISIA / TUNISIE

### Partner A: Ennakl Voyages (Tier 1)

| Field | Details |
|-------|---------|
| **Entity** | Ennakl Voyages S.A.R.L. (Tunis) |
| **Tier** | Tier 1 — Full OTA Integration |
| **Locale** | `fr-TN` (French) |
| **Currency** | TND (Tunisian Dinar) |
| **Subdomain** | `ennakl.utubooking.com` |
| **Custom Domain** | `hajj.ennakl.tn` (CNAME) |

### Partner B: Tunisie Booking (Tier 2)

| Field | Details |
|-------|---------|
| **Entity** | Tunisie Booking SARL (Sfax) |
| **Tier** | Tier 2 — API Access Only |
| **Locale** | `fr-TN` (French) |
| **Currency** | TND |
| **Subdomain** | `tunisiebooking.utubooking.com` |
| **API Access** | Inventory + pricing API via `api_key` |

### Market Context

Tunisia's Ministry of Religious Affairs allocates approximately **4,500 Hajj pilgrims per year**. The average Hajj package costs **TND 14,000 per pilgrim** (Tunisair + accommodation), yielding a total market GMV of **TND 63M** (~USD 20M).

Key payment rails:
- **STB (Société Tunisienne de Banque)** — preferred for pilgrim deposits
- **Attijari Bank Tunisia** — corporate travel agency accounts
- **Monetique Tunisie** — national card scheme (interoperable with Visa/Mastercard)

**Tunisair** operates direct flights TUN–JED and TUN–MED during Hajj season. Ennakl Voyages is a Tunisair-appointed IATA agent with access to group blocks.

### Technical Integration — Ennakl (Tier 1)

```
Tenant Config:
{
  "slug":             "ennakl",
  "name":             "Ennakl Voyages",
  "domain":           "ennakl.utubooking.com",
  "custom_domain":    "hajj.ennakl.tn",
  "currency":         "TND",
  "locale":           "fr-TN",
  "primary_color":    "#E30A17",
  "secondary_color":  "#FFFFFF",
  "enabled_modules":  ["hotel", "flight", "car"],
  "hide_platform_branding": true,
  "commission_rates": { "hotel": 0.60, "flight": 0.60, "car": 0.60 },
  "revenue_share_pct": 40.00
}
```

### Technical Integration — Tunisie Booking (Tier 2)

```
Tenant Config:
{
  "slug":             "tunisiebooking",
  "name":             "Tunisie Booking",
  "domain":           "tunisiebooking.utubooking.com",
  "currency":         "TND",
  "locale":           "fr-TN",
  "primary_color":    "#1B4F72",
  "secondary_color":  "#D4AC0D",
  "enabled_modules":  ["hotel", "flight"],
  "hide_platform_branding": false,
  "commission_rates": { "hotel": 0.60, "flight": 0.60, "car": 0.60 },
  "revenue_share_pct": 35.00
}
```

### Commercial Terms

#### Ennakl Voyages (Tier 1)

| Metric | Value |
|--------|-------|
| Hajj quota (annual) | ~3,000 pilgrims |
| Avg package value | TND 14,000 |
| Projected GMV (Year 1) | TND 42,000,000 |
| UTUBooking take (60%) | TND 25,200,000 (~USD 8.1M) |
| Partner share (40%) | TND 16,800,000 (~USD 5.4M) |
| Integration fee (one-time) | TND 30,000 |
| Annual SLA fee | TND 15,000 |

#### Tunisie Booking (Tier 2)

| Metric | Value |
|--------|-------|
| Hajj quota (annual) | ~1,500 pilgrims |
| Avg package value | TND 14,000 |
| Projected GMV (Year 1) | TND 21,000,000 |
| UTUBooking take (60%) | TND 12,600,000 (~USD 4.1M) |
| Partner share (35%) | TND 7,350,000 (~USD 2.4M) |
| Integration fee (one-time) | TND 10,000 |

**CEO Review Flag**: Combined Tunisia revenue share exceeds SAR 100K threshold. Sign-off required.

### Implementation Timeline — Ennakl (Tier 1)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Tenant provisioning | Week 1 | API key + subdomain live |
| Brand + CNAME | Week 1–2 | hajj.ennakl.tn → UTUBooking CDN |
| Monetique Tunisie integration | Week 2–3 | Card processing live |
| STB installment plan | Week 3–4 | 3-month installment option |
| UAT + content | Week 4–6 | 30+ Makkah hotels, Tunisair routes |
| Go-live | Week 7 | Production launch |

---

## Combined North Africa Projections

| Country | Partner | GMV (Local) | GMV (USD) | UTU Take (60%) |
|---------|---------|------------|-----------|----------------|
| Morocco | Maroc Voyages | MAD 384M | ~USD 38M | ~USD 22.9M |
| Tunisia | Ennakl Voyages | TND 42M | ~USD 13.5M | ~USD 8.1M |
| Tunisia | Tunisie Booking | TND 21M | ~USD 6.8M | ~USD 4.1M |
| **Total** | | | **~USD 58.3M** | **~USD 35.1M** |

---

## Next Steps / Prochaines étapes

1. **CEO sign-off** on revenue share terms (>SAR 100K threshold)
2. **Legal review** — Moroccan commerce law (SA entity) + Tunisian SARL requirements
3. **Payment gateway contracts** — CMI (Morocco), Monetique Tunisie
4. **Airline content agreements** — Royal Air Maroc GSA confirmation, Tunisair group blocks
5. **Technical kick-off** — provision tenant records via `POST /api/admin/tenants`
6. **Hajj Ministry registrations** — Morocco MCMREAM + Tunisia MARD coordination

---

*Prepared by: UTUBooking Sales Team | Reviewed by: AMEC Dev Agent*
*Classification: Commercial-in-Confidence — Do not distribute externally*
