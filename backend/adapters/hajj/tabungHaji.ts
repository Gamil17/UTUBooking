/**
 * Tabung Haji (Lembaga Tabung Haji) Partner API Adapter
 * Malaysia — Hajj Fund Management Body
 *
 * Obtain partner credentials from Tabung Haji IT Division:
 *   https://tabunghaji.gov.my/api  (partner portal)
 *   Email: it-support@tabunghaji.gov.my
 *
 * Required env vars:
 *   TH_API_KEY         — partner API key issued by TH IT
 *   TH_PARTNER_ID      — your registered partner identifier
 *   TH_PARTNER_SECRET  — HMAC signing secret for request validation
 *   TH_SANDBOX         — 'true' to target sandbox environment
 *
 * API contract:
 *   Base URL (prod):    https://api.tabunghaji.gov.my/v1
 *   Base URL (sandbox): https://sandbox.api.tabunghaji.gov.my/v1
 *   Auth:               X-Api-Key + X-Partner-Id headers
 *   Request signing:    HMAC-SHA256(timestamp + method + path, TH_PARTNER_SECRET)
 *                       sent as X-Signature header
 *
 * Pilgrim identity:
 *   Malaysian IC (MyKad NRIC) — 12 digits: YYMMDD-SS-PPPP
 *   Always strip hyphens before sending to API.
 *
 * Hajj quota context (2026):
 *   Malaysia's annual Hajj quota ≈ 31,600 places.
 *   Waiting time varies by state — peninsular avg ≈ 70 months from registration.
 *   Departure year estimated from: currentYear + (queuePosition / ANNUAL_QUOTA_PER_STATE)
 *
 * Caching:
 *   Balance/status: Redis key `th:pilgrim:{sha256(ic)}` — TTL 5 min (sensitive PII — short TTL)
 *   No caching for linkBooking (mutating operation).
 *
 * Data privacy (PDPA Malaysia):
 *   IC numbers are personally identifiable. Never log raw IC numbers.
 *   Cache keys use SHA-256 hash of the IC; raw IC is never stored.
 */

'use strict';

import crypto from 'crypto';
import { createClient as createRedisClient } from 'redis';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY        = process.env.TH_API_KEY        ?? '';
const PARTNER_ID     = process.env.TH_PARTNER_ID     ?? '';
const PARTNER_SECRET = process.env.TH_PARTNER_SECRET ?? '';
const SANDBOX        = process.env.TH_SANDBOX        === 'true';

const BASE_URL = SANDBOX
  ? 'https://sandbox.api.tabunghaji.gov.my/v1'
  : 'https://api.tabunghaji.gov.my/v1';

/** Malaysia national Hajj quota (2026 allocation). Used for departure-year estimation. */
const ANNUAL_NATIONAL_QUOTA = 31_600;

/** Average annual quota per state (13 states ÷ total, weighted). */
const ANNUAL_QUOTA_PER_STATE = Math.round(ANNUAL_NATIONAL_QUOTA / 13);

const CACHE_TTL_SEC = 300; // 5 minutes — short due to PII sensitivity

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Malaysian IC (MyKad NRIC).
 * Format: 12 digits — YYMMDD-SS-PPPP (hyphens optional on input; always stripped before API call).
 * SS = state code (01 = Johor … 16 = W.P. Labuan)
 */
export type IcNumber = string;

export type HajjRegistrationStatus =
  | 'REGISTERED'   // pilgrim is registered and in the queue
  | 'CONFIRMED'    // allocated a place for the coming Hajj season
  | 'ACTIVE'       // currently on Hajj (tahun semasa)
  | 'COMPLETED'    // has performed Hajj (mabrur)
  | 'SUSPENDED'    // account suspended (usually financial hold)
  | 'NOT_REGISTERED'; // no TH account or not registered for Hajj

