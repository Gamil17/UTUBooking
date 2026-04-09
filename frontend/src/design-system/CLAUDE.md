# Design System Rules

## Token Usage
- `tokens.ts` is the single source of truth for ALL design values
- Import: `import { colors, spacing, radius, fonts } from '@/design-system'`
- Never create local color constants — always use tokens
- In JSX/TSX: use Tailwind utility classes (e.g. `bg-utu-navy`) — tokens.ts is for JS logic only

## Color System
```
colors.navy        = '#1E3A5F'  // Primary button, navbar, headings
colors.blue        = '#2563EB'  // Links, focus rings, CTAs
colors.blueMid     = '#3B82F6'  // Hover states
colors.blueLight   = '#DBEAFE'  // Subtle backgrounds, chips
colors.bluePale    = '#EFF6FF'  // Page tint backgrounds
colors.bgPage      = '#F1F5F9'  // Page background (never pure white)
colors.bgCard      = '#FFFFFF'  // Card/surface background
colors.bgMuted     = '#F8FAFC'  // Table alternating rows, subtle fills
colors.textPrimary   = '#0F172A'
colors.textSecondary = '#475569'
colors.textMuted     = '#94A3B8'
colors.borderDefault = '#E2E8F0'
colors.borderStrong  = '#CBD5E1'
```

## Status Color Triplets (each has bg/border/text)
```
success: bg=#F0FDF4  border=#BBF7D0  text=#14532D
info:    bg=#EFF6FF  border=#BAE6FD  text=#0C4A6E
warning: bg=#FFFBEB  border=#FDE68A  text=#78350F
error:   bg=#FEF2F2  border=#FECACA  text=#991B1B
```

## Tailwind Token Classes (registered via @theme in globals.css)
Use these utility classes in all components:
- Colors: `bg-utu-navy`, `text-utu-blue`, `border-utu-border-default`, `bg-utu-success-bg`, etc.
- Spacing: `p-utu-xs`, `p-utu-sm`, `p-utu-md`, `p-utu-lg`, `p-utu-xl`, `p-utu-2xl`
- Radius: `rounded-utu-tag`, `rounded-utu-input`, `rounded-utu-card`, `rounded-utu-pill`
- Fonts: `font-latin`, `font-arabic`

## Spacing Scale
8px, 12px, 16px, 24px, 32px, 48px

## Border Radius Scale
4px = tags/small badges (rounded-utu-tag)
8px = inputs, buttons (rounded-utu-input)
12px = cards, panels (rounded-utu-card)
9999px = pills, avatars (rounded-utu-pill)
