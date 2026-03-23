# UTUBooking App — Workspace Instructions

Hajj & Umrah hotel/flight/car booking platform serving pilgrims in Makkah and Madinah.
Bilingual (Arabic / English), RTL-safe, mobile-first.

---

## Stack

| Layer       | Technology |
|-------------|-----------|
| Mobile      | Expo ~55 · React Native 0.83.2 · TypeScript · react-navigation 7 |
| Frontend    | Next.js 16 App Router · Tailwind CSS · React Query v5 · axios |
| Backend     | Node.js · Express microservices · PostgreSQL 16 · Redis 7 |
| AI          | Claude claude-sonnet-4-6 (`@anthropic-ai/sdk`) |
| Infra       | AWS ECS Fargate · ElastiCache · RDS · CloudFront · Lambda · nginx |
| IaC         | CloudFormation (`infra/cloudformation/01-08`) |
| Monitoring  | Grafana (`monitoring/grafana/`) · Prometheus |

---

## Repository Structure

```
.
├── backend/
│   ├── services/           # Express microservices (one folder = one service)
│   │   ├── auth/           # port 3001 — JWT auth
│   │   ├── booking/        # port 3006
│   │   ├── car/            # port 3005
│   │   ├── flight/         # port 3004
│   │   ├── loyalty/        # port 3008
│   │   ├── payment/        # port 3007 — STC Pay, Mada, Stripe
│   │   ├── pricing/        # port 3011 — AI revenue optimization ← NEW
│   │   ├── wallet/         # port 3010 — multi-currency FX
│   │   └── whitelabel/     # port 3009 — multi-tenant
│   ├── hotel-service/      # port 3003 — Hotelbeds adapter
│   ├── adapters/           # Amadeus, Sabre, CarTrawler, Hotelbeds
│   ├── migrations/         # node-pg-migrate scripts
│   └── shared/             # redis-cluster.js
├── frontend/               # Next.js 16 App Router
│   └── src/
│       ├── app/
│       │   ├── admin/      # Revenue admin dashboard ← NEW
│       │   └── api/        # Route handlers (chat, notifications, hajj-precache)
│       ├── components/
│       │   ├── admin/      # RevParWidget, ConversionFunnelWidget, PricingRecommendationsWidget
│       │   └── AiChat/     # AI chat widget (SSE, claude-sonnet-4-6)
│       └── lib/
│           └── api.ts      # Axios wrapper + all API call functions
├── mobile/                 # Expo app (screens, i18n, navigation)
├── infra/
│   ├── cloudformation/     # 8 CF stacks (VPC → Grafana → Pricing Lambda)
│   ├── lambda/
│   │   └── pricing-cron/   # Runs every 6h via EventBridge ← NEW
│   └── scripts/            # pg-backup.sh, pg-restore.sh
├── nginx/gateway.conf       # Reverse proxy — routes /api/v1/* to services
├── docker-compose.yml       # Full local stack
└── monitoring/grafana/      # Dashboard provisioning
```

---

## Dev Setup

```bash
# Start full local stack (all services + postgres + redis + nginx)
docker compose up -d

# Run DB migrations only
docker compose run --rm migrate

# Mobile
cd mobile && npx expo start

# Frontend only
cd frontend && npm run dev    # http://localhost:3000
```

### Required env vars (`backend/.env`)

```env
DATABASE_URL=postgresql://utu_user:password@localhost:5432/utu_booking
REDIS_URL=redis://localhost:6379
JWT_SECRET=<secret>
ADMIN_SECRET=<ops-only token>
ANTHROPIC_API_KEY=sk-ant-...          # Claude API — pricing + AI chat
INTERNAL_API_SECRET=<shared secret>   # Lambda → pricing service → push notifications
FRONTEND_URL=http://localhost:3000    # Used by pricing service for push alerts
HOTEL_CAPACITY=50                     # Default rooms per hotel (demand forecasting)
EXCHANGERATE_API_KEY=<key>            # wallet FX service
```

---

## Coding Conventions

