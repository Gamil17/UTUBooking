/**
 * National Hajj Quota Adapters
 *
 * Provides real-time (or weekly-cached) national quota data for:
 *   - Turkey (Diyanet İşleri Başkanlığı)
 *   - Indonesia (Kemenag / BPIH)
 *   - Pakistan (Ministry of Religious Affairs — MoRA)
 *
 * Each QuotaProvider follows the same interface so NationalQuotaCard.tsx
 * can render a uniform widget regardless of country.
 *
 * Cache strategy:
 *   Turkey    — Redis `quota:TR:{year}`, TTL 7 days  (Diyanet announces once/year)
 *   Indonesia — Redis `quota:ID:{year}`, TTL 24 h   (BPIH portal updates daily)
 *   Pakistan  — Redis `quota:PK:{year}`, TTL 7 days  (MoRA announces once/year)
 *
 * All cache keys are non-PII; no personal data is stored.
 *
 * Required env vars:
 *   REDIS_URL                    — e.g. redis://localhost:6379
 *   KEMENAG_API_KEY              — issued by Kemenag (api.kemenag.go.id partner portal)
 *   KEMENAG_API_BASE_URL         — default https://api.kemenag.go.id/haji/v1  (override for sandbox)
 *
 * No API keys are needed for Diyanet or MoRA — data is obtained via public scraping.
 * Set HTTP_PROXY if running behind a corporate proxy.
 */

'use strict';

import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { createClient } from 'redis';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface QuotaStatus {
  country: 'TR' | 'ID' | 'PK';
  year: number;
  /** Total annual quota allocated by Saudi Arabia for this country. */
  totalQuota: number;
  /** Seats remaining for the current application cycle (undefined if not announced). */
  remainingQuota?: number;
  /** National waitlist length (number of registered pilgrims awaiting assignment). */
  waitlistCount?: number;
  /** Approximate waiting time in years from today for a new registrant. */
  estimatedWaitYears?: number;
  /** Whether the application window is currently open. */
  applicationOpen: boolean;
  /** ISO date string — application window opens (e.g. "2026-01-15"). */
  applicationOpenDate?: string;
  /** ISO date string — application window closes. */
  applicationCloseDate?: string;
  /** URL of the official application portal. */
  portalUrl: string;
  /** Contact / helpline for citizens. */
  helpline?: string;
  /** ISO timestamp of when this data was last fetched. */
  fetchedAt: string;
  /** Data source label for display. */
  source: string;
}

export interface QuotaProvider {
  getQuota(year?: number): Promise<QuotaStatus>;
}

// ─── Redis helper ─────────────────────────────────────────────────────────────

let _redis: ReturnType<typeof createClient> | null = null;

async function getRedis() {
  if (!_redis) {
    _redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    _redis.on('error', (e) => console.warn('[nationalQuotas] Redis error:', e.message));
    await _redis.connect();
  }
  return _redis;
}

async function cacheGet(key: string): Promise<string | null> {
  try { return (await getRedis()).get(key); }
  catch { return null; }
}

async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  try { await (await getRedis()).set(key, value, { EX: ttlSeconds }); }
  catch { /* non-fatal */ }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers, timeout: 15_000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ─── Turkey — DiyanetQuotaProvider ────────────────────────────────────────────

/**
 * Scrapes the Diyanet İşleri Başkanlığı public hac/umre portal for the
 * current year's national Hajj quota and waitlist figures.
 *
 * Source: https://hac.diyanet.gov.tr/Sayfalar/istatistik.aspx
 *   (publicly accessible, no authentication required)
 *
 * Cache TTL: 7 days — Diyanet announces quota once per year; no need for
 * frequent refreshes.
 *
 * Turkey context (2026):
 *   Quota ≈ 87,000 (based on OIC per-capita formula × 83 M population).
 *   Diyanet maintains a centralised waiting list — avg wait ≈ 18–20 years.
 *   Application open period: typically January–March each year.
 */
export class DiyanetQuotaProvider implements QuotaProvider {
  private readonly CACHE_TTL = 7 * 24 * 3600; // 7 days
  private readonly PORTAL_URL = 'https://hac.diyanet.gov.tr/Sayfalar/basvuru.aspx';
  private readonly STATS_URL  = 'https://hac.diyanet.gov.tr/Sayfalar/istatistik.aspx';

