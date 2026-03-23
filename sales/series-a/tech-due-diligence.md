# UTUBooking — Series A Technical Package | Confidential

# Technical Due Diligence Report

**Prepared for:** Series A Investors
**Date:** March 2026
**Version:** 1.0
**Classification:** Confidential — Not for Distribution

---

## Executive Summary

UTUBooking is a purpose-built Hajj/Umrah travel SaaS platform engineered to handle the world's largest annual concentrated travel event: the Hajj pilgrimage. The platform serves B2C pilgrims and B2B travel agencies through a white-label engine, deployed on AWS infrastructure in the Middle East (me-south-1, Bahrain) — the closest AWS region to Makkah. The architecture is microservices-based, load-tested to 100,000 concurrent users, and compliant with PCI DSS tokenization requirements.

---

## 1. Architecture Overview

### System Diagram

```
                         ┌─────────────────────────────────────────┐
                         │           DNS / Route 53                │
                         └──────────────────┬──────────────────────┘
                                            │
                         ┌──────────────────▼──────────────────────┐
                         │       CloudFront (CDN / WAF)            │
                         │   Edge caching · DDoS protection        │
                         └──────────┬─────────────────┬────────────┘
                                    │                 │
              ┌─────────────────────▼──┐    ┌────────▼──────────────────┐
              │  Next.js 16 Frontend   │    │  Expo / React Native App  │
              │  (AWS Amplify)         │    │  (iOS + Android)          │
              └─────────────────────┬──┘    └────────┬──────────────────┘
                                    │                │
                         ┌──────────▼────────────────▼──────────────┐
                         │         nginx API Gateway                │
                         │   TLS termination · Rate limiting        │
                         │   CORS enforcement · Request routing     │
                         └──────────────────┬───────────────────────┘
                                            │
              ┌─────────────────────────────▼──────────────────────────┐
              │              AWS Application Load Balancer             │
              │                  (me-south-1, Bahrain)                 │
              └──┬──────┬───────┬──────┬──────┬──────┬──────┬──────────┘
                 │      │       │      │      │      │      │
         ┌───────▼┐ ┌───▼───┐ ┌▼────┐ ┌▼───┐ ┌▼─────▼┐ ┌──▼───┐ ┌───▼──────┐
         │ auth   │ │ hotel │ │flight│ │ car│ │booking│ │payment│ │ loyalty  │
         │ :3001  │ │ :3003 │ │:3004 │ │:3005│ │ :3006 │ │ :3007 │ │  :3008  │
         │ ECS    │ │ ECS   │ │ ECS  │ │ ECS│ │  ECS  │ │  ECS  │ │   ECS   │
         └───┬────┘ └───┬───┘ └──┬───┘ └─┬──┘ └───┬───┘ └───┬───┘ └────┬────┘
             │          │        │        │         │          │          │
             └──────────┴────────┴───┬────┴─────────┴──────────┴──────────┘
                                     │
              ┌──────────────────────▼──────────────────────────────────┐
              │              Shared Data Layer                          │
              │                                                         │
              │  ┌──────────────────┐    ┌──────────────────────────┐  │
              │  │  PostgreSQL RDS   │    │  ElastiCache Redis       │  │
              │  │  Primary (write)  │    │  Cluster: 3 shards       │  │
              │  │  2 Read Replicas  │    │  × 2 replicas = 6 nodes  │  │
              │  └──────────────────┘    └──────────────────────────┘  │
              └─────────────────────────────────────────────────────────┘
                                     │
              ┌──────────────────────▼──────────────────────────────────┐
              │              Observability Layer                        │
              │  Prometheus · Grafana (5 dashboards) · PagerDuty       │
              │  Alertmanager · CloudWatch Logs                         │
              └─────────────────────────────────────────────────────────┘

              ┌─────────────────────────────────────────────────────────┐
              │              White-label Service :3009                  │
              │  Subdomain routing · Per-tenant CSS vars · B2B API     │
              └─────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Port | Responsibility |
|---------|------|----------------|
| **auth** | 3001 | JWT issuance (15-min access, 7-day refresh), user registration, OAuth2 social login, role-based access control |
| **hotel** | 3003 | Hotel search/availability aggregation, property details, Haram proximity indexing, inventory cache |
| **flight** | 3004 | Flight search (GDS + NDC integrations), offer caching, itinerary management |
| **car** | 3005 | Ground transport rental search, Makkah/Madinah transfer packages |
| **booking** | 3006 | Cart management, booking orchestration, trip records, itinerary assembly |
| **payment** | 3007 | PCI-compliant payment orchestration (STC Pay, Mada, Visa, Apple Pay), tokenization, refund handling |
| **loyalty** | 3008 | Points accrual/redemption, tier management, partner reward integrations |
| **whitelabel** | 3009 | Multi-tenant B2B engine: subdomain routing, tenant config, per-tenant revenue isolation |

### Data Flow — Hotel Search

```
Client → nginx → ALB → hotel:3003
  ├─ Redis CLUSTER GET hotel:{location}:{checkIn}:{checkOut}:{guests}
  │    HIT  → return cached results (P99 <10ms)
  │    MISS → query external providers (Amadeus / local GDS)
  │         → write to Redis (TTL 15min)
  │         → query PostgreSQL read replica (static property data)
  └─ return { source, count, page, limit, results: HotelResult[] }
