# UTUBooking — Master Standard Operating Procedures
## Phases 1–12 · 25+ Markets · All Departments · All Scenarios

> **How to use this document**
> Each SOP has a number, owner, trigger, exact steps, and a Claude Code prompt.
> Paste the Claude Code prompt directly into the Claude Code panel to execute.
> All AI outputs require human review before external publication or sending.
>
> **SOP Numbering**
> `GBL` = Global / platform-wide · `PH#` = Phase-specific · `MKT/SAL/HR/FIN/DEV/COM` = Department · `EMG` = Emergency
>
> **Agent File Index** — read your file first before every session:
> | Agent | File |
> |-------|------|
> | Ops | `docs/ops/global-ai-operations.md` |
> | Dev | `backend/CLAUDE.md` |
> | Marketing | `marketing/CLAUDE.md` |
> | Sales | `sales/CLAUDE.md` |
> | HR | `hr/CLAUDE.md` |
> | Finance | `finance/CLAUDE.md` |
> | Compliance | `compliance/CLAUDE.md` |
> | Products | `products/CLAUDE.md` |
> | Legal | `legal/CLAUDE.md` |
> | Customer Success | `customer-success/CLAUDE.md` |
> | Fraud | `fraud/CLAUDE.md` |
> | Revenue | `revenue/CLAUDE.md` |
> | Procurement | `procurement/CLAUDE.md` |
> | Analytics | `analytics/CLAUDE.md` |
> | BizDev | `bizdev/CLAUDE.md` |
> | Corporate | `corporate/CLAUDE.md` |

---

## Master Quick Reference — All SOPs

| SOP ID | Title | Owner | Frequency |
|--------|-------|-------|-----------|
| SOP-GBL-001 | Daily AI Operations Briefing | CEO | Every morning |
| SOP-GBL-002 | Weekly Business Report | CEO / Finance AI | Every Monday |
| SOP-GBL-003 | New Feature Development Workflow | CEO / Dev AI | Per feature |
| SOP-GBL-004 | Payment Failure Response | CEO / Dev AI | Within 15 min of alert |
| SOP-GBL-005 | CLAUDE.md Brain Update | CEO | Per phase + quarterly |
| SOP-PH1-4-001 | Hotel Search & Booking Ops | CS AI / Platform | Every booking |
| SOP-PH1-4-002 | Hajj & Umrah Package Ops | Product AI + CS AI | Hajj season + Umrah year-round |
| SOP-PH1-4-003 | Monthly Financial Reconciliation | Finance AI + CEO | 1st of month |
| SOP-PH5-7-001 | New Country Market Entry Checklist | CEO + Legal AI | Before each new country |
| SOP-PH5-7-002 | Turkey Launch SOP | CEO + Dev AI | Phase 5 launch |
| SOP-PH5-7-003 | Indonesia + Malaysia Launch | CEO + Dev AI | Phase 5 launch |
| SOP-PH5-7-004 | Pakistan + India Launch | CEO + Dev AI + Legal AI | Phase 6 launch |
| SOP-PH5-7-005 | Iran Feasibility Gate | CEO + OFAC Lawyer | Phase 7 — legal gate only |
| SOP-PH8-12-001 | GDPR Compliance Operations | CEO + Legal AI | Ongoing — all EU/UK users |
| SOP-PH8-12-002 | United States Operations | CEO + Legal AI | Ongoing — all US users |
| SOP-PH8-12-003 | Brazil LGPD Operations | CEO + Legal AI | Ongoing — all Brazilian users |
| SOP-MKT-001 | Daily Content Generation | Marketing AI | Every morning |
| SOP-MKT-002 | Weekly SEO Content | Marketing AI | Every Wednesday |
| SOP-MKT-003 | Seasonal Campaign (Ramadan/Hajj) | Marketing AI + CEO | 6–8 weeks before season |
| SOP-SLS-001 | Lead Qualification & Proposal | Sales AI + CEO | Within 4 hours of new lead |
| SOP-SLS-002 | B2B Partner Onboarding | Sales AI + CEO | Per new B2B partner |
| SOP-DEV-001 | Code Review Process | Dev AI + Devs | Every Pull Request |
| SOP-DEV-002 | Hotfix Deployment | Dev AI + CEO | Production incidents only |
| SOP-DEV-003 | Database Backup Verification | Dev AI | Weekly |
| SOP-CS-001 | Customer Support Response | CS AI | < 2 hours SLA |
| SOP-CS-002 | Cancellation & Refund Process | CS AI + Finance AI | Within 24 hours of request |
| SOP-INV-001 | Weekly Inventory Health Review | Ops Agent + Revenue Agent | Every Monday |
| SOP-INV-002 | Hajj/Umrah Inventory Readiness | Ops Agent | 12 weeks before Hajj season |
| SOP-LOY-001 | Loyalty Programme Weekly Review | Ops Agent + CS Agent | Every Monday |
| SOP-LOY-002 | Monthly Points & Rewards Management | Ops Agent + Finance Agent | 1st of month |
| SOP-BKG-001 | Daily Booking Operations Review | Ops Agent + CS Agent | Every morning |
| SOP-BKG-002 | Booking Dispute & Manual Override | CS Agent + Finance Agent | Per dispute |
| SOP-WAL-001 | Wallet & Credit Operations | Finance Agent + Ops Agent | Weekly + per request |
| SOP-PRO-001 | Promo Code Lifecycle | Marketing Agent + Finance Agent | Per campaign + monthly |
| SOP-ANA-001 | Weekly KPI Dashboard Review | Analytics Agent + CEO | Every Monday |
| SOP-ANA-002 | Monthly BI Report & Alert Management | Analytics Agent | 1st of month |
| SOP-BIZ-001 | Weekly Partner Pipeline Review | BizDev Agent + CEO | Every Monday |
| SOP-BIZ-002 | New Market Entry Assessment | BizDev Agent + CEO + Legal | Per new market |
| SOP-BIZ-003 | Partnership Agreement Lifecycle | BizDev Agent + Legal | Per agreement |
| SOP-ADV-001 | Advertising Enquiry Response | BizDev Agent + CEO | Within 4h of new enquiry |
| SOP-ADV-002 | Advertising Proposal & Media Kit | BizDev Agent + CEO | Per qualified lead |
| SOP-AFF-001 | Affiliate Application Review | BizDev Agent + CEO | Weekly + within 48h |
| SOP-AFF-002 | Monthly Affiliate Payout Processing | Finance Agent + BizDev | 1st of month |
| SOP-CORP-001 | Corporate Account Onboarding | Sales Agent + CEO | Per new account |
| SOP-CORP-002 | Corporate Enquiry Response | Sales Agent + CEO | Within 4h of enquiry |
| SOP-FRD-001 | Daily Fraud Queue Review | Fraud Agent + CEO | Every morning |
| SOP-FRD-002 | Fraud Rule Governance | Fraud Agent + CEO | Per rule add/change |
| SOP-FRD-003 | Persistent Bad Actor — Watchlist | Fraud Agent | Per confirmed fraud incident |
| SOP-RVN-001 | Seasonal Pricing Rule Setup | Revenue Agent + CEO | 8 weeks before each season |
| SOP-RVN-002 | Monthly Revenue Target Review | Revenue Agent + Finance Agent | 1st of month |
| SOP-RVN-003 | Emergency Price Override | Revenue Agent + CEO | Within 2h of trigger |
| SOP-PRC-001 | Supplier Onboarding & Contracting | Procurement Agent + CEO | Per new supplier |
| SOP-PRC-002 | Monthly Contract & SLA Review | Procurement Agent | 1st of month |
| SOP-PRC-003 | Purchase Order Approval | Procurement Agent + CEO | Per PO >= SAR 10,000 |
| SOP-FIN-001 | Payment Gateway Reconciliation | Finance Agent | Monthly — 1st of month |
| SOP-FIN-002 | Currency Risk Monitoring | Finance Agent + CEO | Weekly |
| SOP-HR-001 | New Employee Onboarding | HR Agent + Legal | Per new hire |
| SOP-HR-002 | Outsourced Developer Management | HR Agent + Dev Agent | Per new contractor |
| SOP-COM-001 | GDPR Erasure Request Processing | Compliance Agent | Per request — 30-day SLA |
| SOP-COM-002 | CCPA Opt-Out Processing | Compliance Agent | Per request — 45-day SLA |
| SOP-COM-003 | LGPD Request Processing | Compliance Agent | Per request — 15-day SLA |
| SOP-COM-004 | PIPEDA Request Processing | Compliance Agent | Per request — 30-day SLA |
| SOP-COM-005 | KVKK Request Processing | Compliance Agent | Per request — 30-day SLA |
| SOP-CRM-001 | Daily Deal Pipeline Review | Sales Agent + CEO | Every morning |
| SOP-CRM-002 | Hotel Partner Pipeline Review | Sales Agent + Revenue Agent | Every Monday |
| SOP-OPS-001 | Daily Incident Management | Ops Agent + Dev Agent | Every morning + on alert |
| SOP-OPS-002 | Support Ticket Queue Management | Ops Agent + CS Agent | Every morning + hourly (urgent) |
| SOP-EMG-001 | Platform Outage Response | CEO + Dev AI | When uptime < 99% / 5 min |
| SOP-EMG-002 | Data Breach Response | CEO + Legal AI | Immediately on detection |
| SOP-EMG-003 | Claude AI Agent Malfunction | CEO | When AI output is problematic |
| SOP-EMG-004 | GDS / Hotel API Failure | Dev Agent + Ops Agent | On API failure alert |
| SOP-EMG-005 | DDoS or Security Incident | CEO + Dev Agent | Immediately on detection |
| SOP-EMG-006 | Regulatory Inquiry or Audit | CEO + Legal + Compliance | Within 24h of inquiry |

---

# SECTION 1 — Platform-Wide SOPs

---

## GBL-001 · Daily AI Operations Briefing

**Owner:** CEO / Founder &nbsp;|&nbsp; **Frequency:** Every morning, 7 days/week

**Purpose:** Start every working day with a complete picture of all active markets, technical health, revenue, and priorities — generated by Claude AI in under 10 minutes.

**Trigger:** First task each morning, before any other work.

### Step 1 — Paste into Claude Code

```
Good morning. Run the UTUBooking global operations briefing.

Check and report on:
1. TECHNICAL: GitHub Actions — any failed CI/CD pipelines overnight?
   AWS health: all 6 regions (Bahrain, Frankfurt, London, Virginia, Montreal, São Paulo).
   Error rates: Stripe EU/UK/US, PayPal, Pix, MercadoPago, STC Pay, Mada.
   Any API timeouts from Amadeus GDS, Hotelbeds, or Booking.com?
   Any latency > 300ms or error rate > 0.5%? Flag immediately.

2. COMPLIANCE: Any new GDPR erasure requests from EU/UK users?
   Any CCPA opt-out requests from California?
   Any LGPD requests from Brazil? Any PIPEDA requests from Canada?
   Any overdue requests (GDPR >30d, CCPA >45d, LGPD >15d, PIPEDA >30d)?

3. REVENUE: Yesterday bookings by region:
   MEANA (KSA/UAE/KWT/JOR/MAR/TUN) · Muslim World (TR/ID/MY/PK/IN) ·
   Europe (GB/DE/FR/NL/ES/IT/PL) · North America (US/CA) · LATAM (BR/AR/CO/CL/MX).
   Revenue in local currency + USD equivalent. Compare to 7-day average.
   Flag any drop > 15%.

4. CUSTOMERS: New user registrations yesterday by region.
   Support tickets open > 24 hours? Flag by severity.

5. PIPELINE: HubSpot — new leads added yesterday?
   Any deals moved stage? Any proposals pending CEO approval?

Output: Exactly 10 bullet points. Items needing immediate action: flag 🔴.
Items needing review today: flag 🟡. All clear: flag 🟢.
```

### Step 2 — Action Triage

- **🔴 items** → assign to relevant department agent immediately; log in Notion Daily Ops
- **Payment failures** → escalate to Dev Agent + affected gateway support; run EMG-001
- **Compliance overdue** → escalate to Compliance Agent; run relevant COM-00X SOP
- **AWS issues** → run EMG-002 or EMG-004 as appropriate
- **Data breach indicators** → stop all other work; run EMG-003 immediately

### Step 3 — Log and Close

```
Log today's briefing complete. All 🔴 items triaged and assigned.
Update Notion Daily Ops Log for [DATE].
Post 3-line summary to #daily-ops in Slack:
Line 1: Revenue vs 7-day avg (green/yellow/red)
Line 2: Compliance — any open requests count
Line 3: Top action item for today
```

| | |
|---|---|
| **Time required** | 8–12 minutes |
| **Output** | 10-bullet briefing · Notion log entry · Slack post |
| **Escalation** | 3+ 🔴 items → schedule 30-min CEO review call |
| **Metric** | Target: < 2 🔴 items/day averaged over rolling 30 days |

---

## GBL-002 · Weekly Global Report

**Owner:** CEO / Founder &nbsp;|&nbsp; **Frequency:** Every Monday morning

**Purpose:** Consolidated view of revenue, compliance, AI ROI, and priorities for the week ahead.

**Trigger:** Monday, immediately after GBL-001 daily briefing.

### Step 1 — Generate Report

```
Generate the UTUBooking weekly report for the week ending [SUNDAY DATE].

Read from: Notion (MCP), HubSpot (MCP), Slack (MCP), backend analytics read replicas.
Use getShardPool() per region — never query main write replicas for reporting.

## Revenue by Region
MEANA: SAR/AED/EGP/KWD/JOD/MAD/TND bookings — total USD equiv + WoW change
Muslim World: TRY/IDR/MYR/PKR/INR — total USD equiv + WoW change
Europe: GBP/EUR — total USD equiv + WoW change
North America: USD/CAD — total USD equiv + WoW change
South America: BRL/ARS/COP/CLP/MXN — total USD equiv + WoW change
TOTAL GMV: USD + WoW % + vs 4-week avg

## Compliance Dashboard
GDPR (EU/UK) — open: X  |  closed this week: X  |  overdue: X
CCPA (US/CA)  — open: X  |  closed this week: X  |  overdue: X
LGPD (BR)     — open: X  |  closed this week: X  |  overdue: X
PIPEDA (CA)   — open: X  |  closed this week: X  |  overdue: X
KVKK (TR)     — open: X  |  closed this week: X  |  overdue: X
⚠️ Any overdue: list by user_id + days overdue + SLA law

## AI ROI This Week
Content pieces generated by Claude (no human writing needed): X
Proposals generated by Sales Agent: X
Dev commits authored by Claude vs total commits: X / Y
Support tickets resolved by AI without escalation: X
Estimated hours saved vs manual equivalent: ~X hrs

## Sales Pipeline
New leads: X  |  Deals moved to Proposal: X  |  Deals Won: X  |  Total pipeline value: USD X
Top opportunity this week: [deal name, stage, value]

## Top 3 Priorities for the Week
1. [Highest impact item — from pipeline/compliance/dev velocity]
2. [Second priority]
3. [Third priority]

Post to #ceo-reports in Slack when complete.
Save to Notion > Weekly Reports > [WEEK DATE].
```

### Step 2 — Review and Distribute

- Review AI-generated report; add CEO commentary where needed
- Share with department heads in Slack #ceo-reports
- Update OKR tracker in Notion if any metrics cross threshold

| | |
|---|---|
| **Time required** | 15–20 minutes |
| **Output** | Weekly report in Notion + Slack post |
| **Escalation** | Revenue WoW drop > 20% → emergency revenue review meeting |

---

## GBL-003 · Monthly Financial & Compliance Close

**Owner:** Finance Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** Last business day of each month

**Purpose:** Reconcile all payment gateways, confirm compliance SLA adherence, review loyalty liability, and generate the monthly close report.

**Trigger:** Last business day of month, after markets close.

### Step 1 — Financial Reconciliation

```
Run UTUBooking monthly financial close for [MONTH YEAR].

1. STRIPE RECONCILIATION (EU/UK/US/CA):
   Query Stripe payouts for [MONTH] — match against booking revenue in DB by region.
   Unmatched transactions > $500 USD equivalent: list with booking_id and amount.
   Net settlement per region (GBP/EUR/USD/CAD): export to finance/reconciliation/[MONTH].

2. MERCADOPAGO (AR/CO/CL/MX/PE/UY):
   Pull MercadoPago settlement report for [MONTH].
   ARS transactions: calculate USD equivalent at mid-month rate (flag if ARS moved > 5%).
   Unmatched: list.

3. PIX + BOLETO (Brazil via Stripe BR):
   Pix completions vs initiated: calculate abandon rate. Target < 5%.
   Boleto: any expired (not paid within 3 days)? Rebook or cancel affected bookings.
   Net BRL settlement: export.

4. INTERAC/BAMBORA (Canada):
   Pull Bambora settlement for [MONTH] in CAD.
   Match to Canadian bookings in DB.

5. STC PAY + MADA (KSA):
   Pull gateway settlement reports in SAR.
   Match to KSA booking records.

Flag any gateway with settlement variance > 0.5%. Generate reconciliation summary.
```

### Step 2 — Compliance Close

```
Compliance close for [MONTH YEAR].

1. GDPR (EU/UK):
   SELECT * FROM gdpr_erasure_log WHERE created_at BETWEEN '[START]' AND '[END]';
   Any row where completed_at IS NULL AND created_at < NOW() - INTERVAL '30 days' = BREACH.
   Count new consents granted vs withdrawn this month by law.

2. LGPD (Brazil):
   SELECT * FROM lgpd_access_log WHERE solicitado_em BETWEEN '[START]' AND '[END]';
   Any overdue > 15 business days = BREACH. Report to BR_DPO_EMAIL.

3. CCPA (US):
   SELECT * FROM privacy_preferences WHERE ccpa_opted_out_at BETWEEN '[START]' AND '[END]';
   Any opt-out request unprocessed > 45 days = BREACH.

4. PIPEDA (Canada):
   SELECT * FROM pipeda_consent WHERE created_at BETWEEN '[START]' AND '[END]';
   Any unresolved > 30 days = BREACH.

5. BREACH INCIDENTS: Any security incidents this month?
   Confirm all were logged in breach_log and notified to regulators within 72h.

6. CONSENT LOG STATS:
   New consents by law (GDPR/LGPD/KVKK/CCPA) — granted vs withdrawn.
   Net consent trend: growing or declining?

Output: compliance_close_[MONTH].md — save to compliance/monthly/.
```

### Step 3 — Loyalty & Retention

```
Loyalty close for [MONTH YEAR].

1. New loyalty members this month by region.
2. Points issued vs redeemed — net liability in USD equivalent.
3. Churned users (no booking in 90 days, previously active): count by region.
   Should we trigger re-engagement campaign? Threshold: > 500 churned in any region.
4. Average booking value by region trend (MoM).
```

### Step 4 — Infrastructure Cost

```
AWS cost review for [MONTH YEAR].

Pull from AWS Cost Explorer:
- Cost by region (Bahrain/Frankfurt/London/Virginia/Montreal/São Paulo)
- Cost vs last month + % change
- Top 3 cost drivers per region (RDS, ECS, data transfer, Lambda)
- Any service with > 20% MoM cost increase: flag with explanation
- Redis memory usage per region: if > 80% capacity, schedule cleanup

Recommendation: any cost optimisation actions for next month?
```

| | |
|---|---|
| **Time required** | 60–90 minutes total (AI-assisted) |
| **Output** | Reconciliation report · Compliance close report · Notion Finance/Monthly Close entry · Slack #finance-close post |
| **Escalation** | Any compliance breach → P1 → notify Privacy Officer + Legal Agent immediately |

---

## GBL-004 · Quarterly Board & Investor Report

**Owner:** CEO &nbsp;|&nbsp; **Frequency:** First week of each new quarter

**Purpose:** Investor-ready summary of revenue, growth, market expansion, AI ROI, compliance, and Q+1 outlook.

**Trigger:** Q+1 Day 1–5; schedule 48h before board call.

### Step 1 — Generate Report

```
Generate UTUBooking quarterly board report for Q[X] [YEAR].

Read from: Notion (MCP), HubSpot (MCP), backend analytics, AWS Cost Explorer, git log.

## Executive Summary
One paragraph: headline GMV, key market wins, key challenge, one forward-looking statement.

## Revenue & Growth
- GMV by region (MEANA / Muslim World / Europe / North America / LATAM) in USD
- QoQ growth per region + YoY growth per region
- Top 3 revenue markets this quarter
- Average booking value by region — QoQ trend
- Hajj/Umrah seasonality impact: Ramadan lift % vs non-Ramadan baseline

## Market Expansion
- New markets launched this quarter (date, revenue in first 30 days)
- Markets in pipeline for Q+1 (country, expected launch, gating items)
- Key partnerships signed: hotel chains, airlines, payment gateways

## Product & Engineering
- Features shipped (from git log + Notion sprint notes): list with user impact
- Claude Code AI ROI this quarter:
  * Content pieces: X | Proposals: X | Dev commits (Claude-authored): X of Y total
  * Estimated FTE-equivalent saved: X (at $X/hr blended)
  * Cost of Claude Code licences vs FTE equivalent saved: ROI ratio
- Uptime SLA: target 99.9% — actual Q performance per region
- Technical debt: top 3 items from dev team + recommended resolution quarter

## Compliance & Risk
- Total privacy requests processed: GDPR X / CCPA X / LGPD X / PIPEDA X / KVKK X
- Any regulatory incidents, fines, or near-misses this quarter
- Upcoming compliance deadlines Q+1: new regulations, licence renewals, ICO fees
- Key regulatory risks: flag any new laws in pipeline markets

## Financial Outlook Q+1
- Revenue forecast by region (bottom-up from pipeline + seasonal calendar)
- Key risks: ARS currency volatility / Hajj quota changes / new market regulatory risk
- Recommended budget: engineering vs marketing vs compliance vs infrastructure
- Headcount plan: any new hires needed in Q+1?

Format: investor-ready Markdown. No jargon. Quantify everything.
Save to Notion > Board > Quarterly Reports > Q[X] [YEAR].
Draft email to CEO with report attached — do NOT send; wait for CEO approval.
```

| | |
|---|---|
| **Time required** | 30–45 minutes |
| **Output** | Board report in Notion · Draft email ready for CEO review |
| **Escalation** | Any YoY revenue decline → CEO prepares narrative explanation before distribution |

---

## GBL-005 · New Market Launch Workflow

**Owner:** CEO + Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** Per new country launch

**Purpose:** Ensure every new country launch is technically complete, legally compliant, and commercially ready before going live.

**Trigger:** CEO decision to launch in a new country; minimum 4 weeks before target go-live.

### Step 1 — Launch Preparation Audit

```
Launch preparation for [COUNTRY NAME] ([ISO-2 code]).
Target go-live: [DATE].

1. TECHNICAL CHECKLIST:
   ☐ Add [CC] to PaymentRouter.ts with correct primary + secondary gateways
   ☐ Add [CC] to backend/shared/shard-router.js with correct DB_URL region
   ☐ Add [locale] to frontend/src/i18n/config.ts with currency + font + RTL flag
   ☐ Create frontend/locales/[locale].json with all required keys
   ☐ Add [CC] to GDPRConsentBanner if EU/EEA; LGPDBanner if Brazil; PIPEDAPrivacyNotice if Canada
   ☐ Add departure airports to backend/services/flight/src/config/amadeus-airlines.json
   ☐ Add [locale] to push notification templates in /api/notifications/push/route.ts
   ☐ Verify shard-router.js routes [CC] to correct AWS region (see region table in global-ai-operations.md)

2. COMPLIANCE CHECKLIST:
   ☐ Which privacy law applies? (GDPR / LGPD / PIPEDA / CCPA / local / none yet)
   ☐ Is a Data Processing Agreement needed with local payment provider?
   ☐ Is a local legal entity required? (revenue threshold, tax registration)
   ☐ Add country to compliance/dpa-register.md
   ☐ Draft privacy policy addendum in local language
   ☐ Any content restrictions? (Iran: Legal Agent review required)

3. MARKETING CHECKLIST:
   ☐ Add [country] section to marketing/CLAUDE.md with platform/tone/language/hashtag rules
   ☐ Draft launch announcement in local language (requires native speaker review)
   ☐ Identify WhatsApp / TikTok / LinkedIn / local platform strategy
   ☐ Prepare halal/Umrah content specific to this Muslim community

4. INFRASTRUCTURE CHECKLIST:
   ☐ Does this country require a new AWS region for data residency?
   ☐ If yes: create CloudFormation stack; add to Route53 geoproximity routing
   ☐ Add to global morning briefing prompt (GBL-001)
   ☐ Add to weekly compliance dashboard (GBL-002)

5. GENERATE LAUNCH CHECKLIST:
   Create docs/launch/[cc]-launch-checklist.md following the format of docs/launch/uk-launch-checklist.md.
   Include all ☐ items above with owner, due date, and verification method.
```

### Step 2 — Pre-Launch Verification (48h before go-live)

```
Pre-launch verification for [COUNTRY] — 48 hours before go-live.

Run through docs/launch/[cc]-launch-checklist.md.
For each unchecked item: is it a go-live blocker? Mark YES/NO with reason.
Any blocker unchecked = DO NOT launch. Report to CEO with ETA to resolve.

Test end-to-end booking flow for [CC] user:
1. Search hotels in [destination]
2. Select payment method [primary gateway for CC]
3. Complete booking to 'pending' status
4. Trigger test webhook from [gateway] → confirm booking moves to 'confirmed'
5. Confirm push notification sent in [locale]
6. Confirm compliance banner shown (if required)

Report: PASS / FAIL per step. Any FAIL = launch blocked.
```

| | |
|---|---|
| **Time required** | 2–3 hours for full audit; 30 min for pre-launch verification |
| **Output** | Launch checklist at `docs/launch/[cc]-launch-checklist.md` · Pre-launch verification report |
| **Escalation** | Any blocker on go-live day → CEO decision: delay or proceed with documented risk |

---

## GBL-006 · PR Code Review (Outsourced Dev Team)

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Every new PR from outsourced developers

**Purpose:** Enforce UTUBooking code standards before merge. Prevent shard router violations, payment hardcoding, i18n gaps, and data residency breaches.

**Trigger:** New PR opened in GitHub from outsourced dev team.

### Step 1 — Automated Review

```
Review PR #[NUMBER] from outsourced dev team.

Read the diff. Check against all rules in backend/CLAUDE.md.

MANDATORY CHECKS (any failure = REQUEST CHANGES, do not approve):

1. SHARD ROUTER: All DB queries use getShardPool(countryCode) from backend/shared/shard-router.js.
   No hardcoded DATABASE_URL, DB_URL_KSA, or direct pg.Pool() instantiation. ❌ if found.

2. PAYMENT ROUTING: All payment calls go through PaymentRouter.getGateway(countryCode).
   No hardcoded gateway names ('stripe', 'stcpay') outside PaymentRouter.ts. ❌ if found.

3. i18n COVERAGE: Any new user-facing string has translations in ALL 15 locales:
   en ar fr tr id ms ur hi fa de en-GB it nl pl es pt-BR es-419
   Run: npm run i18n:validate (check output for missing keys). ❌ if any locale missing.

4. DATA RESIDENCY: No EU/UK user data written to non-eu-west-2/eu-central-1 regions.
   No BR user data written outside sa-east-1. No CA data written outside ca-central-1. ❌ if found.

5. CONSENT GATE: Any marketing communication (email, push, WhatsApp) checks consent_logs
   before sending to EU/BR users. emailGuard.ts or analyticsGuard.ts middleware used. ❌ if missing.

6. SECRETS: No sk_live_, API keys, passwords, or tokens committed.
   No .env values hardcoded. All secrets via process.env. ❌ if found.

7. WCAG 2.1 AA: New React/TSX components have:
   accessibilityRole, accessibilityLabel, min-h-[44px] on all pressables. ❌ if missing.

8. TEST COVERAGE: Payment code changes have unit tests.
   Compliance code changes have tests. Run: npm test -- --testPathPattern=payment ❌ if failing.

Output: For each check: ✅ PASS or ❌ FAIL [line number + specific issue].
Summary: APPROVE / REQUEST CHANGES / NEEDS DISCUSSION.
Post review as GitHub PR comment.
```

### Step 2 — Security Scan

```
Security scan for PR #[NUMBER].

Check for:
- SQL injection: any raw string interpolation in DB queries (use parameterised queries only)
- XSS: any dangerouslySetInnerHTML without sanitisation
- CORS: any new CORS rule wider than utubooking.com domains
- Rate limiting: any new public endpoint without rate limit middleware
- Auth: any new endpoint missing authenticateToken middleware (except explicit public routes)

Flag any issue as SECURITY CONCERN. Request changes before merge.
```

| | |
|---|---|
| **Time required** | 10–20 minutes per PR |
| **Output** | GitHub PR comment with ✅/❌ per check + APPROVE/REQUEST CHANGES verdict |
| **Escalation** | Security concern found → do not merge; escalate to CEO + flag in #security-alerts |

---

## GBL-007 · Seasonal Operations — Ramadan & Hajj

**Owner:** CEO + Marketing Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Annual (see calendar)

**Purpose:** Maximise Ramadan Umrah bookings and ensure Hajj season infrastructure is ready.

### Ramadan Activation (6 weeks before Ramadan start)

```
Activate Ramadan/Umrah campaign across all 25 markets.

1. CONTENT: Generate Ramadan Umrah campaign content for each active market.
   For each: headline, 3 social posts, 1 WhatsApp template, email subject + preview.
   Markets: KSA, UAE, TR, ID, MY, PK, IN, GB, DE, FR, US, CA, BR.
   Language: use market locale from marketing/CLAUDE.md. Flag each for native review.
   Tone: warm, spiritual, aspirational. No urgency/scarcity pressure in EU (ASA guidelines).

2. PRICING: Enable Ramadan pricing multiplier in pricing service.
   Recommended multiplier: 1.15–1.35 for hotels within 500m of Haram.
   Update backend/services/pricing/src/services/season.js if Ramadan dates changed.

3. WHATSAPP BR: Prepare 'ramadan_greeting' template broadcast for Brazilian subscribers.
   Template: utu_ramadan_umrah_ptbr — confirm Meta approval status before sending.
   Schedule: send first day of Ramadan, 9am São Paulo time.

4. PUSH NOTIFICATIONS: Queue Ramadan greeting for all opted-in users.
   Use /api/notifications/push with trigger: 'ramadan_greeting' per locale.

Output: Ramadan content package per market ready for human review.
```

### Hajj Pre-Warm (May 19 annually)

```
Activate Hajj pre-warm infrastructure — May 19.

1. ECS SCALING: Trigger pre-warm cron (CloudFormation stack 02 update).
   Bump minimum ECS tasks: hotel +100%, payment +50%, auth +50%.
   Cron already configured: '0 0 19 5 ? *' — verify it fired at midnight.

2. HEALTH CHECKS: Switch Route53 health checks from 30s to 10s interval.
   CloudFormation stack 09 — HajjMode parameter = true.

3. MONITORING: Set PagerDuty alert thresholds to Hajj-mode sensitivity.
   P99 latency threshold: 500ms (from 800ms normal). Error rate: 0.1% (from 0.5%).

4. LOAD TEST: Run load-tests/artillery/scenarios/booking-flow-500c.yml
   Confirm P95 < 800ms, P99 < 2s, errors < 0.5% at 500 concurrent users.

5. TEAM ALERT: Post to #all-hands in Slack:
   "Hajj season begins May 26. All-hands monitoring May 26–June 2.
   On-call rota: [assign names]. Escalation: WhatsApp CEO directly for P1."

Verify: all 6 AWS regions healthy, no pending migrations, no open P1 bugs.
```

### Hajj Scale-Back (May 27)

```
Post-Hajj infrastructure scale-back — May 27.

1. Restore ECS minimums to pre-Hajj values (CloudFormation stack 02).
2. Restore Route53 health check interval to 30s (HajjMode = false).
3. Restore PagerDuty thresholds to normal.
4. Generate Hajj season revenue report:
   Total bookings, GMV, top source markets, average booking value.
   Compare to previous Hajj season.
   Save to Notion > Annual Reports > Hajj [YEAR].
```

| | |
|---|---|
| **Metric** | Hajj season: target 99.9% uptime May 26–June 2 · Ramadan: target 30% revenue uplift vs baseline |

---

## GBL-008 · AWS Multi-Region Health Check

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Daily (automated) + on-demand

**Purpose:** Verify all 6 AWS regions are healthy, latency is within SLA, and no silent failures are occurring.

### Step 1 — Run Health Check

```
Run full AWS multi-region health check.

For each region: me-south-1 (Bahrain) | eu-central-1 (Frankfurt) | eu-west-2 (London) |
us-east-1 (Virginia) | ca-central-1 (Montreal) | sa-east-1 (São Paulo)

Report:
1. ECS task health: running tasks vs desired count per service
2. RDS: primary + read replica status, connection count, CPU %, replication lag
3. Redis/ElastiCache: memory usage %, eviction rate, connected clients
4. ALB: request count, 4xx rate, 5xx rate, p99 latency (last 1h)
5. Route53: health check status for each endpoint
6. CloudWatch alarms: any in ALARM state?

Format: table with region × metric. 🟢 healthy | 🟡 warning | 🔴 critical.
If any region 🔴: run EMG-002 immediately.
```

| | |
|---|---|
| **Time required** | 5 minutes |
| **Output** | Health table in Claude Code output + Slack post to #infrastructure |
| **Escalation** | Any 🔴 region → EMG-002 |

---

## GBL-009 · AI Agent Handoff Protocol

**Owner:** CEO &nbsp;|&nbsp; **Frequency:** When switching between agents or ending a session

**Purpose:** Ensure no context, action items, or pending work is lost between Claude Code sessions.

**Trigger:** Before closing Claude Code at end of any session; when switching between agent roles.

### Step 1 — Session Close

```
Session close — [DATE TIME].

Summarise this session:
1. What was completed? (list with file paths changed)
2. What is pending / in progress? (list with next action needed)
3. Any decisions deferred for CEO review?
4. Any new environment variables or secrets needed?
5. Any compliance items created (GDPR/CCPA/LGPD requests, consent logs)?

Save summary to Notion > Daily Ops Log > [DATE] — Session [N] Close.
Post to #dev or #ops Slack channel depending on session type.
```

### Step 2 — New Session Open

```
Session start — [DATE TIME].

Read:
1. Notion Daily Ops Log > [DATE] — most recent session close summary
2. My agent CLAUDE.md file: [backend/CLAUDE.md or marketing/CLAUDE.md etc]
3. docs/ops/global-ai-operations.md — quick refresh on rules

Report: what pending items exist from last session?
Confirm: which tasks to prioritise this session.
```

| | |
|---|---|
| **Rule** | NEVER start work without reading your agent CLAUDE.md file first |

---

## GBL-010 · Annual Compliance Audit

**Owner:** Compliance Agent + CEO &nbsp;|&nbsp; **Frequency:** January of each year

**Purpose:** Annual review of all privacy compliance obligations, data inventory, DPA register, and regulatory filings.

### Step 1 — Data Inventory Review

```
Annual compliance audit — [YEAR].

1. DATA INVENTORY: Review compliance/gdpr/dpa-register.md.
   All current data processors listed? Any new payment gateways or third-party services added this year?
   Add any missing processors with their DPA status.

2. PRIVACY POLICIES: Are all privacy policies current?
   Check: /privacy page · GDPR section · CCPA section · LGPD section.
   Any new data types collected this year not reflected in the policy? Flag for update.

3. RETENTION REVIEW: Are data retention periods being enforced?
   Users inactive > 3 years: review for deletion (retain booking records per tax law).
   Analytics data > 13 months: purge per policy.
   Consent logs: permanent retention — confirm backup policy.

4. REGULATORY FILINGS:
   ICO (UK): annual data protection fee paid? (utubooking.com + ICO ref number)
   ANPD (Brazil): data controller registration current?
   CNIL (France): any specific French filing requirements?
   Any new markets requiring registration this year?

5. DPO REVIEW:
   DPO contact current at all regulators?
   DPO_EMAIL resolves to active human? Confirm.

Output: Annual compliance audit report — save to compliance/annual/[YEAR]-audit.md.
Action items list for CEO — flag any with regulatory deadline.
```

| | |
|---|---|
| **Time required** | 2–3 hours |
| **Output** | Audit report · Action items with deadlines · DPA register update |
| **Escalation** | Any overdue regulatory filing → Legal Agent immediately + calendar deadline |

---

# SECTION 2 — Phase SOPs

---

## PHASES 1–4 — IMPLEMENTED & LIVE
### MEANA Foundation SOPs
**Egypt · Saudi Arabia · UAE · Jordan · Kuwait · Bahrain · Morocco · Tunisia**

### Current Live Status — Phase 1–4 Achievements

| Status | Feature |
|--------|---------|
| ✅ | Platform live: hotels, flights, car rentals — EN + AR, RTL support |
| ✅ | AWS Bahrain (me-south-1) — primary region, 99.9% uptime |
| ✅ | Payments: STC Pay + Mada + Stripe — SAR, AED, USD |
| ✅ | Amadeus GDS + Sabre GDS — full flight inventory |
| ✅ | Hotelbeds — 300+ Makkah hotels, Haram proximity filter live |
| ✅ | React Native mobile app — iOS + Android |
| ✅ | Loyalty engine: Silver / Gold / Platinum |
| ✅ | AMEC AI Assistant embedded — claude-sonnet-4-6 |
| ✅ | 9 Claude AI agents operational — all CLAUDE.md files active |
| ✅ | CarTrawler car rentals — KSA + UAE + Egypt airports |
| ✅ | White-label B2B engine — available for travel agency partners |
| ✅ | MEANA B2B presence: Jordan, Kuwait/Bahrain, Morocco/Tunisia |

---

## PH1-4 001 · Hotel Search & Booking Operations

**Owner:** CS Agent (AI) + Platform &nbsp;|&nbsp; **Frequency:** On every booking

**Purpose:** Standard operational procedure for all hotel search and booking flows across all 8 MEANA markets (Phase 1–4). Covers success path, failure handling, and escalation.

### Standard Booking Flow

1. User searches hotel: location + dates + guests → API calls Hotelbeds + Booking.com via `searchHotelsRouted(params)` from `backend/adapters/hotels/hotelSearchRouter.ts`
2. Results cached in Redis (10-minute TTL) — serve cached results on repeat searches within TTL window
3. User selects hotel → availability check → show final price with all taxes included
4. User proceeds to payment → `PaymentRouter.getGateway(countryCode)` routes to correct gateway
5. Payment confirmed → PNR generated → confirmation email + SMS sent automatically
6. Booking stored in PostgreSQL via `getShardPool(countryCode)` + synced to HubSpot CRM as deal

**Hotel routing rules:**
- EU/UK users → Booking.com primary (Hotelbeds fallback)
- Makkah/Madinah → Hotelbeds only (Haram proximity filter active)
- All other markets → Hotelbeds primary

### Failure Handling

| Failure scenario | Response |
|-----------------|----------|
| Hotel unavailable post-selection | Show alternatives within same area + price range. Auto-suggest via Claude: `"User selected [hotel] but it is now unavailable. Suggest 3 alternatives within [Xkm] at similar price range [currency]."` |
| Payment declined | Show specific error message + alternative payment method. Never lose the booking data — preserve in `bookings` table with status `payment_failed`. |
| Hotelbeds API timeout (> 500ms) | Serve from Redis cache if available. Show "limited availability" notice. If cache miss: graceful fallback to Booking.com adapter. |
| Booking confirmation email fails | Queue in Redis `email:retry:{bookingId}`. Retry 3× with exponential backoff. If still failing: fallback to SMS confirmation via Twilio. |
| Redis cache miss + both APIs down | Show maintenance page. Log to ELK. Trigger EMG-004. |