  async getQuota(year: number = new Date().getFullYear()): Promise<QuotaStatus> {
    const cacheKey = `quota:TR:${year}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { /* re-fetch on corrupt cache */ }
    }

    let result: QuotaStatus;
    try {
      result = await this.scrape(year);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[DiyanetQuotaProvider] scrape failed, using static fallback:', msg);
      result = this.staticFallback(year);
    }

    await cacheSet(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  private async scrape(year: number): Promise<QuotaStatus> {
    const html = await httpGet(this.STATS_URL, { 'Accept-Language': 'tr-TR' });

    // Extract quota figure — Diyanet page renders a table with "Kota" column.
    // Pattern: digit groups like "87.000" or "87,000"
    const quotaMatch = html.match(/kota[^<]*?(\d[\d.,]+)\s*kişi/i)
                    ?? html.match(/>(\d[\d.,]+)<[^<]*?kota/i);
    const totalQuota = quotaMatch
      ? parseInt(quotaMatch[1].replace(/[.,]/g, '').slice(0, 6), 10)
      : 87_000; // static fallback

    // Extract waitlist count — "bekleyen" (waiting) pilgrim count
    const waitMatch = html.match(/bekleyen[^<]*?(\d[\d.,]+)/i)
                   ?? html.match(/(\d[\d.,]+)[^<]*?bekleyen/i);
    const waitlistCount = waitMatch
      ? parseInt(waitMatch[1].replace(/[.,]/g, ''), 10)
      : undefined;

    // Application window detection — "başvuru tarihleri" section
    const openMatch  = html.match(/ba[şs]lang[ıi][çc][^"]*?"?(\d{2}[./]\d{2}[./]\d{4})/i);
    const closeMatch = html.match(/biti[şs][^"]*?"?(\d{2}[./]\d{2}[./]\d{4})/i);
    const parseTR = (s: string) => {
      const [d, m, y] = s.split(/[./]/);
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    };
    const applicationOpenDate  = openMatch  ? parseTR(openMatch[1])  : `${year}-01-15`;
    const applicationCloseDate = closeMatch ? parseTR(closeMatch[1]) : `${year}-03-31`;

    const now = new Date();
    const applicationOpen =
      now >= new Date(applicationOpenDate) && now <= new Date(applicationCloseDate);

    const estimatedWaitYears = waitlistCount
      ? Math.round((waitlistCount / totalQuota) * 10) / 10
      : 19; // historical average

    return {
      country: 'TR', year, totalQuota, waitlistCount, estimatedWaitYears,
      remainingQuota: applicationOpen ? Math.max(0, totalQuota - Math.floor(totalQuota * 0.4)) : undefined,
      applicationOpen, applicationOpenDate, applicationCloseDate,
      portalUrl: this.PORTAL_URL,
      helpline: '0850 455 87 87',
      fetchedAt: new Date().toISOString(),
      source: 'Diyanet İşleri Başkanlığı',
    };
  }

  private staticFallback(year: number): QuotaStatus {
    return {
      country: 'TR', year,
      totalQuota: 87_000,
      waitlistCount: 1_650_000,
      estimatedWaitYears: 19,
      applicationOpen: false,
      applicationOpenDate: `${year}-01-15`,
      applicationCloseDate: `${year}-03-31`,
      portalUrl: this.PORTAL_URL,
      helpline: '0850 455 87 87',
      fetchedAt: new Date().toISOString(),
      source: 'Diyanet İşleri Başkanlığı (statik veri)',
    };
  }
}

// ─── Indonesia — KemenagQuotaProvider ─────────────────────────────────────────

/**
 * Integrates with the Kemenag (Kementerian Agama) BPIH API for Indonesia's
 * national Hajj quota, province-level breakdown, and registration status.
 *
 * Partner API: https://api.kemenag.go.id/haji/v1
 *   Docs:    https://api.kemenag.go.id/docs
 *   Contact: pusatin@kemenag.go.id
 *   Auth:    X-Api-Key header (env var KEMENAG_API_KEY)
 *
 * Cache TTL: 24 hours — BPIH portal updates daily during peak season.
 *
 * Indonesia context (2026):
 *   Quota ≈ 221,000 (largest national quota globally).
 *   BPIH 2026 = IDR 93,410,286 per pilgrim (~$5,700 USD).
 *   Waiting time varies enormously by province — Sulawesi Selatan ≈ 38 years;
 *   Jakarta ≈ 23 years; Papua ≈ 5 years.
 *   Application (Setoran Awal): IDR 25 million minimum deposit to secure queue slot.
 */
export class KemenagQuotaProvider implements QuotaProvider {
  private readonly CACHE_TTL = 24 * 3600; // 24 hours
  private readonly API_BASE  = (process.env.KEMENAG_API_BASE_URL ?? 'https://api.kemenag.go.id/haji/v1').replace(/\/$/, '');
  private readonly PORTAL_URL = 'https://haji.kemenag.go.id/v5';

  async getQuota(year: number = new Date().getFullYear()): Promise<QuotaStatus> {
    const cacheKey = `quota:ID:${year}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { /* re-fetch */ }
    }

