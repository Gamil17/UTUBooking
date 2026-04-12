# UTUBooking.com — v4.8.0 "Full AI Operating System"

> Best travel booking platform for Gulf & Muslim World markets
> Hajj · Umrah · Hotels · Flights · Car Rentals, **Powered by AMEC Solutions** .

---

## Overview

UTUBooking.com is a multi-market travel booking platform purpose-built for Muslim travelers. Starting from Saudi Arabia and the Gulf, the platform has expanded across 25+ markets covering the Muslim World, Europe, North America, and South America.

**Current version:** `v4.7.0 "AI Complete"` — Four new AI advisors complete full platform intelligence coverage for core business data pages: (1) **AI BizDev Advisor**: pipeline health, at-risk partners with urgency triage, expiring agreements with renewal strategy, market expansion priorities by region, quick wins and strategic priorities — collapsible panel in BizDev Overview tab. (2) **AI Booking Insights**: booking anomaly detection (spike/drop/pattern), product revenue breakdown (hotels/flights/cars), conversion insights, cancellation patterns, revenue opportunities with effort rating, seasonal Hajj/Umrah forecast, risk flags — collapsible panel above the Bookings table. (3) **AI Loyalty Programme Advisor**: tier health assessment, churn risk segments with re-engagement tactics, redemption insights, points liability assessment, Gulf-specific reward recommendations (Ramadan/Umrah context), engagement gaps — always-visible panel above Loyalty tabs. (4) **AI Inventory Advisor**: Makkah/Madinah coverage gaps, hotel/flight/car insights by priority (critical/high/medium/low), Hajj/Umrah readiness assessment, pricing flags, route analysis — always-visible panel above Inventory tabs. All 4 use UPSERT snapshot pattern; 4 BFF proxies (45s timeout); full TypeScript type coverage in api.ts. (1) **AI HR Performance Analyzer**: per-department team health analysis — overall_health (excellent/good/fair/poor), top performers with ratings, development needs with PIP flags, manager recommendations, and risk flags — embedded as "✦ Analyse Department" in a new Performance tab on the HR page. (2) **AI Vendor Due Diligence**: full financial and compliance risk assessment per vendor — risk_level (low/medium/high/critical), 0–100 score, approve_recommendation (approve/approve_with_conditions/defer/reject), ZATCA/PCI-DSS compliance gap list, payment history, SLA performance — embedded as "✦ Diligence" per vendor row in Finance. (3) **AI Deal Coach**: Gulf-context sales coaching per deal — momentum (accelerating/steady/stalled/declining), win_probability_pct, relationship_health, next_best_actions with owner/timeline, competitive intel gap, red flags — embedded as collapsible "✦ AI Deal Coach" panel below the existing Deal Intelligence panel. All three use UPSERT; BFF proxies at 45s timeout; full type coverage in api.ts.

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
- Comprehensive Hajj 2026 Planning Guide (dates, 7-stage journey, hotel zones, national quotas, checklist, transport)
- Comprehensive Umrah 2026 Planning Guide (peak seasons, ritual guide, package tiers, top hotels, Madinah ziyarat)

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

### Hotel Partners (v3.1.0)
- **Landing page** at `/hotel-partners` — Wego Hoteliers-style B2B page: hero, benefit cards, 3 listing tiers (Standard/Featured/Premium), 4-step onboarding, partner stats bar
- **Application form** at `/hotel-partners/apply` — two-column page: sticky sidebar (stats, listing options, source markets) + form (property type, OTA toggles, star pills, fire-and-forget confirmation emails)
- **Public BFF** at `POST /api/hotel-partners/apply` — validates, normalises country code, forwards to sales service, sends confirmation emails
- **Sales CRM integration** — applications land in `crm_hotel_partners` table via `POST /api/sales/hotel-partners` with `outreach_status: 'not_contacted'`, `priority: 2`
- **Admin CRM** at `/admin/sales` Hotel Partners tab — full CRUD, activity log, CSV export, status management
- **Homepage cross-promo** — navy panel + stats strip in Hotels tab of TabSections, linking to `/hotel-partners` and `/hotel-partners/apply`

### Corporate Travel Portal (v3.1.0)
- **Landing page** at `/corporate` — feature grid, stats bar, how-it-works steps, industry use-cases, dual CTAs (Apply / Sign In to Portal)
- **Application form** at `/corporate/apply` — 3-step wizard (company info → travel profile → contact); validates work email (rejects free providers); posts to `POST /api/admin/corporate/enquiries`
- **Pro Portal** at `/pro` — JWT-gated corporate-only sign-in; role check ensures `role='corporate'` + `corporate_account_id`
- **Portal pages** (10 screens): Dashboard, Employees, Book Travel, Group Travel, Bookings, Approvals, Reports, Invoices, Settings
- **Portal features**: Travel policy controls (max flight class, hotel stars, per-diem, advance booking days); VAT-compliant invoicing (SA/AE); approval workflows with pending badge; monthly spend reports; password change
- **Auth extension**: `POST /api/auth/change-password` (Bearer-authenticated); `POST /api/admin/auth/corporate-users` creates users with `role='corporate'`
- **DB migration** `20260411000044` — adds `corporate` enum value + `corporate_account_id UUID` column on `users` table
- **Admin Corporate** at `/admin/corporate` — 1,338-line admin panel: enquiry review + approve/reject (creates portal credentials), account management, employee roster, bookings, trip groups

### Affiliates Programme (v3.1.0)
- **Landing page** at `/affiliates` — programme overview, commission tiers (3%/5%/8%), why-partner cards, geo coverage, FAQ, apply CTA
- **Application page** at `/affiliates/apply` — two-column layout: sidebar (stats, allowed/forbidden traffic types, about) + form (platform type, audience size, monthly traffic)
- **Public BFF** at `POST /api/affiliates/apply` — validates, forwards to `POST /api/admin/affiliates/applications`, fires confirmation emails
- **Click tracking** at `GET /api/affiliates/track` — redirect endpoint for affiliate link attribution
- **Admin Affiliates** at `/admin/affiliates` — 665-line panel: applications (review/approve/reject), partner management, payout tracking

### AI Operating System (v4.8.0)

UTUBooking runs a 16-agent AI team. Each agent has a dedicated brain file (CLAUDE.md) it reads at session start, owns specific SOPs, and operates within defined approval gates.

#### Agent Team

| Agent | Brain File | SOPs Owned | Frequency |
|-------|-----------|-----------|-----------|
| **Ops** | `docs/ops/global-ai-operations.md` | GBL-001–010 · OPS-001–029 | Daily/weekly/monthly/quarterly |
| **Dev** | `backend/CLAUDE.md` | DEV-001–004 · EMG-001–006 | Per PR + incidents |
| **Marketing** | `marketing/CLAUDE.md` | MKT-001–004 | Daily/weekly |
| **Sales** | `sales/CLAUDE.md` | SLS-001–002 | Per lead/partner |
| **HR** | `hr/CLAUDE.md` | HR-001–002 | Per hire/leave request |
| **Finance** | `finance/CLAUDE.md` | FIN-001–002 | Weekly/monthly |
| **Compliance** | `compliance/CLAUDE.md` | COM-001–005 | Per DSR + ongoing |
| **Products** | `products/CLAUDE.md` | OPS-009 | Per feature/sprint |
| **Legal** | `legal/CLAUDE.md` | OPS-020–021 | Per matter/regulatory event |
| **Customer Success** | `customer-success/CLAUDE.md` | CS-001–002 | Daily + per ticket |
| **Fraud** | `fraud/CLAUDE.md` | FRD-001–003 | Daily queue + per incident |
| **Revenue** | `revenue/CLAUDE.md` | RVN-001–003 | Per season + monthly |
| **Procurement** | `procurement/CLAUDE.md` | PRC-001–003 | Per supplier + monthly |
| **Analytics** | `analytics/CLAUDE.md` | ANA-001–002 | Weekly + monthly |
| **BizDev** | `bizdev/CLAUDE.md` | BIZ-001–003 · ADV-001–002 · AFF-001–002 | Weekly + daily queue |
| **Corporate** | `corporate/CLAUDE.md` | CORP-001–002 | Daily enquiry queue + monthly |

#### SOP Documentation

| File | Lines | Coverage |
|------|-------|---------|
| `docs/ops/master-sop.md` | 6,117 | 130+ SOPs across 12 sections: Global (GBL), Phases 1–12, Marketing (MKT), Sales (SLS), CS, HR, Finance (FIN), Dev (DEV), Compliance (COM), Fraud (FRD), Revenue (RVN), Procurement (PRC), Analytics (ANA), BizDev (BIZ), Advertising (ADV), Affiliates (AFF), Corporate (CORP), Emergency (EMG) |
| `docs/ops/global-ai-operations.md` | 3,079 | OPS-001–029: full prompt library for daily/weekly/monthly routines + all 8 new departments |

