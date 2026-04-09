# UTUBooking.com — Frontend Project Context

## Product
UTUBooking.com is a bilingual (Arabic/English) travel booking platform
targeting the Gulf and Middle East market, with special focus on
Makkah & Madinah (Hajj/Umrah travelers). The platform books hotels,
flights, and car rentals.

## Tech Stack
- Framework: Next.js 16 App Router with TypeScript
- Styling: Tailwind CSS v4 (tokens registered via @theme in globals.css)
- Icons: Lucide React (14px small, 18px default, 24px large)
- Fonts: DM Sans (Latin), IBM Plex Sans Arabic (RTL/Arabic), Inter (fallback)
- State: React Context + React Query for server state
- i18n: next-intl, 15+ locales

## Design System
- Tokens: `src/design-system/tokens.ts` — single source of truth
- Import: `import { colors, spacing } from '@/design-system'`
- Tailwind classes: `bg-utu-navy`, `text-utu-blue`, `rounded-utu-card`, etc.
- Full rules: `src/design-system/CLAUDE.md`

## RTL / Internationalization Rules
- ALL components must support both `dir='ltr'` and `dir='rtl'`
- Use logical CSS properties: `ms-` not `ml-`, `me-` not `mr-`, `ps-` not `pl-`, `pe-` not `pr-`
- Arabic/RTL locales: ar, ur, fa, he
- Default locale: English (LTR) — toggle to Arabic (RTL) via DirectionToggle
- Arabic text ALWAYS uses font-arabic class

## Brand & Design Rules
- Primary color: Navy #1E3A5F (`bg-utu-navy`) — buttons, headings, logo
- Action color: Blue #2563EB (`bg-utu-blue`) — links, focus rings, CTAs
- Page background: #F1F5F9 (`bg-utu-bg-page`) — never pure white for page bg
- Card background: #FFFFFF (`bg-utu-bg-card`) with 0.5px border `border-utu-border-default`
- NEVER hardcode hex colors in components — always use `utu-*` Tailwind classes

## Component Rules
- All base UI components live in `src/components/ui/`
- Layout components: `src/components/layout/`
- Feature components: `src/components/{feature}/` (hotels/, flights/, etc.)
- Full rules: `src/components/CLAUDE.md`

## cn() Utility
Use `cn()` from `@/lib/utils` for all conditional class merging:
```ts
import { cn } from '@/lib/utils';
className={cn('base-classes', condition && 'conditional-class', className)}
```

## Approval Rules
- Claude can: generate components, update tokens, refactor components
- Claude must ask before: changing folder structure, adding new npm packages,
  modifying `src/app/globals.css` @theme block, or touching any API routes
- Claude must NEVER: commit to git, push to remote, deploy, or send emails