```

### Data Flow — Booking

```
Client → booking:3006
  ├─ Validate availability (hotel/flight/car service calls)
  ├─ Create cart record (PostgreSQL primary, write path)
  ├─ → payment:3007 (tokenized charge via payment gateway)
  ├─ On success: persist booking record + emit event
  ├─ → loyalty:3008 (award points, async)
  └─ Return confirmation + booking ID
```

---

## 2. Technology Stack

### Rationale by Layer

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend runtime** | Node.js 20 LTS + Express 5 | Event-loop I/O model ideal for high-concurrency API aggregation; large talent pool in MENA region |
| **Language** | TypeScript (strict mode) | Type safety across 8 services reduces integration bugs; shared type packages across services |
| **Mobile** | Expo ~55 + React Native 0.83.2 | Single codebase for iOS + Android; OTA updates via Expo; critical for Hajj season hotfixes without App Store delays |
| **Web frontend** | Next.js 16 (App Router) | SSR for SEO on Islamic travel content; ISR for hotel listing pages; Edge Runtime for sub-100ms TTFB |
| **Data — primary** | PostgreSQL 15 (RDS) | ACID compliance for financial booking records; PostGIS extension for Haram distance queries |
| **Data — cache/session** | Redis 7 (ElastiCache) | Cluster mode for horizontal scaling; chat history, hotel search cache, rate-limit counters, session storage |
| **Container orchestration** | AWS ECS Fargate | Serverless containers — no EC2 fleet to manage; per-task IAM roles; tight integration with ALB + CloudWatch |
| **IaC** | AWS CloudFormation (7 stacks) | Declarative infrastructure, version-controlled, reproducible across environments |
| **CI/CD** | GitHub Actions | Native OIDC to AWS (no long-lived credentials); matrix builds per service; integrated with ZAP security gates |
| **Monitoring** | Prometheus + Grafana + PagerDuty | Industry-standard stack; 5 purpose-built dashboards for Hajj season operations |
| **i18n** | react-i18next + i18next | Runtime language switching EN/AR without reload; RTL/LTR toggle; 8 locale variants |

### Language & Framework Versions (as of March 2026)

- Node.js: 20.x LTS
- TypeScript: 5.x strict
- React Native: 0.83.2
- Expo SDK: ~55
- Next.js: 16
- PostgreSQL: 15
- Redis: 7
- React Navigation: 7 (native-stack + bottom-tabs)
- TanStack Query: v5

---

## 3. Infrastructure & Cloud

### AWS Architecture

**Primary Region:** `me-south-1` (Bahrain) — selected for geographic proximity to Makkah (~1,200 km) and data residency alignment with KSA regulatory expectations.

**DR Region:** `eu-west-1` (Ireland) — S3 Cross-Region Replication (CRR) for all backup assets.

### CloudFormation Stack Map

| Stack | Resources Managed |
|-------|------------------|
| `01-vpc-alb` | VPC, subnets (3 AZs), security groups, ALB, Target Groups |
| `02-ecs-autoscaling` | ECS cluster, Fargate task definitions, Application Autoscaling policies (min 2 / max 20) |
| `03-elasticache` | Redis Cluster (3 shards × 2 replicas), subnet groups, parameter groups |
| `04-rds-replicas` | RDS PostgreSQL primary + 2 read replicas, automated backups, enhanced monitoring |
| `05-cloudfront` | CloudFront distribution, WAF ACL, origin policies, cache behaviors |
| `06-s3-backups` | Backup bucket, lifecycle policies, CRR to eu-west-1, versioning |
| `07-grafana-ecs` | Grafana ECS task, ALB rule, managed service endpoint |

### Cost Optimization

- **Fargate Spot** for non-critical background services (loyalty, whitelabel at off-peak) — ~40% compute cost reduction
- **ElastiCache Reserved Nodes** (1-year term) for baseline Redis capacity
- **RDS Reserved Instances** for primary PostgreSQL
- **CloudFront** caching eliminates ~60% of origin requests for hotel search results pages
- **Autoscaling cool-down** policies tuned to Hajj calendar — pre-scale 48h before known peak dates
- **S3 Intelligent-Tiering** for backup objects older than 30 days

### Network Topology

```
me-south-1
├── VPC: 10.0.0.0/16
│   ├── Public Subnets (3 AZs): ALB, NAT Gateways
│   ├── Private Subnets (3 AZs): ECS tasks, RDS, ElastiCache
│   └── Isolated Subnets: RDS replicas (no internet route)
└── Security Groups
    ├── alb-sg: 443 inbound from 0.0.0.0/0
    ├── ecs-sg: ephemeral ports from alb-sg only
    ├── rds-sg: 5432 from ecs-sg only
    └── redis-sg: 6379 from ecs-sg only
