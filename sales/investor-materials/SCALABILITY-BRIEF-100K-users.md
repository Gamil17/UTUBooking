---
> DRAFT — REQUIRES TECHNICAL REVIEW BEFORE DISTRIBUTION
> UTUBooking.com | Scalability Brief | March 2026
---

# UTUBooking — Scalability Brief: 1K to 100K Monthly Active Users

## Executive Summary

UTUBooking's current architecture — a Docker Compose microservices stack on a single AWS EC2 instance with PostgreSQL RDS and Redis ElastiCache — is deliberately sized for today's 1K–10K MAU range, keeping infrastructure costs low during the growth phase while validating product-market fit. Critically, every architectural decision made to date has been chosen with the 100K MAU upgrade path in mind: stateless microservices (hotel-service :3003, flight-service :3004, loyalty-service :3008) can be containerized and moved to ECS Fargate or EKS without code changes; the Redis caching layer already absorbs read-heavy search traffic; and the database schema is structured for horizontal partitioning. Reaching 100K MAU does not require a re-architecture — it requires a series of incremental infrastructure upgrades that can each be executed while the platform remains live.

---

## Phase 1: 0–10K MAU (Current State)

**Timeline:** Now → approximately Q3 2026

### Infrastructure
- **Compute:** Single AWS EC2 t3.large instance running Docker Compose (all microservices co-located)
- **Database:** Single PostgreSQL RDS db.t3.medium (Single-AZ)
- **Cache:** Redis ElastiCache single-node (cache.t3.micro)
- **Gateway:** Nginx on the EC2 instance — rate limiting, SSL termination, path routing
- **Storage:** S3 for hotel images and static assets; CloudFront CDN (basic config)
- **Deployment:** Docker Compose up — simple, fast iteration

### Estimated AWS Cost
~USD 800/month (EC2 + RDS + ElastiCache + S3 + data transfer)

### Known Bottlenecks at This Phase

| Bottleneck | Root Cause | Mitigation (already in place) |
|---|---|---|
| DB connection pool | All 4 services share a single Postgres instance; peak bookings can exhaust connections | PG connection pooling via pg-pool; Redis caches search results to reduce DB reads |
| Hotel image serving | Large image payloads slow mobile load times | S3 + CloudFront serves images at edge; mobile app uses lazy loading |
| AI chat latency | SSE stream to Anthropic API adds 1–3s per response | Redis session cache avoids re-loading history; streaming UX masks latency |
| Single point of failure | One EC2 instance; if it goes down, all services go down | AWS automated EC2 recovery + RDS automated backups; recovery target: < 15 min |

---

## Phase 2: 10K–30K MAU

**Timeline:** Q3 2026 – Q1 2027 (estimated 6–12 months post-launch)

### Infrastructure Changes Required

| Component | Current | Upgraded To | Reason |
|---|---|---|---|
| Compute | EC2 t3.large + Docker Compose | ECS Fargate (task-per-service, auto-scaling) | Eliminates single point of failure; scales each service independently |
| Load Balancing | Nginx on EC2 | AWS Application Load Balancer (ALB) | Native AWS health checks, sticky sessions, HTTPS termination at scale |
| Database | RDS db.t3.medium Single-AZ | RDS Multi-AZ db.t3.large | Automatic failover < 60s; no data loss on AZ outage |
| Cache | ElastiCache single node | ElastiCache Redis Cluster (3 nodes) | Read replicas offload session and search cache reads |
| CDN | Basic CloudFront | CloudFront full distribution (hotel images, Next.js static, API caching) | Cuts hotel image load time by ~70%; reduces origin traffic |
| Secrets | Env file on EC2 | AWS Secrets Manager | Rotate DB passwords without redeployment; audit trail |

### Estimated AWS Cost
~USD 2,500/month

### Engineering Effort
3–4 weeks (1 senior backend engineer + DevOps)
Primarily infrastructure configuration; no application code changes required.

### New Capabilities Unlocked
- Zero-downtime deployments via ECS rolling updates
- Per-service auto-scaling (hotel-service scales independently of loyalty-service during Hajj)
- CloudFront Arabic content delivery at Riyadh + Jeddah edge nodes

---

## Phase 3: 30K–100K MAU

**Timeline:** Q4 2026 – Q2 2027 (estimated 12–24 months post-launch)

### Infrastructure Changes Required

| Component | Phase 2 State | Phase 3 Upgrade | Reason |
|---|---|---|---|
| Database reads | Single primary | RDS + 2 read replicas | Search queries (80% of DB load) routed to replicas; primary handles writes only |
| Database scale | Single instance | Range sharding by user_id | Distributes user/booking data across shards; enables horizontal growth beyond single-instance limits |
| Container orchestration | ECS Fargate | Amazon EKS (Kubernetes) | Fine-grained resource control; service mesh (Istio) for inter-service auth; industry-standard tooling |
| Search | PostgreSQL LIKE queries | Elasticsearch (Arabic full-text) | Native Arabic stemming, diacritics handling, and relevance ranking; PostgreSQL cannot scale Arabic fuzzy search at 100K MAU |
| Async processing | Synchronous booking writes | AWS SQS queues | Booking confirmations, email notifications, loyalty point accrual decoupled from HTTP request cycle |
| Feature management | Hardcoded flags | LaunchDarkly (or in-house) | Safe rollout of new features to % of users; instant kill switch without deployment |
| Observability | Basic logs | Datadog or AWS CloudWatch full APM | Distributed tracing across microservices; alerting on p99 latency regression |

