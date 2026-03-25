// backend/services/payment/PaymentRouter.ts
// Single source of truth for country → gateway routing

/**
 * Maps country codes to payment gateways.
 *
 * Phase progression:
 * - Phase 2:    KSA (STC Pay)
 * - Phase 3-4:  GCC + MENA (Stripe)
 * - Phase 5:    Turkey (iyzico), Indonesia (Midtrans), Malaysia (iPay88)
 * - Phase 6:    Pakistan (JazzCash/Easypaisa), India/BD (Razorpay)
 * - Phase 7:    SE Asia — Singapore, Thailand, Philippines (Stripe)
 * - Phase 8-12: Europe (Stripe Payment Element) + Switzerland (TWINT)
 *
 * For European countries, the "stripe" gateway uses the Payment Element
 * (automatic_payment_methods: true) so Stripe auto-surfaces iDEAL, SEPA,
 * Bancontact, BLIK, Klarna, etc. based on currency + country. No separate
 * gateway needed per EU payment method.
 */
export const GATEWAY_BY_COUNTRY: Record<string, string> = {
  // ── Middle East (Phase 2-4) ────────────────────────────────────────────────
  SA: 'stcpay',    // Saudi Arabia — STC Pay (primary); Mada (Moyasar) also available
  AE: 'stripe',    // UAE
  JO: 'stripe',    // Jordan
  KW: 'stripe',    // Kuwait
  BH: 'stripe',    // Bahrain
  OM: 'stripe',    // Oman
  QA: 'stripe',    // Qatar
  MA: 'stripe',    // Morocco
  TN: 'stripe',    // Tunisia
  EG: 'stripe',    // Egypt
  PS: 'stripe',    // Palestine
  LB: 'stripe',    // Lebanon

  // ── Asia (Phase 5) ─────────────────────────────────────────────────────────
  TR: 'iyzico',    // Turkey — KVKK compliant; Iyzico is the dominant local gateway
  ID: 'midtrans',  // Indonesia — GoPay, OVO, DANA via Midtrans Snap
  MY: 'ipay88',    // Malaysia — FPX, Boost, Touch 'n Go via iPay88

  // ── Subcontinent (Phase 6) ─────────────────────────────────────────────────
  PK: 'jazzcash',  // Pakistan — JazzCash primary; Easypaisa secondary (Telenor)
  IN: 'razorpay',  // India — UPI, NetBanking, RuPay, EMI via Razorpay
  BD: 'razorpay',  // Bangladesh — bKash via Razorpay

  // ── SE Asia (Phase 7) ──────────────────────────────────────────────────────
  SG: 'stripe',    // Singapore
  TH: 'stripe',    // Thailand
  PH: 'stripe',    // Philippines

  // ── North America (Phase 10) ───────────────────────────────────────────────
  US: 'stripe',    // USA — Stripe primary (Cards, Apple Pay, Google Pay); PayPal + Affirm BNPL secondary
  CA: 'interac',   // Canada — Interac Online primary (via Bambora); Stripe card fallback for non-Interac

  // ── Oceania ────────────────────────────────────────────────────────────────
  AU: 'stripe',    // Australia — Stripe Card, Apple Pay, Google Pay
  NZ: 'stripe',    // New Zealand

  // ── Europe (Phase 8-9) — ALL use Stripe Payment Element ───────────────────
  // Stripe's Payment Element auto-surfaces the right local method per currency:
  //   GB (GBP)  → Klarna, Apple Pay, Google Pay
  //   DE (EUR)  → SEPA Direct Debit, Klarna
  //   FR (EUR)  → SEPA Direct Debit, Klarna
  //   NL (EUR)  → iDEAL (65% market share), SEPA
  //   BE (EUR)  → Bancontact, SEPA
  //   IT (EUR)  → SEPA, card
  //   ES (EUR)  → SEPA, card
  //   PL (PLN)  → BLIK (90% market share), card
  GB: 'stripe',    // United Kingdom — UK GDPR (eu-west-2 data residency)
  DE: 'stripe',    // Germany — SEPA Debit, Klarna  [Giropay: discontinued June 2024]
  FR: 'stripe',    // France — SEPA, Klarna, Apple Pay
  NL: 'stripe',    // Netherlands — iDEAL first
  BE: 'stripe',    // Belgium — Bancontact first
  IT: 'stripe',    // Italy — SEPA, card
  ES: 'stripe',    // Spain — SEPA, card
  PL: 'stripe',    // Poland — BLIK first (PLN)
  AT: 'stripe',    // Austria — SEPA, card
  SE: 'stripe',    // Sweden — Klarna (home market), card
  NO: 'stripe',    // Norway — card, Klarna
  DK: 'stripe',    // Denmark — card, Klarna
  FI: 'stripe',    // Finland — card, SEPA
  IE: 'stripe',    // Ireland — card, SEPA
  PT: 'stripe',    // Portugal — MB WAY (via Stripe), card, SEPA
  GR: 'stripe',    // Greece — card, SEPA
  CZ: 'stripe',    // Czech Republic — card
  HU: 'stripe',    // Hungary — card
  RO: 'stripe',    // Romania — card
  HR: 'stripe',    // Croatia — card, SEPA (Eurozone since 2023)
  SK: 'stripe',    // Slovakia — card, SEPA
  SI: 'stripe',    // Slovenia — card, SEPA
  EE: 'stripe',    // Estonia — card, SEPA
  LV: 'stripe',    // Latvia — card, SEPA
  LT: 'stripe',    // Lithuania — card, SEPA
  LU: 'stripe',    // Luxembourg — card, SEPA
  MT: 'stripe',    // Malta — card
  BG: 'stripe',    // Bulgaria — card
  CY: 'stripe',    // Cyprus — card, SEPA

  // ── Switzerland (Phase 8) — TWINT separate integration ────────────────────
  // TWINT is the dominant Swiss mobile payment (80% of Swiss mobile payments).
  // Note: Stripe also supports TWINT for CHF transactions as of 2024.
  // The 'twint' gateway uses the direct TWINT Partner API for QR + app flows.
  // Stripe Card is the fallback for TWINT non-users (set in SwitzerlandPaymentSelector).
  CH: 'twint',     // Switzerland — TWINT primary, Stripe card fallback

  // ── South America (Phase 12) ───────────────────────────────────────────────
  // Pix is mandatory in Brazil — 80%+ of transactions. Boleto is fallback for unbanked.
  // MercadoPago covers all LATAM via single integration (cards + local methods per country).
  BR: 'pix',          // Brazil — Pix QR primary (instant, via Stripe); Boleto + card fallback
  AR: 'mercadopago',  // Argentina — PSP, Rapipago, Pago Fácil, cuotas via MercadoPago
  CO: 'mercadopago',  // Colombia — PSE, Efecty, cards via MercadoPago
  CL: 'mercadopago',  // Chile — WebPay, Khipu, Multicaja via MercadoPago
  PE: 'mercadopago',  // Peru — PagoEfectivo, cards via MercadoPago
  UY: 'mercadopago',  // Uruguay — Abitab, Redpagos, cards via MercadoPago
  MX: 'mercadopago',  // Mexico — OXXO, SPEI, cards via MercadoPago
};

