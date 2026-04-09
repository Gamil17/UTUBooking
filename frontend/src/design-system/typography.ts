/**
 * UTUBooking.com Design System — Typography Scale
 * Import from '@/design-system' — never hardcode these in components.
 */

export const typeScale = {
  /** 12px — caption, badge, label */
  xs:   { fontSize: '12px', lineHeight: '1.4' },
  /** 13px — secondary label, small helper */
  sm:   { fontSize: '13px', lineHeight: '1.4' },
  /** 14px — body text, input labels, table cells */
  base: { fontSize: '14px', lineHeight: '1.6' },
  /** 15px — primary body text */
  md:   { fontSize: '15px', lineHeight: '1.6' },
  /** 18px — card titles, section labels */
  lg:   { fontSize: '18px', lineHeight: '1.5' },
  /** 22px — H3, sub-headings */
  xl:   { fontSize: '22px', lineHeight: '1.3' },
  /** 28px — H2 headings */
  '2xl': { fontSize: '28px', lineHeight: '1.2' },
  /** 32px — H1 headings, hero text */
  '3xl': { fontSize: '32px', lineHeight: '1.2' },
} as const;

export const fontWeights = {
  regular:   400,
  medium:    500,
  semibold:  600,
  bold:      700,
} as const;

export const lineHeights = {
  tight:    '1.2',  // headings
  snug:     '1.3',
  normal:   '1.5',
  relaxed:  '1.6',  // body text
  loose:    '1.8',  // Arabic / CJK body text
} as const;

export const letterSpacings = {
  tighter: '-0.01em',
  normal:  '0',
  wide:    '0.04em',
  wider:   '0.08em',  // ALL-CAPS labels
} as const;

/**
 * Semantic text styles — use these to ensure consistent typography across
 * the platform. Each maps to a set of CSS properties.
 */
export const textStyles = {
  h1:       { fontSize: typeScale['3xl'].fontSize, fontWeight: fontWeights.bold,     lineHeight: lineHeights.tight },
  h2:       { fontSize: typeScale['2xl'].fontSize, fontWeight: fontWeights.semibold, lineHeight: lineHeights.tight },
  h3:       { fontSize: typeScale.xl.fontSize,     fontWeight: fontWeights.semibold, lineHeight: lineHeights.snug },
  bodyLg:   { fontSize: typeScale.lg.fontSize,     fontWeight: fontWeights.medium,   lineHeight: lineHeights.normal },
  body:     { fontSize: typeScale.base.fontSize,   fontWeight: fontWeights.regular,  lineHeight: lineHeights.relaxed },
  bodySm:   { fontSize: typeScale.sm.fontSize,     fontWeight: fontWeights.regular,  lineHeight: lineHeights.relaxed },
  label:    { fontSize: typeScale.sm.fontSize,     fontWeight: fontWeights.medium,   lineHeight: lineHeights.normal },
  caption:  { fontSize: typeScale.xs.fontSize,     fontWeight: fontWeights.regular,  lineHeight: lineHeights.normal },
  overline: { fontSize: typeScale.xs.fontSize,     fontWeight: fontWeights.semibold, lineHeight: lineHeights.normal, letterSpacing: letterSpacings.wider },
} as const;

export type TextStyle = keyof typeof textStyles;
