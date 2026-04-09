import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/hajj/tabung-haji
 *
 * Thin server-side proxy to the Tabung Haji partner API.
 * All three operations are dispatched via the `action` field in the body:
 *
 *   { action: 'checkBalance', icNumber: '...' }
 *   { action: 'getHajjStatus', icNumber: '...' }
 *   { action: 'linkBooking', icNumber: '...', bookingId: '...' }
 *
 * The API key and partner secret never leave the server.
 * Raw IC numbers are never logged — only SHA-256 hashes are stored in Redis.
 *
 * Env vars required (server-side only):
 *   TH_API_KEY, TH_PARTNER_ID, TH_PARTNER_SECRET, TH_SANDBOX
 *   TH_SERVICE_URL — optional; if set, proxies to a dedicated backend service
 *                    instead of calling the TH API inline.
 */

const TH_SERVICE_URL = process.env.TH_SERVICE_URL; // optional backend service

// ─── Inline TH API call (used when no TH_SERVICE_URL is set) ─────────────────

const API_KEY        = process.env.TH_API_KEY        ?? '';
const PARTNER_ID     = process.env.TH_PARTNER_ID     ?? '';
const PARTNER_SECRET = process.env.TH_PARTNER_SECRET ?? '';
const SANDBOX        = process.env.TH_SANDBOX        === 'true';

const BASE_URL = SANDBOX
  ? 'https://sandbox.api.tabunghaji.gov.my/v1'
  : 'https://api.tabunghaji.gov.my/v1';

const ANNUAL_QUOTA_PER_STATE = Math.round(31_600 / 13);
const CACHE_TTL_SEC          = 300;

// ── Redis ─────────────────────────────────────────────────────────────────────

import redis from '@/lib/redis';
import crypto from 'crypto';

function hashIc(ic: string) {
  return crypto.createHash('sha256').update(ic).digest('hex').slice(0, 32);
}

function maskIc(ic: string) {
  return ic.length === 12 ? `****-**-${ic.slice(8)}` : '****-**-****';
}

function isValidIc(ic: string) {
  return /^\d{12}$/.test(ic);
}

function normaliseIc(raw: string) {
  return raw.replace(/[-\s]/g, '');
}

function signRequest(method: string, path: string, timestamp: string) {
  return crypto
    .createHmac('sha256', PARTNER_SECRET)
    .update(`${timestamp}${method.toUpperCase()}${path}`)
    .digest('hex');
}

async function thFetch<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const timestamp = new Date().toISOString();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'X-Api-Key':    API_KEY,
      'X-Partner-Id': PARTNER_ID,
      'X-Timestamp':  timestamp,
      'X-Signature':  signRequest(method, path, timestamp),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    let msg = `TH API ${res.status}`;
    try { const e = await res.json() as { message?: string }; if (e.message) msg = e.message; } catch { /* ignore */ }
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return res.json() as Promise<T>;
}