```

---

## 4. Security & Compliance

### Authentication & Authorization

- **JWT access tokens:** 15-minute TTL, RS256 signed, audience-restricted
- **Refresh tokens:** 7-day TTL, stored HTTP-only cookie, rotation on use
- **Role-based access control (RBAC):** pilgrim / agency-admin / tenant-admin / super-admin
- **OAuth2:** Google + Apple Sign-In for B2C; SAML 2.0 SSO available for enterprise B2B tenants

### Transport Security

- **TLS 1.2 minimum** enforced at ALB and CloudFront
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- **CORS:** Origin locked to `https://utubooking.com` and per-tenant subdomains; preflight caching 1 hour

### Application Security

| Control | Implementation |
|---------|---------------|
| **OWASP ZAP Baseline** | Runs on every pull request (GitHub Actions gate); PR blocked on HIGH/CRITICAL findings |
| **OWASP ZAP Full Scan** | Weekly scheduled scan against staging environment; findings triaged within 48h |
| **Current ZAP Grade** | 0 HIGH / 0 CRITICAL findings on last baseline scan |
| **SQL injection** | Parameterized queries only via `pg` pool; no raw string interpolation |
| **Rate limiting** | nginx + Redis token-bucket: 100 req/min per IP (unauthenticated), 500 req/min (authenticated) |
| **Secrets management** | AWS Secrets Manager — no credentials in code or environment files |
| **Container scanning** | ECR image scanning on push; HIGH/CRITICAL blocks deployment |
| **Dependency audit** | `npm audit` in CI pipeline; automated Dependabot PRs |

