/**
 * backend/config/database.ts
 *
 * Canonical DB_REGION_MAP — ISO 3166-1 alpha-2 country code → DATABASE_URL env var.
 *
 * Data residency decisions:
 *   UK (GB)      → eu-west-2  London    (UK GDPR post-Brexit data sovereignty)
 *   EU mainland  → eu-central-1 Frankfurt (GDPR Art. 44 — within EU)
 *   US           → us-east-1  Virginia  (CCPA + standard US data localisation)
 *   Canada       → ca-central-1 Montreal (PIPEDA compliance)
 *   Brazil+LATAM → sa-east-1  São Paulo  (LGPD — Lei Geral de Proteção de Dados)
 *   Gulf (SA/AE…)→ me-south-1 Bahrain   (existing primary, Phase 1)
 *   Turkey       → eu-central-1 Frankfurt (KVKK — EU region for data residency)
 *   India/PK     → ap-south-1  Mumbai    (DPDP 2023 data localisation)
 *
 * Runtime usage — JavaScript services import from shard-router.js.
 * TypeScript services import this map directly.
 *
 * NOTE: Never import this file in browser-side code. All values are server-only.
 */

export const DB_REGION_MAP: Record<string, string> = {

  // ── Phase 1-7: Gulf + Middle East ──────────────────────────────────────────
  SA: process.env.DATABASE_URL_BAHRAIN!,   // Saudi Arabia — primary Bahrain shard
  AE: process.env.DATABASE_URL_BAHRAIN!,   // UAE
  KW: process.env.DATABASE_URL_BAHRAIN!,   // Kuwait
  QA: process.env.DATABASE_URL_BAHRAIN!,   // Qatar
  BH: process.env.DATABASE_URL_BAHRAIN!,   // Bahrain
  OM: process.env.DATABASE_URL_BAHRAIN!,   // Oman
  JO: process.env.DATABASE_URL_BAHRAIN!,   // Jordan
  MA: process.env.DATABASE_URL_BAHRAIN!,   // Morocco
  TN: process.env.DATABASE_URL_BAHRAIN!,   // Tunisia
  EG: process.env.DATABASE_URL_BAHRAIN!,   // Egypt

  // ── Phase 5: Turkey (KVKK — EU Frankfurt for data residency) ───────────────
  TR: process.env.DATABASE_URL_FRANKFURT!, // KVKK requires EU-region storage

  // ── Phase 6: South Asia ────────────────────────────────────────────────────
  PK: process.env.DATABASE_URL_MUMBAI!,    // Pakistan — PECA data localisation
  IN: process.env.DATABASE_URL_MUMBAI!,    // India — DPDP 2023
  BD: process.env.DATABASE_URL_MUMBAI!,    // Bangladesh — nearest shard
  LK: process.env.DATABASE_URL_MUMBAI!,    // Sri Lanka

  // ── Phase 7: Southeast Asia ────────────────────────────────────────────────
  ID: process.env.DATABASE_URL_SINGAPORE!, // Indonesia — PDP Law
  MY: process.env.DATABASE_URL_SINGAPORE!, // Malaysia — PDPA
  SG: process.env.DATABASE_URL_SINGAPORE!, // Singapore — PDPA
  TH: process.env.DATABASE_URL_SINGAPORE!, // Thailand
  PH: process.env.DATABASE_URL_SINGAPORE!, // Philippines — DPA

  // ── Phase 8: UK (eu-west-2 London) ─────────────────────────────────────────
  // UK GDPR post-Brexit — data must remain in UK territory
  GB: process.env.DATABASE_URL_LONDON!,    // United Kingdom

  // ── Phase 8: EU Mainland (eu-central-1 Frankfurt) ──────────────────────────
  // GDPR Art. 44 — within EU: no transfer mechanism needed
  DE: process.env.DATABASE_URL_FRANKFURT!, // Germany
  FR: process.env.DATABASE_URL_FRANKFURT!, // France
  NL: process.env.DATABASE_URL_FRANKFURT!, // Netherlands
  ES: process.env.DATABASE_URL_FRANKFURT!, // Spain
  IT: process.env.DATABASE_URL_FRANKFURT!, // Italy
  BE: process.env.DATABASE_URL_FRANKFURT!, // Belgium
  PL: process.env.DATABASE_URL_FRANKFURT!, // Poland
  BA: process.env.DATABASE_URL_FRANKFURT!, // Bosnia & Herzegovina
  CH: process.env.DATABASE_URL_FRANKFURT!, // Switzerland — Swiss nFADP aligned
  AT: process.env.DATABASE_URL_FRANKFURT!, // Austria
  SE: process.env.DATABASE_URL_FRANKFURT!, // Sweden
  DK: process.env.DATABASE_URL_FRANKFURT!, // Denmark
  FI: process.env.DATABASE_URL_FRANKFURT!, // Finland
  NO: process.env.DATABASE_URL_FRANKFURT!, // Norway — EEA GDPR applies
  PT: process.env.DATABASE_URL_FRANKFURT!, // Portugal
  IE: process.env.DATABASE_URL_FRANKFURT!, // Ireland
  GR: process.env.DATABASE_URL_FRANKFURT!, // Greece
  CZ: process.env.DATABASE_URL_FRANKFURT!, // Czech Republic
  RO: process.env.DATABASE_URL_FRANKFURT!, // Romania
  HU: process.env.DATABASE_URL_FRANKFURT!, // Hungary
  SK: process.env.DATABASE_URL_FRANKFURT!, // Slovakia
  BG: process.env.DATABASE_URL_FRANKFURT!, // Bulgaria
  HR: process.env.DATABASE_URL_FRANKFURT!, // Croatia
  SI: process.env.DATABASE_URL_FRANKFURT!, // Slovenia
  LT: process.env.DATABASE_URL_FRANKFURT!, // Lithuania
  LV: process.env.DATABASE_URL_FRANKFURT!, // Latvia
  EE: process.env.DATABASE_URL_FRANKFURT!, // Estonia
  LU: process.env.DATABASE_URL_FRANKFURT!, // Luxembourg
  MT: process.env.DATABASE_URL_FRANKFURT!, // Malta
  CY: process.env.DATABASE_URL_FRANKFURT!, // Cyprus

  // ── Phase 10: North America ─────────────────────────────────────────────────
  US: process.env.DATABASE_URL_US_EAST!,   // USA — us-east-1 Virginia
  CA: process.env.DATABASE_URL_MONTREAL!,  // Canada — ca-central-1 (PIPEDA)

  // ── Phase 12: South America ─────────────────────────────────────────────────
  // LGPD (Brazil) + local data laws; AWS sa-east-1 São Paulo
  BR: process.env.DATABASE_URL_SAO_PAULO!, // Brazil — LGPD data localisation
  AR: process.env.DATABASE_URL_SAO_PAULO!, // Argentina
  CO: process.env.DATABASE_URL_SAO_PAULO!, // Colombia
  CL: process.env.DATABASE_URL_SAO_PAULO!, // Chile
  PE: process.env.DATABASE_URL_SAO_PAULO!, // Peru
  UY: process.env.DATABASE_URL_SAO_PAULO!, // Uruguay
  VE: process.env.DATABASE_URL_SAO_PAULO!, // Venezuela
  EC: process.env.DATABASE_URL_SAO_PAULO!, // Ecuador
  PY: process.env.DATABASE_URL_SAO_PAULO!, // Paraguay
  BO: process.env.DATABASE_URL_SAO_PAULO!, // Bolivia

} as const;