#### AI Rules (enforced across all agents)
- NEVER send emails to clients without human approval
- NEVER commit API keys or secrets — `.env` files only
- All financial/legal output requires human + professional review
- All `confirmed_fraud` decisions on bookings > SAR 5,000 require CEO sign-off
- All pricing rule changes auto-launch approval workflow before activation
- All EU/UK watchlist entries require human approval (GDPR Art. 22)
- Contract review > SAR 100,000: Legal Agent required before signing
- PO approval tiers: < 10K self-approve · 10K–50K CEO 48h · 50K–250K CEO+Finance 72h · 250K+ Board

---

### Business Process Automation (v4.0.0)

- **Workflow Engine** — standalone microservice (port 3014) with step executor, SLA timer (node-cron every 15min), and immutable audit trail
- **19 department trigger points** — every major business event auto-launches the correct approval chain
- **SLA enforcement** — 50% elapsed reminder, breach escalation to fallback role with 4-hour fresh SLA, stale-pending warning at 24h
- **One-click email decisions** — assignees receive branded emails with a single "Review & Decide" button linking directly to the approval screen
- **Outcome notifications** — initiators receive approved/rejected outcome email when instance closes
- **16 seeded definitions** active at startup (6 Phase 1 + 10 Phase 2), all idempotent
- **Admin Workflow Builder** at `/admin/workflows` — 5-tab hub: My Tasks (SLA health bars, priority sort), Definitions (CRUD + approve/archive/version), Instances (list + audit trail), Dashboard (system-wide health for super_admin), Analytics (performance metrics, bottlenecks, monthly trend)
- **Task badge** in admin header — polls every 60s; amber for pending, red for overdue/escalated; hidden at zero

**Department Trigger Map:**

| Department | Trigger Event | Condition |
|---|---|---|
| Finance | `expense_submitted` | always |
| HR | `leave_requested` | always |
| HR | `hire_approved` | always |
| Legal | `contract_drafted` | type in (contract/nda/partnership) |
| Compliance | `dsr_received` | always (30-day GDPR SLA) |
| Procurement | `supplier_onboard_requested` | status = 'onboarding' |
| Ops | `incident_opened` | severity critical or high |
| Dev | `deploy_requested` | environment = 'production' |
| Products | `flag_activation` | enabled=true AND rollout_pct > 0 |
| Revenue | `pricing_rule_proposed` | always |
| Customer Success | `escalation_raised` | priority critical or high |
| Fraud | `case_flagged` | risk_score >= 70 |
| CRM/Sales | `deal_stage_changed` | ceo_review_required = true |
| BizDev | `partner_onboard_requested` | status in (contacted/negotiating/signed/live) |
| Marketing | `blog_post_ready` | status = 'review' |
| Analytics | `kpi_threshold_breached` | active = true |
| Affiliates | `affiliate_applied` | always |
| Advertising | `advertising_enquiry_received` | always |
| Corporate | `corporate_enquiry_received` | always |

### Email Automation (v1.4.0)
- **Abandoned booking recovery** — daily emails for up to 7 days (Day 1: transactional; Day 2–7: marketing with CCPA/GDPR consent gate)
- **Price change alerts** — notifies confirmed-booking customers when offer price changes >2%
- **24-hour check-in reminder** — sent once per booking, 24–25h before check_in
- **Monthly deal digest campaigns** — sales team creates + schedules, filtered by CCPA/GDPR opt-in
- **Post-travel stop** — all flows halt after check_in date passes
- **SendGrid** delivery + event webhook (delivered / bounce / open tracking)
- **Admin dashboard** — Incomplete Bookings, Email Log, Campaign management at `/admin/notifications/`
- **GDPR Art. 17 compliant** — email_log anonymised on erasure, never deleted

### Marketing Engine (v1.9.0)
- **Audience Segmentation** — campaigns target by country, loyalty tier (bronze/silver/gold/platinum), or days-since-last-booking; live recipient estimate in create panel
- **Campaign Duplicate** — clone any campaign as a new draft (`POST /campaigns/:id/duplicate`)
- **Click Tracking** — public `/track/click` redirect endpoint wraps deal CTA URLs; `click_count` per campaign + `clicked_at` per email_log row; CTR % in campaign table
- **Campaign Performance Dashboard** — modal with delivery rate, open rate, CTR, click-to-open rate, audience segment badges, send timeline; accessible from any `sent` campaign row
- **Email Template Library** — reusable HTML templates (`email_templates` table); CRUD API; preview in sandboxed iframe; templates pre-fill campaign subject fields; 2 default templates seeded on bootstrap
- **Consent Visibility Panel** — read-only GDPR consent log tab at `/admin/marketing`; filter by email, country, status (granted/revoked); append-only per GDPR Art. 7
- **Unified Marketing Timeline** — merged content calendar + campaign schedule at `/admin/marketing` Timeline tab; month navigation; items grouped by week; links to campaign and calendar

### Compliance
- GDPR consent banner + erasure + data export (EU/UK)
- CCPA "Do Not Sell" footer link (US)
- LGPD consent banner (Brazil)
- PIPEDA privacy notice (Canada)
- KVKK banner (Turkey)
- Consent logs (append-only, all regions)
- WhatsApp Business opt-in (Brazil + Gulf)

### Localisation
27 locales: `en ar fr tr id ms ur hi fa de en-GB en-US it nl pl es pt-BR es-419 sv ru ja ko th vi zh-CN zh-HK zh-TW`
RTL support: Arabic, Urdu (Noto Nastaliq), Farsi (Vazirmatn)

---

## Architecture

```
frontend/          Next.js 16 app (App Router)
  src/app/         Pages + BFF API routes (/api/admin/*, /api/pro/*, /api/hotel-partners/*, /api/affiliates/*, /api/corporate/*, /api/wallet/*, /api/loyalty/*, …)
  src/components/  UI components (checkout selectors, compliance banners, Hajj widgets)
  locales/         i18n JSON (15 locales)
  src/proxy.ts     Edge middleware: admin auth guard, tenant resolution, locale, maintenance

backend/
  services/auth/         JWT auth + GDPR/CCPA/LGPD/PIPEDA routers (port 3001)
  services/notification/ Email automation — Bull queue, 4 processors, SendGrid (port 3002)
  services/hotel/        Hotel availability + pricing (port 3003)
  services/flight/       Amadeus flight search (port 3004)
  services/car/          Car rental service (port 3005)
  services/booking/      Booking lifecycle + PDF (port 3006)
  services/payment/      Payment microservice — all gateways (port 3007)
  services/loyalty/      Points accounts, rewards catalog, redemption (port 3008)
  services/whitelabel/   White-label tenant management (port 3009)
  services/wallet/       Multi-currency wallet — balance, topup, convert, FX rates (port 3010)
  services/pricing/      AI revenue management — Claude recommendations (port 3011)
  services/admin/        Platform stats, inventory, pending users, audit log, marketing calendar, corporate accounts, affiliates (port 3012)
  services/sales/        Sales CRM — deals, contacts, activities, hotel partners, reps, funnel analytics (port 3013)
  services/workflow/     Business Process Automation — step executor, SLA timer, 16 seeded definitions, audit trail (port 3014)
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
docs/ops/          Master SOP (6,117 lines · 130+ SOPs), global AI operations handbook (3,079 lines · OPS-001–029)
marketing/         Brand assets, investor materials, campaign drafts, SEO content
sales/             Sales CRM brain (CLAUDE.md), series-b/ fundraise package

Agent brain files (CLAUDE.md in each):
  fraud/             Fraud & Risk agent — FRD-001–003, risk thresholds, rule governance, watchlist policy
  revenue/           Revenue Management agent — RVN-001–003, seasonal calendar, pricing rules, targets
  procurement/       Procurement agent — PRC-001–003, supplier types, approval tiers, SLA policy
  analytics/         Analytics & BI agent — ANA-001–002, 8 core KPIs, traffic-light logic, alert thresholds
  bizdev/            BizDev agent — BIZ/ADV/AFF SOPs, partner pipeline, affiliate tiers, advertising enquiries
  corporate/         Corporate Travel agent — CORP-001–002, account tiers, travel policy config, portal activation
  customer-success/  Customer Success agent — CS-001–002, SLAs by channel, refund authority, NPS management
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
Tools: search_hotels, search_flights, search_cars, get_booking, escalate_to_human
```
`escalate_to_human` — creates a contact enquiry ticket when user requests human support,
is frustrated, or has an urgent complaint. Collects name + email, returns a ticket reference.

