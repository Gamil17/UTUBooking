/**
 * Haj Committee of India (HCoI) Partner API Adapter
 * India — Ministry of Minority Affairs — hajcommittee.gov.in
 *
 * Obtain partner credentials through:
 *   Ministry of Minority Affairs IT portal — https://minorityaffairs.gov.in
 *   Contact: it@hajcommittee.gov.in
 *   Process: Submit partner integration request with UTUBooking company registration,
 *            DPDP Act DPO details, and data processing agreement.
 *
 * Required env vars:
 *   HCOI_API_KEY         — partner API key issued by HCoI IT
 *   HCOI_PARTNER_ID      — UTUBooking registered partner identifier
 *   HCOI_PARTNER_SECRET  — HMAC-SHA256 signing secret
 *   HCOI_SANDBOX         — 'true' to target sandbox environment
 *
 * API contract (partner portal spec):
 *   Base URL (prod):    https://api.hajcommittee.gov.in/v2
 *   Base URL (sandbox): https://sandbox.api.hajcommittee.gov.in/v2
 *   Auth:               X-Api-Key + X-Partner-Id headers
 *   Request signing:    HMAC-SHA256(timestamp + method + path, HCOI_PARTNER_SECRET)
 *                       sent as X-Signature header
 *   Rate limits:        60 req/min per partner key (prod); 10 req/min (sandbox)
 *
 * Pilgrim identity:
 *   HCoI Application Number — format: {STATE_CODE}/{YEAR}/{SEQUENCE_6}
 *   Examples: UP/2026/001234, MH/2026/056789, WB/2026/000321
 *   STATE_CODE: 2-letter Indian state/UT code (see INDIA_STATES map below)
 *   YEAR: 4-digit Hijri year of application (Gregorian mapping: 2026 → 1447H)
 *   SEQUENCE: 6-digit zero-padded serial number within state
 *
 * Hajj quota context (2026 / 1447H):
 *   India's annual Hajj quota ≈ 175,000 places (second-largest globally).
 *   Managed by Haj Committee of India (HCoI) + State Hajj Committees.
 *   8 embarkation points: DEL, BOM, MAA, CCU, HYD, BLR, AMD, LKO
 *   Air India (AI) operates government-allocated Hajj charter flights.
 *   Seat allocation: HCoI lottery system for oversubscribed quota years.
 *   Waiting: first-come-first-served; repeat pilgrims deprioritised per
 *     Ministry policy (5-year cooling period after previous Hajj).
 *
 * Caching (DPDP Act §6 — data minimisation):
 *   Status:       Redis key `hcoi:status:{sha256(appNum)}` — TTL 5 min
 *   Quota:        Redis key `hcoi:quota:{year}`            — TTL 1 hour
 *   No caching for linkBooking (mutating operation).
 *   Raw application numbers are NEVER stored in Redis keys — SHA-256 hash only.
 *
 * Data privacy (DPDP Act 2023):
 *   Application numbers are personally identifiable (state + year + sequence).
 *   Never log raw application numbers. Cache keys use SHA-256 hash only.
 *   Data stored in AWS Mumbai (ap-south-1) — India data residency requirement.
 *   Breach notification: within 72 hours per DPDP §8.
 */

'use strict';

import crypto from 'crypto';
import { createClient as createRedisClient } from 'redis';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY        = process.env.HCOI_API_KEY        ?? '';
const PARTNER_ID     = process.env.HCOI_PARTNER_ID     ?? '';
const PARTNER_SECRET = process.env.HCOI_PARTNER_SECRET ?? '';
const SANDBOX        = process.env.HCOI_SANDBOX        === 'true';

const BASE_URL = SANDBOX
  ? 'https://sandbox.api.hajcommittee.gov.in/v2'
  : 'https://api.hajcommittee.gov.in/v2';

/** India national Hajj quota (2026 / 1447H allocation). */
const ANNUAL_NATIONAL_QUOTA = 175_000;

