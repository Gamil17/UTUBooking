# Component Generation Rules

## Required Structure for Every UI Component
Each base component lives in its own folder under `src/components/ui/`:
```
ComponentName/
  ComponentName.tsx      — main component
  index.ts               — named re-export: export { ComponentName } from './ComponentName'
```

## Props Pattern
- Always use TypeScript `interface`, not `type` aliases for props
- Export the interface: `export interface ButtonProps { ... }`
- Include `dir?: 'ltr' | 'rtl'` prop on interactive/layout components
- Include `className?: string` for extension via cn()
- All event handlers typed explicitly (e.g., `onClick?: React.MouseEventHandler<HTMLButtonElement>`)

## Accessibility
- All interactive elements need `aria-label` or `aria-labelledby`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-utu-blue focus-visible:outline-none`
- Color contrast must pass WCAG 2.1 AA (4.5:1 for normal text)
- Use semantic HTML: `<button>` not `<div onClick>`, `<nav>` not `<div role="navigation">`

## Tailwind Class Order
Layout → Sizing → Spacing → Typography → Color → Border → Effects

Use `cn()` from `@/lib/utils` for all conditional class merging.

## Design Token Classes (always use these, never hardcode hex)
- `bg-utu-navy`, `bg-utu-blue`, `bg-utu-bg-page`, `bg-utu-bg-card`, `bg-utu-bg-muted`
- `text-utu-text-primary`, `text-utu-text-secondary`, `text-utu-text-muted`
- `border-utu-border-default`, `border-utu-border-strong`
- `bg-utu-success-bg`, `text-utu-success-text`, `border-utu-success-border` (+ info/warning/error)
- `rounded-utu-tag`, `rounded-utu-input`, `rounded-utu-card`, `rounded-utu-pill`
- `font-latin`, `font-arabic`

## RTL Support
- Use `ms-*` instead of `ml-*` (margin-inline-start)
- Use `me-*` instead of `mr-*` (margin-inline-end)
- Use `ps-*` instead of `pl-*` (padding-inline-start)
- Use `pe-*` instead of `pr-*` (padding-inline-end)
- Use `start-*`/`end-*` for absolute positioning instead of `left-*`/`right-*`
- Test every component renders correctly with `dir="rtl"`

## Icon Usage (lucide-react)
- Small/inline: `size={14}` with `aria-hidden="true"`
- Default: `size={18}` with `aria-hidden="true"`
- Large/standalone: `size={24}` with descriptive `aria-label`

## No-nos
- No hardcoded hex colors
- No `ml-`, `mr-`, `pl-`, `pr-` (use logical equivalents)
- No inline styles unless strictly necessary for dynamic values
- No Tailwind arbitrary values `[#hex]` — always use utu-* tokens