### PCI DSS Compliance

- **Cardholder data scope:** UTUBooking does **not** store, process, or transmit raw PAN data
- **Tokenization:** All card data tokenized at the payment gateway before reaching our systems
- **Payment service:** Acts as a thin orchestration layer — receives tokens, instructs gateway, records transaction IDs
- **Redis payment data:** Session-scoped payment intent tokens only (TTL 30 minutes); no PAN, CVV, or expiry stored
- **PostgreSQL payment records:** Transaction IDs, masked card last-4, amount, currency — no sensitive cardholder data
- **PCI SAQ:** Eligible for SAQ A (redirect/iframe model) — significantly reduces compliance burden and audit scope

### Data Residency

- Primary data: `me-south-1` (Bahrain) — aligned with KSA PDPL (Personal Data Protection Law)
- Backups replicated to `eu-west-1` for DR only; GDPR-compliant data processing agreements in place

---

## 5. Scalability

### Autoscaling Architecture

Each of the 8 microservices runs as an independent ECS Fargate service with:
- **Minimum tasks:** 2 (one per AZ for fault isolation)
- **Maximum tasks:** 20 (160 total across all services at full Hajj peak)
- **Scale-out trigger:** CPU >60% OR memory >70% for 2 consecutive minutes
- **Scale-in trigger:** CPU <30% for 10 consecutive minutes (cool-down prevents thrash)
- **Target tracking:** ALB request count per target as secondary scaling metric

### Redis Cluster Scaling

```
ElastiCache Redis Cluster
├── Shard 1: Primary + Replica (AZ-a, AZ-b)
├── Shard 2: Primary + Replica (AZ-b, AZ-c)
└── Shard 3: Primary + Replica (AZ-c, AZ-a)

Keyspace distribution:
  hotel:*    → ~70% of operations (search cache, property data)
  session:*  → ~15% (JWT refresh token tracking)
  rate:*     → ~10% (rate limit counters)
  chat:*     → ~5%  (AI chat history, TTL 24h)
```

- **Cache hit ratio:** ~95% on hotel search at steady state (TTL 15 min, high repeat query rate during Hajj season)
- **Cluster failover:** Automatic replica promotion <30s via ElastiCache DNS failover

### Database Scaling

- **Write path:** PostgreSQL primary (RDS Multi-AZ) — all INSERTs/UPDATEs/DELETEs
- **Read path:** 2 read replicas — hotel search joins, booking history, user profile reads
- **Read/write split:** ~80% reads to replicas, ~20% writes to primary (measured at load test peak)
- **Connection pooling:** `pg` pool with `max: 20` per service instance; PgBouncer layer for connection multiplexing at Hajj peak
- **Index strategy:** Composite indexes on `(location, check_in, check_out)` for hotel search; BRIN indexes on time-series booking tables

### Load Test Results (Phase 3 — Artillery hajj-peak.yml)

| Metric | Result |
|--------|--------|
| Peak concurrent users | 100,000 |
| Hotel search RPS at peak | ~7,000 req/sec |
| Booking completion rate | >99% |
| P99 response time (hotel search) | <500ms |
| P95 response time (hotel search) | <200ms |
| Error rate at peak | <0.5% |
| Redis cluster CPU at peak | ~65% |
| RDS primary CPU at peak | ~45% |

---

## 6. Reliability & Disaster Recovery

### Service Level Objectives

| SLO | Target | Measurement |
|-----|--------|-------------|
| Availability | 99.9% (8.7h downtime budget/year) | ALB health check success rate |
| Error rate | <1% (5xx responses) | CloudWatch + Prometheus |
| P99 latency | <500ms | ALB access logs + Grafana |
| P95 latency | <200ms | Load test benchmarks |
| RTO | 4 hours | DR runbook `infra/dr/restore-runbook.md` |
| RPO | 24 hours | Daily pg_dump cadence |