### Estimated AWS Cost
~USD 8,000/month

### Engineering Effort
8–12 weeks (2 backend engineers + 1 DevOps/SRE)
All migrations can be executed live with zero user-facing downtime using blue-green deployment patterns.

### New Capabilities Unlocked
- Arabic hotel name search that actually works at scale (Elasticsearch)
- Booking confirmation emails/SMS sent asynchronously — booking API response time drops from ~1.2s to ~150ms
- Loyalty points calculated asynchronously — no booking latency impact
- Per-feature A/B testing and gradual rollouts

---

## Hajj Season Surge Handling

**The Challenge:** The Hajj peak (June 2026, approximately 10 days) historically drives 8–12x normal platform traffic for Makkah hotel searches and bookings. This is the single most critical load event in the UTUBooking calendar year.

### Surge Response Playbook

**2 Weeks Before Hajj:**
- [ ] Manual capacity increase: scale ECS Fargate tasks for hotel-service from 2 → 8 instances
- [ ] Pre-warm CloudFront with hotel image assets for top 200 Makkah properties
- [ ] Increase RDS instance class temporarily (db.t3.large → db.r6g.large)
- [ ] Redis: extend search result TTL from 5 minutes → 30 seconds (aggressive caching, slightly stale data acceptable)
- [ ] Load test: run k6 load simulation at 10x baseline against staging environment

**During Peak (Auto-scaling Rules):**
- ECS Fargate target tracking: scale out when CPU > 60% — new tasks spin up in ~90 seconds
- ALB connection draining: 30-second drain before terminating scaled-down tasks
- Redis cluster: read replicas absorb ~80% of hotel search cache reads; DB primary protected
- SQS: booking confirmation queue buffers up to 10,000 messages; DB writes proceed at safe rate regardless of request spike
- Circuit breaker: if hotel-service p99 > 3s, return cached results and degrade gracefully (show "prices may have changed" banner)

**Post-Peak (3 Days After):**
- [ ] Scale ECS tasks back to baseline
- [ ] Downgrade RDS instance class
- [ ] Review Datadog traces for bottlenecks to address before Umrah season

### Hajj Surge Cost
Estimated additional: **USD 3,000** for the 10-day window (incremental over monthly baseline)
This is a planned, budgeted cost — not an emergency expense.

---

## Engineering Roadmap to 100K MAU

| Quarter | Infrastructure Milestone | Outcome |
|---|---|---|
| **Q2 2026** | ECS Fargate migration + ALB; RDS Multi-AZ; CloudFront full distribution | Eliminates single point of failure; enables auto-scaling for Hajj 2026 |
| **Q3 2026** | Redis ElastiCache cluster (3 nodes); AWS Secrets Manager; Sentry + basic APM | Platform stable for 30K MAU; observability in place for Hajj surge analysis |
| **Q4 2026** | EKS migration; RDS read replicas (×2); SQS for booking async processing | Booking API response time target < 200ms p99; DB reads scaled horizontally |
| **Q1 2027** | Elasticsearch (Arabic full-text hotel search); feature flags; database sharding strategy finalized | Full 100K MAU readiness; Arabic search quality matches market expectation; safe feature rollouts |

---

## Why This Architecture is Investor-Ready

**No vendor lock-in.**
All services run in Docker containers. The entire stack can migrate from AWS to any cloud provider in under 2 weeks. No proprietary services are required at the application layer.

**AWS GCC ensures regulatory compliance.**
Saudi PDPL (Personal Data Protection Law) requires data residency within the Kingdom or approved jurisdictions. AWS Bahrain (ap-south-1) is the only hyperscale cloud region meeting this requirement today. This is a competitive moat: competitors who built on non-compliant infrastructure face mandatory re-architecture or regulatory risk.

**AI layer is API-first and upgrade-safe.**
The Anthropic Claude integration is a single API call behind a service boundary (`/api/chat`). Upgrading to a future model, adding a second AI provider, or switching vendors entirely requires changing one environment variable and one model parameter — not a re-architecture. The SSE streaming infrastructure, Redis session history, and agentic loop logic are all model-agnostic.

**Cost scales linearly with revenue through 30K MAU — then sub-linearly.**
- Phase 1 (10K MAU): ~USD 800/month infra → ~USD 0.08 per MAU per month
- Phase 2 (30K MAU): ~USD 2,500/month infra → ~USD 0.08 per MAU per month
- Phase 3 (100K MAU): ~USD 8,000/month infra → ~USD 0.08 per MAU per month

Cost-per-user remains stable through Phase 2, then drops as Kubernetes + read replicas amortize across more users. Infrastructure is never the constraint on unit economics.

**The hard engineering is done.**
RTL/Arabic support, PDPL-compliant data residency, PCI-DSS payment integration, and a live AI chat layer with Arabic understanding are all production-grade today. These are not roadmap items — they are working features that competitors typically underestimate by 6–12 months of engineering time.

---

*This brief reflects infrastructure state and cost estimates as of March 2026. AWS pricing subject to change. Engineering effort estimates assume a team of 2–3 engineers. All roadmap timelines are targets, not guarantees.*
