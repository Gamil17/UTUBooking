# UTUBooking — US Build Guide
## PHASE 10 · Months 121–144 · Q1 2027–Q4 2028
### PayPal · CCPA · Halal Hotel Filter · Muslim American Features · USD

**AWS Region**: us-east-1 (N. Virginia)
**Currency**: USD
**Payment**: PayPal (primary) + Stripe (secondary)
**Gateway code**: `PaymentRouter.ts → US: 'paypal'`

---

## Task 8 — US Legal Entity + IATA + Seller of Travel Licenses

### 8.1 Delaware C-Corp Incorporation

**Why Delaware**: 90% of US venture-backed startups incorporate in Delaware. Court of Chancery (no jury), well-established case law, investor familiarity. If you raise Series A or later, investors will often require Delaware incorporation anyway.

**How to incorporate**:
1. Use **Stripe Atlas** (stripe.com/atlas — $500 flat) or **Clerky** (clerky.com — $499)
   - Both handle: Articles of Incorporation, Registered Agent, EIN application, bank account intro
   - Atlas is faster for founders with existing Stripe accounts
2. Alternatively file directly with **Delaware Division of Corporations** (corp.delaware.gov)
   - $89 state filing fee + $50–200 for registered agent (required — cannot use your own address)
   - Certificate issued within 24 hours for expedited service
3. **Required documents**:
   - Certificate of Incorporation (filed with Delaware)
   - Bylaws (internal governance document — Stripe Atlas generates standard version)
   - Initial Board Resolutions (authorises bank account, officers, etc.)
   - Cap table (Carta or Pulley recommended from Day 1)

**After incorporation**:
- File **Form SS-4** with IRS for EIN (Employer Identification Number) — free, 10 minutes at irs.gov
  - EIN is your US tax ID — required for banking, Stripe settlement, 1099 reporting
- Open **US bank account**: Mercury Bank (mercury.com) or Brex — both support remote opening for non-US founders
  - Mercury is free; Brex requires higher revenue but includes corporate cards
- Register for **state income tax** in any state where you have employees or >$100K in sales (nexus rules)

**Timeline**: 3–5 business days for standard; 1 day for expedited Delaware + Atlas

---

### 8.2 IATA Accreditation (Airline Ticket Sales)

IATA accreditation allows UTUBooking to issue airline tickets directly and earn commission from airlines. Required if selling flight-inclusive packages or acting as a travel agent (not just an affiliate/OTA).

**Two paths**:

