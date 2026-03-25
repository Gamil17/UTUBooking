# CCPA / CPRA Compliance Checklist
**UTUBooking — California Consumer Privacy Act**
**Implemented:** 2026-03-24 | **Review due:** 2027-03-24

## Legal Threshold (must meet ≥1)
- [ ] Annual gross revenue > $25M USD
- [x] Reasonably expects to process personal information of 100,000+ California consumers (at scale)
- [ ] 50%+ annual revenue from selling California consumers' personal information

## Required Disclosures
- [x] "Do Not Sell or Share My Personal Information" link in footer (all US users)
  — `frontend/src/components/compliance/CCPAFooterLink.tsx`
  — Wired in root `frontend/src/app/layout.tsx` (all pages, US country code)
- [x] CCPA section in Privacy Policy (`/privacy#ccpa`) — Section 13
- [x] Data categories disclosed (Cal. Civ. Code §1798.110)
- [x] Third-party recipients disclosed (§1798.115)
- [x] Non-discrimination notice included (§1798.125)

## Consumer Rights — Backend Implementation
- [x] **Right to Know** — `GET /api/user/ccpa/rights` returns data categories + record counts
- [x] **Right to Delete** — `POST /api/user/ccpa/delete` anonymises profile, cancels pending bookings
- [x] **Right to Opt-Out** — `POST /api/user/ccpa/opt-out` sets `ccpa_opted_out=true` in DB + Redis
- [x] **Right to Correct** — Handled via account settings (existing endpoint)
- [x] **Right to Limit Sensitive PI** — Via email to privacy@utubooking.com (manual process for now)

## Data Infrastructure
- [x] `privacy_preferences` table — migration `20260324000032` — run on US shard (us-east-1)
- [x] `backend/models/PrivacyPreferences.ts` — upsert, opt-out check, bulk filter
- [x] Redis cache key `ccpa:opted_out:{userId}` — 24h TTL — set by opt-out endpoint
- [x] Deletion queue `ccpa:deletion:queue` (Redis RPUSH) for ops/cascade
- [x] Opt-out queue `ccpa:opt-out:queue` for DPO review

## Marketing Suppression
- [x] `backend/lib/emailGuard.ts` — `shouldSendMarketingEmail()` + `filterOptedOutUsers()`
  — Must be imported in any email sending code before marketing emails are dispatched

## Analytics Anonymization
- [x] `backend/lib/analyticsGuard.ts` — `anonymizeIfOptedOut()` + `attachCcpaStatus()` middleware
  — Strip userId, email, IP from analytics events for opted-out users

## Response Time SLA
- Opt-out: 15 business days (Cal. Civ. Code §1798.120)
- Know/Delete/Correct: 45 days (§1798.145(b)(1)); extendable once by 45 days with notice

## Pending Action Items
- [ ] Register with California Privacy Protection Agency (CPPA) when revenue threshold is met
- [ ] Annual data inventory review (due 2027-03-24)
- [ ] Authorised agent verification process (manual — email privacy@utubooking.com)
- [ ] Add CCPA training for ops team who handle manual requests
- [ ] Mount `createCcpaRouter` on auth service (`backend/services/auth/src/index.js`)
- [ ] Set `INTERNAL_AUTH_SERVICE_URL` in AWS SSM for prod
- [ ] Add `privacy@utubooking.com` email alias to ops team

## Key Files
| File | Purpose |
|------|---------|
| `backend/routes/ccpa.ts` | CCPA router (factory — mount on auth service) |
| `backend/models/PrivacyPreferences.ts` | DB model + repository |
| `backend/migrations/20260324000032_create_privacy_preferences.js` | DB migration |
| `backend/lib/emailGuard.ts` | Marketing email suppression |
| `backend/lib/analyticsGuard.ts` | Analytics anonymization |
| `frontend/src/components/compliance/CCPAFooterLink.tsx` | Footer link (server component) |
| `frontend/src/app/privacy/ccpa-opt-out/page.tsx` | Opt-out + deletion UI |
| `frontend/src/app/privacy/page.tsx` | Privacy policy (§13 = CCPA) |
| `frontend/src/app/api/user/ccpa/*/route.ts` | Next.js API proxies |
