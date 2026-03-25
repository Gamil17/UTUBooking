# Records of Processing Activities (RoPA)
**GDPR Art. 30 — Controller: UTUBooking Ltd**
**DPO:** dpo@utubooking.com
**Last updated:** 2026-03-24

---

## Processing Activity 1 — Hotel & Hajj/Umrah Booking Fulfilment

| Field                    | Detail |
|--------------------------|--------|
| **Purpose**              | Create and manage hotel bookings for Hajj/Umrah pilgrims |
| **Lawful basis**         | Art. 6(1)(b) — Contract performance |
| **Special category data**| Religious belief (implied by Hajj/Umrah context) — Art. 9(2)(a) explicit consent obtained |
| **Data subjects**        | Registered users, guests |
| **Categories of data**   | Name, email, phone, nationality, passport number, booking details, payment method (tokenised) |
| **Recipients**           | Hotelbeds API (hotel inventory), STC Pay/Stripe/Iyzico/Midtrans/iPay88 (payment processing) |
| **Transfer to 3rd countries** | AWS Bahrain (me-south-1) via SCCs; payment gateways via their respective DPAs |
| **Retention period**     | Active contract + 7 years (tax/legal obligation) |
| **Technical safeguards** | TLS 1.2+, AES-256 at rest, JWT auth, row-level security |

---

## Processing Activity 2 — User Account Management

| Field                    | Detail |
|--------------------------|--------|
| **Purpose**              | Authentication, account security, customer support |
| **Lawful basis**         | Art. 6(1)(b) — Contract; Art. 6(1)(f) — Legitimate interest (fraud prevention) |
| **Data subjects**        | Registered users |
| **Categories of data**   | Email, hashed password, phone, locale, country |
| **Recipients**           | AWS Cognito / internal auth service only |
| **Retention period**     | Duration of account + 30 days post-deletion (for abuse prevention) |
| **Technical safeguards** | Bcrypt password hashing, refresh token rotation, rate limiting |

---

## Processing Activity 3 — Analytics (Consent-Based)

| Field                    | Detail |
|--------------------------|--------|
| **Purpose**              | Product analytics, conversion optimisation |
| **Lawful basis**         | Art. 6(1)(a) — Consent (granular opt-in in GDPR banner) |
| **Data subjects**        | Users who granted analytics consent |
| **Categories of data**   | Page views, search queries, booking funnel steps (pseudonymised userId) |
| **Recipients**           | Internal ELK stack (AWS Frankfurt); no third-party analytics without SCCs |
| **Retention period**     | 13 months (standard analytics window) |
| **Withdrawal**           | Immediate on consent withdrawal — consent_log records withdrawal |

---

## Processing Activity 4 — Marketing Communications (Consent-Based)

| Field                    | Detail |
|--------------------------|--------|
| **Purpose**              | Personalised Hajj/Umrah offers, seasonal promotions |
| **Lawful basis**         | Art. 6(1)(a) — Consent (marketing toggle in GDPR banner) |
| **Data subjects**        | Users who granted marketing consent |
| **Categories of data**   | Email, booking history, locale, preferred destinations |
| **Recipients**           | Internal notification service (port 3008) |
| **Retention period**     | Until consent withdrawn or account deleted |
| **Withdrawal**           | Available via /api/user/gdpr/consents |

---

## Processing Activity 5 — AI Pricing Engine

| Field                    | Detail |
|--------------------------|--------|
| **Purpose**              | Dynamic hotel pricing recommendations based on occupancy & demand |
| **Lawful basis**         | Art. 6(1)(f) — Legitimate interest (revenue optimisation) |
| **Automated decisions**  | Yes — pricing recommendations (Art. 22 applies if decisions have legal effect) |
| **DPIA required**        | YES — AI with automated decision-making (Art. 35(3)(a)) |
| **Data subjects**        | Indirectly — booking patterns aggregated by date/hotel |
| **Categories of data**   | Anonymised occupancy %, demand metrics, seasonal flags — no direct PII |
| **Retention period**     | 6h cache (Redis); snapshots 90 days (DB) |

---

## Third-Party Processors (Art. 28)

| Processor        | Purpose           | DPA Signed | Transfer Mechanism |
|------------------|-------------------|------------|--------------------|
| AWS              | Infrastructure    | ⚠️ Pending | SCCs (AWS DPA)     |
| Stripe           | EU card payments  | ✅ Yes     | Stripe DPA + SCCs  |
| STC Pay          | KSA payments      | ⬜ TBD     | N/A (KSA only)     |
| Iyzico           | TR payments       | ⬜ TBD     | KVKK-compliant     |
| Midtrans         | ID payments       | ⬜ TBD     | Indonesian PDL     |
| Hotelbeds        | Hotel inventory   | ⬜ TBD     | SCCs needed        |
| JazzCash         | PK payments       | ⬜ TBD     | PDPA-PK compliant  |

---

## Data Breach Response Plan (Art. 33–34)

1. **Detection** — Grafana/PagerDuty alert triggers within 15 min
2. **Assessment** — Security team classifies severity within 2h
3. **Notification to SA** — within 72h of becoming aware (Art. 33)
4. **Notification to subjects** — if high risk to individuals (Art. 34), without undue delay
5. **DPO notification email:** dpo@utubooking.com
6. **Supervisory Authority contacts:**
   - UK: ICO — ico.org.uk (report online)
   - EU lead SA: Ireland DPCC (if Irish entity) or relevant national SA
