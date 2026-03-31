# UTUBooking.com — v1.4.0 "Sales Engine"

> Best travel booking platform for Gulf & Muslim World markets
> Hajj · Umrah · Hotels · Flights · Car Rentals, **Powered by AMEC Solutions** .

---

## Overview

UTUBooking.com is a multi-market travel booking platform purpose-built for Muslim travelers. Starting from Saudi Arabia and the Gulf, the platform has expanded across 25+ markets covering the Muslim World, Europe, North America, and South America.

**Current version:** `v1.4.0 "Sales Engine"` — 12 phases complete, 8 AWS regions live, full email automation.

---

## Markets & Regions

| AWS Region | Location | Jurisdiction | Markets |
|---|---|---|---|
| me-south-1 | Bahrain (Gulf) | SAMA-KSA | SA, AE, KW, JO, BH, MA, TN, OM, QA |
| eu-west-2 | London | UK GDPR | GB |
| eu-central-1 | Frankfurt | GDPR-EU | DE, FR, NL, IT, ES, BE, PL, CH, AT, TR |
| us-east-1 | Virginia | CCPA | US |
| ca-central-1 | Montreal | PIPEDA | CA |
| sa-east-1 | São Paulo | LGPD | BR, AR, CO, CL, PE, UY, MX |
| ap-southeast-1 | Singapore | PDPA-SG | ID, MY, SG, TH, PH |
| ap-south-1 | Mumbai | DPDP-IN | IN, PK, BD |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 · React · Tailwind CSS |
| Backend | Node.js microservices · GraphQL · REST |
| Database | PostgreSQL 16 (per-region sharded) · Redis |
| Cloud | AWS (8 regions) · ECS Fargate · ALB · RDS MultiAZ |
| Payments | Stripe · PayPal · Affirm · PIX · MercadoPago · TWINT · iyzico · iPay88 · Razorpay · JazzCash |
| AI | Claude claude-sonnet-4-6 · Amadeus GDS · Booking.com API |
| Compliance | GDPR · CCPA · LGPD · PIPEDA · UK GDPR · KVKK · PDPA · DPDP |

---

## Features

### Core Booking
- Hotel search & booking (Hotelbeds primary; Booking.com for EU/UK)
- Flight search via Amadeus GDS
- Car rental booking
- Halal-friendly hotel filter (`is_halal_friendly` with halal amenity badges)
- Multi-currency checkout (SAR primary; 15+ currencies)

### Hajj & Umrah
- Hajj package builder (Makkah + Madinah focus)
- National quota management (TR, ID, PK, MY, IN)
- Tabung Haji widget (Malaysia)
- Hajj Committee India integration
- Mehram verification flow (PK + IN female pilgrims under 45)
- Umrah packages with halal POI maps

### Airline Adapters (Amadeus GDS)
- Turkish Airlines (TK) — IST ↔ JED/RUH
- Pegasus Airlines (PC) — Turkey domestic connections
- Garuda Indonesia (GA) — CGK ↔ JED
- AirAsia (AK) — ASEAN connections
- Batik Air Malaysia (OD) — KUL ↔ JED
- Air Canada (AC) — YYZ/YUL ↔ JED *(via Emirates DXB connection)*

### Payment Gateways
| Currency | Gateway | Component |
|---|---|---|
| SAR/AED/KWD/JOD | STC Pay · Mada · Stripe | GCC flow |
| USD | Stripe · PayPal · Affirm (BNPL) | USAPaymentSelector |
| EUR/GBP/PLN/SEK… | Stripe Payment Element | EuropePaymentSelector |
| CHF | TWINT primary · Stripe fallback | SwitzerlandPaymentSelector |
| BRL | PIX · Boleto · MercadoPago | BrazilPaymentSelector |
| CAD | Interac e-Transfer · Stripe | CanadaPaymentSelector |
| TRY | iyzico | TurkeyPaymentSelector |
| MYR | iPay88 (FPX/DuitNow/TnG/GrabPay) | MalaysianPaymentSelector |
| INR | Razorpay (UPI/Card/EMI) | IndiaPaymentSelector |
| IDR | Midtrans Snap | IndonesianPaymentSelector |
| PKR | JazzCash · Easypaisa | PakistanPaymentSelector |

### Email Automation (v1.4.0)
- **Abandoned booking recovery** — daily emails for up to 7 days (Day 1: transactional; Day 2–7: marketing with CCPA/GDPR consent gate)
- **Price change alerts** — notifies confirmed-booking customers when offer price changes >2%
- **24-hour check-in reminder** — sent once per booking, 24–25h before check_in
- **Monthly deal digest campaigns** — sales team creates + schedules, filtered by CCPA/GDPR opt-in
- **Post-travel stop** — all flows halt after check_in date passes
- **SendGrid** delivery + event webhook (delivered / bounce / open tracking)
- **Admin dashboard** — Incomplete Bookings, Email Log, Campaign management at `/admin/notifications/`
- **GDPR Art. 17 compliant** — email_log anonymised on erasure, never deleted

### Compliance
- GDPR consent banner + erasure + data export (EU/UK)
- CCPA "Do Not Sell" footer link (US)
- LGPD consent banner (Brazil)
- PIPEDA privacy notice (Canada)
- KVKK banner (Turkey)
- Consent logs (append-only, all regions)
- WhatsApp Business opt-in (Brazil + Gulf)

### Localisation
15 locales: `en ar fr tr id ms ur hi fa de en-GB it nl pl es pt-BR es-419`
RTL support: Arabic, Urdu (Noto Nastaliq), Farsi (Vazirmatn)