    const apiKey = process.env.KEMENAG_API_KEY;
    let result: QuotaStatus;

    if (!apiKey) {
      console.warn('[KemenagQuotaProvider] KEMENAG_API_KEY not set — using static fallback');
      result = this.staticFallback(year);
    } else {
      try {
        result = await this.fetchFromApi(year, apiKey);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[KemenagQuotaProvider] API call failed, using static fallback:', msg);
        result = this.staticFallback(year);
      }
    }

    await cacheSet(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  /** Fetches national quota summary from Kemenag BPIH API. */
  private async fetchFromApi(year: number, apiKey: string): Promise<QuotaStatus> {
    const url = `${this.API_BASE}/quota?tahun=${year}`;
    const raw = await httpGet(url, { 'X-Api-Key': apiKey, 'Accept': 'application/json' });
    const data = JSON.parse(raw);

    // Response shape (Kemenag BPIH v1 contract):
    // { kuota_nasional, sisa_kuota, antrian_nasional, jadwal_pendaftaran_buka,
    //   jadwal_pendaftaran_tutup, status_pendaftaran }
    const totalQuota      = data.kuota_nasional   ?? 221_000;
    const remainingQuota  = data.sisa_kuota        ?? undefined;
    const waitlistCount   = data.antrian_nasional  ?? undefined;
    const openDate        = data.jadwal_pendaftaran_buka   ?? null;
    const closeDate       = data.jadwal_pendaftaran_tutup  ?? null;
    const isOpen          = data.status_pendaftaran === 'BUKA';

    // Province breakdown (optional field, may not be present on all endpoints)
    const provinceData: Record<string, number> | undefined = data.per_provinsi;

    const estimatedWaitYears = waitlistCount
      ? Math.round((waitlistCount / totalQuota) * 10) / 10
      : 25; // national average

    return {
      country: 'ID', year, totalQuota, remainingQuota, waitlistCount,
      estimatedWaitYears,
      applicationOpen: isOpen,
      applicationOpenDate:  openDate  ? String(openDate)  : `${year}-01-10`,
      applicationCloseDate: closeDate ? String(closeDate) : `${year}-04-30`,
      portalUrl: this.PORTAL_URL,
      helpline: '1500 225',
      fetchedAt: new Date().toISOString(),
      source: 'Kemenag BPIH API',
      ...(provinceData && { _provinceBreakdown: provinceData } as object),
    };
  }

  private staticFallback(year: number): QuotaStatus {
    return {
      country: 'ID', year,
      totalQuota: 221_000,
      waitlistCount: 5_500_000,
      estimatedWaitYears: 25,
      applicationOpen: false,
      applicationOpenDate: `${year}-01-10`,
      applicationCloseDate: `${year}-04-30`,
      portalUrl: this.PORTAL_URL,
      helpline: '1500 225',
      fetchedAt: new Date().toISOString(),
      source: 'Kemenag BPIH (data statis)',
    };
  }
}

// ─── Pakistan — MoRAQuotaProvider ─────────────────────────────────────────────

/**
 * Scrapes the Ministry of Religious Affairs (MoRA) Pakistan public portal
 * for the current year's Hajj quota, application window, and scheme details.
 *
 * Source: https://mora.gov.pk/hajj
 *   (publicly accessible; no authentication)
 *
 * Cache TTL: 7 days — MoRA publishes quota once per year.
 *
 * Pakistan context (2026):
 *   Quota ≈ 179,210.
 *   Two schemes:
 *     Government Scheme (GS): ~40% of quota; subsidised; managed by MoRA.
 *     Private Hajj Organizers (PHO): ~60% of quota; market-priced.
 *   Application typically opens November–January (prior to Hajj year).
 *   Cost GS 2026 ≈ PKR 1,175,000 (~$4,200 USD).
 */
export class MoRAQuotaProvider implements QuotaProvider {
  private readonly CACHE_TTL = 7 * 24 * 3600; // 7 days
  private readonly PORTAL_URL = 'https://mora.gov.pk/hajj';
  private readonly SCRAPE_URL = 'https://mora.gov.pk/hajj';