### Monitoring

Check daily in OPS-001:
- Hotelbeds API: response time p95 < 500ms, error rate < 1%
- Booking.com API: response time p95 < 800ms, error rate < 1%
- Hotel booking conversion rate: flag if > 15% drop vs 7-day avg
- Confirmation email delivery rate: flag if < 98%

---

## PH1-4 002 · Hajj & Umrah Package Operations

**Owner:** Product Agent (AI) + CS Agent &nbsp;|&nbsp; **Frequency:** Hajj season + year-round Umrah

**Purpose:** Define the full build, validation, and payment flow for Hajj and Umrah packages — covering group bookings, national quota display, and the non-negotiable Islamic requirements that must be present on every screen.

### Hajj/Umrah Package Build Flow

1. Pilgrim selects: departure city + travel dates + group size + budget range
2. `HajjPackageBuilder` assembles: flight (Amadeus GDS) + Makkah hotel (Haram proximity ≤ 500m via Hotelbeds `isUmrah:true`) + Madinah hotel + airport transfer
3. Display for every hotel result: distance from Masjid al-Haram, prayer times widget (LOCAL timezone of hotel — not user device), Qibla direction
4. Group booking (2–50 pilgrims): `GroupBookingService` generates single PNR reference covering all passengers
5. KSA / UAE / Egypt pilgrims: show national Hajj quota status via `getQuotaProvider(countryCode)` — `NationalQuotaCard` component
6. Payment: allow installments for packages > SAR 5,000 — present payment plan options before checkout

### Critical Islamic Requirements — Never Compromise

| Requirement | Rule | Failure response |
|-------------|------|-----------------|
| Haram distance | ALL Makkah hotel descriptions must include exact walking distance to Masjid al-Haram | Block hotel display if distance data missing — do not show hotel without it |
| Qibla direction | Must be shown on EVERY hotel page — not just Makkah properties | Show globally; use hotel GPS coordinates to calculate bearing to Makkah |
| Prayer times | Must reflect LOCAL time zone of the hotel — not user device time | Use hotel's city timezone from DB; never `new Date()` local time |
| Ramadan pricing | Must update automatically — Ramadan premium is 40–80% above standard rates | AI pricing engine activates Ramadan multiplier; verify `pricing:ramadan:active` Redis key is set before Ramadan start |
| Female pilgrims | No solo Hajj booking — Mehram verification required for Pakistan + India | Block solo female Hajj booking for PK + IN; show Mehram requirement notice; Umrah solo is permitted |
| Islamic calendar | Show Hijri dates alongside Gregorian on all booking screens | Use `intl-hijri` or equivalent — never show Gregorian only on Hajj/Umrah screens |

### Package Quality Check Prompt

```
Hajj/Umrah package operations check — [DATE].

1. HAJJPACKAGEBUILDER:
   Load /us/umrah-packages (US departure) and /{locale}/umrah-packages for SA + AE.
   Package builder rendering? Departure city picker present? ✅/❌

2. HOTEL RESULTS — ISLAMIC REQUIREMENTS:
   Trigger a Makkah hotel search. For the top 3 results, verify:
   - Haram walking distance shown (metres or minutes)? ✅/❌
   - Qibla direction displayed? ✅/❌
   - Prayer times widget present and using hotel local timezone? ✅/❌
   - Hijri date shown alongside Gregorian on booking screen? ✅/❌

3. GROUP BOOKING:
   Test GroupBookingService with group_size=5 — single PNR reference returned? ✅/❌
   Price = 5 × individual price (pre-discount baseline)? ✅/❌

4. NATIONAL QUOTA:
   NationalQuotaCard for SA: quota data present? ✅/❌
   NationalQuotaCard for AE: ✅/❌
   NationalQuotaCard for EG: ✅/❌

5. INSTALLMENT PAYMENTS:
   Create test package > SAR 5,000. Installment option displayed at checkout? ✅/❌
   Installment plan shows correct schedule (3/6/12 months)? ✅/❌

6. RAMADAN PRICING (run in Oct–Nov for next Ramadan):
   pricing:ramadan:active Redis key set? TTL correct (expires after Ramadan ends)? ✅/❌
   Hotel price for Ramadan dates showing 40–80% premium vs non-Ramadan dates? ✅/❌

7. MEHRAM GATE (PK + IN):
   Attempt solo female Hajj booking for PK user → blocked? ✅/❌
   Error message shown? ✅/❌

Report all ❌. Any Islamic requirement failure is P1 — do not release until resolved.
```

### Failure Handling

| Failure | Impact | Response |
|---------|--------|----------|
| Haram distance data missing from Hotelbeds response | Hotel cannot be shown | Hide hotel from results; log to ELK; flag to Dev Agent. Do NOT show hotel without distance. |
| Prayer times API unreachable | Widget shows error | Fallback: show static prayer times from last-cached value. Log cache miss. P1 if > 1h. |
| Ramadan pricing not activating | Pilgrims undercharged 40–80% | **P0** — check `pricing:ramadan:active` Redis key; check AI pricing service (port 3011); escalate to Dev Agent + CEO immediately |
| GroupBookingService PNR failure | Group left without confirmation | Preserve all passenger data; send manual confirmation email; Dev Agent to resubmit via Amadeus Orders API |
| Installment option not showing | Revenue impact | Flag to Products Agent; check `INSTALLMENTS_ENABLED` env var and threshold config |

---

## PH1-4 003 · Monthly Financial Reconciliation

**Owner:** Finance Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Complete financial close for all MEANA markets — reconciling all gateways against the database, producing the P&L, VAT summary by jurisdiction, outstanding B2B billings, and a 90-day cash flow projection.

### Step 1 — Run the Finance Close Prompt

On the 1st of each month, paste into Claude Code:

```
Run monthly financial reconciliation for UTUBooking — [MONTH YEAR].

1. TRANSACTIONS:
   Pull all booking transactions from database for [month]:
   SELECT id, country_code, currency, amount_local, amount_usd, gateway,
          product_type, created_at, status
   FROM payments
   WHERE status = 'completed'
     AND created_at >= '[MONTH-01]' AND created_at < '[MONTH+1-01]'
   ORDER BY country_code, created_at;

2. GATEWAY RECONCILIATION:
   Cross-reference with:
   - Stripe dashboard settlement report for [month]
   - STC Pay settlement report for [month]
   - Mada settlement report for [month]
   Identify any unmatched transactions (database vs gateway).
   Flag any variance > SAR 100 / USD 30.

3. P&L STATEMENT:
   Revenue by market:
   SELECT country_code, currency,
          SUM(amount_usd) AS gross_bookings,
          SUM(amount_usd * supplier_cost_pct) AS supplier_costs,
          SUM(amount_usd * (1 - supplier_cost_pct)) AS net_revenue
   FROM payments
   WHERE status='completed' AND [month filter]
   GROUP BY country_code, currency ORDER BY gross_bookings DESC;

   Revenue by product type (hotels / flights / packages / car rentals):
   SELECT product_type, COUNT(*) AS bookings, SUM(amount_usd) AS revenue
   FROM payments WHERE [month filter] GROUP BY product_type;

4. VAT SUMMARY (by jurisdiction):
   - KSA: 15% VAT on all bookings by SA residents
   - UAE: 5% VAT on all bookings by AE residents
   - Egypt: 14% VAT on all bookings by EG residents
   - Jordan: 16% GST
   - Morocco: 20% TVA
   SELECT country_code,
          SUM(amount_local) AS gross_local,
          SUM(vat_collected_local) AS vat_local,
          vat_rate
   FROM payments
   WHERE [month filter] GROUP BY country_code, vat_rate;
   Total VAT collected per jurisdiction — for filing.

5. OUTSTANDING B2B BILLINGS:
   SELECT partner_name, contract_ref, amount_due, due_date, status
   FROM b2b_invoices
   WHERE status IN ('pending','overdue')
   ORDER BY due_date ASC;
   Generate invoice reminder for any overdue > 30 days.

6. CASH FLOW PROJECTION (next 90 days):
   SELECT DATE_TRUNC('week', check_in_date) AS week,
          COUNT(*) AS confirmed_bookings,
          SUM(amount_usd) AS expected_revenue
   FROM bookings
   WHERE status = 'confirmed'
     AND check_in_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
   GROUP BY week ORDER BY week;
   Include: seasonal Ramadan/Hajj uplift if applicable dates fall in window.

7. VARIANCE ANALYSIS:
   Compare to prior month:
   - Gross bookings MoM change %
   - Net revenue MoM change %
   - Top 3 markets: growing or declining?
   Flag any variance > 5% from prior month for CEO review.

Output:
- Finance report saved to: docs/reports/monthly/[YYYY-MM]-finance.md
- Excel export to Google Drive: Finance/Monthly Reports/[YYYY-MM].xlsx
- Summary posted to #finance Slack channel
- Tag CEO for any variance > 5% or unmatched transactions > SAR 500
```

### Step 2 — Reconciliation Exception Handling

| Exception type | Threshold | Action |
|---------------|-----------|--------|
| Unmatched transaction (DB vs gateway) | Any amount | Flag to Finance Agent; investigate within 24h; log in `reconciliation_exceptions` |
| Gateway settlement late | > 3 business days | Contact gateway support; flag to CEO if > 5 days |
| VAT variance vs prior month | > 10% | Review for rate changes or unusual transaction mix; notify external accountant |
| B2B invoice overdue | > 30 days | Auto-reminder email via Sales Agent; escalate to CEO at 60 days |
| Revenue variance | > 5% MoM | CEO review required before closing month in books |

### Step 3 — Distribution

| Recipient | Format | Timing |
|-----------|--------|--------|
| CEO | Full report in Notion + Slack summary | By 5pm on 2nd of month |
| Finance Agent | Raw data + exceptions list | Same day as close |
| Board (quarterly) | Incorporated into GBL-004 quarterly report | End of quarter |
| External accountant | Excel export + VAT summary | By 5th of month |
| Google Drive archive | `Finance/Monthly Reports/[YYYY-MM].xlsx` | Same day as close |

### MEANA-Specific Finance Notes

- **STC Pay settlement:** SAR only; convert to USD using mid-month BIS rate (not spot)
- **Mada settlement:** SAR only; arrives 2–3 business days after transaction
- **Multi-currency bookings:** all amounts stored in both local currency and USD at time of booking; use stored USD amount (not re-converted) for P&L
- **Installment bookings (> SAR 5,000):** revenue recognised at full booking date, not per installment receipt — flag to accountant for accrual treatment
- **KSA VAT filing:** quarterly to ZATCA (zakat.gov.sa) — due 30 days after quarter end; Finance Agent drafts, external accountant files

---

## PH1-4 004 · Flight Search & Booking Operations

**Owner:** Dev Agent + CS Agent &nbsp;|&nbsp; **Frequency:** On every flight booking

**Purpose:** Operational procedure for flight search, booking, and PNR management across MEANA markets via Amadeus GDS and Sabre GDS.

### Standard Flight Booking Flow

1. User enters origin, destination, dates, passenger count → validate IATA codes
2. Call Amadeus Flight Offers API: `GET /v2/shopping/flight-offers` — cache results 5 min in Redis `flights:search:{hash}`
3. User selects fare → Amadeus Flight Offers Price API to confirm live price before payment
4. Payment confirmed via `PaymentRouter.getGateway(countryCode)` → call Amadeus Orders API to create booking
5. PNR returned → store in `flight_bookings` table on correct shard → send itinerary email (PDF)
6. Sync to HubSpot CRM. Update loyalty points via loyalty engine.

**Key MEANA routes (priority fare loading):**
- KSA/UAE/Gulf → JED/MED (Hajj & Umrah high-demand — AI pricing active)
- Egypt (CAI) → JED/MED, IST, DXB
- Jordan (AMM) → JED, DXB, IST
- Morocco (CMN) → JED, DXB, IST, CDG
- Tunisia (TUN) → JED, DXB, IST, CDG

```
Flight operations health check — [DATE].

1. AMADEUS GDS:
   - Test flight search CAI→JED: fares returned? ✅/❌ Response < 3s? ✅/❌
   - Test flight search AMM→JED: SV + RJ fares present? ✅/❌
   - Test flight search DXB→JED: EK + FZ fares present? ✅/❌
   - Amadeus token valid? Check expiry (valid 30min). Last refresh time?

2. SABRE GDS (fallback):
   - Sabre API responding? Last successful call timestamp?
   - Any PNRs stuck in 'pending' state > 24h? List them.

3. PNR QUEUE:
   SELECT id, pnr, status, created_at FROM flight_bookings
   WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 hours';
   Any stuck PNRs: attempt Amadeus order status lookup. Escalate to Dev Agent if unresolved.

4. TICKET DELIVERY:
   Any itinerary emails undelivered in last 24h? Check email:retry:* Redis keys.

Report: ✅/❌ per check. Any ❌ → open GitHub issue.
```

### Failure Handling

| Failure scenario | Response |
|-----------------|----------|
| Amadeus API timeout | Retry once (2s delay). If second call fails: show "Searching live fares…" spinner, trigger Sabre GDS fallback. Log timeout to ELK. |
| Price changed between search and confirm | Show new price with "Price updated" notice. User must reconfirm. Never book at stale price. |
| PNR not returned after payment | Set booking status `pnr_pending`. Queue `pnr:retry:{bookingId}` — check Amadeus Orders status every 5min for 30min. If still no PNR at 30min: P1 — notify Dev Agent + CEO. Full refund if not resolved within 2h. |
| Sabre GDS down (fallback also unavailable) | Display: "Flight search temporarily unavailable. We'll email you within 1h with availability." Queue search request. Trigger EMG-004. |

---

## PH1-4 005 · Payment Operations — MEANA Gateways

**Owner:** Finance Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Daily health check + on every failure alert

**Purpose:** Operational procedure for all MEANA payment gateways (STC Pay, Mada, Stripe). Defines daily health checks, failure response, and reconciliation triggers.

### MEANA Payment Gateway Map

| Country | Primary | Fallback | Currency |
|---------|---------|----------|----------|
| Saudi Arabia | STC Pay | Mada → Stripe | SAR |
| UAE | Stripe | — | AED |
| Kuwait | Stripe | — | KWD |
| Jordan | Stripe | — | JOD |
| Bahrain | Stripe | — | BHD |
| Egypt | Stripe | — | EGP |
| Morocco | Stripe | — | MAD |
| Tunisia | Stripe | — | TND |

Always use `PaymentRouter.getGateway(countryCode)` — never hardcode gateway per `backend/services/payment/PAYMENT_ROUTING.md`.

### Daily Gateway Health Check

```
MEANA payment gateway health check — [DATE].

1. STC PAY:
   - Webhook /stcpay/webhook responding 200? ✅/❌
   - Last successful payment timestamp in logs?
   - Any STC Pay error codes in last 24h? List unique codes.
   - STC Pay dashboard: any service notices?

2. MADA:
   - Mada payment flow end-to-end test: last successful ✅/❌
   - Mada gateway response time < 5s? ✅/❌

3. STRIPE (MEANA — me-south-1 account):
   - Stripe API status: api.stripe.com/v1/health → 200? ✅/❌
   - Error rate last 24h: [check Stripe Dashboard]
   - Any disputes opened yesterday? Count + total amount.
   - Webhook /stripe/webhook responding and signature validating? ✅/❌

4. RECONCILIATION CHECK:
   SELECT gateway, COUNT(*), SUM(amount)
   FROM payments
   WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY gateway;
   Does this match gateway dashboard totals (±0.1%)? ✅/❌
   Any payments stuck in 'processing' > 30min?

Report all ❌ immediately. Any gateway > 2% error rate → run EMG-001.
```

### Failed Payment Response

See EMG-001 for full emergency procedure. Quick reference:

| Error type | First action | Escalation |
|-----------|--------------|-----------|
| STC Pay down | Switch KSA traffic to Mada fallback in `PaymentRouter` | Dev Agent, < 5 min |
| Mada down | Switch to Stripe KSA | Dev Agent, < 5 min |
| Stripe EU account suspended | Switch to PayPal or notify CEO immediately | CEO + Stripe support, immediate |
| Chargeback spike (> 3 in 24h) | Flag to Finance Agent; run fraud analysis | Finance + CEO, < 1h |

---

## PH1-4 006 · MEANA Weekly Market Sweep

**Owner:** Ops Agent / CEO &nbsp;|&nbsp; **Frequency:** Weekly (Monday, alongside GBL-002)

**Purpose:** MEANA-specific weekly review covering all 8 Phase 1–4 markets in one sweep — revenue, technical health, B2B pipeline, competitive intelligence.

```
MEANA weekly market sweep — week of [DATE].

MARKETS: Egypt (EG), Saudi Arabia (SA), UAE (AE), Jordan (JO),
         Kuwait (KW), Bahrain (BH), Morocco (MA), Tunisia (TN)

1. REVENUE BY MARKET:
   SELECT country_code, COUNT(*) AS bookings, SUM(amount_usd) AS revenue_usd
   FROM bookings
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND country_code IN ('EG','SA','AE','JO','KW','BH','MA','TN')
   GROUP BY country_code ORDER BY revenue_usd DESC;
   Flag any market down > 20% vs prior week 🔴.

2. TOP ROUTES THIS WEEK:
   SELECT origin, destination, COUNT(*) AS bookings
   FROM flight_bookings
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY origin, destination ORDER BY bookings DESC LIMIT 10;
   Any new route trend emerging? Note for Marketing Agent.

3. HOTEL OCCUPANCY (Makkah/Madinah):
   Average booking lead time for JED/MED hotels this week?
   Any hotel out of allocation? Hotelbeds stock warnings?

4. B2B PIPELINE:
   HubSpot: any MEANA B2B deals in negotiation / proposal stage?
   Any agency partner inactive for > 30 days? Flag for Sales Agent.

5. MOBILE APP:
   Any iOS or Android crash reports in last 7 days? (Check Sentry)
   App Store / Google Play rating changes?

6. COMPETITIVE INTELLIGENCE:
   Any known competitor activity in KSA/UAE/Egypt this week?
   Any new local competitor features that we should respond to?

7. LOYALTY:
   MEANA tier distribution this week — any unusual Gold/Platinum spike?
   Points expiring in next 14 days for MEANA users: COUNT + total points.

Output: 7-section summary. Flag 🔴 items requiring immediate action.
Post to #meana-ops Slack channel. Archive to docs/reports/weekly/[YYYY-WW]-meana.md
```

---

## PH1-4 007 · B2B White-Label Partner Operations

**Owner:** Sales Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly pipeline review + on every new partner onboarding

**Purpose:** Manage the white-label B2B engine — onboarding travel agency partners, monitoring their booking volumes, handling billing, and ensuring the white-label product is healthy and correctly branded per partner config.

### Active B2B Markets (Phase 1–4)

| Market | Partner type | Primary currency | Billing cycle |
|--------|-------------|-----------------|---------------|
| Jordan (JO) | Travel agencies | JOD / USD | Monthly |
| Kuwait (KW) | Travel agencies + corporate | KWD / USD | Monthly |
| Bahrain (BH) | Travel agencies | BHD / USD | Monthly |
| Morocco (MA) | Tour operators | MAD / EUR | Monthly |
| Tunisia (TN) | Tour operators | TND / EUR | Monthly |
| KSA / UAE | Corporate + agency | SAR / AED / USD | Monthly |

### Weekly B2B Pipeline Review Prompt

```
B2B white-label partner operations review — week of [DATE].

1. ACTIVE PARTNERS:
   SELECT partner_name, country_code, status, monthly_booking_target,
          bookings_this_month, revenue_this_month_usd, last_booking_at
   FROM b2b_partners
   WHERE status = 'active'
   ORDER BY revenue_this_month_usd DESC;
   Any partner at < 50% of monthly booking target at mid-month? 🟡 Flag for Sales Agent.
   Any partner with last_booking_at > 14 days ago? 🔴 Risk of churn — Sales outreach required.

2. NEW PARTNER PIPELINE (HubSpot):
   Stage: Proposal Sent / Negotiation / Contract Signed / Onboarding
   Any deal stuck in same stage > 14 days? Flag to Sales Agent.

3. WHITE-LABEL HEALTH CHECK:
   For each active partner domain (e.g. travel.partnerX.com):
   - Custom domain resolving? ✅/❌
   - Partner logo + brand colours loading? ✅/❌
   - Booking flow using partner markup rate? ✅/❌
   - Partner API key active + not rate-limited? ✅/❌

4. COMMISSION & BILLING:
   SELECT partner_name, commission_rate, invoiced_amount,
          payment_status, invoice_due_date
   FROM b2b_invoices
   WHERE created_at >= DATE_TRUNC('month', NOW())
   ORDER BY invoice_due_date ASC;
   Any invoice overdue > 30 days? Escalate to Finance Agent.

5. SUPPORT TICKETS FROM PARTNERS:
   Any open support ticket tagged 'b2b' in the ticketing system > 48h unresolved?
   Partner support SLA: 4 hours response, 24 hours resolution.

6. VOLUME ANOMALIES:
   Any partner with > 50% booking volume spike this week vs last 4-week avg?
   (Positive: celebrate + check capacity)
   Any partner with > 50% drop? (Negative: immediate Sales Agent call)

Output: B2B health summary. Post to #b2b-partners Slack.
Flag any churn risks or overdue invoices to CEO + Sales Agent.
```

### Partner Onboarding Checklist

When a new B2B partner contract is signed:

```
New B2B partner onboarding — [PARTNER NAME] — [DATE].

TECHNICAL SETUP (Dev Agent):
[ ] Create partner record in b2b_partners table: name, country_code, markup_rate, commission_rate
[ ] Generate API key: POST /api/b2b/partners/[id]/keys
[ ] Configure custom domain (if required): update DNS + SSL certificate
[ ] Set partner markup rate in pricing config
[ ] Test booking flow end-to-end on partner domain

COMMERCIAL (Sales Agent + Finance Agent):
[ ] Contract signed and filed in Google Drive: Legal/B2B Contracts/[Partner Name]/
[ ] Invoice template configured with partner billing details
[ ] Commission rate entered in b2b_invoices template
[ ] First invoice scheduled (1st of following month)

ONBOARDING (Sales Agent):
[ ] Welcome email sent with API documentation link
[ ] Training session scheduled (demo of white-label booking flow)
[ ] Partner added to #b2b-partners Slack channel
[ ] HubSpot deal moved to 'Customer' stage

COMPLIANCE (Compliance Agent):
[ ] Data Processing Agreement (DPA) signed — file in compliance/gdpr/dpa-register.md
[ ] Partner's jurisdiction: any local travel licensing required? (flag to Legal Agent)

Target: partner making first live booking within 14 days of onboarding start.
```

---

## PH1-4 008 · Mobile App Release & Quality Assurance

**Owner:** Dev Agent + Products Agent &nbsp;|&nbsp; **Frequency:** Every release + weekly crash monitoring

**Purpose:** Standard procedure for React Native mobile app (iOS + Android) quality checks, release submission, and crash monitoring. Mobile is a primary booking channel for MEANA users — any crash affecting the booking flow is P1.

### Weekly Crash & Performance Monitor

```
Mobile app weekly health check — [DATE].

APP VERSIONS IN PRODUCTION:
- iOS App Store: current version [X.Y.Z] — force-update threshold [X.Y.0]?
- Android Google Play: current version [X.Y.Z] — force-update threshold set?
- What % of active users are on latest version? (< 80% = push update nudge)

CRASH REPORTS (Sentry — last 7 days):
- Total crash-free sessions rate: target > 99.5% ✅/❌
- Top 3 crash types by volume: list + affected OS versions
- Any crash in booking flow (search → select → payment → confirmation)? → P1
- Any crash affecting RTL users (ar/ur/fa locales)? → P1

PERFORMANCE:
- App launch time (cold start): target < 2s on mid-range Android ✅/❌
- Search results rendering: target < 1.5s ✅/❌
- Payment screen load: target < 1s ✅/❌ (payment delay = cart abandonment)

APP STORE / GOOGLE PLAY:
- Current rating: iOS [X.X] / Android [X.X]
- Any new 1-star reviews in last 7 days? Summarise themes.
- Any reviews mentioning payment failure, booking not confirmed, or app crash?
  → Flag to CS Agent for response within 24h.

PUSH NOTIFICATIONS:
- Last push sent: [date] to [N] subscribers
- Open rate: [X]%? (target > 20%)
- Any notification delivery failures > 5%? (Check Firebase/APNs logs)

Report crashes in booking flow immediately as P1.
```

### Release Checklist (run before every App Store / Play Store submission)

```
Mobile app release checklist — version [X.Y.Z] — [DATE].

PRE-SUBMISSION (Dev Agent + Products Agent):
[ ] All unit tests passing: cd mobile && npm test — 0 failures ✅/❌
[ ] E2E tests on booking flow (Detox): hotel search → book → payment → confirmation ✅/❌
[ ] RTL layout test: ar, ur, fa locales — no overflow or mis-alignment ✅/❌
[ ] Payment screens: Stripe, STC Pay, Mada — all rendered and functional ✅/❌
[ ] Deep links tested: /hotel/[id], /flight/[id], /booking/[ref] resolving correctly ✅/❌
[ ] Push notification permission flow tested (iOS 16+ and Android 13+) ✅/❌
[ ] App size: < 50MB base download (flag if growing > 5MB per release) ✅/❌

LOCALISATION:
[ ] All 15 locales: no missing translation keys (run i18n lint) ✅/❌
[ ] Arabic + Urdu + Persian: RTL direction applied globally ✅/❌
[ ] New strings added this release: translated in all 15 locales? ✅/❌

COMPLIANCE:
[ ] GDPR banner: shows for EU/UK users on first launch? ✅/❌
[ ] LGPD banner: shows for BR users on first launch? ✅/❌
[ ] CCPA footer visible for US users? ✅/❌
[ ] Privacy Policy URL in app store listing is current version? ✅/❌
[ ] App Tracking Transparency (ATT) prompt for iOS: compliant with App Store guidelines? ✅/❌

SUBMISSION:
[ ] iOS: Archive in Xcode → upload to App Store Connect → submit for review
[ ] Android: Generate signed APK/AAB → upload to Play Console → submit for review
[ ] Release notes written in EN + AR (minimum) — add other locales if capacity allows
[ ] CEO approval of release notes before submission ✅/❌

POST-RELEASE (first 48h):
[ ] Sentry: crash-free rate still > 99.5%? Monitor every 6h for first 24h
[ ] Any emergency rollback needed? → Play Store: staged rollout halt; iOS: expedited review request
[ ] Notify #product Slack: "v[X.Y.Z] live on iOS + Android ✅"
```

---

## PH1-001 · Phase 1 (KSA) — Core Operations Check

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly

**Purpose:** Verify KSA-specific operations are healthy — the core market where all decisions are made.

```
Phase 1 KSA operations check.

1. HOTELBEDS: Test searchHotels('MCM', [checkIn], [checkOut], 2, {isUmrah:true}).
   Expecting hotels within 500m of Haram. First result distance < 200m? ✅/❌
   Response time < 3s? ✅/❌

2. AMADEUS GDS: Test flight search DTW→JED. Fares returned? ✅/❌
   Test SV (Saudia) DXB→JED — SV fares returning? ✅/❌

3. STC PAY: Confirm webhook endpoint /stcpay/webhook responding 200.
   Last successful test transaction timestamp: [check logs].

4. MADA: Confirm Mada payment flow end-to-end. Last successful test: [check logs].

5. KSA DB SHARD: getShardPool('SA') → me-south-1 primary. Connection count < 80% max.

6. REDIS (Bahrain): pricing:ai:* keys populated? TTL ~6h? ✅/❌

7. AI PRICING: GET /api/v1/pricing/[hotelId]/[date] — response in < 2s with Claude recommendation? ✅/❌

Report: ✅/❌ per check. Any ❌ → open GitHub issue + notify Dev Agent.
```

---

## PH4-001 · Phase 4 (Scale) — Load Test Before Major Events

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Before Ramadan + Hajj + any major marketing push

**Purpose:** Confirm the platform can handle 500+ concurrent users before peak traffic events.

```
Pre-event load test — [EVENT NAME] [DATE].

1. Run load-tests/artillery/scenarios/booking-flow-500c.yml
   Target: P95 < 800ms, P99 < 2s, error rate < 0.5%

2. Run load-tests/k6/booking-flow-500c.js
   500 VUs constant for 10 minutes. Report per-step Trend metrics.

3. Check ELK dashboard after test:
   Any 5xx spikes? DB query time p99? Redis hit rate?

4. Check Grafana (monitoring.utubooking.com/grafana):
   CPU: any service peaking > 80%? Scale if so.
   Memory: any leaks trending up across test duration?

If P95 > 800ms or errors > 0.5%: DO NOT proceed with event. Fix bottleneck first.
If pass: post results to #infrastructure. Green light for event.
```

---

## PHASES 5–7 — IMPLEMENTED & LIVE
### Muslim World SOPs
**Turkey · Indonesia · Malaysia · Pakistan · India**

### Current Live Status — Phase 5–7 Achievements

| Status | Feature |
|--------|---------|
| ✅ | Turkey: Iyzico payment gateway + KVKK compliance + Diyanet hajj quota |
| ✅ | Indonesia: Midtrans payment + Kemenag hajj quota API (KEMENAG_API_KEY) |
| ✅ | Malaysia: iPay88 payment + Islamic Financial Services Act compliance |
| ✅ | Pakistan: JazzCash (primary) + Easypaisa (secondary) + MoRA hajj quota |
| ✅ | India: Razorpay + DPDP Act compliance + HCoI quota widget |
| ✅ | Urdu (ur) RTL locale — Devanagari (hi) locale — Bahasa ID (id) — Malay (ms) |
| ✅ | National Quota Tracker: TR / ID / PK providers live — `getQuotaProvider(countryCode)` |
| ✅ | FX wallet: live rates for TRY, IDR, MYR, PKR, INR — 15-min refresh |
| ✅ | APAC DB shards: ap-southeast-1 (ID/MY) + ap-south-1 (PK/IN) + eu-central-1 (TR) |

---

## PH5-7 001 · New Country Market Entry Checklist

**Owner:** CEO + Legal Agent (AI) + Compliance Agent &nbsp;|&nbsp; **Frequency:** Before any new country goes live

**Purpose:** This SOP governs the launch of any new market. ALL 10 items must be checked and signed off before a single real user can register from that country. No exceptions. Applies to Phases 5–7 and all future market entries.

> **Iran note:** US OFAC + EU sanctions apply. Status: RESEARCH ONLY — see `legal/iran/feasibility-brief.md`. Do NOT proceed to this checklist until written legal opinion is received from external OFAC counsel.

### Pre-Launch Gate Checklist

| # | Checklist Item | Owner | How to Verify | Gate |
|---|---------------|-------|---------------|------|
| 1 | Legal entity registered in target country OR JV/partnership signed | CEO + Local Lawyer | Registration certificate filed in `legal/[country]/` | **BLOCK** if absent — cannot legally operate |
| 2 | Payment gateway: sandbox tested end-to-end | Dev Agent | 100 test transactions with zero errors; Sentry clean | **BLOCK** if error rate > 0% in sandbox |
| 3 | Language UI: native speaker QA completed | Localization + Native QA | Signed-off QA report in Notion; RTL if applicable | **BLOCK** — launch in wrong language destroys trust |
| 4 | Data residency: user data routing to correct AWS region | Dev Agent | Run data residency audit: `getShardPool('[CC]')` → correct region | **BLOCK** — data law violation risk |
| 5 | Privacy/consent: local data law consent banner live | Dev + Compliance Agent | Test consent flow for each data category; check law in `compliance/CLAUDE.md` | **BLOCK** — regulatory violation from day 1 |
| 6 | VAT/tax: correct tax rate on all invoices | Finance Agent | Sample invoice reviewed by local accountant; rate configured in billing service | **BLOCK** — tax evasion risk |
| 7 | Support: local phone/WhatsApp number configured | CS Agent | Test call + WhatsApp message successful; local number displayed in UI | **WARN** — launch without support channel only with CEO approval |
| 8 | CLAUDE.md: country context added to all relevant agent files | CEO | Git commit visible: `legal/CLAUDE.md`, `compliance/CLAUDE.md`, `finance/CLAUDE.md` updated | **BLOCK** — AI agents operating without country knowledge |
| 9 | Load test: 500 concurrent users from target country | Dev Agent | Artillery/k6 report: P95 < 500ms, error rate < 0.5% | **BLOCK** — do not launch into a system that will fall over |
| 10 | CEO final sign-off | CEO | Sign Launch Approval form in Notion: `ops/launch-approvals/[country]-[date].md` | **BLOCK** — no launch without CEO signature |

**All 10 items = PASS before launch.** Any BLOCK item stops the launch. WARN items require CEO written exception.

### Pre-Launch Prompt (run 2 weeks before target go-live)

```
New market pre-launch audit — [COUNTRY NAME] ([CC]) — [TARGET GO-LIVE DATE].

Work through PH5-7 001 checklist:

1. LEGAL: Is legal/[CC]/ directory present with registration certificate?
   Check git log for legal/[CC]/ — when was it created?

2. PAYMENT: Run through Dev Agent:
   POST /api/payments/test — gateway=[gateway], country=[CC], amount=100
   100 iterations — any failures?

3. LANGUAGE: Check i18n config — is [locale] in LOCALES array (frontend/src/i18n/config.ts)?
   Check locales/[locale].json — completeness vs en.json (no missing keys)?
   RTL_LOCALES array — locale added if RTL?

4. DATA RESIDENCY: Run: getShardPool('[CC]') — which region returned?
   Expected: [expected-region]. Match? ✅/❌

5. CONSENT BANNER: Load app with countryCode='[CC]' — which banner triggers?
   Does it match the required law for [CC] in compliance/CLAUDE.md?

6. VAT: Create test booking for [CC] user — invoice shows [X]% tax?
   Matches local rate? ✅/❌

7. SUPPORT: Call [local number] — answered? WhatsApp [number] — replied within 15 min?

8. CLAUDE.MD: git log legal/CLAUDE.md compliance/CLAUDE.md finance/CLAUDE.md
   All contain [country] context? ✅/❌

9. LOAD TEST: Run artillery run load-tests/artillery/scenarios/booking-flow-500c.yml
   --target [target-url] --overrides '{"config":{"http":{"timeout":10}}}'
   P95 < 500ms? Error rate < 0.5%? ✅/❌

10. CEO SIGN-OFF: Is ops/launch-approvals/[CC]-[YYYY-MM-DD].md committed to git?

Output: checklist table with ✅/❌ per item.
Any ❌ = LAUNCH BLOCKED. List blocking items + owner + resolution steps.
Target: all ✅ by [DATE - 3 days] to allow buffer before go-live.
```

### Post-Launch Monitoring (first 7 days)

```
New market go-live monitoring — [COUNTRY] — Day [N] post-launch.

1. REGISTRATIONS: SELECT COUNT(*) FROM users WHERE country_code='[CC]'
   AND created_at > '[GO-LIVE DATE]';
   Growing? First booking made? 🎉

2. PAYMENT SUCCESS RATE:
   SELECT COUNT(*) FILTER (WHERE status='completed') * 100.0 / COUNT(*) AS success_rate
   FROM payments WHERE user_country='[CC]' AND created_at > '[GO-LIVE DATE]';
   Target > 95%. Any declines? What error codes?

3. ERRORS: Sentry — any [CC]-specific errors in last 24h?
   ELK — any 5xx from [CC] user sessions?

4. CONSENT COMPLIANCE: SELECT COUNT(*) FROM consent_log
   WHERE country_code='[CC]' AND created_at > '[GO-LIVE DATE]';
   Consent events recording? ✅/❌

5. SUPPORT: Any tickets from [CC] users? Response time < 4h?

Report daily for first 7 days. Archive to docs/launch/[CC]/post-launch-days-1-7.md
```

### Launch Folder Structure

Every new market creates:
```
docs/launch/[CC]/
  pre-launch-checklist.md    — completed PH5-7 001 checklist with sign-offs
  post-launch-days-1-7.md    — daily monitoring reports
  go-live-announcement.md    — internal + external comms

legal/[CC]/
  registration-certificate.* — legal entity proof
  local-lawyer-contact.md    — external counsel contact

compliance/[CC]/
  data-residency-audit.md    — shard routing verification
  consent-banner-test.md     — screenshot + log of consent flow
```

---

## PH5-7 002 · Turkey Launch SOP (Phase 5)

**Owner:** CEO + Dev Agent &nbsp;|&nbsp; **Frequency:** One-time launch + ongoing ops

**Purpose:** All technical, legal, financial, and operational steps required to launch and maintain the Turkish market. Turkey is Phase 5's anchor market — the largest Muslim-majority country in Europe with the highest Hajj quota demand outside the Gulf.

### Turkey Market Snapshot

| Item | Detail |
|------|--------|
| **Legal requirement** | TURSAB license (Turkish travel agency association). Apply at tursab.org.tr. ~6–8 weeks processing. Required before first live booking. |
| **Data law** | KVKK (Kişisel Verilerin Korunması Kanunu). AWS eu-central-1 Frankfurt (nearest compliant region). Consent banner in Turkish required. |
| **Payment gateway** | Iyzico — TRY currency. Sandbox: sandbox.iyzipay.com. `npm install iyzipay`. |
| **Language** | Turkish (tr) — Latin script, LTR. Formal tone (`siz` not `sen`). Native QA required before launch. |
| **Key airlines** | Turkish Airlines (TK) + Pegasus (PC) via Amadeus GDS. Priority routes: IST→JED, IST→RUH, IST→MED. |
| **VAT** | 20% KDV on digital services. Register at gib.gov.tr. Show on all invoices as `"KDV %20"`. Comma as decimal: `1.234,56 ₺`. |
| **Currency** | TRY (₺). Comma as decimal separator: `1.234,56 ₺`. Always show USD equivalent due to TRY volatility. |
| **Hajj quota** | Diyanet İşleri Başkanlığı — `DiyanetQuotaProvider`. Public API. ~80,000 annual quota. |

### Launch Checklist (PH5-7 001 specialised for Turkey)

```
Turkey market launch checklist — [TARGET DATE].

LEGAL:
[ ] TURSAB license application submitted at tursab.org.tr
[ ] TURSAB license received — file in legal/TR/tursab-license.*
[ ] KVKK registration: Data Controller registration with VERBIS (verbis.kvkk.gov.tr)
    Note: Required before processing any Turkish personal data.
[ ] KVK Board notification filed
[ ] Local legal entity OR partnership agreement — file in legal/TR/

TECHNICAL:
[ ] Iyzico account created: sandbox + production
    IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL set in .env
[ ] Iyzico sandbox: run 100 test transactions — zero errors? ✅/❌
[ ] getShardPool('TR') → eu-central-1 configured in shard-router.js ✅/❌
[ ] Turkish Airlines (TK) + Pegasus (PC) fares returning in Amadeus flight search? ✅/❌
    Test: IST→JED, IST→RUH — SeatClass Y and J returning? ✅/❌
[ ] Amadeus airlines config: backend/services/flight/src/config/amadeus-airlines.json
    TK + PC added with IST/AYT/ESB/ADB airports ✅/❌
[ ] Diyanet quota: GET /api/hajj/national-quota {countryCode:'TR'} — data returning? ✅/❌

LOCALISATION:
[ ] Turkish (tr) locale: locales/tr.json — complete vs locales/en.json (no missing keys)
[ ] TURSAB license number displayed in TR footer
[ ] Currency formatting: 1.234,56 ₺ (period as thousands, comma as decimal) ✅/❌
[ ] KDV label: "KDV %20" on all TR invoices ✅/❌
[ ] Native speaker QA: signed-off report in Notion (formal register verified) ✅/❌
[ ] RTL check: Turkish is LTR — confirm direction:ltr for tr locale ✅/❌

COMPLIANCE:
[ ] KVKK consent banner: shows for TR countryCode, Turkish language ✅/❌
[ ] Consent logged to consent_log with law='KVKK' ✅/❌
[ ] KVKK erasure route active: POST /api/user/gdpr/erase (reuses GDPR route with KVKK law tag) ✅/❌
[ ] Data residency: getShardPool('TR') → eu-central-1. TR data NOT in UK London shard. ✅/❌

FINANCE:
[ ] GİB registration (KDV) — VAT number obtained, file in finance/TR/
[ ] KDV 20% configured in billing service for TR users ✅/❌
[ ] TRY/USD FX rate: wallet service updating every 15 min ✅/❌
[ ] Iyzico settlement: Turkish bank account configured to receive TRY settlements

CLAUDE.MD UPDATES:
[ ] marketing/CLAUDE.md: Turkey section added (formal tone, TK + PC airlines, Ramadan + Hajj calendar, TURSAB compliance)
[ ] finance/CLAUDE.md: TRY currency rules + KDV 20% + comma decimal format + GİB filing
[ ] compliance/CLAUDE.md: KVKK 30-day SLA + VERBIS registration note (already present — verify current)
[ ] Commit: git commit -m "feat: add Turkey (TR) market context to agent CLAUDE.md files"

LOAD TEST:
[ ] artillery run with TR target — P95 < 500ms from Istanbul region ✅/❌

CEO SIGN-OFF:
[ ] Launch Approval form signed: ops/launch-approvals/TR-[YYYY-MM-DD].md
```

