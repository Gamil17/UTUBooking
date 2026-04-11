# UTUBooking.com — v3.0.0 "9-Department AI Operations Suite"

> Best travel booking platform for Gulf & Muslim World markets
> Hajj · Umrah · Hotels · Flights · Car Rentals, **Powered by AMEC Solutions** .

---

## Overview

UTUBooking.com is a multi-market travel booking platform purpose-built for Muslim travelers. Starting from Saudi Arabia and the Gulf, the platform has expanded across 25+ markets covering the Muslim World, Europe, North America, and South America.

**Current version:** `v3.0.0 "9-Department AI Operations Suite"` — Completes the full 9-department admin suite: Ops & Support (incident SLA tracking, support tickets), Dev & Sprints (kanban board, deployment log), and Product Hub (roadmap, feature flags, changelog). Each department has its own dedicated backend router and admin UI. Combined with HR, Finance, Legal, Compliance, Sales, and Marketing — every company function is now managed from a single admin portal.

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
  src/app/         Pages + BFF API routes (/api/admin/*, /api/wallet/*, /api/loyalty/*, …)
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
  services/admin/        Platform stats, inventory, pending users, audit log, marketing calendar (port 3012)
  services/sales/        Sales CRM — deals, contacts, activities, hotel partners, reps, funnel analytics (port 3013)
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

---

## License

Proprietary — AMEC Solutions. All rights reserved.
UTUBooking.com · [utubooking.com](https://utubooking.com)