---

## Architecture

```
frontend/          Next.js 14 app (App Router)
  src/app/         Pages: /, /us/, /br/, /privacy/, /us/umrah-packages/
  src/components/  UI components (checkout selectors, compliance banners, Hajj widgets)
  locales/         i18n JSON (15 locales)

backend/
  services/auth/         JWT auth + GDPR/CCPA/LGPD/PIPEDA routers (port 3001)
  services/notification/ Email automation — Bull queue, 4 processors, SendGrid (port 3002)
  services/hotel/        Hotel availability + pricing (port 3003)
  services/flight/       Amadeus flight search (port 3004)
  services/car/          Car rental service (port 3005)
  services/booking/      Booking lifecycle + PDF (port 3006)
  services/payment/      Payment microservice — all gateways (port 3007)
  adapters/hotels/       Hotel search router (Hotelbeds + Booking.com)
  adapters/airlines/     Amadeus GDS adapters (TK, AC, GA, AK, OD, PC)
  shared/                Shard router (getShardPool), auth middleware

infra/cloudformation/
  09-route53-global.yml        Global DNS
  16-eu-west-2-london.yml      UK (GDPR)
  17-eu-central-1-frankfurt.yml EU (GDPR)
  18-us-east-1-virginia.yml    US (CCPA)
  19-sa-east-1-sao-paulo.yml   Brazil/LatAm (LGPD)
  20-ca-central-1-montreal.yml Canada (PIPEDA)
  21-ap-southeast-1-singapore.yml APAC (PDPA)
  22-ap-south-1-mumbai.yml     South Asia (DPDP)

compliance/        GDPR DPA register, DPIA, privacy policies
docs/ops/          Master SOP, global AI operations handbook
marketing/         Brand assets, investor materials
sales/series-b/    Series B fundraise package
```

---

## Admin

### Infrastructure Health Check
```
GET /api/admin/infrastructure/health
Authorization: Bearer <ADMIN_API_SECRET>
```
Probes all 8 regional API nodes in parallel. Returns latency, DB status, Redis status, and overall `healthy | degraded | outage`.

### Email Automation Admin (v1.4.0)
```
GET    /api/admin/notifications/incomplete-bookings      Pending bookings + recovery email counts
GET    /api/admin/notifications/email-log                Full email history (type/status/ref filters)
POST   /api/admin/notifications/trigger-recovery         Manual immediate recovery send
POST   /api/admin/notifications/suppress                 Suppress user/booking from emails
POST   /api/admin/notifications/suppress/:id/lift        Lift a suppression
GET    /api/admin/notifications/campaigns                Campaign list with open-rate stats
POST   /api/admin/notifications/campaigns                Create draft campaign
POST   /api/admin/notifications/campaigns/:id/send       Dispatch campaign immediately
DELETE /api/admin/notifications/campaigns/:id            Cancel draft campaign

POST /internal/trigger  { job }          x-internal-secret header  (ops/testing)
POST /api/v1/notifications/webhook/sendgrid              SendGrid event webhook
```
All `/api/admin/notifications/*` endpoints: `Authorization: Bearer <ADMIN_SECRET>`

### AI Chat
```
POST /api/chat   (SSE)
Model: claude-sonnet-4-6
Redis session cache: chat:history:{sessionId}  (50 messages, 24h TTL)
```

---

## Environment Variables

See `.env.example` (not committed). Key groups:

| Group | Variables |
|---|---|
| Amadeus | `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_HOSTNAME` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` |
| Booking.com | `BOOKINGCOM_USERNAME`, `BOOKINGCOM_PASSWORD`, `BOOKINGCOM_ENV` |
| Redis | `REDIS_URL` |
| DB (per region) | `DB_URL_GULF`, `DB_URL_LONDON`, `DB_URL_FRANKFURT`, `DB_URL_US`, `DB_URL_MONTREAL`, `DB_URL_SAO_PAULO`, `DB_URL_SINGAPORE`, `DB_URL_MUMBAI` |
| Admin | `ADMIN_SECRET`, `INTERNAL_API_SECRET` |
| SendGrid | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_WEBHOOK_SECRET` |
| Compliance | `DPO_EMAIL`, `EU_DATA_CONTROLLER`, `EU_REPRESENTATIVE_EMAIL` |

---

## Development

```bash
# Frontend
cd frontend && npm install && npm run dev                      # http://localhost:3000

# Full stack (recommended)
docker-compose up                                              # all services + nginx on :80

# Individual services
cd backend/services/auth         && npm install && npm start   # port 3001
cd backend/services/notification && npm install && npm start   # port 3002
cd backend/services/payment      && npm install && npm start   # port 3007
```

**Before merging:**
```bash
npm run i18n:validate          # check all 15 locales
npm test -- --testPathPattern=payment   # payment gateway tests
```

---

## Versioning

| Version | Name | Date | Scope |
|---|---|---|---|
| v1.0.0 | Gulf Launch | 2026-01 | SA/AE/GCC core platform |
| v1.1.0 | Muslim World | 2026-02 | TR/ID/MY/PK/IN expansion (Phases 5-7) |
| v1.2.0 | Global Ummah | 2026-03 | EU/UK/US/CA/BR + full compliance (Phases 8-12) |
| v1.3.0 | Global Ummah | 2026-03 | AMEC Solutions branding + version alignment |
| v1.4.0 | Sales Engine | 2026-03 | Email automation — abandoned recovery, price alerts, reminders, campaigns |

---

## License

Proprietary — AMEC Solutions. All rights reserved.
UTUBooking.com · [utubooking.com](https://utubooking.com)