/** Number of embarkation points (DEL, BOM, MAA, CCU, HYD, BLR, AMD, LKO). */
const EMBARKATION_POINTS = 8;

/** Approximate quota per embarkation point (weighted; DEL and BOM have higher allocation). */
const QUOTA_PER_EMBARKATION: Record<string, number> = {
  DEL: 38_000,   // Uttar Pradesh + Delhi/NCR — largest Muslim population
  LKO: 32_000,   // Uttar Pradesh additional allocation (Lucknow sector)
  BOM: 28_000,   // Maharashtra + Gujarat overflow
  MAA: 22_000,   // Tamil Nadu + Kerala + Karnataka south
  CCU: 18_000,   // West Bengal + Bihar + Jharkhand + Odisha
  HYD: 16_000,   // Telangana + Andhra Pradesh
  BLR: 12_000,   // Karnataka + other South India
  AMD:  9_000,   // Gujarat
};

const CACHE_TTL_STATUS_SEC = 300;      // 5 minutes — PII sensitivity
const CACHE_TTL_QUOTA_SEC  = 3_600;   // 1 hour — public data, changes rarely

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * HCoI Application Number.
 * Format: {STATE_CODE}/{YEAR}/{SEQUENCE_6}
 * Example: UP/2026/001234
 */
export type ApplicationNumber = string;

export type HajjApplicationStatus =
  | 'APPLIED'       // application submitted, pending lottery/confirmation
  | 'SHORTLISTED'   // selected in HCoI lottery — awaiting final confirmation
  | 'CONFIRMED'     // confirmed pilgrim — seat allocated on AI charter
  | 'WAITLISTED'    // on waitlist — may be called up if confirmed pilgrim withdraws
  | 'REJECTED'      // application rejected (ineligibility, incomplete docs, etc.)
  | 'WITHDRAWN'     // pilgrim voluntarily withdrew application
  | 'COMPLETED'     // has performed Hajj under HCoI quota
  | 'NOT_FOUND';    // application number not found in HCoI database

export interface HCoIApplicationStatus {
  applicationNumber: string;       // masked display (first segment only: e.g. 'UP/2026/***456')
  status:            HajjApplicationStatus;
  applicantName:     string;       // full name as on passport
  embarkationPoint:  string;       // IATA code — e.g. 'LKO'
  embarkationCity:   string;       // city name — e.g. 'Lucknow'
  flightRef:         string | null;// AI charter flight number — e.g. 'AI-9001'; null if not yet assigned
  departureDate:     string | null;// ISO 8601 date — null until assigned
  returnDate:        string | null;// ISO 8601 date — null until assigned
  hotelMakkah:       string | null;// HCoI-assigned Makkah accommodation name
  hotelMadinah:      string | null;// HCoI-assigned Madinah accommodation name
  packageType:       'STANDARD' | 'AZIZIYAH' | 'TAWAFUQ' | null;
  submittedAt:       string;       // ISO 8601 timestamp of original application
  lastUpdated:       string;       // ISO 8601 timestamp of latest status change
  coolingPeriodActive: boolean;    // true if 5-year repeat-pilgrim bar applies
  statusHi:          string;       // Hindi status description for display
  statusUr:          string;       // Urdu status description for display
}

export interface HCoIQuotaAllocation {
  year:             number;        // Gregorian year (2026)
  hijriYear:        string;        // Hijri year string (e.g. '1447H')
  totalQuota:       number;        // India's total national quota
  allocatedSeats:   number;        // seats allocated so far (confirmed pilgrims)
  remainingSeats:   number;        // seats still available
  waitlistSize:     number;        // current waitlist length
  embarkationBreakdown: Record<string, {
    quota:     number;
    allocated: number;
    remaining: number;
  }>;
  lastUpdated:      string;        // ISO 8601 timestamp
}

