# UTUBooking — UK Launch Checklist
## Phase 8 · en-GB · GBP · eu-west-2 (London)

**Purpose**: Every item must be verified ✅ before the first UK user registers.
**Owner**: CEO / CTO co-sign required on final sign-off.
**Last updated**: 2026-03-24

---

## 1. Legal Entity

- [ ] **Incorporate UTUBooking Ltd at Companies House**
  - URL: [companieshouse.gov.uk](https://www.companieshouse.gov.uk)
  - Method: online incorporation — 24 hours, ~£12 filing fee
  - Structure: Private Limited Company (Ltd) — standard for UK trading
  - Registered address: required (can use a registered office service, ~£50/year)
  - Output: Company Registration Number (CRN) — add to all UK invoices and website footer
  - ⚠️ Required before opening UK bank account or signing UK contracts

- [ ] **UK Bank Account**
  - Recommended: Starling Bank Business (remote-opening, free) or Barclays Business
  - Required for GBP Stripe settlement and HMRC tax payments
  - BACS sort code + account number needed for UK B2B invoice payments

- [ ] **UK Seller of Travel (ATOL/ABTA)**
  - ATOL: Air Travel Organisers' Licensing — required if selling flight-inclusive packages
    - Apply via Civil Aviation Authority (caa.co.uk) — bond required (~£25 per passenger)
  - ABTA membership: optional but strongly builds consumer trust for UK travel agents
  - ⚠️ Package holiday sales without ATOL = criminal offence under Air Travel Organiser's Licensing Regulations 2012
  - Action: legal team to confirm whether UTUBooking's model requires ATOL (hotel-only = likely not; flight+hotel bundle = yes)

---

## 2. Data Protection & Privacy (UK GDPR)

- [ ] **ICO Registration as Data Controller**
  - URL: [ico.org.uk/registration](https://ico.org.uk/registration)
  - Cost: £40/year (Tier 1 — turnover < £632K) or £60/year (Tier 2)
  - Reference number displayed on privacy policy + website footer
  - ⚠️ Operating without ICO registration = fine up to £500,000 under DPA 2018
  - Renew annually (ICO sends reminder)

- [ ] **UK GDPR Privacy Policy live at utubooking.com/privacy**
  - Must cover: data categories collected, legal bases (Art. 6), retention periods, third-party processors, UK/EU transfers
  - UK-specific additions: ICO registration number, right to complain to ICO, UK representative contact
  - Reviewed by a UK-qualified solicitor (data protection specialism)
  - Version-controlled: store signed copy in `legal/gdpr/privacy-policy-uk-v1.pdf`

- [ ] **Cookie Consent Banner**
  - Granular consent: Strictly Necessary (always on) | Analytics (off) | Marketing (off)
  - No pre-ticked boxes — UK GDPR + PECR require freely given, specific, informed consent
  - Equal prominence: "Accept All" and "Reject All" must be equally easy to click (ICO guidance 2023)
  - Test with **ICO cookie checker tool**: [ico.org.uk/for-organisations/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies/check-if-your-cookies-are-ok](https://ico.org.uk/for-organisations/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies/check-if-your-cookies-are-ok/)
  - Component: `frontend/src/components/compliance/GDPRConsentBanner.tsx` — verify `en-GB` locale fires correctly

- [ ] **GDPR Erasure Endpoint Tested**
  - Endpoint: `DELETE /api/user/gdpr/erase` (backend route: `backend/routes/gdpr.ts`)
  - Test: create a test UK user → trigger erasure → verify PII anonymised in ALL 6 regional shard DBs within 30 days
  - Verify: `gdpr_erasure_log` table records the request with timestamp and cascade status
  - Check: payment records retain transaction amounts (legal obligation) but customer PII is nulled
  - Evidence: screenshot of DB state before + after stored in `legal/gdpr/erasure-test-evidence/`

- [ ] **Data Portability Endpoint Tested**
  - Endpoint: `GET /api/user/gdpr/export` — returns profile + bookings + consents + payment summaries
  - Format: JSON (Article 20 requires "commonly used, machine-readable format")
  - Response time: within 30 days of request (Art. 12 GDPR)

- [ ] **Consent Logging Verified**
  - `consent_log` table (migration `20260324000026`) must be recording UK user consents
  - Verify `law='GDPR'` for UK users, categories `analytics` and `marketing` logged with `granted=false` by default
  - Run: `psql $DB_URL_LONDON -c "SELECT * FROM consent_log LIMIT 5;"`

---

## 3. Infrastructure

- [ ] **AWS eu-west-2 (London) Region Live**
  - CloudFormation stack `infra/cloudformation/16-eu-west-2-london.yml` deployed
  - RDS instance running: replace `CHANGE_ME` in `backend/.env` → `DATABASE_URL_LONDON`
  - Shard router test: `getShardPool('GB')` → returns London pool
  - Run: `DATABASE_URL=$DB_URL_LONDON npx node-pg-migrate up --migrations-dir backend/migrations`
  - Verify all 29 migrations applied: `psql $DB_URL_LONDON -c "SELECT * FROM pgmigrations ORDER BY run_on DESC LIMIT 5;"`

- [ ] **UK Data Residency Confirmed**
  - Create a test user with `countryCode=GB` → verify writes go to `DB_URL_LONDON`, not KSA/UAE shard
  - Check: `shard-router.js` returns `london` pool for `GB`
  - Check: GDPR erasure cascade reaches London DB

- [ ] **SSL Certificates (ACM) in eu-west-2**
  - Certificate for `*.utubooking.com` issued in `eu-west-2`
  - Certificate for `api-uk.utubooking.com` (pinned subdomain from Route53 stack 09) issued
  - Auto-renewal confirmed (ACM handles this automatically)

- [ ] **Route53 Health Check for London ALB**
  - `HealthCheckLondon` from `09-route53-global.yml` reporting healthy
  - Check: AWS Console → Route 53 → Health Checks → HealthCheckLondon → Status: Healthy
  - CloudWatch alarm `AlarmHealthLondon` not in ALARM state

---

## 4. Payments

- [ ] **Stripe GBP Currency Enabled**
  - Stripe Dashboard → Settings → Bank accounts and scheduling → GBP linked
  - Settlement bank: UK bank account (sort code + account number)

- [ ] **Stripe UK Payment Methods Active**
  - Klarna: enabled for GB (Stripe Dashboard → Payment methods → Klarna → GB ✅)
  - Apple Pay: domain verified for `utubooking.com` and `api.utubooking.com`
    - `/.well-known/apple-developer-merchantid-domain-association` file live
  - Google Pay: enabled (no domain verification needed)
  - Test each method in Stripe sandbox with GB test cards

- [ ] **PaymentSelector routes GB correctly**
  - `currency=GBP` → `EuropePaymentSelector` with `countryCode=GB`
  - `getMethodHint('GB')` returns `'Card, Klarna, Apple Pay'`
  - Stripe Payment Element shows Klarna as first option for GBP

- [ ] **UK VAT on Invoices**
  - Invoices to UK customers show 20% VAT as a separate line item
  - VAT registration number (once registered with HMRC) on all invoices
  - HMRC VAT registration: apply when UK turnover exceeds £85,000/year (or voluntarily earlier)
  - Making Tax Digital (MTD): file VAT returns via MTD-compatible software (FreeAgent, Xero, etc.)

---

## 5. Localisation

- [ ] **British English (en-GB) locale QA'd**
  - `frontend/locales/en-GB.json` — all keys present (run `npm run i18n:validate`)
  - British spellings throughout: travelling ✅, authorised ✅, colour ✅, acknowledgement ✅
  - Currency displays as `£1,234.56` (not $, not SAR)
  - `formatPrice(1234.56, 'en-GB')` → `£1,234.56` (test in browser console)
  - Date format: DD/MM/YYYY (British convention, not MM/DD/YYYY)

- [ ] **UK Muslim Content QA'd**
  - Umrah packages from London Heathrow (LHR) → Jeddah (JED) returning in flight search
  - Umrah packages from Birmingham (BHX), Manchester (MAN), Leeds Bradford (LBA) returning
  - Halal hotel filter working for London, Birmingham, Manchester searches
  - Makkah proximity filter returning correct results (≤500m from Haram)
  - Content reviewed by UK Muslim community advisor (document sign-off in `marketing/approvals/uk-content-qa.md`)

- [ ] **RTL/LTR handling for UK users**
  - `getLocaleAttrs('en-GB')` returns `{ lang: 'en-GB', dir: 'ltr' }`
  - No layout breakage when switching between en-GB (LTR) and ar (RTL)

---

## 6. Flights

- [ ] **British Airways (BA) Routes Returning**
  - LHR → JED (Jeddah — closest to Makkah), LHR → MED (Madinah — seasonal direct), LHR → DXB, LHR → RUH
  - Test: `GET /api/v1/flights/search?origin=LHR&destination=JED&date=2027-01-15&adults=2`
  - Verify: BA flight numbers (`BA-` prefix), correct duration, correct pricing in GBP

- [ ] **UK Departure Airport Codes Mapped**
  - LHR (London Heathrow), LGW (Gatwick), LCY (City), STN (Stansted), MAN (Manchester), BHX (Birmingham), LBA (Leeds Bradford), EDI (Edinburgh), GLA (Glasgow)

---

## 7. Booking.com Integration

- [ ] **Booking.com API credentials set**
  - `BOOKINGCOM_USERNAME` and `BOOKINGCOM_PASSWORD` set in production SSM
  - `BOOKINGCOM_ENV=production` for live launch

- [ ] **UK hotel inventory returning**
  - Test: `searchHotels('London', '2027-01-20', '2027-01-25', 2)` → results with `source: 'bookingcom'`
  - Deduplication working: hotels present in both Hotelbeds + Booking.com show `sources: ['hotelbeds', 'bookingcom']` with lower price surfaced
  - Verify `meta.deduped` count > 0 for major city searches

---

## 8. Final Sign-off

| # | Check | Owner | Status | Date |
|---|-------|-------|--------|------|
| 1 | Companies House incorporation | CEO | ☐ | — |
| 2 | UK bank account open | CFO | ☐ | — |
| 3 | ICO registration confirmed | DPO | ☐ | — |
| 4 | Privacy Policy live + solicitor-reviewed | Legal | ☐ | — |
| 5 | Cookie consent banner tested (ICO checker) | CTO | ☐ | — |
| 6 | GDPR erasure end-to-end tested | Engineering | ☐ | — |
| 7 | AWS London region + migrations applied | DevOps | ☐ | — |
| 8 | UK data residency verified | Engineering | ☐ | — |
| 9 | Stripe GBP + Klarna + Apple Pay tested | Engineering | ☐ | — |
| 10 | en-GB locale QA complete | Product | ☐ | — |
| 11 | UK Muslim content advisor sign-off | Marketing | ☐ | — |
| 12 | BA routes confirmed in flight search | Engineering | ☐ | — |
| 13 | Booking.com UK inventory live | Engineering | ☐ | — |
| 14 | ATOL/ABTA determination from legal | Legal | ☐ | — |
| 15 | VAT registration reviewed with accountant | Finance | ☐ | — |

**Go/No-Go Decision**: CEO + CTO must sign off all 15 items before first UK user registration.
Store completed checklist as `legal/launch/uk-launch-sign-off-YYYYMMDD.pdf`.
