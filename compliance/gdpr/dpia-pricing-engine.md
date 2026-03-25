# Data Protection Impact Assessment (DPIA)
## AI Revenue Optimization / Pricing Engine

**GDPR Art. 35 — Required for processing that is "likely to result in a high risk"**
**Art. 35(3)(a) — Systematic automated processing to evaluate personal aspects**

| Field            | Value                                      |
|------------------|--------------------------------------------|
| System name      | UTUBooking AI Pricing Engine               |
| Service          | `backend/services/pricing/` (port 3011)    |
| AI model         | Anthropic Claude claude-sonnet-4-6             |
| DPIA version     | 1.0                                        |
| Date             | 2026-03-24                                 |
| DPO review       | Pending DPO sign-off                       |
| DPO email        | dpo@utubooking.com                         |

---

## 1. Description of Processing

### What the system does
The AI Pricing Engine calls `claude-sonnet-4-6` with the following inputs every 6 hours:
- Hotel occupancy % (aggregated, not per-user)
- Demand forecast (% of predicted capacity)
- Season context (Hajj 26 May–2 Jun 2026, Umrah peak Oct–Feb, normal)
- Historical booking volume (aggregated counts, not individual bookings)

The model returns: `{ recommendedPrice, confidenceScore, reasoning, multiplier }`

### Data flow
```
Lambda cron (every 6h)
  → pricing.service.js → Claude API (external processor)
  → recommendedPrice stored in Redis (6h TTL) + pricing_recommendations table
  → demand.service.js reads bookings aggregate → if >80% predicted → push notification
      to gold/platinum loyalty users via POST /api/notifications/push
```

### Does it involve personal data?
**Directly: No.** The Claude API call receives only aggregated metrics (occupancy %, demand %).

**Indirectly (push notification path):** When demand >80%, the notification service retrieves gold/platinum user IDs from the loyalty service and sends push notifications. This constitutes targeting based on loyalty tier.

---

## 2. Necessity and Proportionality Assessment

| Question                                                           | Answer |
|--------------------------------------------------------------------|--------|
| Is there a clear legitimate purpose?                               | Yes — dynamic pricing is standard in the travel industry; maximises hotel partner revenue and ensures availability |
| Could a less privacy-invasive approach achieve the same purpose?   | Partially — static seasonal pricing tables could substitute but would be significantly less effective for Hajj surge pricing |
| Is data minimised?                                                 | Yes — no PII enters the AI model; only aggregated metrics |
| Is the pricing decision communicated transparently to users?       | Partial — users see the price but not the AI reasoning. Privacy policy discloses automated pricing (Art. 22 notice) |
| Are data subjects able to contest the price?                       | Yes — users can email support for a human review |

**Lawful basis:** Art. 6(1)(f) — Legitimate interest (revenue optimisation, industry standard practice).
**LIA conclusion:** The legitimate interest is not overridden by data subject interests — pricing is visible, non-discriminatory (same multiplier per hotel, not per user), and contestable.

---

## 3. Risk Assessment

### Risk 1 — Price discrimination by nationality
**Description:** If the model were given per-user context (nationality, booking history), it could charge different prices to different nationalities — potentially discriminatory.

**Current mitigation:** The model receives NO per-user data. Price is set per hotel × date pair, applied equally to all users.

**Residual risk:** LOW ✅

---

### Risk 2 — Automated decision-making under Art. 22
**Description:** If the pricing recommendation has a "legal effect" or "similarly significant effect" on users, Art. 22 protections apply (right to human review, opt-out).

**Assessment:** The recommended price is a market price, not a decision about a specific data subject. Users can book at the displayed price or leave — no individual is uniquely disadvantaged.

**Conclusion:** Art. 22 does **not** apply to aggregate pricing (consistent with EDPB Guidelines 05/2020 §16).

**Residual risk:** LOW ✅ (re-assess if per-user pricing is introduced)

---

### Risk 3 — Push notification targeting by loyalty tier
**Description:** Gold/platinum users receive demand-spike push notifications. This uses the loyalty tier (processed data) to target communications.

**Mitigation:**
- Lawful basis: Consent (users opted into push notifications)
- Consent is captured in `push:sub:{userId}` Redis key — absent key = no notification
- Users can unsubscribe via DELETE /api/notifications/subscribe

**Residual risk:** LOW ✅ (consent-gated)

---

### Risk 4 — Claude API as external processor
**Description:** Aggregated pricing context is sent to Anthropic's API (USA-based processor).

**Mitigation required:**
- Sign a **Data Processing Agreement (DPA) with Anthropic** (Art. 28)
- Confirm Anthropic's SCCs for EU → USA transfer
- Verify Anthropic's data retention policy for API inputs (confirm no training on inputs)

**Current status:** ⚠️ **DPA with Anthropic not yet signed — BLOCKER for EU go-live**

**Residual risk:** MEDIUM ⚠️ (until Anthropic DPA is signed)

---

### Risk 5 — Redis cache exposure
**Description:** Pricing recommendations cached in Redis with 6h TTL. If Redis is compromised, hotel pricing strategy is exposed (business-sensitive, not personal data).

**Mitigation:** Redis cluster with auth token (`REDIS_AUTH_TOKEN`), encrypted in transit, no PII in cache keys.

**Residual risk:** LOW ✅ (business risk, not data subject risk)

---

## 4. Measures to Address Risk

| Risk                        | Measure                                                           | Owner   | Due        | Status |
|-----------------------------|-------------------------------------------------------------------|---------|------------|--------|
| Claude API as processor     | Sign DPA with Anthropic; verify SCCs                             | Legal   | 2026-04-07 | ⬜     |
| Art. 22 notice in policy    | Add automated pricing disclosure to /privacy page                 | Legal   | 2026-03-31 | ⬜     |
| Human review right          | Support ticket flow for price contestation documented in policy   | Product | 2026-03-31 | ⬜     |
| Per-user pricing prevention | Code review gate: never pass userId/nationality to pricing model  | Dev     | Ongoing    | ✅     |
| Push consent gate           | Already implemented — no sub = no notification                   | Dev     | Done       | ✅     |
| Monitor for model drift     | Quarterly review of price multiplier distribution by country     | DPO     | Quarterly  | ⬜     |

---

## 5. DPO Consultation (Art. 35(2))

This DPIA must be reviewed and approved by the DPO before the pricing engine processes data of EU residents.

**DPO review checklist:**
- [ ] Confirm no PII enters Claude API calls (review pricing.service.js inputs)
- [ ] Review Anthropic DPA / SCCs
- [ ] Confirm push notification consent gate is auditable
- [ ] Sign-off on LIA for Art. 6(1)(f) basis
- [ ] Review residual risks and accept or escalate

**DPO signature:** _________________________ **Date:** _____________

---

## 6. Supervisory Authority Consultation

Art. 35(9) requires consultation with the supervisory authority if residual risks remain high after measures are implemented.

**Current conclusion:** Residual risks are LOW after the Anthropic DPA is signed. SA consultation is **not required** provided the DPA is in place before EU go-live.

**Re-assess if:** per-user pricing is introduced, or if the model is changed to receive any personal data.

---

## 7. Review Schedule

| Event                              | Action                    |
|------------------------------------|---------------------------|
| Before EU go-live                  | DPO sign-off required     |
| Anthropic model change             | Re-assess data inputs     |
| Introduction of per-user pricing   | Full DPIA re-run required |
| Annual review                      | 2027-03-24                |
| Any Art. 33 breach involving model | Immediate DPIA update     |