### Ongoing Turkey Operations

**Weekly (in PH5-001 check):**
- Iyzico webhook responding + last successful payment < 24h
- `getShardPool('TR')` → eu-central-1
- Diyanet quota API: data current?
- TRY/USD rate: last updated < 15 min — flag if TRY moved > 3% vs yesterday

**Monthly (in PH5-7 010 finance close):**
- Iyzico settlement reconciliation (TRY)
- KDV 20% summary → send to Turkish accountant by 28th for monthly filing to GİB
- VERBIS registration: annual renewal due? (Check anniversary date in legal/TR/)

**Hajj season (May–July):**
- Diyanet quota: daily check — any quota changes from Ministry?
- IST→JED + IST→MED route pricing: confirm TK + PC fares not stale
- TRY extreme volatility: if TRY moves > 5% in a day → pause TRY-denominated package promotions; notify CEO

### Key Turkey Contacts (fill before launch)

```
legal/TR/contacts.md:
- TURSAB: [account manager name + phone]
- VERBIS / KVKK Board: kvkk.gov.tr — [contact point]
- Local legal counsel: [firm name + contact]
- Turkish accountant (KDV filing): [firm name + contact]
- Iyzico account manager: [name + email]
```

---

## PH5-7 003 · Indonesia + Malaysia Launch SOP (Phase 5)

**Owner:** CEO + Dev Agent &nbsp;|&nbsp; **Frequency:** One-time launch

**Purpose:** All technical, legal, financial, and operational steps for launching Indonesia and Malaysia — Phase 5's two Southeast Asian anchor markets. Run PH5-7 001 pre-launch gate alongside this SOP for each country.

---

### Indonesia

| Item | Detail |
|------|--------|
| **Legal** | PT UTUBooking Indonesia via OSS-RBA (oss.go.id) OR JV with local partner. Minimum capital: IDR 10B. |
| **Data law** | PDP Law 2022. DPO appointed. AWS ap-southeast-1 Singapore. Consent banner in Bahasa Indonesia. |
| **Payment** | Midtrans — GoPay, OVO, QRIS, Bank Transfer (BCA/BNI/BRI/Mandiri VA). `npm install midtrans-client`. |
| **Language** | Bahasa Indonesia (id). Islamic travel terms: *Paket Umroh*, *hotel dekat Masjidil Haram*. |
| **VAT** | PPN 11%. Register at pajak.go.id. NPWP (tax ID) on all Indonesian invoices. |
| **Key airlines** | Garuda Indonesia (GA) + Lion Air (JT) + Citilink (QG) via Amadeus. CGK→JED priority route. |
| **Currency** | IDR (Rp). No decimal places: `Rp 1.234.567`. Always show USD equivalent. |
| **Hajj quota** | Kemenag API (`KEMENAG_API_KEY`). ~221,000 annual quota — world's largest. Waitlist often 20–40 years. |

### Indonesia Launch Checklist

```
Indonesia launch checklist — [TARGET DATE].

LEGAL:
[ ] PT UTUBooking Indonesia via OSS-RBA (oss.go.id) OR JV signed — file in legal/ID/
[ ] IDR 10B capital requirement met (or JV partner meets it)
[ ] NPWP (Indonesian tax ID) obtained — finance/ID/npwp.*
[ ] DPO appointed for PDP Law compliance — name + contact in compliance/ID/

TECHNICAL:
[ ] Midtrans: MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_ENV=production in .env
[ ] Midtrans Snap UI: GoPay, OVO, QRIS, BCA/BNI/BRI/Mandiri VA all rendering? ✅/❌
[ ] Midtrans sandbox: 100 test transactions — zero errors ✅/❌
[ ] getShardPool('ID') → ap-southeast-1 ✅/❌
[ ] Garuda (GA) + Lion Air (JT) + Citilink (QG): CGK→JED fares in Amadeus? ✅/❌
    Add CGK/SUB/DPS/UPG airports to amadeus-airlines.json ✅/❌
[ ] Kemenag quota: GET /api/hajj/national-quota {countryCode:'ID'} — KEMENAG_API_KEY set? ✅/❌

LOCALISATION:
[ ] locales/id.json complete — Islamic terms: Paket Umroh, hotel dekat Masjidil Haram ✅/❌
[ ] Currency: Rp 1.234.567 (period thousands, no decimals) ✅/❌
[ ] PPN label: "PPN 11%" on all ID invoices ✅/❌
[ ] Native QA: Bapak/Ibu formal register — Notion sign-off ✅/❌

COMPLIANCE:
[ ] PDP Law 2022 consent banner: shows for ID countryCode, Bahasa Indonesia ✅/❌
[ ] Consent logged: law='PDP_ID' ✅/❌
[ ] Data residency: getShardPool('ID') → ap-southeast-1 ✅/❌

FINANCE + CLAUDE.MD:
[ ] DJP PPN 11% registration — pajak.go.id
[ ] finance/CLAUDE.md: IDR no-decimal format + PPN 11% + DJP monthly filing by 31st
[ ] marketing/CLAUDE.md: Garuda + Lion Air, Ramadan/Eid/Hajj, Kemenag waitlist context
[ ] Commit: git commit -m "feat: add Indonesia (ID) market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from Singapore ✅/❌
[ ] ops/launch-approvals/ID-[YYYY-MM-DD].md signed ✅/❌
```

**Ongoing:** Midtrans webhooks daily · Kemenag quota weekly · PPN 11% → DJP by 31st monthly · Hajj season: daily quota check — 221K fills fast, activate waitlist if < 10% remaining

---

### Malaysia

| Item | Detail |
|------|--------|
| **Legal** | MOTAC travel agency licence (~MYR 5,000/year). PDPA registration at pdp.gov.my. |
| **Unique feature** | Tabung Haji integration — 9M depositors. Balance check + Hajj queue status API. |
| **Payment** | iPay88 — FPX (Maybank first), DuitNow QR, TNG eWallet, GrabPay. MYR currency (RM). |
| **Language** | Malay (ms). Bilingual MY-EN acceptable. Pakej Umrah, hotel berdekatan Masjidil Haram. |
| **VAT** | SST 8% on digital services. Register at mysst.customs.gov.my. |
| **Key airlines** | AirAsia (AK) direct API + Malaysia Airlines (MH) via Amadeus. KUL→JED Umrah route priority. |
| **Currency** | MYR (RM). Format: `RM 1,234.56`. Show USD equivalent. |
| **Hajj quota** | Tabung Haji — ~30,000 annual quota. Integrate balance check + Hajj queue status API (tabunghaji.gov.my). |

### Malaysia Launch Checklist

```
Malaysia launch checklist — [TARGET DATE].

LEGAL:
[ ] MOTAC travel agency licence obtained — file in legal/MY/ (renew annually, ~MYR 5,000)
[ ] PDPA registration at pdp.gov.my — notify of data processing activities
[ ] Local entity OR partnership — legal/MY/

TECHNICAL:
[ ] iPay88: IPAY88_MERCHANT_CODE, IPAY88_MERCHANT_KEY in .env
[ ] iPay88 sandbox: FPX (Maybank), DuitNow QR, TNG eWallet, GrabPay all tested ✅/❌
[ ] BackendPostURL → /api/payments/ipay88/callback ✅/❌
[ ] AirAsia (AK) direct API credentials obtained + integrated
[ ] KUL→JED + KUL→MED fares returning in Amadeus (MH)? ✅/❌
    Add KUL/PEN/BKI/KBR airports to amadeus-airlines.json ✅/❌
[ ] Tabung Haji API: balance check + Hajj queue status endpoint integrated ✅/❌
[ ] getShardPool('MY') → ap-southeast-1 ✅/❌

LOCALISATION:
[ ] locales/ms.json complete — Pakej Umrah, hotel berdekatan Masjidil Haram ✅/❌
[ ] Currency: RM 1,234.56 ✅/❌
[ ] SST label: "SST 8%" on MY invoices ✅/❌
[ ] Bilingual toggle (ms/en) working ✅/❌
[ ] Native QA: Malay formal register — Notion sign-off ✅/❌

COMPLIANCE:
[ ] PDPA per-purpose consent: separate consent for each processing activity ✅/❌
[ ] Consent logged: law='PDPA_MY' ✅/❌
[ ] Data residency: getShardPool('MY') → ap-southeast-1 ✅/❌

FINANCE + CLAUDE.MD:
[ ] mysst.customs.gov.my SST 8% registration
[ ] finance/CLAUDE.md: MYR format + SST 8% + RMCD bi-monthly filing
[ ] marketing/CLAUDE.md: AirAsia + MAS routes, Tabung Haji context, Eid ul-Fitr peak
[ ] Commit: git commit -m "feat: add Malaysia (MY) market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from Singapore ✅/❌
[ ] ops/launch-approvals/MY-[YYYY-MM-DD].md signed ✅/❌
```

**Ongoing:** iPay88 BackendPostURL daily · Tabung Haji API weekly · SST 8% bi-monthly → RMCD · MOTAC licence renewal annually

---

## PH5-7 004 · Pakistan + India Launch SOP (Phase 6)

**Owner:** CEO + Dev Agent + Legal Agent   |   **Frequency:** One-time launch

**Purpose:** All steps to launch Pakistan and India — Phase 6's South Asian markets. Both require Mehram verification for female Hajj/Umrah pilgrims. Legal Agent review required before launch in both countries.

---

### Pakistan

| Item | Detail |
|------|--------|
| **Legal** | JV with licensed Pakistani IATA travel agency. SBP PSO not required if using JazzCash/Easypaisa. |
| **Data law** | PECA 2016. Pakistani citizen data in AWS ap-south-1 Mumbai. Legal review required before launch. |
| **Payment** | JazzCash (60M+ users) + Easypaisa (40M+). PKR currency. FX rate refresh every 5 min (inflation). |
| **Script** | Urdu Nastaliq — DIFFERENT font from Arabic. Noto Nastaliq Urdu. line-height: 2.2. RTL. |
| **Mehram** | Female pilgrims under 45 require Mehram companion for Hajj/Umrah. Build verification flow. |
| **Key airlines** | PIA (PK) via Sabre GDS. KHI/LHE/ISB→JED. Hajj charter flights seasonally. |
| **VAT** | GST 17% (Federal). FBR (fbr.gov.pk). |
| **Currency** | PKR (Rs). Format: `Rs 1,234`. Extreme volatility — FX refresh every 5 min. Always show USD. |
| **Hajj quota** | MoRA (~180,000/year). MoRAQuotaProvider. |

### Pakistan Launch Checklist

```
Pakistan launch checklist — [TARGET DATE].

LEGAL (Legal Agent review required first):
[ ] Legal Agent brief: PECA 2016 obligations confirmed ✅/❌
[ ] JV agreement with licensed Pakistani IATA agency — legal/PK/
[ ] FBR National Tax Number (NTN) via JV partner — finance/PK/ntn.*
[ ] Legal Agent sign-off before any Pakistani user data collected ✅/❌

TECHNICAL:
[ ] JazzCash: JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT in .env
[ ] JazzCash HMAC-SHA256: 100 test transactions — all signature-valid? ✅/❌
[ ] Easypaisa: EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY in .env
[ ] Easypaisa SHA256: 100 test transactions — all hash-valid? ✅/❌
[ ] PIA (PK) via Sabre GDS: KHI→JED, LHE→JED, ISB→JED fares returning? ✅/❌
[ ] Hajj charter flights: Sabre seasonal charter lookup configured ✅/❌
[ ] MoRA quota: GET /api/hajj/national-quota {countryCode:'PK'} ✅/❌
[ ] PKR FX: wallet service refreshing every 5 min (not 15) ✅/❌
[ ] getShardPool('PK') → ap-south-1 ✅/❌

LOCALISATION:
[ ] locales/ur.json complete ✅/❌
[ ] Font: Noto Nastaliq Urdu (NOT Noto Nastaliq Arabic — different font) ✅/❌
[ ] line-height: 2.2 globally for ur locale ✅/❌
[ ] document.dir='rtl' for ur locale ✅/❌
[ ] Booking form: right-aligned labels, RTL inputs ✅/❌
[ ] Currency: Rs 1,234 (no decimals) ✅/❌
[ ] Mehram gate: female under 45 → companion required before Hajj/Umrah confirm ✅/❌
[ ] Native QA: Urdu RTL on PHYSICAL device (not emulator) ✅/❌

COMPLIANCE:
[ ] PECA 2016 consent notice for PK countryCode ✅/❌
[ ] Data residency: getShardPool('PK') → ap-south-1 ✅/❌

FINANCE + CLAUDE.MD:
[ ] FBR GST 17% via JV partner
[ ] PKR FX: 5-min interval in wallet service ✅/❌
[ ] finance/CLAUDE.md: PKR extreme volatility + 5-min FX + GST 17%
[ ] marketing/CLAUDE.md: PIA + Hajj charters, Eid/Shab-e-Qadr, RTL rules
[ ] Commit: git commit -m "feat: add Pakistan (PK) market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from Mumbai ✅/❌
[ ] ops/launch-approvals/PK-[YYYY-MM-DD].md signed ✅/❌
```

**Ongoing:** JazzCash + Easypaisa webhooks daily · MoRA quota weekly · PKR FX every 5 min · GST 17% → FBR by 15th monthly · PKR crisis (>10% single day): notify CEO, consider USD-only display

---

### India

| Item | Detail |
|------|--------|
| **Legal** | RBI Payment Aggregator licence via Razorpay. Ministry of Tourism ATA. DPDP Act 2023 MUST be compliant. |
| **Data law** | DPDP Act 2023 — strictest requirement. Indian user data in AWS ap-south-1 Mumbai. DPO required. |
| **Payment** | Razorpay — UPI (primary, 70%+ transactions), NetBanking (HDFC/SBI/ICICI/Axis/Kotak), EMI, cards. |
| **Special feature** | Haj Committee of India API — 175K pilgrims/year. Application status + quota lookup. |
| **Mehram** | Same as Pakistan — female under 45 Mehram verification required. |
| **Key airlines** | IndiGo (6E) direct + Air India (AI) Haj charters. DEL/BOM/MAA→JED routes. |
| **VAT** | GST 5–12% (travel). GSTIN required. gst.gov.in. |
| **Currency** | INR (₹). Indian lakhs: `₹12,34,567.89`. Always show USD equivalent. |
| **Hajj quota** | HCoI — 175,000 annual quota. HCoIQuotaWidget with application status lookup. |

### India Launch Checklist

```
India launch checklist — [TARGET DATE].

LEGAL (Legal Agent review required first):
[ ] Legal Agent brief: DPDP Act 2023 current obligations ✅/❌
[ ] RBI Payment Aggregator licence in place via Razorpay ✅/❌
[ ] Ministry of Tourism ATA recognition — legal/IN/
[ ] GSTIN obtained — finance/IN/gstin.*
[ ] DPO appointed — name + contact in compliance/IN/
[ ] Local entity OR partnership — legal/IN/

TECHNICAL:
[ ] Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET in .env
[ ] Razorpay UPI + Razorpay-Signature validation: 100 test transactions ✅/❌
[ ] Razorpay webhook /api/payments/razorpay/callback responding ✅/❌
[ ] UPI, NetBanking, EMI, cards — all methods in checkout ✅/❌
[ ] IndiGo (6E) + Air India (AI) fares: DEL→JED, BOM→JED, MAA→JED ✅/❌
    Add DEL/BOM/MAA/HYD/BLR/CCU airports to amadeus-airlines.json ✅/❌
[ ] HCoI quota + application status API integrated ✅/❌
[ ] getShardPool('IN') → ap-south-1 ✅/❌

LOCALISATION:
[ ] locales/hi.json complete ✅/❌
[ ] Noto Sans Devanagari font loading ✅/❌
[ ] Indian lakhs format: ₹12,34,567.89 (NOT ₹1,234,567.89) ✅/❌
[ ] GST labels: "GST 5%" air / "GST 12%" hotels+packages ✅/❌
[ ] Mehram gate: female under 45 → companion required before Hajj/Umrah confirm ✅/❌
[ ] Bilingual hi+en toggle working ✅/❌
[ ] Native QA: Hindi reviewed by native speaker ✅/❌

COMPLIANCE:
[ ] DPDP Act 2023 consent notice for IN countryCode ✅/❌
[ ] DPO details in privacy policy ✅/❌
[ ] OPS-021 regulatory watch: DPDP rules publication monitoring active ✅/❌
[ ] Data residency: getShardPool('IN') → ap-south-1 ✅/❌

FINANCE + CLAUDE.MD:
[ ] GSTIN active — GST 5% air / 12% hotel+packages in billing service
[ ] finance/CLAUDE.md: INR lakhs format + GST 5/12% split + GST Portal by 20th
[ ] legal/CLAUDE.md: DPDP Act 2023 DPO requirement + rules-pending
[ ] marketing/CLAUDE.md: IndiGo + AI Haj charters, Eid/Hajj, bilingual hi+en
[ ] Commit: git commit -m "feat: add India (IN) market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from Mumbai ✅/❌
[ ] ops/launch-approvals/IN-[YYYY-MM-DD].md signed ✅/❌
```

**Ongoing:** Razorpay UPI webhook daily · HCoI quota weekly · INR/USD every 15 min · GST → GST Portal by 20th monthly · DPDP rules: when published → 30-day build sprint (Legal Agent brief + OPS-021)

---

## PH5-7 005 · Iran Market Feasibility Monitoring

**Owner:** Legal Agent + CEO &nbsp;|&nbsp; **Frequency:** Quarterly review

**Purpose:** Track the legal and sanctions landscape for a potential Iran launch. Iran is the highest-demand blocked market — large Shia Muslim population, strong Umrah/Hajj demand, but subject to comprehensive US OFAC and EU sanctions. This SOP defines how to monitor for changes without inadvertently starting prohibited activity.

> **HARD BLOCK — current status: RESEARCH ONLY**
> No development. No user registration. No data collection. No payment processing.
> Written legal opinion from external OFAC counsel required before any change to this status.
> Reference: `legal/iran/feasibility-brief.md`

### Quarterly Sanctions Review Prompt

```
Iran market feasibility quarterly review — [QUARTER YEAR].

SANCTIONS LANDSCAPE:
1. US OFAC status: is Iran still on the SDN + Comprehensive Sanctions list?
   Check: ofac.treas.gov/faqs/topic/1524 — any new general licences issued?
   Any OFAC Iran-related enforcement actions in the last quarter relevant to travel/e-commerce?

2. EU sanctions status: check eur-lex.europa.eu — any changes to EU Iran sanctions regime?

3. UK sanctions: check gov.uk/government/collections/financial-sanctions-regime — Iran regime.

4. Travel sector-specific licences: has OFAC issued any GL covering Hajj/Umrah travel facilitation
   for Iranian pilgrims? (This would be a specific, narrow exception — verify carefully.)

5. Iranian diaspora legality: are services to IRANIAN NATIONALS LIVING OUTSIDE IRAN permitted?
   (Different from services TO Iran.) Check OFAC guidance on persons vs territory.

OUTPUT:
- Sanctions status: UNCHANGED / PARTIALLY CHANGED / MATERIALLY CHANGED
- If MATERIALLY CHANGED: brief Legal Agent → engage external OFAC counsel immediately
- If UNCHANGED: note review date, schedule next review
- Update legal/iran/feasibility-brief.md with review date + findings
- Post status to CEO: "Iran quarterly sanctions review complete — status: [result]"

DO NOT:
- Begin any technical scoping or dev work based on this review alone
- Interpret OFAC guidance yourself — all interpretations go to external OFAC counsel
- Register any Iranian user or collect Iranian payment method information
```

### Escalation Path

| Finding | Action | Timeline |
|---------|--------|----------|
| No change | Log review date in `legal/iran/` + schedule next quarterly review | Same day |
| New OFAC general licence (possibly relevant) | Brief Legal Agent → engage external OFAC counsel | Within 48h |
| Sanctions materially eased | CEO + Legal Agent + external OFAC counsel convene | Within 1 week |
| Full sanctions lift | Full PH5-7 001 new country entry process begins | After written legal opinion |

---

### Phase 7 Activation Gate — Legal Prerequisites Before Any Development

**Owner:** CEO + OFAC-qualified Legal Counsel &nbsp;|&nbsp; **Timing:** Phase 7 only — 2028/2029

> **STOP — This gate is a LEGAL REQUIREMENT, not a development checklist.**
> Do NOT write a single line of Iran-specific code before completing ALL steps below.

| Step | Action | Responsible |
|------|--------|-------------|
| 1 | Engage US-qualified OFAC sanctions lawyer — not a general corporate lawyer | CEO |
| 2 | Engage EU sanctions lawyer if AMEC Solutions has any EU entity or EU investors | CEO + Legal |
| 3 | Obtain written legal opinion on travel booking platform permissibility for Iran | External OFAC Counsel |
| 4 | If permissible — obtain OFAC-specific license if required | External OFAC Counsel |
| 5 | Architecture review: Iran infrastructure MUST be completely isolated — separate AWS account, separate codebase branch, separate CI/CD pipeline, zero shared resources with any other market, separate Grafana/Prometheus monitoring instance | Dev Agent + CEO |
| 6 | White-label partner model only — UTUBooking never directly processes Iran payments | CEO + Finance |
| 7 | Weekly OFAC compliance script confirmed to run and verify isolation | Dev Agent + Compliance |

> **If legal clearance is NOT obtained: defer indefinitely.**
> No revenue target justifies sanctions risk.
>
> **Note on Farsi:** `fa` locale is already built in Phase 5. No language development is needed — activate only after legal clearance.

---

## PH5-7 006 · Muslim World B2B & Hajj Charter Operations

**Owner:** Sales Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly B2B review + Hajj season charter monitoring

**Purpose:** Manage B2B travel agency partners across Muslim World markets (TR/ID/MY/PK/IN) and monitor Hajj charter flight availability — a seasonal revenue category that requires dedicated sourcing beyond standard GDS inventory.

### B2B Partner Map — Muslim World

| Country | Partner type | Key differentiation | Billing |
|---------|-------------|---------------------|---------|
| Turkey | TURSAB-licensed agencies | Diyanet quota resellers, group Hajj organizers | Monthly / TRY |
| Indonesia | ASITA members, PPIU Umrah operators | Government-licensed Umrah organizers (PPIU = Penyelenggara Perjalanan Ibadah Umrah) | Monthly / IDR |
| Malaysia | MOTAC-licensed agencies | Tabung Haji integration resellers | Monthly / MYR |
| Pakistan | IATA-accredited agencies | Hajj charter seat resellers, group bookings | Monthly / PKR |
| India | IATA + HCoI-affiliated agencies | State Haj Committee resellers, group Hajj quota | Monthly / INR |

### Weekly B2B Pulse

```
Muslim World B2B weekly review — week of [DATE].

1. ACTIVE PARTNERS BY MARKET:
   SELECT country_code, partner_name, bookings_this_month,
          revenue_this_month_usd, last_booking_at
   FROM b2b_partners
   WHERE status='active'
     AND country_code IN ('TR','ID','MY','PK','IN')
   ORDER BY country_code, revenue_this_month_usd DESC;
   Any partner inactive > 14 days? 🔴 → Sales Agent call within 24h.

2. PPIU INDONESIA (government-licensed Umrah operators):
   PPIU partners are regulated by Kemenag — confirm each has valid 2025/2026 PPIU licence.
   Any partner whose PPIU licence expires within 90 days? Flag — cannot operate after expiry.
   SELECT partner_name, ppiu_licence_expiry FROM b2b_partners
   WHERE country_code='ID' AND ppiu_licence_expiry < NOW() + INTERVAL '90 days';

3. HAJJ GROUP QUOTAS:
   Any B2B partner requesting group Hajj quota allocation this week?
   Check national quota availability: TR (Diyanet), ID (Kemenag), PK (MoRA), IN (HCoI)
   Confirm group quota availability before promising to B2B partner.

4. OUTSTANDING INVOICES:
   SELECT country_code, partner_name, invoice_amount, currency, invoice_due_date, status
   FROM b2b_invoices
   WHERE status IN ('pending','overdue')
     AND country_code IN ('TR','ID','MY','PK','IN')
   ORDER BY invoice_due_date ASC;
   Any overdue > 30 days → Finance Agent + Sales Agent escalation.

Output: B2B health summary. Post to #b2b-muslim-world.
```

### Hajj Charter Flight Operations (May–July)

Hajj charter flights are NOT in standard GDS inventory — they require direct airline coordination:

```
Hajj charter flight sourcing — [YEAR] season.

CHARTER SOURCES:
- Pakistan: PIA seasonal Hajj charters (KHI/LHE/ISB→JED) — contact PIA Hajj desk annually in March
- Indonesia: Garuda Indonesia + Lion Air Hajj charters — Kemenag coordinates allocation
- India: Air India Haj charters — HCoI coordinates allocation; state-wise seats
- Malaysia: Malaysia Airlines + AirAsia Hajj flights — Tabung Haji coordinates
- Turkey: Turkish Airlines special Hajj fares — contact TK group desk

FOR EACH COUNTRY:
1. Has charter allocation been confirmed for [YEAR]? Seats per departure city?
2. Are charter fares loaded in our system? Source: direct airline contract (not GDS)
3. B2B partners with charter seat blocks: list + allocation per partner
4. Remaining charter seats available for direct consumer booking: [N]
5. Charter departure dates: [list] — all within Hajj ihram window

PRICING:
Charter fares are fixed (not dynamic) — confirm fixed price loaded correctly.
Do NOT apply AI dynamic pricing to Hajj charter fares.

Output: charter availability matrix by country + city + seat count.
Update products/CLAUDE.md Hajj charter section.
```

---

## PH5-7 007 · Muslim World Payment Operations

**Owner:** Finance Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Daily health check + on failure

**Purpose:** Operational procedure for all Phase 5–7 payment gateways. Each market has a distinct gateway requiring separate monitoring and failure response.

### Payment Gateway Map — Muslim World

| Country | Primary | Fallback | Currency | Shard |
|---------|---------|----------|----------|-------|
| Turkey | Iyzico | Stripe | TRY | eu-central-1 |
| Indonesia | Midtrans | Stripe | IDR | ap-southeast-1 |
| Malaysia | iPay88 | Stripe | MYR | ap-southeast-1 |
| Pakistan | JazzCash | Easypaisa → Stripe | PKR | ap-south-1 |
| India | Razorpay | Stripe | INR | ap-south-1 |

Always use `PaymentRouter.getGateway(countryCode)` — never hardcode.

### Daily Health Check Prompt

```
Muslim World payment gateway health check — [DATE].

TURKEY — Iyzico:
- POST /iyzico/initiate — returning conversationId? ✅/❌
- /iyzico/callback webhook — responding 200? ✅/❌
- TRY/USD FX rate: last updated < 15min? ✅/❌ (TRY volatility: flag if > 3% swing vs yesterday)
- getShardPool('TR') → eu-central-1. Connection count < 80% max? ✅/❌

INDONESIA — Midtrans:
- POST /midtrans/charge — snap_token returning? ✅/❌
- /midtrans/notification webhook — responding? Signature validation passing? ✅/❌
- IDR/USD rate: < 15min? ✅/❌
- getShardPool('ID') → ap-southeast-1. ✅/❌

MALAYSIA — iPay88:
- POST /ipay88/payment — redirecting to iPay88? ✅/❌
- /ipay88/callback — responding? BackendPostURL receiving? ✅/❌
- MYR/USD rate: < 15min? ✅/❌
- getShardPool('MY') → ap-southeast-1. ✅/❌

PAKISTAN — JazzCash + Easypaisa:
- POST /jazzcash/initiate — HMAC-SHA256 header present and correct? ✅/❌
- POST /easypaisa/initiate — SHA256 hash validating? ✅/❌
- PKR/USD rate: < 15min? ✅/❌ (PKR extreme volatility: flag if > 5% swing vs yesterday)
- getShardPool('PK') → ap-south-1. ✅/❌

INDIA — Razorpay:
- POST /razorpay/order — order_id returning? ✅/❌
- /razorpay/callback webhook — Razorpay-Signature validating? ✅/❌
- INR/USD rate: < 15min? ✅/❌
- getShardPool('IN') → ap-south-1. ✅/❌

RECONCILIATION:
SELECT gateway, COUNT(*) AS txns, SUM(amount_usd) AS total_usd
FROM payments
WHERE status='completed'
  AND created_at > NOW() - INTERVAL '24 hours'
  AND gateway IN ('iyzico','midtrans','ipay88','jazzcash','easypaisa','razorpay')
GROUP BY gateway;
Matches gateway dashboards (±0.5%)? ✅/❌

Any ❌ → open GitHub issue + notify Dev Agent.
FX swings flagged → notify Finance Agent.
```

### Failure Response

| Gateway | First action | Fallback | ETA |
|---------|-------------|----------|-----|
| Iyzico down | Route TR → Stripe | `PaymentRouter` config update | < 5 min |
| Midtrans down | Route ID → Stripe | `PaymentRouter` config update | < 5 min |
| iPay88 down | Route MY → Stripe | `PaymentRouter` config update | < 5 min |
| JazzCash down | Route PK → Easypaisa | `PaymentRouter` config update | < 5 min |
| Easypaisa also down | Route PK → Stripe | Note: Stripe PKR support limited — communicate to PK users | < 10 min |
| Razorpay down | Route IN → Stripe | `PaymentRouter` config update | < 5 min |

---

## PH5-7 008 · Hajj National Quota Operations

**Owner:** Products Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly during Hajj season (May–July); monthly off-season

**Purpose:** Monitor national hajj quota APIs for Turkey, Indonesia, and Pakistan. Ensure `getQuotaProvider(countryCode)` returns accurate, live data for each country's ministry.

### Quota Provider Map

| Country | Provider class | API source | Env var |
|---------|---------------|------------|---------|
| Turkey | `DiyanetQuotaProvider` | Diyanet İşleri Başkanlığı API | — (public) |
| Indonesia | `KemenagQuotaProvider` | Kemenag (Ministry of Religion) | `KEMENAG_API_KEY` |
| Pakistan | `MoRAQuotaProvider` | Ministry of Religious Affairs | — (public) |
| India | `HCoIQuotaWidget` | Haj Committee of India (widget) | — |

```
Hajj national quota health check — [DATE].

1. TURKEY (Diyanet):
   GET /api/hajj/national-quota {countryCode:'TR', year:[CURRENT_YEAR]}
   Response: { allocated: N, used: N, available: N } — data present? ✅/❌
   NationalQuotaCard renders correctly at /tr/hac? ✅/❌

2. INDONESIA (Kemenag):
   GET /api/hajj/national-quota {countryCode:'ID', year:[CURRENT_YEAR]}
   KEMENAG_API_KEY set in env? ✅/❌
   Response data present? ✅/❌
   NationalQuotaCard renders at /id/haji? ✅/❌
   Note: Indonesia has largest hajj quota globally (~221,000) — data accuracy critical.

3. PAKISTAN (MoRA):
   GET /api/hajj/national-quota {countryCode:'PK', year:[CURRENT_YEAR]}
   Response data present? ✅/❌
   NationalQuotaCard renders at /pk/hajj? ✅/❌

4. QUOTA DISPLAY:
   Verify NationalQuotaCard i18n via useTranslations('quota'):
   - Turkish (tr): "Hac Kotası" label correct? ✅/❌
   - Indonesian (id): "Kuota Haji" label correct? ✅/❌
   - Urdu (ur): RTL layout applying? ✅/❌

5. DURING HAJJ SEASON (May–July):
   Check daily. Any provider returning stale data (> 24h old)?
   Any allocated quota reaching > 90% used? Alert Products Agent — may need waitlist feature.

Report ❌ to Dev Agent. Stale quota data → open P1 issue (affects purchase decisions).
```

---

## PH5-7 009 · South Asia Compliance & RTL Quality Check

**Owner:** Compliance Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly

**Purpose:** Verify KVKK (Turkey), DPDP (India), and RTL locale rendering for ur/hi/id/ms. These markets have distinct compliance requirements and right-to-left rendering needs.

```
South Asia + Turkey compliance & RTL check — [DATE].

KVKK (TURKEY):
- GDPR banner showing for TR countryCode? (TR uses GDPR-equivalent banner) ✅/❌
- Consent log writing law='KVKK' for TR users? ✅/❌
  SELECT COUNT(*) FROM consent_log WHERE law='KVKK' AND created_at > NOW() - INTERVAL '7 days';
- KVKK erasure queue: SELECT COUNT(*) FROM gdpr_erasure_log
  WHERE user_country='TR' AND completed_at IS NULL;
  Any > 25 days old? Flag — 5 days to 30-day KVKK SLA.
- getShardPool('TR') → eu-central-1 (not London, not Frankfurt general) ✅/❌

DPDP (INDIA):
- DPDP rules status: published? (As of 2026-03 rules still pending)
  If rules published: trigger OPS-021 regulatory watch + Legal Agent brief.
- No mandatory consent banner yet — but Data Fiduciary obligations apply once rules live.
- getShardPool('IN') → ap-south-1. ✅/❌

RTL RENDERING:
- Urdu (ur): load /ur route. document.dir === 'rtl'? Font (Noto Nastaliq Urdu) loading? ✅/❌
  Booking form: labels right-aligned? Input text right-to-left? ✅/❌
- Hindi (hi): load /hi route. Devanagari font loading? ✅/❌
- Arabic (ar): load /ar route — RTL + Noto Kufi Arabic? ✅/❌
  (Covered by Phase 1-4 but verify APAC changes haven't broken AR)
- Persian (fa): load /fa route — RTL + Noto Nastaliq? ✅/❌

FX VOLATILITY FLAGS (Muslim World markets):
SELECT currency_code, current_rate, previous_rate,
       ABS(current_rate - previous_rate) / previous_rate * 100 AS change_pct
FROM fx_rates
WHERE currency_code IN ('TRY','PKR','IDR','INR')
  AND updated_at > NOW() - INTERVAL '24 hours';
Any > 3% daily swing? Notify Finance Agent — review pricing strategy for affected market.

Report all ❌. RTL failures are P1 (affects all Muslim World users).
```

---

## PH5-7 010 · Muslim World Monthly Finance Reconciliation

**Owner:** Finance Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Monthly financial close for all Phase 5–7 markets — reconciling 6 gateways across 5 currencies, capturing local VAT obligations, and flagging extreme FX movements that distort USD revenue comparisons.

### Local Tax Rates — Muslim World

| Country | Tax type | Rate | Filing authority | Filing frequency |
|---------|---------|------|-----------------|-----------------|
| Turkey | KDV (VAT) | 20% | GİB (gib.gov.tr) | Monthly |
| Indonesia | PPN (VAT) | 11% | DJP (pajak.go.id) | Monthly |
| Malaysia | SST (Sales & Service Tax) | 8% service | RMCD (customs.gov.my) | Bi-monthly |
| Pakistan | GST | 17% (Federal) | FBR (fbr.gov.pk) | Monthly |
| India | GST | 5–12% (travel services) | GST Portal (gst.gov.in) | Monthly |

> Tax filings are handled by local external accountants. Finance Agent drafts the summary; local accountant files.

### Monthly Finance Close Prompt

```
Muslim World monthly financial reconciliation — [MONTH YEAR].
Markets: TR · ID · MY · PK · IN

1. TRANSACTIONS BY MARKET:
   SELECT country_code, currency, gateway,
          COUNT(*) AS bookings,
          SUM(amount_local) AS gross_local,
          SUM(amount_usd) AS gross_usd,
          SUM(vat_collected_local) AS vat_local
   FROM payments
   WHERE status = 'completed'
     AND country_code IN ('TR','ID','MY','PK','IN')
     AND created_at >= '[MONTH-01]' AND created_at < '[MONTH+1-01]'
   GROUP BY country_code, currency, gateway
   ORDER BY gross_usd DESC;

2. GATEWAY RECONCILIATION:
   Cross-reference database totals with:
   - Iyzico settlement report (TR) — TRY amount ± 0.5%
   - Midtrans settlement report (ID) — IDR amount ± 0.5%
   - iPay88 settlement report (MY) — MYR amount ± 0.5%
   - JazzCash settlement report (PK) — PKR amount ± 0.5%
   - Easypaisa settlement report (PK) — PKR amount ± 0.5%
   - Razorpay settlement report (IN) — INR amount ± 0.5%
   Flag any variance > 0.5% per gateway.

3. FX IMPACT ANALYSIS:
   SELECT currency_code,
          AVG(rate_vs_usd) AS avg_monthly_rate,
          MIN(rate_vs_usd) AS min_rate,
          MAX(rate_vs_usd) AS max_rate,
          (MAX(rate_vs_usd) - MIN(rate_vs_usd)) / MIN(rate_vs_usd) * 100 AS volatility_pct
   FROM fx_rates
   WHERE currency_code IN ('TRY','IDR','MYR','PKR','INR')
     AND recorded_at >= '[MONTH-01]' AND recorded_at < '[MONTH+1-01]'
   GROUP BY currency_code;

   If TRY or PKR volatility > 10% for the month:
   - Recalculate net revenue using month-end rate vs month-start rate
   - Show USD revenue at both rates — flag difference to CEO
   - Note: stored USD amounts use rate-at-booking-time (correct for accounting);
     this analysis is for strategic pricing review only.

4. VAT SUMMARY BY COUNTRY:
   GROUP BY country_code: gross_local, vat_collected_local, vat_rate_applied
   Compare vat_collected vs (gross_local × vat_rate) — any rounding variance > 1%?
   Generate draft VAT summary for each country's local accountant:
   - TR: KDV [amount TRY] — due by 28th to GİB
   - ID: PPN [amount IDR] — due by 31st to DJP
   - MY: SST [amount MYR] — due bi-monthly to RMCD
   - PK: GST [amount PKR] — due by 15th to FBR
   - IN: GST [amount INR] — due by 20th to GST Portal

5. HAJJ QUOTA REVENUE (seasonal — May–July):
   SELECT country_code, COUNT(*) AS hajj_packages, SUM(amount_usd) AS hajj_revenue_usd
   FROM bookings
   WHERE product_type = 'hajj_package'
     AND country_code IN ('TR','ID','MY','PK','IN')
     AND created_at >= '[MONTH-01]' AND created_at < '[MONTH+1-01]';
   Hajj packages have higher margin — show separately from standard bookings.

6. OUTSTANDING INSTALLMENTS (PK packages):
   SELECT user_id, total_amount_pkr, paid_to_date_pkr, next_installment_date
   FROM installment_plans
   WHERE country_code = 'PK' AND status = 'active'
     AND next_installment_date <= '[MONTH+1-01]';
   Any installment due next month — send reminder via CS Agent 7 days prior.

7. VARIANCE VS PRIOR MONTH:
   Compare gross_usd total for TR/ID/MY/PK/IN this month vs prior month.
   Flag any market with > 15% decline → investigate: seasonal? competitive? technical?
   Flag any market with > 30% growth → verify: real growth or data anomaly?

Output:
- Finance report: docs/reports/monthly/[YYYY-MM]-muslim-world-finance.md
- VAT summaries emailed to local accountants by 5th of month
- FX volatility alert: post to #finance if TRY or PKR moved > 10% in month
- Tag CEO for any gateway variance > 0.5% or market decline > 15%
```

