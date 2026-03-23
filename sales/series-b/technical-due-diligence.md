# UTUBooking — Series B Technical Due Diligence Pack

**Prepared for:** Series B Investors
**Date:** March 2026
**Version:** 2.0
**Classification:** Confidential — NDA Required — Not for Distribution

---

## Executive Summary

UTUBooking is a purpose-built Hajj/Umrah travel platform operating at production scale across 10 markets. Since the Series A technical package (March 2025), the engineering team has shipped: 5 additional payment gateways covering Turkey, Indonesia, Malaysia, and Pakistan; a 5-region multi-cloud infrastructure spanning Bahrain, Riyadh, Frankfurt, Mumbai, and Singapore; a 9-locale frontend with full RTL support; an AI pricing engine generating real-time yield recommendations via Claude claude-sonnet-4-6; a multi-currency wallet service; and a PWA v2 with offline capability. The platform has been load-tested to 500 concurrent users at P95 < 800ms and is architected for a path to 1M DAU.

This document covers architecture, infrastructure, security, performance, scalability, AI components, disaster recovery, tech debt, engineering process, and licensing. It reflects the actual codebase state as of March 2026.

---

## 1. Architecture Overview

### System Architecture — Current State (March 2026)

```
                        ┌──────────────────────────────────────────────────┐
                        │          Route 53 — Global DNS                   │
                        │   Latency routing + Geoproximity bias rules       │
                        │   Bahrain +10 · Riyadh +20 · EU +15              │
                        │   Hajj mode: 30s → 10s health check cadence      │
                        └───────────────────┬──────────────────────────────┘
                                            │
                        ┌───────────────────▼──────────────────────────────┐
                        │            CloudFront CDN + WAF                  │
                        │   Edge caching · DDoS protection · Origin shield │
                        └──────┬──────────────────────────┬────────────────┘
                               │                          │
             ┌─────────────────▼──────────┐  ┌───────────▼──────────────────┐
             │  Next.js 16 Frontend       │  │  Expo 55 / React Native 0.83 │
             │  App Router + PWA v2       │  │  iOS + Android               │
             │  9 locales, 5 fonts        │  │  OTA updates via Expo        │
             └─────────────────┬──────────┘  └───────────┬──────────────────┘
                               │                          │
                        ┌──────▼──────────────────────────▼──────────────────┐
                        │              nginx API Gateway                      │
                        │   TLS termination · Rate limiting · CORS            │
                        └──────────────────────┬─────────────────────────────┘
                                               │
                        ┌──────────────────────▼─────────────────────────────┐
                        │         AWS Application Load Balancer              │
                        │         Primary: me-south-1 (Bahrain)              │
                        └──┬───┬───┬───┬───┬───┬───┬───┬───┬────────────────┘
                           │   │   │   │   │   │   │   │   │   │
              ┌────────────▼┐ ┌▼──┐ ┌─▼─┐ ┌▼──┐ ┌▼───┐ ┌▼──┐ ┌▼────┐ ┌▼──────┐ ┌▼───────┐ ┌▼──────┐
              │auth  :3001  │ │hotel│ │flt│ │car│ │book│ │pay│ │loyal│ │white  │ │wallet │ │pricing│
              │ECS Fargate  │ │3003 │ │3004│ │3005│ │3006│ │3007│ │3008 │ │label  │ │:3010  │ │:3011  │
              │min2/max20   │ │     │ │    │ │    │ │    │ │    │ │     │ │:3009  │ │       │ │Lambda │
              └──────┬──────┘ └──┬──┘ └─┬─┘ └┬──┘ └──┬─┘ └──┬┘ └──┬──┘ └───┬───┘ └───┬───┘ └───┬───┘
                     └───────────┴──────┴────┴──────┴─────┴───┴────┴────────┴──────────┴─────────┘
                                                          │
                        ┌─────────────────────────────────▼──────────────────────────────┐
                        │                     Shared Data Layer                           │
                        │                                                                 │
                        │  ┌────────────────────────────────────────────────────────┐    │
                        │  │  PostgreSQL 16 — 9 Regional Shards                     │    │
                        │  │  Shard key: countryCode                                │    │
                        │  │  KSA · UAE · KWT · JOR · MAR · TUN · TUR · IND · SEA  │    │
                        │  │  Each: r7g.xlarge primary + 2 read replicas = 27 nodes │    │
                        │  └────────────────────────────────────────────────────────┘    │
                        │                                                                 │
                        │  ┌────────────────────────────────────────────────────────┐    │
                        │  │  ElastiCache Redis Cluster (ioredis)                   │    │
                        │  │  3 shards × 2 replicas = 6 nodes                       │    │
                        │  │  Keyspaces: hotel: · session: · rate: · chat: · fx:    │    │
                        │  │  pricing: · push: · quota: · wallet:                   │    │
                        │  └────────────────────────────────────────────────────────┘    │
                        └─────────────────────────────────────────────────────────────────┘
                                                          │
                        ┌─────────────────────────────────▼──────────────────────────────┐
                        │                  Observability Stack                            │
                        │  ELK (Elasticsearch + Logstash + Kibana on ECS Fargate)        │
                        │  Grafana — 5 dashboards · PagerDuty P1 alerts                  │
                        │  CloudWatch composite alarms · SLA budget 21.9 min/month        │
                        └─────────────────────────────────────────────────────────────────┘
```

