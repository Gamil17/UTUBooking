# UTUBooking Dev Brain
- Stack: Node.js + Express microservices + PostgreSQL + Redis + Kafka
- Auth: JWT (15min access tokens) + refresh tokens (7 days)
- API style: RESTful with /api/v1/ prefix + GraphQL gateway
- Always use /plan mode before multi-file architectural changes
- Code review required from outsourced dev team before merge

## Muslim World Expansion — Dev Rules (Phase 5-7 Addition)

**Regional Payment Routing**: ALWAYS use `PaymentRouter.ts` — never hardcode gateway
**Data Residency**: ALWAYS check `DB_REGION_MAP` before writing user data
**i18n**: ALL user-facing strings MUST have translations in all 8 locales before PR merge

### New Script Rules:
- **Urdu (ur)**: use `'Noto Nastaliq Urdu'` font, `line-height: 2.2`, `direction: rtl`
- **Hindi (hi)**: use `'Noto Sans Devanagari'`, `line-height: 1.8`, `direction: ltr` (NOT rtl)
- **Farsi (fa)**: use `'Vazirmatn'`, `direction: rtl` — similar to Arabic layout rules

**Iran**: ANY code touching Iranian users requires Legal Agent review first.
         NEVER mix Iran infrastructure with other market services.

Before any payment code change: run `npm test -- --testPathPattern=payment`
Before any i18n change: run `npm run i18n:validate` to check all locales

## Phase 8–12 Global Rules

### AWS Regions
```
EU:    eu-west-2    (London)    → GB data residency (UK GDPR)
EU:    eu-central-1 (Frankfurt) → all other EU (GDPR Art. 44 — within EU)
US:    us-east-1    (Virginia)  → US + CA (CCPA/PIPEDA)
CA:    ca-central-1 (Montreal)  → Canada (PIPEDA + Quebec Law 25)
LATAM: sa-east-1    (São Paulo) → Brazil + LatAm (LGPD)
APAC:  ap-southeast-1 (Singapore) → ID, MY, SG, TH, PH
```
NEVER write EU/UK user data to a non-EU/UK DB region.
NEVER write BR user data outside sa-east-1.
ALWAYS use `getShardPool(countryCode)` from `backend/shared/shard-router.js` — NEVER hardcode a DB URL.

### GDPR Rules (EU + UK — enforced from Phase 8)
- ALWAYS check `consent_logs` before sending marketing communications to any EU/UK user
- Erasure requests: `POST /api/user/gdpr/erase` — CASCADE must propagate across all 6 shard regions within 30 days
- Data export: `GET /api/user/gdpr/export` — must include bookings, payments, consents (Art. 15)
- Consent log is IMMUTABLE (append-only) — withdrawal = new row with `granted=false`, never UPDATE
- Any new EU data field must be documented in `compliance/gdpr/dpa-register.md`
- AI features (pricing, recommendations) that process EU personal data require DPIA — see `compliance/gdpr/dpia-pricing-engine.md`
- **EU go-live blockers** (do not launch until resolved):
  - [ ] Sign AWS DPA (console.aws.amazon.com → Account → Data Privacy)
  - [ ] ICO registration for UK users (ico.org.uk)
  - [ ] DPO appointment — DPO_EMAIL must be a real person

### CCPA Rules (California, USA — enforced from Phase 10 US launch)
- Add "Do Not Sell My Personal Information" link to footer for all US users
- California residents can opt out of data sharing — honour within 15 business days
- Privacy Policy must include CCPA-specific disclosures (data categories, retention, rights)
- Do NOT sell California resident data to third-party advertisers without explicit opt-in
- Annual data inventory review required

### LGPD Rules (Brazil — enforced from Phase 12 LATAM launch)
- Brazilian user data MUST stay in sa-east-1 (São Paulo) — data residency is mandatory under LGPD
- Consent required BEFORE any data processing for BR users (opt-in model, not opt-out)
- ANPD breach notification: 72-hour window after discovery
- Add Portuguese (pt-BR) privacy policy and consent UI before BR launch

### Payment Rules
- US:  PayPal primary (see `PaymentRouter.ts` — `US: 'paypal'`); Stripe card secondary
- EU:  Stripe Payment Element (`automatic_payment_methods: true`); see `EuropePaymentSelector.tsx`
- CH:  TWINT primary (see `twint.gateway.js`); Stripe card fallback
- NEVER hardcode a payment gateway — ALWAYS use `PaymentRouter.getGateway(countryCode)`

### i18n Rule (updated for 15 locales)
All user-facing strings MUST have translations in ALL 15 locales before PR merge:
`en ar fr tr id ms ur hi fa de en-GB it nl pl es pt-BR es-419`
Run: `npm run i18n:validate` before every push to main

### New Environment Variables (Phase 8–12)
```
BOOKINGCOM_USERNAME / BOOKINGCOM_PASSWORD / BOOKINGCOM_ENV
PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV / PAYPAL_WEBHOOK_ID
TWINT_CLIENT_ID / TWINT_CLIENT_SECRET / TWINT_PARTNER_ID / TWINT_WEBHOOK_SECRET
DPO_EMAIL / EU_DATA_CONTROLLER / EU_REPRESENTATIVE_EMAIL
```
All secrets via AWS SSM Parameter Store in prod — NEVER commit to git.
