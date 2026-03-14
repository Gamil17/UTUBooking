// backend/services/payment/PaymentRouter.ts
// Extends existing payment service — routes to correct gateway by country

/**
 * Maps country codes to payment gateways.
 * This is the single source of truth for payment routing.
 *
 * Phase progression:
 * - Phase 2: KSA (STC Pay)
 * - Phase 3-4: GCC + MENA (Stripe)
 * - Phase 5: ASIA (iyzico, midtrans, ipay88)
 * - Phase 6: SUBCONTINENT (jazzcash, razorpay)
 */
export const GATEWAY_BY_COUNTRY: Record<string, string> = {
  // --- PHASE 2-4 (Existing) ---
  SA: 'stcpay',    // Saudi Arabia — STC Pay
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

  // --- PHASE 5 (New) ---
  TR: 'iyzico',    // Turkey
  ID: 'midtrans',  // Indonesia
  MY: 'ipay88',    // Malaysia

  // --- PHASE 6 (Planned) ---
  PK: 'jazzcash',  // Pakistan
  IN: 'razorpay',  // India
  BD: 'razorpay',  // Bangladesh

  // --- PHASE 7 (Planned) ---
  US: 'stripe',    // USA
  GB: 'stripe',    // UK
  CA: 'stripe',    // Canada
  AU: 'stripe',    // Australia
  FR: 'stripe',    // France
  DE: 'stripe',    // Germany
};

/**
 * Get the payment gateway for a given country.
 * Falls back to Stripe if country not explicitly mapped.
 */
export function getGateway(countryCode: string): string {
  return GATEWAY_BY_COUNTRY[countryCode?.toUpperCase()] ?? 'stripe';
}

/**
 * Gateway-specific configurations.
 * Each gateway has different fee structures, webhooks, etc.
 */
export const GATEWAY_CONFIG: Record<string, {
  fee: number;        // Transaction fee percentage
  minAmount: number;  // Minimum transaction amount in USD
  maxAmount: number;  // Maximum transaction amount in USD
  webhook: string;    // Webhook endpoint for this gateway
  timeout: number;    // Request timeout in ms
}> = {
  stcpay: {
    fee: 0.85,
    minAmount: 10,
    maxAmount: 50000,
    webhook: process.env.STCPAY_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/stcpay',
    timeout: 30000,
  },
  stripe: {
    fee: 2.9,
    minAmount: 1,
    maxAmount: 999999,
    webhook: process.env.STRIPE_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/stripe',
    timeout: 45000,
  },
  iyzico: {
    fee: 1.75,
    minAmount: 1,
    maxAmount: 1000000,
    webhook: process.env.IYZICO_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/iyzico',
    timeout: 40000,
  },
  midtrans: {
    fee: 2.5,
    minAmount: 0.5,
    maxAmount: 1000000,
    webhook: process.env.MIDTRANS_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/midtrans',
    timeout: 35000,
  },
  ipay88: {
    fee: 1.9,
    minAmount: 1,
    maxAmount: 500000,
    webhook: process.env.IPAY88_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/ipay88',
    timeout: 40000,
  },
  razorpay: {
    fee: 1.23,
    minAmount: 0.3,
    maxAmount: 100000,
    webhook: process.env.RAZORPAY_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/razorpay',
    timeout: 40000,
  },
  jazzcash: {
    fee: 1.5,
    minAmount: 0.5,
    maxAmount: 500000,
    webhook: process.env.JAZZCASH_WEBHOOK_URL || 'https://api.utubooking.com/webhooks/jazzcash',
    timeout: 35000,
  },
};

/**
 * Validates if a transaction amount is allowed for a given gateway.
 */
export function validateAmountForGateway(
  gateway: string,
  amountInUSD: number
): { valid: boolean; error?: string } {
  const config = GATEWAY_CONFIG[gateway];
  if (!config) {
    return { valid: false, error: `Unknown gateway: ${gateway}` };
  }

  if (amountInUSD < config.minAmount) {
    return {
      valid: false,
      error: `Amount $${amountInUSD} below minimum $${config.minAmount} for ${gateway}`,
    };
  }

  if (amountInUSD > config.maxAmount) {
    return {
      valid: false,
      error: `Amount $${amountInUSD} exceeds maximum $${config.maxAmount} for ${gateway}`,
    };
  }

  return { valid: true };
}

/**
 * Calculates the processing fee for a transaction.
 */
export function calculateFee(gateway: string, amountInUSD: number): number {
  const config = GATEWAY_CONFIG[gateway];
  if (!config) return 0;
  return amountInUSD * (config.fee / 100);
}

/**
 * Gets all available gateways for a given country (for UI fallback selection).
 * Returns primary gateway first, then alternatives.
 */
export function getAvailableGateways(countryCode: string): string[] {
  const primary = getGateway(countryCode);
  const alternatives = ['stripe']; // Stripe as universal fallback

  return [
    primary,
    ...alternatives.filter((g) => g !== primary),
  ];
}