### Settlement Timing Reference

| Gateway | Settlement lag | Currency | Notes |
|---------|---------------|----------|-------|
| Iyzico | T+2 business days | TRY | Direct bank transfer to Turkish account |
| Midtrans | T+3 business days | IDR | Settles to Indonesian bank account |
| iPay88 | T+3 business days | MYR | Settles to Malaysian bank account |
| JazzCash | T+3 business days | PKR | Settles to Pakistani bank account |
| Easypaisa | T+3 business days | PKR | Separate settlement from JazzCash |
| Razorpay | T+2 business days | INR | Settles to Indian bank account |

---

## PH5-001 · Phase 5 (Turkey/Indonesia/Malaysia) — Muslim World Weekly Check

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly

```
Muslim World weekly operations check (TR/ID/MY).

TURKEY:
- Iyzico: last successful payment timestamp? /iyzico/callback responding?
- getShardPool('TR') → eu-central-1 (Istanbul shard). Connected? ✅/❌
- Diyanet quota: GET /api/hajj/national-quota {countryCode:'TR'} — returning data? ✅/❌
- TRY/USD rate: check wallet FX service — last rate update < 15min? ✅/❌

INDONESIA:
- Midtrans: webhook /midtrans/callback responding 200? Last transaction logged?
- getShardPool('ID') → ap-southeast-1 routing? ✅/❌
- Kemenag quota: GET /api/hajj/national-quota {countryCode:'ID'} — KEMENAG_API_KEY set? ✅/❌
- IDR/USD rate: < 15min old? ✅/❌

MALAYSIA:
- iPay88: /ipay88/callback responding? Last successful test: ✅/❌
- getShardPool('MY') → ap-southeast-1. ✅/❌
- MYR/USD rate: < 15min old? ✅/❌

Any ❌: create GitHub issue + notify relevant gateway support team.
```

---

## PH6-001 · Phase 6 (Pakistan/India) — South Asia Weekly Check

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly

```
South Asia weekly operations check (PK/IN).

PAKISTAN:
- JazzCash: POST /jazzcash/initiate responding? HMAC-SHA256 headers correct? ✅/❌
- Easypaisa: POST /easypaisa/initiate responding? SHA256 hash correct? ✅/❌
- getShardPool('PK') → ap-south-1. ✅/❌
- MoRA quota: GET /api/hajj/national-quota {countryCode:'PK'} — data returned? ✅/❌
- PKR/USD rate: < 15min old? ✅/❌
- Urdu RTL: test booking flow in ur locale — direction:rtl applying? ✅/❌

INDIA:
- Razorpay: webhook /razorpay/callback responding? Signature validation passing? ✅/❌
- getShardPool('IN') → ap-south-1. ✅/❌
- HCoI quota widget: /api/hcoi/status — responding? ✅/❌
- INR/USD rate: < 15min old? ✅/❌
- Hindi Devanagari font loading? Test /hi route. ✅/❌

Any ❌: create GitHub issue + notify Dev Agent.
```

---

## PHASES 8–12 — GLOBAL EXPANSION
### Global Expansion SOPs
**Europe · United States · Canada · South America**

---

## PH8-12 001 · GDPR Compliance Operations (Europe)

**Owner:** CEO + Legal Agent (AI) &nbsp;|&nbsp; **Frequency:** Ongoing — all EU/UK users

> **GDPR applies to ALL European users from the moment Phase 8 launches. These procedures are non-negotiable legal obligations — not best practices.**

| GDPR Procedure | Trigger | Time Limit | Claude Prompt |
|----------------|---------|------------|---------------|
| Data Erasure Request | User submits deletion request via app | 30 days (GDPR law) | `Process GDPR erasure for user_id [X]. Cascade delete all 6 AWS regions. Log with timestamp.` |
| Data Portability Request | User requests data export | 30 days | `Export all user data for user_id [X] as JSON. All tables, all regions. Signed download link.` |
| Data Breach Notification | Security incident detected | 72 hours to notify ICO/DPA | `URGENT: Assess data breach scope. Identify affected users. Draft notification to ICO.` |
| New DPA Agreement | New third-party processor added | Before first data processing | `Generate DPA checklist for new processor [Name]. Verify against GDPR Article 28.` |
| Cookie Consent Update | New analytics/marketing tool added | Before tool activated | `Update cookie consent categories. Add [tool] to analytics category. Verify no pre-ticked boxes.` |
| Right to Object | User objects to marketing | Immediately | `Mark user_id [X] as opted-out of all marketing. Remove from all lists. Log.` |

---

## PH8-12 002 · United States Operations SOP (Phase 10)

**Owner:** CEO + Legal Agent (AI) &nbsp;|&nbsp; **Frequency:** Ongoing — all US users

| Procedure | Details |
|-----------|---------|
| CCPA Opt-Out Processing | User clicks "Do Not Sell My Information". Deadline: 15 business days. Claude prompt: `Process CCPA opt-out for user_id [X].` |
| California Seller of Travel | CST number displayed on site. Renewal: annual. Store certificate in `legal/usa/california/`. |
| IATA Ticket Sales | Verify IATA accreditation active. If expired: suspend flight ticket sales until renewed. |
| DOT Compliance | All flight prices shown as ALL-IN (taxes included). No hidden fees at checkout. Monthly audit. |
| US Halal Feature Ops | Halal hotel filter updates: quarterly review of `halal_amenities` data for US properties. |
| Muslim American Content | Monthly: Claude Marketing Agent generates 2 US Muslim community blog posts + 4 social posts. |

---

## PH8-12 003 · Brazil LGPD Compliance Operations (Phase 12)

**Owner:** CEO + Legal Agent (AI) &nbsp;|&nbsp; **Frequency:** Ongoing — all Brazilian users

| Procedure | Details |
|-----------|---------|
| LGPD Consent Logging | All Brazilian user consents stored in `consent_logs` table. Monthly audit: confirm 100% coverage. |
| ANPD Registration | DPO registered with ANPD (anpd.gov.br). Annual renewal. Certificate in `legal/brazil/`. |
| Erasure Requests | LGPD erasure: 15 business days. Same workflow as GDPR but route to AWS sa-east-1. |
| Pix Reconciliation | Daily: reconcile Pix transactions vs Stripe Brazil dashboard. Instant payments = instant reconciliation. |
| ICMS (Brazilian VAT) | ~17% ICMS on digital services. Monthly calculation per state. State-specific rates — use RFB data. |
| Portuguese Content | Monthly: Claude Marketing Agent generates 4 pt-BR blog posts + WhatsApp broadcast for Umrah season. |

---

## PHASE 8 — IMPLEMENTED & LIVE
### Western Europe + United Kingdom SOPs
**Germany · France · Netherlands · Belgium · Spain · Italy · Poland · Switzerland · United Kingdom**

### Current Live Status — Phase 8 Achievements

| Status | Feature |
|--------|---------|
| ✅ | EU GDPR consent banner (7 languages) — no pre-ticked boxes, Art. 7 compliant |
| ✅ | UK GDPR separate banner + ICO registration (eu-west-2 London shard — never mixed with Frankfurt) |
| ✅ | Booking.com adapter — EU/UK primary hotel source (`searchHotelsRouted`) |
| ✅ | Stripe EU payment methods: SEPA Debit, iDEAL (NL), Klarna (SE/DE), Bancontact (BE) |
| ✅ | TWINT (Switzerland) — `twint.gateway.js` + `SwitzerlandPaymentSelector.tsx` |
| ✅ | EuropePaymentSelector — renders correct methods per countryCode |
| ✅ | Data residency: EU → eu-central-1 Frankfurt; UK → eu-west-2 London (strict separation) |
| ✅ | GDPR erasure / access / portability routes live — 30-day SLA tracked |
| ✅ | CF stacks: `16-eu-west-2-london.yml` + `17-eu-central-1-frankfurt.yml` |
| ✅ | 7 EU locales: de, fr, nl, it, pl, es + en-GB |

---

## PH8-002 · EU/UK GDPR Compliance Operations

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Daily SLA check + on every DSR received

**Purpose:** Operational procedure for all GDPR and UK GDPR data subject requests (DSR) — ensuring every request is logged, routed to the correct shard, and completed within the 30-day SLA. Breaches must be escalated within 72 hours.

### SLA Dashboard (run daily in OPS-001)

```
GDPR/UK GDPR SLA check — [DATE].

EU GDPR (Frankfurt shard):
SELECT id, user_id, request_type, created_at,
       EXTRACT(DAY FROM NOW() - created_at) AS age_days,
       completed_at
FROM gdpr_erasure_log
WHERE completed_at IS NULL
  AND user_country NOT IN ('GB')
ORDER BY created_at ASC;

UK GDPR (London shard — run separately on eu-west-2):
SELECT id, user_id, request_type, created_at,
       EXTRACT(DAY FROM NOW() - created_at) AS age_days
FROM gdpr_erasure_log
WHERE completed_at IS NULL
  AND user_country = 'GB'
ORDER BY created_at ASC;

Urgency flags:
- age_days > 25: 🟡 5 days remaining — assign to Compliance Agent today
- age_days > 28: 🔴 P1 — SLA breach imminent — escalate to CEO + Privacy Officer
- age_days > 30: 🚨 SLA BREACHED — notify DPA within 72h of discovery if high-risk

CONSENT LOG AUDIT (weekly, include in GBL-002):
SELECT law, granted, COUNT(*), MAX(created_at)
FROM consent_log
WHERE law IN ('GDPR','KVKK') AND created_at > NOW() - INTERVAL '7 days'
GROUP BY law, granted ORDER BY law, granted;
```

### DSR Processing by Type

| Request type | Route | Shard | Max SLA |
|-------------|-------|-------|---------|
| Erasure (Art. 17) | `POST /api/user/gdpr/erase` | EU → Frankfurt; UK → London | 30 days |
| Access (Art. 15) | `GET /api/user/gdpr/export` | EU → Frankfurt; UK → London | 30 days |
| Portability (Art. 20) | `POST /api/user/gdpr/portability` | EU → Frankfurt; UK → London | 30 days |
| Rectification (Art. 16) | `POST /api/user/gdpr/rectify` | EU → Frankfurt; UK → London | 30 days |
| Consent history (Art. 7) | `GET /api/user/gdpr/consents` | EU → Frankfurt; UK → London | Immediate |

**Data residency rule — never skip:**
- `getShardPool('GB')` → eu-west-2 (London) only
- `getShardPool('DE'/'FR'/'NL'/etc)` → eu-central-1 (Frankfurt) only
- Cross-region query = UK GDPR violation — treat as a P1 bug

### 72-Hour Breach Notification Gate

If a data breach affecting EU or UK users is discovered:

```
⚠️ GDPR BREACH NOTIFICATION REQUIRED — [DATE/TIME OF DISCOVERY]

1. Log discovery timestamp in breach_log — this starts the 72h clock
2. Identify: affected users count, data categories, geographic scope (EU vs UK vs both)
3. EU breach → notify lead DPA within 72h of discovery
   UK breach → notify ICO within 72h of discovery
   Both → notify BOTH DPAs — EU and ICO separately (UK GDPR ≠ EU GDPR post-Brexit)
4. Draft notification (English) — see EMG-003 for template
5. CEO + Legal Agent must review BEFORE filing with any DPA
6. Do NOT file without CEO sign-off

DPA contacts: see compliance/gdpr/checklist.md
ICO contact: ico.org.uk/make-a-complaint/data-security-breaches/
```

---

## PH8-003 · EU/UK Hotel Routing & Booking.com Operations

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly health check + on any search degradation alert

**Purpose:** Confirm EU/UK hotel search correctly routes to Booking.com as primary source, with Hotelbeds as fallback. Makkah always uses Hotelbeds regardless of user origin.

```
EU/UK hotel routing health check — [DATE].

1. EU USER (Frankfurt routing):
   Call searchHotelsRouted({destination:'Paris', countryCode:'DE', checkIn:'[date]', checkOut:'[date]', guests:2})
   - source === 'bookingcom' in results? ✅/❌
   - Response time < 5s? ✅/❌
   - At least 10 results returned? ✅/❌

2. UK USER (London routing):
   Call searchHotelsRouted({destination:'London', countryCode:'GB', checkIn:'[date]', checkOut:'[date]', guests:2})
   - source === 'bookingcom' in results? ✅/❌
   - Response time < 5s? ✅/❌

3. MAKKAH (always Hotelbeds — regardless of user origin):
   Call searchHotelsRouted({destination:'Makkah', countryCode:'GB', isUmrah:true, ...})
   - source === 'hotelbeds' in results? ✅/❌  ← must be Hotelbeds even for UK user
   - Hotels within 500m of Haram present? ✅/❌

4. BOOKING.COM ADAPTER:
   Check backend/adapters/hotels/bookingCom.ts OAuth2 token:
   - Token not expired? ✅/❌
   - Last successful API call timestamp < 1h? ✅/❌
   - Rate limit remaining > 20%? ✅/❌

5. HOTELBEDS FALLBACK (if Booking.com degraded):
   Simulate Booking.com timeout → does system fall back to Hotelbeds automatically? ✅/❌
   - Fallback results returned in < 8s? ✅/❌

6. SWITZERLAND (nFADP — NOT GDPR):
   TWINT: POST /twint/initiate — responding? ✅/❌
   SwitzerlandPaymentSelector: shows TWINT for CH countryCode? ✅/❌
   Note: CH is NOT in EU — nFADP applies, not GDPR. Consent banner still best practice.

Any ❌ → open GitHub issue. Booking.com token expiry: rotate before it expires.
```

---

## PH8-004 · EU/UK Monthly Finance Reconciliation

**Owner:** Finance Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Monthly financial close for all Phase 8 markets — 9 EU countries plus the UK, each with its own VAT rate and local payment methods. UK must be reconciled separately from EU (different Stripe account, different VAT regime post-Brexit).

### EU/UK VAT Rates Reference

| Country | VAT rate | Filing authority | Threshold for registration |
|---------|---------|-----------------|--------------------------|
| Germany (DE) | 19% | Finanzamt / BZSt | None (OSS covers EU-wide) |
| France (FR) | 20% | DGFiP | None (OSS) |
| Netherlands (NL) | 21% | Belastingdienst | None (OSS) |
| Belgium (BE) | 21% | FOD Financiën | None (OSS) |
| Spain (ES) | 21% | AEAT | None (OSS) |
| Italy (IT) | 22% | Agenzia delle Entrate | None (OSS) |
| Poland (PL) | 23% | KAS | None (OSS) |
| Switzerland (CH) | 8.1% | ESTV | CHF 100,000 annual threshold |
| United Kingdom (GB) | 20% | HMRC | £85,000 annual threshold |

> **EU One-Stop-Shop (OSS):** A single quarterly VAT return covers all 27 EU member states. File via the EU country of registration. Finance Agent drafts; external EU VAT accountant files.
> **UK VAT:** Filed separately with HMRC. UK is NOT in EU OSS post-Brexit.
> **Switzerland:** nFADP data law + separate Swiss VAT — not covered by EU OSS.

### Monthly Finance Close Prompt

```
EU/UK monthly financial reconciliation — [MONTH YEAR].
Markets: DE · FR · NL · BE · ES · IT · PL · CH · GB

1. TRANSACTIONS BY MARKET:
   SELECT country_code, currency, gateway,
          COUNT(*) AS bookings,
          SUM(amount_local) AS gross_local,
          SUM(amount_usd) AS gross_usd,
          SUM(vat_collected_local) AS vat_local,
          vat_rate
   FROM payments
   WHERE status = 'completed'
     AND country_code IN ('DE','FR','NL','BE','ES','IT','PL','CH','GB')
     AND created_at >= '[MONTH-01]' AND created_at < '[MONTH+1-01]'
   GROUP BY country_code, currency, gateway, vat_rate
   ORDER BY gross_usd DESC;

2. GATEWAY RECONCILIATION:
   EU markets (Stripe EU account):
   - Pull Stripe EU balance transaction report for [month]
   - Compare to DB: gross_usd per EU country ± 0.1%
   - SEPA Debit: any failed mandates? Refunds issued?
   - iDEAL (NL): settlement timing T+1? Any failures?
   - Klarna (DE/SE): any disputes or returns?

   Switzerland (TWINT via Stripe CH or separate):
   - TWINT settlement report — CHF amount ± 0.5%

   United Kingdom (Stripe UK account — separate from EU):
   - Stripe UK balance transaction report for [month]
   - Compare to DB: gross_gbp ± 0.1%
   - Open Banking payments: any failures or reversals?

3. EU VAT OSS SUMMARY (quarterly filing input):
   GROUP BY country_code: vat_collected_local, converted to EUR at ECB month-end rate
   Total EU VAT collected this month: [EUR amount]
   Running quarter total (Q[N]): [EUR amount]
   If end of quarter: trigger OSS filing with external EU VAT accountant.
   Deadline: last day of month following quarter end (Q1 → 30 April).

4. UK VAT SUMMARY (separate HMRC filing):
   UK VAT collected this month (GBP): [amount]
   Running quarter total: [amount]
   If end of quarter: trigger HMRC VAT return.
   Deadline: 1 month + 7 days after quarter end.

5. SWITZERLAND VAT:
   CHF revenue this month: [amount]
   Is annual CHF revenue > 100,000? If yes: ESTV registration required → flag to Legal Agent.

6. GDPR ERASURE COST TRACKING:
   Any GDPR erasure requests completed this month?
   Engineering hours spent on DSR processing: [hours]
   Include in operating costs for EU markets.

7. BOOKING.COM COMMISSION:
   SELECT SUM(commission_paid_usd) AS bookingcom_commission,
          COUNT(*) AS bookings_via_bookingcom
   FROM hotel_bookings
   WHERE source = 'bookingcom'
     AND country_code IN ('DE','FR','NL','BE','ES','IT','PL','CH','GB')
     AND created_at >= '[MONTH-01]' AND created_at < '[MONTH+1-01]';
   Commission as % of EU hotel revenue? Flag if > 18% (renegotiation trigger).

8. P&L — EU vs UK (separate):
   EU (DE/FR/NL/BE/ES/IT/PL): gross_usd, supplier costs, net revenue, VAT collected
   UK (GB): gross_gbp → USD, supplier costs, net revenue, VAT collected
   CH: gross_chf → USD, supplier costs, net revenue
   MoM variance per region — flag > 10% decline.

Output:
- Finance report: docs/reports/monthly/[YYYY-MM]-eu-uk-finance.md
- EU OSS input sheet: Finance/VAT/EU-OSS/[YYYY-QN]-[MONTH]-input.xlsx
- UK VAT input: Finance/VAT/UK/[YYYY-QN]-[MONTH]-input.xlsx
- Booking.com commission alert if > 18% → tag CEO + Products Agent
- Tag CEO for any Stripe variance > 0.1% or market decline > 10%
```

### EU Financial Compliance Calendar

| Obligation | Deadline | Owner | Notes |
|-----------|----------|-------|-------|
| EU OSS VAT return (Q1) | 30 April | External EU accountant | Finance Agent drafts data |
| EU OSS VAT return (Q2) | 31 July | External EU accountant | |
| EU OSS VAT return (Q3) | 31 October | External EU accountant | |
| EU OSS VAT return (Q4) | 31 January | External EU accountant | |
| UK VAT return (quarterly) | 1 month + 7 days after quarter | External UK accountant | Filed via HMRC Making Tax Digital |
| CH VAT return | Quarterly / annually | External CH accountant | If above CHF 100k threshold |
| ICO registration renewal (UK GDPR) | Annual | Compliance Agent + CEO | Fee: £40–£2,900; auto-renew |

---

## PH8-001 · Phase 8 (Western Europe) — EU Weekly Compliance & Tech Check

**Owner:** Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** Weekly

```
EU/UK weekly check (GB/DE/FR/NL/ES/IT/PL).

GDPR BANNER:
- Visit utubooking.com with X-Country-Code: DE header.
- GDPRConsentBanner visible? Pre-ticked boxes absent? ✅/❌
- Consent logged to POST /api/compliance/consent on accept? ✅/❌

BOOKING.COM:
- Test searchHotelsRouted({destination:'London', countryCode:'GB', ...})
- Source === 'bookingcom' in results? ✅/❌
- Response time < 5s? ✅/❌

STRIPE EU METHODS:
- SEPA Debit available for DE user? iDEAL for NL? Klarna for SE/DE? ✅/❌
- EuropePaymentSelector rendering correct methods for each EU countryCode? ✅/❌

DATA RESIDENCY:
- EU user booking: confirm written to eu-central-1 shard (getShardPool('DE'/'FR'/etc) → Frankfurt). ✅/❌
- UK user booking: confirm written to eu-west-2 shard (getShardPool('GB') → London). ✅/❌
  Note: UK data MUST NOT go to Frankfurt — UK GDPR ≠ EU GDPR. ❌ if cross-region.

GDPR OPEN REQUESTS:
SELECT COUNT(*) FROM gdpr_erasure_log WHERE completed_at IS NULL;
Any > 25 days old? Flag immediately — 5 days left before SLA breach.
```

---

## PH8-005 · EU Countries Launch SOP (Phase 8)

**Owner:** CEO + Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** One-time launch per country

**Purpose:** Launch checklist for all EU member state markets. All EU countries share GDPR, EU OSS VAT, Frankfurt shard, and Booking.com hotel routing — but each has country-specific payment methods, local language requirements, and supplementary national data laws.

### EU Countries — Key Differentiators

| Country | Local payment method | Supplementary data law | Language | VAT rate |
|---------|---------------------|----------------------|----------|---------|
| Germany (DE) | SEPA Debit, Klarna | BDSG + TTDSG (strict cookie law) | de | 19% |
| France (FR) | Carte Bancaire (via Stripe) | CNIL rules — "refuse all" button required | fr | 20% |
| Netherlands (NL) | iDEAL (Mollie/Stripe) | AP — opt-in analytics, no exceptions | nl | 21% |
| Belgium (BE) | Bancontact (Stripe) | APD (similar to GDPR baseline) | nl + fr | 21% |
| Spain (ES) | Bizum (Stripe) | AEPD — GDPR + ePrivacy strict | es | 21% |
| Italy (IT) | PostePay (Stripe) | Garante — enforcement active | it | 22% |
| Poland (PL) | BLIK (Stripe) | UODO — KSeF e-invoicing mandatory | pl | 23% |

### EU Launch Checklist (run per country)

```
EU country launch checklist — [COUNTRY CODE] — [TARGET DATE].

LEGAL:
[ ] EU representative appointed under Art. 27 GDPR (required if no EU establishment)
    Name + contact in compliance/gdpr/dpa-register.md ✅/❌
[ ] Lead DPA identified for [CC] — file in compliance/gdpr/checklist.md ✅/❌
[ ] Local travel agent registration (if required in [CC]) — legal/[CC]/

TECHNICAL:
[ ] EuropePaymentSelector: correct payment methods showing for countryCode='[CC]'? ✅/❌
    DE: SEPA Debit + Klarna ✅/❌
    FR: Carte Bancaire (Stripe default) ✅/❌
    NL: iDEAL ✅/❌
    BE: Bancontact ✅/❌
    ES: Bizum ✅/❌
    IT: PostePay / standard Stripe ✅/❌
    PL: BLIK ✅/❌
[ ] getShardPool('[CC]') → eu-central-1 (Frankfurt) ✅/❌
    Note: NOT eu-west-2 London — that is UK only.
[ ] searchHotelsRouted({countryCode:'[CC]'}) → source='bookingcom' ✅/❌
[ ] Amadeus flights: major [CC] airports + flag carriers returning fares? ✅/❌

LOCALISATION:
[ ] locales/[locale].json complete vs locales/en.json ✅/❌
[ ] Currency format correct for [CC] ✅/❌
[ ] VAT label: "[CC] VAT [X]%" on invoices ✅/❌
[ ] Native QA: native speaker reviewed — Notion sign-off ✅/❌

COMPLIANCE:
[ ] GDPRConsentBanner shows for [CC] countryCode ✅/❌
[ ] No pre-ticked boxes ✅/❌
[ ] "Decline all" button as prominent as "Accept all" (CNIL + ICO standard) ✅/❌
[ ] Consent logged: law='GDPR', country=[CC] ✅/❌
[ ] Data residency: getShardPool('[CC]') → eu-central-1 ONLY ✅/❌
[ ] Germany (DE) specific: TTDSG — no implied consent for analytics; explicit opt-in only ✅/❌
[ ] France (FR) specific: CNIL "refuse all" button: identical size/prominence to "accept all" ✅/❌
[ ] Poland (PL) specific: KSeF e-invoicing — does billing service support structured XML invoice? ✅/❌

FINANCE:
[ ] EU OSS VAT registration covers [CC] — confirm [CC] is in OSS return scope ✅/❌
[ ] VAT rate configured: [rate]% for [CC] in billing service ✅/❌
[ ] EUR currency display (or local if non-EUR: PLN for PL) ✅/❌

CLAUDE.MD UPDATES:
[ ] marketing/CLAUDE.md: [CC] section — local airline, key Islamic calendar dates, tone guide
[ ] finance/CLAUDE.md: [CC] VAT rate + local currency + OSS filing note
[ ] Commit: git commit -m "feat: add [CC] market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from Frankfurt region ✅/❌
[ ] ops/launch-approvals/[CC]-[YYYY-MM-DD].md signed ✅/❌
```

### EU Ongoing Operations

**Weekly (in PH8-001):** GDPR banner, Booking.com source, SEPA/iDEAL/Bancontact methods, data residency Frankfurt
**Monthly (in PH8-004):** EU OSS VAT input, Stripe EU reconciliation, Booking.com commission check
**Quarterly:** EU OSS filing (30 days after quarter end) — Finance Agent drafts, external EU VAT accountant files

---

## PH8-006 · United Kingdom Launch SOP (Phase 8)

**Owner:** CEO + Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** One-time launch

**Purpose:** UK is a completely separate legal, regulatory, and technical jurisdiction from EU — post-Brexit. UK GDPR ≠ EU GDPR. UK data MUST stay in eu-west-2 London, never Frankfurt. ICO registration required before processing any UK personal data.

### UK Market Snapshot

