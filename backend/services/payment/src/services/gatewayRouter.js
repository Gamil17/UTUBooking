'use strict';

/**
 * gatewayRouter.js — CommonJS mirror of PaymentRouter.ts
 *
 * Single source of truth for country → gateway routing used by the
 * production Express payment service. Keep in sync with PaymentRouter.ts.
 */

// ─── Country → Primary Gateway ────────────────────────────────────────────────

const GATEWAY_BY_COUNTRY = {
  // Middle East (Phase 2-4)
  SA: 'stcpay',    AE: 'stripe',    JO: 'stripe',    KW: 'stripe',
  BH: 'stripe',    OM: 'stripe',    QA: 'stripe',    MA: 'stripe',
  TN: 'stripe',    EG: 'stripe',    PS: 'stripe',    LB: 'stripe',

  // Asia (Phase 5)
  TR: 'iyzico',    ID: 'midtrans',  MY: 'ipay88',

  // Subcontinent (Phase 6)
  PK: 'jazzcash',  IN: 'razorpay',  BD: 'razorpay',

  // SE Asia (Phase 7)
  SG: 'stripe',    TH: 'stripe',    PH: 'stripe',

  // North America (Phase 10)
  US: 'stripe',    CA: 'interac',

  // Oceania
  AU: 'stripe',    NZ: 'stripe',

  // Europe — Stripe Payment Element
  GB: 'stripe',    DE: 'stripe',    FR: 'stripe',    NL: 'stripe',
  BE: 'stripe',    IT: 'stripe',    ES: 'stripe',    PL: 'stripe',
  AT: 'stripe',    SE: 'stripe',    NO: 'stripe',    DK: 'stripe',
  FI: 'stripe',    IE: 'stripe',    PT: 'stripe',    GR: 'stripe',
  CZ: 'stripe',    HU: 'stripe',    RO: 'stripe',    HR: 'stripe',
  SK: 'stripe',    SI: 'stripe',    EE: 'stripe',    LV: 'stripe',
  LT: 'stripe',    LU: 'stripe',    MT: 'stripe',    BG: 'stripe',
  CY: 'stripe',

  // Switzerland (Phase 8)
  CH: 'twint',

  // South America (Phase 12)
  BR: 'pix',         AR: 'mercadopago', CO: 'mercadopago', CL: 'mercadopago',
  PE: 'mercadopago', UY: 'mercadopago', MX: 'mercadopago',
};

// ─── Secondary / fallback gateways per country ───────────────────────────────

const SECONDARY_GATEWAYS = {
  SA: ['stripe'],
  PK: ['easypaisa'],
  CH: ['stripe'],
  US: ['paypal', 'affirm'],
  CA: ['stripe'],
  BR: ['boleto', 'stripe'],
  AR: ['stripe'], CO: ['stripe'], CL: ['stripe'],
  MX: ['stripe'], PE: ['stripe'], UY: ['stripe'],
};

// ─── Gateway fee / limit config ───────────────────────────────────────────────

const GATEWAY_CONFIG = {
  stcpay:      { fee: 0.85,  minAmount: 10,  maxAmount: 50000,   currency: 'SAR' },
  stripe:      { fee: 2.9,   minAmount: 1,   maxAmount: 999999,  currency: 'USD' },
  iyzico:      { fee: 1.75,  minAmount: 1,   maxAmount: 1000000, currency: 'TRY' },
  midtrans:    { fee: 2.5,   minAmount: 0.5, maxAmount: 1000000, currency: 'IDR' },
  ipay88:      { fee: 1.9,   minAmount: 1,   maxAmount: 500000,  currency: 'MYR' },
  razorpay:    { fee: 1.23,  minAmount: 0.3, maxAmount: 100000,  currency: 'INR' },
  jazzcash:    { fee: 1.5,   minAmount: 0.5, maxAmount: 500000,  currency: 'PKR' },
  easypaisa:   { fee: 1.5,   minAmount: 0.5, maxAmount: 500000,  currency: 'PKR' },
  twint:       { fee: 1.3,   minAmount: 0.1, maxAmount: 100000,  currency: 'CHF' },
  paypal:      { fee: 3.49,  minAmount: 1,   maxAmount: 10000,   currency: 'USD' },
  affirm:      { fee: 5.99,  minAmount: 200, maxAmount: 30000,   currency: 'USD' },
  interac:     { fee: 0,     minAmount: 1,   maxAmount: 50000,   currency: 'CAD' },
  pix:         { fee: 0,     minAmount: 1,   maxAmount: 100000,  currency: 'BRL' },
  boleto:      { fee: 1.49,  minAmount: 3,   maxAmount: 50000,   currency: 'BRL' },
  mercadopago: { fee: 4.99,  minAmount: 1,   maxAmount: 500000,  currency: 'USD' },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the primary gateway for a country code.
 * Falls back to 'stripe' for unmapped countries.
 */
function getGateway(countryCode) {
  return GATEWAY_BY_COUNTRY[(countryCode || '').toUpperCase()] ?? 'stripe';
}

/**
 * Returns all available gateways for a country (primary + secondaries + stripe fallback).
 */
function getAvailableGateways(countryCode) {
  const cc          = (countryCode || '').toUpperCase();
  const primary     = getGateway(cc);
  const secondaries = SECONDARY_GATEWAYS[cc] ?? [];
  return [
    primary,
    ...secondaries.filter((g) => g !== primary),
    ...(['stripe'].filter((g) => g !== primary)),
  ];
}

/**
 * Returns config (fee %, min/max amount, currency) for a gateway.
 */
function getGatewayConfig(gateway) {
  return GATEWAY_CONFIG[gateway] ?? null;
}

module.exports = { getGateway, getAvailableGateways, getGatewayConfig, GATEWAY_BY_COUNTRY, GATEWAY_CONFIG };