/**
 * Get the payment gateway for a given country.
 * Falls back to Stripe if country not explicitly mapped.
 */
export function getGateway(countryCode: string): string {
  return GATEWAY_BY_COUNTRY[countryCode?.toUpperCase()] ?? 'stripe';
}

/**
 * Country → Stripe currency mapping.
 * Used when creating PaymentIntents so the correct local currency is charged.
 */
export const COUNTRY_CURRENCY: Record<string, string> = {
  // Middle East
  SA: 'SAR', AE: 'AED', KW: 'KWD', QA: 'QAR', BH: 'BHD', OM: 'OMR',
  JO: 'JOD', MA: 'MAD', TN: 'TND', EG: 'EGP',
  // Europe
  GB: 'GBP', PL: 'PLN', SE: 'SEK', NO: 'NOK', DK: 'DKK', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', BG: 'BGN', CH: 'CHF',
  // Eurozone — all others
  DE: 'EUR', FR: 'EUR', NL: 'EUR', BE: 'EUR', IT: 'EUR', ES: 'EUR',
  AT: 'EUR', FI: 'EUR', IE: 'EUR', PT: 'EUR', GR: 'EUR', SK: 'EUR',
  SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR',
  // Americas
  US: 'USD', CA: 'CAD', BR: 'BRL', AR: 'ARS', MX: 'MXN', CO: 'COP',
  CL: 'CLP', PE: 'PEN',
  // Asia
  TR: 'TRY', ID: 'IDR', MY: 'MYR', PK: 'PKR', IN: 'INR', BD: 'BDT',
  SG: 'SGD', TH: 'THB', PH: 'PHP',
  // Oceania
  AU: 'AUD', NZ: 'NZD',
};

