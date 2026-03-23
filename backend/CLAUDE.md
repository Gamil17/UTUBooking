# UTUBooking Dev Brain
- Stack: Node.js + Express microservices + PostgreSQL + Redis + Kafka
- Auth: JWT (15min access tokens) + refresh tokens (7 days)
- API style: RESTful with /api/v1/ prefix + GraphQL gateway
- Always use /plan mode before multi-file architectural changes
- Code review required from outsourced dev team before merge

## Muslim World Expansion — Dev Rules (Phase 5-7 Addition)

**Regional Payment Routing**: ALWAYS use `PaymentRouter.ts` — never hardcode gateway
**Data Residency**: ALWAYS check `DB_REGION_MAP` before writing user data
**i18n**: ALL user-facing strings MUST have translations in all 8 locales before PR merge

### New Script Rules:
- **Urdu (ur)**: use `'Noto Nastaliq Urdu'` font, `line-height: 2.2`, `direction: rtl`
- **Hindi (hi)**: use `'Noto Sans Devanagari'`, `line-height: 1.8`, `direction: ltr` (NOT rtl)
- **Farsi (fa)**: use `'Vazirmatn'`, `direction: rtl` — similar to Arabic layout rules

**Iran**: ANY code touching Iranian users requires Legal Agent review first.
         NEVER mix Iran infrastructure with other market services.

Before any payment code change: run `npm test -- --testPathPattern=payment`
Before any i18n change: run `npm run i18n:validate` to check all locales