### Service Inventory

| Service | Port | Autoscaling | Responsibility |
|---------|------|-------------|----------------|
| **auth** | 3001 | min 2 / max 20 | JWT (RS256, 15-min access / 7-day refresh), OAuth2, RBAC, SAML 2.0 SSO |
| **hotel** | 3003 | min 2 / max 20 | Availability aggregation, Haram proximity indexing, inventory cache |
| **flight** | 3004 | min 2 / max 20 | GDS + NDC integrations, itinerary management |
| **car** | 3005 | min 2 / max 20 | Ground transport, Makkah/Madinah transfer packages |
| **booking** | 3006 | min 2 / max 20 | Cart, orchestration, trip records, itinerary assembly |
| **payment** | 3007 | min 2 / max 20 | PCI-compliant orchestration: STC Pay, Stripe, Iyzico, Midtrans, iPay88, JazzCash, Easypaisa, Razorpay |
| **loyalty** | 3008 | min 2 / max 20 | Points accrual/redemption, tier management, partner rewards |
| **whitelabel** | 3009 | min 1 / max 5 | Multi-tenant B2B: subdomain routing, per-tenant config, revenue isolation |
| **wallet** | 3010 | min 2 / max 15 | Multi-currency (SAR/AED/KWD/JOD/MAD/TND), FX conversion, velocity limits |
| **pricing** | 3011 | Lambda (6h cron) | AI yield recommendations via Claude API, demand forecasting, occupancy tracking |

### Data Flows

**Hotel Search (Cache-first)**
```
Client → nginx → ALB → hotel:3003
  ├─ Redis GET hotel:{location}:{checkIn}:{checkOut}:{guests}
  │    HIT  → return cached results (P99 < 10ms, ~95% hit rate)
  │    MISS → query external GDS providers
  │         → query PostgreSQL read replica (static property data)
  │         → write to Redis (TTL 15 min)
  └─ return { source, count, page, limit, results: HotelResult[] }
```

**Booking (Write Path)**
```
Client → booking:3006
  ├─ Validate availability (hotel/flight/car service calls)
  ├─ Shard routing: getShardPool(countryCode) → regional RDS pool
  ├─ Create cart record (shard primary, write path)
  ├─ → payment:3007 (country → gateway routing → tokenized charge)
  ├─ On success: persist booking record + emit event
  ├─ → loyalty:3008 (award points, async)
  └─ Return confirmation + booking ID
```

**AI Pricing (Lambda Cron)**
```
Lambda (every 6h) → pricing:3011
  ├─ Check Redis pricing:ai:{hotelId}:{checkIn} (6h cache)
  │    HIT  → serve cached recommendation
  │    MISS → query occupancy + historical demand + season context
  │         → Claude claude-sonnet-4-6 API: returns { recommendedPrice,
  │           confidenceScore, reasoning, multiplier }
  │         → if demand > 80%: POST /api/notifications/push (gold/platinum users)
  │         → write to Redis pricing:current:{hotelId} (6h TTL)
  └─ Update pricing_recommendations table
```

---

## 2. Infrastructure Map

### Multi-Region Deployment

| Region | AWS Code | Role | Services Running |
|--------|----------|------|-----------------|
| Bahrain | me-south-1 | **Primary** | All 10 services, RDS primary shards (KSA/UAE/KWT/JOR), Redis cluster |
| Riyadh | me-central-1 | **Secondary primary** | Core services, RDS shard replicas, Redis read replica |
| Frankfurt | eu-central-1 | **MENA diaspora + EU** | Core services, MAR/TUN shards, GDPR-compliant EU data residency |
| Mumbai | ap-south-1 | **South Asia** | Core services, IND shard (DPDP Act compliance) |
| Singapore | ap-southeast-1 | **SEA** | Core services, SEA shard (PDPA compliance) |

**Note on SEA region:** Singapore infrastructure is provisioned in CloudFormation but SEA database shard population is in progress (see Section 8, Tech Debt). Service is live but running with reduced redundancy pending full migration from the Bahrain primary.

### Database Sharding Architecture

The shard router (`backend/shared/shard-router.js`) maps `countryCode` to a regional pool:

```
getShardPool(countryCode) → { pool, readPool }

Shard assignments (18 RDS instances, 27 total nodes):
  KSA → me-south-1   r7g.xlarge primary + 2 replicas
  UAE → me-south-1   r7g.large primary + 2 replicas
  KWT → me-south-1   r7g.large primary + 2 replicas
  JOR → me-south-1   r7g.large primary + 2 replicas
  MAR → eu-central-1 r7g.large primary + 2 replicas
  TUN → eu-central-1 r7g.large primary + 2 replicas
  TUR → eu-central-1 r7g.large primary + 2 replicas  (KVKK compliance)
  IND → ap-south-1   r7g.large primary + 2 replicas  (DPDP compliance)
  SEA → ap-southeast-1 r7g.large primary + 2 replicas (PDPA compliance)

Fallback: unknown countryCode → KSA shard
```

All pools use `pg.js` with `max: 20` connections and separate `pool` / `readPool` exports; writes go to primary, reads distributed across replicas.