| Item | Detail |
|------|--------|
| **Legal** | No specific travel agent licence required at national level. Check whether ATOL (Air Travel Organiser's Licence) needed for package holidays. |
| **Data law** | UK GDPR + Data Protection Act 2018. Regulator: ICO (ico.org.uk). Registration required before processing — fee: £40–£2,900/year. |
| **Payment** | Stripe UK — Visa/MC/Amex, Apple Pay, Google Pay. Open Banking (via Stripe Financial Connections). |
| **Language** | en-GB locale. British English: "travelling", "organise", "authorise". No "z" spellings. |
| **Key airlines** | British Airways (BA) + easyJet (U2) + Flydubai (FZ) via Amadeus. LHR/LGW/MAN/BHX→JED/MED. |
| **VAT** | UK VAT 20%. Register with HMRC (gov.uk/vat-registration). HMRC VAT number on all UK invoices. Annual threshold: £85,000. |
| **Currency** | GBP (£). Format: `£1,234.56`. Show USD equivalent. |
| **Data shard** | eu-west-2 (London) — `getShardPool('GB')` — NEVER routes to Frankfurt. |

### UK Launch Checklist

```
United Kingdom launch checklist — [TARGET DATE].

LEGAL:
[ ] ATOL licence assessment: do our packages constitute "package holidays" under Package Travel Regs 2018?
    If yes: ATOL licence required from CAA (caa.co.uk) — file in legal/GB/
[ ] ICO registration completed — ico.org.uk/registration
    File ICO registration number in compliance/GB/ico-registration.*
    Annual fee paid (£40–£2,900 depending on tier) ✅/❌
[ ] UK privacy policy drafted — UK GDPR-specific disclosures (separate from EU policy) ✅/❌
[ ] UK terms of service — Consumer Contracts Regulations 2013: 14-day cooling-off period disclosed ✅/❌

TECHNICAL:
[ ] getShardPool('GB') → eu-west-2 (London) — NOT eu-central-1 ✅/❌
    This is the most critical check. Any cross-contamination with Frankfurt = UK GDPR violation.
[ ] Stripe UK account active (separate from EU Stripe account) ✅/❌
    STRIPE_UK_SECRET_KEY in .env ✅/❌
[ ] Open Banking (Stripe Financial Connections): UK bank account linking working? ✅/❌
[ ] British Airways (BA) + easyJet (U2) fares: LHR→JED, LGW→JED returning in Amadeus? ✅/❌
    Add LHR/LGW/MAN/BHX/EDI/BFS airports to amadeus-airlines.json ✅/❌
[ ] searchHotelsRouted({countryCode:'GB'}) → source='bookingcom' ✅/❌

LOCALISATION:
[ ] locales/en-GB.json complete ✅/❌
[ ] British English: "travelling" not "traveling", "authorise" not "authorize" ✅/❌
[ ] Currency: £1,234.56 (GBP symbol, Western format) ✅/❌
[ ] UK VAT label: "VAT 20%" on all GB invoices ✅/❌
[ ] HMRC VAT number on invoice footer ✅/❌
[ ] Date format: DD/MM/YYYY (not MM/DD/YYYY) ✅/❌

COMPLIANCE:
[ ] UK GDPR consent banner: separate component instance for GB countryCode ✅/❌
    OR: GDPRConsentBanner.tsx confirmed working for GB (verify ICO standard met, not just EDPB)
[ ] Consent logged: law='UK_GDPR', country='GB' ✅/❌
[ ] UK data residency: getShardPool('GB') → eu-west-2. Run audit after first 10 GB bookings. ✅/❌
[ ] DSAR routes active: POST /api/user/gdpr/erase on GB shard → eu-west-2 ✅/❌
[ ] Breach notification procedure: ICO 72h window documented in compliance/GB/ ✅/❌
[ ] 14-day cooling-off right: is it displayed and honoured in booking terms? ✅/❌

FINANCE:
[ ] HMRC VAT registration (if annual UK revenue > £85,000 or voluntary registration)
[ ] UK VAT 20% in billing service for GB users ✅/❌
[ ] GBP/USD FX rate: updating every 15 min ✅/❌
[ ] Stripe UK settlement: UK bank account configured ✅/❌
[ ] UK VAT return: quarterly to HMRC via Making Tax Digital (MTD) ✅/❌

CLAUDE.MD UPDATES:
[ ] marketing/CLAUDE.md: UK section — BA + easyJet routes, UK Muslim community travel patterns, British English tone
[ ] finance/CLAUDE.md: GBP format + UK VAT 20% + HMRC quarterly MTD filing
[ ] compliance/CLAUDE.md: UK GDPR separate from EU GDPR — ICO registration + 72h breach to ICO
[ ] Commit: git commit -m "feat: add United Kingdom (GB) market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from London region ✅/❌
[ ] ops/launch-approvals/GB-[YYYY-MM-DD].md signed ✅/❌
```

### UK Ongoing Operations

**Weekly (in PH8-001):** UK shard isolation check, Stripe UK error rate, Open Banking status
**Monthly (in PH8-004):** Stripe UK reconciliation (separate from EU), UK VAT quarterly input, Booking.com UK commission
**Quarterly:** HMRC VAT return via MTD — Finance Agent drafts, external UK accountant files
**Annual:** ICO registration renewal (note anniversary date in `compliance/GB/ico-registration.*`)

---

## PH8-007 · Switzerland Launch SOP (Phase 8)

**Owner:** CEO + Dev Agent &nbsp;|&nbsp; **Frequency:** One-time launch

**Purpose:** Switzerland is NOT in the EU — it has its own data law (nFADP), its own VAT system (CHF, 8.1%), and its own payment ecosystem (TWINT). Do not treat CH as an EU market.

### Switzerland Market Snapshot

| Item | Detail |
|------|--------|
| **Legal** | No specific travel agent licence at federal level. Check cantonal requirements. |
| **Data law** | nFADP (neues Datenschutzgesetz / nLPD) — effective 1 Sep 2023. Broadly GDPR-aligned but differences: no DPO mandate, different breach notification. Regulator: FDPIC (edoeb.admin.ch). |
| **Payment** | TWINT (primary — 5M+ active users, ~60% of Swiss mobile payments) + Stripe CHF. `twint.gateway.js` + `SwitzerlandPaymentSelector.tsx`. |
| **Language** | German (de) primary. French (fr) in western CH. Italian (it) in Ticino. Launch with de + fr minimum. |
| **Key airlines** | Swiss International Air Lines (LX) via Amadeus. ZRH→JED, ZRH→MED. |
| **VAT** | 8.1% (standard rate). Register with ESTV (estv.admin.ch) if annual CH revenue > CHF 100,000. |
| **Currency** | CHF (Fr.). Format: `Fr. 1'234.56` (apostrophe as thousands separator — Swiss convention). |

### Switzerland Launch Checklist

```
Switzerland launch checklist — [TARGET DATE].

LEGAL:
[ ] nFADP compliance reviewed — Legal Agent brief: nFADP vs GDPR key differences ✅/❌
[ ] FDPIC registration: not mandatory under nFADP (unlike GDPR Art. 27) — confirm with Legal Agent ✅/❌
[ ] CH privacy policy: nFADP-specific disclosures (separate from EU GDPR policy) ✅/❌
[ ] Cantonal travel agent requirements: check ZH, GE, BS — any cantonal licence needed? ✅/❌

TECHNICAL:
[ ] TWINT: TWINT_MERCHANT_ID, TWINT_API_KEY in .env ✅/❌
[ ] TWINT sandbox: 100 test transactions — zero errors ✅/❌
[ ] SwitzerlandPaymentSelector: TWINT showing as primary for CH countryCode ✅/❌
[ ] Stripe CHF: CHF currency processing, Fr. symbol ✅/❌
[ ] Swiss (LX) fares: ZRH→JED, ZRH→MED in Amadeus? ✅/❌
    Add ZRH/GVA airports to amadeus-airlines.json ✅/❌
[ ] getShardPool('CH') — CH should route to eu-central-1 Frankfurt (EU-adjacent, nFADP allows)
    Confirm in shard-router.js ✅/❌
[ ] searchHotelsRouted({countryCode:'CH'}) → source='bookingcom' ✅/❌

LOCALISATION:
[ ] de locale already active — verify Swiss German terms acceptable (or add de-CH variant) ✅/❌
[ ] CHF format: Fr. 1'234.56 (apostrophe thousands, not comma or period) ✅/❌
[ ] VAT label: "MWST 8.1%" (German) / "TVA 8.1%" (French) on CH invoices ✅/❌
[ ] French (fr) locale active for CH western cantons ✅/❌

COMPLIANCE:
[ ] nFADP consent notice: shows for CH countryCode ✅/❌
    Note: nFADP is not GDPR — don't show GDPR banner for CH; show nFADP-specific notice
[ ] Consent logged: law='NFADP_CH' ✅/❌
[ ] Data residency: getShardPool('CH') → eu-central-1 ✅/❌
    nFADP allows transfers to EU-adequate countries — Frankfurt is compliant ✅/❌

FINANCE:
[ ] ESTV CHF revenue monitoring: if annual CH revenue approaches CHF 100,000 → register for VAT ✅/❌
[ ] MWST/TVA 8.1% configured in billing service if registered ✅/❌
[ ] CHF/USD FX rate: updating every 15 min ✅/❌
[ ] TWINT settlement: Swiss bank account configured (CHF) ✅/❌

CLAUDE.MD UPDATES:
[ ] marketing/CLAUDE.md: CH section — LX Swiss Airlines, German/French bilingual, TWINT primary payment
[ ] finance/CLAUDE.md: CHF apostrophe format + MWST 8.1% + ESTV threshold monitoring
[ ] legal/CLAUDE.md: nFADP vs GDPR differences already documented — verify current ✅/❌
[ ] Commit: git commit -m "feat: add Switzerland (CH) market context to CLAUDE.md files"
[ ] Load test P95 < 500ms from Frankfurt/Zurich region ✅/❌
[ ] ops/launch-approvals/CH-[YYYY-MM-DD].md signed ✅/❌
```

### Switzerland Ongoing Operations

**Weekly:** TWINT webhook health, LX fares freshness, CHF/USD < 15 min
**Monthly (in PH8-004):** TWINT CHF reconciliation, CHF revenue monitoring vs CHF 100K VAT threshold
**Note:** If CH revenue exceeds CHF 100K — immediately register with ESTV; notify Finance Agent + CEO

---

## PHASES 9–10 — IMPLEMENTED & LIVE
### North America SOPs
**United States · Canada · Quebec**

### Current Live Status — Phase 9–10 Achievements

| Status | Feature |
|--------|---------|
| ✅ | US: Stripe + PayPal + Affirm BNPL (≥ $200) — `us-east-1` Virginia shard |
| ✅ | CCPA: opt-out footer link, `/privacy/ccpa-opt-out` page, emailGuard + analyticsGuard |
| ✅ | HajjPackageBuilder: 6 US departure cities (DTW/JFK/ORD/LAX/IAD/IAH) |
| ✅ | US Muslim traveler features: halal filter, POI guide, Muslim city guides |
| ✅ | en-US locale + `DB_URL_US_EAST` shard alias |
| ✅ | Canada: Interac Online (Bambora/Worldline) primary + Stripe CAD fallback |
| ✅ | Quebec routing: `x-locale-override: fr` for QC region + `fr-CA` Accept-Language |
| ✅ | PIPEDA + Quebec Law 25 compliance: `PIPEDAPrivacyNotice.tsx` with `isQuebec` prop |
| ✅ | Air Canada (AC): YYZ/YUL airports + CA→JED/MED route priorities |
| ✅ | CF stacks: `18-us-east-1-virginia.yml` + `20-ca-central-1-montreal.yml` |
| ✅ | CST (California Seller of Travel) Reg. No. displayed via `NEXT_PUBLIC_CA_CST_NUMBER` |

---

## PH9-10 001 · North America Payment Operations

**Owner:** Finance Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Daily health check

**Purpose:** Daily health check for all US and Canada payment gateways. North America has the highest average booking value — payment failures directly impact revenue disproportionately.

### Payment Gateway Map — North America

| Country | Primary | Secondary | Fallback | Currency | Shard |
|---------|---------|-----------|----------|----------|-------|
| United States | Stripe | PayPal | Affirm (BNPL, ≥ $200) | USD | us-east-1 |
| Canada (non-QC) | Interac (Bambora) | Stripe CAD | — | CAD | ca-central-1 |
| Canada (Quebec) | Interac (Bambora) | Stripe CAD | — | CAD | ca-central-1 |

```
North America payment gateway health check — [DATE].

UNITED STATES — Stripe US:
- Stripe API: api.stripe.com responding? ✅/❌
- Stripe US account error rate last 24h < 1%? ✅/❌
- Apple Pay + Google Pay domain verification active? ✅/❌
- /stripe/webhook responding + Stripe-Signature validating? ✅/❌

UNITED STATES — PayPal:
- POST /paypal/order/create — order_id returning? ✅/❌
- POST /paypal/order/[id]/capture — completing? ✅/❌
- PayPal IPN webhook responding? ✅/❌

UNITED STATES — Affirm (BNPL):
- POST /affirm/charge — checkout_token returning for bookings >= $200? ✅/❌
- Affirm checkout redirect working? ✅/❌
- Note: Affirm only shown for USD bookings >= $200 — verify threshold gate.

CANADA — Interac (Bambora):
- POST /interac/initiate — Bambora redirect URL returning? ✅/❌
- BAMBORA_MERCHANT_ID + BAMBORA_PASSCODE set in env? ✅/❌
- Interac callback /interac/callback — responding? ✅/❌
- CanadaPaymentSelector: Interac showing as primary for CA countryCode? ✅/❌
  French label in Quebec locale (locale='fr')? ✅/❌

CANADA — Stripe CAD:
- CAD currency processing (C$ symbol)? ✅/❌
- Stripe CAD fallback when Interac unavailable? ✅/❌

DATA RESIDENCY:
- US booking: getShardPool('US') → us-east-1. ✅/❌
- CA booking: getShardPool('CA') → ca-central-1. ✅/❌
- PIPEDA note: if CA data in us-east-1 failover > 24h — flag to Compliance Agent.

RECONCILIATION (last 24h):
SELECT gateway, COUNT(*) AS txns, SUM(amount_usd) AS total_usd
FROM payments
WHERE status='completed'
  AND created_at > NOW() - INTERVAL '24 hours'
  AND gateway IN ('stripe_us','paypal','affirm','bambora')
GROUP BY gateway;
Matches gateway dashboards (±0.1%)? ✅/❌

Any ❌ → GitHub issue + Dev Agent. Affirm ≥ $200 gate failure is P1 (BNPL compliance).
```

---

## PH9-10 002 · North America Compliance — CCPA + PIPEDA

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Daily SLA check + on every opt-out / access request

**Purpose:** Monitor CCPA (California, 45-day SLA) and PIPEDA (Canada, 30-day SLA) compliance queues. Distinct laws — do not confuse SLAs or shard routing.

```
North America compliance check — [DATE].

CCPA (California — us-east-1 shard):
1. Opt-out queue:
   SELECT COUNT(*) FROM privacy_preferences
   WHERE ccpa_opted_out = TRUE AND ccpa_opted_out_at > NOW() - INTERVAL '24 hours';
   New opt-outs today: [N]

2. Deletion queue depth:
   Check Redis: LLEN ccpa:deletion:queue
   Any items > 40 days old? 🔴 5 days to CCPA SLA — process immediately.
   SELECT id, user_id, created_at FROM ccpa_deletion_log
   WHERE completed_at IS NULL AND created_at < NOW() - INTERVAL '40 days';

3. emailGuard active:
   Confirm shouldSendMarketingEmail() is called before ALL marketing sends to US users.
   Any marketing email jobs in queue NOT gated by emailGuard? Flag as P1 — CCPA violation risk.

4. CST number:
   NEXT_PUBLIC_CA_CST_NUMBER env var set (not placeholder '2000000-40')? ✅/❌
   CCPAFooterLink visible for US countryCode? ✅/❌

PIPEDA (Canada — ca-central-1 shard):
1. Access request queue:
   SELECT COUNT(*) FROM pipeda_access_log
   WHERE completed_at IS NULL AND created_at < NOW() - INTERVAL '25 days';
   Any > 25 days: 🟡 5 days to 30-day PIPEDA SLA.
   Any > 28 days: 🔴 SLA breach imminent — escalate to Privacy Officer + CEO.

2. Erasure queue depth:
   Check Redis: LLEN pipeda:erasure:queue
   Items > 25 days old? → same escalation as above.

3. Quebec Law 25 — breach notification:
   Any breach affecting QC users? Must notify CAI (cai.gouv.qc.ca) within 72h.
   (Same 72h window as GDPR — shorter than PIPEDA federal standard.)

4. PIPEDAPrivacyNotice rendering:
   CA countryCode: notice shown? ✅/❌
   QC region: isQuebec=true prop passed? Law 25 disclosure visible? ✅/❌

CROSS-BORDER DATA CHECK (PIPEDA Art. 4.1.3):
- Is CA data currently on us-east-1 failover? (acceptable < 24h)
  SELECT shard_region, COUNT(*) FROM bookings WHERE country_code='CA' GROUP BY shard_region;
  If us-east-1 count > 0 AND failover started > 24h ago → log in compliance/pipeda/cross-border-transfers.md
  + notify CEO.

Report ❌ and overdue items immediately.
```

---

## PH9-001 · Phase 9 (United States) — US Weekly Check

**Owner:** Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** Weekly

```
US weekly operations check.

PAYMENTS:
- PayPal: POST /paypal/order/create + POST /paypal/order/[id]/capture — responding? ✅/❌
- Affirm: POST /affirm/charge — responding? Shows for bookings >= $200? ✅/❌
- Stripe US: cards + Apple Pay + Google Pay working? ✅/❌

CCPA:
- CCPAFooterLink visible with countryCode=US? CST number displaying? ✅/❌
- /privacy/ccpa-opt-out page loading? Form submitting? ✅/❌
- CCPA opt-out: POST /api/user/ccpa/opt-out — Redis key set? DB updated? ✅/❌
- emailGuard.ts: confirmed marketing emails check ccpa:opted_out:{userId} before send? ✅/❌

US FEATURES:
- HajjPackageBuilder: /us/umrah-packages loading? Airport picker (JFK/LAX/ORD/...) working? ✅/❌
- Halal filter: hotel search with halal_friendly=true returning filtered results? ✅/❌
- US city guides: /us/muslim-guide/dearborn, /new-york, /chicago, /los-angeles — all 200? ✅/❌

DATA RESIDENCY:
- US user booking: getShardPool('US') → us-east-1. ✅/❌
```

---

## PH10-001 · Phase 10 (Canada) — Canada Weekly Check

**Owner:** Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** Weekly

```
Canada weekly operations check (CA).

PAYMENTS:
- Interac: POST /interac/initiate — responding? Bambora API key active? ✅/❌
- Stripe CAD: CAD currency processing? C$ displaying in CanadaPaymentSelector? ✅/❌

PIPEDA:
- PIPEDAPrivacyNotice shown for CA countryCode? ✅/❌
- PIPEDA consent log: POST /api/compliance/consent with law='PIPEDA' — writing to DB? ✅/❌
- Erasure request route: POST /api/user/pipeda/erase — responding? ✅/❌

QUEBEC:
- X-Country: CA + X-Region: QC header → fr locale selected? ✅/❌
- French interface displaying? Air Canada (YUL→JED) routes showing? ✅/❌

DATA RESIDENCY:
- CA user booking: getShardPool('CA') → ca-central-1 (Montreal). ✅/❌
```

---

## PHASES 11–12 — IMPLEMENTED & LIVE
### South America + Full Global SOPs
**Brazil · Argentina · Colombia · Chile · Mexico · Peru · Uruguay · 25-Market Global**

### Current Live Status — Phase 11–12 Achievements

| Status | Feature |
|--------|---------|
| ✅ | Brazil: Pix QR (1h countdown + 3s polling) + Boleto PDF (3-day countdown) via Stripe |
| ✅ | LATAM: MercadoPago Checkout Pro — AR/CO/CL/UY/MX/PE local methods |
| ✅ | LGPD: `LGPDBanner.tsx` (pt-BR, 4 categories) + `lgpd.router.js` — 15 business-day SLA |
| ✅ | WhatsApp BR: Meta Cloud API v18 — PARAR opt-out — `wa:broadcast:BR` Redis SET |
| ✅ | Arab diaspora content: 5 Brazilian cities (`/br/comunidade-arabe/[cidade]`) |
| ✅ | BR data residency: LGPD Art. 44 — sa-east-1 São Paulo only — no exceptions |
| ✅ | pt-BR + es-419 locales fully live |
| ✅ | CF stacks: `19-sa-east-1-sao-paulo.yml` |
| ✅ | Phase 12: 25-market global sweep operational — all 6 regional shards active |

---

## PH11-12 001 · LATAM Payment Operations

**Owner:** Finance Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Daily health check

**Purpose:** Monitor Brazil (Pix/Boleto) and LATAM (MercadoPago) payment operations. Pix has a 1-hour expiry window — failed QR codes require immediate recovery to avoid lost bookings.

### Payment Gateway Map — LATAM

| Country | Primary | Currency | Shard | Notes |
|---------|---------|----------|-------|-------|
| Brazil | Pix (Stripe) | BRL | sa-east-1 | 1h QR expiry; 3s polling |
| Brazil (alt) | Boleto (Stripe) | BRL | sa-east-1 | 3-day PDF expiry |
| Argentina | MercadoPago | ARS | sa-east-1 | Checkout Pro redirect |
| Colombia | MercadoPago | COP | sa-east-1 | Checkout Pro redirect |
| Chile | MercadoPago | CLP | sa-east-1 | Checkout Pro redirect |
| Mexico | MercadoPago | MXN | sa-east-1 | Checkout Pro redirect |
| Peru | MercadoPago | PEN | sa-east-1 | Checkout Pro redirect |
| Uruguay | MercadoPago | UYU | sa-east-1 | Checkout Pro redirect |

All data via `getShardPool('BR')` → sa-east-1. Brazilian data cannot leave sa-east-1.

```
LATAM payment gateway health check — [DATE].

BRAZIL — PIX:
- POST /pix/initiate — qr_code_base64 + expiration (3600s) returning? ✅/❌
- BrazilPaymentSelector: Pix QR rendering? 1h countdown timer showing? ✅/❌
- Stripe Pix webhook /pix/callback — responding? ✅/❌
- EXPIRED PIX: any bookings with status='pix_expired'?
  SELECT COUNT(*) FROM payments WHERE gateway='pix' AND status='expired'
    AND created_at > NOW() - INTERVAL '24 hours';
  Count > 5? Investigate — may indicate UX issue (user not scanning in time).

BRAZIL — BOLETO:
- POST /boleto/generate — boleto_url (PDF) returning? ✅/❌
- 3-day countdown showing in BrazilPaymentSelector? ✅/❌
- UNPAID BOLETO (> 3 days):
  SELECT COUNT(*) FROM payments WHERE gateway='boleto' AND status='pending'
    AND created_at < NOW() - INTERVAL '3 days';
  Release held inventory for unpaid boletos.

LATAM — MERCADOPAGO:
- POST /mercadopago/preference — preference_id returning for each market? ✅/❌
  Test: countryCode='AR', 'CO', 'CL', 'MX' — all returning preference_id? ✅/❌
- /mercadopago/webhook — responding? Signature validating (x-signature header)? ✅/❌
- MERCADOPAGO_ACCESS_TOKEN set? MERCADOPAGO_ENV=production (not sandbox)? ✅/❌
- LatAmPaymentSelector: local methods showing per country? es-419 locale? ✅/❌

DATA RESIDENCY (LGPD — critical):
- getShardPool('BR') → sa-east-1 (São Paulo). ✅/❌
- Any BR payment data written to non-sa-east-1 shard? → P0 LGPD violation.
  SELECT shard_region, COUNT(*) FROM payments
  WHERE user_country='BR' GROUP BY shard_region;
  Must show ONLY sa-east-1.

RECONCILIATION (last 24h):
SELECT gateway, COUNT(*) AS txns, SUM(amount_brl) AS total_brl
FROM payments
WHERE status='completed' AND created_at > NOW() - INTERVAL '24 hours'
  AND gateway IN ('pix','boleto','mercadopago')
GROUP BY gateway;

Any ❌ → GitHub issue. BR data in wrong shard = P0 — stop all BR writes, alert CEO.
```

### Failure Handling — LATAM

| Failure | Impact | Response |
|---------|--------|----------|
| Pix QR not generating | BR booking blocked | Check Stripe BR account status; verify `STRIPE_SECRET_KEY` scoped to BR account; P1 |
| Boleto PDF URL broken | User can't pay | Re-generate boleto via Stripe API; resend link to user; 3-day window resets |
| MercadoPago preference fails | LATAM booking blocked | Check `MERCADOPAGO_ACCESS_TOKEN` not expired; rotate if > 6 months old |
| MercadoPago sandbox active | Revenue going nowhere | Check `MERCADOPAGO_ENV=production`; **P0** if live traffic hitting sandbox |
| BR data in wrong shard | LGPD violation | **P0** — stop all writes; run shard audit; notify CEO + Legal Agent; potentially reportable to ANPD |

---

## PH11-12 002 · LGPD Compliance & WhatsApp Brazil Operations

**Owner:** Compliance Agent + Marketing Agent &nbsp;|&nbsp; **Frequency:** Daily (WhatsApp) + weekly (LGPD queue)

**Purpose:** Brazil requires the strictest data residency of all markets and a 15 business-day DSR SLA. WhatsApp broadcasts must only reach opted-in subscribers — PARAR opt-outs must be honoured immediately.

```
LGPD + WhatsApp BR operations check — [DATE].

LGPD DSR QUEUE (sa-east-1 shard only):
SELECT id, user_id, request_type, status,
       created_at,
       -- 15 business days ≈ 21 calendar days (conservative)
       created_at + INTERVAL '21 days' AS sla_deadline,
       EXTRACT(DAY FROM NOW() - created_at) AS calendar_days
FROM lgpd_access_log
WHERE status = 'pendente'
ORDER BY created_at ASC;

Urgency:
- calendar_days > 14: 🟡 Process today — approaching 15-business-day SLA
- calendar_days > 18: 🔴 P1 — SLA breach risk — escalate to Privacy Officer + CEO
- calendar_days > 21: 🚨 SLA BREACHED — notify ANPD within 72h if high-risk data

Routes: POST /api/user/lgpd/exportar (access) · /apagar (erasure) · /corrigir (correct)
         /revogar (revoke consent) · /portabilidade (portability)
All use brPool() → sa-east-1. Never call getShardPool('BR') on non-sa-east-1 config.

LGPD CONSENT LOG (weekly):
SELECT purpose, granted, COUNT(*)
FROM consent_log WHERE law='LGPD'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY purpose, granted;
Declining consent rate rising? Flag to Products Agent — may need UX review of LGPDBanner.

WHATSAPP BRAZIL — DAILY:
1. Subscriber count:
   SCARD wa:broadcast:BR → [N] subscribers
   Week-on-week growth? Flag if declining.

2. Active opt-outs today:
   Check wa:sub:BR:* keys deleted in last 24h (PARAR responses processed).
   Any PARAR message not acted on within 1h? → P1 (LGPD opt-out must be immediate)

3. Last broadcast health:
   Last template sent: [name] at [timestamp]
   Delivery rate: delivered / sent %
   Read rate: read / delivered %
   Flag if delivery < 90% or read < 30%.

4. Template approval status (Meta Business Suite):
   booking_confirmed: APPROVED? ✅/❌
   ramadan_greeting: APPROVED? ✅/❌
   price_alert: APPROVED? ✅/❌
   checkin_reminder: APPROVED? ✅/❌
   Any REJECTED templates? → notify Marketing Agent to resubmit.

5. PRE-BROADCAST LGPD CHECK (run before every broadcast):
   - Only send to wa:broadcast:BR SET members (opted-in)
   - Never cold-message — check wa:sub:BR:{userId} exists before any individual send
   - Template must match pre-approved Meta template exactly
   - BR_DPO_EMAIL env var set? ✅/❌

Report overdue LGPD requests immediately. Any PARAR ignored = LGPD violation.
```

---

## PH11-001 · Phase 11 (Brazil/LATAM) — LATAM Weekly Check

**Owner:** Dev Agent + Compliance Agent &nbsp;|&nbsp; **Frequency:** Weekly

```
LATAM weekly operations check (BR/AR/CO/CL/MX/UY/PE).

BRAZIL PAYMENTS:
- Pix: POST /pix/initiate — QR code generating? ✅/❌
  Stripe Brazil Pix webhook: /pix/callback responding? ✅/❌
- Boleto: POST /boleto/generate — PDF URL returning? 3-day expiry shown? ✅/❌
- BrazilPaymentSelector: Pix/Boleto/Card tabs rendering? BRL (R$) displaying? ✅/❌

LATAM PAYMENTS:
- MercadoPago: POST /mercadopago/preference — preference_id returning for AR/CO/CL/MX? ✅/❌
  Webhook /mercadopago/webhook — responding? ✅/❌

LGPD:
- LGPDBanner shown for BR countryCode? No pre-ticked boxes? ✅/❌
- Consent logged on accept? ✅/❌
- LGPD erasure: POST /api/user/lgpd/apagar — responding? ✅/❌

WHATSAPP BR:
- wa:broadcast:BR Redis SET — how many subscribers? (target growth)
- Last broadcast: when? Open rate (delivery receipts)?
- PARAR opt-out: test by sending PARAR — removed from SET? ✅/❌

ARAB DIASPORA PAGES:
- /br/comunidade-arabe — 200? ✅/❌
- /br/comunidade-arabe/sao-paulo, /foz-do-iguacu — 200? ✅/❌

DATA RESIDENCY:
- BR user booking: getShardPool('BR') → sa-east-1. Brazilian data NOT leaving Brazil. ✅/❌
```

---

## PH12-001 · Phase 12 (Full Global) — 25-Market Weekly Sweep

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Weekly (consolidates PH5–PH11 checks)

```
Full 25-market weekly sweep — [DATE].

Run all regional checks in sequence:
1. PH5-001 (TR/ID/MY)  → paste and run
2. PH6-001 (PK/IN)     → paste and run
3. PH8-001 (EU/UK)     → paste and run
4. PH9-001 (US)        → paste and run
5. PH10-001 (CA)       → paste and run
6. PH11-001 (BR/LATAM) → paste and run
7. GBL-008 (AWS)       → paste and run

Consolidate all ✅/❌ into a single table.
Post to #infrastructure with total score: X/Y checks passing.
Open GitHub issue for each ❌ with label 'weekly-sweep' and assigned region.

Target: 100% pass rate. Any failing check not resolved within 48h = escalate to CEO.
```

---

# SECTION 3 — Department SOPs

---

## Marketing Department SOPs

> All marketing activities run through the AMEC Marketing Agent (Claude AI). The agent operates autonomously for content creation and scheduling; **human approval required before publishing or spending.**

---

## MKT-001 · Daily Content Generation

**Owner:** Marketing Agent (AI) &nbsp;|&nbsp; **Frequency:** Every morning, 7 days/week

### Daily Marketing Prompt

```
You are the AMEC Marketing Agent. Read marketing/CLAUDE.md.

Today's content tasks:
1. LinkedIn post: construction tech or travel trend relevant to our active markets.
   Tone: professional. 200–250 words. Include relevant hashtags.
2. Instagram caption: Hajj/Umrah inspiration or halal travel destination.
   Tone: warm, inspirational. 80–100 words. 5 hashtags.
3. WhatsApp broadcast message (KSA channel): today's best hotel deal in Makkah.
   Tone: direct, value-focused. Under 60 words. Include SAR price.

Generate all 3 in English. Then generate Arabic versions of each.
Save drafts to marketing/drafts/[today-date]/. Do not publish.
Flag any piece that references a real price or specific offer for human verification.
```

### Approval Before Publishing

1. Review all 6 pieces (3 EN + 3 AR) in `marketing/drafts/`
2. Check: no incorrect prices, no unverified claims, appropriate Islamic tone
3. Approve: type `Approved — schedule for posting` in Claude Code
4. Claude schedules via Buffer/Hootsuite API or posts directly via platform APIs

---

## MKT-001a · Weekly Content Calendar Management

**Owner:** Marketing Agent &nbsp;|&nbsp; **Frequency:** Weekly (Monday)

**Purpose:** Plan and schedule all social, email, and WhatsApp content for the week across all active markets.

**Trigger:** Monday morning, after GBL-001 and GBL-002.

```
Generate UTUBooking content calendar for week of [DATE].

Read marketing/CLAUDE.md first — apply all market-specific tone and platform rules.

For each ACTIVE market this week: [list markets based on current phase]

Per market, generate:
1. SOCIAL (platform per market — see marketing/CLAUDE.md):
   - 2 × posts (Umrah/halal hotel focus + one seasonal/cultural)
   - Caption + hashtags in market language
   - Image brief (describe visual for designer)
   - Best posting time (market timezone)

2. EMAIL (if applicable):
   - Subject line (A/B test: 2 options)
   - Preview text
   - Key message (1 sentence)
   - CTA: search hotels / search flights / view packages

3. WHATSAPP (if applicable — BR, PK, IN, MY, TR only):
   - Template name (must be pre-approved in Meta Business Suite)
   - Variables to fill in
   - Audience segment (all subscribers / Umrah intent / past bookers)

All content:
- NEVER publish without human approval
- Flag any content referencing discounts > 20% for CEO approval
- Flag any politically sensitive content for Legal Agent review

Save calendar draft to Notion > Marketing > Content Calendar > [WEEK DATE].
Post calendar summary to #marketing in Slack for team review.
```

| | |
|---|---|
| **Rule** | ALL content requires human native-speaker approval before publishing |

---

## MKT-002 · Weekly SEO Content Production

**Owner:** Marketing Agent (AI) &nbsp;|&nbsp; **Frequency:** Every Wednesday

| | |
|--|--|
| **Output** | 2 blog posts per week — one English, one Arabic. 800–1,200 words each. |
| **Topics** | Rotate: Hajj/Umrah tips, hotel reviews near Haram, flight guides, Muslim travel destinations. |
| **SEO targets** | Research current search trends in active markets. Claude uses web search tool for keyword data. |
| **Publication** | Draft to Notion → CEO review → publish to UTUBooking.com blog → share on social. |

### Claude Prompt

```
Generate a 1,000-word SEO blog post about [topic] targeting [market].
Keyword focus: [keyword]. Include FAQ section at end.
```

---

## MKT-002a · Campaign Launch Workflow

**Owner:** Marketing Agent + CEO &nbsp;|&nbsp; **Frequency:** Per campaign (Ramadan, Hajj, off-season sale)

```
Launch [CAMPAIGN NAME] campaign for [MARKETS].

Campaign brief:
- Objective: [bookings / brand awareness / email signups]
- Duration: [START DATE] to [END DATE]
- Budget: [USD amount]
- Key message: [e.g. "Ramadan Umrah — hotels from SAR 250/night"]

Generate:
1. Campaign assets per market (see marketing/CLAUDE.md for each market rules)
2. Paid social copy: Facebook/Instagram/TikTok/LinkedIn — per market
3. Email sequence: 3 emails (launch / mid / final reminder)
4. WhatsApp broadcast (BR/PK/IN/MY/TR — opt-in subscribers only)
5. UTM parameters: utm_source=[platform] utm_medium=[type] utm_campaign=[CAMPAIGN_SLUG]
6. Conversion tracking: which booking funnel events to tag for this campaign?

Output: Campaign assets in Notion > Marketing > Campaigns > [CAMPAIGN NAME].
All assets flagged for native speaker review before any publication.
Budget tracker created in finance/CLAUDE.md expense log.
```

---

## MKT-003 · Ramadan + Hajj Season Campaign

**Owner:** Marketing Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** Ramadan: 6 weeks before start · Hajj: 8 weeks before

### Seasonal Campaign Launch Checklist

| | Checklist Item |
|--|----------------|
| ☐ | **8 weeks before Hajj:** Launch "Early Bird Hajj Packages" — 10% discount for early bookings |
| ☐ | **6 weeks before Ramadan:** Umrah campaign — target KSA, UAE, Egypt, Turkey, Indonesia, Malaysia |
| ☐ | Campaign assets: landing page + email sequence (5 emails) + social (14 posts) + WhatsApp |
| ☐ | All assets in English + Arabic + active market languages (TR, ID, MS) |
| ☐ | Claude Marketing Agent generates ALL assets in one session |
| ☐ | Review all pricing claims with Finance Agent before any campaign goes live |
| ☐ | Track: click-through rate, booking conversion rate, revenue attributed to campaign |

> See **MKT-003b** for the detailed per-market Claude prompt (cultural tone, email sequence, WhatsApp templates).

---

## MKT-003a · WhatsApp Broadcast (Brazil)

**Owner:** Marketing Agent &nbsp;|&nbsp; **Frequency:** Max 2× per week (WhatsApp policy limit)

**Purpose:** Send pre-approved template broadcasts to opted-in Brazilian subscribers.

**Critical rule:** Only send to users who have explicitly opted in (LGPD Art. 7). Never buy lists.

```
Prepare WhatsApp broadcast for Brazilian subscribers — [DATE].

Check:
1. Last broadcast date: was it > 3 days ago? (max 2×/week — WhatsApp quality rating)
   If < 3 days since last broadcast: STOP. Do not send. Schedule for later.

2. Template to use: [templateKey from TEMPLATES in backend/adapters/whatsapp.js]
   Options: ramadan_greeting | price_alert | booking_confirmed | checkin_reminder
   Confirm template is APPROVED in Meta Business Suite before proceeding. ❌ if not approved.

3. Subscriber count: redis SCARD wa:broadcast:BR — current count?

4. Variables to fill:
   firstName: '[personalised from subscriber DB, or generic "Irmão/Irmã" if unavailable]'
   startingPrice / price: '[current lowest Makkah hotel price in BRL]'
   month: '[target month e.g. "Ramadan" or "março"]'

5. Preview message: [show final pt-BR message text for CEO approval]

Awaiting CEO approval — DO NOT call broadcastBR() until approved.
After approval: call POST /api/whatsapp/subscribe [internal] to trigger broadcast.
Log: send count, delivery rate, opt-out count. Save to Notion > Marketing > WhatsApp Logs.
```

---

## MKT-003b · Ramadan Campaign Activation — Detailed Prompt

**Owner:** Marketing Agent &nbsp;|&nbsp; **Frequency:** Annual — 6 weeks before Ramadan

See also: GBL-007 (includes infrastructure + pricing steps). This SOP covers content only.

```
Ramadan content activation — Ramadan [YEAR] starts [DATE].

Generate Ramadan Umrah campaign package for all 25 markets.

For each market:
1. Headline (local language): "This Ramadan, pray in Makkah" adapted for each culture
2. Hero image brief: describe scene — Masjid Al-Haram at iftar time, diverse pilgrims
3. 5 × social posts (weekly cadence through Ramadan)
4. Email sequence (3 emails: Ramadan announcement / mid-Ramadan reminder / last 10 nights urgency)
5. WhatsApp template suggestion for BR/PK/IN/MY/TR (subject to Meta approval)
6. Pricing callout: use lowest available hotel rate in each market's currency

Cultural sensitivities:
- EU markets (GDPR): no urgency/scarcity language; no countdown timers
- Turkey: emphasise spiritual journey, not price; Ramadan is 'Ramazan' in Turkish
- Indonesia: emphasise community (gotong royong); family package angle
- Pakistan/India: emphasise government Hajj quota — book early messaging
- Brazil: Arabic cultural connection angle (community heritage)
- US: "Perform Umrah this Ramadan from [city]" + JFK/LAX/ORD departure focus

All content: flag for native speaker review. Save to Notion > Marketing > Ramadan [YEAR].
```

---

## Sales Department SOPs

---

## SLS-001 · New Lead Qualification & Proposal Generation

**Owner:** Sales Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** Within 4 hours of new lead

### Lead Qualification Process

1. New lead enters HubSpot via website form, LinkedIn, or referral
2. Claude Sales Agent scores lead automatically: company size + budget signals + market + travel volume
3. If score ≥ 7/10: generate proposal immediately

### Proposal Generation Prompt

```
Read sales/CLAUDE.md. New lead received:
  Company: [name]
  Country: [country]
  Needs: [hotel/flight/car/hajj packages]
  Group size: [number]
  Budget range: [budget]

Generate a full business proposal in [language].
Include: UTUBooking platform overview, relevant features for their needs,
pricing tiers (use finance/CLAUDE.md for current rates),
implementation timeline, next steps.
Format: professional PDF-ready document.
Do NOT include any discounts without CEO approval.
Save to sales/proposals/[company-name]-[date].md
```

### Follow-Up Sequence

| Day | Action |
|-----|--------|
| Day 1 | Send proposal + brief intro email |
| Day 3 | Follow-up call or WhatsApp (Arabic for Gulf clients) |
| Day 7 | Value-add email — case study from similar client |
| Day 14 | Final follow-up — offer to schedule live demo |
| Day 21 | Move to "Nurture" in HubSpot if no response |

---

## SLS-002 · B2B White-Label Partnership Onboarding

**Owner:** Sales Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** Per new B2B partner

| | |
|--|--|
| **Eligible partners** | Travel agencies, hotel chains, banks with travel portals, super-apps (e.g. Careem) |
| **Onboarding time** | 2–4 weeks from signed contract to live white-label instance |
| **Technical setup** | Claude Dev Agent creates white-label config: partner branding, pricing markup, API keys |
| **Commercial terms** | Revenue share: 70% UTUBooking / 30% partner (standard). Negotiable above USD 50K/year volume. |
| **Support SLA** | B2B partners get dedicated support channel + 4-hour response SLA |

### Claude Prompt

```
Set up white-label instance for [Partner].
Config: branding=[brand], markup=[X%], markets=[list].
Generate API documentation.
```

---

## SAL-001 · B2B Lead Qualification (Detailed Daily Review)

**Owner:** Sales Agent &nbsp;|&nbsp; **Frequency:** Daily (HubSpot review)

```
Review HubSpot pipeline for new B2B leads — [DATE].

For each new lead (stage = Lead):
1. Company type: hotel chain / travel agency / corporate travel / mosque group?
2. Market: which country? Revenue potential in USD? (estimate from company size × booking frequency)
3. Decision maker: title of contact? C-suite, procurement, or junior? Flag if not decision maker.
4. Qualification questions to send (in market language):
   - Monthly booking volume?
   - Current booking platform?
   - Payment preference?
   - Timeline for decision?

Qualify leads using BANT: Budget / Authority / Need / Timeline.
Move to 'Qualified' in HubSpot if 3/4 BANT criteria met.
Move to 'Disqualified' with reason if < 2/4.

For qualified leads: generate personalised outreach email (language per market, tone per marketing/CLAUDE.md).
Flag proposals over SAR 100K / ₹10L / €50K for CEO review before sending.
```

---

## SAL-002 · Enterprise Proposal Generation

**Owner:** Sales Agent &nbsp;|&nbsp; **Frequency:** Per qualified opportunity

```
Generate B2B partnership proposal for [COMPANY NAME] — [COUNTRY].

Read:
- sales/CLAUDE.md — pricing, format, CEO approval thresholds
- finance/CLAUDE.md — VAT rates and tax rules for [COUNTRY]
- marketing/CLAUDE.md — tone for [COUNTRY] market

Proposal sections:
1. Executive Summary (2 paragraphs — tailored to their specific business)
2. UTUBooking Platform Overview (focus on benefits relevant to their use case)
3. Partnership Model Options:
   Option A: API Integration (direct booking API, revenue share)
   Option B: White-label (branded UTUBooking, monthly licence)
   Option C: Affiliate (referral commission per booking)
4. Pricing & Terms:
   - Show in local currency + USD equivalent
   - VAT/tax as separate line item (rate from finance/CLAUDE.md for [COUNTRY])
   - Contract duration options: 12 / 24 / 36 months
5. Implementation Timeline (realistic: 2–4 weeks for API, 1–2 weeks for affiliate)
6. Compliance commitment: GDPR/LGPD/etc per their jurisdiction
7. Case Studies: reference similar market wins
8. Call to Action: schedule a demo call

Language: [market primary language] with English version attached.
Length: 4–6 pages maximum.
Format: clean Markdown, convert to PDF for sending.
Flag for CEO review if total value > SAR 100K equivalent.
Save to Notion > Sales > Proposals > [COMPANY]-[DATE].
```

---

## SAL-003 · HubSpot Pipeline Hygiene

**Owner:** Sales Agent &nbsp;|&nbsp; **Frequency:** Weekly (Friday)

```
Weekly HubSpot pipeline hygiene — [DATE].

1. STALE DEALS: Any deal with no activity > 14 days?
   For each: send follow-up email in market language.
   Template: "Following up on our conversation — are you still evaluating [solution]?"

2. STAGE VALIDATION: Any deal in 'Demo' stage > 30 days without moving?
   Flag to Sales Agent: either advance to Proposal or disqualify.

3. CLOSE DATE ACCURACY: Any deal with close date in the past still open?
   Update close date to realistic future date.

4. WON DEALS: Any new closed-won this week?
   Trigger onboarding: create Notion project page, assign Dev Agent for API setup.
   Send welcome email to client (in market language).

5. LOST DEALS: Any closed-lost this week?
   Log reason in HubSpot. Pattern analysis: top 3 loss reasons this month?

Weekly summary: pipeline total value / deals by stage / WoW change.
Post to #sales in Slack.
```

---

## Customer Success Department SOPs

> The AMEC CS Agent handles all first-line support in English, Arabic, and all active market languages. Human escalation only for complex cases.

---

## CS-001 · Customer Support Response

**Owner:** CS Agent (AI) &nbsp;|&nbsp; **Frequency:** < 2-hour response SLA

### Support Tiers

| Tier | Handled by | Scope | SLA |
|------|-----------|-------|-----|
| **Tier 1** | AI only | Booking lookup, cancellation requests, invoice copies, FAQ, hotel information | < 2 hours |
| **Tier 2** | AI + human review | Payment disputes, booking modifications, complaints, refund requests > SAR 500 | < 4 hours |
| **Tier 3** | Human only | Legal threats, data requests (GDPR/LGPD), media inquiries, partner complaints | — |

### Languages

CS Agent responds in: EN · AR · TR · ID · MS · UR · HI · FA · FR · DE · ES · PT-BR

### Claude Prompt

```
Handle support ticket #[ID]. Read ticket content.
Respond in [language]. Maintain professional, empathetic tone.
If refund needed > SAR 500, escalate to CEO.
```

| **CSAT target** | ≥ 85% customer satisfaction. Survey sent after every resolved ticket. |
|--|--|

---

## CS-002 · Booking Cancellation & Refund Process

**Owner:** CS Agent (AI) + Finance Agent &nbsp;|&nbsp; **Frequency:** Within 24 hours of request

### Refund Decision Matrix

| Cancellation Timing | Refund Amount | Processing Time |
|---------------------|---------------|-----------------|
| > 72 hours before check-in | Full refund | 3–5 business days |
| 48–72 hours before check-in | 75% refund | 3–5 business days |
| 24–48 hours before check-in | 50% refund | 5–7 business days |
| < 24 hours before check-in | 0% refund (unless force majeure) | N/A |
| Airline tickets | Airline cancellation policy applies — varies by fare class | Per airline timeline |
| Hajj packages | Special policy: full refund if Hajj visa denied. 50% otherwise. | 5–10 business days |

---

## HR-001 · New Employee Onboarding

**Owner:** HR Agent &nbsp;|&nbsp; **Frequency:** Per new hire

```
Onboarding checklist for [EMPLOYEE NAME] — [ROLE] — starting [DATE].

Read hr/CLAUDE.md first — apply jurisdiction rules for [COUNTRY].

Pre-start (week before):
☐ Employment contract reviewed by Legal Agent — apply [COUNTRY] labour law rules
☐ Right to work verification (UK: Home Office online check; EU: residency document; others as applicable)
☐ Equipment ordered: laptop, SIM card (if applicable), remote access setup
☐ Accounts to create: email, Notion, Slack, GitHub (if dev), HubSpot (if sales)
☐ NDA and data processing agreement signed (all employees handle user data — DPA required)

Day 1:
☐ Welcome email in market language (English + [LOCAL LANGUAGE] if not English-speaking)
☐ Share: relevant CLAUDE.md for their department
☐ Share: docs/ops/global-ai-operations.md (all employees read this)
☐ Share: compliance/gdpr/checklist.md (all employees handling EU data must read)
☐ Schedule 30-min CEO intro call

Week 1:
☐ Shadow existing agent session (read a session close summary from Notion)
☐ First independent task assigned (small, well-defined)
☐ 1-week check-in: any blockers?

GDPR note: employee data processed under Art. 6(1)(b) — contract performance.
Retention: employment records for 7 years post-termination (tax + legal requirement).
```

---

## HR-002 · Outsourced Developer Management

**Owner:** HR Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Ongoing

```
Outsourced developer onboarding for [NAME/TEAM] — [COUNTRY] — [CONTRACT TYPE].

1. LEGAL: Freelance agreement with:
   - IP assignment clause (all code belongs to UTUBooking)
   - NDA for platform code and customer data
   - Data processing addendum (they may see user data — GDPR/LGPD requirement)
   - Invoice terms (currency, frequency, tax implications per finance/CLAUDE.md for their country)

2. TECHNICAL SETUP:
   - GitHub: add to outsourced-dev team (read + write on feature branches; NO direct push to main)
   - Notion: read access to sprint board; no access to financial or compliance docs
   - Code review: all PRs require Dev Agent review (GBL-006) before merge
   - Never give access to production DB, Redis, or AWS console
   - Never share .env files with real secrets

3. BRIEFING:
   - Share backend/CLAUDE.md — they must follow all rules
   - Emphasise: getShardPool(), PaymentRouter, 15-locale i18n, no hardcoded secrets
   - First PR: assign a small, self-contained task to calibrate quality

4. ONGOING:
   - Weekly PR review via GBL-006
   - Monthly performance check: code quality, i18n compliance, security scan pass rate
```

---

## FIN-001 · Payment Gateway Reconciliation

**Owner:** Finance Agent &nbsp;|&nbsp; **Frequency:** Weekly (Friday)

```
Weekly payment gateway reconciliation — week ending [DATE].

For each active gateway:

STRIPE (EU/UK/US/CA):
- Pull Stripe Dashboard payout report for [WEEK]
- Query: SELECT SUM(total_price), currency FROM bookings WHERE created_at BETWEEN [START] AND [END] AND status='confirmed' GROUP BY currency
- Match Stripe net payout vs DB revenue (allow for fees + refunds)
- Variance > 0.5%: flag with transaction IDs

MERCADOPAGO (LATAM):
- Pull MercadoPago settlement API for [WEEK]
- ARS transactions: convert at weekly average rate (document rate used)
- CLP, COP, MXN: convert at spot rate

PIX/BOLETO (Brazil):
- Pix completion rate: initiated vs completed. Target > 95%. Flag if < 90%.
- Boleto expiry count: any uncollected boletos? Rebook or cancel.

STC PAY (KSA):
- STC Pay settlement report. Match to bookings with payment_method='stcpay'.

JAZZCASH/EASYPAISA (PK):
- JazzCash settlement XML. Match to bookings with payment_method='jazzcash'.
- Easypaisa settlement. Match to bookings with payment_method='easypaisa'.

Variance summary: per gateway, amount matched/unmatched, % variance.
Any variance > 1%: escalate to CEO + gateway support.
Save to Notion > Finance > Weekly Reconciliation > [WEEK DATE].
```

---

## FIN-002 · Currency Risk Monitoring

**Owner:** Finance Agent &nbsp;|&nbsp; **Frequency:** Daily for ARS; weekly for others

**Purpose:** Monitor volatile currencies that affect booking values — especially Argentine Peso (ARS) and Turkish Lira (TRY).

```
Currency risk check — [DATE].

CRITICAL: ARGENTINA (ARS)
- Current ARS/USD official rate vs blue market rate
- If blue/official spread > 20%: flag — MercadoPago uses official rate; customer may perceive price discrepancy
- Any ARS bookings in the past 24h? Confirmed USD equivalent at time of booking logged?
- Recommendation: should we quote USD prominently for AR users?

TURKEY (TRY):
- TRY/USD rate today vs 30-day average. Movement > 5%?
- Iyzico settlements in TRY: are we converting to USD within 48h? (TRY depreciation risk)
- Any Iyzico settlements > 7 days pending? Flag — convert immediately.

PAKISTAN (PKR):
- PKR/USD rate. Movement > 3% in 7 days? Flag.
- JazzCash/Easypaisa settlements: queued or cleared?

BRAZIL (BRL):
- BRL/USD rate. Generally stable but monitor.
- Pix settlements clearing same day? ✅ (Pix is instant by design)

FX RATES IN WALLET SERVICE:
- Check Redis key fx:rates:USD — last updated within 15 minutes? ✅/❌
- If ❌: wallet FX service may be down — check FX service health.

Output: daily FX risk table. Action if any currency moves > 5% in 24h: notify CEO.
```

---

## Development Department SOPs

---

## DEV-001 · Code Review Process

**Owner:** Dev Agent (AI) + Outsourced Developers &nbsp;|&nbsp; **Frequency:** Every Pull Request

### Automated Review Prompt (run on every PR)

```
Review this Pull Request for UTUBooking.

Code Review Checklist:
1. SECURITY: Any hardcoded secrets, API keys, or passwords? OWASP Top 10 violations?
2. PAYMENTS: Does any payment code bypass PaymentAbstractionLayer? If so, REJECT.
3. USER DATA: Is user data written to the correct regional database per data residency rules?
4. i18n: Are all new user-facing strings using t() translation function? No hardcoded English?
5. TESTS: Do new functions have corresponding Jest tests? Coverage acceptable?
6. PERFORMANCE: Any N+1 queries? Missing Redis cache on expensive operations?
7. DOCUMENTATION: New API endpoints have Swagger/OpenAPI docs?

Output: APPROVE / REQUEST CHANGES with specific line-by-line comments.
For any CRITICAL issues (security, payment, data breach risk): BLOCK merge immediately.
```

### Review Outcomes

| Outcome | Criteria | Action |
|---------|----------|--------|
| **APPROVE** | All 7 checklist items pass. Test coverage ≥ 80%. No critical issues. | Merge allowed |
| **REQUEST CHANGES** | 1–3 non-critical issues. | Developer must address before re-review |
| **BLOCK MERGE** | Any security issue, payment bypass, or data residency violation. | Escalate to CEO |

> **Human review required** for all PRs touching: auth service, payment service, user data schema, API keys.

---

## DEV-002 · Hotfix Deployment Process

**Owner:** Dev Agent (AI) + CEO &nbsp;|&nbsp; **Frequency:** Production incidents only

### Hotfix Protocol

1. Incident detected → classify severity: **P1** (site down) · **P2** (major feature broken) · **P3** (minor bug)
2. P1/P2 only: create hotfix branch → fix → test → deploy to staging first
3. Staging test passes → CEO approval → deploy to production
4. Target resolution: P1 < 30 min · P2 < 2 hours · P3 next sprint

### Hotfix Branch Workflow

```bash
git checkout main && git pull
git checkout -b hotfix/[issue-description]
# Claude Code fixes the issue
# Run tests: npm test
git commit -m "hotfix: [description] — fixes #[issue-number]"
git push origin hotfix/[issue-description]
# Create PR → review → merge → auto-deploy
```

---

## DEV-003 · Database Backup & Recovery Verification

**Owner:** Dev Agent (AI) &nbsp;|&nbsp; **Frequency:** Weekly backup verification (every Monday)

| | |
|--|--|
| **Backup frequency** | Automated: PostgreSQL every 6 hours via AWS RDS. Redis snapshots every hour. |
| **Retention** | 30 days for daily backups. 12 months for monthly snapshots. |
| **All regions** | Verify backups running in ALL 7 regions: Bahrain · Istanbul · Singapore · Mumbai · Frankfurt · US-East · São Paulo |
| **Weekly test restore** | Every Monday: restore a random backup to test instance. Verify data integrity. |
| **Escalation** | If ANY region backup is older than 12 hours: PagerDuty P1 alert to CEO immediately. |

### Claude Prompt

```
Run database backup verification.
Check all 7 regions have completed backups in last 6 hours.
Run test restore on oldest backup.
Report status.
```

---

## DEV-001a · Feature Development Workflow

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Per feature / sprint

```
Start feature development: [FEATURE NAME].

Pre-development checklist:
1. Read backend/CLAUDE.md — confirm all rules understood
2. Is this feature touching payment code? Run tests first:
   npm test -- --testPathPattern=payment
3. Is this feature adding a new locale or string? Run:
   npm run i18n:validate
   Confirm all 15 locales have the keys before writing any new ones.
4. Does this feature handle user data? Identify:
   - Which privacy law applies (GDPR/LGPD/CCPA/PIPEDA)?
   - Is a consent check needed before processing?
   - Which DB shard? Use getShardPool(countryCode) — never hardcode.
5. Is this EU/UK feature? Any new data collection needs documenting in compliance/gdpr/dpa-register.md.

Development:
- Branch: feature/[feature-name] from main
- Commit messages: imperative, present tense ("Add Booking.com EU routing")
- No direct push to main — all changes via PR + GBL-006 review

Post-development:
- Run full test suite: npm test
- Run i18n validate: npm run i18n:validate
- Self-review against GBL-006 checklist before opening PR
- PR description: what changed, why, what was tested, any env vars added
```

---

## DEV-002 · Database Migration Rollout

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Per migration file

**Purpose:** Safely roll out database migrations across all 6 shards + 2 special shards in the correct order.

```
Roll out migration [FILENAME] across all shards.

Shard order: KSA → UAE → KWT → JOR → MAR → TUN → Istanbul → CA → US → BR → EU-London → EU-Frankfurt

For each shard:
1. DRY RUN: node backend/migrations/[FILENAME] --dry-run --shard=[SHARD]
   Confirm output matches expected schema change.
   Check: no data loss. No index rebuild on > 10M row table during business hours.
2. BACKUP: Confirm automated RDS snapshot taken in last 6h. ✅/❌
   If ❌: trigger manual snapshot before proceeding.
3. APPLY: node backend/migrations/[FILENAME] --shard=[SHARD]
   Time recorded. Row count before/after verified.
4. VERIFY: Run test query on new schema. ✅/❌
5. PROCEED or ROLLBACK:
   If ✅: proceed to next shard.
   If ❌: run rollback immediately. DO NOT proceed to next shard. Escalate to CEO.

Note for GDPR migrations: run on EU-London and EU-Frankfurt last. Both EU shards must complete for GDPR compliance.
Note for LGPD migrations: run on BR shard only (Brazilian data MUST stay in sa-east-1).

Document: start time, completion time per shard, any warnings. Save to Notion > Dev > Migrations > [FILENAME].
```

---

## DEV-003 · New Payment Gateway Integration

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Per new gateway

```
Integrate new payment gateway: [GATEWAY NAME] for [COUNTRY].

1. ADAPTER: Create backend/services/payment/src/gateways/[gateway].gateway.js
   Follow exact pattern of existing gateways (e.g. pix.gateway.js, jazzcash.gateway.js).
   Functions required: initiatePayment(), checkStatus(), handleCallback(), generateSecureHash()

2. CONTROLLER: Create backend/services/payment/src/controllers/[gateway].controller.js
   Routes: POST /[gateway]/initiate | GET /[gateway]/status/:ref | POST /[gateway]/callback
   Callback: verify signature before processing. Log to CloudWatch.

3. PAYMENT ROUTER: Add to PaymentRouter.ts:
   [CC]: { primary: '[gateway]', secondaries: ['stripe'] }
   Run tests: npm test -- --testPathPattern=payment ✅ required before proceeding.

4. FRONTEND: Add to [Country]PaymentSelector.tsx or create new one.
   Follow pattern of BrazilPaymentSelector.tsx / EuropePaymentSelector.tsx.
   i18n: add payment method strings to all 15 locales.

5. MIGRATION: Create backend/migrations/[timestamp]_add_[gateway]_payment_method.js
   Run via DEV-002 SOP.

6. ENV VARS: Add all new env vars to backend/.env with comments. Confirm in SSM Parameter Store for prod.

7. TEST END-TO-END:
   Test transaction in sandbox/test mode → webhook fires → booking status updates to 'confirmed' → push notification sent ✅

8. DOCUMENTATION: Update backend/services/payment/PAYMENT_ROUTING.md with new gateway details.
```

---

## DEV-004 · Adding a New i18n Locale

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Per new market launch

```
Add new locale: [LOCALE_CODE] for [COUNTRY].

1. CONFIG: Add to frontend/src/i18n/config.ts:
   LOCALES: add '[locale]'
   RTL_LOCALES: add if script is RTL (Arabic, Urdu, Farsi, Hebrew)
   LOCALE_FONTS: add font family (Noto Sans [Script] recommended)
   LOCALE_CURRENCY: add '[CC]': '[CURRENCY_CODE]'

2. LOCALE FILE: Create frontend/locales/[locale].json
   Copy frontend/locales/en.json as template.
   Translate ALL keys — no English placeholders allowed in production.
   Include all sections: nav, hero, search, results, booking, common, mehram, payment, etc.
   Flag for NATIVE SPEAKER REVIEW — never publish machine translation without human review.

3. REQUEST MAPPING: Update frontend/src/i18n/request.ts
   Add locale → LOCALE mapping
   Add countryCode → locale mapping in countryCodeToLocale()

4. FONT: Install font package (npm install @fontsource/noto-sans-[script])
   Add CSS import to frontend/src/app/globals.css with [lang=[locale]] selector.

5. RTL (if applicable):
   Add 'use client' component or CSS for direction:rtl
   Test: all flex layouts, icons, and text alignment correct in RTL? ✅/❌
   Note: Urdu needs line-height:2.2; Hindi is LTR not RTL — check products/CLAUDE.md.

6. VALIDATE: npm run i18n:validate — all 15 (now 16) locales complete? ✅/❌

7. PUSH NOTIFICATIONS: Add locale to TEMPLATES in /api/notifications/push/route.ts.

Document in memory system: new locale, currency, font, RTL status.
```

---

## COM-001 · GDPR Erasure Request Processing (EU/UK)

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Per request (SLA: 30 days)

**Trigger:** User submits erasure request via app or email to dpo@utubooking.com.

```
Process GDPR erasure request for user_id [X] — received [DATE].
SLA deadline: [DATE + 30 days].

1. VERIFY IDENTITY: Confirm requester is the account holder.
   Check: email match, booking history match, or photo ID if uncertain.
   Document verification method.

2. CHECK EXEMPTIONS:
   Bookings within tax retention period (7 years): RETAIN with anonymised PII.
   Pending payment disputes: HOLD until resolved.
   Legal proceedings: HOLD if applicable.
   Document any exemptions applied with legal basis.

3. ANONYMISE PII (for each applicable shard — EU users span eu-central-1 and eu-west-2):
   UPDATE users SET name='[DELETED]', email=CONCAT('deleted+',id,'@utubooking.com'),
   phone=NULL, nationality=NULL WHERE id='[X]';
   RETAIN: booking records (reference_no, product_type, total_price, dates) for tax law.

4. REMOVE FROM MARKETING:
   DELETE FROM consent_log WHERE user_id='[X]' — NO. consent_log is IMMUTABLE.
   INSERT INTO consent_log (user_id, law, consent_type, granted, ...) VALUES ('[X]', 'GDPR', 'marketing', false, ...) — withdrawal row.
   Redis: DEL push:sub:[X]  — remove push subscription.
   Redis: DEL wa:sub:BR:[X]  — remove WhatsApp subscription if applicable.

5. LOG:
   INSERT INTO gdpr_erasure_log (user_id, requested_at, completed_at, exemptions_applied) VALUES ...;

6. NOTIFY USER:
   Send confirmation email to their last known email (or original request channel):
   "Your erasure request under GDPR Art. 17 has been processed on [DATE].
   Data retained under Art. 17(3) exemptions: [list if any]."

7. CROSS-SHARD: Run steps 3–5 on ALL EU shards (Frankfurt + London).
   UK users: London shard only. EU users: Frankfurt shard only.
   DO NOT write UK user data to Frankfurt — UK GDPR is separate from EU GDPR.

Document: open erasure request in Notion > Compliance > GDPR Requests > [user_id].
```

---

## COM-002 · CCPA Opt-Out Processing (US/California)

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Per request (SLA: 45 days)

```
Process CCPA opt-out for user_id [X] — received [DATE].
SLA deadline: [DATE + 45 days].

1. UPDATE OPT-OUT STATUS:
   POST /api/user/ccpa/opt-out (auth as admin) — sets privacy_preferences.ccpa_opted_out = TRUE.
   Redis: SET ccpa:opted_out:[X] 1 EX 86400

2. REMOVE FROM MARKETING LISTS:
   Remove from any email marketing lists in HubSpot / Mailchimp.
   Block from future targeted advertising (flag in analytics guard).

3. STOP DATA SHARING:
   Remove from any third-party analytics audience sharing for this user.
   Document: which third parties were sharing data for this user.

4. CONFIRM:
   Send confirmation email: "Your opt-out request has been processed. We will not sell or share your personal information."
   Response within 45 days required.

5. LOG in Notion > Compliance > CCPA Requests > [user_id].
```

---

## COM-003 · LGPD Request Processing (Brazil)

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Per request (SLA: 15 business days)

```
Process LGPD request for user_id [X] — type: [ACESSO/CORREÇÃO/EXCLUSÃO/PORTABILIDADE] — received [DATE].
SLA: 15 business days = deadline [DATE].

ACESSO (access — Art. 18 II):
  GET /api/user/lgpd/exportar — returns profile + bookings + consents + payments.
  Send JSON package to user email. Log: lgpd_access_log.

EXCLUSÃO (deletion — Art. 18 VI):
  POST /api/user/lgpd/apagar — anonymises PII in sa-east-1 shard ONLY.
  Brazilian data MUST stay in Brazil — no cross-region processing.
  Same exemptions as GDPR COM-001 apply (tax retention 7 years).
  Insert withdrawal row in consent_log.
  Send confirmation in Portuguese.

PORTABILIDADE (portability — Art. 18 V):
  POST /api/user/lgpd/portabilidade — returns JSON-LD structured data export.
  Provide as downloadable file with Content-Disposition: attachment.

CORREÇÃO (correction — Art. 18 III):
  Update incorrect data fields as requested. Log change.
  Send confirmation.

All responses in Brazilian Portuguese (pt-BR).
Document in Notion > Compliance > LGPD Requests > [user_id].
```

---

## COM-004 · PIPEDA Request Processing (Canada)

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Per request (SLA: 30 days)

```
Process PIPEDA privacy request for user_id [X] — received [DATE].
SLA: 30 days.

ACCESS REQUEST:
  User can request access to their personal information.
  Query ca-central-1 shard: bookings, consent logs, payment refs.
  Export in readable format (PDF or structured JSON).
  Send to verified email address within 30 days.

CORRECTION REQUEST:
  Correct any inaccurate information as requested.
  Log change.

WITHDRAWAL OF CONSENT:
  INSERT withdrawal row in consent_log (law='PIPEDA', consent_type=[X], granted=false).
  Remove from email marketing lists.
  Apply email guard to prevent future marketing emails.

DELETION (not a strict PIPEDA right but best practice):
  Anonymise PII in Montreal shard only (ca-central-1 data residency).

Response: confirm in English + French (Quebec users).
Document: Notion > Compliance > PIPEDA Requests > [user_id].
```

---

## COM-005 · KVKK Request Processing (Turkey)

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** Per request (SLA: 30 days)

```
Process KVKK (Turkish PDPL) request for user_id [X] — received [DATE].
SLA: 30 days.

KVKK rights mirror GDPR (access, correction, erasure, portability, objection).

ACCESS: Export user data from Istanbul shard (eu-central-1 — Turkey shard).
ERASURE: Anonymise PII. Exemptions: financial records 10 years (Turkish tax law).
MARKETING WITHDRAWAL: Update consent_log with law='KVKK', granted=false.

Send confirmation to Turkish users in Turkish (tr locale).
Contact for KVKK complaints: kvkk@utubooking.com.
Document: Notion > Compliance > KVKK Requests > [user_id].
```

---

# SECTION 4 — Emergency SOPs

---

## EMG-001 · Platform Outage Response

**Owner:** CEO + Dev Agent (AI) &nbsp;|&nbsp; **Trigger:** Site uptime < 99% over any 5-minute window

### Immediate Actions — First 5 Minutes

1. Confirm outage: check `status.utubooking.com` + AWS Console + Grafana dashboards
2. Post status update: *"We are investigating a technical issue. Updates every 15 min."* — status page + Slack `#incidents`
3. Identify scope: which AWS region(s)? Which services? How many users affected?
4. Activate Claude Code for rapid diagnosis

### Emergency Diagnosis Prompt

```
EMERGENCY: Platform outage detected.
Check AWS health dashboard for all 7 regions.
Check CloudWatch alarms — what triggered first?
Check recent GitHub deployments — any deploy in last 2 hours?
Check Kafka queue depth — any backlog?
Give me root cause hypothesis in 3 minutes.
```

### Recovery Decision Tree

| Root Cause | Action |
|------------|--------|
| Recent bad deploy | `git revert HEAD && git push` → auto-redeploy |
| AWS region failure | Activate failover: switch DNS to secondary region |
| Database overload | Scale up RDS instance + flush Redis cache |
| Third-party API outage (Amadeus/Hotelbeds) | Serve cached data + show maintenance notice |
| DDoS attack | Activate AWS Shield + WAF rules + rate limiting |

### Post-Outage Actions (Within 24 Hours)

1. Generate post-mortem report: timeline, root cause, resolution, prevention
2. Notify all affected users by email with explanation and compensation (credit if > 1 hour outage)
3. Review monitoring rules — add alert to catch this pattern earlier next time
4. Log in Notion: Incidents page + GitHub issue for engineering follow-up

---

## EMG-001a · Payment Gateway Down

**Owner:** Dev Agent (on-call) &nbsp;|&nbsp; **Trigger:** Gateway error rate > 10% for 5+ minutes, OR PagerDuty alert

**Severity:** P1 — resolve within 30 minutes. Call CEO if not resolved in 15 minutes.

```
INCIDENT: [GATEWAY] is returning errors for [COUNTRY/REGION].
Detected: [TIME]. Error rate: [X]%.

IMMEDIATE ACTIONS (first 5 minutes):
1. Confirm scope: is this all [gateway] transactions or a subset?
   Check: gateway status page + CloudWatch error logs for /[gateway]/initiate and /[gateway]/callback.

2. Identify fallback in PaymentRouter.ts:
   What is the configured fallback for [CC]? Print current routing.

3. Activate fallback:
   If fallback is Stripe: confirm Stripe is healthy (status.stripe.com).
   Update PaymentRouter.ts to temporarily set [CC] primary to fallback gateway.
   Deploy immediately (feature flag preferred over code deploy if possible).

4. Check stuck bookings:
   SELECT * FROM bookings WHERE status='pending' AND payment_method='[gateway]' AND created_at > NOW() - INTERVAL '1h';
   List booking IDs. These users are affected.

5. User communication:
   Draft status message for affected region in local language:
   "We are experiencing a temporary issue with [payment method]. Please try [alternative] instead."
   Post to status page if applicable.

6. Notify:
   Post to #incidents in Slack: gateway, affected countries, fallback activated, user count affected, ETA.
   If no fallback: CEO escalation immediately — cannot take payments in [CC].

RECOVERY:
7. Monitor fallback error rate — confirm < 1% ✅
8. When [gateway] recovers: confirm with test transaction before switching back.
9. Drain stuck bookings: re-attempt or cancel + email affected users.

LOG:
Create ops/incidents/[DATE]-[gateway]-outage.md:
- Timeline, root cause, affected bookings count, revenue impact, fix applied.
```

| | |
|---|---|
| **Escalation** | No fallback available → CEO immediately · P1 unresolved 30 min → all-hands |

---

## EMG-002 · Data Breach Response

**Owner:** CEO + Legal Agent (AI) &nbsp;|&nbsp; **Trigger:** Immediately on detection

> ### CRITICAL — Legal Deadlines Apply
> | Regulation | Jurisdiction | Deadline |
> |------------|-------------|----------|
> | GDPR | EU / UK | Notify supervisory authority within **72 hours** of becoming aware |
> | LGPD | Brazil | Notify ANPD within **72 hours** (regulatory guidance) |
> | DPDP Act | India | Notify Data Protection Board within **72 hours** |
> | CCPA | California | Notify affected users **"expeditiously"** |

### Response Steps

| Step | Window | Action |
|------|--------|--------|
| **STEP 1** | 0–1 hour | Contain the breach. Isolate affected systems. Revoke compromised credentials. |
| **STEP 2** | 1–6 hours | Assess scope: which users? which data? which regions? |
| **STEP 3** | 6–24 hours | Prepare regulatory notification. Claude Legal Agent drafts — CEO reviews. |
| **STEP 4** | 24–72 hours | Notify regulators. Notify affected users. Set up remediation. |
| **STEP 5** | Post-breach | Security audit, patch vulnerabilities, update incident log. |

### Claude Legal Agent Prompt

```
Draft GDPR breach notification to ICO for the following incident: [describe].
Include: nature, categories, approximate number of affected users,
likely consequences, measures taken.
```

> See **EMG-002b** for the full technical containment + multi-jurisdiction notification steps.

---

## EMG-002a · AWS Region Outage or Degradation

**Owner:** Dev Agent (on-call) &nbsp;|&nbsp; **Trigger:** CloudWatch composite alarm `utu-sla-breach` fires, or Route53 health check fails

**Severity:** P1 — SLA at risk. Activate within 5 minutes of alert.

```
INCIDENT: [AWS_REGION] is degraded or down.
Detected: [TIME].

1. CONFIRM SCOPE:
   Check AWS Health Dashboard for [region].
   Is this partial (one AZ) or full region failure?
   Check our Route53 health checks — has automatic failover triggered?

2. FAILOVER ROUTING (if auto-failover not triggered):
   Update Route53 weighted routing manually:
   - eu-central-1 (Frankfurt) down → increase eu-west-2 (London) weight to 100.
     ⚠️ UK GDPR WARNING: UK user data cannot be processed in Frankfurt.
     Route ONLY non-UK EU traffic to London. UK users: error page + retry later.
   - eu-west-2 (London) down → increase eu-central-1 (Frankfurt) weight to 100.
     ⚠️ UK GDPR: UK users will hit Frankfurt. TEMPORARY failover only. Log as UK GDPR incident.
     Notify DPO (DPO_EMAIL) immediately. Document as necessary cross-border transfer.
   - sa-east-1 (São Paulo) down → LGPD BLOCKER: Brazilian data CANNOT leave Brazil.
     DO NOT reroute BR traffic to US or EU.
     Activate maintenance page for BR users: "Service temporarily unavailable for Brazil users."
     Escalate to Legal Agent immediately.
   - ca-central-1 (Montreal) down → reroute to us-east-1.
     PIPEDA allows temporary failover to US for continuity. Document as SCCs transfer. Log.
   - us-east-1 (Virginia) down → US + CA traffic degraded.
     No current failover region. Activate maintenance page for US/CA.

3. DB FAILOVER:
   If RDS primary unreachable: promote read replica to primary.
   Command: aws rds failover-db-cluster --db-cluster-identifier [cluster]
   ETA: 5–15 minutes for promotion.
   Update shard-router.js DB_URL for affected shard to promoted replica endpoint.

4. ENTERPRISE CLIENT NOTIFICATION:
   Any enterprise clients on SLA? Notify by email within 15 minutes of confirmed outage.

5. RCA:
   Post-incident: root cause analysis within 24h of resolution.
   Save to ops/incidents/[DATE]-[region]-outage.md.
   Update CloudFormation DR runbook if needed.
```

---

## EMG-002b · Data Breach Response — Detailed Technical Steps

**Owner:** CEO + Compliance Agent + Legal Agent &nbsp;|&nbsp; **Trigger:** Security incident, abnormal data access, or employee report

**Severity:** P0 — all other work stops. Clock starts at time of discovery.

```
INCIDENT: Suspected data breach — [DESCRIPTION OF WHAT WAS OBSERVED].
Discovery time: [TIME] — LOG THIS IMMEDIATELY.

HOUR 1 — CONTAIN AND ASSESS:
1. IDENTIFY SCOPE:
   Which users affected? How many? Which data categories?
   (Names, emails, passport numbers, payment data, booking history?)
   Which region? (EU/UK GDPR · Brazil LGPD · US CCPA · Canada PIPEDA)

2. IS THIS HIGH-RISK?
   HIGH-RISK indicators: financial data, passport/ID numbers, health info, passwords, children's data.
   If HIGH-RISK: regulator notification is mandatory. Clock running.

3. CONTAIN:
   Revoke all active sessions for affected users: Redis FLUSHDB for auth:session:* if broad scope.
   Rotate affected secrets immediately: HOTELBEDS_SECRET, ANTHROPIC_API_KEY, etc.
   Disable compromised service/endpoint if possible.
   Do NOT delete logs — preserve everything for investigation.

4. LOG DISCOVERY:
   INSERT INTO breach_log (discovered_at, description, affected_user_count, data_categories, region) VALUES (NOW(), '[desc]', [n], '[cats]', '[region]');

HOURS 2–24 — NOTIFY REGULATORS:
5. GDPR (EU/UK) — 72h window from discovery:
   If HIGH-RISK: notify ICO (ico.org.uk) and relevant EU DPA within 72h.
   If EU data: notify EDPB lead supervisory authority.
   Template: "Article 33 GDPR Breach Notification — UTUBooking" — draft NOW.

6. LGPD (Brazil) — 72h window:
   Notify ANPD within 72h at anpd.gov.br.
   Draft in Portuguese (pt-BR): "Notificação de Incidente de Segurança — Lei 13.709/2018".

7. PIPEDA (Canada) — "as soon as feasible" if real risk of significant harm:
   Notify OPC (priv.gc.ca). Document: is there real risk of significant harm?

8. CCPA (US) — no mandatory regulatory window but:
   Notify California residents if their data was in breach.
   Do NOT delay user notification beyond 30 days.

HOURS 24–72 — USER NOTIFICATION:
9. Draft user notification in all affected languages:
   "We are writing to inform you of a security incident that may have affected your account.
   [What happened. What data was involved. What we've done. What users should do.]"
   Do NOT blame users. Be factual. Provide support contact.

ONGOING:
10. Hire forensic investigator if scope unclear.
11. Legal counsel before any public statement.
12. Post-incident report to board within 7 days.
```

---

## EMG-003 · Claude AI Agent Malfunction Response

**Owner:** CEO &nbsp;|&nbsp; **Trigger:** AI outputs are incorrect, harmful, or out of character

> Occasionally Claude AI may produce incorrect, outdated, or inappropriate outputs. This SOP covers rapid diagnosis and recovery.

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| **Wrong market info** | Claude gives wrong pricing, legal info, or market data | Check `CLAUDE.md` files for outdated info — update immediately |
| **Poor quality output** | Outputs are generic, not UTUBooking-specific | `CLAUDE.md` context is missing or too vague — add more specifics |
| **Repetitive errors** | Same mistake keeps recurring | Add explicit correction rule to the relevant `CLAUDE.md` file |
| **Agent confusion** | Claude mixing up markets, currencies, or requirements | Review department `CLAUDE.md` hierarchy — check for conflicting rules |
| **Nuclear option** | Agent is fundamentally broken | `git checkout [last-stable-tag] .claude/` — restore from last known good AI brain |

---

## EMG-004 · GDS / Hotel API Failure (Amadeus / Hotelbeds / Booking.com)

**Owner:** Dev Agent (on-call) &nbsp;|&nbsp; **Trigger:** API timeout rate > 20% for 5+ minutes

```
INCIDENT: [Amadeus/Hotelbeds/Booking.com] API returning errors/timeouts.
Affected routes: [flight search / hotel search / EU hotels].

1. CONFIRM STATUS:
   Amadeus: developers.amadeus.com/status
   Hotelbeds: Check Hotelbeds developer portal for outage
   Booking.com: Check demandapi.booking.com status

2. IMMEDIATE MITIGATION:
   HOTEL SEARCH:
   - If Hotelbeds down: hotelSearchRouter.ts will attempt Booking.com for EU searches automatically (fallback logic).
   - If BOTH down: return cached results from Redis (hotel:search:* keys, up to 5min TTL).
   - If cache miss: return static fallback packages (like umrah packages API does).

   FLIGHT SEARCH:
   - Amadeus only source — no fallback GDS. Activate maintenance mode for flight search.
   - Show message: "Flight search temporarily unavailable. Please try again in a few minutes."
   - Log affected user sessions — proactively email if they had bookings in progress.

3. USER IMPACT ASSESSMENT:
   Any bookings that were mid-process when API failed?
   SELECT * FROM bookings WHERE status='pending' AND created_at > NOW() - INTERVAL '30min';
   If hotel booking confirmed but hotel rate not fully committed: contact Hotelbeds support urgently.

4. ESCALATION:
   If Amadeus down > 1h: notify enterprise clients with active flight bookings.
   If Hotelbeds down during Hajj season: escalate to CEO — revenue impact critical.

5. RECOVER:
   When API recovers: test with real search before removing maintenance mode.
   Drain any queued bookings.

LOG: ops/incidents/[DATE]-[api]-outage.md with duration, affected searches, revenue impact.
```

---

## EMG-005 · DDoS or Security Incident

**Owner:** Dev Agent + CEO &nbsp;|&nbsp; **Trigger:** Sudden traffic spike with high error rates, WAF alerts, or IDS detection

```
INCIDENT: [DESCRIPTION — DDoS / brute force / SQL injection attempt / unusual data access].
Detected: [TIME] via [CloudWatch / WAF / user report / internal observation].

1. TRIAGE (first 5 minutes):
   Is this affecting production? Which endpoints/regions?
   Confirm: legitimate traffic spike (e.g. viral marketing) vs attack. Check user agent patterns.

2. IMMEDIATE CONTAINMENT:
   DDoS: AWS Shield Advanced should auto-mitigate. Verify Shield is active.
   Brute force on /api/auth/login: rate limiter should block after 5 attempts/15min.
   Confirm rate limit middleware active. If bypassed: increase to 3 attempts/30min temporarily.
   SQL injection attempts: WAF should block. Review WAF logs — is it blocking correctly?

3. IP BLOCKING (if targeted attack):
   Add attacker IPs to WAF block list via AWS Console.
   If attack is distributed: engage AWS Shield Response Team (enterprise support required).

4. ESCALATION:
   Any successful intrusion (unauthorised data access): activate EMG-003 immediately.
   Revenue impact > $10K: CEO notified immediately.
   Ongoing attack > 30min: AWS support ticket opened.

5. POST-INCIDENT:
   Penetration test scheduled within 30 days.
   WAF rules reviewed and updated.
   Log in ops/incidents/[DATE]-security-[type].md.
   Legal review if customer data at risk.
```

---

## EMG-006 · Regulatory Inquiry or Audit

**Owner:** CEO + Legal Agent + Compliance Agent &nbsp;|&nbsp; **Trigger:** Letter or communication from regulator (ICO, CNIL, ANPD, CA AG, OPC, etc.)

```
REGULATORY INQUIRY received from [REGULATOR] — [DATE].
Subject: [BRIEF DESCRIPTION — e.g. GDPR Art. 15 complaint re user X / audit request / fine notice].

IMMEDIATE (within 24h of receipt):
1. DO NOT respond to regulator without Legal Agent review.
2. Forward communication to legal@utubooking.com + legal/CLAUDE.md agent.
3. Identify the specific user complaint or audit scope.
4. Preserve all relevant data: do NOT run any deletions or anonymisations on affected user_ids.

ASSESSMENT:
5. What is the specific allegation or request?
   - Subject access request not honoured? Check response time log.
   - Consent complaint? Pull consent_log for affected user.
   - Data breach report? Cross-reference breach_log.
   - General audit? Prepare data inventory from compliance/gdpr/dpa-register.md.

6. What is the regulatory deadline for response?
   ICO (UK): typically 28 days for informal inquiry.
   CNIL (France): varies.
   ANPD (Brazil): typically 10 business days.
   CA AG (CCPA): typically 30 days.

RESPONSE DRAFTING:
7. Legal Agent drafts response — never AI-generated response sent directly.
8. CEO reviews and approves before any communication sent to regulator.
9. Response tone: cooperative, factual, professional. No admissions of liability without legal counsel.

LOG: legal/regulatory-inquiries/[DATE]-[regulator]-[subject].md.
If fine issued: notify finance agent + CEO. Escalate to Board if > €50K equivalent.
```

---

# SECTION 5 — Fraud & Risk Department SOPs

---

## FRD-001 · Daily Fraud Queue Review

**Owner:** Fraud Agent &nbsp;|&nbsp; **Frequency:** Every morning, before customer support shift starts

**Purpose:** Clear the pending fraud case queue, action high-risk cases, and surface patterns before they become financial losses.

**Trigger:** Any morning where `fraud_cases.status = 'pending'` count > 0, or automatically as part of GBL-001 morning briefing.

### Step 1 — Paste into Claude Code

```
Daily fraud queue review — [DATE].

QUEUE SUMMARY:
- Query pending cases: GET /api/admin/fraud/cases?status=pending
- Sort by risk_score DESC. How many cases are pending?
- How many are risk_score >= 70 (HIGH RISK — auto-workflow already triggered)?
- How many are risk_score 40–69 (MEDIUM — manual review needed)?
- Confirmed fraud this month so far (SAR value): GET /api/admin/fraud/stats

HIGH-RISK CASES (risk_score >= 70):
For each pending case with score >= 70:
  - Booking ref, user_email, amount_sar, payment_method, country, flags
  - Has the fraud review workflow launched? (check workflow engine)
  - Recommendation: CONFIRM FRAUD / FALSE POSITIVE / ESCALATE TO CEO

MEDIUM-RISK CASES (risk_score 40–69):
For each pending case with score 40–69:
  - Review flags. Common flags: geo_mismatch, high_velocity, late_night_bulk
  - Cross-reference: has this email/IP appeared in any watchlist entry?
  - Recommendation: REVIEW / MONITOR / DISMISS

PATTERN ANALYSIS:
- Which fraud rule has the highest hit_count this week? Any spike vs. 7-day avg?
- Any new country appearing disproportionately in flagged cases?
- Any payment method with unusual fraud rate (> 3% of transactions)?

Output: case-by-case decision list. Flag any case needing CEO sign-off before action.
```

### Step 2 — Decision Matrix

| Risk Score | Status | Action | CEO Required |
|-----------|--------|--------|-------------|
| >= 90 | pending | Block booking + confirm fraud + add to watchlist | Yes |
| 70–89 | pending | Hold booking, request user verification, escalate if no response 4h | Yes |
| 40–69 | pending | Flag for 24h monitoring. Auto-release if no further signals. | No |
| < 40 | pending | Dismiss — log reason | No |

### Step 3 — Decision Logging

All decisions must be recorded via `PATCH /api/admin/fraud/cases/:id` with:
- `status`: `confirmed_fraud` / `false_positive` / `escalated`
- `decision_reason`: mandatory — minimum 10 words explaining the decision

> **Human approval required** for all `confirmed_fraud` decisions affecting bookings > SAR 5,000 or involving chargebacks.

---

## FRD-002 · Fraud Rule Governance

**Owner:** Fraud Agent + CEO &nbsp;|&nbsp; **Frequency:** Per new rule proposal or existing rule modification

**Purpose:** Ensure fraud detection rules are effective, not over-triggering false positives, and approved before going live. Every rule change auto-launches an approval workflow.

**Trigger:** False positive rate > 15% in 30 days, new fraud pattern detected, or quarterly rule hygiene review.

### Step 1 — Rule Effectiveness Review

```
Fraud rule effectiveness review — [DATE].

CURRENT RULES AUDIT:
- GET /api/admin/fraud/rules?active=true
- For each rule: hit_count, severity, action (flag/block/review/allow)
- False positive rate this month: GET /api/admin/fraud/stats → false_positive_rate
- Target: false_positive_rate < 10%. Current: [X]%

RULES TO REVIEW:
- Rules with hit_count = 0 in 30 days → candidate for deactivation or condition adjustment
- Rules with hit_count > 200/day → may be too broad, review condition specificity
- Rules with action='block' → highest stakes, verify severity justifies hard block

PROPOSE CHANGES (if any):
For each proposed change:
  Rule name:
  Current condition: [JSON]
  Proposed condition: [JSON]
  Reason: [why this change improves precision]
  Expected impact: [estimated reduction in false positives / new fraud caught]

NEW RULE PROPOSAL (if applicable):
  Name: [descriptive, unique]
  Type: threshold / velocity / geo / device / card / pattern / ml
  Condition: [JSON — see existing rules for format]
  Action: flag / block / review
  Severity: critical / high / medium / low
  Business justification: [1–2 sentences]

All new rules and changes require CEO approval before activation.
Save rule change log: legal/regulatory-inquiries/ is wrong — save to: docs/fraud/rule-changes/[DATE]-[rule-name].md
```

### Step 2 — Rule Change Approval Gate

| Change Type | Approval Required | Workflow |
|------------|-----------------|---------|
| New `block` or `critical` rule | CEO + manual test on 7-day historical data | Yes — workflow auto-launched on POST /rules |
| New `flag` or `review` rule | Fraud Agent review sufficient | Yes — workflow auto-launched |
| Deactivate existing rule | Fraud Agent + document reason | Patch rule: `active: false` |
| Adjust threshold on existing rule | Fraud Agent review | Patch rule condition |

> **Never delete a rule.** Set `active: false`. Deletion loses hit_count audit history.

### Step 3 — Monthly Rule Hygiene Prompt

Run on the 1st of each month as part of FRD-001 extended review:

```
Monthly fraud rule hygiene — [MONTH YEAR].

1. Rules with zero hits in 30 days — list. Deactivate candidates.
2. Rules that fired but had > 50% false positive rate — list. Tune conditions.
3. New fraud patterns seen in confirmed_fraud cases this month — any rule gaps?
4. Watchlist entries expiring in next 30 days — review: extend or let expire?
5. Confirmed fraud SAR total this month vs. last month. Trend?
6. Geographic shift in fraud attempts? Any new country entering top 5?

Output: rule hygiene report. Save to: docs/fraud/monthly-reports/[YYYY-MM].md
```

---

## FRD-003 · Persistent Bad Actor — Watchlist Management

**Owner:** Fraud Agent &nbsp;|&nbsp; **Trigger:** Any `confirmed_fraud` decision, or external threat intelligence flag

**Purpose:** Ensure persistent fraudsters are blocked across all booking channels (email, IP, card BIN, device, phone). Watchlist entries are upserted — same type+value updates rather than duplicates.

### Watchlist Entry Procedure

```
Watchlist entry — [DATE] — triggered by case [CASE_ID] / [EXTERNAL SOURCE].

Actor details:
  Email: [if known]
  IP address: [if known — check if residential or datacenter/VPN]
  Card BIN: [first 6 digits only — never store full card]
  Device fingerprint: [if available]
  Phone: [if known]

Evidence:
  - Booking refs involved: [list]
  - Total attempted fraud SAR: [amount]
  - Rule(s) that fired: [list]
  - Decision basis: [brief narrative]

Watchlist entries to create (POST /api/admin/fraud/watchlist for each):
  type: email | ip | card_bin | device_id | phone
  value: [the identifier]
  reason: [minimum 15 words linking back to confirmed case]
  severity: critical | high | medium
  expires_at: [null for permanent ban; ISO date for temporary — default 12 months for IP, permanent for card_bin]

Post-entry checks:
  - Any existing active bookings from this email/IP? Flag for cancellation review.
  - Notify customer success: if legitimate user was wrongly listed, they have an appeal path.
  - Log to: docs/fraud/watchlist-log/[DATE]-[type]-[value-masked].md

Human approval required before watchlist entry for any EU/UK user (GDPR Art. 22 — automated profiling).
```

### Watchlist Expiry Policy

| Entry Type | Default Expiry | Review |
|-----------|---------------|--------|
| email | 24 months | Annual — confirm still active fraud risk |
| ip | 12 months | Quarterly — IPs reassign; residential IPs should not be permanent |
| card_bin | Permanent | Annual — verify BIN still associated with fraudulent issuer |
| device_id | 18 months | Semi-annual |
| phone | 24 months | Annual |

---

# SECTION 6 — Revenue Management SOPs

---

## RVN-001 · Seasonal Pricing Rule Setup

**Owner:** Revenue Agent + CEO &nbsp;|&nbsp; **Frequency:** 8 weeks before each major season (Ramadan, Hajj, Eid Al-Fitr, Eid Al-Adha, Summer Peak)

**Purpose:** Set, review, and activate time-bound pricing rules for peak periods so hotels in Makkah, Madinah, and key markets are priced optimally — maximising revenue without losing bookings to competitors.

**Trigger:** 8 weeks before season start date OR when occupancy signals indicate early demand spike.

### UTUBooking Seasonal Calendar

| Season | Approx. Dates | Markets Affected | Typical Uplift |
|--------|--------------|-----------------|---------------|
| Ramadan | 28 Feb – 29 Mar 2026 | Makkah, Madinah, KSA, UAE | +20% |
| Hajj | 1 Jun – 20 Jun 2026 | Makkah, Madinah only | +35% |
| Eid Al-Fitr | 29 Mar – 2 Apr 2026 | All MEANA markets | +15% |
| Eid Al-Adha | Jun 2026 (post-Hajj) | All MEANA markets | +15% |
| KSA National Day | 23 Sep 2026 | KSA | +10% |
| Summer Peak | 15 Jun – 31 Aug 2026 | UAE, EU, NA | +10% |

### Step 1 — Pre-Season Pricing Prompt

```
Seasonal pricing rule setup — [SEASON NAME] [YEAR].

MARKET INTELLIGENCE:
1. What are competitors (Almosafer, Wego, Booking.com) charging for Makkah/Madinah hotels
   during [SEASON DATES]? Search for comparable 3-5 star hotels near Haram.
2. What is our current average booking lead time for this season vs. last year?
3. Hotelbeds availability signal: any hotels already showing < 20% availability
   for peak dates? (check GET /api/hotels/search for peak weekend dates)

RULE PROPOSAL:
For each proposed rule, specify:
  Name: [Season] [Year] [Market/Hotel]
  Type: seasonal | event
  Applies to: all | hotel (specify hotel_id if single property)
  Adjustment: percent | absolute
  Value: [number — positive = uplift, negative = discount]
  Start date: [YYYY-MM-DD]
  End date: [YYYY-MM-DD]
  Priority: 1 (highest) to 9 (lowest)
  Notes: [business rationale]

BLACKOUT PERIODS (if applicable):
  Hotels that should NOT be bookable for certain dates (e.g. blocked for group contracts):
  Name, hotel_id, start_date, end_date, reason

REVIEW CHECKLIST before activating:
  [ ] Does the rule conflict with any existing active rule (same hotel, overlapping dates)?
  [ ] Have finance and CEO reviewed the projected revenue impact?
  [ ] Are competitor prices within 15% of our proposed prices?
  [ ] Is the adjustment reversible if demand underperforms?

Output: rule proposal document for CEO review. DO NOT activate rules until CEO approves.
Save draft: docs/revenue/seasonal-rules/[SEASON]-[YEAR]-draft.md
```

### Step 2 — Activation (CEO approved)

```
Activate approved seasonal pricing rules — [SEASON] [YEAR].

Rules approved by CEO on [DATE]:
[List each approved rule name]

For each rule:
  POST /api/admin/revenue/rules — with approved parameters
  Confirm: rule is active = true, priority correct, dates correct
  Test: run a test hotel search for peak dates — confirm price uplift is applied correctly

Post-activation monitoring:
  Day 1: check booking conversion rate for affected hotels vs. pre-rule baseline
  Day 7: check booking volume — if > 20% below forecast, flag to CEO for price adjustment
  Day 14: mid-season check — are high-demand dates approaching full occupancy?
          If yes: consider additional uplift rule for last 20% of inventory.

Save activation log: docs/revenue/seasonal-rules/[SEASON]-[YEAR]-activated.md
```

---

## RVN-002 · Monthly Revenue Target Review

**Owner:** Revenue Agent + Finance Agent &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Review actual RevPAR, occupancy, and ADR against targets. Adjust pricing strategy for the coming month based on forward booking data.

**Trigger:** Automatically part of GBL-002 Weekly Report extended monthly version.

### Step 1 — Monthly Review Prompt

```
Monthly revenue target review — [MONTH YEAR].

ACTUALS vs. TARGETS (GET /api/admin/revenue/targets?period=[YYYY-MM]):
  Target RevPAR: [SAR] | Actual RevPAR: [SAR] | Variance: [%]
  Target Occupancy: [%] | Actual Occupancy: [%]
  Target ADR: [SAR] | Actual ADR: [SAR]

If any metric is > 10% below target: root cause analysis required.
  - Which specific hotels dragged occupancy down?
  - Which markets underperformed?
  - Were there any blackout periods or rule conflicts that suppressed bookings?

FORWARD BOOKING ANALYSIS:
  For the next 30/60/90 days: what is current on-the-books occupancy vs. same period last year?
  Any specific dates showing < 40% occupancy that need a demand-stimulation rule?
  Any specific dates showing > 85% occupancy that justify a further uplift?

ACTIVE RULE HEALTH CHECK:
  GET /api/admin/revenue/rules?active=true
  Are all rules correctly scoped (dates, hotels, priorities)?
  Any rules that expired and need renewal?
  Any rules that are conflicting with each other (same priority, same hotel, overlapping dates)?

PRICING SERVICE PROXY:
  POST /api/admin/revenue/pricing-proxy with sample hotel searches across top 5 markets
  Confirm pricing service (port 3011) is returning correct adjusted prices.

Output: monthly revenue report (1 page). Update revenue_targets table with actual_revpar.
Save to: docs/revenue/monthly-reports/[YYYY-MM]-revenue-review.md
```

### Step 2 — Revenue Target Setting (new period)

```
Set revenue targets for [MONTH YEAR].

INPUTS:
  - Last month actuals: RevPAR [SAR], Occupancy [%], ADR [SAR]
  - 12-month trend: improving / stable / declining?
  - Upcoming seasons or events in this period?
  - New hotel supply in key markets (new competition)?
  - Budget target from Finance Agent (if set in annual budget)?

PROPOSED TARGETS:
  RevPAR (SAR): [X]  — basis: [last month +/-X% or seasonal factor]
  Occupancy %: [X]
  ADR (SAR): [X]
  Notes: [any specific assumptions, e.g. Ramadan uplift baked in]

POST /api/admin/revenue/targets with period=[YYYY-MM], period_type=month
CEO approval required if targets deviate > 20% from prior period.
```

---

## RVN-003 · Emergency Price Override

**Owner:** Revenue Agent + CEO &nbsp;|&nbsp; **Trigger:** Competitor price dump, hotel contract change, system pricing error, or demand crash requiring same-day response

**Purpose:** Apply an immediate date-specific price override for a single hotel, bypassing the standard rule engine, with full audit trail.

### Override Conditions

| Trigger | Example | Response Time |
|---------|---------|--------------|
| Competitor price dump | Wego shows Makkah hotel 30% cheaper | < 2 hours |
| Hotel contract renegotiation | Partner reduces our net rate by 15% | < 4 hours |
| System pricing error | Rule misconfiguration causes 90% discount shown publicly | < 30 minutes — P1 |
| Demand crash | Flight cancellation wipes 40% of weekend bookings | < 2 hours |

### Override Prompt

```
Emergency price override — [DATE] — triggered by: [REASON].

SITUATION:
  Hotel: [hotel_name] (hotel_id: [ID])
  Affected dates: [start_date] to [end_date]
  Current displayed price: SAR [X]
  Target price after override: SAR [Y]
  Reason: [specific business justification — minimum 20 words]

IMPACT ASSESSMENT before override:
  1. How many unconfirmed quotes / search sessions are live for this hotel/date?
     (Check session cache — Redis key: search:results:{hotelId}:*)
  2. Are there any confirmed bookings at the current (incorrect) price that need honouring?
     If yes: honour them, do NOT retroactively reprice confirmed bookings.
  3. Is this a temporary override (specific dates) or a rule adjustment (ongoing)?
     If ongoing: use RVN-001 rule creation process instead.

EXECUTE OVERRIDE:
  POST /api/admin/revenue/overrides with:
    hotel_id, hotel_name, override_date (one entry per date), price_sar, reason, approved_by

POST-OVERRIDE:
  1. Clear Redis hotel search cache for affected dates: DEL search:results:{hotelId}:*
  2. Confirm new price is displayed correctly — test via hotel search API.
  3. Notify customer success: if customers ask about price change, standard reply is "prices vary by availability."
  4. Document in: docs/revenue/overrides/[DATE]-[hotel_id]-override.md

CEO approval required for any override affecting bookings already in cart (conversion risk).
ALL overrides are immutable in the audit table — log reason accurately.
```

---

# SECTION 7 — Procurement SOPs

---

## PRC-001 · Supplier Onboarding & Contracting

**Owner:** Procurement Agent + CEO &nbsp;|&nbsp; **Frequency:** Per new supplier engagement

**Purpose:** Ensure every API provider, GDS, hotel chain, technology vendor, or service partner is properly vetted, contracted, and set up before any production access is granted.

**Trigger:** BD team identifies a new supplier, or Dev Agent requests a new API integration.

### Supplier Types

| Type | Examples | Risk Level |
|------|---------|-----------|
| api_provider | Hotelbeds, Amadeus, Booking.com | High — core revenue dependency |
| gds | Amadeus, Sabre, Galileo | High |
| hotel_chain | Direct hotel group APIs | Medium-High |
| airline | Pegasus, Air Arabia, flyadeal | Medium-High |
| technology | AWS, Twilio, SendGrid, Redis Cloud | Medium |
| insurance | Travel insurance API partners | Medium |
| car_rental | Hertz, Budget API | Low-Medium |
| other | Freelancers, consultants | Low |

### Step 1 — Supplier Due Diligence Prompt

```
New supplier onboarding — [SUPPLIER NAME] — [DATE].

SUPPLIER PROFILE:
  Name: [supplier name]
  Type: [api_provider / gds / hotel_chain / airline / technology / other]
  Country of incorporation: [country]
  Website: [URL]
  Contact: [name, email]
  Account/partner ID: [if known]
  Estimated annual contract value (SAR): [X]

DUE DILIGENCE CHECKLIST:
  [ ] Is the supplier on any sanctions list? (OFAC, UN, EU, UK HMT)
      — Check company name + country. Especially critical for suppliers in sanctioned regions.
  [ ] Does the supplier have a DPA (Data Processing Agreement) for GDPR compliance?
      — Required for any supplier processing EU/UK user data.
  [ ] Does the supplier have SOC 2 Type II or ISO 27001 certification?
      — Required for any supplier with access to user PII.
  [ ] API SLA: what uptime guarantee does the supplier offer? Target: 99.5% minimum.
  [ ] Payment terms: NET 30 standard. NET 60 requires Finance Agent approval.
  [ ] Does the supplier require exclusivity? Flag to CEO — exclusivity clauses require board review.

LEGAL REVIEW:
  Legal Agent must review any contract > SAR 100,000 annual value before signing.
  For contracts < SAR 100,000: Procurement Agent review sufficient, CEO countersigns.

OUTPUT: supplier due diligence report. Save to: docs/procurement/due-diligence/[SUPPLIER]-[DATE].md
Do NOT create the supplier record in the database until due diligence is complete.
```

### Step 2 — Supplier Record Creation

```
Create supplier record — [SUPPLIER NAME] — due diligence approved [DATE].

POST /api/admin/procurement/suppliers:
  name: [full legal entity name]
  type: [supplier type]
  status: onboarding
  country: [ISO 2-letter code]
  contact_name: [name]
  contact_email: [email]
  website: [URL]
  account_id: [partner/account ID from their portal]
  annual_value_sar: [estimated annual spend]
  owner: [internal owner — CEO / Dev / Finance]
  notes: [key commercial terms, SLA summary, renewal date]

After record created: POST /api/admin/procurement/contracts with contract details.
After contract signed: PATCH supplier status → active.
Notify Dev Agent: supplier is active — API credentials can now be provisioned from SSM.
```

### Step 3 — Contract Creation Prompt

```
Draft supplier contract record — [SUPPLIER] — [DATE].

POST /api/admin/procurement/contracts:
  supplier_id: [UUID from supplier record]
  supplier_name: [name]
  title: [contract title — e.g. "Hotelbeds API Distribution Agreement 2026"]
  type: api | service | license | distribution | nda | framework | other
  value_sar: [total contract value or annual value]
  start_date: [YYYY-MM-DD]
  end_date: [YYYY-MM-DD — if open-ended, use 2099-12-31 and note in fields]
  auto_renews: true | false
  signed_by: [CEO name]
  file_url: [link to signed contract in secure document store — e.g. Google Drive or legal/contracts/]
  notes: [key terms: notice period, SLA, liability cap, data processing, exit clause]

Post-contract actions:
  1. Calendar reminder 90 days before end_date for renewal review.
  2. If auto_renews = true: calendar reminder 60 days before end_date — confirm or cancel.
  3. Create SLA entries (POST /api/admin/procurement/slas) for each contractual SLA metric.
  4. Brief Finance Agent: add to vendor payment schedule.
```

---

## PRC-002 · Monthly Contract & SLA Review

**Owner:** Procurement Agent &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Monitor supplier health, catch SLA breaches before they escalate, and flag contracts coming up for renewal so nothing auto-renews unexpectedly.

### Monthly Review Prompt

```
Monthly procurement & SLA review — [MONTH YEAR].

SLA STATUS (GET /api/admin/procurement/slas):
  How many SLAs are currently: met | at_risk | breached | pending?
  For any SLA with status = 'breached':
    - Which supplier? Which metric?
    - What is the contractual remedy (service credit, termination right)?
    - Has the supplier been formally notified? (required for credit claim)
    - Draft breach notification email for CEO review.
  For any SLA with status = 'at_risk':
    - Proactively contact supplier — request remediation plan within 7 days.

CONTRACT RENEWALS — NEXT 90 DAYS:
  Query: contracts WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
  For each expiring contract:
    - Do we want to renew? (check supplier performance, market alternatives)
    - If yes: initiate renewal negotiation now — do not wait for auto-renew.
    - If no: serve notice per contract notice period. Flag to Dev Agent if API access will terminate.
    - If auto_renews = true and we want to cancel: notice must be served NOW if < 60 days.

CONTRACT SPEND ANALYSIS:
  Total active contract value (SAR): [sum of all active contracts]
  Top 5 suppliers by annual value: list
  Any supplier where actual API spend differs > 20% from contracted estimate? Flag to Finance.

NEW SUPPLIERS THIS MONTH:
  Any suppliers still in 'onboarding' status > 30 days? Flag — may need nudging.

Output: monthly procurement health report.
Save to: docs/procurement/monthly-reports/[YYYY-MM]-procurement-review.md
```

---

## PRC-003 · Purchase Order Approval

**Owner:** Procurement Agent + CEO &nbsp;|&nbsp; **Trigger:** Any procurement spend request >= SAR 10,000

**Purpose:** Ensure all significant spend is pre-approved, tracked against budget, and has a clear business case before commitment.

### PO Approval Tiers

| Amount (SAR) | Approver | Turnaround |
|-------------|---------|-----------|
| < 10,000 | Procurement Agent self-approve | Same day |
| 10,000 – 49,999 | CEO approval | Within 48h |
| 50,000 – 249,999 | CEO + Finance Agent | Within 72h |
| >= 250,000 | CEO + Board notification | Within 5 business days |

### PO Request Prompt

```
Purchase Order request — [DATE] — [SUPPLIER NAME].

PO DETAILS:
  Supplier: [name] (must exist in procurement_suppliers table — check first)
  PO number: PO-[YYYY]-[sequential 3-digit number, e.g. PO-2026-001]
  Description: [what is being purchased — specific, not generic]
  Amount (SAR): [X]
  Ordered date: [YYYY-MM-DD]
  Expected delivery: [YYYY-MM-DD]
  Business justification: [why is this needed? which OKR or project does it support?]

BUDGET CHECK (before submitting for approval):
  What budget line does this fall under? (Marketing / Dev / Ops / Legal / HR)
  Finance Agent: is there remaining budget in this line for [MONTH/QUARTER]?
  If over budget: flag — CEO must approve both the PO and the budget exception.

APPROVAL REQUEST (paste for CEO):
  "PO-[NUMBER] approval request — [SUPPLIER] — SAR [AMOUNT]
   Purpose: [1 sentence]
   Budget line: [X] — [remaining budget after this PO: SAR Y]
   Expected delivery: [DATE]
   Approve? YES / NO / QUERY"

ONCE APPROVED:
  POST /api/admin/procurement/purchase_orders with status=approved, approved_by=[CEO name]
  Notify Finance Agent: PO approved, add to payment schedule.
  On delivery: PATCH status → delivered. On payment: PATCH status → paid.
```

---

# SECTION 8 — Platform Operations SOPs

> These SOPs are owned by the **Ops Agent** and **CS Agent** — they cover cross-cutting admin platform functions that don't belong to a single department.

---

## INV-001 · Weekly Inventory Health Review

**Owner:** Ops Agent + Revenue Agent &nbsp;|&nbsp; **Frequency:** Every Monday as part of GBL-002 Weekly Report

**Purpose:** Ensure hotel, flight, and car inventory is live, correctly priced, and that any coverage gaps — especially in Makkah and Madinah — are identified and actioned before they cost bookings.

**Trigger:** Weekly Monday briefing. Also triggered when AI Inventory Advisor flags health = `poor` or `fair`.

### Step 1 — Inventory Pulse Prompt

```
Weekly inventory health review — [DATE].

HOTEL INVENTORY:
  GET /api/admin/inventory?type=hotels
  Total hotels in system: [X]
  Active (enabled=true): [Y] | Paused/disabled: [Z]
  
  MAKKAH COVERAGE (critical):
    Hotels near Haram: [count] | 5-star: [n] | 4-star: [n] | 3-star: [n]
    Any hotel showing status=unavailable in Hotelbeds this week? (check adapter logs)
    Are all Makkah hotels correctly tagged is_halal_friendly=true?
  
  MADINAH COVERAGE:
    Hotels near Masjid al-Nabawi: [count]
    Any availability gaps for Hajj season dates (June 2026)? Flag immediately.
  
  OTHER KEY MARKETS:
    Riyadh, Jeddah, Dubai, Istanbul — are flagship properties active?
    Any hotel toggled off this week? What was the reason?

FLIGHT INVENTORY:
  GET /api/admin/inventory?type=flights
  Active routes: [X] | Key routes: IST↔JED, CGK↔JED, KUL↔JED, KHI↔JED, DEL↔JED
  Any route showing no availability for next 30 days? Flag — may indicate GDS issue.
  Amadeus API error rate this week? (check GBL-001 infrastructure section)

CAR INVENTORY:
  GET /api/admin/inventory?type=cars
  Active car categories: [X]
  Makkah/Madinah car availability for Hajj period? Critical — pilgrim transport demand.

AI INVENTORY ADVISOR:
  Run ✦ AI Inventory Advisor from /admin/inventory panel.
  Note: inventory_health, critical/high priority gaps, Hajj readiness assessment.
  Any gaps flagged as critical: action immediately before end of day.

Output: inventory health table (hotels/flights/cars counts + gap flags).
Save to: Notion > Ops > Weekly Inventory > [DATE].
```

### Step 2 — Toggle Action Protocol

When toggling a hotel/flight/car active or inactive:

| Action | When | Who | Required Documentation |
|--------|------|-----|----------------------|
| Toggle hotel OFF | Supplier confirmed unavailable, maintenance, rate dispute | Ops Agent | Reason logged in admin_notes; Revenue Agent notified |
| Toggle hotel ON | New property confirmed, supplier rate loaded | Ops Agent + Revenue | Test search to confirm availability appears |
| Toggle flight OFF | Route suspended, GDS error confirmed | Dev Agent | Dev incident logged; GBL-004 alert if > 3 routes affected |
| Emergency toggle | Any critical inventory issue | Ops Agent + CEO | CEO notified within 30 minutes |

---

## INV-002 · Hotel/Flight/Car Availability Management

**Owner:** Ops Agent &nbsp;|&nbsp; **Trigger:** Supplier notification, GDS error, peak-season inventory review

**Purpose:** Proactively manage inventory availability to prevent "no results" experiences — especially for Hajj/Umrah searches which have the highest customer sensitivity.

### Hajj Season Inventory Checklist (run 12 weeks before Hajj)

```
Hajj inventory readiness check — [YEAR] — [DATE].

MAKKAH HOTEL COVERAGE:
  [ ] All registered Hotelbeds properties in Makkah zone: active = true
  [ ] Hotel distance from Haram: < 500m (5-star), < 1km (4-star), < 2km (3-star)
  [ ] Minimum 5 hotels per star category available in Makkah
  [ ] All Makkah properties is_halal_friendly = true (no exceptions)
  [ ] Hotelbeds rate loaded for Hajj dates (1 Jun – 20 Jun [YEAR]): verify in adapter
  [ ] Revenue blackout dates for group-contracted blocks: created in revenue_blackouts table

MADINAH HOTEL COVERAGE:
  [ ] Minimum 3 hotels per star category active in Madinah
  [ ] Masjid al-Nabawi proximity data accurate
  [ ] Pre-Hajj Madinah dates (26 May – 31 May) covered

FLIGHT COVERAGE:
  [ ] All Hajj-relevant routes active: IST/CGK/KUL/KHI/DEL/LHE/ISB/BOM → JED
  [ ] Direct + connection routing via Amadeus GDS confirmed live
  [ ] No Amadeus API errors on test search for Hajj period dates

CAR COVERAGE:
  [ ] Makkah car hire (airport → hotel) inventory confirmed with partners
  [ ] Minibus/group vehicle categories active (Hajj groups travel together)

If any item above fails: assign to Dev Agent (GDS/API issue) or Revenue Agent (pricing/blackout).
CEO notified if Makkah hotel coverage < 5 properties per star tier within 6 weeks of Hajj.
```

---

## LOY-001 · Loyalty Programme Weekly Review

**Owner:** Ops Agent + CS Agent &nbsp;|&nbsp; **Frequency:** Weekly Monday briefing (part of GBL-002)

**Purpose:** Monitor loyalty programme health — tier distribution, points liability, redemption rates, and churn risk — to protect retention and ensure the programme is incentivising repeat bookings.

**Trigger:** Weekly. Also triggered when AI Loyalty Advisor flags health = `poor` or churn_risk segments appear.

### Step 1 — Weekly Loyalty Pulse Prompt

```
Weekly loyalty programme review — [DATE].

OVERVIEW: GET /api/admin/loyalty/stats
  Total members: [X]
  Tier breakdown: Bronze [n] | Silver [n] | Gold [n] | Platinum [n]
  Points outstanding (unredeemed): [X] pts
  Points redeemed this week: [Y] pts
  New member registrations this week: [Z]

TIER HEALTH:
  Platinum members: [n] — any Platinum at risk of downgrade (approaching tier renewal)?
  Gold members: [n] — any who haven't booked in 60 days? Risk of dropping to Silver.
  Bronze members: [n] — conversion rate to Silver? (members who booked 2+ times)
  
  Flag: any tier with > 20% fewer members than last month → churn signal

REDEMPTION ANALYSIS:
  What are the top 3 rewards being redeemed this week? (GET /api/admin/loyalty/ledger)
  Redemption rate (points redeemed / points outstanding): [X]%
  Target: 15–25% monthly redemption rate (too low = points feel worthless; too high = liability)
  If < 10%: redemption friction — are reward values compelling? Flag to Products Agent.

POINTS LIABILITY:
  Total outstanding points × SAR value per point = SAR [X] liability
  Is this within budget? (compare to Finance Agent's loyalty budget line)
  If points liability > SAR 500,000: alert Finance Agent immediately.

AI LOYALTY ADVISOR:
  Run ✦ AI Loyalty Programme Advisor from /admin/loyalty panel.
  Note: programme_health, churn_risk_segments, re-engagement recommendations.
  Any Gulf-specific reward recommendations for upcoming season? (Ramadan points bonus?)

Output: loyalty health table + action items.
Save to: Notion > Ops > Weekly Loyalty > [DATE].
```

---

## LOY-002 · Monthly Points & Rewards Management

**Owner:** Ops Agent + Finance Agent &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Run the monthly loyalty accounting — expire old points, update tier standings, review reward catalogue relevance, and brief Finance Agent on points liability movement.

### Monthly Loyalty Accounting Prompt

```
Monthly loyalty programme management — [MONTH YEAR].

POINTS EXPIRY:
  Policy: points expire 24 months after earning date (Gulf standard).
  Query: SELECT SUM(points) FROM loyalty_ledger WHERE type='earn' AND expires_at < NOW() AND NOT redeemed
  Points expiring this month: [X] pts from [N] members
  Action: expiry notification sent 30 days prior? (check notification service logs)
  Soft expiry approach: send "your points expire in 7 days" re-engagement email to affected members.

TIER REVIEW:
  Members who qualify for tier upgrade this month (hit booking/points threshold):
    Bronze → Silver: minimum [X] bookings or [Y] points in rolling 12 months
    Silver → Gold: minimum [X] bookings or [Y] points
    Gold → Platinum: minimum [X] bookings or [Y] points
  PATCH tier for eligible members in loyalty_members table.
  Send tier upgrade email for each: "Congratulations — you've reached [TIER] status!"

REWARD CATALOGUE REVIEW:
  GET /api/admin/loyalty/rewards
  Any reward with zero redemptions in 60 days? → consider retiring or replacing.
  New rewards to add for upcoming season?
    Ramadan context: hotel room upgrade vouchers, iftar experience credits
    Hajj context: airport lounge access, priority check-in credits (partner with airline)
  POST /api/admin/loyalty/rewards for any new rewards.
  DELETE /api/admin/loyalty/rewards/:id for rewards being retired (soft: set active=false first).

FINANCE BRIEFING:
  Points earned this month: [X] pts → SAR value: [X × point_value]
  Points redeemed: [Y] pts → SAR cost: [Y × redemption_value]
  Net liability change: [+/-] SAR [Z]
  Total outstanding liability: SAR [W]
  Report to Finance Agent for inclusion in monthly P&L.
```

---

## BKG-001 · Daily Booking Operations Review

**Owner:** Ops Agent + CS Agent &nbsp;|&nbsp; **Frequency:** Every morning as part of GBL-001 Daily Briefing

**Purpose:** Ensure all pending bookings are confirmed, failed payments are resolved, and unusual booking patterns are flagged before they become customer complaints.

**Trigger:** First thing every morning. Also when payment team reports gateway issues.

### Daily Booking Queue Prompt

```
Daily booking operations review — [DATE].

BOOKING STATUS OVERVIEW: GET /api/admin/bookings/stats
  Pending: [X] | Confirmed: [Y] | Cancelled: [Z] | Refunded: [W]
  Any bookings in 'pending' status > 2 hours? — URGENT: customer paid but booking not confirmed.

PENDING RESOLUTION (highest priority):
  GET /api/admin/bookings?status=pending&sort=created_asc
  For each pending booking > 2 hours:
    booking_ref, user_email, amount_sar, hotel_id, check_in_date, payment_method
    Likely cause: GDS timeout | Payment gateway delay | Supplier API error
    Action:
      1. Check payment service: did payment capture succeed?
      2. Check Hotelbeds/Amadeus: did booking confirm at supplier?
      3. If payment captured but supplier failed: manually confirm OR refund immediately
      4. CS Agent contacts customer within 30 minutes with status update

AI BOOKING INSIGHTS:
  Run ✦ AI Booking Insights from /admin/bookings panel.
  Note: anomaly type (spike/drop/pattern), health, revenue opportunities, risk flags.
  Any anomaly flagged? Cross-reference with Fraud Agent (may be coordinated fake bookings).

CANCELLATION REVIEW:
  Cancellations in last 24h: [count] vs. 7-day average [avg]
  Cancellation spike > 2x average: investigate — may indicate pricing issue or competitor promotion
  Any cancellation with refund > SAR 10,000: Finance Agent notified.

UNUSUAL PATTERNS:
  Any single user with > 3 bookings in 24h? Flag to Fraud Agent.
  Any booking from a watchlisted email/IP? Fraud Agent immediate review.
  Any booking for Hajj dates > 6 months out with > SAR 20,000 value? Flag — may need manual confirmation.

Output: daily booking health. Flag all pending > 2h for immediate CEO/CS action.
```

---

## BKG-002 · Booking Dispute & Manual Override

**Owner:** CS Agent + Finance Agent &nbsp;|&nbsp; **Trigger:** Customer complaint about booking, duplicate booking, system error affecting confirmed booking

**Purpose:** Resolve booking disputes with clear authority levels, avoiding both over-refunding and underserving customers — especially during Hajj/Umrah where bookings carry religious significance.

### Manual Status Override Protocol

```
Booking dispute resolution — Booking ref: [REF] — [DATE].

SITUATION:
  Customer: [email] | Booking type: [hotel/flight/car]
  Issue: [duplicate_charge | not_confirmed | wrong_dates | hotel_refused | other]
  Amount: SAR [X] | Payment method: [gateway]
  Booking status: [current status]

INVESTIGATION:
  1. Pull full booking record: GET /api/admin/bookings?ref=[REF]
  2. Check payment service: did payment capture correctly? Any duplicate charge?
  3. Check supplier confirmation: Hotelbeds/Amadeus booking reference exists?
  4. Check customer history: first dispute or repeat complainer? (GET /api/admin/users?email=[email])
  5. Check fraud watchlist: is this customer or their payment method flagged?

RESOLUTION OPTIONS:
  A) Confirm booking (supplier confirmed, status stuck in pending):
     PATCH /api/admin/bookings/:id status → confirmed
     CS sends: "Your booking is confirmed. Here are your details: [details]"

  B) Rebook at same price (supplier cancelled, our fault):
     CS Agent manually books equivalent property
     Difference in price (if any): UTUBooking absorbs — do NOT charge customer
     Finance Agent notified for cost recording

  C) Full refund (supplier unavailable, system error, double charge):
     Finance Agent approval required if > SAR 1,000
     CEO approval if > SAR 10,000
     Process via payment gateway reverse/refund API
     PATCH booking status → refunded
     CS confirms refund timeline to customer (5–10 business days)

  D) Partial refund (partial service delivered):
     Finance Agent approval always required
     Document exactly what was/wasn't delivered

HAJJ/UMRAH OVERRIDE RULE:
  Any booking dispute for Makkah/Madinah during Hajj season:
  Treat as P1. CEO notified. Rebook or refund within 2 hours.
  The religious significance means ANY delay is reputationally catastrophic.

Log resolution: PATCH /api/admin/bookings/:id with admin_notes describing resolution.
```

---

## WAL-001 · Wallet & Credit Operations

**Owner:** Finance Agent + Ops Agent &nbsp;|&nbsp; **Frequency:** Weekly review + on-demand for credit requests

**Purpose:** Manage customer wallet balances, track multi-currency credits, and process authorised wallet top-ups without creating financial control risks.

**Trigger:** Customer support request for wallet credit, Finance monthly reconciliation, or unusual wallet balance movement.

### Weekly Wallet Review Prompt

```
Weekly wallet operations review — [DATE].

OVERVIEW: GET /api/admin/wallet?view=stats
  Total wallet holders: [X]
  Total balances by currency: SAR [X] | AED [Y] | USD [Z] | GBP [W] | EUR [V]
  Transactions this week (count + volume SAR): [X txns | SAR Y]
  
UNUSUAL BALANCES:
  Any single wallet balance > SAR 50,000? Flag to Finance Agent — anti-money laundering check.
  Any wallet with > 10 transactions in 24h? Flag to Fraud Agent — potential structuring pattern.
  Any wallet credited with a round number (10,000 / 50,000 / 100,000 SAR exactly) from admin?
    → Verify CEO approval exists in Finance records.

PENDING TOP-UP REQUESTS:
  Any customer service requests to credit a wallet pending approval?
  Review each against the credit authority table below.
```

### Wallet Credit Authority

| Credit Amount (SAR) | Authority | Verification Required |
|--------------------|---------|----------------------|
| < 500 | CS Agent self-approve | Confirmed booking error or documented goodwill |
| 500 – 4,999 | Finance Agent approval | Email from CS + booking ref or complaint ref |
| 5,000 – 24,999 | CEO approval | Written justification + Finance Agent sign-off |
| >= 25,000 | CEO + Board notification | Full incident report required |

### Credit Wallet Prompt (use for each approved credit)

```
Wallet credit — [DATE] — [CUSTOMER EMAIL] — SAR [AMOUNT].

Authorised by: [name + role]
Reason: [specific reason — e.g. "hotel unavailable on arrival, no alternative provided, goodwill credit per CEO approval email [DATE]"]
Booking reference: [ref] (must reference a specific transaction)

POST /api/admin/wallet/credit:
  user_id: [UUID from users table]
  currency: SAR (default — use customer's primary currency if different)
  amount: [approved amount — max 100,000 per transaction]
  note: [reason — will appear on customer's statement]

Post-credit:
  Notify customer: "SAR [X] has been credited to your UTUBooking wallet. It will be applied to your next booking."
  Finance Agent records credit in expense claims as 'goodwill_credit' category.
  Log in CS ticket system with authorisation reference.
```

---

## PRO-001 · Promo Code Lifecycle

**Owner:** Marketing Agent + Finance Agent &nbsp;|&nbsp; **Frequency:** Per campaign launch + monthly audit

**Purpose:** Manage discount promo codes — creation, activation, monitoring for abuse, and expiry — ensuring promotional spend stays within budget and codes are not exploited.

**Trigger:** Marketing campaign launch, seasonal event (Ramadan/Hajj/Eid), partner promotion, or Finance budget review.

### Code Creation Prompt

```
Promo code creation — [DATE] — [CAMPAIGN NAME].

BUSINESS CASE (required before creating):
  Campaign: [name]
  Target segment: [all users / loyalty tier X / country / corporate clients]
  Discount type: percent [X]% OFF | fixed SAR [Y] OFF
  Maximum discount value per booking (for percent codes): SAR [cap]
  Budget: maximum total redemption value = SAR [X]
    (= max_uses × average_discount_per_use — confirm with Finance Agent)
  Validity: [start_date] to [end_date]

ABUSE PREVENTION (set all of these):
  max_uses: [total across all users — never leave NULL for a public code]
  max_uses_per_user: 1 (standard) or [N] (loyalty programme only)
  minimum_booking_value: SAR [X] (prevents micro-booking abuse)
  applicable_to: all | hotel | flight | car (limit scope where possible)

POST /api/admin/promo-codes with:
  code: [UPPERCASE-ALPHANUMERIC — easy to type, memorable]
  discount_type: percent | fixed
  discount_value: [number]
  max_uses: [n]
  max_uses_per_user: [1 or n]
  valid_from: [ISO date]
  valid_until: [ISO date]
  minimum_order_value: [SAR — recommended minimum SAR 300]
  applicable_to: all | hotel | flight | car
  description: [internal note — campaign name + authorised by]

Finance Agent approval required for any code with potential total redemption > SAR 10,000.
CEO approval for codes with potential redemption > SAR 50,000 (e.g. Ramadan mass campaign).
NEVER create a code with max_uses = NULL — this is an open-ended liability.
```

### Monthly Promo Code Audit

```
Monthly promo code audit — [MONTH YEAR].

GET /api/admin/promo-codes
For each active code:
  name | discount_type | discount_value | used / max_uses | expires_at | total_redemption_SAR

FLAGS TO INVESTIGATE:
  [ ] Any code with used_count within 10% of max_uses — approaching limit
  [ ] Any code being used at > 5x expected rate — possible leak or viral sharing
  [ ] Any code past valid_until still showing active=true — deactivate immediately
  [ ] Any code with max_uses_per_user > 1 — verify this was intentional, not an error
  [ ] Any code that has never been used after 14 days of being live — check if it was announced

CODES TO RETIRE:
  Past valid_until: PATCH active → false (or DELETE if zero redemptions)
  Campaign ended: PATCH active → false

ABUSE DETECTION:
  Any promo code appearing in fraud_cases? Flag to Fraud Agent.
  Any single user who has used > 3 different promo codes in 30 days? Monitor — may be testing codes.

Finance Agent briefing: total promotional spend this month (sum of all redemptions SAR value).
Save audit: docs/marketing/promo-audits/[YYYY-MM]-promo-audit.md
```

---

# SECTION 9 — Analytics & BI SOPs

---

## ANA-001 · Weekly KPI Dashboard Review

**Owner:** Analytics Agent + CEO &nbsp;|&nbsp; **Frequency:** Every Monday morning, part of GBL-002 Weekly Report

**Purpose:** Surface which KPIs are on-target vs. off-target, trigger owner accountability, and update current_value in the database so alerts fire correctly.

**Trigger:** Automatically included in the Monday morning GBL-002 briefing. Also run ad-hoc any time a metric has a suspected data issue.

### Step 1 — Weekly KPI Pulse Prompt

```
Weekly KPI dashboard review — week ending [DATE].

OVERVIEW: GET /api/admin/analytics/stats
  KPIs on-target: [X] | Off-target: [Y] | Active alerts: [Z] | Reports: [N]

KPI DETAILS: GET /api/admin/analytics/kpis
For each KPI, report: name | target | current | unit | period | owner | hit_pct (current/target * 100)

TRAFFIC LIGHT STATUS:
  🔴 OFF TARGET (< 90% of target for positive metrics, > 110% for cost metrics like hours/ms):
     — [metric name]: target [X], actual [Y], gap [Z]
     — Owner: [name]. Recommended action: [1 sentence]

  🟡 AT RISK (90–99% of target for positive; 100–110% for cost):
     — [metric name]: tracking [X]% of target.

  🟢 ON TARGET (>= 100% of target):
     — [list names only — no detail needed unless CEO requests]

ALERT STATUS: GET /api/admin/analytics/alerts
  Any active alerts that fired this week (last_fired_at >= 7 days ago)?
  Alert: [name] | KPI: [name] | Condition: [below_target / above_threshold] | Fired: [date]
  Action: notify KPI owner.

UPDATE CURRENT VALUES (run after pulling actuals from Stripe/DB):
  PATCH /api/admin/analytics/kpis/:id with current_value = [actual] for each metric updated this week.

Output: KPI health table (all metrics). Flag any metric > 20% below target for CEO escalation.
Save to: Notion > Analytics > Weekly KPI > [DATE].
```

### Core KPI Definitions

| KPI | Target | Owner | Data Source |
|-----|--------|-------|------------|
| Monthly Revenue | SAR 5,000,000 | Finance | Stripe + DB bookings |
| Booking Conversion Rate | 3.2% | Products | GA4 / booking funnel |
| Monthly Active Users | 50,000 | Products | Auth service DAU logs |
| Hotel Booking Share | 65% | Sales | DB booking.type |
| Flight Booking Share | 25% | Sales | DB booking.type |
| Support Ticket Resolution | < 24 hours | Ops | CS ticket DB |
| AI Pricing Acceptance Rate | 70% | Products | Pricing service logs |
| Net Promoter Score | 50 | Customer Success | NPS survey tool |

---

## ANA-002 · Monthly BI Report & Alert Management

**Owner:** Analytics Agent &nbsp;|&nbsp; **Frequency:** 1st of every month + on-demand for board reports

**Purpose:** Generate the full monthly business intelligence report, run all scheduled reports, review and tune alert thresholds, and produce the data pack for GBL-003 Monthly Close.

### Monthly BI Report Prompt

```
Monthly BI report — [MONTH YEAR].

SECTION 1 — REVENUE PERFORMANCE
  Total revenue SAR [MONTH]: [X] — vs. target [Y] — vs. same month last year [Z]
  Revenue by market: KSA | UAE | Gulf | EU | US | CA | LATAM | APAC — SAR each
  Revenue by product: Hotels [%] | Flights [%] | Cars [%]
  Average booking value SAR: this month vs. 3-month average

SECTION 2 — BOOKINGS & CONVERSION
  Total bookings: [X] — vs. target — vs. last month
  Funnel: Search → Property View → Add to Cart → Booking Started → Confirmed
  Conversion rate at each step. Biggest drop-off step?
  Mobile vs. desktop conversion split.

SECTION 3 — USER GROWTH
  New registrations: [X] | Returning users: [X] | Monthly Active Users: [X]
  Top acquisition channels: [Organic / Paid / Direct / Referral / Affiliate]
  User retention: did users who booked last month return this month?

SECTION 4 — OPERATIONS
  Average support ticket resolution: [X] hours (target < 24h)
  Open tickets > 48h: [count] — flag if > 20
  AI pricing acceptance rate: [X]% (target 70%)
  API error rates: Hotelbeds, Amadeus, Booking.com — any > 1%?

SECTION 5 — BI SYSTEM HEALTH
  Reports scheduled but not run in 30 days: list (GET /api/admin/analytics/reports)
  Alerts that have never fired (condition may be too loose): list
  Alerts that fire every day (condition may be too tight): list — tune threshold

Save full report: Notion > Analytics > Monthly Reports > [YYYY-MM].
Share with CEO, Finance Agent, Products Agent.
```

### Alert Management

```
BI alert review — [DATE].

GET /api/admin/analytics/alerts
For each alert:
  - Name, KPI, condition, threshold, last_fired_at
  - Frequency assessment: firing > 3x/week? Threshold too tight — relax.
  - Never fired in 90 days? Condition may be too loose or metric is always green — review.

For any new alert needed (identified from this week's KPI review):
  POST /api/admin/analytics/alerts:
    name: [descriptive]
    kpi_target_id: [UUID from bi_kpi_targets]
    condition: below_target | above_target | below_threshold | above_threshold
    threshold: [numeric — null if using target value]
    notify_email: [owner email]
    active: true
```

---

# SECTION 9 — Business Development SOPs

---

## BIZ-001 · Weekly Partner Pipeline Review

**Owner:** BizDev Agent + CEO &nbsp;|&nbsp; **Frequency:** Every Monday, after GBL-002 Weekly Report

**Purpose:** Advance the strategic partner pipeline — move prospects to signed agreements, catch stalled deals, and ensure no opportunity is > 14 days without an activity touch.

**Trigger:** Every Monday. Also triggered when a new partner is added or a deal changes stage.

### Step 1 — Pipeline Briefing Prompt

```
BizDev weekly pipeline review — week ending [DATE].

OVERVIEW: GET /api/admin/bizdev/stats
  Partners by status: prospect | contacted | negotiating | signed | live | paused | churned
  Total active agreement value (SAR): [X]
  Agreements expiring in 90 days: [count] — flag list

PIPELINE MOVEMENT:
  Partners in 'prospect' status with no activity in > 7 days:
    GET /api/admin/bizdev/partners?status=prospect
    For each: last_contacted_at — if > 7 days: draft outreach message
    Outreach template:
    "Hi [name], following up on our conversation about [partnership type] with UTUBooking.
     We're currently signing [X] partners in [their market] and wanted to confirm your interest.
     Happy to share our partner deck. Best, [CEO name]"

  Partners in 'negotiating' > 14 days with no activity:
    Flag to CEO — risk of deal going cold. Action: CEO to call or escalate.

  Partners moved to 'signed' this week: celebrate + trigger onboarding (SLS-002 process).

AGREEMENT EXPIRY PIPELINE:
  GET /api/admin/bizdev/agreements/expiring?days=90
  For each expiring agreement:
    Renew / renegotiate / let expire?
    If renew: initiate renewal conversation now. Do not wait for expiry.

MARKET EXPANSION STATUS:
  GET /api/admin/bizdev/markets?status=researching,pilot
  Any market where status should advance? (e.g. pilot → launched, target → researching)
  Any critical-priority market still in 'target' status > 30 days? Escalate to CEO.

Output: pipeline summary table + action items for CEO.
```

### Step 2 — Activity Logging Rule

Every interaction with a partner MUST be logged immediately via:
`POST /api/admin/bizdev/partners/:id/activities`

| Activity Type | Log within | Required fields |
|--------------|-----------|----------------|
| call | 1 hour | summary (outcome + next step) |
| email | Same day | summary (what was sent/received) |
| demo | 1 hour | summary (feedback, objections, interest level) |
| meeting | 1 hour | summary + any commitments made |
| proposal | Same day | summary (proposal value, timeline, decision maker) |
| signed | Immediately | summary (deal terms, start date, integration timeline) |

> Missing activity logs = blind pipeline. Stale `last_contacted_at` = CEO sees a worse picture than reality.

---

## BIZ-002 · New Market Entry Assessment

**Owner:** BizDev Agent + CEO + Legal Agent &nbsp;|&nbsp; **Frequency:** Per new market being considered

**Purpose:** Before investing in a new country launch, produce a structured go/no-go assessment covering regulatory, payment, partner, and technical requirements.

**Trigger:** CEO identifies a new market opportunity, or a partner from an unlaunched market approaches UTUBooking.

### Market Assessment Prompt

```
New market entry assessment — [COUNTRY NAME] ([ISO CODE]).

MARKET OVERVIEW:
  Population: [X]M | Internet users: [X]M | Outbound travel market size: USD [X]B/year
  Muslim population %: [X] (relevant for Hajj/Umrah opportunity)
  Top competing platforms in this market: [list]
  Our current traffic from this country (Google Analytics): [X] sessions/month

REGULATORY & COMPLIANCE:
  [ ] Is there a data localisation law? (data must stay in-country)
      If yes: new AWS region or DB shard required — brief Dev Agent.
  [ ] Are there travel agency licensing requirements to operate legally?
      If yes: Legal Agent to assess timeline and cost.
  [ ] Currency restrictions: can we freely remit revenue in [local currency] → SAR/USD?
  [ ] Is this country on any sanctions list? (OFAC, EU, UN, UK HMT)
      If yes: STOP — do not proceed without OFAC/legal counsel.

PAYMENT:
  Which local payment methods are dominant? (e.g. mobile money, bank transfer, card)?
  Is there a suitable gateway already in PaymentRouter.ts?
  If not: what is the integration timeline for a new gateway? (Dev Agent estimate needed)

CONTENT & UX:
  Primary language(s): [list]
  Does our i18n system cover this locale? (check 15 locales in backend/CLAUDE.md)
  RTL required? [yes/no]
  Currency: [code] | Is it in our FX rate feed?

PARTNER LANDSCAPE:
  Are there local travel agencies, OTAs, or B2B partners we should approach first?
  Any existing UTUBooking partner (from bizdev_partners) already operating in this market?

COST ESTIMATE (brief):
  Dev effort: [S/M/L based on payment + i18n gaps]
  Legal/compliance: [S/M/L based on regulatory requirements]
  Marketing launch budget: [estimate based on comparable market launches]

RECOMMENDATION: GO | NO-GO | INVESTIGATE FURTHER
  Reason: [2–3 sentences]
  If GO: propose target launch date + assign owner in bizdev_markets table.
    PATCH /api/admin/bizdev/markets/:id status → researching, priority → [critical/high/medium]

Save assessment: docs/bizdev/market-assessments/[ISO-CODE]-[DATE].md
CEO sign-off required before any spend or legal engagement.
```

---

## BIZ-003 · Partnership Agreement Lifecycle

**Owner:** BizDev Agent + Legal Agent &nbsp;|&nbsp; **Trigger:** New partnership agreement to be created, amended, or renewed

**Purpose:** Ensure every partnership agreement is properly drafted, stored, and tracked — with correct commission, term, and renewal flags.

### Agreement Creation Prompt

```
Partnership agreement setup — [PARTNER NAME] — [DATE].

PARTNER RECORD: GET /api/admin/bizdev/partners?search=[partner name]
  Confirm partner exists and status = 'signed' or 'live'.
  If partner is 'prospect' or 'negotiating': do not create agreement yet.

AGREEMENT DETAILS:
  Title: [e.g. "FlySaudi Revenue Share Agreement 2026–2027"]
  Type: revenue_share | white_label | distribution | referral | api_integration | other
  Value (SAR): [total contract value or estimated annual value]
  Commission %: [X]% — what does the partner earn per booking?
  Start date: [YYYY-MM-DD]
  End date: [YYYY-MM-DD] — minimum 12 months; open-ended = 2099-12-31
  Signed by: [CEO name]
  File URL: [link to executed PDF in secure document store]

LEGAL REVIEW:
  Commission > 10% or value > SAR 100,000: Legal Agent must review agreement draft before signing.
  White-label or exclusivity clause: CEO + Legal review mandatory — flag to board if exclusivity.
  Standard referral/revenue share < SAR 50,000: BizDev Agent review sufficient.

POST /api/admin/bizdev/agreements with all fields above.
PATCH partner status → 'live' after agreement is signed and integration is complete.

CALENDAR REMINDER:
  90 days before end_date: renewal review (BIZ-003 renewal trigger)
  30 days before end_date: final notice — renew or serve termination notice per agreement terms

Save: docs/bizdev/agreements/[PARTNER-ISO]-[TYPE]-[DATE].md
```

---

# SECTION 10 — Advertising Department SOPs

---

## ADV-001 · Advertising Enquiry Response

**Owner:** BizDev Agent (handles advertising) + CEO &nbsp;|&nbsp; **Frequency:** Within 4 hours of new enquiry

**Purpose:** Every inbound advertising enquiry from a tourism board, airline, hotel, or brand is a potential revenue opportunity. None should sit in `status = 'new'` for > 4 hours during business hours.

**Trigger:** New entry in `advertising_enquiries` with `status = 'new'`. Check daily as part of GBL-001 morning briefing.

### Daily Advertising Queue Check (part of GBL-001)

```
Advertising enquiry queue — [DATE].

GET /api/admin/advertising/stats
  New (unactioned) enquiries: [X] | Contacted: [Y] | Qualified: [Z] | Proposals sent: [N]
  Conversion rate (won / total): [X]%

NEW ENQUIRIES (status = 'new'):
GET /api/admin/advertising/enquiries?status=new
For each new enquiry:
  Company: [company_name] | Type: [company_type] | Region: [region]
  Goal: [goal] | Budget: [budget_range]
  Message: [first 100 chars]

For each:
  1. Is this a genuine B2B advertiser or a spam/irrelevant submission?
     If spam: PATCH status → archived, admin_notes: 'spam/irrelevant'
  2. If genuine: PATCH status → contacted, assigned_to: [CEO or BD team]
     Draft initial response email for CEO review:

     "Dear [full_name],
      Thank you for your interest in advertising with UTUBooking.com — the leading travel
      platform for Gulf and Muslim-world travellers.

      We serve [X]M+ searches/month across KSA, UAE, and 25 markets, with particular strength
      in Hajj, Umrah, and family travel segments — exactly the audience [company_name] targets.

      I'd love to schedule a 20-minute call to understand your [goal] objectives and share
      our media kit. Are you available [DAY] or [DAY] this week?

      Best regards,
      [CEO name] | UTUBooking.com"

     IMPORTANT: CEO must review and approve before sending. NEVER auto-send.
```

---

## ADV-002 · Advertising Proposal & Media Kit

**Owner:** BizDev Agent + CEO &nbsp;|&nbsp; **Trigger:** Enquiry qualified (status = 'qualified')

**Purpose:** Move qualified advertisers from interest to a signed deal by producing a tailored media kit and proposal within 48 hours of qualification call.

### Proposal Generation Prompt

```
Advertising proposal — [COMPANY NAME] — [DATE].

ADVERTISER PROFILE (from enquiry record):
  Company: [name] | Type: [company_type] | Region: [target region]
  Goal: [performance_marketing / brand_awareness / lead_generation / etc.]
  Budget range: [under_10k / 10k_50k / 50k_200k / over_200k / lets_discuss]
  Notes from qualification call: [admin_notes from enquiry record]

MEDIA KIT CONTENT — tailor to their goal:
  OUR AUDIENCE:
    Monthly searches: [X]M | Registered users: [X]
    KSA users: [X]% | UAE: [X]% | Gulf region: [X]%
    Hajj/Umrah intent segment: [X]% of hotel searches are Makkah/Madinah
    Demographics: 65% male, 35–55 age group primary, family travel peak Eid/summer

  AD FORMATS AVAILABLE:
    Search placement: top-of-results for destination keywords
    Hotel detail page: banner on property pages matching [their target destination]
    Email: inclusion in our booking confirmation + pre-trip emails (opt-in list, [X]K subscribers)
    Push notification: targeted to users who searched [destination/category]
    Homepage banner: homepage hero rotation — limited inventory (2 slots/month)

  PACKAGES (draft for this prospect):
    Package A — [GOAL-aligned name]: [format + reach + duration] — SAR [price]
    Package B — [GOAL-aligned name]: [format + reach + duration] — SAR [price]
    Package C — Custom campaign: brief us on your KPIs, we'll design the plan

  MEASUREMENT:
    All campaigns tracked: impressions, clicks, CTR, bookings attributed (last-click)
    Weekly performance report included. Campaign pause/optimise available mid-flight.

PATCH enquiry status → 'proposal_sent' after CEO approves and proposal is emailed.
If deal closes: PATCH status → 'won'. Create revenue entry in Finance (campaign billing).
If lost: PATCH status → 'lost', admin_notes: [reason — useful for future pitch improvements]

Save proposal draft: docs/advertising/proposals/[COMPANY]-[DATE].md — CEO approval required before sending.
```

---

# SECTION 11 — Affiliates SOPs

---

## AFF-001 · Affiliate Application Review

**Owner:** BizDev Agent (handles affiliates) + CEO for approvals &nbsp;|&nbsp; **Frequency:** Weekly (every Monday) + within 48h of any application

**Purpose:** Approve quality affiliates (travel bloggers, YouTubers, Umrah content creators) while rejecting low-quality or brand-unsafe applicants. Every pending application > 48 hours is a missed partner opportunity.

### Weekly Application Review Prompt

```
Affiliate application review — [DATE].

OVERVIEW: GET /api/admin/affiliates/stats
  Pending applications: [X] | Active partners: [Y]
  Total earned SAR (unpaid): [Z] | Total paid SAR (all time): [W]

PENDING APPLICATIONS: GET /api/admin/affiliates/applications?status=pending
For each application:
  Name: [name] | Platform: [platform] | Audience: [audience_size]
  Website: [URL] | Message: [summary]

QUALIFICATION CRITERIA:
  APPROVE if:
    [ ] Platform is travel, Islamic lifestyle, Hajj/Umrah, family, or Gulf culture focused
    [ ] Audience size >= 1k (10k+ for Elite tier consideration)
    [ ] Website/social profile is live, recent content (< 30 days), professional tone
    [ ] No brand-unsafe content (political controversy, competitor exclusivity)
  REJECT if:
    [ ] Platform is unrelated (gaming, cooking, news with no travel angle)
    [ ] Audience < 500 OR fake followers suspected (engagement rate < 1%)
    [ ] Website/profile inactive > 90 days
    [ ] Applicant is from a sanctioned country

ACTIONS:
  Approved: POST /api/admin/affiliates/applications/:id/approve
    This auto-creates an affiliate_partners record. Set initial tier based on audience:
    over_100k → elite (commission: 6%) | 10k_100k → pro (5%) | under_10k → starter (3%)

  Rejected: PATCH /api/admin/affiliates/applications/:id
    status: rejected | admin_notes: [brief, respectful reason — may be visible to applicant]

WELCOME EMAIL (for each approved partner — draft for CEO/team review):
  "Welcome to the UTUBooking Affiliate Programme, [name]!
   Your unique referral code is: [referral_code]
   Commission rate: [X]% per confirmed booking
   Payout: monthly on the 1st, minimum SAR 200 balance
   Affiliate dashboard: [link]
   Media assets (banners, logos): [link to assets folder]
   Questions: affiliates@utubooking.com"

  NEVER send welcome email without confirming referral_code is active in DB.
```

---

## AFF-002 · Monthly Affiliate Payout Processing

**Owner:** Finance Agent + BizDev Agent &nbsp;|&nbsp; **Frequency:** 1st of every month

**Purpose:** Calculate, approve, and pay all affiliate commissions earned in the previous month. Minimum payout threshold: SAR 200. All payouts require Finance Agent confirmation before transfer.

### Payout Processing Prompt

```
Monthly affiliate payout run — [MONTH YEAR] — processing on [DATE].

STEP 1 — CALCULATE EARNED COMMISSIONS:
  GET /api/admin/affiliates/partners?status=active
  For each active partner:
    Total bookings attributed to their referral_code in [MONTH]: [count]
    Total booking value SAR: [X]
    Commission earned SAR: booking_value * (commission_pct / 100)
    Current unpaid balance: total_earned_sar - total_paid_sar

  Partners with unpaid balance >= SAR 200: eligible for payout this cycle
  Partners with balance < SAR 200: carry forward to next month (no action)

STEP 2 — CREATE PAYOUT RECORDS:
  For each eligible partner: POST /api/admin/affiliates/payouts
    partner_id, partner_name, amount_sar (= unpaid balance), period_start, period_end,
    bookings_count, status: pending

STEP 3 — FINANCE AGENT APPROVAL:
  Finance Agent reviews total payout liability this month: SAR [X]
  Confirm within budget. Flag to CEO if total > SAR 50,000 (unusual spike — check for fraud).
  Any partner earning > SAR 5,000 in a single month: manual review of attributed bookings
    (verify referral codes were not abused or self-referred).

STEP 4 — PROCESS PAYMENTS:
  Once Finance approves: PATCH payout status → 'processing'
  Transfer via partner's preferred method:
    bank_transfer: use Finance team bank transfer process (NET banking)
    paypal: via PayPal batch payout
    wise: via Wise batch transfer
    stc_pay: via STC Pay portal

  After transfer confirmed: PATCH payout status → 'paid', payment_ref = [transfer ref], paid_at = [timestamp]
  PATCH partner total_paid_sar += amount_paid

STEP 5 — PAYOUT CONFIRMATION EMAIL (draft for team review):
  "Hi [name], your UTUBooking affiliate commission for [MONTH] has been processed.
   Amount: SAR [X] | Bookings: [Y] | Method: [payout_method]
   Reference: [payment_ref]
   Thank you for promoting UTUBooking to your audience!
   affiliates@utubooking.com"

Save payout summary: docs/affiliates/payouts/[YYYY-MM]-payout-run.md
```

### Affiliate Fraud Detection

Before approving any payout, run this check:

```
Affiliate payout fraud check — [PARTNER NAME] — [MONTH].

Red flags — pause payout and investigate if any of the following:
  [ ] Booking conversion rate > 15% (industry average 1–3%)
      — likely self-referring or sharing code with close network for kickback
  [ ] All bookings from a single IP or device fingerprint
  [ ] Bookings all for same hotel/date (coordinated fake bookings)
  [ ] Partner joined < 30 days ago and already earned > SAR 1,000
      — accelerated earning is unusual; verify bookings are genuine

If fraud suspected: pause payout (status: 'pending'), flag to Fraud Agent (open a fraud case),
PATCH partner status → 'paused' pending investigation.
Do NOT accuse partner externally until investigation complete.
```

---

# SECTION 12 — Corporate Travel (B2B) SOPs

---

## CORP-001 · Corporate Account Onboarding

**Owner:** Sales Agent + CEO &nbsp;|&nbsp; **Frequency:** Per new corporate account signed

**Purpose:** Set up every new corporate travel client (government ministry, oil & gas company, bank, healthcare group) with the correct travel policy, billing structure, and portal access.

**Trigger:** Enquiry in `corporate_enquiries` advances to `status = 'won'` or a direct corporate account is created.

### Onboarding Prompt

```
Corporate account onboarding — [COMPANY NAME] — [DATE].

STEP 1 — CREATE ACCOUNT RECORD:
  POST /api/admin/corporate/accounts:
    company_name: [full legal name]
    industry: government | finance | oil_gas | tech | healthcare | education | ngo | retail | hospitality | other
    country: [ISO code]
    tier: enterprise (> SAR 500K/year travel) | premium (SAR 100K–500K) | standard (< SAR 100K)
    status: active
    annual_travel_budget_sar: [as agreed in contract]
    max_flight_class: first | business | premium_economy | economy — as per company travel policy
    max_hotel_stars: [1–5] — as per policy
    per_diem_sar: [daily allowance — if applicable]
    preferred_airlines: [list — e.g. ["Saudia","flyadeal"]]
    advance_booking_days: [minimum days notice required — typically 14]
    owner: [CEO or account manager name]
    contract_start: [YYYY-MM-DD]
    contract_end: [YYYY-MM-DD]
    discount_pct: [X]% — negotiated rate discount off public prices
    notes: [key commercial terms]

STEP 2 — ADD CONTACTS:
  POST /api/admin/corporate/accounts/:id/contacts for each key contact:
    Travel Manager (role: travel_manager) — primary contact for booking queries
    Finance/AP contact (role: finance) — for invoicing
    Decision maker (role: decision_maker) — for contract renewal

STEP 3 — PORTAL ACTIVATION (UTUBooking for Business):
  POST /api/admin/corporate/accounts/:id/activate
  This creates an auth service user (portal_user_id set) and sends login credentials.
  Travel manager can now log in and book directly within their travel policy limits.
  IMPORTANT: Do NOT activate portal until account record is complete and contract is signed.

STEP 4 — BILLING SETUP:
  Notify Finance Agent: new corporate account [name], tier [X], estimated annual value SAR [Y].
  Invoice cycle: monthly in arrears (standard) or per-booking (enterprise option).
  PO requirement: does this client require a PO number on every invoice?

STEP 5 — WELCOME COMMUNICATION (draft for CEO review):
  "Dear [travel_manager_name],
   Welcome to UTUBooking for Business — your dedicated corporate travel platform.
   Your portal is now active. Login: [email] | Temporary password: [sent separately]
   Travel policy configured: [max_flight_class] class | [max_hotel_stars]-star max | [advance_booking_days] days notice
   Preferred airlines: [list]
   Your account manager: [CEO/AM name] — [email] — [phone]
   For queries: corporate@utubooking.com"
```

---

## CORP-002 · Corporate Enquiry Response

**Owner:** Sales Agent + CEO &nbsp;|&nbsp; **Frequency:** Within 4 hours of new enquiry during business hours

**Purpose:** Inbound corporate travel enquiries represent the highest-value customer segment. A government ministry or oil & gas company could represent SAR 500K+ in annual bookings. No enquiry should sit unactioned.

**Trigger:** New entry in `corporate_enquiries` with `status = 'new'`. Checked as part of GBL-001 morning briefing.

### Enquiry Response Prompt

```
Corporate travel enquiry response — [DATE].

NEW ENQUIRIES: GET /api/admin/corporate/enquiries?status=new
For each enquiry:
  Company: [company_name] | Contact: [contact_name] | Email: [email]
  Travellers: [traveler_count] | Destinations: [destinations] | Dates: [travel_dates]
  Notes: [message]

QUALIFICATION:
  Employee count / travellers: [X]
  Annual travel budget estimate: [basis — e.g. [traveler_count] * 12 trips * SAR 3,000 avg = SAR X]
  Industry: [industry] — government/oil_gas/finance = highest priority (often have mandated local platforms)
  Is this company already in corporate_accounts? Search first — may be an existing account re-enquiring.

RESPONSE DRAFT (for CEO review before sending):
  "Dear [contact_name],
   Thank you for reaching out to UTUBooking for Business. We specialise in corporate travel
   management for leading organisations across the Gulf region, with deep expertise in
   government, oil & gas, and financial services travel programmes.

   For [company_name]'s team of [traveler_count] travellers, we can offer:
   - Negotiated hotel rates in Riyadh, Jeddah, Makkah, Dubai, and key business destinations
   - Centralised booking with travel policy controls (class caps, approval workflows, per diems)
   - Monthly consolidated invoicing with full expense reporting
   - Dedicated account manager + 24/7 support

   I'd like to understand your current travel spend and challenges in a 30-minute discovery call.
   Are you available [DAY] or [DAY] this week?

   Best regards,
   [CEO name] | Corporate Travel, UTUBooking.com | [phone]"

PATCH enquiry status → 'contacted' after CEO approves and email is sent.
Create account record (status: prospect) if company not already in corporate_accounts.
Log first activity immediately after call/meeting.
```

### Corporate Account Health Review (Monthly, part of GBL-002)

```
Corporate account health review — [MONTH YEAR].

GET /api/admin/corporate/accounts?status=active
For each active account:
  Total bookings this month: [X] | Total spend SAR: [Y]
  vs. monthly budget run rate (annual_travel_budget_sar / 12): on track / under / over?
  Last activity date: [last_activity_at] — any account with no bookings in 30 days?
    → check-in call required — are they booking via another channel?

Contracts expiring in 90 days:
  For each: renewal discussion to be initiated by account manager.
  Flag to CEO if enterprise tier account is at risk of churn.

New enquiries this month: [count] | Converted to accounts: [count] | Conversion rate: [X]%

Output: corporate account health table. Flag any account > 30 days inactive to CEO.
```

---

## CRM Department SOPs

---

## CRM-001 · Daily Deal Pipeline Review

**Owner:** Sales Agent + CEO &nbsp;|&nbsp; **Frequency:** Every morning (part of GBL-001)

**Purpose:** Keep the B2B deal pipeline clean and moving — hotel partnerships, airline deals, white-label resellers, and investor leads. Stale deals lose momentum and represent lost revenue.

**Deal Types:** `hotel_partner` | `b2b_whitelabel` | `airline` | `investor` | `other`
**Pipeline Stages:** `lead` → `qualified` → `demo` → `proposal` → `negotiation` → `won` | `lost`

### Daily CRM Review Prompt

```
CRM pipeline review — [DATE].

STATS: GET /api/admin/crm/stats
  Review: pipeline_value_total, deals by stage, overdue count.

OVERDUE DEALS: GET /api/admin/crm/overdue
  For each deal with next_action_date in the past:
    Deal: [title] | Stage: [stage] | Type: [deal_type] | Owner: [deal_owner]
    Overdue by: [X days]
    Required action: log activity + update next_action_date + advance stage if appropriate.

PIPELINE SCAN: GET /api/admin/crm/deals?stage=proposal
  Any proposal-stage deal with no activity in 7+ days?
    → Follow-up required. PATCH deal: log follow_up activity.
    → If no response after 2 follow-ups, discuss with CEO: advance to negotiation or move to lost.

NEW LEADS: GET /api/admin/crm/deals?stage=lead
  For each new lead (created_at within last 48h):
    Qualify: is the partner type a good fit? (hotel_partner = inventory expansion; b2b_whitelabel = reseller revenue; investor = funding)
    Action: PATCH stage → 'qualified' if fit confirmed, log first outreach activity.

INVESTOR PIPELINE: GET /api/admin/crm/deals?type=investor
  Status of each Series B / investor conversation:
    CEO reviews personally — flag any investor moving to negotiation stage.

OUTPUT: Pipeline health summary. List of deals requiring action today.
```

### Stage Advancement Rules

| From | To | Trigger |
|------|-----|---------|
| lead | qualified | Partner confirmed relevant, initial contact made |
| qualified | demo | Demo/call scheduled |
| demo | proposal | Strong interest shown — proposal requested |
| proposal | negotiation | Counter-offer or term discussion started |
| negotiation | won | Contract signed |
| any | lost | Partner declines, goes silent after 3 follow-ups, or not a fit |

**Rule:** Any deal in `proposal` or `negotiation` stage for > 14 days with no activity = CEO review required.

---

## CRM-002 · Hotel Partner Pipeline Review

**Owner:** Sales Agent + Revenue Agent &nbsp;|&nbsp; **Frequency:** Weekly (Mondays, as part of GBL-002)

**Purpose:** Grow UTUBooking's direct hotel partner inventory — especially Makkah and Madinah. Direct partnerships mean better rates, higher margins, and Hajj allocation guarantees that API suppliers cannot provide.

**Priority Tiers:**
- Priority 1: Makkah and Madinah 5-star hotels within 500m of Haram — highest value
- Priority 2: Key Gulf business destinations (Riyadh, Jeddah CBD, Dubai, Abu Dhabi)
- Priority 3: All other cities and markets

### Weekly Hotel Partner Review Prompt

```
Hotel partner pipeline review — [DATE].

GET /api/admin/crm/hotel-partners
  Filter: status = 'prospect' OR last_contacted_at is null OR last_contacted_at < [30 days ago]

For each hotel NOT yet contacted in 30 days:
  Hotel: [hotel_name] | City: [city] | Stars: [stars]★ | Priority: [priority]
  Distance to Haram: [distance_haram_m]m (Makkah/Madinah only)
  Status: [outreach_status] | Last contacted: [last_contacted_at]

ACTION for Priority 1 hotels (Makkah/Madinah 5★, distance < 300m):
  Draft outreach email in Arabic + English for CEO approval.
  Subject: "UTUBooking — Hajj & Umrah Direct Partnership Opportunity"
  Include: UTUBooking Hajj traffic volume, expected booking volume during Hajj season, revenue potential.
  PATCH hotel-partner: log outreach activity after CEO approves email.

ACTION for Priority 2 hotels:
  Draft brief English outreach.
  Log activity after send.

PIPELINE METRICS:
  Total hotel partners: [count] | Signed contracts: [signed] | Prospects: [prospect]
  Makkah 5★ direct signed: [X] — target: minimum 5 per star tier
  Madinah 5★ direct signed: [X] — target: minimum 3 per star tier

OUTPUT: Hotel partner pipeline summary. List of outreach actions for the week.
Escalate to CEO: any Priority 1 Makkah hotel not yet in active negotiation by April (Hajj season).
```

---

## Ops Department SOPs

---

## OPS-001 · Daily Incident Management

**Owner:** Ops Agent + Dev Agent &nbsp;|&nbsp; **Frequency:** Every morning + on-demand when new incident created

**Purpose:** Track and resolve platform incidents. Distinguish internal Ops incidents (service degradations, minor issues) from EMG emergencies (full outages, data breaches). Ops incidents are managed here; true emergencies escalate to EMG-001/EMG-002.

**Severity Levels:**
| Severity | Definition | SLA to Resolve | Workflow |
|----------|-----------|----------------|---------|
| critical | Service fully down or data integrity at risk | < 1 hour | Auto-launches incident response workflow; CEO notified |
| high | Major feature broken, significant user impact | < 4 hours | Auto-launches workflow; Dev Agent engaged |
| medium | Degraded performance, minor feature broken | < 24 hours | Dev Agent reviews next working day |
| low | Cosmetic issue, minor inconvenience | < 72 hours | Backlog — Dev Agent next sprint |

### Morning Incident Review Prompt

```
Ops incident review — [DATE].

STATS: GET /api/admin/ops/stats
  Open incidents: [total] | Critical: [X] | High: [X] | SLA-breaching: [X]
  Open tickets: [total] | Urgent: [X] | High: [X]

CRITICAL/HIGH INCIDENTS (action required NOW):
  GET /api/admin/ops/incidents?status=open&severity=critical
  GET /api/admin/ops/incidents?status=open&severity=high
  For each:
    Incident: [title] | Service: [service] | Impact: [impact]
    Open since: [started_at] — [X hours] ago
    Action: PATCH status → 'investigating' if not already.
    Notify Dev Agent: "Critical/High incident open — [title] — [X hours] elapsed."
    If critical AND open > 1 hour: escalate to EMG-001 (platform outage SOP).

MEDIUM INCIDENTS:
  GET /api/admin/ops/incidents?status=open&severity=medium
  Review: any new medium incidents from the past 24h?
  Assign to Dev Agent for next working session.

RESOLVE/CLOSE:
  GET /api/admin/ops/incidents?status=investigating
  For each investigating:
    Has the underlying issue been fixed? Confirm with Dev Agent.
    If fixed: PATCH status → 'resolved', set resolved_at = now().
    After 24h in resolved: PATCH → 'closed'.

OUTPUT: Incident summary table. Any critical/high incidents escalated to CEO immediately.
```

---

## OPS-002 · Support Ticket Queue Management

**Owner:** Ops Agent + CS Agent &nbsp;|&nbsp; **Frequency:** Every morning + hourly for urgent tickets

**Purpose:** The internal Ops support ticket queue captures platform-level issues reported by staff or detected by monitoring — distinct from customer-facing CS tickets. These are operational problems: booking system errors, payment processing failures, technical account issues.

**Ticket Categories:** `booking` | `payment` | `technical` | `account` | `refund` | `other`

**Priority SLAs:**
| Priority | Response | Resolution |
|----------|----------|-----------|
| urgent | < 30 min | < 2 hours |
| high | < 2 hours | < 8 hours |
| medium | < 4 hours | < 24 hours |
| low | < 24 hours | < 72 hours |

### Ticket Queue Prompt

```
Ops support ticket queue — [DATE].

GET /api/admin/ops/tickets?status=open&priority=urgent
  For each urgent ticket:
    Ticket: [title] | Category: [category]
    Open since: [created_at] — [X minutes] ago — SLA: 30 min response
    Action: PATCH status → 'in_progress', set assignee.
    Engage Dev Agent (technical/payment) or CS Agent (booking/account/refund) immediately.

GET /api/admin/ops/tickets?status=open&priority=high
  For each high ticket:
    Open since: [created_at] — [X hours] ago — SLA: 2h response
    Assign if unassigned. Update status → 'in_progress'.

OVERDUE REVIEW:
  Any ticket where:
    priority = 'urgent' AND created > 30 min ago AND status = 'open' → SLA BREACH — CEO notified
    priority = 'high' AND created > 2h ago AND status = 'open' → SLA breach risk — escalate

RESOLUTION:
  GET /api/admin/ops/tickets?status=in_progress
  For each in-progress ticket:
    Resolved? PATCH status → 'resolved', fill resolution field.
    After 24h in 'resolved': PATCH → 'closed'.

PATTERNS:
  Are multiple tickets in same category (e.g. 3+ payment tickets in one day)?
    → Investigate root cause — may indicate a systemic issue requiring OPS-001 incident creation.

OUTPUT: Ticket queue summary. Urgent/high tickets with assignees and ETAs.
```

---

## Appendix — Quick Reference

### Compliance SLA Cheat Sheet

| Law | Region | SLA | Breach Notification | Regulator |
|-----|--------|-----|---------------------|-----------|
| GDPR | EU (27 countries) | 30 days | 72h → DPA | National DPA (ICO, CNIL, BfDI, etc.) |
| UK GDPR | United Kingdom | 30 days | 72h → ICO | ICO (ico.org.uk) |
| CCPA/CPRA | California, US | 45 days | None mandatory | California AG |
| PIPEDA | Canada (federal) | 30 days | ASAP if real risk | OPC (priv.gc.ca) |
| Quebec Law 25 | Quebec, Canada | 30 days | 72h → CAI | CAI (cai.gouv.qc.ca) |
| LGPD | Brazil | 15 business days | 72h → ANPD | ANPD (gov.br/anpd) |
| KVKK | Turkey | 30 days | 72h → KVKK Board | KVKK (kvkk.gov.tr) |
| DPDP | India | Prescribed by rules | As prescribed | DPB (pending) |

### Region & Data Residency Map

| Region | AWS Region | Markets | Data Residency Rule |
|--------|-----------|---------|---------------------|
| KSA | me-south-1 (Bahrain) | SA | Saudi regulations |
| Gulf | me-central-1 (Riyadh) | AE, KW, JO | Gulf banking rules |
| North Africa | eu-west-1 (Ireland) | MA, TN | GDPR-adjacent |
| EU | eu-central-1 (Frankfurt) | DE, FR, NL, BE, ES, IT, PL, TR, CH | GDPR — must stay in EU |
| UK | eu-west-2 (London) | GB | UK GDPR — CANNOT mix with EU Frankfurt |
| US | us-east-1 (Virginia) | US, CA | CCPA / PIPEDA |
| LATAM | sa-east-1 (São Paulo) | BR, AR, CO, CL, MX, PE, UY | LGPD — BR data CANNOT leave Brazil |
| APAC | ap-southeast-1 (Singapore) | ID, MY, PK, IN | DPDP (IN local) |

### Payment Gateway by Country

| Country | Primary | Secondary |
|---------|---------|-----------|
| SA | STC Pay | Mada, Stripe |
| AE / KW / JO | Stripe | Local cards |
| TR | Iyzico | Stripe |
| ID | Midtrans | Stripe |
| MY | iPay88 | Stripe |
| PK | JazzCash | Easypaisa, Stripe |
| IN | Razorpay | UPI, Stripe |
| GB / EU | Stripe (+ SEPA/iDEAL/Klarna etc.) | — |
| CH | TWINT | Stripe |
| US | Stripe | PayPal, Affirm |
| CA | Interac (Bambora) | Stripe CAD |
| BR | Pix / Boleto | Stripe BR |
| AR / CO / CL / MX | MercadoPago | Stripe |

### Agent Team — Who Does What

| Agent | CLAUDE.md | Owns |
|-------|-----------|------|
| Ops Agent | `docs/ops/global-ai-operations.md` | GBL-001–010, OPS-001–002, daily/weekly/monthly/quarterly routines |
| Dev Agent | `backend/CLAUDE.md` | GBL-006, PH*-001, DEV-001–004, EMG-001–006 (technical) |
| Marketing Agent | `marketing/CLAUDE.md` | MKT-001–004 |
| Sales Agent | `sales/CLAUDE.md` | SAL-001–003, CRM-001–002 |
| HR Agent | `hr/CLAUDE.md` | HR-001–002 |
| Finance Agent | `finance/CLAUDE.md` | FIN-001–002, GBL-003–004 (financial sections) |
| Compliance Agent | `compliance/gdpr/checklist.md` | COM-001–005, EMG-003, EMG-006 |
| Products Agent | `products/CLAUDE.md` | Feature specs, sprint planning, UX rules |
| Legal Agent | `legal/CLAUDE.md` | Contract review, regulatory inquiries, EMG-003/006 |
| Customer Success Agent | `customer-success/CLAUDE.md` | CS-001–002, ticket triage, refunds, NPS management |
| Fraud Agent | `fraud/CLAUDE.md` | FRD-001–003, daily queue, rule governance, watchlist |
| Revenue Agent | `revenue/CLAUDE.md` | RVN-001–003, seasonal rules, targets, overrides |
| Procurement Agent | `procurement/CLAUDE.md` | PRC-001–003, supplier onboarding, contracts, SLAs, POs |
| Analytics Agent | `analytics/CLAUDE.md` | ANA-001–002, weekly KPI review, monthly BI report, alert tuning |
| BizDev Agent | `bizdev/CLAUDE.md` | BIZ-001–003 + ADV-001–002 + AFF-001–002, partners, markets, advertising, affiliates |
| Corporate Agent | `corporate/CLAUDE.md` | CORP-001–002, corporate account onboarding, enquiry response |

---

*Master SOP — UTUBooking.com · Phases 1–12 · 25+ Markets · 16 Agents · 100% Department Coverage*
*Last updated: 2026-04-12 · Owner: CEO / Founder (AMEC Solutions)*
*Next review: Phase 13 launch or any new market entry*
*All AI-generated outputs require human review before external use.*