### Wallet Admin
```
GET  /api/admin/wallet?view=stats          Totals by currency, tx counts
GET  /api/admin/wallet?view=balances       Paginated wallet list, search by user_id
GET  /api/admin/wallet?view=user&userId=X  All wallets for one user + last 20 tx
GET  /api/admin/wallet/transactions        Full tx log, filter by type
POST /api/admin/wallet/credit              Credit a user's wallet (max 100,000)
```
Admin UI: `/admin/wallet` — Overview stats, Balances tab, Transactions tab, Credit Wallet modal.

### Marketing Content Calendar
```
GET    /api/admin/marketing/calendar            List entries (filter: status, language, month)
POST   /api/admin/marketing/calendar            Create entry
PATCH  /api/admin/marketing/calendar/:id        Advance status / link draft file
DELETE /api/admin/marketing/calendar/:id        Remove entry
GET    /api/admin/marketing/drafts              List AI-generated draft files (parses frontmatter)
POST   /api/admin/marketing/drafts              Return full parsed content of one draft file
GET    /api/admin/marketing/consent             GDPR consent log (filter: email, country, status)
GET    /api/admin/marketing/timeline            Unified content + campaigns timeline (filter: month)
```
Admin UI: `/admin/marketing` — 8 tabs: Content Calendar (planned→draft→review→approved→published),
Draft Queue (preview + link), Campaigns (inline management + stats modal), Templates (HTML editor + iframe preview),
Email Log (delivery history), Consent (read-only GDPR log), Suppressions (active/lifted filter + Lift action), Timeline (merged calendar + campaigns by week).

### Email Templates (v1.9.0)
```
GET    /api/admin/notifications/templates       List all templates
POST   /api/admin/notifications/templates       Create template
GET    /api/admin/notifications/templates/:id   Get template
PATCH  /api/admin/notifications/templates/:id   Update template
DELETE /api/admin/notifications/templates/:id   Delete (guard: error if used by sent campaign)
```

### Campaign Enhancements (v1.9.0)
```
POST   /api/admin/notifications/campaigns/:id/duplicate     Clone as draft
GET    /api/admin/notifications/campaigns/audience-estimate Recipient count for a segment (no send)
GET    /api/admin/notifications/campaigns/:id/stats         Extended: click_rate_pct, click_to_open_rate_pct,
                                                            delivery_rate_pct, send_duration_seconds, segment_summary
GET    /track/click?lid=<email_log_id>&url=<encoded>        Public click-redirect (302); updates email_log + campaign click_count
```
`POST /campaigns` body now accepts `targetSegment?: { countries?, loyalty_tiers?, min_days_since_booking?, max_days_since_booking? }`

### Email Suppressions (v2.5.0)
```
GET  /api/admin/notifications/suppressions    List suppressions (filter: active, email, suppressionType, page)
POST /api/admin/notifications/suppress        Suppress user/booking from email type
POST /api/admin/notifications/suppress/:id/lift  Lift a suppression
```
Admin UI: Suppressions tab in `/admin/marketing` — filter by active/lifted, email search, type select; Lift button with optimistic invalidation.

### Contact Enquiries (updated v1.7.0)
Priority triage (`low / normal / high / urgent`) + assignee tracking. Filter by priority in admin.
Inline edit: status, priority, assigned-to all updateable from the expanded row.

### Finance Department (v2.3.0)
- **Vendor Directory** — master vendor list with VAT/tax registration, IBAN, payment terms; type-classified (gateway/supplier/GDS/SaaS/infra); 5 default vendors seeded (Stripe, Hotelbeds, Amadeus, AWS, Anthropic); soft-deactivate if has invoices
- **Invoice Tracking** — full invoice lifecycle (pending→approved→paid); overdue detection; VAT/tax split; payment reference; auto-sets payment_date on status→paid; no delete (set to cancelled)
- **Budget Management** — annual/quarterly/monthly budgets with approval workflow; line items by department + category; `total_sar` auto-recalculated on every line change; "Approve" with approver name
- **Expense Claims** — employee reimbursement linked to hr_employees; category + receipt upload; approve/reject with reviewer name + admin notes; pending-first sort
- **Admin UI** at `/admin/finance` — extended from 4 to 8 tabs; existing revenue/refund/reconciliation tabs unchanged; overdue invoice rows highlighted red; pending claim rows highlighted amber

```
GET  /api/admin/finance?view=vendors          Paginated vendor list (filter: type, status)
POST /api/admin/finance/vendors               Create vendor
PATCH/DELETE /api/admin/finance/vendors/:id   Update / Remove (soft if has invoices)
GET  /api/admin/finance?view=invoices         Paginated invoice list (filter: status, category, vendor)
POST /api/admin/finance/invoices              Create invoice
PATCH /api/admin/finance/invoices/:id         Update (status→paid auto-sets payment_date)
GET  /api/admin/finance?view=budgets          Paginated budget list (filter: year, status)
POST /api/admin/finance/budgets               Create budget (status=draft)
PATCH /api/admin/finance/budgets/:id          Update (status→approved sets approved_by/at)
GET  /api/admin/finance/budgets/:id/lines     List budget line items
POST /api/admin/finance/budgets/:id/lines     Add line item (triggers total_sar recalc)
PATCH/DELETE /api/admin/finance/budget-lines/:id  Update / Delete line item
GET  /api/admin/finance?view=expense-claims   Paginated claims (filter: status, category)
POST /api/admin/finance/expense-claims        Submit expense claim
PATCH /api/admin/finance/expense-claims/:id   Review (approve/reject sets reviewed_by/at)
```

### Legal Department (v2.2.0)
- **Matter Tracking** — disputes, contract reviews, regulatory issues, IP, employment; urgency levels (critical/high/medium/low); soft-close with closed_date; sorted critical-first
- **Compliance Task Calendar** — license renewals, tax filings, audit prep, regulatory reports; overdue/due-soon highlighting; 6 default tasks seeded (TURSAB, GDPR DPA, CCPA, KVKK, MOTAC, ICO)
- **Document Registry** — contracts, NDAs, licenses, certificates, filings; expiry tracking (amber ≤60d, red expired); file_url link; linked to matters
- **Legal Dashboard** — 6 KPI cards + jurisdiction breakdown table; critical matter and overdue task alert banners
- **Admin UI** at `/admin/legal` — 4 tabs: Dashboard, Matters, Compliance Tasks, Documents

```
GET  /api/admin/legal/stats                   KPIs: open matters, critical, overdue tasks, expiring docs
GET  /api/admin/legal/matters                 Paginated (filter: status, type, urgency, jurisdiction)
POST /api/admin/legal/matters                 Create matter
PATCH /api/admin/legal/matters/:id            Update (auto sets closed_date when status=closed)
DELETE /api/admin/legal/matters/:id           Soft close
GET/POST /api/admin/legal/tasks               List / Create compliance task
PATCH/DELETE /api/admin/legal/tasks/:id       Update / Delete task
GET/POST /api/admin/legal/documents           List (sorted expiry ASC) / Create document
PATCH/DELETE /api/admin/legal/documents/:id   Update / Delete document
```

### Compliance Department (v2.1.0)
- **Erasure Request Workflow** — cross-shard fan-out across all 8 regional shards; DPO can mark pending → in_progress → completed/rejected; inline DPO notes; SLA highlighting (amber >25d, red >30d pending)
- **Data Export Visibility** — read-only view of GDPR Art. 15 / LGPD / PIPEDA data exports; download link with expiry check
- **Compliance Dashboard** — 5 KPI cards (pending/in-progress/overdue/completed-30d/pending-exports); red SLA alert banner; by-regulation breakdown table (GDPR, CCPA, LGPD, PIPEDA, KVKK)
- **Admin UI** at `/admin/compliance` — 3 tabs: Dashboard, Erasure Requests, Data Exports

```
GET  /api/admin/compliance/stats              Aggregate pending/overdue counts + by_law breakdown
GET  /api/admin/compliance/erasures           Cross-shard list (filter: status, law, page)
PATCH /api/admin/compliance/erasures/:id      DPO status update + notes (requires _shard in body)
GET  /api/admin/compliance/exports            Cross-shard data export list (filter: law, page)
```

