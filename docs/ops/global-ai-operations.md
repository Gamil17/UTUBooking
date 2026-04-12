# UTUBooking — Global AI Operations Handbook
## 25+ Markets · Phase 12+ · All Departments

> **How to use this document**
> This is the working prompt library for the Ops Agent and CEO daily operations.
> Each section has a formal SOP number, owner, trigger, and exact Claude Code prompt.
> For full procedure steps see `docs/ops/master-sop.md`.
> All AI outputs require human review before external publication or sending.
>
> **SOP Numbering** (this document)
> `OPS-` = AI Operations-specific procedures · cross-referenced to `GBL-/EMG-` in master-sop.md
>
> **Agent File Index** — each agent reads its designated file first, every session:
>
> | Agent | File | Responsibility |
> |-------|------|----------------|
> | Ops | `docs/ops/global-ai-operations.md` | Morning briefing, health checks, incident triage |
> | Dev | `backend/CLAUDE.md` | PR reviews, migrations, payment code, compliance routes |
> | Marketing | `marketing/CLAUDE.md` | Content generation, campaign drafts, WhatsApp broadcasts |
> | Sales | `sales/CLAUDE.md` | B2B proposals, partnership outreach, HubSpot updates |
> | HR | `hr/CLAUDE.md` | Hiring, contracts, employment law by jurisdiction |
> | Finance | `finance/CLAUDE.md` | Invoicing, VAT, FX reconciliation, board reports |
> | Compliance | `compliance/CLAUDE.md` | Privacy requests, breach response, SLA monitoring |
> | Products | `products/CLAUDE.md` | Feature specs, roadmap, Notion sprint management |
> | Legal | `legal/CLAUDE.md` | Legal research briefs, regulatory monitoring |
>
> All agents post outputs to Notion and tag humans for final approval before publishing or sending.

---

# SECTION 1 — Daily & Weekly Operations

---

## OPS-001 · Daily AI Operations Briefing

**Owner:** CEO / Founder &nbsp;|&nbsp; **Frequency:** Every morning, 7 days/week &nbsp;|&nbsp; **→ master-sop.md § GBL-001**

**Trigger:** First task each morning, before any other work.

### Step 1 — Paste into Claude Code

```
Good morning. Run the UTUBooking global operations briefing.

Check and report on:
1. INFRASTRUCTURE:
   GitHub Actions — any failed CI/CD pipelines overnight?
   AWS health: all 6 regions (Bahrain, Frankfurt, London, Virginia, Montreal, São Paulo).
   Error rates: Stripe EU/UK/US, PayPal, Pix Brazil, MercadoPago LATAM, STC Pay, Mada.
   Any API timeouts from Amadeus GDS, Hotelbeds, or Booking.com?
   Any region with latency > 300ms or error rate > 0.5%? Flag immediately.

2. COMPLIANCE:
   Any new GDPR erasure requests from EU/UK users? (SLA: 30 days)
   Any CCPA opt-out requests from California? (SLA: 45 days)
   Any LGPD requests from Brazil? (SLA: 15 business days)
   Any PIPEDA requests from Canada? (SLA: 30 days)
   Any overdue requests? Flag 🔴 immediately.

3. REVENUE:
   Yesterday bookings by region:
   MEANA (KSA/UAE/KWT/JOR/MAR/TUN) · Muslim World (TR/ID/MY/PK/IN) ·
   Europe (GB/DE/FR/NL/ES/IT/PL) · North America (US/CA) · LATAM (BR/AR/CO/CL/MX).
   Revenue in local currency + USD equivalent. Compare to 7-day average.
   Flag any region drop > 15%.

4. CUSTOMERS:
   New user registrations yesterday by region.
   Open support tickets > 24 hours? Flag by severity.

5. PIPELINE:
   HubSpot — new leads added yesterday? Deals moved stage?
   Any proposals pending CEO approval?

Output: exactly 10 bullet points.
🔴 = immediate action required | 🟡 = review today | 🟢 = all clear
```

### Step 2 — Action Triage

| Flag | Response |
|------|----------|
| 🔴 Payment failure | Escalate to Dev Agent + gateway support → run OPS-010 |
| 🔴 Compliance overdue | Escalate to Compliance Agent → run relevant OPS-007/008/009 |
| 🔴 AWS degradation | Run OPS-011 or OPS-012 as appropriate |
| 🔴 Data breach indicator | Stop all other work → run OPS-013 immediately |
| 🟡 Any flag | Assign to relevant department agent; log in Notion Daily Ops |

### Step 3 — Log and Close

Save briefing output to Notion under `Ops > Daily Briefings > [DATE]`.

---

## OPS-002 · Weekly Business Report Generation

**Owner:** CEO / Finance Agent &nbsp;|&nbsp; **Frequency:** Every Monday 08:00 Gulf Time &nbsp;|&nbsp; **→ master-sop.md § GBL-002**

**Trigger:** Monday 08:00 Gulf Time (automated or manual paste). Run after OPS-001 briefing is clear.

**Purpose:** Generate the complete weekly business report for all active markets automatically using Claude AI connected to HubSpot, Notion, GitHub, Slack, and the database.

### Step 1 — Paste into Claude Code

```
Generate the full weekly business report for UTUBooking.com.

Data sources: HubSpot CRM (MCP) + Notion (MCP) + GitHub (MCP) + Slack (MCP) + backend analytics DB.

1. REVENUE DASHBOARD:
   - Total bookings this week: hotels / flights / cars (separated)
   - Revenue by market in local currency + USD equivalent:
     MEANA (SAR/AED/EGP) · Muslim World (TRY/IDR/MYR/PKR/INR) ·
     Europe (GBP/EUR) · North America (USD/CAD) · LATAM (BRL/ARS/COP)
   - Week-over-week change % for each market
   - Top 3 performing hotels/routes by booking volume

2. AI OPERATIONS ROI:
   - Content pieces published this week (Marketing Agent output)
   - Proposals generated this week (Sales Agent output)
   - Code commits: Claude-authored vs human-authored (from GitHub data)
   - Estimated hours saved vs manual equivalent
   - Estimated cost saved vs hiring equivalent

3. SALES PIPELINE:
   - New leads this week (by market)
   - Deals closed, deals lost, deals in negotiation
   - Next week forecast

4. TECHNICAL HEALTH:
   - Average API latency per region (all 6 AWS regions)
   - Payment success rate by gateway
   - Uptime % — target 99.9%

5. COMPLIANCE DASHBOARD:
   - Open GDPR requests (EU/UK) | CCPA (US) | LGPD (BR) | PIPEDA (CA)
   - Any overdue? (GDPR >30d, CCPA >45d, LGPD >15 business days, PIPEDA >30d)

6. TOP 3 WINS + TOP 3 BLOCKERS this week

7. PRIORITIES FOR NEXT WEEK (ranked by impact)

Format: Markdown.
Commit report to docs/reports/[YYYY-WW].md.
Post 3-bullet summary to #ceo-reports Slack channel.
Email full report PDF to CEO.
```

### Step 2 — Distribution

| Channel | Action | Owner |
|---------|--------|-------|
| **GitHub** | Commit to `docs/reports/[YYYY-WW].md` for audit trail | Finance Agent |
| **Slack** | Post 3-bullet summary to #ceo-reports | Finance Agent |
| **Email** | Full PDF to CEO and active investors | CEO (review before send) |
| **Archive** | Back up to Google Drive via MCP | Finance Agent |

### Data Sources Reference

| Section | Source | Access pattern |
|---------|--------|----------------|
| Revenue / bookings | Backend analytics DB (read replica) | `getShardPool` per region |
| Hotel/flight/car split | `bookings` table, group by `product_type` and `currency` | Direct query |
| Top 3 hotels/routes | `bookings` ORDER BY count DESC LIMIT 3 | Direct query |
| GDPR open requests | `gdpr_erasure_log` WHERE `completed_at IS NULL` | Frankfurt + London shards |
| LGPD open requests | `lgpd_access_log` WHERE `status = 'pendente'` | São Paulo shard |
| CCPA opt-outs | `privacy_preferences` WHERE `ccpa_opted_out = TRUE` | Virginia shard |
| PIPEDA open | `pipeda_access_log` WHERE `completed_at IS NULL` | Montreal shard |
| HubSpot pipeline | Deals by stage, new leads, closed/lost/negotiation | HubSpot MCP |
| AI ROI — commits | `git log --author="Claude" --since="7 days ago" --oneline` | GitHub MCP |
| AI ROI — content | Content tracker in Notion | Notion MCP |
| API latency | CloudWatch per-region p99 metrics | AWS MCP |
| Payment success rate | Per-gateway webhook logs | Backend analytics |
| Uptime | CloudWatch composite alarm `utu-sla-breach` | AWS MCP |

### Compliance Overdue SQL

```sql
-- GDPR overdue (P1)
SELECT * FROM gdpr_erasure_log
WHERE created_at < NOW() - INTERVAL '30 days' AND completed_at IS NULL;

-- CCPA overdue (P1)
SELECT * FROM privacy_preferences
WHERE ccpa_opted_out_at < NOW() - INTERVAL '45 days' AND ccpa_opted_out IS NULL;

-- LGPD overdue (P1 — 15 business days ≈ 21 calendar days)
SELECT * FROM lgpd_access_log
WHERE solicitado_em < NOW() - INTERVAL '21 days' AND status = 'pendente';

-- PIPEDA overdue (P1)
SELECT * FROM pipeda_access_log
WHERE created_at < NOW() - INTERVAL '30 days' AND completed_at IS NULL;
```

> Any overdue item is a **P1** — flag in #compliance-alerts and assign to Compliance Agent immediately.

### Slack Post Format (3-bullet summary)

```
📊 *UTUBooking Weekly Report — [YYYY-WW]*

*Revenue*
• MEANA: [SAR X] | Muslim World: [USD X] | Europe: [EUR X] | North America: [USD X] | LATAM: [USD X]
• WoW change: +/-X% | Top route: [route] ([N] bookings)

*AI ROI*
• Content: X pieces | Proposals: X | Dev commits (Claude): X / total X | ~X hrs saved

*Priorities*
1. [Priority]
2. [Priority]
3. [Priority]

Full report → docs/reports/[YYYY-WW].md
```

---

# SECTION 2 — Monthly & Quarterly Operations

---

## OPS-003 · Monthly Financial & Compliance Close

**Owner:** Finance Agent + CEO &nbsp;|&nbsp; **Frequency:** Last business day of each month &nbsp;|&nbsp; **→ master-sop.md § GBL-003**

**Trigger:** Last business day of the month, after all gateway settlements have posted (typically by 17:00 Gulf Time).

**Purpose:** Reconcile every payment gateway against the database, close all open compliance requests, assess loyalty liability, and generate the monthly P&L summary for the board.

### Step 1 — Paste into Claude Code

```
Run UTUBooking end-of-month close for [MONTH YEAR].

Data sources: backend DB (all shards) + Stripe Dashboard + MercadoPago Dashboard +
Bambora Dashboard + AWS Cost Explorer + Notion (MCP) + Slack (MCP).

1. FINANCIAL RECONCILIATION:
   — Stripe (EU/UK/US/CA): compare Stripe payout total vs sum(bookings.amount_usd)
     WHERE gateway='stripe' AND status='completed' AND month=[MONTH]
     Flag any gap > $500 USD. List unmatched transaction IDs.
   — MercadoPago (AR/CO/CL/MX/PE/UY): compare settlement CSV vs DB.
     Flag ARS amounts — convert at end-of-month BCV rate; record FX P&L.
   — Pix + Boleto (BR): Stripe Brazil dashboard → compare vs br shard bookings.
     Flag any boleto transactions still 'pending' after 3 business days.
   — Bambora/Interac (CA): compare Bambora settlement report vs CA shard bookings.
   — STC Pay (SA): compare STC Pay portal vs KSA shard.
   — Flag any unmatched transactions > $500 USD equivalent across all gateways.
   — Record FX conversion gain/loss for all non-USD settlements.

2. COMPLIANCE CLOSE:
   — GDPR: confirm all requests opened this month have completed_at set.
     Any open after 30 days? → P1, escalate to Compliance Agent.
   — LGPD: confirm all lgpd_access_log rows from this month have status='concluído'.
     Any open after 15 business days? → P1.
   — CCPA: confirm all privacy_preferences opt-outs from this month are processed.
     Any unprocessed after 45 days? → P1.
   — PIPEDA: confirm all pipeda_access_log rows are completed.
   — Breach incidents this month? Confirm regulators notified within 72h. Log in dpa-register.md.
   — consent_log summary: new consents granted vs withdrawn by law/region.

3. LOYALTY & RETENTION:
   — New loyalty members this month by region (query loyalty_members table).
   — Points issued vs redeemed this month. Liability = outstanding points × redemption value.
   — Churned users: last_booking_date < NOW() - INTERVAL '90 days' AND is_active=TRUE.
     Count by region. If > 5% of active base churned: flag for re-engagement campaign.

4. INFRASTRUCTURE COST:
   — AWS Cost Explorer: total by region this month vs last month.
   — Flag any region with MoM cost increase > 20%.
   — RDS storage trending up > 80%? Lambda invocation anomalies? Data transfer spikes?
   — Redis memory > 80% capacity across any cluster? → schedule cleanup.

5. AI ROI MONTH SUMMARY:
   — git log --author="Claude" --since="[first of month]" --until="[last of month]" --oneline | wc -l
   — Count: content pieces published, proposals sent, support tickets handled by AI.
   — Estimate hours saved (assume 30 min/commit, 2 hr/proposal, 15 min/ticket).
   — Estimate cost saved vs hiring equivalent (use $85/hr blended rate).

6. GENERATE REPORT:
   — Commit to docs/reports/monthly/[YYYY-MM].md
   — Save to Notion: Finance > Monthly Close > [MONTH YEAR]
   — Post summary to #finance-close in Slack
   — Email PDF to CEO
```

### Step 2 — Distribution

| Channel | Content | Owner |
|---------|---------|-------|
| **GitHub** | Full close report committed to `docs/reports/monthly/[YYYY-MM].md` | Finance Agent |
| **Notion** | Saved to Finance > Monthly Close > [MONTH YEAR] | Finance Agent |
| **Slack #finance-close** | 5-bullet summary (revenue, reconciliation status, compliance close, cost, AI ROI) | Finance Agent |
| **Email** | Full PDF to CEO; flag any P1 items for immediate action | CEO reviews before forwarding |

### Data Sources Reference

| Section | Source | Access |
|---------|--------|--------|
| Stripe reconciliation | Stripe Dashboard payouts + DB `bookings` table | Stripe API + `getShardPool` per region |
| MercadoPago settlement | MercadoPago settlement CSV export | MercadoPago MCP / manual download |
| Pix/Boleto settlement | Stripe Brazil dashboard | Stripe API (BR account) |
| Bambora/Interac | Bambora settlement report | Bambora portal |
| STC Pay | STC Pay partner portal | STC Pay portal |
| FX rates (month-end) | Wallet FX service → ECB / BCV rate | `GET /api/v1/wallet/fx-rates` |
| GDPR close | `gdpr_erasure_log` | Frankfurt + London shards |
| LGPD close | `lgpd_access_log` | São Paulo shard |
| CCPA close | `privacy_preferences` | Virginia shard |
| PIPEDA close | `pipeda_access_log` | Montreal shard |
| Loyalty liability | `loyalty_members`, `loyalty_transactions` | KSA shard (primary loyalty DB) |
| Churn | `users.last_booking_date` | Per-region shard |
| AWS cost | AWS Cost Explorer | AWS MCP / Console |
| AI ROI | `git log` + Notion content tracker | GitHub MCP + Notion MCP |

### Financial Reconciliation SQL

```sql
-- Gateway revenue vs DB for a given month (run per shard)
SELECT
  gateway,
  COUNT(*)                       AS booking_count,
  SUM(amount_usd)                AS db_total_usd,
  SUM(amount_local)              AS db_total_local,
  currency
FROM bookings
WHERE status = 'completed'
  AND DATE_TRUNC('month', completed_at) = DATE '[YYYY-MM-01]'
GROUP BY gateway, currency
ORDER BY db_total_usd DESC;

-- Boleto transactions still pending after 3 business days
SELECT id, user_id, amount_local, created_at
FROM bookings
WHERE gateway = 'boleto'
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '3 days';

-- Loyalty liability: outstanding unredeemed points
SELECT
  region,
  SUM(points_balance)            AS total_points,
  SUM(points_balance) * 0.01    AS liability_usd  -- 1 point = $0.01
FROM loyalty_members
WHERE is_active = TRUE
GROUP BY region;

-- Churn candidates (no booking in 90 days, still active)
SELECT region, COUNT(*) AS churned_count
FROM users
WHERE last_booking_date < NOW() - INTERVAL '90 days'
  AND is_active = TRUE
GROUP BY region;
```

### Slack Close Summary Format

```
💰 *UTUBooking Monthly Close — [MONTH YEAR]*

*Revenue*
• Total GMV: $[X] USD | MoM: +/-X%
• Reconciliation: ✅ All gateways balanced / ⚠️ [N] unmatched transactions flagged

*Compliance*
• GDPR closed: X/X | LGPD closed: X/X | CCPA closed: X/X | PIPEDA closed: X/X
• Breaches this month: None / [description]

*Infrastructure Cost*
• Total AWS: $[X] | MoM: +/-X% | [Region] flagged for cost review: [Y/N]

*AI ROI*
• Claude commits: X | Content pieces: X | Proposals: X | ~X hrs saved (~$X saved)

Full report → docs/reports/monthly/[YYYY-MM].md
```

