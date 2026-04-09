/**
 * Central site configuration.
 * Update these values before launching to production.
 * Do NOT put secrets here — use environment variables for those.
 */

export const SITE_CONFIG = {
  /** Primary customer support email */
  supportEmail: 'support@utubooking.com',

  /** Partner / affiliate contact */
  partnersEmail: 'partners@utubooking.com',

  /** Press & media enquiries */
  pressEmail: 'press@utubooking.com',

  /** Careers applications */
  careersEmail: 'careers@utubooking.com',

  /** Saudi Arabia support line — replace 0000 with real number before launch */
  saudiPhone: '+9668000000000',

  /** UAE support line — replace 000 with real number before launch */
  uaePhone: '+971600000000',
} as const;