### HR Department (v2.0.1)
- **Employee Directory** — staff records (role, department, manager, location, hire date, employment type, salary); search + filter; soft-delete terminates rather than erases; bulk CSV import (preview → confirm → partial-success errors)
- **Leave Management** — annual / sick / emergency / maternity / paternity / unpaid requests; inline approve/reject workflow; month filter; approval auto-decrements `hr_leave_balances.used_days`
- **Leave Balances** — per-employee annual/sick/maternity/paternity allocation; "Seed Year Defaults" seeds Gulf-standard days (annual 21, sick 30, maternity 60, paternity 3) for all active employees; adjusted_days override per employee; "Bal." column in leave requests table
- **Org Chart** — recursive CTE builds employee hierarchy from `manager_id` FK; collapse/expand subtrees; click node to open full employee panel; department colour coding
- **Departments** — 5 default departments seeded; rename/delete with guard
- **Headcount Dashboard** — 6 KPI cards + department breakdown bar chart + leave balances overview table (annual remaining; amber if <5d)
- **Admin UI** at `/admin/hr` — 5 tabs: Dashboard, Employees, Leave Requests, Departments, Org Chart

```
GET  /api/admin/hr/stats                          Headcount KPIs + by-dept breakdown
GET  /api/admin/hr/employees                      Paginated (filter: dept, status, search)
POST /api/admin/hr/employees                      Create employee
PATCH /api/admin/hr/employees/:id                 Update employee
DELETE /api/admin/hr/employees/:id                Soft-terminate (status='terminated')
POST /api/admin/hr/employees/import               Bulk import (JSON array); partial success; SAVEPOINT per row
GET/POST /api/admin/hr/departments                List (with count) / Create
PATCH/DELETE /api/admin/hr/departments/:id        Rename / Delete (guard: no active staff)
GET  /api/admin/hr/leave                          Paginated (filter: status, employee, month)
POST /api/admin/hr/leave                          Create leave request
PATCH /api/admin/hr/leave/:id                     Approve / reject / cancel (auto-decrements balance)
GET  /api/admin/hr?view=leave-balances            Per-employee balances (filter: employee_id, year)
GET  /api/admin/hr?view=leave-balances-overview   All active employees — remaining days by type
POST /api/admin/hr/leave-balances                 Seed year defaults (Gulf-standard days, ON CONFLICT DO NOTHING)
PATCH /api/admin/hr/leave-balances/:id            Adjust days (adjusted_days field)
GET  /api/admin/hr?view=org-chart                 Recursive employee hierarchy (flat array, depth-sorted)
```

### Ops & Support Department (v2.6.0)
- **Incident Management** — severity levels (critical/high/medium/low); SLA tracking (critical >1h open = breaching); auto-sets resolved_at; assigned_to; description field
- **Support Ticket Queue** — customer tickets with priority (urgent/high/normal/low); source channel; resolution notes; inline status updates
- **Platform Health** — quick-nav links to infrastructure monitor + per-service port reference card
- **Dashboard** — 9 KPI cards: total/open incidents, SLA breaching count, open critical, open tickets, by-severity and by-priority breakdowns
- **Admin UI** at `/admin/ops` — 4 tabs: Overview, Incidents, Support Tickets, Platform Health

```
GET  /api/admin/ops?view=stats               Incident + ticket KPIs; sla_breaching count
GET  /api/admin/ops?view=incidents           Paginated (filter: status, severity)
POST /api/admin/ops/incidents                Create incident
PATCH /api/admin/ops/incidents/:id           Update (auto-sets resolved_at when status=resolved)
DELETE /api/admin/ops/incidents/:id          Delete incident
GET  /api/admin/ops?view=tickets             Paginated (filter: status, priority, search)
POST /api/admin/ops/tickets                  Create ticket
PATCH /api/admin/ops/tickets/:id             Update ticket
DELETE /api/admin/ops/tickets/:id            Delete ticket
```

### Dev & Sprints Department (v2.7.0)
- **Sprint Planning** — sprint name, dates, goal, status (planning/active/completed/cancelled); one active sprint at a time; velocity = sum of done story points
- **Kanban Task Board** — 5-column board (backlog → todo → in_progress → review → done); inline ←→ move buttons; sprint assignment; story points; PR URL link; priority colour coding
- **Deployment Log** — environment (production/staging/qa/dev); version tag; status (success/failed/rolled_back/in_progress); deploy type; notes; deployer name
- **Dev Dashboard** — active sprint progress bar (% done tasks + story points velocity); recent deployments; task type breakdown
- **Admin UI** at `/admin/dev` — 4 tabs: Overview, Sprint Board, Tasks, Deployments

```
GET  /api/admin/dev?view=stats               Active sprint progress + velocity + recent deployments
GET  /api/admin/dev?view=sprints             All sprints (filter: status)
POST /api/admin/dev/sprints                  Create sprint
PATCH /api/admin/dev/sprints/:id             Update sprint
DELETE /api/admin/dev/sprints/:id            Delete (guard: 409 if active tasks assigned)
GET  /api/admin/dev?view=tasks               All tasks JOINed with sprint name (filter: status, priority, type)
POST /api/admin/dev/tasks                    Create task
PATCH /api/admin/dev/tasks/:id               Update task (status/sprint/points/PR URL)
DELETE /api/admin/dev/tasks/:id              Delete task
GET  /api/admin/dev?view=deployments         Deployment log (filter: env, status)
POST /api/admin/dev/deployments              Log deployment
PATCH /api/admin/dev/deployments/:id         Update deployment
DELETE /api/admin/dev/deployments/:id        Delete deployment
```

### Product Hub Department (v2.8.0)
- **Product Roadmap** — items by quarter + status (planned/in_progress/completed/cancelled); priority; description; owner
- **Feature Flags** — key-based flags (auto-normalised to snake_case); rollout_pct 0–100%; environment targets (production/staging/qa/dev); enabled/disabled toggle; 409 on duplicate key
- **Release Changelog** — version + title + body (markdown); type (feature/fix/improvement/breaking/security); published_at; expandable card list
- **Products Dashboard** — KPI cards: total flags, enabled flags, avg rollout %, planned roadmap items, in-progress items, changelog entries
- **Admin UI** at `/admin/products` — 4 tabs: Overview, Roadmap, Feature Flags, Changelog

```
GET  /api/admin/products?view=stats          Flag + roadmap + changelog KPIs
GET  /api/admin/products?view=roadmap        Paginated roadmap (filter: status, priority)
POST /api/admin/products/roadmap             Create roadmap item
PATCH /api/admin/products/roadmap/:id        Update item
DELETE /api/admin/products/roadmap/:id       Delete item
GET  /api/admin/products?view=flags          All feature flags (filter: enabled, environment)
POST /api/admin/products/flags               Create flag (key auto-lowercased + normalised; 409 on duplicate)
PATCH /api/admin/products/flags/:id          Update flag (rollout_pct, environments, enabled)
DELETE /api/admin/products/flags/:id         Delete flag
GET  /api/admin/products?view=changelog      Changelog entries (COALESCE published_at/created_at DESC)
POST /api/admin/products/changelog           Create entry
PATCH /api/admin/products/changelog/:id      Update entry
DELETE /api/admin/products/changelog/:id     Delete entry
```

### Corporate Travel Admin (v3.1.0)
Served by the **admin-service** on port 3012.
`Authorization: Bearer <ADMIN_SECRET>`

```
GET    /api/admin/corporate/enquiries              List applications (filter: status, search, page)
POST   /api/admin/corporate/enquiries              Create enquiry (from /api/corporate/enquiry BFF)
GET    /api/admin/corporate/enquiries/:id          Single enquiry
PATCH  /api/admin/corporate/enquiries/:id          Update status/notes
POST   /api/admin/corporate/enquiries/:id/approve  Approve: creates corporate_account + calls auth service to create portal user
POST   /api/admin/corporate/enquiries/:id/reject   Reject with reason
GET    /api/admin/corporate/accounts               List accounts (filter: status, tier, search)
POST   /api/admin/corporate/accounts               Create account manually
GET    /api/admin/corporate/accounts/:id           Single account + stats
PATCH  /api/admin/corporate/accounts/:id           Update (tier, policy controls, billing, VAT)
POST   /api/admin/corporate/accounts/:id/activate  Activate + send portal credentials
GET/POST /api/admin/corporate/accounts/:id/contacts      Contact people
PATCH/DELETE /api/admin/corporate/accounts/:id/contacts/:cid
GET    /api/admin/corporate/bookings               Cross-account booking list
PATCH  /api/admin/corporate/bookings/:id           Update booking status
GET    /api/admin/corporate/employees              Cross-account employee search
GET    /api/admin/corporate/trip-groups            Cross-account group trips
```
Admin UI: `/admin/corporate` — Enquiries, Accounts, Bookings, Employees, Trip Groups tabs.

### Affiliates Admin (v3.1.0)
Served by the **admin-service** on port 3012.
`Authorization: Bearer <ADMIN_SECRET>`

