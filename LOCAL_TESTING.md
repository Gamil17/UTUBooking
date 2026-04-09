# Local Testing Guide — UTUBooking

Last updated: 2026-04-09 (design system v1.0.0 complete — design tokens, Tailwind v4 @theme, 8 UI components, RTLProvider, Storybook; 1,780 token migrations across 105 files; 95 Vitest tests passing; tsc + ESLint clean)

---

## Current System State

| Layer | Port | Status | Notes |
|-------|------|--------|-------|
| Frontend | 3000 | ✅ Ready | Next.js 16, 27 locales, RTL, CJK fonts |
| Backend — Auth | 3001 | ✅ Running | JWT + Redis, refresh token rotation, admin APIs |
| Backend — Notification | 3002 | ✅ Running | Email automation, incomplete-booking triggers |
| Backend — Hotel | 3003 | ✅ Ready | Hotelbeds + Booking.com dedup |
| Backend — Flight | 3004 | ✅ Ready | Amadeus GDS + Sabre fallback |
| Backend — Car | 3005 | ✅ Ready | CartTrawler, FX conversion |
| Backend — Booking | 3006 | ✅ Ready | CRUD + `/contact` internal endpoint |
| Backend — Payment | 3007 | ✅ Implemented | 15 gateways, `/available-gateways` live |
| Backend — Loyalty / Wallet | 3008 | ✅ Ready | UTU Rewards points engine + wallet |
| Backend — Pricing | 3011 | ✅ Ready | Claude AI demand forecasting |
| Backend — Whitelabel | 3012 | ✅ Ready | B2B white-label partner API |
| Backend — Admin | 3013 | ✅ Ready | Internal admin operations API |
| Mobile | — | ✅ Ready | Expo, 9 locales, RTL for AR/FA/UR |
| i18n Validation | — | ✅ Script | `npm run i18n:validate` |

---

## Design System — v1.0.0

Implemented 2026-04-09. All items below are verified programmatically.

### Verification (CI-safe — no browser required)

```bash
cd frontend
pnpm tsc --noEmit                         # TypeScript — 0 errors
pnpm vitest run                           # 95 tests across 10 test files — all pass
pnpm eslint src/components/ui/ src/components/layout/  # 0 warnings
grep -r 'bg-\[#' src/components/ui/ src/components/layout/  # should return 0 lines
```

### What was built

| File | Description |
|---|---|
| `src/design-system/tokens.ts` | Single source of truth — all colors, spacing, radius, fonts |
| `src/app/globals.css` | CSS custom properties (`--utu-*`) + Tailwind v4 `@theme inline` block |
| `src/lib/utils.ts` | `cn()` utility (clsx + tailwind-merge) |
| `src/components/ui/Button/` | 4 variants × 3 sizes, loading, RTL, a11y |
| `src/components/ui/Input/` | label, error, helper, icons, RTL |
| `src/components/ui/Card/` | Composable — Root, Header, Body, Footer |
| `src/components/ui/Badge/` | 5 variants × 2 shapes, dot, size |
| `src/components/ui/Avatar/` | initials, icon, src, 4 sizes, AvatarGroup |
| `src/components/ui/Table/` | Composable — Root, Header, Body, Row, HeadCell, Cell |
| `src/components/ui/Toast/` | 4 variants, Radix provider, useToast hook, RTL swipe |
| `src/components/ui/SegmentedControl/` | Accessible radio group, RTL |
| `src/components/layout/RTLProvider.tsx` | Direction context, useDirection hook |
| `src/components/layout/DirectionToggle.tsx` | EN ↔ العربية switcher button |
| `src/stories/DesignSystem.stories.tsx` | Color swatches, type specimens (EN + AR), spacing, radius |
| `.storybook/preview.tsx` | RTL toolbar, page/card/dark backgrounds, 3 viewports |

### Token audit
1,780 replacements migrated across 105 files. Zero hardcoded hex in design-system components.
Payment gateway brand colors (PayPal, Stripe, iyzico, TWINT, Interac, iPay88, WhatsApp) are
documented with `/* EXCEPTION: reason */` comments and are intentional.

### Start Storybook

```bash
cd frontend
pnpm storybook        # http://localhost:6006
```

Toggle direction via the globe icon in the Storybook toolbar (LTR / RTL).

---

## Frontend

### Start