export interface HCoILinkResult {
  success:           boolean;
  linkId:            string;       // HCoI-generated link reference
  applicationNumber: string;       // masked
  bookingId:         string;       // UTUBooking reservation ID
  linkedAt:          string;       // ISO 8601
  flightLinked:      boolean;      // true if UTUBooking flight booking was accepted
  hotelLinked:       boolean;      // true if UTUBooking hotel booking was accepted
  message:           string;       // English confirmation
  messageHi:         string;       // Hindi confirmation — अनुमोदित बुकिंग से जोड़ा गया
  messageUr:         string;       // Urdu confirmation
}

export class HajCommitteeIndiaError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly hcoiErrorCode?: string,
  ) {
    super(message);
    this.name = 'HajCommitteeIndiaError';
  }
}

// ─── Redis ────────────────────────────────────────────────────────────────────

let _redis: ReturnType<typeof createRedisClient> | null = null;

function getRedis() {
  if (!_redis) {
    _redis = createRedisClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    _redis.on('error', (e: Error) => console.error('[haj-committee-india] redis error:', e));
    _redis.connect().catch((e: Error) => console.error('[haj-committee-india] redis connect failed:', e));
  }
  return _redis;
}

// ─── Application number helpers ───────────────────────────────────────────────

/**
 * Normalises the application number:
 *   - Uppercases state code
 *   - Removes extra whitespace
 *   - Accepts both 'UP/2026/1234' and 'UP/2026/001234' (zero-pads to 6 digits)
 */
export function normaliseApplicationNumber(appNum: string): string {
  const trimmed = appNum.trim().toUpperCase().replace(/\s/g, '');
  const parts   = trimmed.split('/');
  if (parts.length !== 3) return trimmed; // return as-is; validation will catch it
  const [state, year, seq] = parts;
  return `${state}/${year}/${seq.padStart(6, '0')}`;
}

/**
 * Validates an HCoI application number.
 * Pattern: {2-letter state}/{4-digit year}/{6-digit sequence}
 */
export function isValidApplicationNumber(appNum: string): boolean {
  return /^[A-Z]{2}\/\d{4}\/\d{6}$/.test(normaliseApplicationNumber(appNum));
}

/**
 * Returns a privacy-safe masked version of the application number.
 * Shows state and year; masks last 3 digits of sequence.
 * e.g. 'UP/2026/001234' → 'UP/2026/***234'
 */
export function maskApplicationNumber(appNum: string): string {
  const n = normaliseApplicationNumber(appNum);
  if (!isValidApplicationNumber(n)) return '**/***/***';
  const [state, year, seq] = n.split('/');
  return `${state}/${year}/***${seq.slice(3)}`;
}

/** SHA-256 hash of the normalised application number — used as Redis cache key. */
function hashApplicationNumber(appNum: string): string {
  return crypto
    .createHash('sha256')
    .update(normaliseApplicationNumber(appNum))
    .digest('hex')
    .slice(0, 32);
}

// ─── Request signing ──────────────────────────────────────────────────────────

/**
 * Generates the HMAC-SHA256 request signature required by the HCoI partner API.
 * Signature payload: timestamp + METHOD + path (all components uppercased).
 */
function signRequest(method: string, path: string, timestamp: string): string {
  const payload = `${timestamp}${method.toUpperCase()}${path}`;
  return crypto.createHmac('sha256', PARTNER_SECRET).update(payload).digest('hex');
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function hcoiRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const timestamp = new Date().toISOString();
  const signature = signRequest(method, path, timestamp);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'X-Api-Key':    API_KEY,
      'X-Partner-Id': PARTNER_ID,
      'X-Timestamp':  timestamp,
      'X-Signature':  signature,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12_000), // HCoI API can be slow — 12s timeout
  });

  if (!res.ok) {
    let msg  = `HCoI API error ${res.status}`;
    let code: string | undefined;
    try {
      const err = await res.json() as { message?: string; error_code?: string };
      if (err.message)    msg  = err.message;
      if (err.error_code) code = err.error_code;
    } catch { /* ignore JSON parse failure */ }
    throw new HajCommitteeIndiaError(msg, res.status, code);
  }

  return res.json() as Promise<T>;
}