---

## OPS-004 · Quarterly Board & Investor Report

**Owner:** CEO &nbsp;|&nbsp; **Frequency:** First Monday of each quarter (Jan, Apr, Jul, Oct) &nbsp;|&nbsp; **→ master-sop.md § GBL-004**

**Trigger:** First Monday of Q+1 — compile data from the just-closed quarter.

**Purpose:** Produce a complete investor-grade quarterly report covering revenue, growth, AI ROI, market expansion, compliance, and financial outlook. Draft goes to CEO first; CEO approves before board distribution.

### Step 1 — Paste into Claude Code

```
Generate UTUBooking quarterly board report for Q[X] [YEAR].

Data sources: Notion (MCP) + HubSpot (MCP) + GitHub (MCP) + backend analytics +
AWS Cost Explorer + docs/reports/monthly/ (last 3 monthly close reports).

## 1. EXECUTIVE SUMMARY
One paragraph: headline GMV, QoQ growth, top market, key win, key challenge.

## 2. REVENUE & GROWTH
- GMV by region (MEANA / Muslim World / Europe / North America / LATAM)
  in local currency + USD equivalent; QoQ change %; YoY change %
- Top 3 revenue-generating markets this quarter
- Average booking value by region — trend vs prior quarter
- Revenue by product type: hotels / flights / cars

## 3. AI OPERATIONS ROI
- Total Claude commits this quarter (git log --author="Claude" --since Q-start)
- Content pieces published (Marketing Agent)
- Proposals generated + win rate (Sales Agent + HubSpot data)
- Dev velocity: Claude-authored % of total commits
- Total hours saved vs manual equivalent
- Total cost saved vs hiring equivalent (blended rate $85/hr)
- Cost of Claude API usage this quarter (from AWS Cost Explorer / Anthropic billing)
- Net AI ROI: cost saved minus API cost

## 4. MARKET EXPANSION
- New markets launched this quarter (with launch date and first-month GMV)
- Markets in pipeline for Q+1 (with expected launch date)
- Key partnerships signed: hotels, airlines, payment gateways
- Partnerships in negotiation

## 5. PRODUCT & ENGINEERING
- Features shipped (from git log + Notion sprint notes — list top 5)
- Uptime SLA: target 99.9% — actual per region
- Mean time to recovery (MTTR) for any incidents this quarter
- Open P1/P2 technical debt items

## 6. COMPLIANCE & RISK
- Privacy requests processed: GDPR X | CCPA X | LGPD X | PIPEDA X
- Any requests that exceeded SLA? Cause + remediation?
- Regulatory incidents or near-misses this quarter
- Upcoming compliance deadlines Q+1 (new laws, registration renewals, DPA updates)
- Sanctions/legal flags from Legal Agent review

## 7. FINANCIAL OUTLOOK
- Q+1 GMV forecast by region (use AI pricing engine trend data)
- Hajj/Ramadan seasonality impact on Q+1 if applicable
- Key risks: ARS currency volatility, Hajj quota changes, new regulations
- Recommended budget allocation for Q+1: engineering / marketing / compliance / legal

Format: investor-ready Markdown document, professional tone, numbers in tables.
Draft first. Do not distribute until CEO approves.
```

### Step 2 — Review & Distribution

| Step | Action | Owner | Timing |
|------|--------|-------|--------|
| **Draft** | Claude generates draft, commits to `docs/reports/quarterly/Q[X]-[YEAR]-draft.md` | Finance Agent | Day 1 |
| **CEO review** | CEO reviews draft, edits, approves | CEO | Days 2–3 |
| **Final commit** | Final committed to `docs/reports/quarterly/Q[X]-[YEAR].md` | CEO | Day 3 |
| **Notion** | Saved to Board > Quarterly Reports > Q[X] [YEAR] | Finance Agent | Day 3 |
| **Board email** | PDF emailed to board members + active investors | CEO | Day 4 |
| **Investor update** | Stripped-down version (no sensitive ops detail) for wider investor list | CEO | Day 5 |

### Data Sources Reference

| Section | Source | Notes |
|---------|--------|-------|
| GMV by region | `bookings` table, 3-month window, all shards | Sum `amount_usd` GROUP BY region |
| QoQ / YoY | Prior quarter + prior year same quarter from same query | Compare `DATE_TRUNC('quarter', ...)` |
| AI ROI — commits | `git log --author="Claude" --since=[Q-start] --until=[Q-end] --oneline` | GitHub MCP |
| AI ROI — content | Notion content tracker (Marketing Agent outputs) | Notion MCP |
| AI ROI — proposals | HubSpot deals with `source='Claude Agent'` tag | HubSpot MCP |
| Uptime / MTTR | CloudWatch `utu-sla-breach` alarm history | AWS MCP |
| Features shipped | `git log --since=[Q-start] --merges --oneline` + Notion sprint | GitHub MCP + Notion MCP |
| Compliance counts | All 4 law tables — COUNT WHERE created_at in quarter | Per-law shard |
| AWS cost | AWS Cost Explorer — quarterly total by service + region | AWS MCP |
| Anthropic API cost | Anthropic billing dashboard | Manual |
| Q+1 forecast | AI pricing engine demand forecasts + HubSpot pipeline | `GET /api/v1/pricing/forecast` |

### Quarterly Revenue SQL

```sql
-- GMV by region and product type for the quarter
SELECT
  region,
  product_type,
  COUNT(*)              AS bookings,
  SUM(amount_usd)       AS gmv_usd,
  AVG(amount_usd)       AS avg_booking_value_usd,
  SUM(amount_usd)
    - LAG(SUM(amount_usd)) OVER (
        PARTITION BY region, product_type
        ORDER BY DATE_TRUNC('quarter', completed_at)
      )                 AS qoq_change_usd
FROM bookings
WHERE status = 'completed'
  AND completed_at >= DATE_TRUNC('quarter', NOW() - INTERVAL '3 months')
  AND completed_at <  DATE_TRUNC('quarter', NOW())
GROUP BY region, product_type, DATE_TRUNC('quarter', completed_at)
ORDER BY gmv_usd DESC;

-- Top 3 markets this quarter
SELECT country_code, SUM(amount_usd) AS gmv_usd, COUNT(*) AS bookings
FROM bookings
WHERE status = 'completed'
  AND completed_at >= DATE_TRUNC('quarter', NOW() - INTERVAL '3 months')
GROUP BY country_code
ORDER BY gmv_usd DESC
LIMIT 3;

-- Compliance requests processed this quarter (run per law per shard)
SELECT
  'GDPR'            AS law,
  COUNT(*)          AS total,
  COUNT(completed_at) AS closed,
  COUNT(*) FILTER (WHERE completed_at IS NULL) AS still_open
FROM gdpr_erasure_log
WHERE created_at >= DATE_TRUNC('quarter', NOW() - INTERVAL '3 months');
-- Repeat for lgpd_access_log, privacy_preferences, pipeda_access_log
```

---

## OPS-016 · CLAUDE.md Brain Maintenance

**Owner:** CEO &nbsp;|&nbsp; **Frequency:** Start of each new phase + quarterly (Jan, Apr, Jul, Oct) &nbsp;|&nbsp; **→ master-sop.md § GBL-010**

**Purpose:** Keep all CLAUDE.md files current so every AI agent always has accurate company context. Outdated CLAUDE.md files are the single biggest cause of poor AI outputs — an agent working from stale context will give wrong pricing, reference old markets, and miss new compliance requirements.

**Rule:** Never start a new phase without running this SOP first.

---

### Files to Review and Update

| File | What to update |
|------|----------------|
| `marketing/CLAUDE.md` | Active campaigns, new market strategies, current brand guidelines, new social platforms, active WhatsApp broadcast lists |
| `sales/CLAUDE.md` | Current pricing tiers, new deal types (new gateways, new markets), active pipeline stages, updated approval thresholds |
| `finance/CLAUDE.md` | Current bank accounts per region, tax rates for new markets, VAT/GST rule changes, new settlement currencies |
| `backend/CLAUDE.md` | New AWS regions added, new payment gateways integrated, new APIs (hotel, flight, quota), new env vars required |
| `legal/CLAUDE.md` | New country compliance requirements, upcoming regulatory deadlines, pending legal clearances |
| `hr/CLAUDE.md` | New team members + roles, updated minimum wage rates, new employment jurisdictions, current hiring policies |
| `compliance/CLAUDE.md` | New privacy laws activated, SLA changes, new Redis queue keys, new consent banners deployed |
| `products/CLAUDE.md` | Current product roadmap phase, newly shipped features, deprecated features, active A/B tests |
| `docs/ops/global-ai-operations.md` | This file — new markets added to OPS-001 briefing, new incident types, updated agent table |

---

### Step 1 — Audit All CLAUDE.md Files

```
Audit all CLAUDE.md files in this project.

Compare current content against what is true today:
- Active markets: [list all current markets with ISO codes]
- Current phase: Phase [N]
- Current MRR: $[X] USD (approximate — use for context only, not public docs)
- Latest tech additions since last update: [list recent features/integrations]
- New AWS regions active: [list]
- New payment gateways live: [list]
- New compliance requirements active: [list any new laws or registrations]
- Team changes: [new hires, departures, role changes]

For each CLAUDE.md file:
1. Read the current content
2. Identify: what is outdated or missing?
3. Generate a diff showing proposed changes

Do NOT apply changes yet. Show me a summary of all proposed changes first.
Output format:
## [filename]
Status: UP TO DATE / NEEDS UPDATE
Changes needed:
- [specific change 1]
- [specific change 2]
```

---

### Step 2 — Review and Apply

Review the audit output carefully before applying:

- Does the proposed change reflect what is actually true today?
- Are there any sensitive details (actual MRR figures, personal data) that should not be in a committed file?
- Does any change contradict existing content in a different CLAUDE.md? (e.g. pricing in `sales/` vs `finance/`)

Once satisfied:

```
Apply the approved CLAUDE.md updates.

Changes to apply:
- [file 1]: [summary of change]
- [file 2]: [summary of change]

For each file:
1. Make only the specific changes listed above — do not rewrite unchanged sections
2. Preserve all existing market sections — add new content, do not remove old
3. Keep the existing section structure and heading style
4. Confirm each file saved successfully

Do NOT commit yet — I will review the diffs in VS Code first.
```

---

### Step 3 — Review Diffs in VS Code

Before committing:

1. Open Source Control (`Ctrl+Shift+G`) — review every changed line
2. Check: does anything look wrong, invented, or inconsistent?
3. Check: any sensitive business information that shouldn't be committed? (Remove from file first)
4. Check: are the changes consistent across related files? (e.g. a new gateway added to `backend/CLAUDE.md` should also appear in `sales/CLAUDE.md` payment section)

---

### Step 4 — Commit and Tag

```bash
# Stage only CLAUDE.md files — never use git add -A for a brain update
git add marketing/CLAUDE.md sales/CLAUDE.md finance/CLAUDE.md \
        backend/CLAUDE.md legal/CLAUDE.md hr/CLAUDE.md \
        compliance/CLAUDE.md products/CLAUDE.md \
        docs/ops/global-ai-operations.md

git commit -m "brain: Q[X] [YEAR] CLAUDE.md update — Phase [N] context refresh

Updated: [list files changed]
Added: [new markets / features / compliance requirements]
Removed: [deprecated content]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push

# Tag major brain updates (new phase = new tag):
git tag -a brain-v[X.0] -m "CLAUDE.md Phase [N] update — [brief description]"
git push origin brain-v[X.0]
```

**Tagging convention:**

| Version | When |
|---------|------|
| `brain-v1.0` | Phase 1 initial |
| `brain-v2.0` | Phase 2 launch (new major market) |
| `brain-v[N].0` | Each new phase |
| `brain-v[N].[M]` | Mid-phase update (new gateway, new compliance requirement) |

---

### Step 5 — Verify Agent Outputs

After updating, spot-check each agent with a calibration prompt:

```
Quick agent calibration check — post brain-v[X.0] update.

For each agent, ask one question that exercises the new context:

Marketing Agent: "What is our current content strategy for [newly added market]?"
Sales Agent: "Generate a one-paragraph pitch for [newly added market] using current pricing."
Finance Agent: "What VAT rate applies to a booking in [newly added country]?"
Dev Agent: "What shard handles [newly added country] in our DB router?"
Compliance Agent: "What privacy law applies to users in [newly added country]? What is the SLA?"
Legal Agent: "What are the data protection requirements for [newly added country]?"
HR Agent: "What is the minimum wage in [newly added country]?"

If any agent gives a wrong or stale answer: re-read the file, identify the gap, update the CLAUDE.md, and re-run the calibration.
```

---

### Brain Update Schedule

| Trigger | Action | Urgency |
|---------|--------|---------|
| New phase launch | Full audit — all files | Before first day of phase |
| New market added | Update: backend, sales, marketing, compliance, legal | Same day as launch |
| New payment gateway | Update: backend, sales, finance | Same day as launch |
| New privacy law activated | Update: compliance, legal, marketing | Before law effective date |
| Team hire or departure | Update: hr | Same week |
| Quarterly review | Full audit — all files | First Monday of quarter |
| MRR milestone (×2) | Update sales + finance context | Same week |

---

# SECTION 3 — Quick Prompt Reference

---

## OPS-005 · Compliance — Privacy Request Workflow

**Owner:** Compliance Agent &nbsp;|&nbsp; **Frequency:** On-demand (triggered by user request or OPS-001 flag) &nbsp;|&nbsp; **→ compliance/CLAUDE.md**

**Purpose:** Handle any incoming privacy rights request — erasure, access, opt-out, portability — across all four active privacy laws within SLA.

### Quick Prompts

| Task | Paste into Claude Code |
|------|------------------------|
| **GDPR erasure** | `Process GDPR data erasure for user_id [X]. Use getShardPool for EU/UK shard. Anonymise PII, log in gdpr_erasure_log, confirm with timestamp. Send confirmation email to user.` |
| **CCPA opt-out** | `Process CCPA opt-out for user_id [X]. Set ccpa_opted_out=true in privacy_preferences. Remove from all marketing lists via emailGuard. Log action in ccpa:opt-out:queue.` |
| **LGPD erasure** | `Process LGPD erasure for user_id [X]. Use getShardPool('BR') — São Paulo shard only. Log in lgpd_access_log. Respond within 15 business days.` |
| **PIPEDA request** | `Process PIPEDA request for user_id [X]. Use getShardPool('CA') — Montreal shard. Log in pipeda_access_log. Response required within 30 days.` |
| **Overdue audit** | `Run compliance overdue audit against all 4 laws. Flag any overdue 🔴. Post to #compliance-alerts.` |
| **New EU market** | `I want to launch in [Country]. Read compliance/CLAUDE.md and compliance/gdpr/checklist.md. List country-specific requirements and generate a launch compliance checklist.` |

### Privacy Request Intake Procedure

When a user submits a privacy request via any channel (email, in-app, support ticket):

**Step 1 — Identify & log**

```
Incoming privacy request:
User email: [X]
Request type: [erasure / access / opt-out / portability / correction]
Law that applies: [GDPR / UK GDPR / CCPA / LGPD / PIPEDA]
Date received: [YYYY-MM-DD]
Channel: [email / in-app / support ticket #]

Look up user_id from the [correct regional shard].
Log receipt in the appropriate table immediately before taking any action.
What is the SLA deadline? Calculate and confirm.
```

**Step 2 — Verify identity**

```
Verify identity for privacy request from [email].
Check: does an account exist? Is the email verified?
For GDPR: identity verification must be proportionate — do not request excessive documents.
For CCPA: use two-data-point verification (email + one of: last 4 SSN, account number, purchase history).
Confirm: verified / unable to verify (stop here and notify requester).
```

**Step 3 — Execute request**

Use the law-specific route — do NOT mix shards cross-law:

| Law | Route | Shard |
|-----|-------|-------|
| GDPR (EU) | `POST /api/user/gdpr/erase` | Frankfurt (`getShardPool('DE')` etc.) |
| UK GDPR | `POST /api/user/gdpr/erase` | London (`getShardPool('GB')`) |
| CCPA | `POST /api/user/ccpa/delete` | Virginia (`getShardPool('US')`) |
| LGPD | `POST /api/user/lgpd/erase` | São Paulo (`getShardPool('BR')`) |
| PIPEDA | `POST /api/user/pipeda/erase` | Montreal (`getShardPool('CA')`) |

**Step 4 — Confirm and close**

```
Privacy request for user_id [X] executed.
Draft confirmation email to user in [language] confirming:
- What data was deleted / provided / corrected
- Date of completion
- Reference number (format: [LAW]-[YYYYMMDD]-[userId])
- How to contact us if they have questions

Save confirmation to compliance/requests/[LAW]-[YYYYMMDD]-[userId].md
Mark completed_at in the log table.
```

### SLA Breach Escalation

If OPS-001 or OPS-002 flags an overdue request:

```
Compliance SLA breach — [LAW], user_id [X], [N] days overdue.

1. What is the current status of this request?
2. Why was it not completed within SLA?
3. Complete it now.
4. Draft apology email to user with completion confirmation.
5. Log the breach in compliance/sla-breaches/[YYYYMM].md with root cause.
6. Recommend process fix to prevent recurrence.
```