```
GET    /api/admin/affiliates/applications          List applications (filter: status, search, platform)
GET    /api/admin/affiliates/applications/:id      Single application
PATCH  /api/admin/affiliates/applications/:id      Update status (pending→approved→rejected)
GET    /api/admin/affiliates/partners              Active partner list (filter: tier, search)
GET    /api/admin/affiliates/partners/:id          Partner + performance stats
PATCH  /api/admin/affiliates/partners/:id          Update (tier, commission_pct, status, notes)
DELETE /api/admin/affiliates/partners/:id          Remove partner
GET    /api/admin/affiliates/payouts               Payout list (filter: status, partner, month)
POST   /api/admin/affiliates/payouts               Create payout record
PATCH  /api/admin/affiliates/payouts/:id           Update (mark paid, add reference)
```
Admin UI: `/admin/affiliates` — Applications, Partners, Payouts tabs.

### Auth Service Extensions (v3.1.0)
```
POST /api/auth/change-password    Bearer-authenticated; verifies current_password before updating
POST /api/admin/auth/corporate-users   Admin-only; creates user with role='corporate' + corporate_account_id
```

### Pro Portal BFF (v3.1.0)
All `/api/pro/*` routes require `Authorization: Bearer <portal_jwt>` (HMAC-SHA256 verified by `portal-bff-auth.ts`; role must be `corporate`).
```
GET    /api/pro/stats              Dashboard KPIs (bookings, spend, pending approvals)
GET    /api/pro/employees          Employee directory (search, status, department)
POST   /api/pro/employees          Add employee
PATCH  /api/pro/employees/:id      Update employee
DELETE /api/pro/employees/:id      Deactivate
GET    /api/pro/bookings           Booking list (filter: status, employee, dates)
PATCH  /api/pro/bookings/:id       Update booking
GET    /api/pro/approvals          Pending approvals list
PATCH  /api/pro/approvals/:id      Approve or reject
GET    /api/pro/groups             Group trip list
POST   /api/pro/groups             Create group trip
PATCH  /api/pro/groups/:id         Update
DELETE /api/pro/groups/:id         Delete
GET    /api/pro/invoices            Monthly invoice index
GET    /api/pro/invoices/:yearMonth Full invoice with line items, VAT, totals
GET    /api/pro/account            Account settings (travel policy, VAT, billing)
PATCH  /api/pro/account            Update settings
POST   /api/pro/account/password   Change password (forwards to auth service)
```

### Workflow Engine (v4.0.0)

Served by the dedicated **workflow-service** on port 3014, proxied through admin-service at `/api/admin/workflow/*`.
`Authorization: Bearer <ADMIN_SECRET>`

**Definitions**
```
GET    /api/admin/workflow/definitions                    List (filter: department, status, trigger_event)
POST   /api/admin/workflow/definitions                    Create draft
PATCH  /api/admin/workflow/definitions/:id                Update draft
POST   /api/admin/workflow/definitions/:id/approve        Super admin: activate
POST   /api/admin/workflow/definitions/:id/archive        Super admin: archive
POST   /api/admin/workflow/definitions/:id/new-version    Fork active → new draft
GET    /api/admin/workflow/definitions/:id/versions       Version history
```

**Instances**
```
GET    /api/admin/workflow/instances                      List (filter: status, department, trigger_event)
GET    /api/admin/workflow/instances/:id                  Instance + step logs
GET    /api/admin/workflow/instances/:id/events           Full immutable audit trail
POST   /api/admin/workflow/instances/launch               Launch by trigger_event + context
POST   /api/admin/workflow/instances/:id/cancel           Cancel (initiator or super_admin)
```

**Approvals**
```
POST   /api/admin/workflow/approvals/decide               Record approve / reject / escalate decision
GET    /api/admin/workflow/approvals/pending              My pending approvals
GET    /api/admin/workflow/approvals/history              My decision history
```

**Tasks**
```
GET    /api/admin/workflow/tasks/inbox                    My full task inbox (SLA health, priority sort)
GET    /api/admin/workflow/tasks/stats                    pending / overdue / escalated / completed_week counts
GET    /api/admin/workflow/tasks/dashboard                Super admin: system-wide health
GET    /api/admin/workflow/tasks/overdue                  Super admin: all overdue steps
```

**Analytics**
```
GET    /api/admin/workflow/analytics/overview             KPIs: instances, approval rate, avg/median/p90 completion, SLA breach rate
GET    /api/admin/workflow/analytics/by-definition        Per-workflow: runs, approval rate, avg hours, bottleneck step
GET    /api/admin/workflow/analytics/by-department        Department rollup: active, overdue, approval rate, avg hours
GET    /api/admin/workflow/analytics/bottlenecks          Top 10 slowest steps: avg/max/p90 wait, escalation count
GET    /api/admin/workflow/analytics/trend                Monthly completion counts for trailing 12 months
```

**AI Recommendation Endpoint**
```
GET    /api/admin/workflow/tasks/:stepLogId/recommend     Claude claude-sonnet-4-6 analyses context + policy rules
                                                          Returns: recommended_decision, confidence, context_summary,
                                                                   rationale, risk_factors[], policy_notes[]
                                                          Only available for in_progress / overdue / escalated steps
```

**AI Daily Executive Briefing**
```
GET    /api/admin/briefings                   List past briefings (paginated, newest first)
GET    /api/admin/briefings/:id               Full briefing by ID
GET    /api/admin/briefings/date/:date        Briefing for a specific date (YYYY-MM-DD)
POST   /api/admin/briefings/generate          Manual trigger — generates today's briefing

Autonomous daily briefing system:
- Cron: 08:00 Asia/Riyadh every day (node-cron in admin-service)
- Catch-up: generates missed briefing on service restart if after 08:00
- Data gathering: 14 parallel calls across Workflow, Finance, HR, Sales, CS, Procurement
- Generation: Claude claude-sonnet-4-6 synthesises all data into structured Markdown
- Storage: ai_daily_briefings table (id, briefing_date UNIQUE, content_md, tool_calls, generated_at)

Briefing sections: Executive Summary, Key Actions Required, Workflow Operations,
                   Finance, Human Resources, Sales Pipeline, Customer Success, Procurement

Frontend: /admin/briefings — date-indexed list, slide-in panel with Markdown renderer
          Calendar date badges, "Today" pill, tool count metadata, "Generate Now" button
```

**AI Career Application Screener**
```
GET    /api/admin/screening/:applicationId   Fetch existing screening result (404 if none)
POST   /api/admin/screening/:applicationId   Run AI screening — reads career_applications,
                                             generates assessment, upserts to ai_screening_results
GET    /api/admin/screening                  List all screenings (newest first, paginated)

Claude output:
  overall_score       0-100 integer
  recommendation      strong_yes | yes | maybe | no
  summary             2-3 sentence overview
  strengths           string[] (3-5 items)
  concerns            string[] (2-4 honest but constructive concerns)
  interview_questions string[] (5 tailored to this candidate)
  culture_fit_notes   string

Storage: ai_screening_results (application_id UNIQUE — re-screening upserts)
Frontend: /admin/careers/applications/:id — "AI Screening Assessment" panel embedded in
          the application detail page. Auto-loads existing screening on mount.
          Score badge (0-100 colour-coded), recommendation pill, strengths/concerns grid,
          culture fit notes, 5 tailored interview questions, "Re-screen" button.
Disclaimer: "AI-generated assessment — use as one input. Not a substitute for human judgment."
```

**AI Deal Intelligence**
```
GET    /api/admin/deal-intelligence/:dealId   Fetch existing analysis (404 if none)
POST   /api/admin/deal-intelligence/:dealId   Run AI analysis — reads crm_deals + contacts +
                                             activities, generates intelligence, upserts result
GET    /api/admin/deal-intelligence           List all analyses (newest first, paginated)

Claude output:
  health_score          0-100 integer (overall deal health)
  win_probability       0-100 integer (likelihood of closing)
  risk_level            low | medium | high | critical
  summary               2-3 sentence strategic overview
  strengths             string[] (2-4 deal strengths)
  key_risks             string[] (3-5 specific risks)
  stall_factors         string[] (what may be blocking progress)
  recommended_actions   string[] (3-5 prioritised next steps)
  competitive_notes     string
  time_sensitivity      string (urgency and deadline assessment)

Storage: ai_deal_analyses (deal_id UNIQUE — re-analysis upserts)
Frontend: /admin/sales — "AI Deal Intelligence" collapsible panel injected into every expanded
          deal row. Health score badge, win probability %, risk level pill, strengths/risks grid,
          stall factors chips, numbered recommended actions, competitive notes, time sensitivity.
          Auto-loads existing analysis on expand. "Analyse with AI" / "Re-analyse" button.
```