export interface THBalance {
  icNumber:        string;  // hashed display (last 4 shown)
  accountNumber:   string;  // TH savings account number
  balanceMYR:      number;  // available savings balance in MYR
  requiredAmountMYR: number; // minimum required for Hajj registration confirmation (~MYR 1,350)
  isSufficient:    boolean; // balance >= requiredAmountMYR
  lastUpdated:     string;  // ISO 8601 timestamp
}

export interface THHajjStatus {
  icNumber:          string;  // hashed display
  registrationStatus: HajjRegistrationStatus;
  queueNumber:       number | null;  // national queue position (null if not registered)
  stateCode:         string | null;  // MY state code (e.g. '14' for Kuala Lumpur)
  stateName:         string | null;  // e.g. 'Wilayah Persekutuan Kuala Lumpur'
  estimatedDepartureYear: number | null; // estimated year of Hajj departure
  estimatedDeparturePhase: string | null; // e.g. 'Phase 2 (Jul–Aug 2031)'
  registrationDate:  string | null;  // ISO 8601 date of Hajj registration
  lastHajjYear:      number | null;  // year of last completed Hajj (if COMPLETED)
}

export interface THLinkResult {
  success:    boolean;
  linkId:     string;   // TH-generated link reference
  icNumber:   string;   // hashed
  bookingId:  string;
  linkedAt:   string;   // ISO 8601
  message:    string;   // human-readable confirmation message (BM + EN)
}

export class TabungHajiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly thErrorCode?: string,
  ) {
    super(message);
    this.name = 'TabungHajiError';
  }
}

// ─── Redis ────────────────────────────────────────────────────────────────────

let _redis: ReturnType<typeof createRedisClient> | null = null;

function getRedis() {
  if (!_redis) {
    _redis = createRedisClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    _redis.on('error', (e: Error) => console.error('[tabung-haji] redis error:', e));
    _redis.connect().catch((e: Error) => console.error('[tabung-haji] redis connect failed:', e));
  }
  return _redis;
}

// ─── NRIC helpers ─────────────────────────────────────────────────────────────

/** Strip hyphens and whitespace from IC input. */
function normaliseIc(ic: string): string {
  return ic.replace(/[-\s]/g, '');
}

/** Validate that an IC is exactly 12 digits. */
export function isValidIc(ic: string): boolean {
  return /^\d{12}$/.test(normaliseIc(ic));
}

/**
 * Returns a privacy-safe display version of the IC.
 * Masks first 8 digits: ****-**-PPPP → e.g. '****-**-1234'
 */
export function maskIc(ic: string): string {
  const n = normaliseIc(ic);
  if (n.length !== 12) return '****-**-****';
  return `****-**-${n.slice(8)}`;
}

/** SHA-256 hash of the IC — used as cache key (no raw PII in Redis keys). */
function hashIc(ic: string): string {
  return crypto.createHash('sha256').update(normaliseIc(ic)).digest('hex').slice(0, 32);
}

// ─── Request signing ──────────────────────────────────────────────────────────

/**
 * Generates the HMAC-SHA256 request signature required by the TH partner API.
 * Signature covers: timestamp + method + path (all uppercased).
 */
function signRequest(method: string, path: string, timestamp: string): string {
  const payload = `${timestamp}${method.toUpperCase()}${path}`;
  return crypto.createHmac('sha256', PARTNER_SECRET).update(payload).digest('hex');
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function thRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const timestamp = new Date().toISOString();
  const signature = signRequest(method, path, timestamp);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type':   'application/json',
      'Accept':         'application/json',
      'X-Api-Key':      API_KEY,
      'X-Partner-Id':   PARTNER_ID,
      'X-Timestamp':    timestamp,
      'X-Signature':    signature,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    let msg   = `Tabung Haji API error ${res.status}`;
    let code: string | undefined;
    try {
      const err = await res.json() as { message?: string; error_code?: string };
      if (err.message)    msg  = err.message;
      if (err.error_code) code = err.error_code;
    } catch { /* ignore */ }
    throw new TabungHajiError(msg, res.status, code);
  }

  return res.json() as Promise<T>;
}