```bash
cd frontend
cp .env.example .env.local   # first time — fill in values (see comments inside)
npm install                  # first time — installs CJK/Thai fonts added in Phase 13
npm run dev                  # http://localhost:3000
```

### Locale Test Page

```
http://localhost:3000/locales-test
```

Shows a full table of all 27 locales with font, currency, RTL status, and live
sample text in each language.

### Switch Locale

The `LocaleSwitcher` is in the sticky header on all non-home pages.
On the home page, it appears in `HomeHeader`.

Manual override via cookie (browser console):
```javascript
document.cookie = 'utu_locale=ar; path=/; max-age=31536000';
location.reload();
```

---

## Frontend Testing Checklist

### Visual

- [ ] `/locales-test` — all 27 locale cards render with correct text
- [ ] LocaleSwitcher dropdown opens, search filters, checkmark on active locale
- [ ] Selecting AR/FA/UR → page layout flips to RTL
- [ ] Selecting JA/KO/ZH-CN/ZH-HK/ZH-TW → CJK font renders (not tofu squares)
- [ ] Selecting TH → Thai script renders correctly

### Font loading (DevTools → Network → Fonts)

| Font | Locales |
|------|---------|
| Inter | EN, FR, TR, ID, MS, DE, IT, NL, PL, ES, SV, RU, VI, EN-GB, EN-US, PT-BR, ES-419 |
| Noto Sans Arabic | AR |
| Noto Nastaliq Urdu | UR |
| Noto Sans Devanagari | HI |
| Vazirmatn | FA |
| Noto Sans JP | JA |
| Noto Sans KR | KO |
| Noto Sans Thai | TH |
| Noto Sans SC | ZH-CN |
| Noto Sans TC | ZH-HK, ZH-TW |

> Only the active locale's font should load — not all 10 at once.

### RTL verification

```javascript
// Paste in DevTools Console after switching to AR/FA/UR
console.log('lang:', document.documentElement.lang);
console.log('dir:', document.documentElement.dir);          // should be 'rtl'
console.log('font:', getComputedStyle(document.body).fontFamily);
```

### New page smoke tests

- [ ] `/forgot-password` — enter email, click "Send reset link", confirm success message appears (no email enumeration — always shows success)
- [ ] `/affiliates` — fill the apply form (name, email, website, platform, audience) and submit; confirm success card appears
- [ ] `/blog` — click each category pill ("Hajj", "Umrah", "Destinations") and confirm posts filter correctly; "All" restores full list
- [ ] `/umrah-packages` — all three "Search Hotels" buttons navigate to `/hotels/search`
- [ ] `/hajj-services` — bottom CTA "Search Hotels Now" navigates to `/hotels/search`
- [ ] `/account` (logged in, no bookings) — "Plan your next trip" CTA navigates to `/hotels/search`
- [ ] `/login` — "Forgot password?" link navigates to `/forgot-password`

### Checkout persistence smoke tests (logged-in users only)

- [ ] Hotels checkout — complete a payment, verify `bookingRef` appears under "Ref:" on confirmation; if backend is down, amber warning `bookingNotSaved` appears instead of a blank or broken UI
- [ ] Flights checkout — same as above
- [ ] Cars checkout — same as above
- [ ] To simulate backend failure: stop the booking service (`Ctrl+C` on port 3006) and complete checkout; confirm amber warning renders and browser console shows `[checkout] booking persistence failed:`
- [ ] Admin → campaigns → "Save Campaign" button is disabled until at least one deal row has a non-empty English title

### Performance

- Lighthouse score target: > 80
- Font budget: ≤ 250 KB total (gzip ~75 KB) per locale

---

## i18n Validation

```bash
cd frontend
npm run i18n:validate
```

Checks all 26 non-English locale files have 100% key coverage vs `en.json`.
Currently all pass. Run before every push to `main`.

**Key counts (as of 2026-04-02):** 1,401 total keys across all namespaces (+41 from affiliate form, forgot/reset-password, and contact form i18n). `admin` namespace: 215 keys. `hero` namespace: 68 keys (includes all TabSections content).