---

## OPS-006 · Sales — B2B Proposal Workflow

**Owner:** Sales Agent &nbsp;|&nbsp; **Frequency:** Per qualified lead &nbsp;|&nbsp; **→ sales/CLAUDE.md**

**Purpose:** Take a qualified lead from CRM to a sent proposal in under 2 hours using Claude AI — personalised to the client's country, language, and payment preferences.

### Quick Prompts

| Task | Paste into Claude Code |
|------|------------------------|
| **EU enterprise proposal** | `Read sales/CLAUDE.md. Generate B2B proposal for [hotel group], [country]. EUR pricing, GDPR compliance commitment, in English + [language].` |
| **LATAM partnership** | `Read sales/CLAUDE.md. Generate B2B proposal for [hotel group], [BR/AR/CO]. BRL/USD pricing, LGPD compliance, in Portuguese/Spanish.` |
| **UK mosque group** | `Read sales/CLAUDE.md. Generate group booking proposal for [mosque], [city]. GBP pricing, 14-day cooling-off, GDPR-compliant.` |
| **HubSpot pipeline review** | `Read HubSpot (MCP). Deals moved stage this week? Draft follow-ups for Negotiation stage. Flag deals >14 days inactive.` |
| **Partnership outreach** | `Read sales/CLAUDE.md. Draft cold LinkedIn outreach to [hotel chain] in [country]. GDPR-compliant (legitimate interest basis). Max 150 words. [language].` |

### 5-Step Proposal Workflow

**Step 1 — Qualify the lead**

```
Read HubSpot (MCP). New lead: [company name], [country], [contact name].

Qualify this lead:
- Company size and type (hotel chain / travel agency / mosque committee / corporate)?
- Market: which UTUBooking markets do they serve?
- Decision-maker level: who signed up or made contact?
- Estimated deal value: how many bookings/year likely?
- Which payment gateways do they need? (check sales/CLAUDE.md for country)
- Any compliance flags? (GDPR consent for outreach? CCPA if US?)

Output: Qualified (proceed) or Disqualified (reason). If qualified: recommended proposal tier.
```

**Step 2 — Generate proposal**

```
Read sales/CLAUDE.md — [COUNTRY] section.

Generate a B2B partnership proposal for:
- Company: [name]
- Country: [country]
- Contact: [name], [title]
- Deal type: [hotel inventory / group bookings / white-label / affiliate]
- Language: [primary language] (with English version)

Proposal must include:
1. Executive summary (3 sentences max)
2. UTUBooking capabilities relevant to this client's market
3. Pricing in [local currency] + USD equivalent
4. VAT/tax treatment ([rate]% [tax name] — shown as separate line item per sales/CLAUDE.md)
5. Payment methods available in [country]
6. GDPR/LGPD/CCPA compliance commitment (law applicable to this country)
7. Pilot proposal: 3-month trial with success metrics
8. Next steps with specific dates
9. Legal cooling-off statement if B2C-adjacent contract (EU/UK only)

Flag for CEO review if deal value > [threshold from sales/CLAUDE.md].
Save draft to sales/proposals/[YYYYMMDD]-[company-slug].md
```

**Step 3 — Human review gate**

> CEO or Sales Lead reviews every proposal before it is sent.
> Check: pricing correct? Compliance commitment accurate? No over-promises?
> Approve or request edits.

**Step 4 — Send and log**

```
Proposal for [company] approved.
1. Send via [email / LinkedIn / WhatsApp] to [contact].
2. Log in HubSpot: move deal to "Proposal Sent" stage.
3. Set follow-up task: +7 days if no response.
4. Save sent version to sales/proposals/sent/[YYYYMMDD]-[company-slug]-SENT.md
```

**Step 5 — Follow-up cadence**

```
HubSpot deal [company] has been in "Proposal Sent" for [N] days with no response.

Draft follow-up [#1 / #2 / #3]:
- Follow-up #1 (Day 7): warm check-in, offer to answer questions
- Follow-up #2 (Day 14): add a new value point or market stat relevant to them
- Follow-up #3 (Day 21): final nudge — "closing the loop" tone, door left open

Language: [language from sales/CLAUDE.md for this country]
Flag if deal goes silent after #3 — mark as "Nurture" in HubSpot.
```

### Deal Stage Rules

| Stage | Trigger | SLA | Owner |
|-------|---------|-----|-------|
| Lead | Contact made or CRM entry created | Qualify within 48h | Sales Agent |
| Qualified | Budget + authority + need confirmed | Proposal within 72h | Sales Agent + CEO |
| Proposal Sent | Proposal emailed/sent | Follow-up at +7d, +14d, +21d | Sales Agent |
| Negotiation | Client has questions or counter-offers | Respond within 24h | CEO |
| Won | Signed agreement received | Onboard within 5 days | CEO + Dev Agent |
| Lost | Closed lost — log reason | Post-mortem if deal > $10K USD | CEO |

---

## OPS-007 · Marketing — Content & Campaign Workflow

**Owner:** Marketing Agent &nbsp;|&nbsp; **Frequency:** Per content piece or campaign brief &nbsp;|&nbsp; **→ marketing/CLAUDE.md**

**Purpose:** Produce market-specific content — SEO, social, WhatsApp, email — using Claude AI as the primary writer, with human approval gates before publishing.

### Quick Prompts

| Task | Paste into Claude Code |
|------|------------------------|
| **US Ramadan campaign** | `Read marketing/CLAUDE.md. Create Ramadan Umrah campaign for Muslim Americans: Facebook + Instagram + email. JFK/LAX/ORD departures. US English, warm tone.` |
| **BR WhatsApp broadcast** | `Read marketing/CLAUDE.md (BR section). Write WhatsApp broadcast for Brazilian Umrah travelers in pt-BR. Pix payment CTA. LGPD opt-in confirmed list only.` |
| **DE SEO content** | `Read marketing/CLAUDE.md (DE section). Write 5 SEO posts: Umroh Reise, Halal Hotel Mekka, Günstige Flüge Jeddah. Formal German. Flag for native speaker QA.` |
| **ARS price update** | `ARS/USD rate changed. Recalculate Argentine pricing. Update all AR-facing content with new USD equivalent. Flag in-flight bookings needing adjustment.` |
| **Ramadan 6-week calendar** | `Read marketing/CLAUDE.md. Full Ramadan campaign for all 25 markets. 6-week content calendar. WhatsApp (LATAM) + Instagram (EU/UK) + email (MEANA). Start dates per market.` |
| **SEO audit** | `Audit frontend/locales/*.json for missing or outdated SEO strings. Compare against top competitor keywords per market. Generate list of missing content gaps.` |

### 6-Step Content Workflow

**Step 1 — Brief**

```
Content brief:
Market: [country / region]
Content type: [SEO blog / social post / email / WhatsApp / ad copy]
Topic: [plain English]
Target audience: [segment — e.g. British Muslims aged 25-45, Arab Brazilians]
Primary CTA: [book now / learn more / contact sales]
Tone: [from marketing/CLAUDE.md for this market]
Language: [from marketing/CLAUDE.md — note if native speaker review required]
Compliance: [GDPR consent required? LGPD? Note if personal data used in targeting]
Deadline: [YYYY-MM-DD]
```

**Step 2 — Draft**

```
Read marketing/CLAUDE.md — [COUNTRY] section.

Write [content type] based on the brief above.

Requirements:
- Language: [language] — flag if native QA required per marketing/CLAUDE.md
- Tone: [from brief]
- Include: [payment method relevant to market, e.g. Pix for BR, TWINT for CH]
- SEO keywords (if blog): [list or ask Claude to suggest based on market]
- Compliance notice (if email/WhatsApp): include GDPR/LGPD unsubscribe mechanism
- Character/word limits: [Twitter: 280 / Instagram caption: 2200 / WhatsApp: 1024 / email subject: 60]
- CTA: [from brief]

Output: draft only — do not publish.
Save to marketing/drafts/[YYYYMMDD]-[market]-[type]-[slug].md
```

**Step 3 — Native speaker review gate**

> **MANDATORY for:** TR, ID, MY, PK, IN, GB (formal), DE, FR, NL, PL, BR, AR, CO, CL, MX, CH-DE
> Send draft to native speaker reviewer.
> Do NOT publish unreviewed content in any of these languages.

```
Flag this [language] content draft for native speaker review.
Save to marketing/pending-review/[file].
Notify [relevant regional contact] via Slack #marketing-[region].
Do not proceed to Step 4 until review is confirmed.
```

**Step 4 — CEO / human approval**

> All content requires human approval before publication.
> Review: accurate? On-brand? No compliance risks? Correct pricing?

**Step 5 — Publish**

```
[Content type] for [market] approved.

Publish to:
- [Platform]: [account / page / channel]
- Schedule for: [date and time in local timezone]
- UTM parameters: utm_source=[platform]&utm_medium=[type]&utm_campaign=[campaign-slug]

Log publication in marketing/published/[YYYYMM]-log.md:
- Date, market, platform, content type, UTM, expected reach
```

**Step 6 — Performance check (72h post-publish)**

```
Check performance of [content piece] published [DATE] for [market].

Metrics to pull:
- Reach / impressions
- Click-through rate (CTR)
- Bookings attributed (UTM tracking)
- WhatsApp opt-ins generated (if WhatsApp broadcast)

Compare to benchmark: [previous similar campaign or industry average].
Flag if CTR < 1% (social) or < 20% (email open rate) — recommend A/B test.
Save to marketing/performance/[YYYYMM]-[market]-performance.md
```

### Compliance Rules for Content

| Channel | Rule |
|---------|------|
| Email to EU/UK users | Must have GDPR opt-in on record. Include unsubscribe link. |
| Email to BR users | LGPD opt-in required. Include unsubscribe in Portuguese. |
| WhatsApp (BR) | Check `wa:sub:BR:{userId}` in Redis — never message unsubscribed users. |
| Meta ads (EU) | DSA transparency label required. No retargeting without consent. |
| Testimonials | Written consent stored in `marketing/gdpr/testimonial-consents/`. |
| Pricing in content | Always show local currency primary + USD secondary. Never SAR to EU/US users. |

---

## OPS-008 · Engineering — PR Review & Deployment

**Owner:** Dev Agent &nbsp;|&nbsp; **Frequency:** Per PR opened by outsourced team &nbsp;|&nbsp; **→ backend/CLAUDE.md**

**Purpose:** Ensure every code change from outsourced developers is reviewed against UTUBooking architecture rules before merging — using Claude as the primary reviewer.

### Quick Prompts

| Task | Paste into Claude Code |
|------|------------------------|
| **PR review** | `Read backend/CLAUDE.md. Review PR #[N]. Check all 9 rules below. Report pass/fail per rule with line references.` |
| **Health check** | `Check all 6 AWS regions: latency, DB connections, Redis hit rates, SLA status. Flag any region > 300ms or error rate > 0.5%.` |
| **Migration rollout** | `Run migration [filename] across all shards: KSA → UAE → KWT → JOR → MAR → TUN → Istanbul → CA → US → BR → London → Frankfurt. Dry-run first.` |
| **Consent check** | `Verify GDPRConsentBanner fires before analytics for EU/UK users. No pre-ticked boxes. Consent logged to consent_log before any analytics load.` |
| **Dependency audit** | `Run npm audit in backend/ and frontend/. List all high/critical vulnerabilities. For each: is there a patched version? Breaking change risk?` |

### PR Review Procedure

**Step 1 — Automated gate (Claude runs on every PR)**

```
Read backend/CLAUDE.md. Review PR #[N] from [author].

Check each rule and report PASS ✅ or FAIL ❌ with the specific line/file reference:

1. SHARD ROUTER — all DB queries use getShardPool(countryCode). No hardcoded DATABASE_URL.
2. PAYMENT ROUTING — all gateway calls via PaymentRouter.getGateway(countryCode). Not hardcoded.
3. i18n COVERAGE — all 15 locales have translations for any new string keys:
   en ar fr tr id ms ur hi fa de en-GB it nl pl es pt-BR es-419
4. DATA RESIDENCY — new user data writes go to the correct regional shard.
   EU data → Frankfurt. UK → London. BR → São Paulo. CA → Montreal. Never mixed.
5. NO SECRETS — no sk_live_, API keys, passwords, or tokens in any file. Env vars only.
6. CONSENT GATE — any new marketing send checks consent_log or emailGuard first.
7. WCAG 2.1 AA — new UI: accessibilityRole, accessibilityLabel, min 44px touch targets.
8. HOTEL SEARCH ROUTING — hotel searches use searchHotelsRouted() from hotelSearchRouter.ts.
9. TEST COVERAGE — new payment or compliance code has tests. Run npm test to confirm.

Summary: X/9 rules passed. List any failures with exact file:line references.
Recommendation: APPROVE / REQUEST CHANGES / BLOCK (P1 violation)
```

**Step 2 — Human review gate**

> CEO or Tech Lead reads the Claude review summary.
> BLOCK = do not merge until fixed; no exceptions.
> REQUEST CHANGES = author must fix before re-review.
> APPROVE = merge when ready.

**Step 3 — Merge and deploy**

```
PR #[N] approved. Merge to main.
Monitor GitHub Actions deployment to staging.
After staging passes: confirm production deployment in [region] within 15 minutes.
Any error rate spike after deploy? If yes: roll back immediately.
```

### Migration Rollout Procedure

Always run migrations in this shard order (safest to most critical last):

```
Run migration [filename].

Order:
1. KSA shard (me-south-1) — dry-run first: npm run migrate:dry [filename] --shard=KSA
2. If dry-run passes: npm run migrate [filename] --shard=KSA
3. Verify: table exists, indexes created, no errors in DB logs
4. Repeat for: UAE → KWT → JOR → MAR → TUN → Istanbul (TR) →
              CA (Montreal) → US (Virginia) → BR (São Paulo) →
              EU-London → EU-Frankfurt

Stop immediately if any shard fails. Do not proceed to next shard until prior shard is healthy.
After all shards: verify shard_registry table updated with migration record.
Post completion summary to #dev-migrations in Slack.
```

> BR migrations are subject to LGPD — confirm no PII schema change without DPO review.
> EU/UK migrations: confirm GDPR Article 30 records of processing are updated if new data category.

### Weekly Infrastructure Health Prompt

Run every Monday as part of OPS-001 triage (or on-demand):

```
Full infrastructure health check — [DATE].

For each of the 6 AWS regions (Bahrain, Frankfurt, London, Virginia, Montreal, São Paulo):

1. API latency p99 (target < 300ms) — CloudWatch
2. DB connection count (target < 80% of max:20 per pool) — RDS metrics
3. Redis memory usage % (alert > 80%) — ElastiCache metrics
4. Redis hit rate (target > 90%) — ElastiCache metrics
5. ECS task count vs desired (any tasks in STOPPED state?) — ECS console
6. Last Grafana alert in this region — monitoring.utubooking.com/grafana
7. SLA status — CloudWatch composite alarm utu-sla-breach: OK / ALARM

Output: table with one row per region. Any ❌ → create GitHub issue + tag Dev Agent.
```

---

# SECTION 4 — Feature Development

---

## OPS-009 · New Feature Development Workflow

**Owner:** CEO + Dev Agent + Outsourced Developers &nbsp;|&nbsp; **Frequency:** Per feature request &nbsp;|&nbsp; **→ master-sop.md § GBL-006 (PR Review)**

**Purpose:** Standardise how every new feature is conceived, planned, built, tested, and deployed — using Claude AI for 70%+ of the work. Applies to all feature work regardless of market or complexity.

---

### The 7-Step Workflow

#### Step 1 — DESCRIBE

Write the feature request in plain English in Claude Code:

```
New feature request:

What it does: [plain English description]
Market(s) it serves: [KSA / EU / US / BR / etc.]
Why it matters: [user problem being solved or revenue impact]
Success criteria: [how we know it's done correctly]
Related files (if known): [optional]

Enter plan mode and produce a technical specification.
```

#### Step 2 — PLAN (Claude Plan Mode)

Claude enters `/plan` mode and produces a **Technical Specification** covering:

| Spec section | Contents |
|--------------|----------|
| Problem statement | What is being built and why |
| Affected files | List of files to create and modify |
| DB changes | Migrations required (shard-aware) |
| API changes | New endpoints or modified contracts |
| i18n changes | Which of the 15 locales need new keys |
| Payment impact | Does this touch PaymentRouter.ts? |
| Data residency | Does this write user data? Which shard? |
| Test plan | Unit + integration test coverage targets |
| Rollout | Feature flag / staged rollout plan |

> Review the spec carefully. Correct any misunderstandings **before** approving.
> Claude saves the spec as `docs/plans/[YYYY-MM-DD]-[feature-slug].plan.md` (version controlled).

#### Step 3 — APPROVE

```
Approved — proceed with implementation.
```

> **Do NOT type this until you have read and understood the spec.**
> Claude will not write code without explicit approval.

#### Step 4 — BUILD

Claude generates all code across multiple files in parallel. During build:

- Review the diff in VS Code Source Control (`Ctrl+Shift+G`)
- Ask Claude to explain any section you don't understand before accepting it
- Claude annotates significant decisions with inline comments

**Mandatory build checks** — Claude confirms each before marking build complete:

```
Before marking build complete, confirm:
1. All DB queries use getShardPool(countryCode) — no hardcoded DATABASE_URL
2. All gateway calls use PaymentRouter.getGateway(countryCode) — not hardcoded
3. All 15 locales have translation keys added: en ar fr tr id ms ur hi fa de en-GB it nl pl es pt-BR es-419
4. Data residency: any new user data write goes to the correct regional shard
5. No secrets, API keys, or tokens in code — env vars only
6. WCAG 2.1 AA: new UI components have accessibilityRole, accessibilityLabel, min 44px touch targets
7. Hotel searches use searchHotelsRouted() from hotelSearchRouter.ts — not direct adapter calls
```

#### Step 5 — TEST

```bash
cd backend && npm test
cd ../frontend && npm test
```

Then ask Claude to generate tests:

```
Generate tests for [feature name] with 80%+ coverage.
Include:
- Unit tests for all new service functions
- Integration test for the happy path end-to-end
- Edge case tests for: empty input, missing auth, wrong country code, payment failure
- If touching compliance routes: test that SLA timestamps are being written correctly
```

> Tests must pass before any commit. A failing test is a blocker — do not push around it.

#### Step 6 — COMMIT

```bash
git add [specific files — never git add -A blindly]
git commit -m "feat: [description] for [market]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Commit message format:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — infrastructure / config change
- `compliance:` — privacy law implementation
- Always include `for [market]` when market-specific

#### Step 7 — DEPLOY

```bash
git push
```

GitHub Actions auto-deploys:
1. → **Staging** (automatic on push to `main`)
2. → **Production** (automatic after staging health check passes, ~10 min)

Monitor deployment in GitHub Actions. If staging health check fails, revert immediately:

```bash
git revert HEAD && git push
```

---

### 5 Golden Rules

| Rule | Requirement |
|------|-------------|
| **RULE 1** | NEVER push directly to `main` without passing all tests |
| **RULE 2** | NEVER put API keys or secrets in code — use `.env` + AWS Secrets Manager |
| **RULE 3** | NEVER skip Plan Mode for changes touching payment, auth, or user data |
| **RULE 4** | ALWAYS get human approval before Claude sends anything to clients or goes public |
| **RULE 5** | ALWAYS commit `CLAUDE.md` changes to GitHub — never lose AI memory |

---

### When to Skip Plan Mode

Plan Mode is **always required** for:
- Any change to payment flows or `PaymentRouter.ts`
- Any change to auth middleware or session handling
- Any change that writes to user PII fields
- Any new database migration
- Any new CloudFormation stack or infrastructure change

Plan Mode is **optional** (but still recommended) for:
- Copy/translation-only changes to locale files
- Style/CSS changes with no logic impact
- Documentation updates

---

### Feature Request Template

Save as `docs/plans/TEMPLATE.md` for reuse:

```markdown
## Feature: [Name]
**Date:** [YYYY-MM-DD]
**Requested by:** [CEO / Agent / Market team]
**Market(s):** [list]
**Priority:** P1 (blocker) / P2 (high) / P3 (normal)

### What it does
[Plain English]

### Why it matters
[Revenue impact / compliance requirement / user pain]

### Success criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

### Out of scope
[Explicitly list what this feature does NOT do]

### Dependencies
[Other features, migrations, or third-party approvals needed first]
```

---

# SECTION 5 — Market Launch

---

## OPS-015 · New Market Launch

**Owner:** CEO + Dev Agent + Compliance Agent + Marketing Agent &nbsp;|&nbsp; **Timeline: 4 weeks standard · 6 weeks if new AWS region needed** &nbsp;|&nbsp; **→ master-sop.md § GBL-005**

**Trigger:** CEO decision to launch in a new country. Begin with Step 1 scoping before any code is written.

---

### Step 1 — Launch Scoping (Week 1)

```
New market launch scoping — [COUNTRY NAME] ([ISO code]).

Answer before any code is written:

1. MARKET PROFILE:
   - Muslim population estimate + % of total population
   - Primary language(s) — locale file already in frontend/locales/?
   - Primary social platforms for Muslim travel marketing in this country
   - Main competitors already operating here

2. PAYMENT:
   - What methods do consumers in [country] use? (card / wallet / bank transfer / BNPL)
   - Does PaymentRouter.ts already cover this country?
   - If not: which gateway to integrate? Research top 2 options with fee %.
   - Local currency ISO code — does wallet FX service support it?

3. COMPLIANCE:
   - Which privacy law applies? (GDPR / local law / none)
   - Is [country] EU/EEA? → GDPR consent banner required
   - Does data residency law require a dedicated AWS region?
   - Is a Seller of Travel registration or travel licence required?

4. INFRASTRUCTURE:
   - Nearest existing AWS region for this market?
   - Which DB shard handles this country in shard-router.js today?

5. COMMERCIAL:
   - Hotel inventory: does Hotelbeds or Booking.com cover this market?
   - Flights: is the main departure airport in amadeus-airlines.json?
   - Existing B2B contacts (agencies, hotel groups) to approach at launch?

Save scoping report to docs/launch/[CC]-scoping.md. CEO reviews before proceeding.
```

---

### Step 2 — Technical Implementation (Weeks 1–3)

Use OPS-009 (Feature Development Workflow) for each item. Required checklist:

```
Technical launch checklist for [COUNTRY] ([CC]) — implement via OPS-009.

PAYMENT:
[ ] PaymentRouter.ts: getGateway('[CC]') returns correct gateway
[ ] If new gateway: create gateway + controller + router (use existing as template)
[ ] Add env vars to AWS Secrets Manager + backend/.env
[ ] Staging test: full payment flow with test credentials

LOCALE & i18n:
[ ] frontend/src/i18n/config.ts: add [locale] with currency, font, RTL flag if needed
[ ] frontend/locales/[locale].json: all standard keys present (copy en.json as template)
[ ] marketing/CLAUDE.md + sales/CLAUDE.md: add [country] section
[ ] RTL: if Arabic-script language, verify dir=rtl in globals.css

DATABASE:
[ ] backend/shared/shard-router.js: getShardPool('[CC]') → correct regional pool
[ ] Migration for any country-specific tables — dry-run first, then apply to target shard

COMPLIANCE BANNER:
[ ] EU/EEA: add [CC] to GDPRConsentBanner.tsx trigger list
[ ] BR: LGPDBanner.tsx handles 'BR' — verify
[ ] CA: PIPEDAPrivacyNotice.tsx — add [CC] if not already covered

FLIGHTS:
[ ] amadeus-airlines.json: add [CC] departure airports + local carriers (IATA, alliance, hubs)
[ ] Add [CC]→JED and [CC]→MED route priorities

HOTEL ROUTING:
[ ] hotelSearchRouter.ts handles [CC]: EU/UK → Booking.com | Others → Hotelbeds

INFRASTRUCTURE (only if new region required):
[ ] CloudFormation stack: infra/cloudformation/[NN]-[region]-[city].yml
[ ] Route53 geoproximity: infra/cloudformation/09-route53-global.yml updated
[ ] OPS-001 daily briefing: add [CC] to revenue and health check regions
```

---

### Step 3 — Compliance Clearance (Weeks 2–3, parallel)

```
Compliance launch clearance for [COUNTRY] ([CC]).

Read compliance/CLAUDE.md — identify applicable law.
Read compliance/gdpr/checklist.md if EU/EEA.

Required before launch:
[ ] Privacy policy updated to cover [country] — Legal Agent review
[ ] DPA signed with local payment gateway provider → add to compliance/dpa-register.md
[ ] Seller of Travel / travel licence obtained (if required)
[ ] Country-specific cookie consent requirements reviewed (see legal/CLAUDE.md — DE/FR stricter)
[ ] Data residency confirmed: [CC] data → [shard region]
[ ] marketing/CLAUDE.md [CC] section includes applicable compliance rules for content

Save sign-off to docs/launch/[CC]-compliance-clearance.md. Do not launch without this.
```

---

### Step 4 — Marketing Preparation (Week 3)

```
Marketing launch preparation for [COUNTRY].

Read marketing/CLAUDE.md — add [country] section if not present:
- Platform: [primary channels]
- Tone: [cultural notes]
- Language: [language] — flag if native speaker review required
- Key content: [local Hajj/Umrah themes, departure airports, local payment CTA]
- Compliance: [note consent rules for this market]

Deliverables:
[ ] Launch announcement (social + email) in [language] + English
[ ] 3 SEO blog posts targeting top Umrah/Hajj search terms in [country]
[ ] WhatsApp broadcast template (if WhatsApp is primary channel for this market)
[ ] sales/CLAUDE.md: add [country] section (currency, VAT, proposal rules, deal thresholds)

Native speaker review required before CEO approval. Save to marketing/drafts/[CC]-launch/.
```

---

### Step 5 — Pre-Launch Go/No-Go (Week 4)

```
Pre-launch go/no-go — [COUNTRY] ([CC]).

TECHNICAL — confirm each in staging:
[ ] PaymentRouter.getGateway('[CC]') returns correct gateway ✅/❌
[ ] End-to-end test payment in [local currency] ✅/❌
[ ] getShardPool('[CC]') → [correct region] — data stays in region ✅/❌
[ ] frontend/locales/[locale].json: no missing keys ✅/❌
[ ] Flight search: [CC] airport returns Amadeus results ✅/❌
[ ] Hotel search: routed to correct upstream for [CC] ✅/❌
[ ] Consent banner: correct banner shown for [CC] users ✅/❌

COMPLIANCE:
[ ] Privacy policy live and covering [country] ✅/❌
[ ] DPA signed with gateway ✅/❌
[ ] Seller of Travel / licence obtained (if required) ✅/❌

MARKETING:
[ ] Launch content CEO-approved ✅/❌
[ ] Native speaker review complete ✅/❌

All items ✅ → Launch approved. Post to #launches in Slack.
Any ❌ → Block launch. Fix item. Re-run checklist.
```

### Launch Folder Structure

Save all documents to `docs/launch/[CC]/`:

| File | Created in |
|------|-----------|
| `[CC]-scoping.md` | Step 1 |
| `[CC]-compliance-clearance.md` | Step 3 |
| `[CC]-launch-checklist.md` | Step 5 (go/no-go results) |
| `[CC]-launch-announcement.md` | Step 4 (all language copies) |

---

# SECTION 6 — Seasonal Operations

---

## OPS-010 · Seasonal Operations — Ramadan, Hajj & Umrah

**Owner:** Ops Agent + Marketing Agent + Dev Agent &nbsp;|&nbsp; **→ master-sop.md § GBL-007**

**Purpose:** Ramadan and Hajj are UTUBooking's highest-revenue periods. This SOP covers the full cycle: 6 weeks pre-Ramadan through post-Hajj wind-down, plus the October–February Umrah peak season.

### Annual Calendar

| Period | Trigger | Action | Owner |
|--------|---------|--------|-------|
| **6 weeks before Ramadan** | Calendar | Launch Ramadan campaigns — all 25 markets (Step 1 below) | Marketing Agent |
| **4 weeks before Ramadan** | Calendar | Enable Ramadan pricing recommendations in AI engine | Products + Dev |
| **Ramadan starts** | Calendar | Daily Ramadan monitoring cadence (Step 2 below) | Ops Agent |
| **Last 10 days of Ramadan** | Calendar | Umrah final push campaign — highest conversion window | Marketing Agent |
| **Ramadan ends** | Calendar | Post-Ramadan analytics + lessons learned (Step 3 below) | Ops Agent |
| **May 19** | Calendar | Hajj pre-warm — ECS autoscaling cron `0 0 19 5 ? *` (Step 4 below) | Dev Agent |
| **May 26** | Calendar | Hajj peak starts — 10s health checks, all-hands monitoring (Step 5 below) | Ops Agent |
| **Jun 2** | Calendar | Hajj peak ends — begin post-Hajj wind-down | Ops Agent |
| **May 27** | After Hajj | Post-Hajj scale-back — ECS minimums restored (Step 6 below) | Dev Agent |
| **Oct 1** | Calendar | Umrah peak season starts — elevated spend, pricing | Marketing + Products |
| **Dec 31** | Annual | CCPA annual data inventory review | Compliance Agent |
| **Year-end** | Annual | GDPR Art. 30 records of processing — DPA register update | Compliance + Legal |

---

### Step 1 — Pre-Ramadan Campaign Launch (6 Weeks Before)

```
Pre-Ramadan campaign launch — [YEAR]. Ramadan starts: [DATE].

Read marketing/CLAUDE.md for each region's Ramadan content rules.

1. CONTENT CALENDAR — generate 6-week content plan for all active markets:
   Week 1–2: Awareness ("Ramadan is coming — plan your Umrah")
   Week 3–4: Consideration ("Best hotels near Haram during Ramadan — compare now")
   Week 5: Urgency ("Last spots — Ramadan Umrah packages from [city]")
   Week 6 (Last 10 nights): Final push ("Laylat al-Qadr — still time to perform Umrah")

2. CHANNEL PLAN per market:
   MEANA (KSA/UAE/KWT): Instagram + WhatsApp + email — Arabic tone, formal
   Turkey: Instagram + X (Twitter) — Turkish copy, native review required
   Indonesia/Malaysia: Instagram Reels + TikTok + WhatsApp — Bahasa/Malay, community tone
   Pakistan: WhatsApp (primary) + Facebook — Urdu copy, native review required
   India: WhatsApp + Instagram — Hindi/Urdu, native review required
   EU/UK: Instagram + LinkedIn — English + market language, GDPR consent verified
   LATAM (BR): WhatsApp broadcasts (LGPD opt-in list only) + Instagram — pt-BR
   LATAM (LATAM): WhatsApp + TikTok + Instagram — es-419, localise CTAs per country
   US: Facebook + Instagram + email — US English, warm tone, CCPA compliant

3. PRICING:
   Enable Ramadan demand multiplier in AI pricing engine (port 3011)
   Check current pricing:ai:* Redis keys — are they populating correctly?
   Flag any hotels still showing off-peak rates during Ramadan dates.

4. WHATSAPP BR (LGPD):
   Check wa:broadcast:BR subscriber count. Only send to opted-in users.
   Template to use: ramadan_greeting — confirm it is approved in Meta Business Suite.

Draft all content. Flag each piece for native speaker review as required.
Save content calendar to marketing/campaigns/ramadan-[YEAR]/calendar.md
```

---

### Step 2 — Ramadan Daily Monitoring

Run every day during Ramadan as a supplement to OPS-001:

```
Ramadan daily pulse — [DATE], Day [N] of Ramadan.

In addition to standard OPS-001 briefing, check:

1. BOOKINGS: Ramadan vs non-Ramadan dates — are Ramadan-period rooms still selling?
   Any sudden drop in bookings for a specific market? (flag if > 20% below daily average)

2. PRICING: Are AI pricing recommendations still active?
   GET /api/v1/pricing/[top hotel ID]/[Ramadan date] — response < 2s with Ramadan multiplier?

3. WHATSAPP (BR): Any opt-out spikes? Check wa:broadcast:BR count vs yesterday.
   PARAR/STOP keyword processing — any errors in webhook logs?

4. CONTENT PERFORMANCE: Top-performing post this week by market?
   Any campaign with CTR < 1% (social) or open rate < 20% (email) — flag for creative refresh.

5. SUPPORT: Any spike in booking-related support tickets?
   Common issue this week: [identify if any pattern]

Output: 5-bullet daily pulse. 🔴 = action needed | 🟢 = all clear.
```

---

### Step 3 — Post-Ramadan Analytics

Run the first Monday after Ramadan ends:

```
Post-Ramadan campaign analytics — [YEAR].

1. REVENUE:
   - Total GMV during Ramadan [start date → end date] vs same period last year
   - Top 5 markets by Ramadan GMV
   - Top 5 hotels by Ramadan bookings
   - Average booking value during Ramadan vs rest of year
   - Cancellation rate during Ramadan vs baseline

2. MARKETING ROI:
   - Total reach across all markets and channels
   - Top-performing content piece per market (highest CTR / bookings attributed)
   - Worst-performing content piece per market — what failed and why?
   - WhatsApp broadcast performance (BR): sent / delivered / opt-outs
   - Email campaign performance: open rates, CTR, unsubscribes

3. PRICING:
   - Did AI pricing recommendations increase revenue per booking vs baseline?
   - Any markets where manual price intervention was needed?

4. LESSONS LEARNED:
   - What to do more of next Ramadan?
   - What to stop or change?
   - Any new markets to add to Ramadan campaigns next year?

Save to marketing/campaigns/ramadan-[YEAR]/post-ramadan-report.md
Share with CEO. Update marketing/CLAUDE.md with lessons for next year.
```

---

### Step 4 — Hajj Pre-Warm (May 19)

```
Hajj season pre-warm — [DATE].

1. LOAD TEST — run before making any infrastructure changes:
   artillery run load-tests/artillery/scenarios/booking-flow-500c.yml
   Target: P95 < 800ms | P99 < 2s | error rate < 0.5%
   k6 run load-tests/k6/booking-flow-500c.js (500 VUs, 10 min constant)
   If P95 > 800ms or errors > 0.5%: STOP — identify bottleneck first. Do not pre-warm.

2. AUTOSCALING — activate Hajj pre-warm:
   Verify CF autoscaling cron (0 0 19 5 ? *) is active in CF 02 stack.
   Confirm ECS minimum tasks bumped: booking × 4, payment × 3, hotel × 3, auth × 2.
   Scale-back cron (0 0 27 5 ? *) confirmed for May 27.