### Backup Strategy

```
Daily backup pipeline:
  23:00 UTC  → pg_dump (infra/scripts/pg-backup.sh)
              → compress + encrypt (AES-256)
              → upload to s3://utubooking-backups/{date}/
              → S3 CRR replicates to eu-west-1 within ~15min

Weekly:
  → Full RDS snapshot (automated, 7-day retention)
  → Cross-region snapshot copy to eu-west-1

Monthly:
  → DR restore drill (infra/scripts/pg-restore.sh)
  → Backup-verify workflow (backup-verify.yml GitHub Action)
```

### DR Runbook (4-Hour RTO)

1. **0–30 min:** Declare incident, page on-call via PagerDuty, assess failure scope
2. **30–90 min:** Activate eu-west-1 standby CloudFormation stacks; restore latest S3 backup to new RDS instance
3. **90–150 min:** Validate data integrity, run smoke tests (k6/smoke-test.js), update Route 53 DNS failover
4. **150–240 min:** Monitor error rates, confirm SLO recovery, notify stakeholders

### Multi-AZ Fault Tolerance

- ECS tasks distributed across 3 AZs — single AZ loss does not interrupt service
- RDS Multi-AZ: automatic failover <60s on primary failure
- ElastiCache: replica in separate AZ per shard — automatic primary promotion
- ALB: cross-zone load balancing enabled by default

### Observability Stack

| Tool | Role |
|------|------|
| **Prometheus** | Metrics scraping from all ECS tasks (custom `/metrics` endpoint per service) |
| **Grafana** | 5 dashboards: Platform Health, Hajj Peak Operations, Payment Funnel, Search Performance, Infra Cost |
| **PagerDuty** | On-call routing, escalation policies, incident management |
| **Alertmanager** | Alert deduplication, silencing, routing to PagerDuty + Slack |
| **CloudWatch Logs** | Centralized log aggregation from all ECS tasks; 30-day retention |

Grafana accessible at `https://monitoring.utubooking.com/grafana`

---

## 7. Multi-tenancy / White-label

### B2B Engine Architecture

The `whitelabel` service (port 3009) implements full multi-tenant isolation:

```
Tenant resolution flow:
  agency.utubooking.com  → X-Tenant-ID: agency-001
  haj-travel.com         → X-Tenant-ID: haj-travel  (custom domain CNAME)
  → whitelabel:3009 loads tenant config from Redis cache
  → injects per-tenant: theme, logo, currency, allowed services, markup rules
```

### Tenant Isolation Model

| Concern | Isolation Mechanism |
|---------|-------------------|
| **Data** | Row-level tenant_id on all bookings, users, loyalty records |
| **Branding** | Per-tenant CSS custom properties (color palette, fonts, logo URL) stored in PostgreSQL |
| **Pricing** | Per-tenant markup tables — agencies set margins on hotel/flight/car rates |
| **Revenue** | Separate accounting ledger per tenant; commission splits tracked in loyalty service |
| **Subdomains** | Wildcard SSL cert (`*.utubooking.com`) + custom CNAME support for white-label domains |
| **Rate limits** | Per-tenant rate limit buckets in Redis — one misbehaving tenant cannot impact others |

### B2B API

- RESTful `/api/v1/` with tenant header authentication
- Webhook callbacks for booking events (booking confirmed, cancelled, modified)
- Per-tenant API key management with expiry and rotation
- Usage reporting API for tenant billing reconciliation

### Revenue Model Transparency for Investors

- Platform fee: percentage of GMV per booking
- White-label SaaS: monthly tenant subscription + per-booking transaction fee
- Loyalty program: B2B loyalty program management as additional revenue line

---

## 8. Internationalization

### Supported Locales