#### Path A — Direct IATA Accreditation (4–8 weeks)
- Apply at: [iata.org/en/services/accreditation/travel-agent](https://www.iata.org/en/services/accreditation/travel-agent/)
- Requirements:
  - [ ] Proof of business entity (Delaware C-Corp certificate)
  - [ ] 2 years of audited financial statements OR a financial guarantee/bond
  - [ ] Financial security: bank guarantee, insurance bond, or cash deposit (~$20,000–$70,000 depending on predicted ticket sales volume)
  - [ ] US bank account for ARC (Airlines Reporting Corporation) settlement
  - [ ] Designated IATA-qualified agent (person with IATA training certificate)
- Processing fee: ~$150 application fee
- Annual renewal: ~$120/year

#### Path B — Host Agency (recommended for faster launch)
- Partner with an IATA-accredited **host agency** (e.g. Nexion, Travel Leaders, Avoya)
- You sell under their IATA number, pay a split commission (typically 70/30 or 80/20)
- No bond required, no waiting period — active within days
- **Recommended for US launch**: switch to direct IATA accreditation at $1M+ US annual revenue

**ARC (Airlines Reporting Corporation)**:
- US-specific airline settlement system (like BSP globally but US-only)
- Apply for ARC accreditation after IATA: arccorp.com
- ARC handles settlement between travel agencies and airlines in the US
- ARC accreditation required to use GDS (Amadeus, Sabre) for US airline ticket issuance

---

### 8.3 State Seller of Travel Licenses

Required in 5 US states for companies selling travel products to their residents. **Non-compliance = civil fines + cease-and-desist.**

#### California (CST — Seller of Travel Registration) — PRIORITY #1
- Agency: California Attorney General
- URL: [oag.ca.gov/travel/seller-registration](https://oag.ca.gov/travel/seller-registration)
- **CST number** required: must display on all CA-facing marketing and website
- Fee: $100 registration fee
- Annual renewal required
- Restitution fund contribution: 0.1% of CA gross annual sales (if selling flight-inclusive packages)
- ATCP: Air Travel Consumer Protection — consumer trust account required for flight-inclusive packages sold to CA residents
- Timeline: 4–6 weeks
- ⚠️ California has the largest Muslim population in the US (~1.1M) — this is your primary US target state

#### Florida (ST — Seller of Travel)
- Agency: Florida Department of Agriculture and Consumer Services
- URL: freshfromflorida.com
- Fee: $300 initial, $50 renewal
- Bond required: $25,000 surety bond (for companies selling travel to FL residents)

#### Hawaii
- Agency: Hawaii Department of Commerce and Consumer Affairs
- Fee: $25 registration
- Relatively simple — no bond required

#### Iowa
- Agency: Iowa Secretary of State
- Fee: minimal
- Registration form with annual renewal

#### Washington
- Agency: Washington Secretary of State
- URL: sos.wa.gov
- Seller of travel registration required for package tours

**Action plan**:
1. File California first (largest Muslim market, strictest requirements)
2. File Florida + Washington in parallel
3. Hawaii + Iowa: file when revenue from those states materialises

---

### 8.4 EIN (Employer Identification Number)

- Apply at: [IRS EIN application](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online) — takes 10 minutes online
- Free — no filing fee
- Issued immediately (online) or by mail in 4–5 weeks
- Required for:
  - US bank account
  - Stripe USD settlement
  - Payroll (if hiring US employees)
  - 1099 reporting (PayPal reports to IRS if payments > $600/year per contractor)
  - US tax filing

---

### 8.5 CCPA Compliance (California Consumer Privacy Act)

**Applies if any of the following** (UTUBooking will meet these at scale):
- Annual gross revenue > $25M
- Buys/sells/shares personal data of 100,000+ CA consumers per year
- 50%+ of annual revenue from selling CA consumer data

**Required before CA launch**:

- [ ] **"Do Not Sell or Share My Personal Information" link** in website footer for California users
  - Implementation: detect `countryCode=US` + state (via IP geolocation or user declaration) → show link
  - Link goes to a privacy rights request page

- [ ] **Privacy Rights Request page** at `utubooking.com/privacy-rights`
  - Allows CA consumers to: Know, Delete, Correct, Opt-Out of Sale/Sharing, Limit Sensitive Data Use
  - Must be available in accessible format (WCAG 2.1 AA)
  - Backend endpoint: `POST /api/user/ccpa/request` — log to `ccpa_requests` table

- [ ] **CCPA Privacy Policy disclosures** (add to `utubooking.com/privacy`)
  - Categories of personal information collected (identifiers, commercial info, geolocation, internet activity)
  - Purposes for collection
  - Categories of third parties shared with (Stripe, PayPal, Booking.com, AWS)
  - Consumer rights and how to exercise them
  - Contact: designatedEmail@utubooking.com + toll-free number (required by CCPA)

- [ ] **Response SLA**: honour consumer rights requests within 45 days (extendable to 90 with notice)

- [ ] **Data Map**: document all personal data flows for US users in `compliance/ccpa/data-inventory.md`

**Code changes required**:
```
backend/routes/ccpa.ts             — CCPA rights endpoints (Know, Delete, Opt-Out)
frontend/src/app/privacy-rights/   — Consumer rights request page (en + es-419)
frontend/src/components/layout/    — Footer component with "Do Not Sell" link for US users
```

---

### 8.6 US Bank Account

**Mercury Bank** (recommended for startups — mercury.com):
- Remote opening: founders outside US can open online
- No monthly fees, no minimum balance
- ACH + wire transfers
- Integrates with Stripe for USD settlement
- FDIC insured via partner banks up to $250K

**Brex** (alternative for higher-revenue stage):
- Requires ~$50K+ monthly revenue
- Corporate cards + bank account bundle
- Better for companies with significant US payroll

**Required documents for US bank account**:
- EIN confirmation letter (CP 575 from IRS)
- Delaware Certificate of Incorporation
- Articles of Incorporation
- Government ID for all beneficial owners (>25% ownership)
- Utility bill or proof of address for registered agent address

---

### 8.7 US Infrastructure Setup

Before accepting US user registrations:

- [ ] **AWS us-east-1 deployed**
  - Stack: `infra/cloudformation/18-us-east-1-virginia.yml`
  - RDS instance: replace `DATABASE_URL_US_EAST=CHANGE_ME` in `backend/.env` and SSM
  - Run migrations: `DATABASE_URL=$DB_URL_US_EAST npx node-pg-migrate up --migrations-dir backend/migrations`

- [ ] **Shard router test**
  - `getShardPool('US')` → returns us-east-1 pool
  - `getShardPool('CA')` → returns ca-central-1 (Montreal) pool
  - California user data stays in us-east-1 — CCPA compliance

- [ ] **PayPal sandbox tested**
  - `PAYPAL_ENV=sandbox` → create test order → approve in PayPal sandbox → capture
  - Test webhook: PAYMENT.CAPTURE.COMPLETED arrives at `/api/payments/paypal/webhook`
  - Switch to `PAYPAL_ENV=live` for production launch

- [ ] **USD pricing displaying correctly**
  - `formatPrice(250, 'en')` → `$250.00`
  - `PaymentSelector` with `currency=USD` → renders `USAPaymentSelector`
  - PayPal "Pay with PayPal" button shows USD amount

---

### 8.8 US Launch Checklist (Pre-Registration Gate)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Delaware C-Corp incorporated | CEO | ☐ |
| 2 | EIN obtained from IRS | CEO/CFO | ☐ |
| 3 | US bank account open (Mercury/Brex) | CFO | ☐ |
| 4 | California CST number obtained | Legal | ☐ |
| 5 | Florida + Washington seller of travel filed | Legal | ☐ |
| 6 | IATA host agency agreement signed (or direct IATA applied) | CEO | ☐ |
| 7 | ARC accreditation applied | Operations | ☐ |
| 8 | CCPA Privacy Policy live (reviewed by US counsel) | Legal | ☐ |
| 9 | "Do Not Sell" link + rights request page live | Engineering | ☐ |
| 10 | AWS us-east-1 live + migrations applied | DevOps | ☐ |
| 11 | PayPal live credentials set in SSM | Engineering | ☐ |
| 12 | USD pricing + PayPal checkout end-to-end tested | Engineering | ☐ |
| 13 | US Muslim content reviewed (see Task 11) | Marketing | ☐ |
| 14 | Halal hotel filter for US cities tested (see Task 10) | Engineering | ☐ |
| 15 | US Stripe card secondary flow tested (fallback from PayPal) | Engineering | ☐ |

---

## Upcoming US Tasks (Phases 10–11)

| Task | Topic |
|------|-------|
| **9** | PayPal Smart Buttons — in-page PayPal flow (no redirect), one-touch payments |
| **10** | Halal Hotel Filter — US Muslim community features, halal certification data |
| **11** | Muslim American Features — ISNA Hajj group packages, ICNA Umrah groups, Eid travel |
| **12** | US Flight Search — American Airlines (AA), United (UA), Delta (DL) JFK/LAX/ORD routes |
| **13** | CCPA Rights API — Know/Delete/Opt-Out endpoints + annual data inventory |
| **14** | US Marketing Launch — Muslim American social media, Islamic Society outreach |
| **15** | US Tax Compliance — Sales tax automation (Avalara/TaxJar), state nexus tracking |

---

## Key Contacts to Establish

| Role | Purpose | Status |
|------|---------|--------|
| Delaware registered agent | Legal address + compliance notices | ☐ Get through Stripe Atlas or Northwest Registered Agent |
| US immigration/corp lawyer | C-Corp setup + equity structure + IATA contract review | ☐ TBD |
| CCPA/US privacy counsel | Privacy policy review, consumer rights compliance | ☐ TBD |
| US CPA (accountant) | EIN, Delaware franchise tax, federal/state income tax | ☐ TBD |
| ARC-approved host agency | IATA/ARC ticket issuance until direct accreditation | ☐ TBD |
| California seller of travel bond | Required for CA CST if selling flight-inclusive packages | ☐ Contact InsureMyTrip or a travel bond specialist |