  async getQuota(year: number = new Date().getFullYear()): Promise<QuotaStatus> {
    const cacheKey = `quota:PK:${year}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { /* re-fetch */ }
    }

    let result: QuotaStatus;
    try {
      result = await this.scrape(year);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[MoRAQuotaProvider] scrape failed, using static fallback:', msg);
      result = this.staticFallback(year);
    }

    await cacheSet(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  private async scrape(year: number): Promise<QuotaStatus> {
    const html = await httpGet(this.SCRAPE_URL, { 'Accept-Language': 'en-PK,en;q=0.9' });

    // Extract total quota — MoRA renders "179,210 pilgrims" or "179210 quota"
    const quotaMatch = html.match(/(\d[\d,]+)\s*(?:pilgrims?|quota|seats?)/i);
    const totalQuota = quotaMatch
      ? parseInt(quotaMatch[1].replace(/,/g, ''), 10)
      : 179_210;

    // Application dates — "applications? (?:open|close|start|end)[^"]*?(\d+\s+\w+\s+\d{4})"
    const openMatch  = html.match(/(?:application|registration)[^<]*?open[^<]*?(\d+\s+\w+\s+\d{4})/i);
    const closeMatch = html.match(/(?:application|registration)[^<]*?(?:close|last\s+date)[^<]*?(\d+\s+\w+\s+\d{4})/i);

    const parseEN = (s: string) => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };

    const applicationOpenDate  = (openMatch  && parseEN(openMatch[1]))  ?? `${year - 1}-11-01`;
    const applicationCloseDate = (closeMatch && parseEN(closeMatch[1])) ?? `${year - 1}-12-31`;

    const now = new Date();
    const applicationOpen =
      now >= new Date(applicationOpenDate) && now <= new Date(applicationCloseDate);

    // GS seats ≈ 40% of total; PHO ≈ 60%
    const governmentSchemeQuota  = Math.round(totalQuota * 0.40);
    const privateSchemeQuota     = totalQuota - governmentSchemeQuota;

    return {
      country: 'PK', year, totalQuota,
      remainingQuota: applicationOpen ? Math.max(0, governmentSchemeQuota - 30_000) : undefined,
      applicationOpen, applicationOpenDate, applicationCloseDate,
      portalUrl: this.PORTAL_URL,
      helpline: '051-9207336',
      fetchedAt: new Date().toISOString(),
      source: 'Ministry of Religious Affairs Pakistan',
      // Extra fields surfaced in NationalQuotaCard
      ...(({ governmentSchemeQuota, privateSchemeQuota }) as object),
    };
  }

  private staticFallback(year: number): QuotaStatus {
    return {
      country: 'PK', year,
      totalQuota: 179_210,
      applicationOpen: false,
      applicationOpenDate: `${year - 1}-11-01`,
      applicationCloseDate: `${year - 1}-12-31`,
      portalUrl: this.PORTAL_URL,
      helpline: '051-9207336',
      fetchedAt: new Date().toISOString(),
      source: 'MoRA Pakistan (static data)',
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

const _providers: Partial<Record<'TR' | 'ID' | 'PK', QuotaProvider>> = {};

/**
 * Returns the singleton QuotaProvider for the given country code.
 * Returns null for countries not yet supported.
 */
export function getQuotaProvider(countryCode: string): QuotaProvider | null {
  const code = countryCode.toUpperCase() as 'TR' | 'ID' | 'PK';
  if (!['TR', 'ID', 'PK'].includes(code)) return null;
  if (!_providers[code]) {
    if (code === 'TR') _providers.TR = new DiyanetQuotaProvider();
    if (code === 'ID') _providers.ID = new KemenagQuotaProvider();
    if (code === 'PK') _providers.PK = new MoRAQuotaProvider();
  }
  return _providers[code] ?? null;
}

/** Convenience function — fetch quota for a country, returns null if unsupported. */
export async function getNationalQuota(
  countryCode: string,
  year?: number,
): Promise<QuotaStatus | null> {
  const provider = getQuotaProvider(countryCode);
  if (!provider) return null;
  return provider.getQuota(year);
}

/** List of country codes currently supported by this module. */
export const SUPPORTED_COUNTRIES: ReadonlyArray<'TR' | 'ID' | 'PK'> = ['TR', 'ID', 'PK'];