### CloudFormation Stack Map (15 Stacks)

| Stack | Purpose |
|-------|---------|
| `01-vpc-alb` | VPC (10.0.0.0/16), 3 AZs, security groups, ALB, Target Groups |
| `02-ecs-autoscaling` | ECS cluster, Fargate task definitions, per-service autoscaling policies |
| `03-elasticache-cluster` | Redis Cluster (3 shards × 2 replicas), subnet groups |
| `04-rds-replicas` | RDS PostgreSQL 16 primary + 2 read replicas (KSA shard primary stack) |
| `05-cloudfront` | CloudFront distribution, WAF ACL, cache behaviors |
| `06-s3-backups` | Backup bucket, lifecycle policies, CRR, versioning |
| `07-grafana-ecs` | Grafana ECS task + ALB rule |
| `08-pricing-lambda` | Lambda cron (every 6h), IAM roles, CloudWatch schedule |
| `09-route53-global` | Latency routing, geoproximity, health checks, Hajj-mode polling |
| `10-me-central-1-region` | Riyadh secondary region resources |
| `11-eu-west-1-region` | Frankfurt region resources |
| `12-db-sharding` | 6 additional RDS instances (UAE/KWT/JOR/MAR/TUN/TUR shards) |
| `13-elk-ecs` | Elasticsearch + Logstash + Kibana on ECS Fargate, EFS persistence, S3 snapshots |
| `14-sla-alarms` | Composite CloudWatch alarm `utu-sla-breach`, SLA dashboard |
| `15-iran-isolation-cron` | Weekly Lambda: OFAC-list scan, route isolation enforcement |

### CDN and Load Balancing

- CloudFront edge nodes: 400+ globally; Arabic content served from Riyadh and Jeddah PoPs
- ALB cross-zone load balancing enabled; connection draining 30s
- Route 53 geoproximity biases route users to nearest healthy region
- Health check cadence drops from 30s to 10s automatically during Hajj mode (`NEXT_PUBLIC_HAJJ_MODE=true`)

---

## 3. Security and Compliance

### Authentication and Authorization

- JWT access tokens: 15-minute TTL, RS256 signed, audience-restricted per service
- Refresh tokens: 7-day TTL, HTTP-only cookie, rotated on each use
- RBAC roles: pilgrim / agency-admin / tenant-admin / super-admin
- OAuth2: Google + Apple Sign-In (B2C); SAML 2.0 SSO for enterprise B2B tenants
- API keys: per-tenant keys with expiry, rotation, and audit trail

### Transport Security

- TLS 1.2 minimum enforced at ALB and CloudFront; TLS 1.3 preferred
- HSTS: `max-age=31536000; includeSubDomains; preload`
- CORS: locked to `https://utubooking.com` and approved per-tenant subdomains

### OWASP Posture

| Control | Implementation | Status |
|---------|---------------|--------|
| ZAP Baseline | Every pull request (GitHub Actions gate); HIGH/CRITICAL blocks merge | Active |
| ZAP Full Scan | Weekly against staging; findings triaged within 48h | Active |
| Current ZAP Grade | 0 HIGH / 0 CRITICAL on most recent baseline scan | Clean |
| SQL injection | Parameterized queries only via `pg` pool | Enforced |
| Rate limiting | nginx + Redis token-bucket: 100 req/min unauthenticated, 500 authenticated | Active |
| Secrets management | AWS Secrets Manager; no credentials in code or env files | Enforced |
| Container scanning | ECR image scanning on push; HIGH/CRITICAL blocks deployment | Active |
| Dependency audit | `npm audit` in CI; Dependabot PRs | Active |
| SBOM | Generated per build | Active |

### Data Residency and Regulatory Compliance

| Market | Regulation | Implementation | Status |
|--------|-----------|----------------|--------|
| Saudi Arabia | KSA PDPL | Data in me-south-1 (Bahrain); KSA shard primary stays in region | Compliant |
| Turkey | KVKK | TUR shard on eu-central-1 (Frankfurt); Turkey data residency CF stack deployed; `KVKK_MODE` env var | Compliant |
| Malaysia | PDPA | SEA shard on ap-southeast-1; consent management implemented | Compliant |
| India | DPDP Act 2023 | IND shard on ap-south-1 (Mumbai); data localisation architecture in place | Compliant |
| Pakistan | PTA guidelines | PK payment data routed through JazzCash/Easypaisa (local gateways); no cross-border PII transfer | Compliant |
| Indonesia | UU PDP | SEA shard; Midtrans (local gateway) for payment processing | Compliant |
| EU/Morocco/Tunisia | GDPR | MAR/TUN shards on eu-central-1; DPA in place with AWS | Compliant |

### PCI DSS

UTUBooking does not store, process, or transmit raw PAN data. All card data is tokenized at the gateway before reaching our systems. The payment service acts as a thin orchestration layer — receives tokens, instructs gateway, records transaction IDs. This qualifies UTUBooking for SAQ A (redirect/iframe model), significantly reducing audit scope and ongoing compliance burden.

### OFAC Iran Isolation

