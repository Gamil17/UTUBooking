---
> DRAFT — REQUIRES TECHNICAL REVIEW BEFORE INVESTOR DISTRIBUTION
> UTUBooking.com | Technical Architecture Overview | March 2026
---

# UTUBooking — Technical Architecture Overview

## 1. Architecture Philosophy

UTUBooking is built microservices-first, enabling independent scaling and deployment of each domain (hotels, flights, loyalty) without full-system downtime. The platform is Arabic-native from day one — RTL layout, Arabic full-text handling, and SAR currency logic are first-class concerns, not afterthoughts. All infrastructure runs on AWS GCC (Bahrain region) to guarantee data residency and full compliance with Saudi Arabia's Personal Data Protection Law (PDPL).

---

## 2. System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                      │
│                                                                            │
│   ┌─────────────────────────┐        ┌──────────────────────────────┐     │
│   │  Mobile App             │        │  Web App                     │     │
│   │  React Native / Expo 55 │        │  Next.js (SSR + API routes)  │     │
│   │  iOS & Android          │        │  EN / AR  |  RTL support     │     │
│   └────────────┬────────────┘        └──────────────┬───────────────┘     │
└────────────────┼──────────────────────────────────────┼───────────────────┘
                 │  HTTPS                               │  HTTPS
                 ▼                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        CDN  LAYER                                          │
│               AWS CloudFront  (static assets, hotel images)                │
└───────────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                                          │
│                    Nginx Reverse Proxy                                     │
│         Rate Limiting | SSL Termination | Path-based Routing               │
└──────┬──────────────┬──────────────────┬──────────────┬────────────────────┘
       │              │                  │              │
       ▼              ▼                  ▼              ▼
┌────────────┐ ┌────────────┐  ┌─────────────────┐ ┌────────────────────┐
│   hotel-   │ │  flight-   │  │   loyalty-      │ │   AI Chat          │
│  service   │ │  service   │  │   service       │ │   Service          │
│  :3003     │ │  :3004     │  │   :3008         │ │  /api/chat (SSE)   │
│            │ │            │  │                 │ │  claude-sonnet-4-6 │
│ Node.js    │ │ Node.js    │  │ Node.js         │ │                    │
└─────┬──────┘ └─────┬──────┘  └────────┬────────┘ └────────┬───────────┘
      │              │                  │                    │
      └──────────────┴──────────────────┴──────────┬─────────┘
                                                   │
                          ┌────────────────────────┼───────────────────────┐
                          │         DATA LAYER     │                       │
                          │                        ▼                       │
                          │  ┌──────────────────────────────────────────┐  │
                          │  │  PostgreSQL (RDS)                        │  │
                          │  │  Users | Bookings | Hotels | Flights     │  │
                          │  │  Loyalty Points | Migrations via         │  │
                          │  │  node-pg-migrate                         │  │
                          │  └──────────────────────────────────────────┘  │
                          │                                                 │
                          │  ┌──────────────────────────────────────────┐  │
                          │  │  Redis (ElastiCache)                     │  │
                          │  │  Session cache | AI chat history         │  │
                          │  │  Search result cache | Rate-limit state  │  │
                          │  └──────────────────────────────────────────┘  │
                          └─────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL INTEGRATIONS                                  │
│                                                                            │
│  ┌──────────────────┐  ┌───────────────────┐  ┌────────────────────────┐  │
│  │  AWS GCC         │  │  Anthropic        │  │  Payment Gateways      │  │
│  │  Bahrain Region  │  │  Claude API       │  │  STC Pay | Mada        │  │
│  │  (PDPL-ready)    │  │  claude-sonnet-6  │  │  Visa | Apple Pay      │  │
│  └──────────────────┘  └───────────────────┘  └────────────────────────┘  │
│                                                                            │
│  ┌──────────────────┐  ┌───────────────────┐                              │
│  │  Channel Mgrs    │  │  GDS / Flight     │                              │
│  │  (Hotel inv.)    │  │  APIs             │                              │
│  └──────────────────┘  └───────────────────┘                              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Technology Choices & Rationale

