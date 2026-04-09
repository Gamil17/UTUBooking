'use client';

/**
 * NationalQuotaCard
 *
 * Displays the current national Hajj quota status for the user's country
 * (Turkey, Indonesia, or Pakistan). Automatically loads the correct language
 * (TR → Turkish, ID → Indonesian, PK/UR → Urdu) via next-intl.
 *
 * Data is fetched from POST /api/hajj/national-quota.
 * The component is a no-op for countries outside TR / ID / PK.
 *
 * Usage:
 *   <NationalQuotaCard countryCode="TR" />
 *   <NationalQuotaCard countryCode="ID" locale="id" />
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// ─── Types (mirrors backend QuotaStatus) ──────────────────────────────────────

interface QuotaStatus {
  country: 'TR' | 'ID' | 'PK';
  year: number;
  totalQuota: number;
  remainingQuota?: number;
  waitlistCount?: number;
  estimatedWaitYears?: number;
  applicationOpen: boolean;
  applicationOpenDate?: string;
  applicationCloseDate?: string;
  portalUrl: string;
  helpline?: string;
  fetchedAt: string;
  source: string;
}

// ─── Brand constants ──────────────────────────────────────────────────────────

const BRAND_GREEN   = '#10B981';
const BRAND_DARK    = '#111827';
const GRAY          = '#6B7280';
const BORDER        = '#E5E7EB';
const BG_CARD       = '#F9FAFB';
const OPEN_BG       = '#D1FAE5';
const OPEN_TEXT     = '#065F46';
const CLOSED_BG     = '#FEE2E2';
const CLOSED_TEXT   = '#991B1B';

// Country-specific accent colours
const COUNTRY_ACCENT: Record<string, string> = {
  TR: '#E30A17', // Turkish red
  ID: '#CE1126', // Indonesian red
  PK: '#01411C', // Pakistani green
};

// ─── Supported countries ──────────────────────────────────────────────────────

const SUPPORTED = new Set(['TR', 'ID', 'PK']);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  countryCode: string;
  /** Optional override for the year (defaults to current year). */
  year?: number;
  /** Optional CSS class name for the outer wrapper. */
  className?: string;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function NationalQuotaCard({ countryCode, year, className }: Props) {
  const t = useTranslations('quota');
  const code = countryCode.toUpperCase();

  const [state, setState]   = useState<LoadState>('idle');
  const [data, setData]     = useState<QuotaStatus | null>(null);
  const [, setErrMsg] = useState<string>('');

  const fetchQuota = useCallback(async () => {
    setState('loading');
    setErrMsg('');
    try {
      const res = await fetch('/api/hajj/national-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: code, year }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const json: QuotaStatus = await res.json();
      setData(json);
      setState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrMsg(msg);
      setState('error');
    }
  }, [code, year]);

  useEffect(() => {
    if (!SUPPORTED.has(code)) return;
    fetchQuota();
  }, [code, fetchQuota]);

  // ── Not supported for this country ──────────────────────────────────────────
  if (!SUPPORTED.has(code)) return null;

  const accent = COUNTRY_ACCENT[code] ?? BRAND_GREEN;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'idle' || state === 'loading') {
    return (
      <div
        style={styles.card}
        className={className}
        role="status"
        aria-label={t('loading')}
      >
        <div style={{ ...styles.header, borderLeftColor: accent }}>
          <span style={styles.title}>{t('title')}</span>
        </div>
        <div style={styles.loadingRow}>
          <span style={styles.loadingDot} />
          <span style={{ color: GRAY, fontSize: 14 }}>{t('loading')}</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div style={styles.card} className={className} role="alert">
        <div style={{ ...styles.header, borderLeftColor: accent }}>
          <span style={styles.title}>{t('title')}</span>
        </div>
        <p style={{ color: CLOSED_TEXT, fontSize: 14, margin: '12px 0 8px' }}>
          {t('error')}
        </p>
        <button
          style={styles.retryBtn}
          onClick={fetchQuota}
          aria-label={t('retry')}
          type="button"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (!data) return null;

  const appBadgeBg   = data.applicationOpen ? OPEN_BG    : CLOSED_BG;
  const appBadgeText = data.applicationOpen ? OPEN_TEXT  : CLOSED_TEXT;
  const appLabel     = data.applicationOpen ? t('applicationOpen') : t('applicationClosed');

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div
      style={{ ...styles.card, borderTopColor: accent }}
      className={className}
      role="region"
      aria-label={`${t('title')} — ${data.country}`}
    >
      {/* Header */}
      <div style={{ ...styles.header, borderLeftColor: accent }}>
        <span style={styles.title}>{t('title')}</span>
        <span
          style={{
            ...styles.badge,
            backgroundColor: appBadgeBg,
            color: appBadgeText,
          }}
          aria-live="polite"
        >
          {appLabel}
        </span>
      </div>

      {/* Year + source */}
      <p style={styles.sourceText}>
        {t('year', { year: data.year })} · {data.source}
      </p>

      {/* Quota stats grid */}
      <div style={styles.statsGrid}>
        <StatBox
          label={t('totalQuota')}
          value={fmt(data.totalQuota)}
          accent={accent}
        />
        {data.remainingQuota !== undefined && (
          <StatBox
            label={t('remaining')}
            value={fmt(data.remainingQuota)}
            accent={BRAND_GREEN}
          />
        )}
        {data.waitlistCount !== undefined && (
          <StatBox
            label={t('waitlist')}
            value={fmt(data.waitlistCount)}
            accent={GRAY}
          />
        )}
        {data.estimatedWaitYears !== undefined && (
          <StatBox
            label={t('estimatedWait')}
            value={t('waitYears', { years: data.estimatedWaitYears })}
            accent={GRAY}
          />
        )}
      </div>

      {/* Application window */}
      {(data.applicationOpenDate || data.applicationCloseDate) && (
        <div style={styles.dateRow}>
          <span style={styles.dateLabel}>{t('applicationWindow')}</span>
          <span style={styles.dateValue}>
            {data.applicationOpenDate
              ? new Date(data.applicationOpenDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
            {' → '}
            {data.applicationCloseDate
              ? new Date(data.applicationCloseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </span>
        </div>
      )}

      {/* Helpline */}
      {data.helpline && (
        <div style={styles.helplineRow}>
          <span style={styles.dateLabel}>{t('helpline')}</span>
          <a
            href={`tel:${data.helpline.replace(/\s/g, '')}`}
            style={{ color: accent, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
            aria-label={`${t('helpline')}: ${data.helpline}`}
          >
            {data.helpline}
          </a>
        </div>
      )}

      {/* CTA — official portal */}
      <a
        href={data.portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...styles.portalBtn, backgroundColor: accent }}
        aria-label={t('portalLinkAriaLabel')}
      >
        {t('portalLink')}
      </a>

      {/* Footer — data freshness */}
      <p style={styles.footer}>
        {t('dataFreshness', {
          date: new Date(data.fetchedAt).toLocaleDateString(undefined, {
            day: 'numeric', month: 'short', year: 'numeric',
          }),
        })}
      </p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={styles.statBox} role="figure" aria-label={`${label}: ${value}`}>
      <span style={{ ...styles.statValue, color: accent }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  card: {
    backgroundColor: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderTop: `4px solid ${BRAND_GREEN}`,
    borderRadius: 12,
    padding: '20px 20px 16px',
    maxWidth: 480,
    width: '100%',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 10,
    borderLeft: `4px solid ${BRAND_GREEN}`,
    marginBottom: 4,
  } as React.CSSProperties,

  title: {
    fontSize: 16,
    fontWeight: 700,
    color: BRAND_DARK,
  } as React.CSSProperties,

  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
  } as React.CSSProperties,

  sourceText: {
    fontSize: 12,
    color: GRAY,
    margin: '4px 0 14px',
  } as React.CSSProperties,

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10,
    marginBottom: 14,
  } as React.CSSProperties,

  statBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    padding: '10px 12px',
    backgroundColor: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
  } as React.CSSProperties,

  statValue: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
  } as React.CSSProperties,

  statLabel: {
    fontSize: 11,
    color: GRAY,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  dateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap' as const,
    gap: 4,
  } as React.CSSProperties,

  helplineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  } as React.CSSProperties,

  dateLabel: {
    fontSize: 13,
    color: GRAY,
  } as React.CSSProperties,

  dateValue: {
    fontSize: 13,
    fontWeight: 600,
    color: BRAND_DARK,
  } as React.CSSProperties,

  portalBtn: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '12px 20px',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    minHeight: 44,
    lineHeight: '20px',
    marginTop: 4,
    marginBottom: 12,
  } as React.CSSProperties,

  retryBtn: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    borderRadius: 8,
    backgroundColor: BRAND_GREEN,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer',
    minHeight: 44,
  } as React.CSSProperties,

  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 0',
  } as React.CSSProperties,

  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: BRAND_GREEN,
    animation: 'pulse 1.4s ease-in-out infinite',
  } as React.CSSProperties,

  footer: {
    fontSize: 11,
    color: '#9CA3AF',
    margin: 0,
    textAlign: 'right' as const,
  } as React.CSSProperties,
} as const;