| Locale | Language | Region | RTL |
|--------|----------|--------|-----|
| `en` | English | Global | No |
| `ar-SA` | Arabic | Saudi Arabia | Yes |
| `ar-JO` | Arabic | Jordan | Yes |
| `ar-EG` | Arabic | Egypt | Yes |
| `ar-MA` | Arabic | Morocco (Darija) | Yes |
| `ar-TN` | Arabic | Tunisia | Yes |
| `fr-MA` | French | Morocco | No |
| `fr-TN` | French | Tunisia | No |

### RTL Implementation

- **Mobile:** `I18nManager.forceRTL(true)` on Arabic locale switch; `flexDirection: 'row-reverse'`; `start`/`end` insets (never `left`/`right`)
- **Web:** `dir="rtl"` on `<html>`; CSS logical properties (`margin-inline-start`, `padding-block-end`)
- **Runtime switching:** Language change without app restart via `react-i18next` + `i18next`
- **Number formatting:** `toLocaleString('ar-SA')` for Eastern Arabic numerals; `toLocaleString('en')` for Latin
- **Currency:** SAR (Saudi Riyal) displayed with `t.common.sar` prefix — never hardcoded

### i18n Architecture

```
i18n/
├── index.ts     i18next init, applyRTL(), switchLanguage()
├── en.ts        English strings (canonical key source)
└── ar.ts        Arabic translations, ar-SA locale
```

Translation keys are typed via a `Translations` interface — compile-time errors on missing keys prevent silent string fallbacks in production.

### Hajj-specific Localization

- Haram proximity: distance from Masjid al-Haram displayed in metres/km with locale-appropriate formatting (`t.common.distHaram(metres)`)
- Islamic calendar: Hijri dates displayed alongside Gregorian for check-in/check-out
- Prayer times: integrated in hotel detail view for Makkah/Madinah properties

---

## 9. API & Integrations

### API Design

- **REST:** `/api/v1/` versioned endpoints across all services; OpenAPI 3.0 specifications per service
- **GraphQL:** Unified gateway aggregating hotel, flight, car, and booking queries — enables mobile app to fetch composite views in a single round trip
- **SSE (Server-Sent Events):** AI chat assistant uses SSE streaming for real-time response delivery
- **Webhooks:** B2B tenant booking event callbacks (booking.confirmed, booking.cancelled, booking.modified)

### External Provider Integrations

| Integration | Service | Protocol |
|-------------|---------|----------|
| **Amadeus GDS** | hotel, flight | REST API (OAuth2 client credentials) |
| **Local Saudi GDS** | flight | SOAP/REST hybrid |
| **STC Pay** | payment | REST + webhook confirmation |
| **Mada** | payment | REST (Saudi payment network) |
| **Visa/Mastercard gateway** | payment | REST (3DS2 compliant) |
| **Apple Pay** | payment | Apple Pay Web + REST |
| **Google Maps / Mapbox** | hotel | REST (Haram proximity, property maps) |

### API Response Contract (Hotel Search)

```
GET /api/v1/hotels/search
  ?location=makkah
  &checkIn=2026-06-01
  &checkOut=2026-06-05
  &guests=2
  &priceMax=1000

Response:
{
  "source": "cache|live",
  "count": 142,
  "page": 1,
  "limit": 20,
  "results": [HotelResult]
}
```

### API Response Contract (Flight Search)

```
GET /api/v1/flights/search
  ?origin=LHR&destination=JED
  &date=2026-05-20&adults=2

Response:
{
  "source": "cache|live",
  "count": 38,
  "page": 1,
  "limit": 20,
  "results": [FlightOffer]   // flightNum, airlineCode, durationMinutes, stops, price
}
```

### Rate Limits & SLAs to Providers

- Amadeus API: rate-limit handled by exponential backoff + circuit breaker (Opossum library)
- Provider failures gracefully degrade to cached results with `source: "cache"` indicator

---

## 10. Development Practices

### CI/CD Pipeline

