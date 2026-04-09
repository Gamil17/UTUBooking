/**
 * UTUBooking.com Design System — Token Definitions
 * Single source of truth for all design values.
 * Import from '@/design-system' — never hardcode these values in components.
 */

export const colors = {
  // Brand
  navy:       '#1E3A5F',
  blue:       '#2563EB',
  blueMid:    '#3B82F6',
  blueLight:  '#DBEAFE',
  bluePale:   '#EFF6FF',
  // Backgrounds
  bgPage:     '#F1F5F9',
  bgCard:     '#FFFFFF',
  bgMuted:    '#F8FAFC',
  bgSubtle:   '#EFF6FF',
  // Text
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  // Borders
  borderDefault: '#E2E8F0',
  borderStrong:  '#CBD5E1',
  // Status — bg / border / text triplets
  successBg:     '#F0FDF4',
  successBorder: '#BBF7D0',
  successText:   '#14532D',
  infoBg:        '#EFF6FF',
  infoBorder:    '#BAE6FD',
  infoText:      '#0C4A6E',
  warningBg:     '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText:   '#78350F',
  errorBg:       '#FEF2F2',
  errorBorder:   '#FECACA',
  errorText:     '#991B1B',
} as const;

export const spacing = {
  xs:   '8px',
  sm:   '12px',
  md:   '16px',
  lg:   '24px',
  xl:   '32px',
  '2xl': '48px',
} as const;

export const radius = {
  tag:   '4px',
  input: '8px',
  card:  '12px',
  pill:  '9999px',
} as const;

export const fonts = {
  latin:  '"DM Sans", "Inter", system-ui, sans-serif',
  arabic: '"IBM Plex Sans Arabic", "Noto Sans Arabic", system-ui, sans-serif',
} as const;

export const fontSizes = {
  xs:   '12px',
  sm:   '13px',
  base: '14px',
  md:   '15px',
  lg:   '18px',
  xl:   '22px',
  '2xl': '28px',
  '3xl': '32px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
} as const;

const tokens = { colors, spacing, radius, fonts, fontSizes, shadows };
export default tokens;