### Admin dashboard i18n status
| File | Status |
|---|---|
| `admin/page.tsx` | `getTranslations('admin')` wired (server component) |
| `RevParWidget.tsx` | `useTranslations('admin')` wired — all strings translated |
| `ConversionFunnelWidget.tsx` | `useTranslations('admin')` wired — all strings translated |
| `PricingRecommendationsWidget.tsx` | `useTranslations('admin')` wired — all strings translated |
| `campaigns/page.tsx` | `useTranslations('admin')` wired — all strings translated including form placeholders |
| `admin/analytics/page.tsx` | `useTranslations('admin')` wired — KPIs, charts, period selector |
| `admin/users/page.tsx` | `useTranslations('admin')` wired — table, filters, suspend modal |
| `admin/settings/page.tsx` | `useTranslations('admin')` wired — all section labels |

### New pages built (2026-04-02)
| Route | Description |
|---|---|
| `/loyalty` | UTU Rewards loyalty program — tiers, earn rates, FAQ, CTA |
| `/promo-codes` | Active promo codes with copy-to-clipboard, how-to, T&C |
| `/admin/analytics` | Platform KPIs, destination/market charts, conversion rate |
| `/admin/users` | User list, search/filter, suspend/unsuspend with modal |
| `/admin/settings` | Notification delays, pricing multipliers, maintenance mode |
| `/forgot-password` | Password reset request page — anti-enumeration, generates token, dispatches via SendGrid |
| `/reset-password?token=` | Set new password page — validates token from URL, calls auth service |

### Frontend link & content audit fixes (2026-04-02)

All stray `href="/"` CTA links replaced with correct destinations:

| Page | Fix |
|---|---|
| `/umrah-packages` | All buttons → `/hotels/search`; packages now primary content (Coming Soon demoted to footnote) |
| `/hajj-services` | CTA "Search Hotels Now" → `/hotels/search` |
| `/blog/[slug]` | CTA "Search hotels and flights" → `/hotels/search` |
| `/about` | CTA "Start Booking" → `/hotels/search` |
| `/account` | "Book a trip" + "Plan your next trip" → `/hotels/search` |
| `/affiliates` | Replaced placeholder "Contact Us to Apply" with a real application form (`AffiliateApplyForm.tsx`) — submits to `/api/contact` with `topic: affiliate` |
| `/login` | "Forgot password?" now links to `/forgot-password` instead of `/contact` |
| `/blog` | Category filter buttons now actually filter posts (extracted to `BlogPostsGrid.tsx` client component) |

New shared config: `src/lib/siteConfig.ts` — all contact emails and phone numbers in one place.
ContactForm success/sending strings are now translatable (no longer hardcoded English).

### API routes added (2026-04-02)
| Route | Description |
|---|---|
| `POST /api/auth/forgot-password` | Accepts email, forwards to auth service, always returns 200 (prevents enumeration) |

### i18n audit complete (2026-04-02)
- `TabSections.tsx` — TrustBanner, Features, AppDownload, partner texts, FAQ headings, car steps: fully translated
- `LocaleSwitcher.tsx` — search placeholder + "No results found" wired
- `CountrySelector.tsx` + `CurrencySelector.tsx` — search + noResults wired
- `common.search` + `common.noResults` keys added to all 27 locales
- `admin.usersTotal` interpolation key added
- TypeScript: zero errors (`npx tsc --noEmit` clean)
- Remaining English-only (intentional): `terms/`, `privacy/`, `ccpa-opt-out/` (legal docs), FAQ Q&A body text (requires professional translation + Arabic native review per CLAUDE.md)

### Nav & footer fixes (2026-04-02)
- Header + HomeHeader: `promoCodes` href fixed (`/umrah-packages` → `/promo-codes`)
- Footer: `loyalty` and `promoCodes` links added to "Plan & Book" column
- Admin sidebar: extracted to `AdminNav` client component with active-state highlighting
- `/locales-test`: returns `notFound()` in production

---

## Backend — Payment Service

All 15 gateways are implemented. No stubs.

### Start

```bash
cd backend/services/payment
npm install
npm run dev          # port 3007
```

### Gateway map (quick reference)

| Country | Gateway | Route prefix |
|---------|---------|--------------|
| SA | STC Pay | `/api/payments/initiate` |
| SA (card) | Moyasar/Mada | `/api/payments/mada/` |
| International | Stripe | `/api/payments/stripe/` |
| EU | Stripe Payment Element | `/api/payments/stripe/element/` |
| TR | iyzico | `/api/payments/iyzico/` |
| ID | Midtrans Snap + Core | `/api/payments/midtrans/` |
| MY | iPay88 | `/api/payments/ipay88/` |
| PK (primary) | JazzCash | `/api/payments/jazzcash/` |
| PK (secondary) | Easypaisa | `/api/payments/easypaisa/` |
| IN / BD | Razorpay | `/api/payments/razorpay/` |
| CH | TWINT | `/api/payments/twint/` |
| US | PayPal | `/api/payments/paypal/` |
| US (BNPL ≥ $200) | Affirm | `/api/payments/affirm/` |
| CA | Interac Online | `/api/payments/interac/` |
| BR | Pix / Boleto | `/api/payments/pix/` |
| LATAM | MercadoPago | `/api/payments/mercadopago/` |