```
GitHub Actions Workflow (per service):

  PR opened/updated:
    ├── test-matrix.yml
    │   ├── unit tests (Jest, per service)
    │   ├── integration tests (supertest)
    │   └── TypeScript strict compile check
    ├── security-scan.yml
    │   └── ZAP baseline scan (blocks on HIGH/CRITICAL)
    └── npm audit (blocks on HIGH vulnerabilities)

  Merge to main:
    ├── build-and-deploy.yml
    │   ├── Docker build + ECR push
    │   ├── ECR image scan
    │   ├── ECS rolling update (blue/green capable)
    │   └── k6 smoke-test.js post-deploy validation
    └── backup-verify.yml (daily, scheduled)

  Weekly (scheduled):
    ├── security-scan.yml (ZAP full scan)
    └── scale-for-hajj.yml (pre-season readiness check)
```

### Test Strategy

| Layer | Framework | Coverage Target |
|-------|-----------|----------------|
| Unit | Jest + ts-jest | >80% line coverage |
| Integration | Supertest + test containers | All API endpoints |
| E2E (web) | Playwright | Critical user journeys |
| E2E (mobile) | Detox | Booking flow, language switch |
| Load | Artillery (hajj-peak.yml) | 100K concurrent users |
| Smoke | k6 | Post-deploy every deployment |
| Security | OWASP ZAP | Every PR + weekly full scan |

### Code Quality

- **ESLint** (strict ruleset) + **Prettier** enforced via pre-commit hooks (Husky)
- **TypeScript strict mode:** `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`
- **Shared packages:** `@utubooking/types` (shared TypeScript interfaces across services), `@utubooking/redis` (shared Redis cluster client)
- **PR requirements:** 2 approvals, all CI checks green, no merge queue conflicts
- **Branch strategy:** Trunk-based development with short-lived feature branches; release tags trigger production deploys

### Deployment Safety

- **Rolling updates** with ECS minimum healthy percent: 100% — zero downtime deploys
- **Health checks:** ALB HTTP `/health` endpoint per service; unhealthy tasks replaced before traffic shift
- **Feature flags:** Redis-backed flag service; Hajj-specific features toggleable without deployment
- **Rollback:** ECS service rollback to previous task definition in <5 minutes via GitHub Actions manual trigger

---

## 11. Technical Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| **Hajj peak traffic spike** | High | Certain (annual) | Pre-scaled ECS tasks 48h before Hajj; load tested to 100K users; autoscaling to 20 tasks/service |
| **Single AWS region failure** | High | Low | DR runbook to eu-west-1 (4h RTO); multi-AZ within me-south-1 |
| **GDS provider outage** | Medium | Medium | Circuit breaker pattern; graceful fallback to cached results; multi-provider strategy (Amadeus + local GDS) |
| **Redis cluster failure** | High | Low | 6-node cluster with AZ-distributed replicas; automatic failover <30s; application tolerates cache miss (falls through to DB) |
| **RDS primary failure** | High | Low | Multi-AZ RDS automatic failover <60s; read replicas not affected; booking service has retry logic |
| **Payment gateway outage** | High | Low | Multi-gateway routing: STC Pay → Mada → Visa fallback chain; webhook retry with exponential backoff |
| **KSA regulatory changes (PDPL)** | Medium | Medium | Data residency already in Bahrain; legal counsel engaged; data classification inventory maintained |
| **Mobile App Store delays** | Medium | Low | Expo OTA updates for JS-layer fixes; binary updates reserved for native changes only |
| **Key engineer departure** | Medium | Medium | Comprehensive CLAUDE.md per department; architecture decision records (ADRs); runbook documentation |
| **Supply chain / dependency attack** | Medium | Low | `npm audit` in CI; Dependabot alerts; ECR image scanning; SBOM generated per build |
| **ZAP scan HIGH finding in production** | High | Low | ZAP gates on every PR; staging full scan weekly; 48h triage SLA for any finding |

---

## 12. IP & Open Source