| Layer | Technology | Why We Chose It |
|---|---|---|
| Mobile | React Native 0.83 + Expo 55 + TypeScript | Single codebase for iOS + Android; Expo simplifies OTA updates and build pipeline; TypeScript catches regressions early |
| Frontend | Next.js (SSR) | SEO-critical for hotel search landing pages; API routes co-locate BFF logic; Vercel-compatible for fast deployments |
| API Gateway | Nginx | Battle-tested reverse proxy; path-based routing to microservices; rate limiting protects against abuse at zero extra cost |
| Backend Services | Node.js (per microservice) | Async I/O matches booking workloads; shared TypeScript types across services; rapid iteration |
| Database | PostgreSQL (RDS) + node-pg-migrate | ACID transactions critical for bookings and loyalty points; migrations versioned in code; RDS handles patching |
| Cache | Redis (ioredis) | Sub-millisecond hotel search result caching; AI chat session history (LPUSH/LTRIM pattern); rate-limit counters |
| AI / ML | Anthropic Claude claude-sonnet-4-6 | Best-in-class Arabic language understanding; SSE streaming for real-time chat UX; API-first — upgradeable without re-architecture |
| Payments | STC Pay, Mada, Visa, Apple Pay | Full Saudi market coverage; STC Pay is the dominant mobile wallet in KSA; PCI-DSS handled by certified processors |
| Cloud | AWS GCC — Bahrain (ap-south-1) | PDPL data residency requirement; lowest latency to Saudi users; Vision 2030 alignment |
| i18n | react-i18next + i18next | RTL/LTR toggle at runtime; AR/EN key namespaces; `I18nManager.forceRTL` on mobile for native RTL rendering |

---

## 4. AI-Powered Features

### AI Chat Widget (Live)
- Real-time hotel and flight search assistant embedded in the web app
- Streaming responses via SSE (Server-Sent Events) — no page reload, no waiting spinner
- Agentic loop: up to 5 tool iterations per query (search hotels, search flights, summarize)
- Fully bilingual: detects user language, responds in Arabic or English
- Session history persisted in Redis (`chat:history:{sessionId}`, 50-message window, 24-hour TTL)
- Admin audit log via `GET /api/admin/chat-logs` for compliance review
- Powered by: `claude-sonnet-4-6`

### ML Recommendation Engine (Roadmap — Q3 2026)
- Booking history + search behavior → personalized hotel and flight suggestions
- Cold-start handled via destination popularity (Makkah > Madinah > Riyadh default ranking)
- Planned: collaborative filtering on anonymized booking vectors

### Loyalty Intelligence (Roadmap — Q4 2026)
- Points optimization: "Book now vs. wait" suggestions based on points balance and upcoming promotions
- Expiry alerts with redemption suggestions
- Powered by loyalty-service (:3008) data layer already in production

---

## 5. Security & Compliance

| Concern | Implementation |
|---|---|
| Data Residency | All data stored in AWS Bahrain (ap-south-1) — PDPL Article 29 compliant |
| Authentication | JWT tokens; short-lived access tokens + refresh token rotation |
| API Protection | Nginx rate limiting per IP and per API key; blocks brute-force and scraping |
| Payment Security | PCI-DSS compliant processors only (STC Pay certified); UTUBooking never stores raw card data |
| Transport | TLS 1.2+ enforced at Nginx layer; HSTS headers on all responses |
| AI Data Handling | No PII sent to Anthropic API; chat payloads anonymized before leaving VPC |
| Audit Logging | Admin chat-logs endpoint; booking events logged with user_id + timestamp for PDPL audit trail |

---

## 6. Current Scale & Performance Targets

| Metric | Current (Phase 1) | 6-Month Target | 18-Month Target |
|---|---|---|---|
| Concurrent Users | ~500 | 3,000 | 15,000 |
| API Response Time p99 | < 800ms | < 400ms | < 250ms |
| Uptime SLA | 99.5% | 99.9% | 99.95% |
| Mobile App Crash Rate | < 1% | < 0.5% | < 0.1% |
| DB Connections (peak) | ~80 | ~300 (with pooler) | ~600 (read replicas) |
| Monthly Active Users | ~1,000 | ~10,000 | ~60,000 |

---

## 7. Third-Party Integrations

| Category | Integration | Status |
|---|---|---|
| Hotel Inventory | Channel manager APIs (property data, availability, pricing) | In negotiation |
| Flight Data | GDS / flight search APIs (IATA-compliant fare data) | In integration |
| Payment — Mobile Wallet | STC Pay | Live |
| Payment — Debit/Credit | Mada, Visa | Live |
| Payment — Digital Wallet | Apple Pay | Live |
| AI Language Model | Anthropic Claude API (claude-sonnet-4-6) | Live |
| Infrastructure | AWS GCC (EC2, RDS, ElastiCache, CloudFront) | Live |
| Analytics | Mixpanel / Amplitude (TBD) | Planned Q2 2026 |
| Error Monitoring | Sentry (mobile + frontend) | Planned Q2 2026 |
| Push Notifications | AWS SNS or Expo Push Notifications | Planned Q2 2026 |

---

*All architecture details subject to change as the platform scales. This document reflects the state of the system as of March 2026.*