### Health check

```bash
curl http://localhost:3007/health
# { "status": "ok", "service": "payment-service", "ts": "..." }
```

### Test gateway discovery

```bash
curl "http://localhost:3007/api/payments/available-gateways?countryCode=TR"
curl "http://localhost:3007/api/payments/available-gateways?countryCode=ID"
curl "http://localhost:3007/api/payments/available-gateways?countryCode=MY"
```

Returns: `{ countryCode, primaryGateway, allGateways[], fee, minAmount, maxAmount, currency }`

Implemented in `src/services/gatewayRouter.js` (CommonJS mirror of `PaymentRouter.ts`).

### Environment variables

All required keys are documented in `backend/services/payment/.env.example`.
Copy it to `.env` and fill in sandbox credentials (see Sandbox Credential Setup section below).

---

## Backend — Auth Service

```bash
cd backend/services/auth
npm run dev          # port 3001
```

```bash
curl http://localhost:3001/health
```

### Migration (run once after updating)

```bash
cd backend
npx db-migrate up   # or: node-pg-migrate up
```

New migration `20260402000008_add_user_admin_columns` adds:
`name`, `locale`, `country`, `status`, `suspension_reason`, `suspended_at`, `last_seen_at` to `users` table.
Backfills existing rows from `name_en` + `is_active`.

### Admin API endpoints (added 2026-04-02)

Protected by `x-admin-secret` header (set `ADMIN_SECRET` in auth service `.env`).
Called only from the Next.js BFF (`/api/admin/*` routes via cookie auth).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users — `?search=`, `?status=active\|suspended`, `?page=`, `?limit=` |
| POST | `/api/admin/users/:id/suspend` | Suspend user — body `{ reason }` required |
| POST | `/api/admin/users/:id/unsuspend` | Restore suspended user |

```bash
# Test locally (replace SECRET with value from .env)
curl -H "x-admin-secret: SECRET" \
     "http://localhost:3001/api/admin/users?page=1&limit=10"

curl -X POST -H "x-admin-secret: SECRET" \
     -H "Content-Type: application/json" \
     -d '{"reason":"Terms violation"}' \
     "http://localhost:3001/api/admin/users/<uuid>/suspend"
```

### Environment variables

All required keys are documented in `backend/services/auth/.env.example`.
Copy it to `.env` — key fields: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_SECRET` (all three must match across services that share them).

---

## Mobile

### Start

```bash
cd mobile
npx expo start
# i → iOS simulator
# a → Android emulator
# w → web browser
```

### Supported locales (9)

`EN AR FR TR ID MS FA HI UR`

RTL auto-applied for: **AR, FA, UR**

### Test language switching

```typescript
import { switchLanguage } from '@/i18n';
await switchLanguage('ar');   // switches to Arabic + forces RTL
await switchLanguage('ur');   // switches to Urdu + forces RTL
await switchLanguage('fa');   // switches to Farsi + forces RTL
await switchLanguage('en');   // back to English + LTR
```

### Test matrix — mobile

- [ ] Language switcher changes all screen text
- [ ] Arabic layout mirrors (RTL)
- [ ] Urdu Nastaliq font renders (not substituted with Arabic Naskh)
- [ ] Farsi numbers display in Eastern Arabic numerals (fa-IR locale)
- [ ] Hindi Devanagari renders correctly (NOT RTL)
- [ ] Distance displays in km for TR, ID, MS, FA, HI, UR

---

## End-to-End Scenarios

### Booking from Indonesia (Midtrans)

1. Open `http://localhost:3000`
2. LocaleSwitcher → Bahasa Indonesia (ID)
3. Verify page renders in Indonesian
4. Search for hotel in Makkah
5. Proceed to checkout
6. Payment method should show Midtrans options (GoPay, bank transfer, QRIS)
7. Complete booking → `POST /api/payments/midtrans/initiate`
8. Midtrans returns Snap token → frontend embeds Snap.js popup
9. After payment → Midtrans POSTs to `/api/payments/midtrans/notification`
10. Push notification fires in Indonesian