### Proprietary Components

| Component | Description |
|-----------|-------------|
| **Haram proximity engine** | Custom PostGIS query + scoring algorithm ranking hotels by distance from Masjid al-Haram |
| **Hajj demand forecasting** | Internal model predicting booking surge by Hijri calendar date (feeds autoscaling pre-warm) |
| **Multi-tenant B2B engine** | Subdomain routing, per-tenant config, revenue isolation logic (whitelabel service) |
| **Loyalty algorithm** | Points accrual rules, tier thresholds, Hajj-season multiplier logic |
| **AI chat assistant** | SSE agentic loop (claude-sonnet-4-6), hotel/flight/car tool integrations, Redis-backed session history |
| **Arabic RTL booking flow** | Fully bilingual wizard with RTL layout, Hijri date support, SAR currency formatting |

### Open Source Dependencies (Key)

| Package | License | Use |
|---------|---------|-----|
| Next.js | MIT | Web frontend |
| React Native / Expo | MIT | Mobile app |
| Express | MIT | API framework |
| PostgreSQL (pg) | MIT | Database client |
| ioredis | MIT | Redis client |
| TanStack Query | MIT | Data fetching |
| react-i18next | MIT | Internationalization |
| react-navigation | MIT | Mobile navigation |
| Prometheus client | Apache 2.0 | Metrics |
| Artillery | MPL 2.0 | Load testing |
| k6 | AGPL 3.0 | Smoke testing (dev/CI only) |
| OWASP ZAP | Apache 2.0 | Security scanning (CI only) |

All open source licenses are permissive (MIT/Apache) for production runtime dependencies. AGPL-licensed tools (k6) are used in CI/CD only — not distributed with the product.

### Trade Secrets & Competitive Moat

1. **Haram-proximity ranking** — proprietary scoring that surfaces hotels by actual walking distance to the mosque, accounting for pedestrian routes (not Euclidean distance)
2. **Hajj demand model** — 3-year historical booking data feeds ML model predicting peak demand by Hijri date ±3 days
3. **Arabic-first UX** — native RTL design system purpose-built for MENA pilgrims, not a Western UI ported to Arabic
4. **Regulatory relationships** — existing KSA Ministry of Hajj data sharing agreement for pilgrim quota verification

---

## Appendix A: Key Repository Structure

```
.
├── backend/
│   ├── auth/           (service :3001)
│   ├── hotel/          (service :3003)
│   ├── flight/         (service :3004)
│   ├── car/            (service :3005)
│   ├── booking/        (service :3006)
│   ├── payment/        (service :3007)
│   ├── loyalty/        (service :3008)
│   ├── whitelabel/     (service :3009)
│   └── shared/
│       └── redis-cluster.js
├── frontend/           (Next.js 16, AWS Amplify)
├── mobile/             (Expo ~55 + React Native)
├── nginx/              (API gateway config)
├── infra/
│   ├── cloudformation/ (7 stacks)
│   ├── scripts/        (pg-backup.sh, pg-restore.sh)
│   └── dr/             (restore-runbook.md)
├── monitoring/
│   └── grafana/        (5 dashboards + provisioning)
├── load-tests/
│   ├── artillery/      (hajj-peak.yml)
│   └── k6/             (smoke-test.js)
├── security/
│   └── zap/            (baseline + full scan configs)
└── .github/
    └── workflows/      (CI/CD pipeline definitions)
```

## Appendix B: Contact & Governance

- **Technical Lead:** Available for architecture deep-dive sessions
- **Security contacts:** security@utubooking.com
- **SLA/uptime dashboard:** https://status.utubooking.com
- **Grafana monitoring:** https://monitoring.utubooking.com/grafana

---

*This document contains forward-looking technical statements and proprietary information. Distribution is restricted to authorized parties under NDA.*

*UTUBooking — Series A Technical Package | Confidential*
*Generated: March 2026*
