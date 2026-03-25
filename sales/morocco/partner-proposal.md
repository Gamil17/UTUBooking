# UTUBooking × Morocco — Market Entry Partner Proposal

**Document:** `sales/morocco/partner-proposal.md`
**Market:** Kingdom of Morocco (MA)
**Phase:** Phase 4 Q3 — North Africa Expansion
**Currency:** MAD (Moroccan Dirham)
**Languages:** Arabic (MSA) + French (primary urban)
**Prepared by:** AMEC Sales Agent
**Date:** 2026-03-25

---

## 1. Morocco Market Opportunity

| Factor | Detail |
|--------|--------|
| Annual tourists | 14M+ — Marrakech, Casablanca, Agadir, Fez, Tangier |
| Hotel market size | USD 2.8B/year — fastest-growing in North Africa |
| Outbound Umrah travel | 400K+ Moroccan pilgrims annually via RAM + Air Arabia Maroc |
| French-Arabic split | 60% French (urban), 40% Arabic — bilingual UI mandatory |
| Currency | MAD — Moroccan Dirham (2 decimal places, stable peg) |
| VAT | 10% for hospitality services |
| GDP per capita | USD 3,900 — mid-market price sensitivity |
| Internet penetration | 88% — high mobile-first adoption |
| Setup cost | Zero entity overhead — revenue-share partner model |
| Speed to live | 4–6 weeks via local partner (same playbook as Jordan) |

---

## 2. Target Partners (Casablanca-based)

### Primary Target — Maroc Voyages
- **Website:** marocvoyages.com
- **Description:** Morocco's largest OTA — hotels, flights, packages, hajj/umrah tours
- **Strengths:** 500K+ monthly users, Arabic + French UI, Mada/CMI payment rails
- **UTUBooking Value-Add:** Makkah/Madinah hotel inventory (Hotelbeds + direct partners), Amadeus GDS flights, car rentals via CarTrawler

### Secondary Target — Voyages Nasser
- **Website:** voyagesnasser.ma
- **Description:** Established Casablanca travel agency with strong Umrah packages
- **Strengths:** 25+ years in Hajj/Umrah market, licensed by Ministry of Islamic Affairs
- **UTUBooking Value-Add:** Real-time Haram hotel availability, digital booking flow replacing manual process

### Tertiary Target — Marhaba Travel
- **Description:** Mid-size Moroccan OTA with strong social media presence (Instagram/TikTok)
- **Strengths:** 18–35 demographic, French-first content, strong Ramadan campaign history

---

## 3. Partnership Model

```
UTUBooking provides:                    Morocco partner provides:
────────────────────────────────────    ──────────────────────────────────────
✓ Hotel/flight/car search API           ✓ Local brand recognition + trust
✓ White-label booking engine            ✓ CMI / Maroc Telecommerce payment rails
✓ Makkah/Madinah specialist inventory   ✓ MAD currency settlement
✓ French + Arabic UI (fr.json live)     ✓ Local customer support (Darija/French)
✓ AMEC AI Assistant embedded            ✓ Marketing to Moroccan Muslim travelers
✓ Loyalty program (Silver/Gold/Platinum)✓ Regulatory compliance (ANRT, CNIA)
✓ 99.95% uptime SLA                    ✓ B2B sales to Moroccan travel agencies
```

**Revenue split:** 60% UTUBooking / 40% partner
**Billing currency:** USD (settled monthly via Wise Business)
**Minimum commitment:** 50 confirmed bookings/month after 90-day ramp period

---

## 4. Technical Integration

### Currency
- **MAD** — 2 decimal places (e.g. MAD 1,250.00)
- Exchange rate: fetched every 15 min from ExchangeRate-API → Redis cache
- Wallet: `COUNTRY_CURRENCY['MA'] = 'MAD'` — live in `frontend/src/utils/formatting.ts`
- Shard: `MAR` → `sa-east-1` LATAM shard (closest available — migrate to dedicated MAR shard when volume justifies)

### Languages
- **French (fr):** `frontend/locales/fr.json` fully populated — 15-slide UI coverage
- **Arabic (ar):** `frontend/locales/ar.json` — Modern Standard Arabic (MSA); Darija dialect notes in marketing content only
- **Language toggle:** AR | EN | FR — three-way switch active in Phase 4

### Payment Rails
- **CMI (Centre Monétique Interbancaire):** Morocco's primary card network — partner handles CMI integration on their side; UTUBooking receives settled USD
- **Maroc Telecommerce:** e-commerce payment platform — partner-managed
- **Fallback:** Stripe card payments (EUR/USD) for international cards

### Data Residency
- Moroccan user data routes to `MAR` shard in `shard-router.js`
- No GDPR obligation (Morocco is not EU); applies CNDP (Commission Nationale de contrôle de la Protection des Données à caractère Personnel)
- Privacy policy available in French and Arabic

---

## 5. Go-Live Checklist

| # | Item | Owner | Timeline |
|---|------|-------|----------|
| 1 | Sign revenue-share partnership agreement | Sales + Legal | Week 1 |
| 2 | Configure white-label tenant in `POST /api/admin/tenants` | Dev | Week 1 |
| 3 | Set tenant currency = MAD, locale = fr + ar | Dev | Week 1 |
| 4 | Partner integrates UTUBooking white-label widget | Partner dev | Weeks 2–3 |
| 5 | Test booking flow end-to-end in MAD | QA | Week 3 |
| 6 | French SEO content live (20 blog posts via Marketing Agent) | Marketing | Week 3 |
| 7 | Soft launch — 10 beta agency clients in Casablanca | Partner sales | Week 4 |
| 8 | Full launch + Google Ads FR campaign | Marketing | Week 6 |

---

## 6. Financial Projections (Year 1)

| Metric | Conservative | Target | Optimistic |
|--------|-------------|--------|------------|
| Monthly bookings (Mo 6) | 100 | 300 | 600 |
| Average booking value | MAD 3,500 (USD 350) | MAD 4,200 (USD 420) | MAD 5,000 (USD 500) |
| UTUBooking monthly revenue (60%) | USD 21,000 | USD 75,600 | USD 180,000 |
| Year 1 total revenue | USD 126K | USD 453K | USD 1.08M |

**Key driver:** Ramadan + Hajj season (April–June 2027) — expect 3–5× volume spike.
Marketing Agent to prepare Ramadan campaign in French + MSA Arabic.

---

## 7. Next Steps

1. **Sales Agent:** Send cold outreach to Maroc Voyages CEO via LinkedIn + email
2. **Legal Agent:** Prepare bilingual (FR + AR) partnership agreement template
3. **Dev Agent:** Pre-configure `MAR` tenant slot in white-label admin panel
4. **Marketing Agent:** Draft French SEO blog series — `marketing/arabic-seo/fr/` folder

> **Rule:** NO partnership agreement sent to prospect without human review and sign-off.
> **Rule:** NO client data stored outside approved shard regions.