export function getCurrency(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode?.toUpperCase()] ?? 'USD';
}

/**
 * Stripe Payment Element method order per country.
 * Local methods are surfaced first to maximise conversion.
 * Stripe will also auto-show any method enabled in Dashboard.
 *
 * Note: Giropay discontinued June 30 2024.
 *       Sofort: Stripe deprecated; replaced by Klarna's bank-pay.
 */
export const PAYMENT_METHOD_ORDER: Record<string, string[]> = {
  NL: ['ideal', 'card', 'sepa_debit'],                          // iDEAL — 65% Dutch market
  BE: ['bancontact', 'card', 'sepa_debit'],                     // Bancontact — dominant in BE
  PL: ['blik', 'card', 'sepa_debit'],                           // BLIK — 90% Polish mobile market
  DE: ['card', 'sepa_debit', 'klarna'],                         // SEPA strong in Germany
  AT: ['card', 'sepa_debit', 'klarna'],                         // Austria — similar to DE
  FR: ['card', 'sepa_debit', 'klarna'],                         // France — SEPA + Klarna
  GB: ['card', 'klarna', 'link'],                               // UK — Klarna popular
  SE: ['klarna', 'card'],                                       // Sweden — Klarna home market
  IT: ['card', 'sepa_debit'],                                   // Italy — standard card + SEPA
  ES: ['card', 'sepa_debit'],                                   // Spain — standard
  PT: ['card', 'sepa_debit'],                                   // Portugal — MB WAY auto-surfaces via Stripe
  DEFAULT: ['card'],
};

export function getPaymentMethodOrder(countryCode: string): string[] {
  return PAYMENT_METHOD_ORDER[countryCode?.toUpperCase()] ?? PAYMENT_METHOD_ORDER.DEFAULT;
}

/**
 * Gateway-specific configurations — fees, limits, webhook URLs, timeouts.
 */