// ─── Departure-year estimation ────────────────────────────────────────────────

/**
 * Estimates the Hajj departure year and phase label from a queue number.
 * Formula: estimatedYear = currentYear + ceil(queuePosition / ANNUAL_QUOTA_PER_STATE)
 *
 * Hajj seasons run May–July (Zulhijjah); for simplicity we use calendar year.
 */
function estimateDeparture(queueNumber: number): {
  year: number;
  phase: string;
} {
  const yearsFromNow = Math.ceil(queueNumber / ANNUAL_QUOTA_PER_STATE);
  const year         = new Date().getFullYear() + yearsFromNow;
  // TH typically issues two departure phases per season
  const phase        = queueNumber % 2 === 0 ? 'Fasa 1 (Mei–Jun)' : 'Fasa 2 (Jun–Jul)';
  return { year, phase: `${phase} ${year}` };
}

// ─── checkBalance ─────────────────────────────────────────────────────────────

/**
 * Retrieves the pilgrim's Tabung Haji savings balance.
 * Returns MYR balance and whether it meets the minimum required amount for Hajj.
 *
 * @param icNumber  Malaysian IC number (12-digit NRIC, hyphens optional)
 * @returns         THBalance
 * @throws          TabungHajiError if IC not found or API error
 */
export async function checkBalance(icNumber: IcNumber): Promise<THBalance> {
  const ic = normaliseIc(icNumber);
  if (!isValidIc(ic)) {
    throw new TabungHajiError('IC number must be exactly 12 digits.', 400, 'INVALID_IC');
  }

  const cacheKey = `th:pilgrim:balance:${hashIc(ic)}`;
  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as THBalance;
  } catch { /* non-fatal */ }

  const raw = await thRequest<{
    account_number:    string;
    balance_myr:       number;
    required_myr:      number;
    last_updated:      string;
  }>('GET', `/pilgrim/balance?ic=${ic}`);

  const result: THBalance = {
    icNumber:          maskIc(ic),
    accountNumber:     raw.account_number,
    balanceMYR:        raw.balance_myr,
    requiredAmountMYR: raw.required_myr,
    isSufficient:      raw.balance_myr >= raw.required_myr,
    lastUpdated:       raw.last_updated,
  };

  try {
    await getRedis().setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(result));
  } catch { /* non-fatal */ }

  return result;
}

// ─── getHajjStatus ────────────────────────────────────────────────────────────

/**
 * Retrieves the pilgrim's position in the national Hajj quota queue.
 * Includes estimated departure year calculated from queue position.
 *
 * @param icNumber  Malaysian IC number
 * @returns         THHajjStatus
 * @throws          TabungHajiError if IC not found or API error
 */
export async function getHajjStatus(icNumber: IcNumber): Promise<THHajjStatus> {
  const ic = normaliseIc(icNumber);
  if (!isValidIc(ic)) {
    throw new TabungHajiError('IC number must be exactly 12 digits.', 400, 'INVALID_IC');
  }

  const cacheKey = `th:pilgrim:status:${hashIc(ic)}`;
  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as THHajjStatus;
  } catch { /* non-fatal */ }

  const raw = await thRequest<{
    registration_status: string;
    queue_number:        number | null;
    state_code:          string | null;
    state_name:          string | null;
    registration_date:   string | null;
    last_hajj_year:      number | null;
  }>('GET', `/pilgrim/hajj-status?ic=${ic}`);

  const status = raw.registration_status as HajjRegistrationStatus;

  let estimatedYear: number | null = null;
  let estimatedPhase: string | null = null;

  if (raw.queue_number && (status === 'REGISTERED' || status === 'CONFIRMED')) {
    const est = estimateDeparture(raw.queue_number);
    estimatedYear  = est.year;
    estimatedPhase = est.phase;
  } else if (status === 'CONFIRMED') {
    // Confirmed pilgrims depart in the current or next Hajj season
    estimatedYear  = new Date().getFullYear();
    estimatedPhase = `Fasa 1 (Mei–Jun) ${estimatedYear}`;
  }

  const result: THHajjStatus = {
    icNumber:               maskIc(ic),
    registrationStatus:     status,
    queueNumber:            raw.queue_number,
    stateCode:              raw.state_code,
    stateName:              raw.state_name,
    estimatedDepartureYear: estimatedYear,
    estimatedDeparturePhase:estimatedPhase,
    registrationDate:       raw.registration_date,
    lastHajjYear:           raw.last_hajj_year,
  };

  try {
    await getRedis().setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(result));
  } catch { /* non-fatal */ }

  return result;
}

