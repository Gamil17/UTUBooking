# UTUBooking — Platform Scalability Brief
## From 10K to 1M Daily Active Users

**For:** Series B Investors
**Date:** March 2026
**Classification:** Confidential

---

## The Core Argument in One Paragraph

UTUBooking's infrastructure is already multi-region, containerised, and sharded. The architectural decisions that are expensive to make — splitting services into independent deployable units, separating reads from writes, distributing data across regions for regulatory compliance — are done. What remains between our current operating scale and 1M DAU is a series of incremental capacity additions (more database nodes, more cache nodes, a message queue layer) rather than a re-architecture. Our cost per transaction falls as we scale, our regulatory posture improves because data is already in the right regions, and there is no single technology we are locked into that would constrain an acquirer.

---

## Current Capacity and Headroom (March 2026)

We operate across 5 AWS regions (Bahrain, Riyadh, Frankfurt, Mumbai, Singapore) with 10 independent microservices, 9 regional database shards, and a 6-node Redis cluster. The platform was load-tested in Phase 4 to 500 concurrent users with P95 response times of 680ms — within our 800ms target — at a 0.3% error rate.

| Resource | Current Capacity | Typical Load | Available Headroom |
|----------|-----------------|--------------|-------------------|
| Concurrent API connections | ~15,000 | ~3,000 | 5× before next upgrade |
| Database connection pools | 3,600 total | ~800 active | 4.5× |
| Cache storage (Redis) | ~50GB | ~12GB used | 4× |
| Container task ceiling | 160 tasks (all services at max) | ~20 tasks | 8× |
| Payment gateway throughput | 8 gateways, ~2,000 TPS aggregate | ~150 TPS typical | 13× |

At our current growth trajectory, we do not hit any infrastructure ceiling before the 100K DAU milestone. The first meaningful infrastructure investment is required around 80K–100K DAU, and it is additive — not disruptive.

---

## Three Scaling Milestones

### Milestone 1: 100K DAU
**Timeline:** 6–9 months post-funding (Q3–Q4 2026)
**Infrastructure changes required:**

- **Database connection layer:** Add PgBouncer in front of the two highest-volume shards (KSA and UAE). No application code change. Allows 10× more concurrent connections to the same RDS instances.
- **Redis cluster expansion:** Add one shard (6 → 9 nodes). ElastiCache supports online shard addition in approximately 20 minutes with no downtime.
- **Regional Redis caches:** Deploy dedicated ElastiCache clusters in Riyadh and Frankfurt to eliminate ~100ms cross-region Redis latency for non-Bahrain users.
- **SEA shard completion:** Migrate SEA user data from the KSA fallback shard to its dedicated Singapore cluster — already provisioned in CloudFormation, pending data migration.

**Engineering effort:** 6–8 weeks (1 backend engineer + 1 DevOps)
**Infrastructure cost at this tier:** ~$18,000/month (5 regions, expanded cache, PgBouncer layer)
**Cost per transaction (est.):** ~$0.004 at 100K DAU with 3% booking conversion

### Milestone 2: 500K DAU
**Timeline:** 12–18 months post-funding (2027)
**Infrastructure changes required:**

- **Read replica fan-out:** Add a third read replica per shard on the four highest-volume shards (KSA, UAE, IND, SEA). All shard connections already support `{ pool, readPool }` separation — adding a replica is a configuration change to the CloudFormation stack.
- **CDN-level API caching:** Non-personalised hotel availability responses pushed to CloudFront with 60–90s TTLs. Reduces origin database load by an estimated 40% for search queries at this scale tier.
- **Async payment processing:** Introduce SQS queue buffering for JazzCash and Easypaisa payment initiations (which are currently synchronous). Allows the payment service to accept bursts without slowing booking confirmation response times.
- **Elasticsearch hotel search:** At 500K DAU across 9 markets with Arabic, Urdu, and Farsi query strings, PostgreSQL's full-text search approaches its practical ceiling. The ELK Elasticsearch cluster (already running for log analytics) is extended as a hotel search engine. Query patterns do not change for consumers of the hotel API.

**Engineering effort:** 10–14 weeks (2 backend engineers + 1 DevOps/SRE)
**Infrastructure cost at this tier:** ~$45,000/month
**Cost per transaction (est.):** ~$0.0024 — cost per user falls 40% relative to 100K DAU as fixed infrastructure costs amortise across a larger user base

### Milestone 3: 1M DAU
**Timeline:** 24–30 months post-funding (2028)
**Infrastructure changes required:**