3. INFRASTRUCTURE — all 6 regions green:
   Run OPS-008 infrastructure health check across all regions.
   Any region with latency > 200ms (tighter than usual 300ms): investigate.
   Redis memory < 70% across all clusters? (stricter during Hajj — leave headroom)

4. GATEWAYS — confirm all payment methods operational:
   STC Pay, Mada: test transaction within last 4 hours ✅/❌
   Stripe (EU/UK/US/CA): test transaction ✅/❌
   Pix (BR): test transaction ✅/❌
   All other active gateways: last successful webhook < 24h ✅/❌

5. PRICING SERVICE:
   Port 3011: GET /api/v1/pricing/[top MCM hotel]/[Hajj date] — response < 2s ✅/❌
   Hajj season multiplier active in pricing engine? ✅/❌
   Redis pricing:ai:* keys populated? TTLs ~ 6h? ✅/❌

6. CONTENT:
   Hajj package pages live and SEO-indexed for all departure markets?
   All 15 locales showing correct Hajj pricing and dates?

Any ❌: create GitHub issue + notify Dev Agent. DO NOT proceed until all ✅.
Post pre-warm completion to #hajj-ops in Slack.
```

---

### Step 5 — Hajj Peak Window (May 26–Jun 2)

Run OPS-001 **twice daily** during Hajj peak. Additional Hajj-specific checks:

```
Hajj peak daily check — [DATE], Day [N] of Hajj.

INFRASTRUCTURE (every 6 hours):
- All 6 regions: latency < 200ms, error rate < 0.2% ✅/❌
- ECS task counts: all at Hajj-elevated minimums ✅/❌
- Redis memory: < 70% across all clusters ✅/❌
- CloudWatch: utu-sla-breach alarm — OK ✅/❌

PAYMENTS (every 6 hours):
- STC Pay success rate: > 97% ✅/❌
- All other gateways: > 95% success rate ✅/❌
- Bookings stuck in 'processing' > 30 min: count? (target: 0)

BOOKINGS:
- Bookings last 24h vs Hajj baseline (set on Day 1) — trend ↑ / ↓ / stable?
- Any hotel reporting overbooking? Check inventory sync with Hotelbeds + Booking.com.
- Cancellation rate: > 5% today? Investigate reason.

🔴 ANY INFRASTRUCTURE FAILURE DURING HAJJ PEAK → run OPS-012 or OPS-014 immediately.
All incidents during Hajj peak treated as P0 — highest priority, all hands.
```

---

### Step 6 — Post-Hajj Scale-Back and Review (May 27+)

```
Post-Hajj scale-back and review — [DATE].

1. SCALE-BACK:
   Confirm CF scale-back cron (0 0 27 5 ? *) fired and ECS tasks returned to baseline.
   Verify: booking service, payment service, hotel service — back to standard minimums.
   Any tasks still elevated? Manually correct in ECS console.

2. FINANCIAL REVIEW:
   Hajj period GMV [May 19 → Jun 2] vs last year
   Top 10 hotels by Hajj bookings and revenue
   Gateway performance: which gateway had highest success rate? Lowest?
   Any payment incidents during peak? Revenue impact?

3. INFRASTRUCTURE RCA:
   Were there any latency spikes > 300ms during Hajj peak? When and which region?
   Any incidents (OPS-012 / OPS-014) triggered? Link post-mortems.
   ECS scaling: did autoscaling fire correctly at the right thresholds?

4. PRICING RETROSPECTIVE:
   AI pricing recommendations: did Hajj multiplier increase average booking value?
   Compare: AI-priced bookings vs manual-priced (if any) — which performed better?

5. NEXT YEAR:
   What infrastructure changes are needed before next Hajj?
   What marketing changes? New markets to add?
   Update products/CLAUDE.md with capacity findings.

Save to docs/reports/hajj-[YEAR]-retrospective.md. CEO review required.
```

---

## OPS-017 · HR — Hiring & Onboarding Workflow

**Owner:** HR Agent + CEO &nbsp;|&nbsp; **Frequency:** Per open role &nbsp;|&nbsp; **→ hr/CLAUDE.md**

**Purpose:** Use Claude AI to generate job descriptions, screen candidates, draft offer letters, and prepare onboarding — cutting hiring admin time by 70%. All outputs require CEO review before sending to candidates.

### Step 1 — Job Description Generation

```
New hire request — [ROLE TITLE].

Read hr/CLAUDE.md — [COUNTRY] section for applicable labour law.

Generate a job description for:
- Role: [title]
- Department: [Marketing / Dev / Sales / Finance / Compliance / other]
- Location: [country / remote]
- Employment type: [full-time / part-time / contractor / freelance]
- Reports to: CEO / [manager]

Job description must include:
1. Role summary (3 sentences — what they do, why it matters)
2. Key responsibilities (5–8 bullet points, specific not generic)
3. Required skills (separate from nice-to-have)
4. What we offer (salary range in LOCAL currency, benefits, remote/office)
5. Equal opportunity statement
6. Application instructions

Compliance checks per hr/CLAUDE.md:
- EU/UK: use gender-neutral language (H/F/X notation for FR)
- DE: do NOT promise anything that requires works council approval
- UK: do NOT ask for age, religion, pregnancy, sexuality — Equality Act 2010
- All markets: do NOT mention race, disability, marital status

Language: [primary language of hiring country] + English version.
Flag for legal review if posting in a new jurisdiction for the first time.
Save to hr/job-descriptions/[YYYYMMDD]-[role-slug].md
```

### Step 2 — Candidate Screening

```
Screen candidates for [ROLE] — [N] applications received.

For each candidate, score against these criteria (1–5 each):
1. Core skill match (required skills from JD)
2. Relevant experience (years + quality of previous roles)
3. Market/domain knowledge (UTUBooking markets, Islamic travel, fintech)
4. Language match (languages required for this role)
5. Red flags (unexplained gaps, vague answers, inconsistencies)

Compliance — do NOT score or comment on:
- Age, gender, race, religion, nationality, disability, family situation
- Only skills and experience relevant to the role

Output: ranked shortlist of top [N] candidates with score breakdown.
Flag any candidate who stands out strongly or has a critical disqualifier.
Save to hr/screening/[YYYYMMDD]-[role-slug]-shortlist.md
CEO reviews shortlist before interviews are scheduled.
```

### Step 3 — Interview Question Pack

```
Generate interview question pack for [ROLE] in [COUNTRY].

Read hr/CLAUDE.md — [COUNTRY] employment law section.
Read [role department] CLAUDE.md for role-specific context.

Include:
1. 5 competency-based questions (STAR format: Situation, Task, Action, Result)
2. 3 technical / domain knowledge questions specific to [role]
3. 2 culture-fit questions (collaborative, asynchronous work, global team)
4. 1 scenario question: "How would you handle [realistic work situation]?"

Questions must NOT ask about: age, religion, nationality, children, pregnancy, health,
disability, marital status, or any other protected characteristic.

Flag any question that could be legally problematic in [country].
Save to hr/interviews/[YYYYMMDD]-[role-slug]-questions.md
```

### Step 4 — Offer Letter Draft

```
Draft offer letter for [CANDIDATE NAME] — [ROLE] — [COUNTRY].

Read hr/CLAUDE.md — [COUNTRY] section for mandatory contract terms.

Include:
1. Role title and department
2. Start date: [DATE]
3. Salary: [amount] [local currency] [per month/year] — gross
4. Employment type: [full-time / part-time / contractor]
5. Location: [city / remote / hybrid]
6. Probation period: [duration per hr/CLAUDE.md for this country]
7. Annual leave: [days per hr/CLAUDE.md minimum for this country]
8. Notice period: [per hr/CLAUDE.md — must meet legal minimum]
9. Benefits: [list]
10. Governing law: [country] employment law

Country-specific mandatory additions (per hr/CLAUDE.md):
- UK: written statement of employment particulars from Day 1
- DE: contract in German (dual-language acceptable, German governs)
- FR: must reference applicable collective agreement (convention collective)
- NL: include transition payment notice
- CH: include AHV/BVG contribution rates

NEVER send this offer without: CEO approval + legal review if new jurisdiction.
Save draft to hr/offers/[YYYYMMDD]-[candidate-slug]-offer-draft.md
Flag: "DO NOT SEND — requires CEO + legal review"
```

### Step 5 — Onboarding Checklist

```
Generate onboarding checklist for [NAME] — [ROLE] — starting [DATE].

Week 1:
[ ] Send welcome email with first-day instructions (include: tools access, Slack invite, Notion workspace)
[ ] Set up accounts: GitHub (if technical role), HubSpot (if sales), Notion, Slack
[ ] Schedule 1:1 with CEO on Day 1
[ ] Share: relevant CLAUDE.md files for their role + this operations handbook
[ ] GDPR/LGPD/CCPA employee data notice: send and log consent
[ ] Add to hr/CLAUDE.md team section: name, role, location, start date

Week 2:
[ ] Role-specific tool training: [list tools for this role]
[ ] Introduce to key contacts in other departments
[ ] Assign first project or task — not critical path, but meaningful
[ ] 1:1 check-in with CEO: how's it going? Any blockers?

30-day review:
[ ] Performance vs expectations: on track / needs support / exceeding
[ ] Update hr/CLAUDE.md if role scope has evolved from JD
[ ] Confirm probation is proceeding as expected

Save checklist to hr/onboarding/[YYYYMMDD]-[name-slug].md
```

---

## OPS-018 · Customer Support & Refund Escalation

**Owner:** Ops Agent (triage) → relevant department agent &nbsp;|&nbsp; **Response targets below** &nbsp;|&nbsp; **→ master-sop.md**

**Purpose:** Standardise how support tickets escalate from AI triage to human resolution — especially refunds, chargebacks, and complaints involving personal data.

### Support Tiers

| Tier | Issue type | Response target | Owner |
|------|-----------|-----------------|-------|
| **T1 — AI handles** | Booking confirmation, general FAQ, payment status enquiry | < 2 hours | AI Chat (port 3001) |
| **T2 — Agent assists** | Booking change, cancellation request, payment failure, hotel complaint | < 4 hours | Ops Agent |
| **T3 — CEO involved** | Refund > $500, chargeback filed, data subject complaint, regulatory contact | < 2 hours | CEO + relevant agent |
| **T4 — Legal involved** | Formal legal demand, regulator enquiry, fraud allegation | Immediate | CEO + Legal Agent |

### T2 Triage Prompt

```
Support ticket triage — [TICKET ID] — [DATE].

Ticket: [paste ticket content]
User: [user_id if known] | Market: [country] | Booking ref: [if applicable]