**AI Fraud Risk Scorer**
```
GET    /api/admin/fraud-scorer/:caseId   Fetch existing AI score (404 if none)
POST   /api/admin/fraud-scorer/:caseId   Run AI scoring — reads fraud_cases + prior decisions
                                        on same email + watchlist hits, generates assessment,
                                        upserts to ai_fraud_scores
GET    /api/admin/fraud-scorer           List all scores (newest first, paginated)

Claude output:
  threat_level          critical | high | medium | low
  verdict               block | escalate | review | clear
  confidence            0-100 integer
  evidence_summary      concise narrative of why this is/isn't fraudulent
  key_indicators        string[] (specific signals driving the assessment)
  mitigating_factors    string[] (signals suggesting legitimate activity)
  recommended_action    string (specific step for the analyst to take now)
  watchlist_suggestion  { should_add, type, reason }
  pattern_note          string | null (known UTUBooking fraud pattern match)

Context sent to Claude:
  - Full case details (booking ref, email, amount, IP, country, risk score, flags, time-of-day)
  - Last 5 prior decisions on the same email
  - Watchlist hits on email and IP
  - Riyadh time-of-day context (late-night fraud risk window flagged)

Storage: ai_fraud_scores (case_id UNIQUE — re-scoring upserts)
Frontend: /admin/fraud → Review Queue — "AI Fraud Assessment" collapsible panel at the bottom
          of the CasePanel drawer. Verdict badge (BLOCK/ESCALATE/REVIEW/CLEAR), threat level pill,
          confidence %, evidence narrative, key indicators (red) vs mitigating factors (green),
          recommended action card, watchlist suggestion banner, pattern match note.
          Auto-loads existing score on panel open. "Re-score" button to refresh.
```

**AI Contract & Legal Document Reviewer**
```
GET    /api/admin/contract-review/:docId   Fetch existing AI review (404 if none)
POST   /api/admin/contract-review/:docId   Run AI review — reads legal_documents + linked
                                           legal_matters title, computes expiry context,
                                           generates risk assessment, upserts to ai_contract_reviews
GET    /api/admin/contract-review          List all reviews (newest first, paginated)

Claude output:
  risk_level         low | medium | high | critical
  overall_summary    2-3 sentence risk posture assessment
  risk_flags         string[] (specific legal risks identified)
  missing_clauses    string[] (standard protections absent for this doc type)
  compliance_notes   string[] (jurisdiction-specific regulatory considerations)
  expiry_alert       string | null (flags if expired or within 90-day review window)
  recommendations    string[] (what the legal team should do next)

Doc-type coverage: contract, nda, license, certificate, filing, opinion
Jurisdiction coverage: SA (PDPL, SAMA, GACA, Hajj permits), EU/GB (GDPR Art.28/46, SCCs),
                       US (CCPA, DE/NY law), TR (KVKK)
Expiry tiers: EXPIRED / within 30 days (IMMINENT) / within 90-day review window

Storage: ai_contract_reviews (doc_id UNIQUE — re-review upserts)
Frontend: /admin/legal → Documents tab → Edit Document SlidePanel — "AI Contract Review"
          collapsible panel (✦ header). Risk level badge (low/medium/high/critical), overall
          summary, amber expiry alert banner, risk flags (red bullets) vs missing clauses
          (amber bullets) in two-column grid, compliance notes (blue bullets), numbered
          recommendations with Copy button. Auto-loads existing review on panel open.
          "Run AI Review" button for first-time review; "Re-analyse" to refresh.
```

**AI Expense Claim Analyzer**
```
GET    /api/admin/expense-analyzer/:claimId   Fetch existing analysis (404 if none)
POST   /api/admin/expense-analyzer/:claimId   Run AI audit — reads finance_expense_claims +
                                             employee claim history, generates policy compliance
                                             check, upserts to ai_expense_analyses
GET    /api/admin/expense-analyzer            List all analyses (newest first, paginated)

Claude output:
  recommendation    approve | reject | query
  confidence        0-100 integer
  policy_flags      string[] (specific policy violations — empty if clean)
  anomaly_flags     string[] (statistical or contextual anomalies)
  summary           1-2 sentence assessment for the finance reviewer
  justification     detailed explanation of the recommendation
  suggested_notes   ready-to-use admin notes text (with copy button)

Context sent to Claude:
  - Claim details (employee, category, amount in SAR equivalent, date, description, receipt status)
  - Last 10 expense claims from same employee (anomaly detection context)
  - Age of claim (days since claim date)

Storage: ai_expense_analyses (claim_id UNIQUE — re-analysis upserts)
Frontend: /admin/finance → Expense Claims tab — "AI Expense Audit" collapsible panel injected
          at bottom of the claim SlidePanel (existing claims only). Recommendation badge with
          confidence %, policy concerns list (red), anomalies list (amber), justification card,
          suggested admin notes with copy button. Auto-loads existing audit on panel open.
```

**AI Support Ticket Triage**
```
GET    /api/admin/support-triage/:ticketId   Fetch existing triage result (404 if none)
POST   /api/admin/support-triage/:ticketId   Run AI triage — reads ops_support_tickets,
                                            generates assessment, upserts to ai_support_triage
GET    /api/admin/support-triage             List all triage results (newest first, paginated)

Claude output:
  sentiment           positive | neutral | frustrated | angry
  urgency_override    urgent | high | medium | low (AI recommended priority)
  category_suggestion booking | payment | technical | account | refund | other
  summary             1-2 sentence summary of the customer's actual issue
  root_cause          likely root cause
  draft_response      complete ready-to-send customer email (greeting → body → sign-off)
  escalation_flag     boolean — should this be escalated?
  escalation_reason   string | null
  resolution_steps    string[] (internal agent steps)
  pattern_note        string | null (known recurring issue pattern)

Storage: ai_support_triage (ticket_id UNIQUE — re-triage upserts)
Frontend: /admin/ops — "AI Triage" collapsible panel at bottom of TicketPanel drawer (existing
          tickets only). Escalation banner if flagged, sentiment badge, AI priority badge,
          root cause card, internal resolution steps, pattern detection, draft response with
          one-click copy button. Auto-loads existing triage on panel open.
```

**AI Document Generator**
```
GET    /api/admin/documents               List generated documents (paginated, filter by ?type=)
GET    /api/admin/documents/:id           Full document by ID
POST   /api/admin/documents/generate      Generate document: { type, fields }

8 document types:
  offer_letter                  — HR employment offer (salary, probation, benefits)
  expense_rejection             — Finance rejection notice with reason and next steps
  deal_proposal_email           — Sales B2B partnership outreach email
  supplier_contract_summary     — Procurement internal contract summary memo
  welcome_email                 — HR onboarding welcome email
  performance_improvement_plan  — HR formal PIP with goals, support, review date
  nda_draft                     — Legal NDA (marked DRAFT — FOR LEGAL REVIEW)
  po_justification              — Procurement PO approval justification memo

Storage: ai_generated_documents (id, type, title, content_md, context_json, created_by, created_at)
Frontend: /admin/documents — 8-card type selector, dynamic context form (type-specific fields),
          generated document preview with copy/download buttons, history tab
Disclaimer banner on all generated docs — review before use, legal docs require professional review
```

**Admin AI Executive Assistant**
```
POST   /api/admin/ai-assistant                            (BFF → admin-service :3012)
POST   /api/admin/ai-assistant/chat                       (admin-service internal)

Natural-language chat endpoint for admin users. Claude claude-sonnet-4-6 answers
operational questions by calling live-data tools and synthesising plain-English answers.

Tools available (17 total):
  Workflow (9):
  get_workflow_stats         → personal task stats (pending / overdue / escalated)
  get_workflow_overview      → system-wide KPIs (approval rate, avg time, SLA breach %)
  get_workflow_by_department → per-department breakdown
  get_workflow_bottlenecks   → top-5 slowest steps with p90 wait times
  get_workflow_definitions   → per-workflow performance (runs, approval rate, bottleneck step)
  get_overdue_workflows      → all overdue steps with assignee + hours overdue
  get_workflow_dashboard     → SLA health breakdown (on_track / due_soon / overdue)
  get_active_instances       → currently running instances
  get_workflow_trend         → monthly completion trend (trailing 12 months)

  Finance (2):
  get_finance_summary        → pending/overdue invoices (SAR), pending expense claims, budget status
  get_pending_expense_claims → list pending claims with employee, category, amount, hours waiting

  HR (2):
  get_hr_summary             → headcount, on_leave, new hires 30d, pending leave requests
  get_pending_leave_requests → list pending requests with employee, role, dates, hours waiting

  Sales/CRM (2):
  get_sales_pipeline         → deal count + total SAR by stage, won/lost this month
  get_deals_needing_attention→ stale deals (14d+ no update), overdue next actions, CEO review

  Customer Success (1):
  get_cs_summary             → account health distribution, avg health score, at-risk accounts,
                               high-churn-risk accounts, open escalations, top at-risk by LTV

  Procurement (1):
  get_procurement_summary    → contracts expiring 30/90d, SLA breaches, outstanding PO values

Frontend: floating "AI Assistant" button fixed bottom-right on every admin page.
          Slide-up 420×600 chat panel with suggestion prompts, tool-call badges,
          10-message history window, Shift+Enter multi-line support.
Auth: utu_admin_token cookie or x-admin-secret header
Timeout: 45s (multiple tool calls take ~30s)
```