// ─── Status label helpers ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<HajjApplicationStatus, { en: string; hi: string; ur: string }> = {
  APPLIED:     {
    en: 'Application submitted — awaiting HCoI lottery result',
    hi: 'आवेदन जमा हुआ — HCoI लॉटरी परिणाम की प्रतीक्षा है',
    ur: 'درخواست جمع ہوئی — HCoI قرعہ اندازی کے نتیجے کا انتظار ہے',
  },
  SHORTLISTED: {
    en: 'Shortlisted — final confirmation pending',
    hi: 'शॉर्टलिस्ट हुए — अंतिम पुष्टि लंबित है',
    ur: 'شارٹ لسٹ ہوئے — حتمی تصدیق زیر التواء ہے',
  },
  CONFIRMED:   {
    en: 'Confirmed — Hajj seat allocated on Air India charter',
    hi: 'पुष्टि हुई — एयर इंडिया चार्टर पर हज सीट आवंटित',
    ur: 'تصدیق ہوئی — ایئر انڈیا چارٹر پر حج سیٹ مختص',
  },
  WAITLISTED:  {
    en: 'Waitlisted — you may be called if a confirmed pilgrim withdraws',
    hi: 'प्रतीक्षा सूची में — यदि कोई पुष्टि हुआ तीर्थयात्री हटता है तो आपको बुलाया जा सकता है',
    ur: 'انتظاری فہرست میں — اگر کوئی تصدیق شدہ حاجی دستبردار ہو تو آپ کو بلایا جا سکتا ہے',
  },
  REJECTED:    {
    en: 'Application rejected — contact your State Haj Committee for details',
    hi: 'आवेदन अस्वीकृत — विवरण के लिए अपने राज्य हज समिति से संपर्क करें',
    ur: 'درخواست مسترد — تفصیلات کے لیے اپنی ریاستی حج کمیٹی سے رابطہ کریں',
  },
  WITHDRAWN:   {
    en: 'Application withdrawn',
    hi: 'आवेदन वापस लिया गया',
    ur: 'درخواست واپس لے لی گئی',
  },
  COMPLETED:   {
    en: 'Hajj completed — Mabrur! (5-year cooling period applies for re-application)',
    hi: 'हज पूर्ण — मबरूर! (पुनः आवेदन के लिए 5 वर्ष की प्रतीक्षा अवधि लागू)',
    ur: 'حج مکمل — مبرور! (دوبارہ درخواست کے لیے 5 سال کی کولنگ پیریڈ لاگو)',
  },
  NOT_FOUND:   {
    en: 'Application not found — check the number or contact your State Haj Committee',
    hi: 'आवेदन नहीं मिला — नंबर जांचें या अपने राज्य हज समिति से संपर्क करें',
    ur: 'درخواست نہیں ملی — نمبر چیک کریں یا اپنی ریاستی حج کمیٹی سے رابطہ کریں',
  },
};

// ─── getApplicationStatus ─────────────────────────────────────────────────────

/**
 * Retrieves the pilgrim's Hajj application status from the HCoI API.
 * Returns current status, assigned flight and accommodation details
 * (once confirmed), and bilingual status labels (English + Hindi + Urdu).
 *
 * Visibility rule: show only when country = IN and booking type = Hajj.
 *
 * @param applicationNumber  HCoI application number (e.g. 'UP/2026/001234')
 * @returns                  HCoIApplicationStatus
 * @throws                   HajCommitteeIndiaError if not found or API error
 */
