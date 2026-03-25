# PIPEDA + Quebec Law 25 Compliance Checklist
# UTUBooking — Canada Market Launch (Phase 13)
# Last updated: 2026-03-24

## Legislation Summary

| Law | Scope | Regulator | Key Obligation |
|-----|-------|-----------|----------------|
| **PIPEDA** (federal) | All CA provinces except QC/AB/BC | Office of the Privacy Commissioner (OPC) | Consent, breach notification (72h to OPC if real risk of significant harm) |
| **Quebec Law 25** | Quebec province | Commission d'accès à l'information (CAI) | Stricter than PIPEDA — mandatory PO appointment, 30-day breach notice to CAI + users, French privacy notice, right to erasure |
| **PIPA Alberta** | Alberta | Office of the Information & Privacy Commissioner of Alberta | Similar to PIPEDA; breach notification to OIPC |
| **PIPA BC** | British Columbia | Office of the Information & Privacy Commissioner of BC | Similar to PIPEDA |

## Registration & Legal

- [ ] **Federal incorporation** — Corporations Canada (ic.gc.ca) OR provincial (Ontario/BC)
- [ ] **GST/HST registration** — CRA registration when CA revenue exceeds CAD 30,000
  - Ontario HST: 13% | BC HST: 12% | Quebec QST: 9.975% + GST 5% = ~15%
  - Display GST/HST inclusive pricing in checkout for CA users
- [ ] **BC Seller of Travel** — Register with Consumer Protection BC (required for travel agents)
- [ ] **TICO (Ontario)** — Travel Industry Council of Ontario registration for ON-based agency
- [ ] **Privacy Officer appointment** — Federal PIPEDA requires a designated Privacy Officer
- [ ] **Quebec Privacy Officer (PO)** — Quebec Law 25 s.3.1: mandatory for QC operations
  - Must be a natural person (not a department)
  - Publish PO contact on website in French
- [ ] **CAI registration** — If processing QC residents' data, register with CAI

## Data Residency

- [ ] **AWS ca-central-1 (Montreal)** — Canadian user data MUST remain in Canada
  - Stack: `infra/cloudformation/20-ca-central-1-montreal.yml`
  - Env var: `DATABASE_URL_MONTREAL` (set in `backend/.env`)
  - Shard router: `backend/shared/shard-router.js` — CA → DATABASE_URL_MONTREAL
- [ ] **No US-region routing for CA users** — NEVER write CA user PII to us-east-1
- [ ] **AWS Canada DPA** — Sign AWS Data Processing Agreement at console.aws.amazon.com

## Consent & Privacy Notice

- [ ] **Privacy notice at point of collection** — shown before CA users enter PII
  - Must include: what data, why, who receives it, how long retained, user rights
  - Quebec: must be in French for QC users (Law 25 / Bill 96)
  - Component: `frontend/src/components/compliance/PIPEDAPrivacyNotice.tsx`
- [ ] **Opt-in for non-essential data** — PIPEDA requires meaningful consent
  - Analytics cookies: opt-in (not opt-out) for Quebec
  - Marketing emails: double opt-in required
- [ ] **Cookie banner** — CA users need cookie consent (Quebec Law 25 requires explicit consent)
- [ ] **Privacy Policy** — bilingual (EN + FR for QC); must cover PIPEDA + Law 25 rights

## User Rights (PIPEDA + Law 25)

All implemented via `backend/routes/pipeda.ts`:

| Right | Endpoint | Law |
|-------|----------|-----|
| Access (what data we hold) | `GET /api/user/pipeda/access` | PIPEDA s.4.9 |
| Correction | `POST /api/user/pipeda/correct` | PIPEDA s.4.9.5 |
| Withdrawal of consent | `POST /api/user/pipeda/withdraw-consent` | PIPEDA s.4.3.8 |
| Deletion (erasure) | `POST /api/user/pipeda/erase` | Quebec Law 25 s.28.1 |
| Portability | `GET /api/user/pipeda/portability` | Quebec Law 25 s.27 |
| Complaint | Direct to OPC / CAI | PIPEDA s.4.10 |

Response SLA: 30 days (PIPEDA); 30 days (Law 25 — shorter if technically feasible)

## Breach Notification

- [ ] **PIPEDA breach log** — log all suspected breaches to `pipeda_breach_log` table
- [ ] **OPC notification** — within 72 hours if "real risk of significant harm" (PIPEDA s.10.1)
- [ ] **User notification** — as soon as feasible after OPC notification
- [ ] **Quebec CAI** — notify CAI + affected QC users within 72 hours (Law 25 s.3.5)
- [ ] **Breach response plan** — documented at `docs/ops/breach-response-ca.md`
- [ ] **Annual breach log review** — OPC can request log at any time

## Interac Online (Bambora/Worldline)

- [ ] **Bambora merchant account** — dev.na.bambora.com
- [ ] **Interac Online enabled** — in Bambora portal → Payment Methods
- [ ] **Env vars set** — `BAMBORA_MERCHANT_ID`, `BAMBORA_PASSCODE`, `BAMBORA_ENV=production`
- [ ] **Webhook registered** — `https://api.utubooking.com/api/payments/interac/callback`
- [ ] **Return URLs registered** — `/api/payments/interac/return` (approved + declined)
- [ ] **Stripe CAD enabled** — Stripe Dashboard → Currencies → add CAD (fallback for cards)
- [ ] **PCI-DSS** — Bambora handles card data; UTUBooking is SAQ-A merchant (redirect only)

## Quebec French (Bill 96 / Law 25)

- [ ] **French UI for QC users** — middleware routes `cf-region-code: QC` → `x-locale-override: fr`
- [ ] **French payment selector** — `CanadaPaymentSelector.tsx` supports `locale="fr"`
- [ ] **French privacy notice** — `PIPEDAPrivacyNotice.tsx` renders in French for QC
- [ ] **French Privacy Policy** — `fr.json` must include all privacy_policy keys
- [ ] **French emails** — Transactional emails (booking confirm, receipts) sent in French to QC users

## Air Canada (GDS Integration)

- [ ] **AC added to Amadeus config** — `amadeus-airlines.json` airline code "AC" ✅
- [ ] **YYZ + YUL airports enabled** — `enabledAirports` array ✅
- [ ] **Canadian route priorities** — YYZ-JED (high), YUL-JED (high), YYZ-MED (high) ✅
- [ ] **Connection hubs** — LHR, AUH, IST, DOH for AC itineraries ✅
- [ ] **Star Alliance interline** — UA, LH, TK codeshare agreements handled via GDS ✅

## Launch Blockers

| # | Blocker | Owner | Due |
|---|---------|-------|-----|
| 1 | GST/HST registration at CRA | Legal | Before CA launch |
| 2 | BC Seller of Travel registration | Legal | Before BC sales |
| 3 | Privacy Officer appointed | Exec | Before data collection |
| 4 | AWS CA DPA signed | Ops | Before ca-central-1 live |
| 5 | Bambora production account | Payments | Before CA launch |
| 6 | Privacy Policy bilingual (EN/FR) | Legal | Before CA launch |
| 7 | Quebec CAI registration | Legal | Before QC sales |