- **Async booking orchestration (saga pattern):** The booking service currently calls hotel, payment, and loyalty services synchronously within a single HTTP request. At 1M DAU with ~10,000 concurrent booking sessions at Hajj peak, this creates cascading latency. Decoupling these calls through SQS/EventBridge — a standard microservices saga pattern — is a 6–8 week project with no breaking changes to the client-facing API.
- **KSA shard upgrade:** Saudi Arabia is projected to represent approximately 40% of booking volume at 1M DAU. The KSA RDS instance upgrades from r7g.xlarge to r7g.2xlarge, a live upgrade with < 60s failover window.
- **Global Redis topology:** Full regional Redis deployment in all 5 regions (currently 2 of 5 have regional cache). Eliminates the last cross-region cache reads.
- **Pricing Lambda → ECS:** At high call volumes, the Lambda-based pricing cron has cold start latency. Migration to a persistent ECS service with scheduled invocation eliminates cold starts entirely.

**Engineering effort:** 14–20 weeks (3 backend engineers + 1 DevOps/SRE)
**Infrastructure cost at this tier:** ~$95,000/month
**Cost per transaction (est.):** ~$0.0013 — sub-linear scaling means cost per transaction continues to fall; infrastructure cost as a fraction of GMV decreases throughout the journey

### Cost Summary Table

| Scale | DAU | Infra Cost/Month | Estimated Transactions/Month | Cost per Transaction |
|-------|-----|-----------------|------------------------------|---------------------|
| Current | ~10K | ~$8,000 | ~90,000 | ~$0.089 |
| Milestone 1 | 100K | ~$18,000 | ~900,000 | ~$0.020 |
| Milestone 2 | 500K | ~$45,000 | ~4,500,000 | ~$0.010 |
| Milestone 3 | 1M | ~$95,000 | ~9,000,000 | ~$0.011 |

Assumes 3% booking conversion on DAU, average 3 searches per booking session. Infrastructure cost as a percentage of GMV improves from approximately 1.8% today to under 0.2% at 1M DAU.

---

## Why Our Architecture is Acquisition-Ready

**Clean microservice boundaries.** Each of the 10 services runs as an independent containerised process with its own database connection pool, autoscaling policy, and deployment lifecycle. An acquirer can extract any service — the payment orchestration layer, the AI pricing engine, the multi-tenant B2B engine — and deploy it independently. There are no monolithic entanglements.

**No proprietary cloud lock-in.** Every service runs in a Docker container on AWS ECS Fargate. Moving to Google Cloud Run, Azure Container Apps, or a private Kubernetes cluster requires changing environment variable endpoints and CloudFormation templates — not application code. The codebase has zero proprietary AWS SDK calls in business logic; all AWS interactions are behind service boundaries (S3 client in backup scripts, SES client in notification service).

**Multi-region from day one.** Most travel platforms at our stage operate from a single region and face a costly re-architecture when they expand internationally. Our regulatory compliance data residency (KVKK for Turkey, DPDP for India, PDPA for Malaysia/Singapore, GDPR for EU markets) is already implemented at the database shard level. An acquirer with global distribution gains compliant regional deployments on day one.

**AI components are model-agnostic.** The Claude API integration is a single service boundary in `backend/services/pricing/`. The agentic chat is a single API route. Swapping AI providers, upgrading to a newer model, or adding a second model for comparison — any of these requires changing one configuration parameter. There is no AI vendor lock-in.

**Payment infrastructure covers 10 markets out of the box.** Building payment gateway integrations for KSA, Turkey, Indonesia, Malaysia, and Pakistan individually takes 12–18 months of engineering time and regulatory relationship-building. An acquirer in the travel or fintech space acquires these integrations immediately. The payment router (`PaymentRouter.ts`) abstracts all gateway-specific logic behind a single `processPayment(countryCode, amount, method)` interface.

**The hard regulatory work is done.** KVKK compliance for Turkey, DPDP compliance for India, PDPA compliance for Malaysia/Singapore — these require legal counsel, data flow mapping, and architectural changes. We have done this work. A competitor entering these markets today faces 6–9 months of compliance groundwork before they can legally process payments and store user data in each jurisdiction.

---

*This brief reflects infrastructure state and financial estimates as of March 2026. AWS pricing subject to change. Engineering effort estimates assume a team of 3–4 engineers. Scaling timelines are targets based on current growth trajectory — actual timelines depend on user growth rates. All costs are illustrative and exclude business-layer costs (team, marketing, GDS fees).*

*UTUBooking — Platform Scalability Brief | Series B | Confidential | March 2026*