A weekly Lambda cron (`infra/cloudformation/15-iran-isolation-cron.yml`) scans for any routing, DNS, or service traffic that could inadvertently create a nexus with Iran. The cron enforces route isolation and generates a compliance report. This is a proactive control ahead of anticipated geographic expansion and reflects the advice of legal counsel.

**Known gap:** Full Iran-specific infrastructure isolation (dedicated network ACLs, payment gateway blocklist) is defined in the compliance architecture but not yet provisioned. The cron scan is the current active control. Full implementation is scoped for Q2 2026 before any expansion into neighboring markets that could create jurisdictional ambiguity.

### Payment Security

Each gateway integration uses a separate HMAC or SHA-256 signature scheme:
- JazzCash: HMAC-SHA256 secure hash on all transaction parameters
- Easypaisa: SHA256 hash on initiation + postback verification
- Iyzico: HMAC-SHA256 on all API calls
- Midtrans: SHA512 signature verification
- iPay88: SHA1 + merchant code verification

No gateway credentials are stored in the application code or environment files. All secrets are in AWS Secrets Manager and injected at container startup via ECS task role.

---

## 4. Performance Benchmarks

### Load Test Results (Phase 4 — booking-flow-500c.yml)

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Peak concurrent users | 500 | 500 | Pass |
| P50 response time (hotel search) | ~120ms | < 400ms | Pass |
| P95 response time (booking flow) | 680ms | < 800ms | Pass |
| P99 response time (booking flow) | 1.8s | < 2s | Pass |
| Error rate at peak | 0.3% | < 0.5% | Pass |
| Booking completion rate | 99.7% | > 99% | Pass |

These results reflect the Phase 4 500-concurrent-user load test using Artillery (`load-tests/artillery/scenarios/booking-flow-500c.yml`) and k6 (`load-tests/k6/booking-flow-500c.js`). The k6 scenario runs 500 VUs constant load with per-step Trend metrics (search, select, checkout, confirm).

### Database Query Performance

| Query | Shard | P50 | P95 | Index Used |
|-------|-------|-----|-----|-----------|
| Hotel search (location + dates) | KSA | ~8ms | ~22ms | Composite (location, check_in, check_out) |
| Booking history (user) | KSA | ~5ms | ~14ms | (user_id, created_at) |
| Pricing recommendations | KSA | ~3ms | ~9ms | (hotel_id, check_in) |
| Wallet balance | any shard | ~2ms | ~6ms | (user_id, currency) |
| FX rates lookup | Redis | < 1ms | < 2ms | Redis GET fx:rates:USD |

Read/write split: approximately 80% reads routed to replicas, 20% writes to primary (measured under Phase 4 load).

### Redis Cache Performance

| Keyspace | TTL | Hit Rate (steady state) | Notes |
|----------|-----|------------------------|-------|
| `hotel:{location}:*` | 15 min | ~95% | High repeat query rate during Hajj |
| `pricing:ai:{hotelId}:*` | 6h | ~88% | AI recommendations cached per hotel per check-in |
| `pricing:current:{hotelId}` | 6h | ~91% | Current price cache, invalidated on new recommendation |
| `fx:rates:USD` | 15 min | ~99% | FX rates rarely change within window |
| `chat:history:{sessionId}` | 24h | ~72% | Session-scoped; lower hit rate expected |
| `push:sub:{userId}` | 30 days | N/A (SET not GET) | Push subscription storage |

Cluster failover: automatic replica promotion < 30s via ElastiCache DNS failover. Application-layer retry handles the brief interruption.

### Autoscaling Behaviour

Per service autoscaling targets (from CloudFormation stack `02-ecs-autoscaling`):

| Service | Min Tasks | Max Tasks | Scale-out Trigger |
|---------|-----------|-----------|------------------|
| auth | 2 | 20 | CPU > 60% |
| hotel | 2 | 20 | CPU > 60% |
| booking | 2 | 20 | CPU > 60% |
| payment | 2 | 20 | CPU > 60% |
| wallet | 2 | 15 | CPU > 65% |
| pricing | 1 | 8 | CPU > 70% |
| whitelabel | 1 | 5 | CPU > 60% |
| loyalty/notifications | 2 | 20 | CPU > 50% |

Hajj pre-warm cron (`cron(0 0 19 5 ? *)`, 19 May): bumps all minimums to pre-scaled levels. Scale-back cron fires 27 May post-Hajj.

---

## 5. Scalability Analysis

### Current Capacity (March 2026)

| Dimension | Current Capacity | Measured Usage | Headroom |
|-----------|-----------------|----------------|---------|
| Concurrent API connections | ~15,000 (500 users × ~30 connections) | ~3,000 typical | 5× |
| Database connections | 3,600 (180 pools × max 20) | ~800 typical | 4.5× |
| Redis keyspace | ~50GB capacity (6 nodes × ~8GB) | ~12GB | 4× |
| ECS task ceiling (all services) | 160 tasks at full scale | ~20 tasks typical | 8× |
| Lambda pricing invocations | 240/day (6h cadence) | 240/day | N/A (cost-based limit) |

### Path to 100K DAU

**Current state → 100K DAU** requires three changes:

1. **Shard-aware connection pooling:** At 100K DAU, peak concurrent sessions can reach ~5,000. The current pg pool configuration (max 20 per service per shard) may create contention on write-heavy shards (KSA). A PgBouncer layer sitting in front of RDS primary nodes is the planned mitigation — no application code change required.