/** Fallback DB URL for unknown country codes. Always the KSA shard (largest capacity). */
export const DEFAULT_DB_URL: string = process.env.DATABASE_URL_BAHRAIN!;

/**
 * Returns the connection string for a given ISO alpha-2 country code.
 * Falls back to DEFAULT_DB_URL for unknown codes.
 * Throws if the resolved env variable is not set (fail-fast in production).
 */
export function getDbUrl(countryCode: string): string {
  const url = DB_REGION_MAP[countryCode.toUpperCase()] ?? DEFAULT_DB_URL;
  if (!url) {
    throw new Error(
      `[database] No DATABASE_URL configured for countryCode "${countryCode}". ` +
      `Check backend/.env and DB_REGION_MAP in backend/config/database.ts.`
    );
  }
  return url;
}

/**
 * All regions with their primary env var name — used by migrate-all-shards.sh
 * and by health check endpoints to enumerate expected connections.
 */
export const REGION_ENV_MAP: Record<string, string> = {
  Bahrain:    'DATABASE_URL_BAHRAIN',
  Mumbai:     'DATABASE_URL_MUMBAI',
  Singapore:  'DATABASE_URL_SINGAPORE',
  London:     'DATABASE_URL_LONDON',
  Frankfurt:  'DATABASE_URL_FRANKFURT',
  'US East':  'DATABASE_URL_US_EAST',
  Montreal:   'DATABASE_URL_MONTREAL',
  'São Paulo':'DATABASE_URL_SAO_PAULO',
} as const;