export async function getApplicationStatus(
  applicationNumber: ApplicationNumber,
): Promise<HCoIApplicationStatus> {
  const appNum = normaliseApplicationNumber(applicationNumber);

  if (!isValidApplicationNumber(appNum)) {
    throw new HajCommitteeIndiaError(
      'Invalid application number. Expected format: STATE/YEAR/SEQUENCE (e.g. UP/2026/001234).',
      400,
      'INVALID_APPLICATION_NUMBER',
    );
  }

  const cacheKey = `hcoi:status:${hashApplicationNumber(appNum)}`;
  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as HCoIApplicationStatus;
  } catch { /* non-fatal — proceed to live API */ }

  const raw = await hcoiRequest<{
    status:              string;
    applicant_name:      string;
    embarkation_point:   string;
    embarkation_city:    string;
    flight_ref:          string | null;
    departure_date:      string | null;
    return_date:         string | null;
    hotel_makkah:        string | null;
    hotel_madinah:       string | null;
    package_type:        string | null;
    submitted_at:        string;
    last_updated:        string;
    cooling_period_active: boolean;
  }>('GET', `/application/status?appNum=${encodeURIComponent(appNum)}`);

  const status   = raw.status as HajjApplicationStatus;
  const labels   = STATUS_LABELS[status] ?? STATUS_LABELS.NOT_FOUND;

  const result: HCoIApplicationStatus = {
    applicationNumber:   maskApplicationNumber(appNum),
    status,
    applicantName:       raw.applicant_name,
    embarkationPoint:    raw.embarkation_point,
    embarkationCity:     raw.embarkation_city,
    flightRef:           raw.flight_ref,
    departureDate:       raw.departure_date,
    returnDate:          raw.return_date,
    hotelMakkah:         raw.hotel_makkah,
    hotelMadinah:        raw.hotel_madinah,
    packageType:         raw.package_type as HCoIApplicationStatus['packageType'],
    submittedAt:         raw.submitted_at,
    lastUpdated:         raw.last_updated,
    coolingPeriodActive: raw.cooling_period_active,
    statusHi:            labels.hi,
    statusUr:            labels.ur,
  };

  try {
    await getRedis().setEx(cacheKey, CACHE_TTL_STATUS_SEC, JSON.stringify(result));
  } catch { /* non-fatal */ }

  return result;
}

// ─── getQuotaAllocation ───────────────────────────────────────────────────────

/**
 * Returns the current year's Hajj quota allocation breakdown by embarkation point.
 * Useful for showing pilgrims which embarkation points still have remaining seats.
 *
 * Data is publicly available via HCoI — does not contain PII.
 * Cached for 1 hour (quota changes are infrequent).
 *
 * @param year  Gregorian year (defaults to current year)
 * @returns     HCoIQuotaAllocation
 * @throws      HajCommitteeIndiaError on API error
 */
export async function getQuotaAllocation(year?: number): Promise<HCoIQuotaAllocation> {
  const targetYear = year ?? new Date().getFullYear();
  const cacheKey   = `hcoi:quota:${targetYear}`;

  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as HCoIQuotaAllocation;
  } catch { /* non-fatal */ }

  const raw = await hcoiRequest<{
    year:             number;
    hijri_year:       string;
    total_quota:      number;
    allocated_seats:  number;
    remaining_seats:  number;
    waitlist_size:    number;
    embarkation_breakdown: Record<string, {
      quota:     number;
      allocated: number;
      remaining: number;
    }>;
    last_updated:     string;
  }>('GET', `/quota/allocation?year=${targetYear}`);

  const result: HCoIQuotaAllocation = {
    year:                    raw.year,
    hijriYear:               raw.hijri_year,
    totalQuota:              raw.total_quota,
    allocatedSeats:          raw.allocated_seats,
    remainingSeats:          raw.remaining_seats,
    waitlistSize:            raw.waitlist_size,
    embarkationBreakdown:    raw.embarkation_breakdown,
    lastUpdated:             raw.last_updated,
  };

  try {
    await getRedis().setEx(cacheKey, CACHE_TTL_QUOTA_SEC, JSON.stringify(result));
  } catch { /* non-fatal */ }

  return result;
}

// ─── linkBooking ──────────────────────────────────────────────────────────────