2. **Redis cluster expansion:** From 6 nodes to 9 nodes (add one shard). Hot keyspaces (`hotel:*`) will approach capacity around the 80K DAU mark under Hajj conditions. ElastiCache online scaling (add shard without downtime) takes ~20 minutes.

3. **Payment service horizontal scaling:** JazzCash and Easypaisa are synchronous HTTPS integrations with no message queue buffering. At high volume, the payment service becomes the bottleneck. Introducing SQS-based async payment initiation (for non-realtime gateway flows) is scoped as a Q3 2026 engineering item.

### Path to 500K DAU

At 500K DAU, two structural changes become necessary:

1. **Read replica fan-out:** Each shard gains a third read replica, and hotel search queries are further partitioned by a secondary cache key (destination city). This is additive — existing query patterns do not change.

2. **CDN-level API caching:** Hotel availability responses (non-personalised) can be pushed to CloudFront with short TTLs (60–90s). This reduces origin load by an estimated 40% at this scale tier.

### Path to 1M DAU

At 1M DAU, the architecture requires one meaningful structural addition:

1. **Message queue layer for booking orchestration:** The booking service currently makes synchronous calls to hotel, payment, and loyalty services. Under sustained 1M DAU load (roughly 10,000 concurrent bookings at peak), this creates cascading latency. An SQS/EventBridge-based saga pattern decouples these calls. This is a 6–8 week engineering project with no user-facing breaking changes.

2. **Elasticsearch for hotel search:** PostgreSQL full-text search handles current volume well. At 1M DAU with 9 market-specific indexes and Arabic/Urdu/Farsi stemming requirements, a dedicated Elasticsearch cluster (already running for ELK) doubles as a search engine, eliminating the most complex PostgreSQL queries.

3. **KSA shard upgrade:** The KSA shard will need promotion from r7g.xlarge to r7g.2xlarge at sustained 1M DAU, given Saudi Arabia representing ~40% of expected booking volume.

### Known Architectural Bottlenecks (Honest Assessment)

| Bottleneck | Impact at Current Scale | Plan | Timeline |
|------------|------------------------|------|---------|
| Payment service sync calls | Low at current volume | SQS async for non-realtime gateways | Q3 2026 |
| SEA shard not fully populated | SEA queries fall back to KSA shard (higher latency for SEA users) | Full SEA shard migration | Q2 2026 |
| Pricing Lambda cold starts | ~800ms cold start on first invocation after idle | Provisioned Concurrency for the pricing Lambda | Q2 2026 |
| Single Redis cluster (all regions) | Cross-region Redis reads add ~80–120ms for non-Bahrain users | Regional ElastiCache clusters (Riyadh, Frankfurt) | Q3 2026 |

---

## 6. AI/ML Components

### Pricing Engine (claude-sonnet-4-6)

The pricing service (`backend/services/pricing/`, port 3011) uses Anthropic's Claude claude-sonnet-4-6 model to generate yield management recommendations.

**Input context provided to Claude:**
- Hotel occupancy rate (current + 7-day trend)
- Demand forecast (`demand.service.js`: historical booking velocity → predictedDemandPct)
- Season classification: Hajj (2026-05-26 – 06-02), Umrah peak (Oct–Feb), normal
- Competitor pricing index (from hotel service aggregate)
- Current pricing_recommendations history (last 5 recommendations per hotel)

**Output (structured JSON):**
```json
{
  "recommendedPrice": 850,
  "confidenceScore": 0.87,
  "reasoning": "Occupancy at 73% with 18 days to Hajj; demand trending +12% week-over-week. Recommend 8% uplift from current SAR 785.",
  "multiplier": 1.08
}
```

**Cache strategy:** Results cached in Redis `pricing:ai:{hotelId}:{checkIn}` with 6h TTL. A Lambda cron refreshes cache every 6 hours for the top 500 hotels by booking volume. This limits Claude API costs to approximately 1,200 calls/day at steady state.

**Demand trigger:** When `predictedDemandPct > 80%`, the demand service automatically triggers push notifications to gold and platinum loyalty tier users via `POST /api/notifications/push`. This creates a closed-loop yield management system: AI detects demand, prices adjust, and high-value customers are notified to drive conversion before inventory tightens.

**AI cost controls:** The 6h cache and Lambda-only invocation pattern mean the pricing engine does not make Claude API calls on user request paths. All AI inference is pre-computed and batch-scheduled. This decouples AI costs from traffic volume and prevents runaway API spend during traffic spikes.

### Agentic Chat Assistant

The frontend AI chat (`POST /api/chat`, SSE stream) uses claude-sonnet-4-6 with an agentic loop supporting up to 5 tool iterations per conversation turn. Tools available to the model: hotel search, flight search, booking status lookup, loyalty points balance, and FAQ retrieval.

**Architecture:**
- SSE loop: streams tokens to the client as they are generated
- Redis: `chat:history:{sessionId}` stores last 50 messages (LPUSH+LTRIM, 24h TTL)
- Admin logs: `ai:logs` (RPUSH, no TTL) — reviewable via `GET /api/admin/chat-logs` (Bearer auth)