1. Classify: booking issue / payment issue / hotel complaint / data request / other
2. Severity: T1 (FAQ) / T2 (change/cancel) / T3 (refund > $500 or chargeback) / T4 (legal)
3. Is this a privacy/data request? (erasure, access, opt-out) → route to OPS-005 immediately
4. Is there an active booking at risk? (imminent travel date < 7 days) → flag as urgent
5. What is the applicable refund/cancellation policy for this booking?
6. Draft a response in [user's language] that:
   - Acknowledges the issue with empathy
   - States what action we will take and by when
   - Does NOT admit liability without CEO review
   - Does NOT promise a refund without checking cancellation policy first

Flag as T3/T4 if: refund request > $500 | chargeback filed | complaint mentions lawyer or regulator.
```

### Refund Processing

```
Refund request — booking [REF] — user [user_id] — amount [X] [currency].

1. Check cancellation policy for this booking:
   - Is the booking within the free cancellation window?
   - Is it a non-refundable rate?
   - Is the cancellation due to our error (wrong dates, unavailable hotel)?

2. Refund eligibility:
   - Within free cancel window: full refund, process immediately
   - Non-refundable but our error: full refund, escalate to CEO to confirm
   - Non-refundable, user's decision: partial refund at discretion — T3, CEO decides
   - Chargeback filed: DO NOT process refund manually. Escalate to T3 immediately.

3. Process via correct gateway:
   Stripe: POST /v1/refunds with payment_intent_id
   MercadoPago: POST /v1/payments/{id}/refunds
   Pix/Boleto: Stripe refund flow (BR) — BRL refund to original payment method
   Other gateways: follow gateway-specific refund API

4. Update booking status in DB: status='refunded', refunded_at=NOW(), refund_amount=[X]
5. Send confirmation email to user in [language] with refund reference number and timeline
6. Log in support/refunds/[YYYYMM]-refunds.md: date, booking ref, amount, reason, gateway

Refunds > $500: CEO approval required before processing.
```

### Chargeback Response

```
Chargeback filed — booking [REF] — [gateway] — amount [X] [currency].

DO NOT issue a manual refund while chargeback is open.

1. Gather evidence immediately (chargebacks have 7–21 day response windows):
   - Booking confirmation sent to user (timestamp + email)
   - Payment confirmation (gateway transaction ID)
   - Hotel confirmation from Hotelbeds/Booking.com
   - Any communication with the user about this booking
   - IP address and device fingerprint from booking session (check auth logs)

2. Draft chargeback rebuttal letter:
   - State the facts: user made booking, payment processed, hotel confirmed
   - Attach: booking confirmation, payment receipt, hotel voucher
   - Note: UTUBooking's cancellation policy (was user notified at time of booking?)
   - Professional tone — no accusations

3. Submit via gateway dispute portal:
   Stripe: disputes dashboard → submit evidence
   PayPal / others: follow gateway-specific dispute process

4. Log: support/chargebacks/[YYYYMM]-chargebacks.md
   If chargeback lost: issue refund, log as revenue loss. Analyse for fraud pattern.

Chargebacks from same user or same hotel > 3 in 90 days: flag as fraud risk → CEO.
```

---

## OPS-019 · Loyalty Program Management

**Owner:** Finance Agent + Products Agent &nbsp;|&nbsp; **Frequency:** Weekly audit + monthly liability review &nbsp;|&nbsp; **→ OPS-003 (monthly close)**

**Purpose:** Monitor points issuance, redemption rate, and loyalty liability — ensure the program drives retention without creating unsustainable financial exposure.

### Weekly Loyalty Pulse

Run every Monday as part of OPS-001 triage:

```
Weekly loyalty program check — [DATE].

1. ISSUANCE vs REDEMPTION:
   SELECT
     DATE_TRUNC('week', created_at) AS week,
     SUM(CASE WHEN type='earn' THEN points ELSE 0 END) AS issued,
     SUM(CASE WHEN type='redeem' THEN points ELSE 0 END) AS redeemed,
     SUM(CASE WHEN type='earn' THEN points ELSE 0 END)
       - SUM(CASE WHEN type='redeem' THEN points ELSE 0 END) AS net_liability_change
   FROM loyalty_transactions
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY week;

2. OUTSTANDING LIABILITY:
   SELECT region, SUM(points_balance) AS total_points,
          SUM(points_balance) * 0.01 AS liability_usd
   FROM loyalty_members WHERE is_active = TRUE GROUP BY region;
   Flag if total liability > $[threshold] USD (set threshold in products/CLAUDE.md).

3. TIER DISTRIBUTION:
   SELECT tier, COUNT(*), AVG(points_balance)
   FROM loyalty_members GROUP BY tier;
   Any unusual spike in Gold/Platinum tier? Investigate if > 20% MoM change.

4. EXPIRING POINTS (30 days):
   SELECT COUNT(*) AS members, SUM(points_expiring) AS points_at_risk
   FROM loyalty_members
   WHERE points_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days';
   If > 50K points expiring: trigger re-engagement campaign (OPS-007).

Output: loyalty health summary. Flag any liability > threshold 🔴.
```

### Loyalty Campaign Triggers

| Trigger | Action | Claude Code prompt |
|---------|--------|-------------------|
| User has 0 bookings in 60 days | Re-engagement email with points reminder | `Draft re-engagement email for [N] users with [X] points expiring in 30 days. Language: [by region]. OPS-007 workflow.` |
| User reaches Gold tier (new) | Congratulations email + Gold benefits | `Draft Gold tier congratulations email for user [id] in [language]. Include Gold benefits list from products/CLAUDE.md.` |
| Points about to expire (14 days) | Final expiry warning | `Draft expiry warning for [N] users. Points: [X]. Expiry: [date]. CTA: book now to use points.` |
| Redemption rate < 10% for 4 weeks | Flag to Products Agent | `Loyalty redemption rate is [X]%. Below 10% for 4 consecutive weeks. Analyse: is redemption UX clear? Are reward thresholds too high? Recommendations?` |

### Monthly Liability Report

Include in OPS-003 monthly close:

```
Monthly loyalty liability report — [MONTH YEAR].

1. Total outstanding points balance across all shards
2. USD liability at current redemption value ($0.01 per point)
3. MoM change in liability: issued - redeemed this month
4. Breakout by region: which region has highest liability growth?
5. Redemption rate this month: redeemed / issued %
6. If liability > $[threshold]:
   - Recommend: increase redemption incentives? Adjust point expiry policy?
   - Is the program still commercially viable at current earn rate?

Save to docs/reports/monthly/[YYYY-MM]-loyalty.md
Include in OPS-003 monthly close report to CEO.
```

---

# SECTION 7 — Incident Response

---

## OPS-012 · Payment Failure Response

**Owner:** CEO / Dev Agent &nbsp;|&nbsp; **Response target: within 15 minutes of alert** &nbsp;|&nbsp; **→ master-sop.md § EMG-001**

**Trigger:** Grafana/CloudWatch alert fires when payment error rate > 2% in any 5-minute window. PagerDuty notification sent to CEO mobile + Slack #alerts.

---

### Step 1 — Detection (Automatic)

| Signal | Source | Threshold |
|--------|--------|-----------|
| Payment error rate spike | Grafana `pagerduty-alerts.yml` | > 2% in 5-minute window |
| Gateway timeout | CloudWatch alarms | > 3 consecutive timeouts |
| Booking stuck in `processing` | CloudWatch custom metric | > 5 min without state change |
| Webhook delivery failure | Gateway dashboard + DB | Any webhook returning non-200 |

When the alert fires:
- PagerDuty → CEO mobile push notification
- Slack #alerts → automated message with gateway, error rate, region, timestamp

---

### Step 2 — Diagnosis

**Paste into Claude Code immediately:**

```
URGENT: Payment gateway alert detected.

Check error logs for the last 30 minutes across all active gateways.

1. Which gateway is failing? (Stripe / STC Pay / Mada / Iyzico / Midtrans / iPay88 /
   JazzCash / Easypaisa / Pix / MercadoPago / Bambora/Interac / TWINT / PayPal / Affirm)
2. What is the exact error code and message from the logs?
3. How many transactions are affected in the last 30 minutes?
4. Is this: (a) a gateway-side outage, (b) our code regression, (c) invalid/expired API key,
   (d) currency/amount validation error, or (e) full payment service down?
5. Are bookings stuck in 'processing' state? Count and list booking IDs.
6. Which markets/countries are affected?

Diagnosis in under 5 minutes. Output: scenario type + affected count + recommended action.
```

---

### Step 3 — Response by Scenario

| Scenario | Action | Time Target |
|----------|--------|-------------|
| **Gateway outage (their side)** | Enable fallback in `PaymentRouter.ts`. Show user-facing maintenance notice on checkout in affected locale. Post status to #incidents. | **< 5 min** |
| **Our code regression** | `git revert HEAD && git push` — GitHub Actions auto-deploys. Verify error rate drops post-deploy. | **< 10 min** |
| **Invalid / expired API keys** | Update keys in AWS Secrets Manager. Restart affected payment service (`docker restart` or ECS task stop+start). Verify with test transaction. | **< 15 min** |
| **Currency / amount validation error** | Disable the affected currency in `PaymentRouter.ts`. Fix the calculation. Re-enable only after a successful test transaction. | **< 30 min** |
| **Full payment outage (all gateways)** | Show "payment maintenance" page across all markets. Email all users with bookings in `processing` state. All hands — CEO + Dev Agent. | **< 60 min** |

---

### Step 4 — Fallback Activation

When activating a fallback gateway, paste into Claude Code:

```
Activate payment fallback for [country/gateway].

1. In PaymentRouter.ts: change getGateway('[CC]') to return '[FALLBACK_GATEWAY]'
2. Verify fallback gateway credentials are set in AWS Secrets Manager
3. Run a test transaction through the fallback to confirm it's working
4. Check for any bookings stuck in 'processing' state during the outage window:
   SELECT id, user_id, gateway, created_at FROM bookings
   WHERE status = 'processing'
   AND gateway = '[FAILED_GATEWAY]'
   AND created_at > NOW() - INTERVAL '2 hours'
   ORDER BY created_at DESC;
5. For each stuck booking: notify user with status update (in local language)
6. Post to #incidents: gateway, fallback activated, affected count, ETA for primary restoration
7. Log: docs/ops/incidents/[DATE]-[gateway]-outage.md
```

**Gateway fallback map:**

| Country | Primary | Fallback 1 | Fallback 2 |
|---------|---------|------------|------------|
| SA | STC Pay | Mada | Stripe card |
| TR | Iyzico | Stripe card | — |
| ID | Midtrans | Stripe card | — |
| MY | iPay88 | Stripe card | — |
| PK | JazzCash | Easypaisa | Stripe card |
| IN | Razorpay | Stripe card | — |
| BR | Pix (Stripe) | Boleto (Stripe) | Stripe card |
| AR/CO/CL/MX/PE/UY | MercadoPago | Stripe card | — |
| CA | Interac (Bambora) | Stripe card | — |
| CH | TWINT | Stripe card | — |
| US | Stripe | PayPal | Affirm (BNPL) |
| EU/UK/others | Stripe | — | Escalate to Dev |

---

### Step 5 — Recovery and Close

Once primary gateway is restored:

```
Payment gateway [name] restored for [country].

1. Switch PaymentRouter.ts back to primary gateway
2. Run test transaction to confirm primary is healthy
3. Check error rate in Grafana — confirm it has dropped below 0.5%
4. Were any bookings permanently lost (status='failed' during outage)?
   List them. Draft refund or re-attempt communication to affected users.
5. Post recovery notice to #incidents: downtime duration, transactions affected,
   revenue impact estimate, root cause summary
6. Update docs/ops/incidents/[DATE]-[gateway]-outage.md with resolution and RCA
7. If downtime > 30 min: schedule post-mortem within 48h
```

**Post-mortem template** (for any incident > 30 min):

```markdown
## Payment Incident Post-Mortem — [Gateway] — [DATE]

**Duration:** [start time] → [end time] ([N] minutes)
**Affected markets:** [list]
**Transactions affected:** [N] attempted, [N] failed, [N] recovered
**Estimated revenue impact:** $[X] USD

**Timeline:**
- [HH:MM] Alert triggered
- [HH:MM] Diagnosis complete
- [HH:MM] Fallback activated
- [HH:MM] Primary restored
- [HH:MM] Incident closed

**Root cause:** [technical explanation]
**Contributing factors:** [list]

**Action items:**
- [ ] [Specific fix] — Owner: [Dev Agent / CEO] — Due: [date]
- [ ] [Process improvement] — Owner: — Due:

**Prevented by:** [what would have caught this earlier?]
```

---

## OPS-013 · Data Breach Response

**Owner:** CEO + Legal Agent + Compliance Agent &nbsp;|&nbsp; **Response target: contain within 1 hour, notify regulators within 72 hours** &nbsp;|&nbsp; **→ master-sop.md § EMG-003**

**Trigger:** Any indicator of unauthorised data access, exfiltration, or exposure — flagged by monitoring, external report, or OPS-001 briefing.

> **Critical:** DO NOT delete or alter any logs. Every action must be time-stamped. The 72-hour regulatory clock starts from the moment you become aware — not when you confirm it.

---

### Step 1 — First 15 Minutes: Contain

**Paste into Claude Code immediately:**

```
URGENT: Suspected data breach — [description of what was observed / how detected].

Containment actions — execute NOW:
1. Identify the affected service: which component, endpoint, or DB was involved?
2. Revoke all active sessions for affected users: invalidate JWT tokens in Redis
   KEYS auth:session:* — DEL affected keys
3. Rotate any API keys or secrets that may be compromised:
   - Which AWS Secrets Manager entries need rotation?
   - Regenerate and redeploy without downtime if possible.
4. Isolate the affected service: can it be taken offline without full outage?
   If yes: stop the ECS task. If no: restrict inbound traffic via security group.
5. Log discovery time: INSERT INTO breach_log (region, discovered_at, description)
   VALUES ('[region]', NOW(), '[description]') — run on the affected shard.
6. Preserve ALL logs: CloudWatch, application logs, DB audit logs, access logs.
   DO NOT rotate or clean up anything until Legal Agent clears it.

Status report: what was accessed, estimated user count, data categories affected.
```

---

### Step 2 — First Hour: Assess Severity

```
Breach assessment — [incident ID].

Determine severity:

HIGH RISK (mandatory regulatory notification likely):
- Any financial data (card numbers, bank accounts, payment tokens)
- Passwords or authentication credentials (even hashed)
- More than 250 users affected
- Special category data under GDPR (health, religion, biometric)
- Children's data

MEDIUM RISK (notification may be required — Legal Agent decides):
- Email addresses + names of < 250 users
- Booking history without payment data
- Usage/behavioural data

LOW RISK (unlikely notification required — document and monitor):
- Non-personal, aggregated, or anonymised data only

What data categories were accessed? Which users? Which region(s)?
Classification: HIGH / MEDIUM / LOW risk.

Regulatory notification obligations based on affected regions:
- EU users (Frankfurt shard): GDPR — notify lead DPA within 72h if high risk
- UK users (London shard): UK GDPR — notify ICO within 72h if high risk
- BR users (São Paulo shard): LGPD — notify ANPD within 72h if high risk
- CA users (Montreal shard): PIPEDA — notify OPC if real risk of significant harm
- US/CA users (Virginia shard): CCPA — no mandatory regulator window; notify users

Output: severity classification + list of applicable notification obligations + 72h deadline timestamps.
```

---

### Step 3 — Regulatory Notification Drafts (CEO + Legal review before filing)

Run one prompt per affected jurisdiction — do not send without sign-off:

**GDPR / UK GDPR breach notification draft:**

```
Draft GDPR breach notification for [lead DPA / ICO].

Required content (Art. 33 GDPR):
1. Nature of the breach (categories and approx. number of records affected)
2. Contact details of the Data Protection Officer (DPO_EMAIL env var)
3. Likely consequences of the breach
4. Measures taken or proposed to address the breach and mitigate effects

Affected users: [N]
Data categories: [list]
Discovery time: [HH:MM DD/MM/YYYY]
72-hour deadline: [HH:MM DD/MM/YYYY]

Draft in formal English. Flag ⚠️ any section requiring a qualified lawyer's input.
Save to compliance/breach-notifications/[YYYYMMDD]-gdpr-draft.md
DO NOT SUBMIT — for CEO + Legal Agent review only.
```

**LGPD breach notification draft (Portuguese):**

```
Redigir notificação de incidente de segurança para a ANPD.

Dados afetados: [N] usuários brasileiros
Categorias: [lista]
Hora da descoberta: [HH:MM DD/MM/AAAA]
Prazo de 72 horas: [HH:MM DD/MM/AAAA]

Incluir: natureza do incidente, dados afetados, medidas tomadas, contato do DPO (BR_DPO_EMAIL).
Formato: documento formal em português brasileiro.
Salvar em compliance/breach-notifications/[AAAAMMDD]-lgpd-rascunho.md
NÃO ENVIAR — apenas para revisão do CEO e Agente Jurídico.
```

---

### Step 4 — User Notification

```
Draft user notification for the data breach affecting [N] users in [region(s)].

Requirements:
- Plain language — no legal jargon
- What happened (without exposing further security details)
- What data was affected (be specific)
- What we have done to contain it
- What users should do (change password? Monitor statements? Contact us?)
- How to contact us: [support email / phone]
- Reference number: BREACH-[YYYYMMDD]-[region]

Languages needed: [list — one draft per language, consistent content]

Save drafts to compliance/breach-notifications/[YYYYMMDD]-user-notice-[lang].md
DO NOT SEND — CEO review required before distribution.
```

---

### Step 5 — Post-Incident

Once the breach is contained and notifications filed:

```
Post-breach review for incident BREACH-[YYYYMMDD]-[region].

1. Full timeline: first indicator → containment → notification → resolution
2. Root cause analysis: how did the breach occur?
   - Vulnerability: [code bug / misconfiguration / third-party / credential compromise]
   - Attack vector (if external): [how was it exploited?]
3. Impact summary: users affected, data categories, revenue/reputational impact
4. Remediation completed:
   - Secrets rotated ✅/❌
   - Vulnerability patched ✅/❌
   - Affected accounts notified ✅/❌
   - DPA/regulator notified ✅/❌
5. Action items to prevent recurrence:
   - [ ] [Security fix] — Owner: Dev Agent — Due: [date]
   - [ ] [Process change] — Owner: CEO — Due: [date]
   - [ ] [Audit] — Owner: Compliance Agent — Due: [date]

Save to compliance/breach-notifications/[YYYYMMDD]-post-incident-report.md
Share with Legal Agent. Schedule quarterly security review if severity was HIGH.
```

### Notification Deadline Tracker

| Law | 72h Deadline | Regulator | Contact |
|-----|-------------|-----------|---------|
| GDPR (EU) | Discovery + 72h | Lead EU DPA | edpb.europa.eu |
| UK GDPR | Discovery + 72h | ICO | ico.org.uk/report |
| LGPD (BR) | Discovery + 72h | ANPD | anpd.gov.br |
| PIPEDA (CA) | If real risk of harm — ASAP | OPC | priv.gc.ca |
| CCPA (US) | No regulator window — notify users | — | Direct user email |

> Log discovery time the moment you see this SOP. The clock is running.

---

## OPS-014 · AWS Region Outage

**Owner:** Dev Agent + Ops Agent &nbsp;|&nbsp; **Response target: traffic rerouted within 10 minutes** &nbsp;|&nbsp; **→ master-sop.md § EMG-002**

**Trigger:** AWS Health Dashboard alert, CloudWatch region health alarm, or OPS-001 briefing flags a region as degraded or down.

---

### Step 1 — Detection & Initial Assessment

```
AWS region [name] is showing degraded status.

1. Check AWS Health Dashboard — is this an AWS-wide event or isolated to our account?
   URL: health.aws.amazon.com
2. Check Route53 health checks for this region — has automatic failover already triggered?
   - Health check ID: HEALTH_CHECK_BOTH_PRIMARIES_ID (from env)
   - Status: Healthy / Unhealthy
3. Which services are affected in this region?
   - RDS (DB): can we still write to the primary?
   - ElastiCache (Redis): cluster available?
   - ECS tasks: are all tasks RUNNING or some STOPPED/PENDING?
   - ALB: is it passing health checks?
4. What markets are served primarily by this region? (see Appendix A)
5. Estimated user impact: active sessions in this region right now?

Severity: PARTIAL (some services degraded) or FULL (region unreachable).
```

---

### Step 2 — Failover by Region

Activate failover only after confirming the data residency rules below — do not route blindly:

| Region down | Failover target | Data residency check | Action |
|-------------|----------------|---------------------|--------|
| **eu-central-1 (Frankfurt)** | eu-west-2 (London) | ⚠️ EU data moving to UK — technically OK (EU→UK adequacy decision in force) but flag to Legal Agent | Update Route53 weighted routing; set Frankfurt weight=0 |
| **eu-west-2 (London)** | eu-central-1 (Frankfurt) | 🔴 UK GDPR data CANNOT move to Frankfurt without review — UK ≠ EU post-Brexit | **Do not auto-failover. Escalate to Legal Agent immediately.** Acceptable only with explicit Legal sign-off |
| **sa-east-1 (São Paulo)** | — | 🔴 LGPD: Brazilian user data cannot leave Brazil. No valid failover target. | **Escalate to Legal Agent immediately.** Show maintenance page for BR users. Do NOT route to Virginia. |
| **ca-central-1 (Montreal)** | us-east-1 (Virginia) | ✅ PIPEDA allows temporary failover to US for < 24h | Update Route53; log start time — must restore within 24h |
| **us-east-1 (Virginia)** | ca-central-1 (Montreal) | ✅ Acceptable for US traffic | Update Route53 |
| **me-south-1 (Bahrain)** | me-central-1 (Riyadh) | ✅ Both Gulf region, same data zone | Update Route53 |
| **ap-southeast-1 (Singapore)** | ap-south-1 (Mumbai) | ✅ APAC regional failover | Update Route53 |

**Route53 failover prompt:**

```
Activate Route53 failover — [failed region] → [target region].

1. Update weighted routing record for [failed region]: set weight=0
2. Increase weight for [target region]: set weight=100
3. Verify TTL is set low (60s or less) for fast propagation
4. Confirm DNS propagation: dig +short [domain] — showing target region IPs?
5. Test: can we hit the ALB in [target region] from an external client?
6. Monitor: error rate in [target region] — is it handling the additional load?
   Check ECS CPU/memory — scale up if CPU > 70%
7. Post to #incidents: region down, failover activated, affected markets, ETA

Log: docs/ops/incidents/[DATE]-[region]-outage.md
```

---

### Step 3 — Client & User Communication

```
AWS [region] outage — draft communications.

1. Slack #incidents post (immediate):
   "🔴 INCIDENT: [region] degraded. Markets affected: [list].
   Failover status: [activated/not yet]. ETA: [unknown/estimated X min].
   Owner: [Dev Agent + CEO]. Updates every 15 min."

2. Enterprise client SLA notification (if downtime > 15 min):
   Email to affected enterprise clients:
   - Subject: UTUBooking Service Notice — [region] — [DATE]
   - Body: brief factual description, impact, ETA, our apologies
   - Do NOT over-promise restoration time
   - Tone: professional, calm, factual
   Draft in [language(s) of affected markets].

3. User-facing status page update:
   Draft message for status page or in-app banner:
   "We are currently experiencing a technical issue affecting [markets].
   Our team is working to resolve this. Existing bookings are not affected."

CEO reviews all external communications before sending.
```

---

### Step 4 — Recovery & Restore

Once the failed region is restored by AWS:

```
AWS [region] restored. Reverting Route53 failover.

1. Confirm RDS in [region] is accepting writes — test connection
2. Confirm ElastiCache cluster is healthy — check Redis PING
3. Confirm ECS tasks are all RUNNING (desired count matches actual)
4. Gradually restore Route53 weights: set [region]=20, [failover]=80
   Wait 5 min. Monitor error rates. If clean: set [region]=80, [failover]=20.
   Wait 5 min. If clean: set [region]=100, [failover]=0.
5. If PIPEDA Montreal→Virginia failover was active:
   Confirm failover duration was < 24h. Log in compliance/pipeda/cross-border-transfers.md.
6. Post recovery to #incidents: downtime duration, markets affected, resolution summary
7. Schedule RCA post-mortem within 48h if downtime > 30 min
```

### Region Recovery Checklist

After full restoration, verify all 6 regions are green:

```
Full infrastructure health check post-incident — [DATE].

For each region: API latency p99, DB connection count, Redis hit rate, ECS task count.
Any region still > 300ms latency or < 95% Redis hit rate after recovery?
Grafana: all 6 region dashboards showing green?
CloudWatch utu-sla-breach composite alarm: OK?
Post clean bill of health to #infrastructure.
```

---

# SECTION 8 — Legal

---

## OPS-020 · Legal Research Request Workflow

**Owner:** CEO / Legal Agent &nbsp;|&nbsp; **SLA: brief delivered within 4 hours** &nbsp;|&nbsp; **→ legal/CLAUDE.md**

**Purpose:** Define how to correctly task the Legal Agent for jurisdiction research, regulatory analysis, contract review prep, and compliance gap checks — ensuring output is formatted for external counsel, not mistaken for legal advice.

**Critical rule:** Legal Agent output is ALWAYS internal research for qualified external lawyers. It is NEVER actionable without sign-off from a licensed lawyer in the relevant jurisdiction.

---

### Step 1 — Classify the Request

Before tasking the Legal Agent, identify the request type:

| Type | Description | Output format | External counsel required? |
|------|-------------|---------------|---------------------------|
| **Jurisdiction brief** | "Can we launch in [country]?" | Country brief with laws, regulators, risks, gaps | Yes — before proceeding |
| **Regulation summary** | "What does KVKK require for X?" | Structured summary with ⚠️ flags on uncertainty | Recommended |
| **Contract review prep** | "Summarise this NDA / vendor contract" | Issue list + questions for lawyer | Yes — before signing |
| **Regulatory gap check** | "Are we compliant with [law] today?" | Gap analysis vs checklist | Yes — before asserting compliance |
| **Sanctions screen** | "Can we serve users in [country]?" | Sanctions landscape summary | Always — no exceptions |
| **Pending items review** | "What's in the legal pending list?" | Summary of open items from `legal/CLAUDE.md` | No (status check only) |

---

### Step 2 — Legal Research Prompt Template

```
Legal research request — [DATE].

TYPE: [Jurisdiction brief / Regulation summary / Contract review prep / Gap check / Sanctions screen]
JURISDICTION(S): [list countries or regions]
TOPIC: [precise description — e.g. "KVKK consent requirements for email marketing in Turkey"]
CONTEXT: [why we need this — e.g. "Planning to launch TR market in Phase 13; need to understand consent rules before building UI"]
URGENCY: [routine (4h) / high (2h) / P0 — blocking launch (1h)]

Please:
1. Summarise the relevant law(s) and their requirements for our specific use case
2. Identify any ⚠️ areas of uncertainty or active regulatory change
3. List what we would need to implement/change to be compliant
4. State explicitly what questions should be put to external counsel before we proceed
5. Note any pending items in legal/CLAUDE.md that this touches

Save output to: legal/briefs/[DATE]-[topic-slug].md
```

---

### Step 3 — Output Review Gate

All Legal Agent outputs **must** be reviewed before action:

| Output type | Reviewer | Gate |
|-------------|----------|------|
| Jurisdiction brief (new market) | CEO + external counsel | **Do NOT start development until lawyer sign-off** |
| Regulation summary (existing market) | CEO | May inform internal build decisions; external counsel for compliance assertions |
| Contract review prep | External lawyer | **Do NOT sign any contract** based solely on Legal Agent output |
| Gap check | Compliance Agent + CEO | Use to prioritise work; external counsel to confirm compliance posture |
| Sanctions screen | External OFAC counsel | **HARD BLOCK** — no feature work for sanctioned jurisdictions without written legal opinion |

---

### Step 4 — Pending Items Audit (run monthly with OPS-003)

```
Legal pending items review — [MONTH YEAR].

Check legal/CLAUDE.md "Pending Legal Review" sections for:
1. Any items marked [ ] (incomplete) — list them with original target date
2. Any items that were pending last month and are still pending — flag as overdue 🔴
3. Any new regulatory developments that affect existing open items
   (e.g. DPDP India rules published, APRA federal US bill progress)
4. For each overdue item: what is blocking it? Is external counsel engaged?

Output: pending items table with status, owner, blockers, revised target.
Save to: legal/briefs/[YYYY-MM]-pending-review.md
Include overdue items in OPS-003 monthly close report.
```

---

### Step 5 — Sanctions & High-Risk Jurisdiction Protocol

For any request touching Iran, North Korea, Cuba, Syria, Russia, Belarus, or any country on the OFAC SDN list:

```
⛔ HARD STOP — Sanctions jurisdiction detected.

DO NOT:
- Build any feature that enables transactions with users in [country]
- Store any personal data about residents of [country]
- Accept any payment from a [country] IP or payment method

DO:
1. Log request in legal/sanctions/[DATE]-[country]-inquiry.md
2. Tag CEO + Legal Agent immediately
3. Await written opinion from external OFAC counsel (contact: TBD — see legal/CLAUDE.md Key Contacts)
4. Do NOT proceed with any development until written clearance received

Note: legal/CLAUDE.md § "Iran: US OFAC + EU sanctions" — RESEARCH ONLY status.
```

---

### Legal Research Routing by Agent

| Scenario | Prompt recipient | CC |
|----------|-----------------|-----|
| New market feasibility | Legal Agent → brief → CEO → external counsel | Compliance Agent |
| Privacy law gap (GDPR/CCPA/LGPD) | Compliance Agent first; Legal Agent for complex interpretation | CEO |
| Payment regulation (local licensing) | Legal Agent | Finance Agent |
| Employment law (new hire, new country) | HR Agent first; Legal Agent if uncertain | CEO |
| Contract / vendor agreement | Legal Agent (prep) → external lawyer (review) | Finance Agent |
| IP / trademark / brand | Legal Agent → external IP counsel | CEO |
| Regulatory inquiry / regulator contact | **CEO handles — do not respond without CEO** | Legal Agent |

---

## OPS-021 · Regulatory Monitoring & Change Management

**Owner:** Legal Agent / Compliance Agent &nbsp;|&nbsp; **Frequency: Monthly** &nbsp;|&nbsp; **→ legal/CLAUDE.md + compliance/CLAUDE.md**

**Purpose:** Proactively track regulatory changes across active markets so the team is never surprised by a new law, fine, or regulator guidance.

---

### Monthly Regulatory Watch Prompt

Run first Monday of each month alongside OPS-003:

```
Regulatory monitoring — [MONTH YEAR].

Review recent regulatory developments across all UTUBooking active markets:

JURISDICTIONS TO CHECK:
- EU GDPR: edpb.europa.eu — any new guidelines, binding decisions, or enforcement actions
- UK GDPR: ico.org.uk/about-the-ico/what-we-do/legislation-and-regulations — any ICO guidance updates
- CCPA/CPRA: cppa.ca.gov — any new CPPA enforcement or rulemaking
- LGPD (Brazil): anpd.gov.br — any ANPD guidance or enforcement actions
- PIPEDA (Canada): priv.gc.ca — any OPC findings or guidance updates
- Turkey KVKK: kvkk.gov.tr — any board decisions or enforcement
- India DPDP: any published rules under DPDP Act 2023 (rules still pending as of 2026-03)
- US federal: any progress on American Privacy Rights Act (APRA) or sector-specific laws
- Saudi Arabia / Gulf: SAMA payment regulation updates, NCA cybersecurity guidance
- Indonesia: OJK fintech regulation updates; PDP Law 2022 enforcement guidance

FOR EACH JURISDICTION:
1. Any new requirement that UTUBooking does NOT currently meet? 🔴 Flag immediately
2. Any upcoming deadline (6-month window)? 🟡 Flag with date
3. Any new enforcement action against a company similar to UTUBooking? Note as risk signal
4. Any regulator statement we should communicate to external counsel?

Output: monthly regulatory watch report
Save to: legal/briefs/[YYYY-MM]-regulatory-watch.md
Flag any 🔴 items in #compliance-alerts immediately.
Tag CEO on any item with a hard deadline within 90 days.
```

---

### Regulatory Change Response Tiers

| Change type | Response | Timeline |
|-------------|----------|----------|
| New law published, in force > 12 months | Legal Agent brief → plan compliance roadmap | Within 30 days of publication |
| New law, in force < 6 months | **P1 — immediate brief** → fast-track compliance work | Within 7 days of discovery |
| Regulator enforcement action (similar company) | Risk assessment brief → CEO review | Within 14 days |
| Regulator contacts UTUBooking directly | **CEO only handles** — engage external counsel same day | Immediate |
| Adequacy decision revoked (e.g. UK/EU) | Activate SCC fallback → Dev Agent implements | Within 48h |
| Sanctions list updated | Ops Agent blocks affected country → Legal brief | Immediate |

---

## OPS-022 · Fraud & Risk Operations

**Owner:** Fraud Agent &nbsp;|&nbsp; **→ master-sop.md § FRD-001–003**

### Daily Fraud Briefing Prompt

```
Daily fraud operations briefing — [DATE].

1. QUEUE: How many pending fraud cases? GET /api/admin/fraud/cases?status=pending
   Cases with risk_score >= 70: list with booking_ref, amount_sar, flags.
   Cases awaiting workflow completion (auto-launched for score >= 70): check workflow engine.

2. STATS: GET /api/admin/fraud/stats
   Confirmed fraud SAR this month. False positive rate (target < 10%).
   Active watchlist entries. Active detection rules.

3. DECISIONS NEEDED (paste for CEO if any case >= SAR 5,000):
   Case [ID]: [booking_ref] | [amount_sar] SAR | score [X] | flags: [list]
   Recommendation: CONFIRM FRAUD / FALSE POSITIVE / ESCALATE
   Reason: [1-2 sentences]

4. RULE HEALTH: Any rule with hit_count spike > 2x 7-day average?
   Any rule with zero hits in 7 days (potential blind spot)?

Output: < 10 bullet points. Flag cases requiring CEO approval with [ACTION NEEDED].
```

### Rule Change Prompt (use when proposing any rule modification)

```
Fraud rule change proposal — [DATE].

Rule: [name]
Current condition: [JSON]
Proposed condition: [JSON]
Reason: [false positive reduction / new fraud pattern / routine tuning]
Expected impact: [quantified if possible]

False positive rate last 30 days: [X]% (target < 10%)
Hit count last 30 days: [X]

Note: All new/modified rules require CEO approval before activation.
New rules auto-launch approval workflow on POST /api/admin/fraud/rules.
NEVER delete rules — set active: false to preserve audit history.
```

### Watchlist Entry Prompt (use on every confirmed fraud decision)

```
Watchlist entry required — case [CASE_ID] — [DATE].

Evidence summary: [booking refs, amount SAR, flags fired]
Entries to add (POST /api/admin/fraud/watchlist):
  - email: [value] severity: [critical/high] expires_at: [24 months from today]
  - ip: [value] severity: [high] expires_at: [12 months from today]
  - card_bin: [first 6 digits] severity: [critical] expires_at: null (permanent)

GDPR NOTE: For EU/UK user watchlist entries, human approval required (Art. 22).
```

---

## OPS-023 · Revenue Management Operations

**Owner:** Revenue Agent &nbsp;|&nbsp; **→ master-sop.md § RVN-001–003**

### Seasonal Rule Setup Prompt (run 8 weeks before each season)

```
Seasonal pricing review — [SEASON] [YEAR] — setup session.

UPCOMING SEASONS (next 120 days):
  Check revenue_rules WHERE active=true AND start_date BETWEEN NOW() AND NOW() + INTERVAL '120 days'
  Are all upcoming seasonal rules already created and active?
  Any season without a rule? Flag — create via RVN-001 process.

COMPETITOR CHECK:
  Almosafer / Wego / Booking.com price for Makkah 4-star hotel on [PEAK DATE]?
  Our current displayed price for same hotel/date?
  Are we within +/- 10% of market? If gap > 15%, escalate to CEO.

RULE CONFLICTS:
  Any two active rules with overlapping date ranges and same hotel_id?
  Higher priority rule (lower number) will win — confirm this is the intended outcome.

DEMAND SIGNALS:
  Any hotels with < 20% availability showing on Hotelbeds for peak dates? → Consider urgency uplight.
  Any hotels with > 90% availability 4 weeks out → Consider demand stimulation discount.

Output: seasonal readiness report. Flag any gaps for CEO action.
```

### Monthly Revenue Check (part of GBL-002 monthly extension)

```
Monthly revenue performance — [MONTH YEAR].

GET /api/admin/revenue/targets?period=[YYYY-MM]
  RevPAR: target [X] | actual [Y] | variance [Z]%
  Occupancy: target [X]% | actual [Y]%
  ADR: target [X] SAR | actual [Y] SAR

If any metric > 10% below target: which hotels/markets dragged performance?
  Root cause: pricing too high? Low inventory? Competitor promotion?
  Recommended action: new demand rule? Direct hotel promotion? GDS rate adjustment?

Forward bookings next 30 days vs. same period last year: up/flat/down?
Any specific dates with < 40% occupancy? Propose demand stimulation rule.
Any specific dates with > 85% occupancy? Propose remaining inventory uplift.

Update revenue_targets.actual_revpar for [MONTH YEAR] after review.
```

### Emergency Override Protocol

```
URGENT: Emergency price override — [DATE] — [HOTEL] — [REASON].

Situation: [< 30 words describing the trigger]
Current price SAR [X] → Target price SAR [Y]
Affected dates: [list]

CRITICAL CHECK before override:
  Any confirmed bookings at current price for these dates? (If yes: honour them — no retroactive repricing)
  Any live shopping sessions (Redis: search:results:{hotelId}:*)? Clear cache after override.

POST /api/admin/revenue/overrides for each date with reason [minimum 20 words].
After override: clear Redis cache, test hotel search to confirm new price, notify CS team.
CEO approval required if carts already exist at old price.
```

---

## OPS-024 · Procurement Operations

**Owner:** Procurement Agent &nbsp;|&nbsp; **→ master-sop.md § PRC-001–003**

### Monthly Procurement Briefing

```
Monthly procurement briefing — [MONTH YEAR].

SLA STATUS: GET /api/admin/procurement/slas
  Breached SLAs: [list — supplier, metric, current value vs. target]
    Action: draft breach notification for CEO review. Check contract for remedy clause.
  At-risk SLAs: [list]
    Action: contact supplier, request remediation plan.
  Met SLAs: [count] — no action needed.

RENEWALS PIPELINE (next 90 days):
  Contracts expiring: [list — supplier, title, end_date, auto_renews, annual value SAR]
  For each:
    Renew / renegotiate / terminate? Recommendation + rationale.
    If auto_renews=true and we want to cancel: serve notice NOW if < 60 days to expiry.
    If renewing: flag to Legal Agent if value > SAR 100,000.

PENDING POs:
  POs in 'draft' or 'approved' but not yet 'sent': [list]
  POs in 'sent' past expected delivery date: [list — follow up with supplier]

SPEND SUMMARY:
  Active contract total value (SAR): [sum]
  POs paid this month (SAR): [sum]
  Budget remaining vs. annual procurement budget: flag if < 20% remaining.

Output: procurement health report (< 1 page).
Save to: docs/procurement/monthly-reports/[YYYY-MM]-procurement-review.md
```

### New Supplier Onboarding Prompt

```
New supplier onboarding — [SUPPLIER NAME] — [DATE].

PRE-CHECKS (required before creating DB record):
  [ ] Sanctions check: is [supplier name] + [country] on OFAC / UN / EU / UK HMT lists?
  [ ] GDPR: does supplier access EU/UK user PII? If yes, DPA required before go-live.
  [ ] Security: SOC 2 Type II or ISO 27001 cert? Request from supplier contact.
  [ ] SLA: what uptime/response guarantee? Minimum acceptable: 99.5% uptime.
  [ ] Contract value: > SAR 100,000/year? Legal Agent review required.

Once checks pass:
  POST /api/admin/procurement/suppliers — status: onboarding
  POST /api/admin/procurement/contracts — status: draft
  POST /api/admin/procurement/slas — one entry per contractual SLA metric
  After contract signed: PATCH supplier status → active
  Notify Dev Agent: supplier active, provision API credentials via AWS SSM.
```

### PO Approval Prompt (for requests >= SAR 10,000)

```
PO approval request — [SUPPLIER] — SAR [AMOUNT] — [DATE].

PO Number: PO-[YYYY]-[NNN]
Supplier: [name] (confirm exists in procurement_suppliers)
Description: [specific — not generic]
Amount: SAR [X]
Budget line: [Marketing / Dev / Ops / Legal / HR]
Budget remaining this [month/quarter]: SAR [Y] (after this PO: SAR [Z])
Business justification: [which project/OKR does this support?]
Expected delivery: [DATE]

Approval tier:
  < 10,000: self-approve
  10,000–49,999: CEO (48h)
  50,000–249,999: CEO + Finance Agent (72h)
  >= 250,000: CEO + Board notification (5 business days)

Awaiting [APPROVER] approval. Once approved: POST /api/admin/procurement/purchase_orders status=approved.
```

---

# APPENDICES

---

## A · Region & Market Reference

| Region | AWS | Markets | Primary Payment | Compliance |
|--------|-----|---------|-----------------|------------|
| KSA | me-south-1 (Bahrain) | SA | STC Pay, Mada | Saudi regulations |
| Gulf | me-central-1 (Riyadh) | AE, KW, JO | Local cards, Visa/MC | Gulf banking rules |
| North Africa | eu-west-1 (Ireland) | MA, TN | Cards, Stripe | GDPR-adjacent |
| EU | eu-central-1 (Frankfurt) | DE, FR, NL, BE, ES, CH, PL, IT | Stripe, TWINT (CH) | GDPR Art. 44 |
| UK | eu-west-2 (London) | GB | Stripe, Open Banking | UK GDPR |
| US | us-east-1 (Virginia) | US | Stripe, PayPal, Affirm | CCPA |
| Canada | ca-central-1 (Montreal) | CA | Interac (Bambora), Stripe | PIPEDA + Quebec Law 25 |
| LATAM | sa-east-1 (São Paulo) | BR, AR, CO, CL, MX, PE, UY | Pix, Boleto, MercadoPago | LGPD |
| APAC | ap-southeast-1 / ap-south-1 | ID, MY, PK, IN | Midtrans, iPay88, JazzCash, Razorpay | DPDP (IN), local |

---

## B · Compliance SLA Cheat Sheet

| Law | Region | Request SLA | Breach Notification | Regulator |
|-----|--------|-------------|---------------------|-----------|
| GDPR | EU (27 countries) | 30 days | 72h → DPA | Each EU member DPA |
| UK GDPR | United Kingdom | 30 days | 72h → ICO | ICO (ico.org.uk) |
| CCPA | California, US | 45 days | No mandatory window | California AG / CPPA |
| PIPEDA | Canada (federal) | 30 days | ASAP if real risk | OPC (priv.gc.ca) |
| Quebec Law 25 | Quebec, Canada | 30 days | 72h → CAI | CAI (cai.gouv.qc.ca) |
| LGPD | Brazil | 15 business days | 72h → ANPD | ANPD (anpd.gov.br) |
| DPDP | India | As prescribed | As prescribed | DPB (rules pending) |
| KVKK | Turkey | 30 days | 72h → KVKK Board | KVKK (kvkk.gov.tr) |

---

---

## OPS-030 · Inventory Health Operations

**Owner:** Ops Agent &nbsp;|&nbsp; **→ master-sop.md § INV-001–002**

### Weekly Inventory Check (part of GBL-002 Monday Report)

```
Weekly inventory health — [DATE].

GET /api/admin/inventory?type=hotels — total | active | disabled count
GET /api/admin/inventory?type=flights — active routes
GET /api/admin/inventory?type=cars — active categories

CRITICAL — MAKKAH/MADINAH COVERAGE:
  Active hotels in Makkah zone: [n] — minimum 5 per star tier (3★/4★/5★)
  Active hotels in Madinah zone: [n] — minimum 3 per star tier
  All Makkah properties is_halal_friendly=true? (mandatory — no exceptions)
  Any Makkah hotel disabled this week? Reason?

HAJJ READINESS (if within 12 weeks of Hajj):
  Run INV-002 Hajj checklist — all items must be green before Hajj season
  CEO notified if any item fails and < 6 weeks to Hajj

AI INVENTORY ADVISOR:
  Panel at /admin/inventory → run ✦ AI Inventory Advisor
  inventory_health | priority gaps (critical → action today, high → action this week)

Output: inventory health table. Any critical gap = CEO escalation same day.
```

---

## OPS-031 · Loyalty Programme Operations

**Owner:** Ops Agent &nbsp;|&nbsp; **→ master-sop.md § LOY-001–002**

### Weekly Loyalty Check (part of GBL-002 Monday Report)

```
Weekly loyalty programme — [DATE].

GET /api/admin/loyalty/stats
  Total members | Tier breakdown (Bronze/Silver/Gold/Platinum) | Points outstanding SAR liability

FLAGS:
  Any tier with > 20% fewer members than last month? → churn signal, brief CS Agent
  Redemption rate (points redeemed / outstanding) < 10%? → reward catalogue friction, flag to Products
  Points outstanding SAR liability > 500,000? → alert Finance Agent immediately

AI LOYALTY ADVISOR: /admin/loyalty → ✦ AI Loyalty Programme Advisor
  programme_health | churn_risk_segments | Gulf reward recommendations

Monthly (1st): run LOY-002 — points expiry, tier upgrades, reward catalogue review, Finance briefing
```

---

## OPS-032 · Booking Operations

**Owner:** Ops Agent + CS Agent &nbsp;|&nbsp; **→ master-sop.md § BKG-001–002**

### Daily Booking Queue (part of GBL-001 Morning Briefing)

```
Daily booking operations — [DATE].

GET /api/admin/bookings/stats — pending | confirmed | cancelled | refunded
GET /api/admin/bookings?status=pending&sort=created_asc

URGENT — PENDING > 2 HOURS:
  Any pending booking > 2h = customer paid but not confirmed = P1
  Check: payment captured? Supplier confirmed?
  If payment OK but supplier failed: manually confirm OR refund within 30 min
  CS contacts customer within 30 min with status update

AI BOOKING INSIGHTS: /admin/bookings → ✦ AI Booking Insights
  anomaly type | health | risk flags
  Any anomaly? Cross-check Fraud Agent (coordinated fake bookings possible)

PATTERN FLAGS:
  Single user > 3 bookings in 24h → Fraud Agent
  Booking from watchlisted email/IP → Fraud Agent immediate review
  Hajj booking > SAR 20,000 > 6 months out → manual CEO confirmation

Cancellation spike > 2x 7-day avg → investigate pricing/competitor issue
Refund > SAR 10,000 → Finance Agent notified
```

---

## OPS-033 · Wallet Operations

**Owner:** Finance Agent + Ops Agent &nbsp;|&nbsp; **→ master-sop.md § WAL-001**

### Weekly Wallet Check (part of GBL-002 Monday Report)

```
Weekly wallet review — [DATE].

GET /api/admin/wallet?view=stats — balances by currency, weekly transaction volume

AML FLAGS (report to Finance + Fraud Agent immediately):
  Single wallet balance > SAR 50,000
  Wallet with > 10 transactions in 24h (structuring pattern)
  Admin-credited round numbers (10K/50K/100K SAR) without documented CEO approval

CREDIT AUTHORITY (for any pending CS credit requests):
  < SAR 500: CS Agent self-approve
  SAR 500–4,999: Finance Agent approval
  SAR 5,000–24,999: CEO approval
  >= SAR 25,000: CEO + Board notification + full incident report

POST /api/admin/wallet/credit only after approval confirmed.
All credits: log reason, booking ref, authorised-by in Finance expense claims.
```

---

## OPS-034 · Promo Code Operations

**Owner:** Marketing Agent + Finance Agent &nbsp;|&nbsp; **→ master-sop.md § PRO-001**

### Code Creation Rule

```
Promo code creation — [CAMPAIGN] — [DATE].

REQUIRED before creating:
  Budget signed off by Finance Agent (max redemption value = max_uses × avg_discount)
  Finance approval: redemption value > SAR 10,000
  CEO approval: redemption value > SAR 50,000

MANDATORY fields — never skip:
  max_uses: [n] — NEVER leave NULL (open-ended liability)
  max_uses_per_user: 1 (standard) or [n] (loyalty only, documented)
  minimum_order_value: SAR 300 minimum (abuse prevention)
  valid_until: set always — no open-ended codes
  applicable_to: scope to hotel/flight/car where possible (not "all" by default)

POST /api/admin/promo-codes after approval confirmed.
```

### Monthly Code Audit (1st of month)

```
Promo code audit — [MONTH YEAR].

GET /api/admin/promo-codes — all codes with use rates

Deactivate: codes past valid_until, campaign-ended codes (PATCH active=false)
Flag: codes used at > 5x expected rate (possible viral leak)
Flag: codes in fraud_cases (Fraud Agent)
Flag: single user used > 3 different codes in 30 days (monitoring)

Finance briefing: total promotional spend SAR this month.
Save: docs/marketing/promo-audits/[YYYY-MM]-promo-audit.md
```

---

## OPS-025 · Analytics & BI Operations

**Owner:** Analytics Agent &nbsp;|&nbsp; **→ master-sop.md § ANA-001–002**

### Weekly KPI Pulse (runs inside GBL-002 Monday Report)

```
Weekly KPI health check — [DATE].

GET /api/admin/analytics/stats — on_target | off_target | active_alerts
GET /api/admin/analytics/kpis — full KPI list with current_value vs. target_value

Traffic light each KPI:
  🔴 < 90% of target (or > 110% for cost metrics hours/ms)
  🟡 90–99% (or 100–110% for cost)
  🟢 >= 100% (or <= 100% for cost)

For each 🔴 metric: owner, gap amount, one recommended action.
PATCH /api/admin/analytics/kpis/:id current_value for any metric refreshed this week.
Alert check: GET /api/admin/analytics/alerts — any last_fired_at within 7 days? Notify owner.

Output: KPI table in traffic-light format. 🔴 metrics escalated to CEO.
```

### Monthly BI Report Prompt (part of GBL-003 Monthly Close)

```
Monthly BI report — [MONTH YEAR].

Cover: Revenue SAR vs. target | Bookings & conversion funnel | MAU | Ops health (ticket resolution, API errors)
Scheduled reports not run in 30 days: list — investigate and run.
Alerts tuning: firing daily (threshold too tight) | never fired in 90 days (too loose) — adjust.
Save to Notion > Analytics > Monthly Reports > [YYYY-MM].
```

---

## OPS-026 · Business Development Operations

**Owner:** BizDev Agent &nbsp;|&nbsp; **→ master-sop.md § BIZ-001–003**

### Weekly Pipeline Prompt (runs inside GBL-002 Monday Report)

```
BizDev pipeline review — week ending [DATE].

GET /api/admin/bizdev/stats — partner counts by status, total agreement value SAR
GET /api/admin/bizdev/agreements/expiring?days=90 — flag any expiring deals

STALE PIPELINE (action required):
  Partners in 'prospect' with last_contacted_at > 7 days: list → draft outreach for CEO
  Partners in 'negotiating' with no activity in > 14 days: flag to CEO — deal at risk

MARKET STATUS: GET /api/admin/bizdev/markets?status=researching,pilot
  Any market ready to advance status? Update PATCH /api/admin/bizdev/markets/:id

Activity logging rule: every partner interaction logged within 1 hour via
  POST /api/admin/bizdev/partners/:id/activities — type, summary, owner

Output: pipeline table (partner name, status, last_contacted, deal value) + action items.
```

### New Market Assessment Trigger

Any new country interest from CEO or inbound partner → run BIZ-002 assessment before any spend. Save to `docs/bizdev/market-assessments/[ISO]-[DATE].md`. CEO sign-off required.

---

## OPS-027 · Advertising Operations

**Owner:** BizDev Agent (advertising) &nbsp;|&nbsp; **→ master-sop.md § ADV-001–002**

### Daily Advertising Queue Check (part of GBL-001 Morning Briefing)

```
Advertising enquiry check — [DATE].

GET /api/admin/advertising/stats — new | contacted | qualified | won
GET /api/admin/advertising/enquiries?status=new

For each new enquiry:
  Genuine advertiser? → PATCH status: contacted, draft response for CEO review
  Spam/irrelevant? → PATCH status: archived, admin_notes: 'spam'

SLA: no new enquiry sits unactioned > 4 hours during business hours.
SLA: qualified advertiser receives proposal draft within 48 hours.

Conversion tracking: won / total. Target > 15% enquiry-to-deal rate.
Flag to CEO if > 5 new enquiries unactioned from prior day.
```

---

## OPS-028 · Affiliates Operations

**Owner:** BizDev Agent (affiliates) &nbsp;|&nbsp; **→ master-sop.md § AFF-001–002**

### Weekly Application Review (part of GBL-002 Monday Report)

```
Affiliate application review — [DATE].

GET /api/admin/affiliates/stats — pending applications | active partners | unpaid balance SAR
GET /api/admin/affiliates/applications?status=pending

For each pending application (SLA: review within 48h):
  Qualify: travel/Islamic/Gulf content + audience >= 1k + active + brand-safe?
  Approve: POST /api/admin/affiliates/applications/:id/approve
    Tier: over_100k → elite (6%) | 10k_100k → pro (5%) | under_10k → starter (3%)
  Reject: PATCH status: rejected + admin_notes (brief reason)

After approval: draft welcome email for team review (include referral_code + dashboard link).
Never send welcome email without confirming referral_code is active in DB.
```

### Monthly Payout Run (1st of month, part of FIN-001 extended)

```
Affiliate payout run — [MONTH YEAR].

1. Calculate unpaid balance per active partner (total_earned_sar - total_paid_sar)
2. Partners with balance >= SAR 200: create payout records (POST /api/admin/affiliates/payouts)
3. Fraud check before any payout: conversion rate > 15% or all bookings same IP? → pause + investigate
4. Finance Agent approval for total payout batch
5. Process transfers by partner's preferred method (bank/PayPal/Wise/STC Pay)
6. PATCH payout status → paid, update partner total_paid_sar
7. Send payout confirmation emails (CEO/team review first)

Save payout summary: docs/affiliates/payouts/[YYYY-MM]-payout-run.md
```

---

## OPS-029 · Corporate Travel Operations

**Owner:** Sales Agent &nbsp;|&nbsp; **→ master-sop.md § CORP-001–002**

### Daily Corporate Enquiry Check (part of GBL-001 Morning Briefing)

```
Corporate travel enquiry check — [DATE].

GET /api/admin/corporate/enquiries?status=new
SLA: respond within 4 hours of new enquiry during business hours.

For each new enquiry:
  Traveller count + industry → estimate annual value (travellers * 12 trips * SAR avg)
  Is company already in corporate_accounts? Search first.
  Draft response for CEO review — personalise to industry (government, oil_gas, finance prioritised)
  PATCH status: contacted after CEO approves and email is sent
  Create account record (status: prospect) if not already in DB

Qualification goal: discovery call booked within 48h of first response.
```

### Monthly Corporate Account Health (part of GBL-002 Monthly)

```
Corporate account health — [MONTH YEAR].

GET /api/admin/corporate/accounts?status=active
For each account:
  Monthly spend SAR vs. budget run rate — on track / under / over?
  Last activity date — any account silent > 30 days? → check-in call required
  Contracts expiring in 90 days → renewal conversation must start NOW

New enquiry conversion rate: [enquiries] → [accounts won] = [X]%
Enterprise accounts at churn risk: flag to CEO with recommended retention action.
```

---

## OPS-035 · CRM Deal Pipeline

**Owner:** Sales Agent &nbsp;|&nbsp; **→ master-sop.md § CRM-001–002**

### Daily Deal Review (part of GBL-001)

```
CRM pipeline check — [DATE].

GET /api/admin/crm/stats — pipeline value, stage distribution, overdue count
GET /api/admin/crm/overdue — deals with overdue next_action_date

For each overdue deal:
  Log activity. Update next_action_date. Advance stage if warranted.
  Deal in proposal/negotiation > 14 days with no activity → CEO review required.

Focus on:
  - New leads (last 48h): qualify + advance to 'qualified' or log disqualification reason
  - Investor pipeline: CEO reviews personally before any stage advance
  - Hotel partner deals in Makkah/Madinah: treat as P1 priority
```

### Weekly Hotel Partner Review (part of GBL-002)

```
Hotel partner outreach — [DATE].

GET /api/admin/crm/hotel-partners — filter last_contacted_at < [30 days ago]

Priority 1 (Makkah/Madinah, 5★, distance < 300m): bilingual AR+EN outreach draft for CEO approval.
Priority 2 (Gulf business destinations): English outreach.
After CEO approval: log activity, update last_contacted_at.

Target: Makkah 5★ signed >= 5 per star tier. Madinah 5★ signed >= 3.
Alert CEO: any Priority 1 Makkah hotel still in 'prospect' status by April of Hajj year.
```

---

## OPS-036 · Ops Department — Incidents & Ticket Queue

**Owner:** Ops Agent + Dev Agent &nbsp;|&nbsp; **→ master-sop.md § OPS-001–002**

### Morning Incident Check (part of GBL-001)

```
Ops incident review — [DATE].

GET /api/admin/ops/stats — open incidents by severity, SLA-breaching count

Critical or high incidents open:
  GET /api/admin/ops/incidents?status=open&severity=critical
  GET /api/admin/ops/incidents?status=open&severity=high

For each:
  PATCH status → 'investigating'. Notify Dev Agent.
  Critical open > 1h → escalate to EMG-001 (full outage SOP).

Resolve: GET /api/admin/ops/incidents?status=investigating
  Confirm fix with Dev Agent → PATCH status → 'resolved' + resolved_at.

Ticket urgent queue: GET /api/admin/ops/tickets?status=open&priority=urgent
  SLA: 30-min response. PATCH → in_progress, assign agent.
  Multiple tickets same category in one day → consider creating an incident.
```

---

*Document version: Phase 12+ (updated 2026-04-12 — added OPS-022–036: Fraud, Revenue, Procurement, Analytics, BizDev, Advertising, Affiliates, Corporate, Inventory, Loyalty, Bookings, Wallet, Promo Codes, CRM, Ops Department). Maintained by: Ops Agent.
Next review: Phase 13 launch or any new market entry — whichever comes first.*