export const GATEWAY_CONFIG: Record<string, {
  fee: number;
  minAmount: number;
  maxAmount: number;
  webhook: string;
  timeout: number;
}> = {
  stcpay: {
    fee: 0.85, minAmount: 10, maxAmount: 50000,
    webhook: process.env.STCPAY_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/stcpay',
    timeout: 30000,
  },
  stripe: {
    fee: 2.9, minAmount: 1, maxAmount: 999999,
    webhook: process.env.STRIPE_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/stripe',
    timeout: 45000,
  },
  iyzico: {
    fee: 1.75, minAmount: 1, maxAmount: 1000000,
    webhook: process.env.IYZICO_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/iyzico',
    timeout: 40000,
  },
  midtrans: {
    fee: 2.5, minAmount: 0.5, maxAmount: 1000000,
    webhook: process.env.MIDTRANS_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/midtrans',
    timeout: 35000,
  },
  ipay88: {
    fee: 1.9, minAmount: 1, maxAmount: 500000,
    webhook: process.env.IPAY88_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/ipay88',
    timeout: 40000,
  },
  razorpay: {
    fee: 1.23, minAmount: 0.3, maxAmount: 100000,
    webhook: process.env.RAZORPAY_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/razorpay',
    timeout: 40000,
  },
  jazzcash: {
    fee: 1.5, minAmount: 0.5, maxAmount: 500000,
    webhook: process.env.JAZZCASH_RETURN_URL || 'https://api.utubooking.com/api/payments/jazzcash/callback',
    timeout: 35000,
  },
  easypaisa: {
    fee: 1.5, minAmount: 0.5, maxAmount: 500000,
    webhook: process.env.EASYPAISA_POSTBACK_URL || 'https://api.utubooking.com/api/payments/easypaisa/callback',
    timeout: 35000,
  },
  twint: {
    fee: 1.3, minAmount: 0.1, maxAmount: 100000,  // CHF
    webhook: process.env.TWINT_WEBHOOK_URL || 'https://api.utubooking.com/api/payments/twint/webhook',
    timeout: 40000,
  },
  paypal: {
    fee: 3.49, minAmount: 1, maxAmount: 10000,    // USD; 3.49% + fixed fee for cross-border
    webhook: 'https://api.utubooking.com/api/payments/paypal/webhook',
    timeout: 45000,
  },
  affirm: {
    fee: 5.99, minAmount: 200, maxAmount: 30000,  // USD; Affirm merchant fee ~6%; min $200 UTUBooking policy
    webhook: 'https://api.utubooking.com/api/payments/affirm/webhook',
    timeout: 30000,
  },
  interac: {
    fee: 0,    minAmount: 1,   maxAmount: 50000,  // CAD; Bambora charges per-transaction flat fee (not %)
    webhook: 'https://api.utubooking.com/api/payments/interac/callback',
    timeout: 30000,
  },
  pix: {
    fee: 0,    minAmount: 1,   maxAmount: 100000, // BRL; Pix has no merchant fee from Bacen; Stripe charges 1.49% + R$0.40
    webhook: 'https://api.utubooking.com/api/payments/pix/webhook',
    timeout: 30000,
  },
  boleto: {
    fee: 1.49, minAmount: 3,   maxAmount: 50000,  // BRL; Stripe Boleto fee; min R$3
    webhook: 'https://api.utubooking.com/api/payments/pix/webhook', // shared Stripe webhook
    timeout: 30000,
  },
  mercadopago: {
    fee: 4.99, minAmount: 1,   maxAmount: 500000, // varies by country; 4.99% average across LATAM
    webhook: 'https://api.utubooking.com/api/payments/mercadopago/webhook',
    timeout: 35000,
  },
};

export function validateAmountForGateway(
  gateway: string,
  amountInUSD: number
): { valid: boolean; error?: string } {
  const config = GATEWAY_CONFIG[gateway];
  if (!config) return { valid: false, error: `Unknown gateway: ${gateway}` };
  if (amountInUSD < config.minAmount) {
    return { valid: false, error: `Amount $${amountInUSD} below minimum $${config.minAmount} for ${gateway}` };
  }
  if (amountInUSD > config.maxAmount) {
    return { valid: false, error: `Amount $${amountInUSD} exceeds maximum $${config.maxAmount} for ${gateway}` };
  }
  return { valid: true };
}

export function calculateFee(gateway: string, amountInUSD: number): number {
  const config = GATEWAY_CONFIG[gateway];
  if (!config) return 0;
  return amountInUSD * (config.fee / 100);
}

// Secondary gateway fallbacks (shown as alternatives in checkout)
const SECONDARY_GATEWAYS: Record<string, string[]> = {
  SA: ['stripe'],      // Mada (Moyasar) via stripe path for non-STC users
  PK: ['easypaisa'],   // Easypaisa secondary (Telenor users)
  CH: ['stripe'],      // Stripe card for non-TWINT users
  US: ['paypal', 'affirm'],  // PayPal (wallet users) + Affirm BNPL (bookings ≥ $200)
  CA: ['stripe'],            // Stripe card for credit/debit card users who don't use Interac Online
  BR: ['boleto', 'stripe'], // Boleto for unbanked (~15%); Stripe card as last resort
  AR: ['stripe'],           // Stripe card fallback for MercadoPago failures
  CO: ['stripe'],
  CL: ['stripe'],
  MX: ['stripe'],
  PE: ['stripe'],
  UY: ['stripe'],
};

export function getAvailableGateways(countryCode: string): string[] {
  const cc = countryCode?.toUpperCase();
  const primary     = getGateway(cc);
  const secondaries = SECONDARY_GATEWAYS[cc] ?? [];
  const fallback    = ['stripe'];

  return [
    primary,
    ...secondaries.filter((g) => g !== primary),
    ...fallback.filter((g) => g !== primary),
  ];
}
