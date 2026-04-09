# UTUBooking Dev Memory

## Project
- Company: AMEC Solutions | Product: UTUBooking.com
- Gulf/ME travel booking — Hotels, Flights, Cars — Hajj & Umrah focus
- Primary market: Saudi Arabia (SAR first), UAE, Egypt

## Stack
- Backend: Node.js Express microservices, PostgreSQL, Redis, Kafka (planned)
- Frontend: Next.js 15 (App Router) + Tailwind + Radix UI + React Query + axios
- Auth: JWT 15min access + 7-day refresh tokens stored in Redis
- API: RESTful /api/v1/ prefix, nginx gateway on port 80

## Backend Services (all in backend/)
| Service | Port | Path |
|---------|------|------|
| auth | 3001 | services/auth |
| hotel | 3003 | hotel-service |
| flight | 3004 | services/flight |
| car | 3005 | services/car |
| booking | 3006 | services/booking |
| payment | 3007 | services/payment |

All 6 services have Dockerfiles. Migrations in backend/migrations/.

## Adapters (backend/adapters/)
- hotelbeds.js — hotels + car hire, Makkah 500m Haram proximity mode
- amadeus.js — flights primary GDS
- sabre.js — flights fallback GDS
- carhire.js — car rental via Hotelbeds Car API

## Payments
- STC Pay, Mada (Moyasar gateway), Visa/Mastercard (Stripe), Apple Pay

## Frontend (frontend/src/)
- page.tsx — full home page: EN/AR bilingual, hotel/flight/car search tabs
- lib/api.ts — axios client, HotelOffer/FlightOffer/CarOffer types, search fns
- providers.tsx — React Query QueryClientProvider (wrapped in layout.tsx)
- global.d.ts — CSS module declaration (until next dev generates routes.d.ts)

## CI/CD (.github/workflows/)
- deploy-backend.yml — ECS me-south-1 Bahrain, 6-service matrix, ECR push, DB migrate, smoke test
- deploy-frontend.yml — AWS Amplify me-south-1, Next.js build → zip → manual deploy

## Local Dev
- docker-compose.yml — all 6 services + postgres + redis + nginx, env from backend/.env
- nginx/gateway.conf — reverse proxy routing all /api/v1/* paths

## Rules (CLAUDE.md)
- /plan mode required before multi-file architectural changes
- Code review required from outsourced dev team before merge
- NEVER commit secrets; NEVER email clients without human approval
- Financial/legal output requires human + professional review