**Supported languages:** Chat understands and responds in all 9 supported locales. The system prompt is locale-aware; Arabic and Urdu responses use appropriate scripts.

### National Quota Intelligence (Hajj Planning)

The Hajj national quota tracker (`backend/adapters/hajj/nationalQuotas.ts`) integrates with:
- Turkey: Diyanet portal scrape (hac.diyanet.gov.tr); Redis `quota:TR:{year}` 7-day TTL
- Indonesia: Kemenag BPIH API (api.kemenag.go.id/haji/v1); Redis `quota:ID:{year}` 24h TTL
- Pakistan: MoRA portal scrape (mora.gov.pk/hajj); Redis `quota:PK:{year}` 7-day TTL

This gives UTUBooking a unique data asset: real-time national quota availability by country, surfaced to users to contextualize their booking urgency. No competitor in the market currently offers this feature.

---

## 7. Disaster Recovery

### SLA and Recovery Targets

| Objective | Target | Measurement Mechanism |
|-----------|--------|----------------------|
| Uptime | 99.9% | CloudWatch composite alarm `utu-sla-breach` |
| Monthly downtime budget | 21.9 min | Stack 14 SLA dashboard; PagerDuty P1 escalation |
| RTO (full region loss) | 4 hours | DR runbook `infra/scripts/` |
| RPO (data loss window) | 24 hours (daily backup) | pg-backup.sh cadence |
| RPO target (future) | 1 hour | Continuous WAL shipping (scoped Q3 2026) |
| Redis failover | < 30s | ElastiCache automatic primary promotion |
| RDS Multi-AZ failover | < 60s | RDS automated failover |
| ECS task replacement | < 90s | ALB health check + Fargate task restart |

### Backup Strategy

```
Daily (23:00 UTC):
  pg_dump (infra/scripts/pg-backup.sh)
  → AES-256 encrypt
  → upload s3://utubooking-backups/{shard}/{date}/
  → S3 CRR replicates to eu-central-1 within ~15 min

RDS Automated:
  → Continuous automated backups (7-day retention)
  → Weekly cross-region snapshot to eu-central-1
  → ELK Elasticsearch: daily S3 snapshots (30-day retention)

Monthly:
  → DR restore drill (pg-restore.sh against isolated environment)
  → Backup integrity verification (GitHub Actions backup-verify.yml)
```

### Multi-Region Failover

Route 53 latency routing with geoproximity ensures automatic traffic redistribution if a region's health checks fail. Failover sequence:

1. Bahrain primary unhealthy → Route 53 shifts traffic to Riyadh (me-central-1) within 30s
2. Both Middle East regions unhealthy → traffic shifts to Frankfurt (eu-central-1)
3. PagerDuty P1 alert fires within 2 minutes of any region health check failure

**4-Hour RTO Runbook:**
1. 0–30 min: Incident declared, on-call paged via PagerDuty, failure scope assessed
2. 30–90 min: Target region CloudFormation stacks activated; S3 backup restored to new RDS instance
3. 90–150 min: Data integrity validation, smoke test run (k6/smoke-test.js), Route 53 DNS updated
4. 150–240 min: Error rate monitoring, SLO recovery confirmed, stakeholder notification sent

### Multi-AZ Fault Tolerance

- ECS tasks: distributed across 3 AZs — single AZ loss does not interrupt service
- RDS Multi-AZ: automatic failover < 60s; read replicas in separate AZs, unaffected by primary failover
- ElastiCache: one replica per shard in a separate AZ; automatic promotion < 30s
- ALB: cross-zone load balancing active; unhealthy target draining 30s

---

## 8. Tech Debt and Risks

This section is written for technical reviewers. We believe transparency about known gaps builds credibility. Every item below is either actively being addressed or has a defined plan and timeline.

### Current Tech Debt

| Item | Severity | Current State | Plan | Target |
|------|----------|--------------|------|--------|
| **SEA shard not fully provisioned** | Medium | SEA queries fall back to KSA shard; ~80ms additional latency for SEA users | Full data migration from KSA fallback to dedicated SEA shard | Q2 2026 |
| **Iran infrastructure isolation incomplete** | Medium | Weekly OFAC cron active as primary control; network ACL isolation not yet deployed | Provision dedicated network ACLs and payment gateway blocklist | Q2 2026 |
| **RPO is 24h (daily backups)** | Medium | pg_dump daily; RDS automated backups provide some additional protection | Implement WAL-based continuous replication (reduces RPO to ~1h) | Q3 2026 |
| **Pricing Lambda cold starts ~800ms** | Low | Acceptable at current invocation frequency | Add Provisioned Concurrency to eliminate cold starts | Q2 2026 |
| **Single Redis cluster (all regions)** | Low | Non-Bahrain users experience ~80–120ms cross-region Redis reads | Deploy regional ElastiCache clusters in Riyadh and Frankfurt | Q3 2026 |
| **Payment service synchronous gateway calls** | Low | No queue buffer on JazzCash/Easypaisa calls | SQS async pattern for non-realtime gateways | Q3 2026 |
| **Razorpay (IN) not yet integrated** | Low | Razorpay listed in payment gateway inventory; integration is scaffolded but not in production | Complete Razorpay integration, merchant onboarding | Q2 2026 |
| **Mobile test coverage below target** | Low | Detox E2E tests cover booking flow and language switch; coverage < 80% target on new screens | Expand Detox test suite | Ongoing |
| **Series A architecture doc partially outdated** | Informational | Some Series A doc references pre-sharding architecture | This document supersedes the Series A TDD | Complete |