### Backend microservice pattern (use wallet/pricing as reference)
- Entry: `src/index.js` — Express + `/health` + error handler
- DB: `src/db/pg.js` exports `{ pool, readPool }` (max 20 each)
- Redis: `src/db/redis.js` — self-contained ioredis client
- Auth: `src/middleware/auth.js` (JWT) + `src/middleware/adminAuth.js` (Bearer ADMIN_SECRET)
- Layers: `db/repo.js` → `services/` → `controllers/` → `routes/`
- Reads use `readPool`, writes use `pool`, transactions use `client` with `release()` in finally

### Frontend
- `'use client'` for all interactive components
- `useQuery` / `useMutation` from `@tanstack/react-query` — no raw fetch
- API calls via `api` axios instance from `@/lib/api`
- RTL: use `start`/`end` not `left`/`right`
- WCAG 2.1 AA: `minHeight: 44` on all pressables, `aria-label` on icon buttons

### Brand
- Primary: `#10B981` (green) · Dark: `#111827` · Gray: `#6B7280` · Border: `#E5E7EB` · Bg: `#F9FAFB`

### Currency
- SAR primary — use `.toLocaleString('en-SA')`, never hardcode symbols

---

## Key Features

| Feature | Location |
|---------|----------|
| Hotel / Flight / Car search | `backend/hotel-service/`, `services/flight/`, `services/car/` |
| Booking + payments | `services/booking/`, `services/payment/` |
| Loyalty (points/tiers) | `services/loyalty/` |
| Multi-currency wallet | `services/wallet/` — SAR/AED/KWD/JOD/MAD/TND |
| White-label / multi-tenant | `services/whitelabel/` |
| AI chat widget | `frontend/src/components/AiChat/` + `app/api/chat/` |
| PWA + push notifications | `frontend/src/sw/` + `app/api/notifications/` |
| **AI Revenue Optimization** | `services/pricing/` + `frontend/src/app/admin/` |
| **Demand forecasting** | `services/pricing/src/services/demand.service.js` |
| **Admin dashboard** | `frontend/src/app/admin/page.tsx` |

---

## Migrations

Files in `backend/migrations/` use node-pg-migrate (`exports.up` / `exports.down`).
Timestamp prefix: `YYYYMMDDNNNNNN` — always increment after the latest.
Current latest: `20260314000022_create_demand_tables.js`

---

## Testing & Verification

```bash
# Health checks
curl http://localhost/health                          # nginx gateway
curl http://localhost:3011/health                     # pricing service

# Trigger AI pricing recommendation (requires JWT)
curl -X POST http://localhost/api/v1/pricing/recommend \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"hotelId":"MCM001","basePrice":450,"currency":"SAR","checkIn":"2026-05-28","checkOut":"2026-05-31"}'

# Admin recommendations (requires ADMIN_SECRET)
curl http://localhost/api/v1/pricing/recommendations \
  -H "Authorization: Bearer <ADMIN_SECRET>"

# Trigger cron manually
curl -X POST http://localhost:3011/api/v1/pricing/internal/cron \
  -H "x-internal-secret: <INTERNAL_API_SECRET>"
```

---

## Common Issues

- **Migrations fail**: ensure postgres healthcheck passes before `migrate` service starts
- **Redis connection errors**: pricing/wallet services log warn and degrade gracefully — not fatal
- **Claude API timeout**: `pricing.service.js` has no retry — re-call or rely on 6h cron
- **RTL layout broken**: check for `left`/`right` CSS — replace with `start`/`end`
- **Push notifications not firing**: verify `INTERNAL_API_SECRET` matches between pricing service and frontend

---

## Pull Request Guidelines

1. Always use `/plan` mode for multi-file architectural changes (per `backend/CLAUDE.md`)
2. New migrations: increment timestamp, always add `exports.down`
3. New services: follow wallet pattern, add to `nginx/gateway.conf` + `docker-compose.yml`
4. Code review required from outsourced dev team before merge
5. RTL + WCAG check on all UI changes
