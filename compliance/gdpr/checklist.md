# GDPR Compliance Checklist — UTUBooking

**Regulation:** GDPR (EU) 2016/679 + UK GDPR (post-Brexit)
**DPO Email:** dpo@utubooking.com
**Last reviewed:** 2026-03-24

---

## Lawful Basis (Art. 6)

| Processing Activity            | Lawful Basis                   | Notes                                      |
|-------------------------------|--------------------------------|--------------------------------------------|
| Booking creation & fulfilment | Contract (Art. 6(1)(b))        | Name, email, phone, payment                |
| Tax & invoicing records        | Legal obligation (Art. 6(1)(c))| 7-year retention                           |
| Analytics (usage data)         | Consent (Art. 6(1)(a))         | Opt-in only — GDPRConsentBanner            |
| Marketing emails               | Consent (Art. 6(1)(a))         | Opt-in only — separate consent record      |
| Fraud prevention               | Legitimate interest (Art. 6(1)(f)) | LIA documented in DPA register         |

---

## Consent Requirements (Art. 7 + Recital 32)

- [x] No pre-ticked boxes — all optional categories default to OFF
- [x] Granular consent — separate toggles for Analytics and Marketing
- [x] Freely given — service not conditional on non-necessary consent
- [x] Specific & informed — each category explained in plain language
- [x] As easy to withdraw as to give — "Change preferences" bar shown after decline
- [x] Audit log — every consent decision stored in `consent_log` (Redis + DB)
- [x] Consent version tracked — bump `CONSENT_VERSION` in GDPRConsentBanner.tsx when privacy policy changes

---

## Data Subject Rights (Art. 12–23)

| Right                    | Art. | Endpoint                          | SLA      | Status |
|--------------------------|------|-----------------------------------|----------|--------|
| Right of access          | 15   | GET  /api/user/gdpr/export        | 30 days  | ✅ Built |
| Right to rectification   | 16   | PATCH /api/user/profile           | 30 days  | ✅ Existing |
| Right to erasure         | 17   | POST /api/user/gdpr/erase         | 30 days  | ✅ Built |
| Right to restriction     | 18   | POST /api/user/gdpr/erase (soft)  | 30 days  | ✅ Partial |
| Right to portability     | 20   | POST /api/user/gdpr/portability   | 30 days  | ✅ Built |
| Right to object          | 21   | POST /api/user/gdpr/erase         | Immediate| ✅ Built |
| Consent withdrawal       | 7(3) | GET  /api/user/gdpr/consents      | Immediate| ✅ Built |

---

## Data Transfers (Art. 44–49)

| Transfer                          | Mechanism             | Status |
|-----------------------------------|-----------------------|--------|
| EU users → AWS Frankfurt (eu-central-1) | Same jurisdiction | ✅ |
| EU users → AWS Bahrain (me-south-1) | Standard Contractual Clauses (SCCs) | ⚠️ Needs DPA with AWS |
| Third-party payment gateways (Stripe) | SCCs + Stripe DPA  | ✅ |
| Analytics (if enabled)            | SCCs required         | ⚠️ DPA needed per vendor |

---

## Technical Safeguards (Art. 25 — Privacy by Design)

- [x] Data minimisation — only fields required for booking collected
- [x] Encryption at rest — AWS KMS on all RDS instances
- [x] Encryption in transit — TLS 1.2+ enforced at nginx/ALB
- [x] Pseudonymisation — `userId` UUID (not email) used as primary key in logs
- [x] Access control — JWT auth on all GDPR endpoints; admin requires ADMIN_SECRET
- [x] Rate limiting — 5 GDPR requests per 15 min per user
- [x] Soft delete — PII anonymised immediately on erasure request
- [ ] DPIA — Data Protection Impact Assessment required for AI pricing engine (Art. 35)
- [ ] Breach notification procedure — must notify ICO/SA within 72 hours (Art. 33)

---

## Records of Processing Activities (Art. 30)

See: `compliance/gdpr/dpa-register.md`

---

## Action Items

| # | Item                                                      | Owner | Due        | Status |
|---|-----------------------------------------------------------|-------|------------|--------|
| 1 | Sign DPA with AWS (processor agreement)                   | Legal | 2026-04-07 | ⬜     |
| 2 | Conduct DPIA for AI pricing engine                        | DPO   | 2026-04-14 | ⬜     |
| 3 | Appoint formal EU Representative (Art. 27) if needed     | Legal | 2026-04-07 | ⬜     |
| 4 | Register with ICO (UK) if >250 employees or high-risk    | Legal | 2026-04-07 | ⬜     |
| 5 | Run DB migration 20260324000026 in prod                  | DevOps| 2026-03-25 | ⬜     |
| 6 | Add GDPRConsentBanner to frontend layout                  | Dev   | 2026-03-25 | ⬜     |
| 7 | Mount gdpr.router on auth service at /api/user/gdpr       | Dev   | 2026-03-25 | ⬜     |
| 8 | Publish privacy policy at /privacy                        | Legal | 2026-03-31 | ⬜     |
| 9 | Set up breach notification workflow (72h SLA)             | DPO   | 2026-04-07 | ⬜     |