**Notification Endpoint (workflow → notification service)**
```
POST   /api/notifications/send                            Workflow engine sends emails via notification service
                                                          Auth: x-admin-secret header (service-to-service)
                                                          Types: workflow_step_assigned, workflow_step_escalated,
                                                                 workflow_sla_reminder, workflow_sla_breached,
                                                                 workflow_instance_closed
```

**Seeded Workflow Definitions (16 active at startup):**

| Workflow | Trigger | SLA Chain |
|---|---|---|
| Expense Claim Approval | `expense_submitted` | Manager 24h → Finance 48h → Pay (auto <SAR 500/<5k) |
| Leave Request Approval | `leave_requested` | Manager 24h → HR 48h → Payroll notify |
| Contract Review | `contract_drafted` | Legal 72h → Dept Head 48h → CFO 48h (auto <SAR 50k) → Send |
| DSR Fulfilment | `dsr_received` | Identity 8h → Data compile 48h → DPO 72h → Send |
| New Hire Onboarding | `hire_approved` | HR 24h → IT 24h → Payroll 24h → Equipment 24h → Welcome |
| Supplier Onboarding | `supplier_onboard_requested` | Due diligence 72h → Legal 72h → Finance 48h → Activate |
| Critical Incident Response | `incident_opened` | On-call 1h → Engineering 2h → Comms 4h → Post-mortem 24h |
| Production Deployment Approval | `deploy_requested` | Senior Dev 4h → Security 8h → Release 2h |
| Feature Flag Activation | `flag_activation` | PM 8h → Engineering 8h → Release 2h |
| Pricing Rule Approval | `pricing_rule_proposed` | Revenue Manager 24h → CFO 48h → Activate 4h |
| Customer Escalation Resolution | `escalation_raised` | CS Manager 4h → Head of CS 8h → CEO 4h |
| High-Risk Fraud Case Review | `case_flagged` | Fraud Analyst 2h → Security 4h → Legal 1h |
| Deal CEO Approval | `deal_stage_changed` | VP Sales 24h → CFO 48h → CEO 4h |
| Strategic Partner Onboarding | `partner_onboard_requested` | BizDev 72h → Legal 72h → Finance 48h → Marketing 48h → Activate 8h |
| Content Review & Publish | `blog_post_ready` | Editor 24h → SEO 24h → Publish 4h |
| KPI Breach Investigation | `kpi_threshold_breached` | BI Lead 8h → Department Head 24h → CEO brief 8h |

Admin UI: `/admin/workflows` — 4 tabs: My Tasks, Definitions, Instances, Dashboard.

### Sales CRM (v1.8.0)
All CRM endpoints are served by the dedicated **sales-service** on port 3013.
`Authorization: Bearer <ADMIN_SECRET>`

**Deals**
```
GET    /api/sales/deals                       list (filter: stage, type, search, deal_owner, page)
POST   /api/sales/deals                       create deal
GET    /api/sales/deals/:id                   single deal + contacts + activities
PATCH  /api/sales/deals/:id                   update (logs field changes + stage history)
DELETE /api/sales/deals/:id                   delete
GET    /api/sales/deals/export.csv            CSV export
GET    /api/sales/deals/:id/changes           field-level audit trail
GET    /api/sales/deals/:id/activities        activity log
POST   /api/sales/deals/:id/activities        log activity
GET    /api/sales/deals/:id/contacts          list contacts
POST   /api/sales/deals/:id/contacts          add contact
```

**Hotel Partners**
```
GET    /api/sales/hotel-partners              list (filter: status, search, page)
POST   /api/sales/hotel-partners              create (30 Makkah/Madinah P1 hotels seeded)
PATCH  /api/sales/hotel-partners/:id          update (auto-sets last_contacted_at)
DELETE /api/sales/hotel-partners/:id          delete
GET    /api/sales/hotel-partners/export.csv   CSV export
GET    /api/sales/hotel-partners/:id/activities
POST   /api/sales/hotel-partners/:id/activities
```

**Contacts Directory**
```
GET    /api/sales/contacts                    paginated directory (search by name/email/phone)
GET    /api/sales/contacts/search?email=&name=  cross-deal contact search
DELETE /api/sales/contacts/:id                remove contact
```

**Sales Reps + Quotas**
```
GET    /api/sales/reps                        list reps with quotas
POST   /api/sales/reps                        create rep
PATCH  /api/sales/reps/:id                    update (name, email, region, is_active)
DELETE /api/sales/reps/:id                    delete
POST   /api/sales/reps/:id/quotas             assign/update quarterly target (SAR)
GET    /api/sales/reps/:id/attainment         quota vs actual won deals (by year/quarter)
```

**Analytics**
```
GET    /api/sales/stats                       pipeline KPIs + funnel summary (win rate, conversion rates, avg days/stage)
GET    /api/sales/overdue                     deals with past-due next_action_date
GET    /api/sales/funnel                      full stage funnel with min/max/avg days per stage
```