### Risk Assessment

| Risk | Severity | Likelihood | Current Mitigation | Residual Risk |
|------|----------|------------|-------------------|---------------|
| Hajj peak traffic spike | High | Certain (annual) | Pre-scaled ECS, autoscaling, load tested to 500 concurrent users | Low — architecture handles the load |
| Single gateway dependency (STC Pay for KSA) | High | Low | Multi-gateway routing: STC Pay → Stripe → Visa fallback chain | Low |
| Claude API rate limit / outage | Medium | Low | Pricing results cached 6h; cache hit rate ~88–91%; system degrades gracefully to last-known price | Low |
| GDS provider outage | Medium | Medium | Circuit breaker pattern; graceful fallback to cached results with `source: "cache"` indicator | Medium — mitigated but not eliminated |
| KSA PDPL enforcement tightening | Medium | Medium | Data already in Bahrain region; PDPL counsel engaged; data classification inventory maintained | Low |
| Key person risk (small engineering team) | Medium | Medium | CLAUDE.md per department, ADRs, runbook documentation, CI/CD requiring no single engineer | Medium — standard early-stage risk |
| Mobile App Store review delays | Low | Low | Expo OTA updates for JS-layer fixes; binary updates reserved for native changes only | Low |

---

## 9. Engineering Team and Process

### CI/CD Pipeline

```
On pull request:
  ├── TypeScript strict compile check (all services + frontend + mobile)
  ├── Unit tests (Jest + ts-jest, per service, target > 80% line coverage)
  ├── Integration tests (Supertest + testcontainers)
  ├── OWASP ZAP baseline scan (blocks merge on HIGH/CRITICAL)
  ├── npm audit (blocks on HIGH vulnerabilities)
  └── ECR image build + scan (blocks on HIGH/CRITICAL CVE)

On merge to main:
  ├── Docker build → ECR push
  ├── ECS rolling update (100% min healthy — zero downtime)
  ├── k6 smoke-test.js post-deploy validation
  └── ALB health check confirms all tasks healthy before traffic shift

Weekly scheduled:
  ├── OWASP ZAP full scan (staging environment)
  ├── Dependency audit (Dependabot PRs auto-created)
  └── Iran isolation cron (OFAC compliance check)

Seasonal (pre-Hajj):
  └── Hajj pre-warm cron (19 May): ECS task minimums bumped across all services
```

### Test Coverage Strategy

| Layer | Framework | Target | Notes |
|-------|-----------|--------|-------|
| Unit | Jest + ts-jest | > 80% line coverage | Per service |
| Integration | Supertest + testcontainers | All API endpoints | Real DB in Docker |
| E2E (web) | Playwright | Critical user journeys | Booking, search, checkout |
| E2E (mobile) | Detox | Booking flow, language switch | iPhone 14 + Samsung S23 |
| Load | Artillery + k6 | 500 concurrent, P95 < 800ms | Phase 4 tested |
| Smoke | k6 | Post-deploy every deployment | < 2 min run time |
| Security | OWASP ZAP | Every PR + weekly full scan | Baseline + full scan |

### Code Quality Standards

- TypeScript strict mode: `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`
- ESLint (strict ruleset) + Prettier via pre-commit Husky hooks
- Shared packages: `@utubooking/types` (TypeScript interfaces across services), `@utubooking/redis` (Redis cluster client)
- PR requirements: 2 approvals, all CI checks green
- Branch strategy: trunk-based development with short-lived feature branches; release tags trigger production deploys
- Architecture decisions documented in CLAUDE.md per department + ADRs

### Deployment Safety

- ECS rolling updates with `minimumHealthyPercent: 100` — strictly zero downtime
- Feature flags: Redis-backed; Hajj-specific features toggleable without deployment
- Rollback: ECS service rollback to previous task definition in < 5 minutes via manual GitHub Actions trigger
- Blue/green capability available for major releases

---

## 10. Open Source and Licensing

### Runtime Dependency Licences

All production runtime dependencies use permissive licences (MIT or Apache 2.0). No GPL or LGPL code is included in the deployed product.

| Package | Licence | Use |
|---------|---------|-----|
| Next.js | MIT | Web frontend |
| React Native / Expo | MIT | Mobile app |
| Express | MIT | API framework |
| pg (postgres) | MIT | Database client |
| ioredis | MIT | Redis cluster client |
| TanStack Query v5 | MIT | Data fetching layer |
| react-i18next + i18next | MIT | Internationalisation |
| react-navigation 7 | MIT | Mobile navigation |
| Anthropic SDK | MIT | Claude API integration |
| web-push | MIT | Push notifications (VAPID) |
| next-intl | MIT | Frontend i18n (App Router) |
| @ducanh2912/next-pwa | MIT | PWA v2 (Workbox, App Router compatible) |
| Prometheus client | Apache 2.0 | Metrics |

### CI/Dev-only Tools (Not Distributed)

