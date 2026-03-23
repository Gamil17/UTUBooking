# UTUBooking — Series A Technical Package | Confidential

# Platform Metrics Brief

**One-Page Technical Performance Summary**
**Date:** March 2026 | **Audience:** Series A Investors & Technical Advisors

---

## Availability & Performance

| Metric | Target | Basis |
|--------|--------|-------|
| **Uptime SLO** | **99.9%** | 8.7 hours maximum downtime budget per year |
| **P99 Latency** | **< 500 ms** | Measured across hotel search, booking, and auth endpoints |
| **P95 Latency** | **< 200 ms** | Measured in Phase 3 Artillery load tests at 100K concurrent users |
| **Error Rate (5xx)** | **< 1%** | ALB health metrics under sustained peak load |
| **Booking Error Rate** | **< 0.1%** | Payment + booking service combined at Hajj peak simulation |
| **RTO (Disaster Recovery)** | **4 hours** | Validated via DR runbook (`infra/dr/restore-runbook.md`) |
| **RPO (Data Loss Window)** | **24 hours** | Daily `pg_dump` to S3 + cross-region replication to eu-west-1 |

---

## Scale Benchmarks

> *Results from Phase 3 load tests — Artillery `hajj-peak.yml` scenario, March 2026.*

| Benchmark | Result |
|-----------|--------|
| **Peak concurrent users tested** | **100,000** |
| **Hotel search throughput at peak** | **~7,000 req/sec** |
| **Booking completion rate at peak** | **> 99%** |
| **P99 hotel search latency at peak** | **< 500 ms** |
| **P95 hotel search latency at peak** | **< 200 ms** |
| **Redis cache hit ratio (hotel search)** | **~95%** |
| **Redis cluster CPU at peak** | ~65% (headroom to ~85% before scale-out) |
| **RDS primary CPU at peak** | ~45% (significant headroom) |

---

## Infrastructure Efficiency

| Resource | Idle (Off-Season) | Hajj Peak | Notes |
|----------|-------------------|-----------|-------|
| **ECS tasks per service** | 2 | 10–20 | Application Autoscaling: min 2, max 20 |
| **Total ECS tasks (all 8 services)** | 16 | 80–160 | Fargate Spot for non-critical services |
| **Redis cluster nodes** | 6 (fixed) | 6 (fixed) | 3 shards × 2 replicas; no scale-out needed |
| **RDS read replicas** | 2 (fixed) | 2 (fixed) | Read/write split handles load increase |
| **Read/write DB split** | — | **~80% reads / ~20% writes** | Measured at load test peak |
| **CloudFront cache offload** | ~60% | ~60% | Hotel listing pages served from edge |

**Cost profile:** Infrastructure runs lean at ~$X/month idle; Fargate Spot reduces compute cost ~40%. Hajj peak scaling is time-bound (4–6 weeks/year), keeping annual infrastructure cost predictable.

---

## Security Posture

| Control | Status |
|---------|--------|
| **ZAP Baseline (every PR)** | 0 HIGH / 0 CRITICAL on last scan |
| **ZAP Full Scan (weekly)** | 0 HIGH / 0 CRITICAL — last run March 2026 |
| **HSTS** | Enabled — `max-age=31536000; includeSubDomains; preload` |
| **CORS** | Locked to `https://utubooking.com` + per-tenant subdomains |
| **TLS** | 1.2 minimum at ALB + CloudFront; TLS 1.3 preferred |
| **PCI DSS — Cardholder data stored** | **None** — tokenized at payment gateway; SAQ A eligible |
| **Container image scanning** | HIGH/CRITICAL blocks ECR push and ECS deploy |
| **JWT access token TTL** | 15 minutes (RS256 signed) |
| **JWT refresh token TTL** | 7 days (HTTP-only cookie, rotated on use) |
| **Secrets management** | AWS Secrets Manager — zero credentials in code |

---

## Growth Trajectory

> *The following figures represent management projections and business targets, not audited actuals.*

| Milestone | Timeframe | Description |
|-----------|-----------|-------------|
| **KSA B2C Launch** | Month 1 | Direct-to-pilgrim hotel + flight + car booking (Saudi Arabia) |
| **UAE + Jordan B2B** | Month 6 | White-label engine live with first 2 agency partners |
| **North Africa Expansion** | Month 12 | Morocco + Tunisia via French/Arabic bilingual white-label |
| **Booking GMV growth** | Ongoing | **+15% month-over-month** (target trajectory) |
| **White-label tenants** | Month 12 | 10+ agency partners on B2B platform (target) |

**Addressable market context:** An estimated 2 million pilgrims perform Hajj annually; 8–10 million perform Umrah. Average spend per pilgrim on travel and accommodation: $2,000–$8,000 USD. TAM for Hajj/Umrah travel booking: >$20B annually.

---

## Platform Architecture Snapshot

```
AWS me-south-1 (Bahrain) — closest AWS region to Makkah

  8 Node.js microservices on ECS Fargate (autoscaling 2→20 tasks each)
  ├── PostgreSQL 15 (RDS Multi-AZ) + 2 read replicas
  ├── Redis 7 (ElastiCache Cluster: 3 shards × 2 replicas)
  ├── CloudFront CDN + WAF
  └── nginx API gateway (rate limiting, CORS, TLS termination)

  Next.js 16 frontend (AWS Amplify)
  Expo + React Native mobile app (iOS + Android)
  CI/CD: GitHub Actions — ZAP-gated, k6 smoke-tested every deploy
  IaC: 7 CloudFormation stacks (fully reproducible environment)
  DR: S3 + CRR to eu-west-1 | 4h RTO | daily backups
```

---

## Engineering Team & Velocity

| Indicator | Detail |
|-----------|--------|
| **CI/CD cadence** | Multiple deploys per day (trunk-based development) |
| **Time-to-deploy (merge → production)** | ~12 minutes (build + ECR push + ECS rolling update + k6 smoke) |
| **Test coverage target** | >80% line coverage (Jest unit + Supertest integration) |
| **Security gate** | ZAP baseline blocks every PR on HIGH/CRITICAL — no exceptions |
| **Zero-downtime deploys** | ECS rolling update with 100% minimum healthy percent |
| **Rollback time** | <5 minutes (ECS task definition revert via GitHub Actions) |

---

*All load test results are from Phase 3 Artillery scenarios run against staging infrastructure provisioned identically to production (same CloudFormation stacks, same instance types, same cluster configuration).*

*Growth metrics labeled as projections represent management targets and have not been audited. Past performance indicators (infrastructure benchmarks, security scans) reflect point-in-time measurements.*

---

*UTUBooking — Series A Technical Package | Confidential*
*Generated: March 2026*