// ─── linkBooking ──────────────────────────────────────────────────────────────

/**
 * Links a UTUBooking reservation to the pilgrim's Tabung Haji account.
 * This allows TH to track accommodation and flight arrangements
 * made through UTUBooking as part of the official Hajj package record.
 *
 * Important: TH may use this data to confirm that the pilgrim's accommodation
 * meets minimum comfort standards required under Hajj quota conditions.
 *
 * @param icNumber   Malaysian IC number
 * @param bookingId  UTUBooking reservation ID
 * @returns          THLinkResult
 * @throws           TabungHajiError on API error or invalid IC
 */
export async function linkBooking(
  icNumber: IcNumber,
  bookingId: string,
): Promise<THLinkResult> {
  const ic = normaliseIc(icNumber);
  if (!isValidIc(ic)) {
    throw new TabungHajiError('IC number must be exactly 12 digits.', 400, 'INVALID_IC');
  }
  if (!bookingId?.trim()) {
    throw new TabungHajiError('bookingId is required.', 400, 'MISSING_BOOKING_ID');
  }

  const raw = await thRequest<{
    link_id:    string;
    linked_at:  string;
    message:    string;
    message_bm: string;
  }>('POST', '/booking/link', {
    ic_number:  ic,
    booking_id: bookingId,
    partner_id: PARTNER_ID,
    source:     'UTUBOOKING',
  });

  return {
    success:   true,
    linkId:    raw.link_id,
    icNumber:  maskIc(ic),
    bookingId,
    linkedAt:  raw.linked_at,
    // Return both languages for flexibility
    message:   `${raw.message_bm} / ${raw.message}`,
  };
}

// ─── State name lookup (offline reference) ───────────────────────────────────

/** Maps Malaysian state codes to English + Bahasa Melayu names. */
export const MY_STATES: Record<string, { en: string; ms: string }> = {
  '01': { en: 'Johor',          ms: 'Johor' },
  '02': { en: 'Kedah',          ms: 'Kedah' },
  '03': { en: 'Kelantan',       ms: 'Kelantan' },
  '04': { en: 'Melaka',         ms: 'Melaka' },
  '05': { en: 'Negeri Sembilan',ms: 'Negeri Sembilan' },
  '06': { en: 'Pahang',         ms: 'Pahang' },
  '07': { en: 'Perak',          ms: 'Perak' },
  '08': { en: 'Perlis',         ms: 'Perlis' },
  '09': { en: 'Selangor',       ms: 'Selangor' },
  '10': { en: 'Terengganu',     ms: 'Terengganu' },
  '11': { en: 'Sabah',          ms: 'Sabah' },
  '12': { en: 'Sarawak',        ms: 'Sarawak' },
  '13': { en: 'Kuala Lumpur',   ms: 'Wilayah Persekutuan Kuala Lumpur' },
  '14': { en: 'Labuan',         ms: 'Wilayah Persekutuan Labuan' },
  '15': { en: 'Putrajaya',      ms: 'Wilayah Persekutuan Putrajaya' },
  '16': { en: 'Penang',         ms: 'Pulau Pinang' },
};