/**
 * Links an approved HCoI Hajj application to a UTUBooking flight/hotel reservation.
 *
 * HCoI uses this link to:
 *   (a) Confirm the pilgrim's accommodation meets minimum comfort standards
 *   (b) Validate that the booked flight matches the HCoI charter schedule
 *   (c) Record private-sector arrangements in the official Hajj management system
 *
 * IMPORTANT: Only CONFIRMED applications can be linked. Attempting to link
 * an APPLIED, SHORTLISTED, or WAITLISTED application returns a 422 error.
 *
 * The endpoint is idempotent: re-linking the same (appNum, bookingId) pair
 * returns the existing linkId rather than creating a duplicate.
 *
 * @param applicationNumber  HCoI application number (must be CONFIRMED)
 * @param bookingId          UTUBooking reservation ID
 * @param bookingType        'flight' | 'hotel' | 'package' — drives HCoI validation rules
 * @returns                  HCoILinkResult
 * @throws                   HajCommitteeIndiaError on API error or unconfirmed status
 */
export async function linkBooking(
  applicationNumber: ApplicationNumber,
  bookingId: string,
  bookingType: 'flight' | 'hotel' | 'package' = 'package',
): Promise<HCoILinkResult> {
  const appNum = normaliseApplicationNumber(applicationNumber);

  if (!isValidApplicationNumber(appNum)) {
    throw new HajCommitteeIndiaError(
      'Invalid application number. Expected format: STATE/YEAR/SEQUENCE (e.g. UP/2026/001234).',
      400,
      'INVALID_APPLICATION_NUMBER',
    );
  }
  if (!bookingId?.trim()) {
    throw new HajCommitteeIndiaError('bookingId is required.', 400, 'MISSING_BOOKING_ID');
  }

  const raw = await hcoiRequest<{
    link_id:       string;
    linked_at:     string;
    flight_linked: boolean;
    hotel_linked:  boolean;
    message:       string;
    message_hi:    string;
    message_ur:    string;
  }>('POST', '/booking/link', {
    application_number: appNum,
    booking_id:         bookingId,
    booking_type:       bookingType,
    partner_id:         PARTNER_ID,
    source:             'UTUBOOKING',
  });

  return {
    success:           true,
    linkId:            raw.link_id,
    applicationNumber: maskApplicationNumber(appNum),
    bookingId,
    linkedAt:          raw.linked_at,
    flightLinked:      raw.flight_linked,
    hotelLinked:       raw.hotel_linked,
    message:           raw.message,
    messageHi:         raw.message_hi,
    messageUr:         raw.message_ur,
  };
}

// ─── isEligibleForIntegration ─────────────────────────────────────────────────

/**
 * Guard function — returns true only when the HCoI widget should be shown.
 * Per spec: visible only when country = IN and booking type = Hajj.
 *
 * @param countryCode  ISO 3166-1 alpha-2 — e.g. 'IN'
 * @param bookingType  e.g. 'Hajj', 'Umrah', 'hotel'
 */
export function isEligibleForIntegration(
  countryCode: string,
  bookingType: string,
): boolean {
  return countryCode === 'IN' && bookingType.toLowerCase() === 'hajj';
}

// ─── Indian state/UT lookup (offline reference) ───────────────────────────────

/**
 * Maps HCoI state codes to full names in English and Hindi.
 * These are the 2-letter prefixes used in HCoI application numbers.
 */