### Booking from Saudi Arabia (Moyasar/Mada)

1. Open `http://localhost:3000`
2. LocaleSwitcher → العربية (AR) — verify RTL layout
3. Search for hotel in Makkah — results should include Hotelbeds properties
4. Proceed to checkout — currency must show SAR
5. Payment method: Mada debit card via Moyasar
6. Complete booking → `POST /api/payments/mada/initiate`
7. Confirm booking confirmation email fires (notification service)

### Forgot/reset password flow

1. Go to `http://localhost:3000/login`
2. Click "Forgot password?" — navigates to `/forgot-password`
3. Enter a registered email — submit
4. Success message appears regardless of email existence (anti-enumeration)
5. Auth service console logs `[forgot-password] reset URL: http://localhost:3000/reset-password?token=...`
6. Copy that URL into browser → `/reset-password` page loads
7. Enter new password + confirm → submit
8. Success card appears → "Sign in" redirects to `/login`
9. Log in with new password to confirm it works

> With `SENDGRID_API_KEY` set, step 5 delivers a real email instead of logging to console.

---

## Common Issues & Fixes

### Fonts show as squares (tofu) for CJK/Thai
**Fix**: Run `npm install` in `frontend/` to install the Phase 13 font packages:
```bash
npm install @fontsource/noto-sans-jp @fontsource/noto-sans-kr \
            @fontsource/noto-sans-sc @fontsource/noto-sans-tc \
            @fontsource/noto-sans-thai
```

### RTL layout not flipping
**Fix**: Check `layout.tsx` reads the `dir` attribute from `getLocaleAttrs()`.
Expected: `<html lang="ar" dir="rtl">` when Arabic is active.

### `npm run i18n:validate` fails
**Fix**: A locale file is missing keys vs `en.json`. The script prints which keys are missing per locale. Add the missing keys to the relevant `.json` file.