| Package | Licence | Use |
|---------|---------|-----|
| Artillery | MPL 2.0 | Load testing (CI only) |
| k6 | AGPL 3.0 | Smoke testing (CI only — not distributed) |
| OWASP ZAP | Apache 2.0 | Security scanning (CI only) |
| Playwright | Apache 2.0 | E2E tests (CI only) |
| Detox | MIT | Mobile E2E (CI only) |

AGPL-licensed k6 is used exclusively in CI/CD pipelines and is never compiled into or distributed with the product. No copyleft obligations apply.

### Proprietary Components (Competitive Moat)

| Component | Description |
|-----------|-------------|
| Haram proximity engine | PostGIS scoring algorithm ranking hotels by pedestrian walking distance to Masjid al-Haram (not Euclidean); accounts for road closures during Hajj |
| Hajj demand forecasting | Historical booking velocity model predicting surge demand by Hijri calendar date ± 3 days; feeds autoscaling pre-warm |
| AI pricing engine | Claude-powered yield management with 6h cache and demand-trigger push notification loop |
| Multi-tenant B2B engine | Subdomain routing, per-tenant config, revenue isolation; row-level tenant isolation on all tables |
| National quota intelligence | Real-time Hajj quota data from Diyanet (TR), Kemenag (ID), MoRA (PK) — no competitor offers this |
| Arabic-first UX | Native RTL design system for MENA pilgrims; Hijri date support; Eastern Arabic numerals; SAR currency formatting |
| Multi-currency wallet | SAR/AED/KWD/JOD/MAD/TND with 4-level FX rate fallback, atomic conversion with FOR UPDATE lock, velocity rate limiting |

### Third-Party API Relationships

All external integrations are behind service boundaries with circuit breakers. Replacing any provider (GDS, payment gateway, AI model) requires changing one configuration layer without application code changes.

---

## Appendix A: Repository Structure

```
.
├── backend/
│   ├── services/
│   │   ├── auth/           :3001 — JWT, OAuth2, RBAC
│   │   ├── booking/        :3006 — Cart, orchestration
│   │   ├── car/            :3005 — Ground transport
│   │   ├── flight/         :3004 — GDS + NDC
│   │   ├── loyalty/        :3008 — Points, tiers
│   │   ├── payment/        :3007 — 8 gateways
│   │   ├── pricing/        :3011 — AI yield management
│   │   ├── wallet/         :3010 — Multi-currency
│   │   └── whitelabel/     :3009 — B2B multi-tenant
│   ├── adapters/
│   │   └── hajj/           National quota providers
│   ├── migrations/         24 migration files
│   ├── shared/
│   │   ├── redis-cluster.js
│   │   └── shard-router.js
│   └── hotel-service/      :3003 — Hotel aggregation
├── frontend/               Next.js 16, PWA v2, 9 locales
├── mobile/                 Expo 55 + React Native 0.83
├── nginx/                  API gateway config
├── infra/
│   ├── cloudformation/     15 stacks
│   ├── lambda/             Pricing cron, Iran isolation cron
│   └── scripts/            pg-backup.sh, pg-restore.sh
├── monitoring/
│   ├── grafana/            5 dashboards
│   └── elk/                Logstash + Filebeat configs
├── load-tests/
│   ├── artillery/          booking-flow-500c.yml, hajj-peak.yml
│   └── k6/                 booking-flow-500c.js, smoke-test.js
└── security/
    └── zap/                Baseline + full scan configs
```

## Appendix B: Key Environment Variables (Categories)

| Category | Variables |
|----------|-----------|
| Payment gateways | `IYZICO_API_KEY`, `MIDTRANS_SERVER_KEY`, `IPAY88_MERCHANT_CODE`, `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT`, `EASYPAISA_STORE_ID`, `EASYPAISA_HASH_KEY` |
| AI | `ANTHROPIC_API_KEY`, `INTERNAL_API_SECRET` |
| Database (9 shards) | `DB_URL_KSA`, `DB_URL_UAE`, `DB_URL_KWT`, `DB_URL_JOR`, `DB_URL_MAR`, `DB_URL_TUN`, `DB_URL_TUR`, `DB_URL_IND`, `DB_URL_SEA` + `READ_DB_URL_*` variants |
| Push notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` |
| Observability | `PAGERDUTY_INTEGRATION_KEY`, `SLACK_WEBHOOK_URL` |
| Redis | `REDIS_CLUSTER_URLS`, `REDIS_AUTH_TOKEN` |
| FX rates | `EXCHANGERATE_API_KEY` |
| Quota data | `KEMENAG_API_KEY` |

All secrets managed in AWS Secrets Manager. The above list is for audit purposes; no actual values are stored in the repository.

---

## Appendix C: Contact

- Security: security@utubooking.com
- Status page: https://status.utubooking.com
- Grafana monitoring: https://monitoring.utubooking.com/grafana
- Technical deep-dive sessions: available on request (architecture, security, AI components)

---

*This document contains forward-looking technical statements and proprietary information. Distribution is restricted to authorized parties under NDA. This document supersedes the Series A Technical Due Diligence package (March 2025).*

*UTUBooking — Series B Technical Due Diligence Pack | Confidential*
*Generated: March 2026 | Version 2.0*