Admin UI: `/admin/sales` — 5 tabs: Deal Pipeline, Hotel Partners, Funnel, Reps, Contacts.

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
| Admin | `ADMIN_SECRET`, `INTERNAL_API_SECRET`, `ADMIN_SERVICE_URL` (default: http://localhost:3012) |
| Sales | `SALES_SECRET` (falls back to `ADMIN_SECRET`), `SALES_SERVICE_URL` (default: http://localhost:3013) |
| Workflow | `WORKFLOW_SERVICE_HOST` (default: workflow-service), `WORKFLOW_SERVICE_PORT` (default: 3014); `ADMIN_SERVICE_HOST` (default: admin-service), `ADMIN_SERVICE_PORT` (default: 3012) — used by workflow engine for completion callbacks |
| AI | `ANTHROPIC_API_KEY` — required by pricing-service (port 3011), workflow-service (port 3014), and admin-service (port 3012) for Claude claude-sonnet-4-6 |
| URLs | `ADMIN_BASE_URL` (default: https://admin.utubooking.com) — base URL for approval links in workflow emails; `NOTIFICATION_SERVICE_HOST` (default: notification-service), `NOTIFICATION_SERVICE_PORT` (default: 3002) |
| Auth | `JWT_SECRET` — used by portal BFF (`portal-bff-auth.ts`) to verify corporate portal tokens server-side |
| Notification | `NOTIFICATION_PUBLIC_URL` (default: http://localhost:3002) — used for click-tracking redirect URLs in emails |
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
cd backend/services/sales        && npm install && npm start   # port 3013
cd backend/services/workflow     && npm install && npm start   # port 3014
```

**Before merging:**
```bash
npm run i18n:validate          # check all 27 locales
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
| v1.4.0 | Sales Engine        | 2026-03 | Email automation — abandoned recovery, price alerts, reminders, campaigns |
| v1.5.0 | Design System       | 2026-04 | React Compiler ESLint compliance + design token color migration (navy/blue palette) |
| v1.6.0 | Full-Stack Connect  | 2026-04 | All admin + public pages wired to backend; wallet service; loyalty rewards; maintenance mode; admin settings live to services |
| v1.7.0 | AI Operations      | 2026-04 | Marketing content calendar + draft queue; wallet admin dashboard; AI chat human escalation tool; contact priority triage + assignment; loyalty ledger field fixes |
| v1.8.0 | Sales CRM          | 2026-04 | Dedicated sales-service (port 3013); deal stage history; field-level audit log; funnel analytics + conversion rates; sales rep quota tracking; contacts directory; 5-tab admin UI |
| v1.9.0 | Marketing Engine   | 2026-04 | Audience segmentation; campaign duplicate; click tracking (redirect + CTR); GDPR consent panel; email template library; unified marketing timeline; campaign performance dashboard |
| v2.0.0 | HR Department      | 2026-04 | Employee directory; department management; leave request workflow (approve/reject); headcount dashboard; 4-tab admin UI at /admin/hr |
| v2.1.0 | Compliance Department | 2026-04 | Cross-shard DPO dashboard; erasure request workflow (GDPR/CCPA/LGPD/PIPEDA/KVKK); data export visibility; SLA monitoring; 3-tab admin UI at /admin/compliance |
| v2.2.0 | Legal Department      | 2026-04 | Matter tracking (urgency/jurisdiction/counsel); compliance task calendar (6 seeded defaults); document registry (contracts/NDAs/licenses/expiry tracking); 4-tab admin UI at /admin/legal |
| v2.3.0 | Finance Department    | 2026-04 | Vendor directory (5 seeds); invoice lifecycle with overdue detection; budget approval workflow + line items with auto-total; expense claim review; 8-tab admin UI at /admin/finance |
| v2.4.0 | HR Department v2     | 2026-04 | Leave balances (Gulf-standard allocations, seed + adjust); org chart (recursive CTE, collapse/expand, click→employee panel); bulk CSV employee import (partial success); 5-tab admin UI |
| v2.5.0 | Marketing Hub v2     | 2026-04 | Email suppressions management tab: list active/lifted, filter by email + type, Lift action; backend `GET /suppressions` + `listSuppressions` repo function |
| v2.6.0 | Ops Department       | 2026-04 | Incident management (severity/SLA breaching); support ticket queue; platform health links; 4-tab admin UI at /admin/ops |
| v2.7.0 | Dev Department       | 2026-04 | Sprint planning; 5-column kanban task board (backlog→done); deployment log; active sprint velocity tracking; 4-tab admin UI at /admin/dev |
| v2.8.0 | Products Department  | 2026-04 | Product roadmap; feature flags (key-normalised, rollout %, env targets); release changelog; 4-tab admin UI at /admin/products |
| v3.0.0 | 9-Department Suite   | 2026-04 | All 9 company departments operational: HR, Finance, Legal, Compliance, Sales, Marketing, Ops, Dev, Products — unified admin portal at /admin |
| v3.1.0 | B2B Growth Platform  | 2026-04 | Hotel Partners pipeline (landing/apply/CRM); Corporate Travel Portal (/pro — 10 screens); Affiliates programme; corporate JWT role; DB migration; Hajj & Umrah page rebuilds; homepage B2B cross-promo |
| v4.8.0 | Full AI Operating System | 2026-04 | Complete SOP coverage for all 18 departments; 7 new agent brain files (fraud/, revenue/, procurement/, analytics/, bizdev/, corporate/, customer-success/); 22 new SOPs (FRD-001–003, RVN-001–003, PRC-001–003, ANA-001–002, BIZ-001–003, ADV-001–002, AFF-001–002, CORP-001–002); master-sop.md 6,117 lines with 130+ SOPs across 12 sections; global-ai-operations.md 3,079 lines with OPS-022–029; Agent Team table covers all 16 agents with dedicated CLAUDE.md brain files; README AI Operating System section added |
| v4.7.0 | AI Complete             | 2026-04 | AI Legal Advisor (critical matter risk by jurisdiction, overdue compliance task triage with consequence analysis, contract expiry alerts, Saudi ZATCA/Vision 2030 + DIFC + EU law context — collapsible in Legal Dashboard); AI Privacy Compliance Advisor (GDPR/PDPL/LGPD/CCPA/KVKK SLA breach detection, regulation-specific risk levels, erasure backlog severity, breach notification compliance — collapsible in Compliance Dashboard); AI Ops Health Advisor (critical incident triage by age, SLA breach risk for P1/P2/P3, ticket category hotspots, Hajj/Umrah platform risk flags — collapsible in Ops Overview); AI Fraud Intelligence Advisor (threat vector analysis with trend direction, detection rule gap identification, high-risk pattern coverage map, false positive rate analysis, Gulf-specific fraud context — collapsible in Fraud Overview). All 18 admin departments now have at least one AI advisor. 4 backend routers, 4 BFF proxies, full api.ts types |
| v4.6.0 | AI Business Intelligence | 2026-04 | AI BizDev Advisor (pipeline health, at-risk partners + urgency, expiring agreements + renewal strategy, market expansion priorities, strategic priorities — collapsible in BizDev Overview); AI Booking Insights (anomaly detection, product revenue breakdown, conversion/cancellation insights, revenue opportunities + effort rating, seasonal Hajj/Umrah forecast — collapsible above Bookings table); AI Loyalty Advisor (tier health, churn risk segments + re-engagement tactics, redemption insights, liability assessment, Gulf reward recommendations — always-visible above Loyalty tabs); AI Inventory Advisor (coverage gaps, hotel/flight/car insights by priority, Hajj/Umrah readiness, pricing flags — always-visible above Inventory tabs). 4 backend routers, 4 BFF proxies, full api.ts types |
| v4.5.0 | Full AI Coverage      | 2026-04 | AI Campaign Analyzer (✦ Analyse All Campaigns — portfolio health, top/underperforming campaigns, channel insights, content gaps, quick wins — collapsible panel in Marketing Campaigns tab); AI Account Health (✦ health per CS account — churn risk, engagement trend, next touchpoints, renewal alerts, red flags — modal per account row); AI Procurement Risk (✦ Run Risk Analysis — expiring contracts, SLA breach risks, supplier concentration, ZATCA gaps — collapsible panel in Procurement Overview); AI Roadmap Advisor (✦ Advise Roadmap — priority adjustments, quick wins, strategic bets, feature flag risks, Gulf market alignment — collapsible in Products Roadmap tab); AI Sprint Health (✦ Health per sprint — health_status, velocity_trend, blockers, daily actions, scope creep flag, deployment health — modal from Sprint Board toolbar). All 5 use UPSERT; 5 BFF proxies created; full api.ts types. Every admin department now has at least one AI feature |
| v4.4.0 | AI Advisor Suite      | 2026-04 | AI HR Performance Analyzer (✦ Analyse Department per dept, overall_health/top_performers/development_needs/PIP flags/manager_recommendations — Performance tab on HR page); AI Vendor Due Diligence (✦ Diligence per vendor row in Finance, risk_level/score/approve_recommendation/ZATCA+PCI compliance gaps); AI Deal Coach (✦ AI Deal Coach collapsible panel per deal, momentum/win_probability/relationship_health/next_best_actions/red_flags — Gulf sales context). UPSERT pattern; BFF proxies (45s); full api.ts types |
| v4.3.0 | AI Intelligence Layer | 2026-04 | AI KPI Root Cause Analyzer (✦ Analyse per BI alert, cross-dept fan-out, contributing factors + recommended actions); AI DSR Auto-Fulfillment (✦ Fulfill per erasure request, 8-shard data compilation, cover letter, retention notes, redaction recommendations — DPO-gated, never auto-sent); AI Workflow Builder (✦ Generate with AI in Definitions tab, plain English → draft JSON, human review + Save to Engine flow). BFF proxies (30s/45s/60s), full api.ts types, 3 backend routers registered |
| v4.2.0 | Zero BPA Gaps       | 2026-04 | 28 workflow definitions: release_created (Products/Dev → Legal → Marketing → CS handoff), campaign_brief_submitted (Marketing lifecycle, budget auto-approve ≤ SAR 10k); POST /marketing/campaigns CRUD; My Task Inbox /admin/tasks (filter tabs, KPI strip, SLA badges, inline Claude recommendation, approve/reject/escalate modal) added to admin nav |
| v4.1.0 | Full BPA Coverage    | 2026-04 | 26 workflow definitions (↑ from 16): 8 new P0/P1 seeds (breach_detected, invoice_received, budget_requested, employee_offboarding, performance_review_submitted, ticket_raised, rule_change_proposed, blackout_requested); 2 cron-triggered (contract_expiry_90d, health_score_critical via daily 07:00 Riyadh sweep job); 8 department wiring points added; HR performance review CRUD; Compliance breach endpoint + GET /breaches; 4 new callback dispatch entries; contract-expiry.job.js (dual cron: procurement + CS health) |
| v4.0.0 | AI Operating System  | 2026-04 | Workflow Engine (port 3014): 16 definitions, 19 triggers, completion callbacks, AI approval recommendations, analytics; AI Executive Assistant (17 tools, floating widget); AI Daily Briefing (08:00 Riyadh cron, /admin/briefings); AI Document Generator (8 types, /admin/documents); AI Career Screener; AI Deal Intelligence; AI Support Triage; AI Expense Analyzer; AI Fraud Risk Scorer (threat level, verdict BLOCK/ESCALATE/REVIEW/CLEAR, watchlist suggestions embedded in fraud case review drawer); AI Contract & Legal Document Reviewer (risk level low/medium/high/critical, risk flags, missing clauses, compliance notes per jurisdiction SA/EU/US/TR, expiry alert tiers, recommendations — embedded in Legal Documents edit panel) |

---

## License

Proprietary — AMEC Solutions. All rights reserved.
UTUBooking.com · [utubooking.com](https://utubooking.com)