### Payment webhook not received locally
**Fix**: Use [ngrok](https://ngrok.com) to expose localhost:
```bash
ngrok http 3007
# Use the ngrok URL as IYZICO_CALLBACK_URL, MIDTRANS_NOTIFICATION_URL, etc.
```

### `Cannot find module '@/i18n/config'`
**Fix**: Ensure `tsconfig.json` has:
```json
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

---

## Sandbox Credential Setup

Copy each service's `.env.example` to `.env` and fill in sandbox credentials.
All gateways have free test/sandbox accounts — no real money required.

### Step 1 — Generate shared secrets (run once)

```bash
# JWT secrets (auth + booking + loyalty services must all share JWT_SECRET)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Admin + internal secrets (copy same value to ALL services that use it)
node -e "console.log('ADMIN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('INTERNAL_API_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# VAPID keys for push notifications
cd frontend && npx web-push generate-vapid-keys
```

### Step 2 — Sign up for sandbox accounts

| Gateway | Market | Sign-up URL | Notes |
|---------|--------|-------------|-------|
| **Hotelbeds** | GCC/Makkah | https://developer.hotelbeds.com | Free test account — use `HOTELBEDS_ENV=test` |
| **Amadeus** | Flights | https://developers.amadeus.com | Free Self-Service tier — `AMADEUS_HOSTNAME=test` |
| **Moyasar** | KSA (Mada) | https://docs.moyasar.com | Dashboard → API Keys → Test keys start with `sk_test_` |
| **STC Pay** | KSA | https://dev.stcpay.net | Merchant registration required; test IDs start with `TEST_` |
| **Stripe** | EU/US/UK/CA | https://dashboard.stripe.com/register | Instant — test keys start with `sk_test_` |
| **PayPal** | US | https://developer.paypal.com | Create Sandbox App → Client ID + Secret |
| **Affirm** | US (BNPL) | https://docs.affirm.com | Request sandbox — `AFFIRM_ENV=sandbox` |
| **iyzico** | TR | https://dev.iyzipay.com | Free sandbox — keys start with `sandbox-` |
| **Midtrans** | ID | https://dashboard.sandbox.midtrans.com | Free — keys start with `SB-Mid-server-` |
| **iPay88** | MY | https://developer.ipay88.com.my | Email request — assigned `M00001` test code |
| **Razorpay** | IN | https://dashboard.razorpay.com | Test keys start with `rzp_test_` |
| **JazzCash** | PK | https://jazzcash.com.pk/corporate/ | Developer Portal — merchant onboarding required |
| **Easypaisa** | PK | https://developer.easypaisa.com.pk | Merchant Services sign-up |
| **TWINT** | CH | https://www.twint.ch/en/business/twint-partner-api/ | CH business registration required |
| **Bambora** | CA | https://dev.na.bambora.com | Create test account — `BAMBORA_ENV=sandbox` |
| **MercadoPago** | BR/LATAM | https://www.mercadopago.com.br/developers/en/devpanel | Create test users — access token starts with `TEST-` |
| **CartTrawler** | Cars | Contact account manager | `CARTRAWLER_CLIENT_ID` issued at registration |
| **Booking.com** | EU hotels | https://www.booking.com/affiliate-program/v2/signup.html | Affiliate API — `BOOKINGCOM_ENV=test` |
| **Tabung Haji** | MY Hajj | https://www.tabunghaji.gov.my | Partner application via official portal |
| **HCoI** | IN Hajj | https://minorityaffairs.gov.in | Email it@hajcommittee.gov.in with company docs |

### Step 3 — Local webhook testing

Payment gateways cannot reach `localhost` for webhook callbacks. Use ngrok:

```bash
# Install: https://ngrok.com/download
ngrok http 3007

# Copy the HTTPS forwarding URL (e.g. https://abc123.ngrok.io) and set in .env:
STCPAY_CALLBACK_URL=https://abc123.ngrok.io/api/payments/webhook
MIDTRANS_NOTIFICATION_URL=https://abc123.ngrok.io/api/payments/midtrans/notification
STRIPE_WEBHOOK_SECRET=<from: stripe listen --forward-to localhost:3007/api/payments/stripe/webhook>

# Stripe has its own local forwarder — preferred over ngrok for Stripe:
stripe listen --forward-to localhost:3007/api/payments/stripe/webhook
```

### Step 4 — Verify all services start

```bash
# Run from the repo root. Each service runs in its own subshell so the cd is scoped.
# Core services (always start these):
(cd backend/services/auth         && cp .env.example .env && npm run dev) &
(cd backend/services/notification && cp .env.example .env && npm run dev) &
(cd backend/hotel-service         && cp .env.example .env && npm run dev) &
(cd backend/services/flight       && cp .env.example .env && npm run dev) &
(cd backend/services/car          && cp .env.example .env && npm run dev) &
(cd backend/services/booking      && cp .env.example .env && npm run dev) &
(cd backend/services/payment      && cp .env.example .env && npm run dev) &
(cd backend/services/loyalty      && cp .env.example .env && npm run dev) &
(cd backend/services/pricing      && cp .env.example .env && npm run dev) &
# Optional services (start only if needed):
# (cd backend/services/wallet     && cp .env.example .env && npm run dev) &
# (cd backend/services/whitelabel && cp .env.example .env && npm run dev) &
# (cd backend/services/admin      && cp .env.example .env && npm run dev) &
(cd frontend                      && cp .env.example .env.local && npm run dev)
```

Health checks (run after ~10 seconds):
```bash
curl http://localhost:3001/health   # auth
curl http://localhost:3002/health   # notification
curl http://localhost:3003/health   # hotel
curl http://localhost:3004/health   # flight
curl http://localhost:3005/health   # car
curl http://localhost:3006/health   # booking
curl http://localhost:3007/health   # payment
curl http://localhost:3008/health   # loyalty (wallet)
curl http://localhost:3011/health   # pricing
```

---

## What Still Needs a Human

- [ ] Obtain sandbox API credentials for each payment gateway (see Sandbox Credential Setup section above)
- [ ] Fill in credentials in each service's `.env` (copied from `.env.example` — every service now has one)
- [ ] Update real Saudi + UAE support phone numbers in `frontend/src/lib/siteConfig.ts` (currently placeholder zeros)
- [ ] Add `SENDGRID_API_KEY` to `backend/services/auth/.env` to enable reset email dispatch (see auth `.env.example`)
- [ ] QA test on physical Android + iOS devices (RTL, CJK fonts)
- [ ] Sign AWS DPA (EU GDPR go-live blocker)
- [ ] ICO registration for UK users
- [ ] Appoint DPO (required before EU launch)
- [ ] Arabic content review by native Gulf Arabic speaker before launch