export const INDIA_STATES: Record<string, { en: string; hi: string; embarkationPoint: string }> = {
  AN: { en: 'Andaman and Nicobar Islands', hi: 'अंडमान और निकोबार द्वीप समूह', embarkationPoint: 'MAA' },
  AP: { en: 'Andhra Pradesh',              hi: 'आंध्र प्रदेश',                  embarkationPoint: 'HYD' },
  AR: { en: 'Arunachal Pradesh',           hi: 'अरुणाचल प्रदेश',                embarkationPoint: 'CCU' },
  AS: { en: 'Assam',                       hi: 'असम',                            embarkationPoint: 'CCU' },
  BR: { en: 'Bihar',                       hi: 'बिहार',                          embarkationPoint: 'CCU' },
  CH: { en: 'Chandigarh',                  hi: 'चंडीगढ़',                         embarkationPoint: 'DEL' },
  CT: { en: 'Chhattisgarh',               hi: 'छत्तीसगढ़',                        embarkationPoint: 'BOM' },
  DD: { en: 'Dadra and Nagar Haveli',      hi: 'दादरा और नगर हवेली',             embarkationPoint: 'BOM' },
  DL: { en: 'Delhi',                       hi: 'दिल्ली',                          embarkationPoint: 'DEL' },
  GA: { en: 'Goa',                         hi: 'गोवा',                            embarkationPoint: 'BOM' },
  GJ: { en: 'Gujarat',                     hi: 'गुजरात',                          embarkationPoint: 'AMD' },
  HR: { en: 'Haryana',                     hi: 'हरियाणा',                         embarkationPoint: 'DEL' },
  HP: { en: 'Himachal Pradesh',            hi: 'हिमाचल प्रदेश',                   embarkationPoint: 'DEL' },
  JH: { en: 'Jharkhand',                   hi: 'झारखंड',                          embarkationPoint: 'CCU' },
  JK: { en: 'Jammu and Kashmir',           hi: 'जम्मू और कश्मीर',                 embarkationPoint: 'DEL' },
  KA: { en: 'Karnataka',                   hi: 'कर्नाटक',                         embarkationPoint: 'BLR' },
  KL: { en: 'Kerala',                      hi: 'केरल',                            embarkationPoint: 'MAA' },
  LA: { en: 'Ladakh',                      hi: 'लद्दाख',                          embarkationPoint: 'DEL' },
  LD: { en: 'Lakshadweep',                 hi: 'लक्षद्वीप',                       embarkationPoint: 'MAA' },
  MH: { en: 'Maharashtra',                 hi: 'महाराष्ट्र',                      embarkationPoint: 'BOM' },
  MN: { en: 'Manipur',                     hi: 'मणिपुर',                          embarkationPoint: 'CCU' },
  ML: { en: 'Meghalaya',                   hi: 'मेघालय',                          embarkationPoint: 'CCU' },
  MZ: { en: 'Mizoram',                     hi: 'मिजोरम',                          embarkationPoint: 'CCU' },
  NL: { en: 'Nagaland',                    hi: 'नागालैंड',                        embarkationPoint: 'CCU' },
  OD: { en: 'Odisha',                      hi: 'ओडिशा',                           embarkationPoint: 'CCU' },
  PB: { en: 'Punjab',                      hi: 'पंजाब',                           embarkationPoint: 'DEL' },
  PY: { en: 'Puducherry',                  hi: 'पुडुचेरी',                        embarkationPoint: 'MAA' },
  RJ: { en: 'Rajasthan',                   hi: 'राजस्थान',                        embarkationPoint: 'DEL' },
  SK: { en: 'Sikkim',                      hi: 'सिक्किम',                         embarkationPoint: 'CCU' },
  TN: { en: 'Tamil Nadu',                  hi: 'तमिलनाडु',                        embarkationPoint: 'MAA' },
  TS: { en: 'Telangana',                   hi: 'तेलंगाना',                        embarkationPoint: 'HYD' },
  TR: { en: 'Tripura',                     hi: 'त्रिपुरा',                        embarkationPoint: 'CCU' },
  UP: { en: 'Uttar Pradesh',               hi: 'उत्तर प्रदेश',                    embarkationPoint: 'LKO' },
  UT: { en: 'Uttarakhand',                 hi: 'उत्तराखंड',                       embarkationPoint: 'DEL' },
  WB: { en: 'West Bengal',                 hi: 'पश्चिम बंगाल',                    embarkationPoint: 'CCU' },
};

/**
 * Resolves the nearest embarkation point for a given state code.
 * Falls back to 'DEL' for unknown codes.
 */
export function getEmbarkationPoint(stateCode: string): string {
  return INDIA_STATES[stateCode.toUpperCase()]?.embarkationPoint ?? 'DEL';
}