function estimateDeparture(q: number) {
  const yrs  = Math.ceil(q / ANNUAL_QUOTA_PER_STATE);
  const year = new Date().getFullYear() + yrs;
  const phase = q % 2 === 0 ? `Fasa 1 (Mei–Jun) ${year}` : `Fasa 2 (Jun–Jul) ${year}`;
  return { year, phase };
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleCheckBalance(ic: string) {
  const key    = `th:pilgrim:balance:${hashIc(ic)}`;
  const cached = await redis.get(key).catch(() => null);
  if (cached && cached.length < 10_000) return JSON.parse(cached);

  const raw = await thFetch<{
    account_number: string; balance_myr: number; required_myr: number; last_updated: string;
  }>('GET', `/pilgrim/balance?ic=${ic}`);

  const result = {
    icNumber:          maskIc(ic),
    accountNumber:     raw.account_number,
    balanceMYR:        raw.balance_myr,
    requiredAmountMYR: raw.required_myr,
    isSufficient:      raw.balance_myr >= raw.required_myr,
    lastUpdated:       raw.last_updated,
  };
  await redis.setex(key, CACHE_TTL_SEC, JSON.stringify(result)).catch(() => null);
  return result;
}

async function handleGetHajjStatus(ic: string) {
  const key    = `th:pilgrim:status:${hashIc(ic)}`;
  const cached = await redis.get(key).catch(() => null);
  if (cached && cached.length < 10_000) return JSON.parse(cached);

  const raw = await thFetch<{
    registration_status: string; queue_number: number | null;
    state_code: string | null;   state_name: string | null;
    registration_date: string | null; last_hajj_year: number | null;
  }>('GET', `/pilgrim/hajj-status?ic=${ic}`);

  const status = raw.registration_status;
  let year: number | null = null;
  let phase: string | null = null;

  if (raw.queue_number && (status === 'REGISTERED' || status === 'CONFIRMED')) {
    const e = estimateDeparture(raw.queue_number);
    year  = e.year;
    phase = e.phase;
  } else if (status === 'CONFIRMED') {
    year  = new Date().getFullYear();
    phase = `Fasa 1 (Mei–Jun) ${year}`;
  }

  const result = {
    icNumber:               maskIc(ic),
    registrationStatus:     status,
    queueNumber:            raw.queue_number,
    stateCode:              raw.state_code,
    stateName:              raw.state_name,
    estimatedDepartureYear: year,
    estimatedDeparturePhase:phase,
    registrationDate:       raw.registration_date,
    lastHajjYear:           raw.last_hajj_year,
  };
  await redis.setex(key, CACHE_TTL_SEC, JSON.stringify(result)).catch(() => null);
  return result;
}

async function handleLinkBooking(ic: string, bookingId: string) {
  const raw = await thFetch<{
    link_id: string; linked_at: string; message: string; message_bm: string;
  }>('POST', '/booking/link', {
    ic_number: ic, booking_id: bookingId, partner_id: PARTNER_ID, source: 'UTUBOOKING',
  });

  return {
    success:   true,
    linkId:    raw.link_id,
    icNumber:  maskIc(ic),
    bookingId,
    linkedAt:  raw.linked_at,
    message:   `${raw.message_bm} / ${raw.message}`,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { action?: string; icNumber?: string; bookingId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, icNumber: rawIc, bookingId } = body;

  if (!action || !rawIc) {
    return NextResponse.json({ error: 'action and icNumber are required' }, { status: 400 });
  }

  const ic = normaliseIc(rawIc);
  if (!isValidIc(ic)) {
    return NextResponse.json(
      { error: 'Nombor IC tidak sah. Sila masukkan 12 digit nombor MyKad anda. / Invalid IC number. Please enter your 12-digit MyKad number.' },
      { status: 400 }
    );
  }

  // ── If a dedicated backend service is configured, proxy there ────────────
  if (TH_SERVICE_URL) {
    try {
      const upstream = await fetch(`${TH_SERVICE_URL}/api/hajj/tabung-haji`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, icNumber: ic, bookingId }),
        signal:  AbortSignal.timeout(12_000),
      });
      const data = await upstream.json();
      return NextResponse.json(data, { status: upstream.status });
    } catch (err) {
      console.error('[tabung-haji proxy] upstream error:', err);
      return NextResponse.json({ error: 'Perkhidmatan tidak tersedia / Service unavailable' }, { status: 503 });
    }
  }

  // ── Inline TH API call ────────────────────────────────────────────────────
  try {
    let result: unknown;

    if (action === 'checkBalance') {
      result = await handleCheckBalance(ic);
    } else if (action === 'getHajjStatus') {
      result = await handleGetHajjStatus(ic);
    } else if (action === 'linkBooking') {
      if (!bookingId?.trim()) {
        return NextResponse.json({ error: 'bookingId is required for linkBooking' }, { status: 400 });
      }
      result = await handleLinkBooking(ic, bookingId);
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 502;
    const message = (err as Error).message ?? 'Tabung Haji API error';
    console.error('[tabung-haji]', action, 'error:', message);
    return NextResponse.json({ error: message }, { status });
  }
}
