'use client';

/**
 * TabungHajiWidget
 *
 * Shown only when locale = 'ms' / 'ms-MY' OR country code = 'MY'.
 * Allows Malaysian pilgrims to check their Tabung Haji savings balance,
 * Hajj queue position, and estimated departure year — and optionally
 * link their UTUBooking reservation to their TH account.
 *
 * Accent color: Malaysian green #00853F (matching TH official brand).
 * Secondary:    Malaysian yellow #FECB00 (optional highlights).
 *
 * Privacy: IC numbers are never stored client-side beyond the current session.
 * The API proxy masks ICs in responses (only last 4 digits shown).
 *
 * Usage:
 *   <TabungHajiWidget countryCode={countryCode} bookingId="UTU-XXXXX" />
 *
 * Props:
 *   countryCode  — ISO 3166-1 alpha-2 from middleware (CF-IPCountry / Vercel)
 *   bookingId?   — if set, shows "Link to TH" button after balance check
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useTenant } from '@/contexts/TenantContext';

// ─── Brand constants ──────────────────────────────────────────────────────────

const TH_GREEN  = '#00853F';
const TH_YELLOW = '#FECB00';

// ─── Types ────────────────────────────────────────────────────────────────────

interface THBalance {
  icNumber:          string;
  accountNumber:     string;
  balanceMYR:        number;
  requiredAmountMYR: number;
  isSufficient:      boolean;
  lastUpdated:       string;
}

interface THHajjStatus {
  icNumber:               string;
  registrationStatus:     string;
  queueNumber:            number | null;
  stateName:              string | null;
  estimatedDepartureYear: number | null;
  estimatedDeparturePhase:string | null;
  registrationDate:       string | null;
  lastHajjYear:           number | null;
}

interface Props {
  countryCode?: string;
  bookingId?:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMyr(amount: number) {
  return `RM ${amount.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isMyLocale(locale: string) {
  return locale === 'ms' || locale.startsWith('ms-');
}

function shouldShow(locale: string, countryCode?: string) {
  return isMyLocale(locale) || countryCode === 'MY';
}

function normaliseIc(raw: string) {
  return raw.replace(/[-\s]/g, '');
}

function isValidIc(ic: string) {
  return /^\d{12}$/.test(normaliseIc(ic));
}

// ─── Status constants ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  REGISTERED:     '#2563eb',
  CONFIRMED:      TH_GREEN,
  ACTIVE:         '#7c3aed',
  COMPLETED:      '#6b7280',
  SUSPENDED:      '#dc2626',
  NOT_REGISTERED: '#d97706',
};

const VALID_STATUSES = ['REGISTERED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'NOT_REGISTERED'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function CrescentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 0010 9.79z" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TabungHajiWidget({ countryCode, bookingId }: Props) {
  const { locale } = useTenant();

  if (!shouldShow(locale, countryCode)) return null;

  return <TabungHajiWidgetInner bookingId={bookingId} />;
}

// Inner component — avoids conditional hook calls above
function TabungHajiWidgetInner({ bookingId }: Omit<Props, 'countryCode'>) {
  const t = useTranslations('hajj');

  const [icInput,    setIcInput]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [balance,    setBalance]    = useState<THBalance | null>(null);
  const [status,     setStatus]     = useState<THHajjStatus | null>(null);
  const [linked,     setLinked]     = useState(false);
  const [linkLoading,setLinkLoading]= useState(false);
  const [linkMsg,    setLinkMsg]    = useState<string | null>(null);

  // Helper: resolve status label from translation keys
  const getStatusLabel = useCallback((statusKey: string): string => {
    if ((VALID_STATUSES as readonly string[]).includes(statusKey)) {
      return t(`statuses.${statusKey as ValidStatus}`);
    }
    return statusKey;
  }, [t]);

  // ── Fetch both balance + status in parallel ──────────────────────────────
  const handleCheck = useCallback(async () => {
    const ic = normaliseIc(icInput);

    if (!isValidIc(ic)) {
      setError(t('invalidIc'));
      return;
    }

    setLoading(true);
    setError(null);
    setBalance(null);
    setStatus(null);
    setLinked(false);
    setLinkMsg(null);

    try {
      const [balRes, stRes] = await Promise.all([
        fetch('/api/hajj/tabung-haji', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'checkBalance', icNumber: ic }),
        }),
        fetch('/api/hajj/tabung-haji', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'getHajjStatus', icNumber: ic }),
        }),
      ]);

      if (balRes.status === 404 || stRes.status === 404) {
        setError(t('notFound'));
        return;
      }

      if (!balRes.ok || !stRes.ok) {
        const errBody = await (balRes.ok ? stRes : balRes).json() as { error?: string };
        setError(errBody.error ?? t('errorGeneric'));
        return;
      }

      const [balData, stData] = await Promise.all([
        balRes.json() as Promise<THBalance>,
        stRes.json()  as Promise<THHajjStatus>,
      ]);

      setBalance(balData);
      setStatus(stData);
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  }, [icInput, t]);

  // ── Link booking to TH account ─────────────────────────────────────────
  const handleLink = useCallback(async () => {
    if (!bookingId) return;
    const ic = normaliseIc(icInput);
    setLinkLoading(true);
    setLinkMsg(null);

    try {
      const res  = await fetch('/api/hajj/tabung-haji', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'linkBooking', icNumber: ic, bookingId }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };

      if (res.ok && data.success) {
        setLinked(true);
        setLinkMsg(data.message ?? t('linkedSuccess'));
      } else {
        setLinkMsg(data.error ?? t('linkError'));
      }
    } catch {
      setLinkMsg(t('linkNetworkError'));
    } finally {
      setLinkLoading(false);
    }
  }, [icInput, bookingId, t]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${TH_GREEN}33` }}
      role="region"
      aria-label={t('widgetTitle')}
    >

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: TH_GREEN }}
      >
        <CrescentIcon className="w-7 h-7 text-white flex-shrink-0" />
        <div>
          <h3 className="text-white font-bold text-base leading-tight">
            {t('widgetTitle')}
          </h3>
          <p className="text-white/80 text-xs">
            {t('widgetSubtitle')}
          </p>
        </div>
        <div
          className="ms-auto text-xs font-black px-2 py-1 rounded"
          style={{ backgroundColor: TH_YELLOW, color: TH_GREEN }}
        >
          MY
        </div>
      </div>

      <div className="bg-utu-bg-card p-5 space-y-4">

        {/* ── IC Input ────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label
            htmlFor="th-ic-input"
            className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide"
          >
            {t('icLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="th-ic-input"
              type="text"
              inputMode="numeric"
              maxLength={14}
              placeholder={t('icPlaceholder')}
              value={icInput}
              onChange={(e) => {
                setIcInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
              className="flex-1 border border-utu-border-default rounded-xl px-3 py-2.5 text-sm font-mono text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': TH_GREEN } as React.CSSProperties}
              aria-label={t('icLabel')}
              aria-describedby="th-ic-hint"
              disabled={loading}
            />
            <button
              onClick={handleCheck}
              disabled={loading || !icInput.trim()}
              className="flex-shrink-0 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity disabled:opacity-40 flex items-center gap-2"
              style={{ backgroundColor: TH_GREEN, minHeight: 44 }}
              aria-label={t('checkBtn')}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              )}
              {t('checkBtn')}
            </button>
          </div>
          <p id="th-ic-hint" className="text-xs text-utu-text-muted">
            {t('icHint')}
          </p>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {balance && status && (
          <div className="space-y-3">

            {/* Balance card */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: `${TH_GREEN}0d`, border: `1px solid ${TH_GREEN}33` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-utu-text-muted mb-0.5">{t('balanceLabel')}</p>
                  <p className="text-2xl font-black" style={{ color: TH_GREEN }}>
                    {formatMyr(balance.balanceMYR)}
                  </p>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="text-xs text-utu-text-muted mb-1">
                    IC: <span className="font-mono">{balance.icNumber}</span>
                  </p>
                  <div
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                    style={
                      balance.isSufficient
                        ? { backgroundColor: `${TH_GREEN}22`, color: TH_GREEN }
                        : { backgroundColor: '#fef3c7', color: '#d97706' }
                    }
                  >
                    {balance.isSufficient ? (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('sufficient')}
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {t('insufficient')} ({formatMyr(balance.requiredAmountMYR - balance.balanceMYR)} lagi)
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-utu-text-muted">
                {t('accountLabel')}: <span className="font-mono">{balance.accountNumber}</span>
                {' '}· {t('updatedLabel')}: {new Date(balance.lastUpdated).toLocaleDateString('ms-MY')}
              </p>
            </div>

            {/* Hajj status card */}
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide">
                  {t('statusLabel')}
                </p>
                <StatusBadge
                  label={getStatusLabel(status.registrationStatus)}
                  color={STATUS_COLORS[status.registrationStatus] ?? '#6b7280'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {status.queueNumber !== null && (
                  <div>
                    <p className="text-xs text-utu-text-muted mb-0.5">{t('queueLabel')}</p>
                    <p className="text-lg font-black text-utu-text-primary">
                      {status.queueNumber.toLocaleString('ms-MY')}
                    </p>
                  </div>
                )}

                {status.estimatedDepartureYear && (
                  <div>
                    <p className="text-xs text-utu-text-muted mb-0.5">{t('departureLabel')}</p>
                    <p
                      className="text-lg font-black"
                      style={{ color: TH_GREEN }}
                    >
                      {status.estimatedDepartureYear}
                    </p>
                  </div>
                )}
              </div>

              {status.estimatedDeparturePhase && (
                <div
                  className="rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: `${TH_YELLOW}33`, color: '#92400e' }}
                >
                  🕌 {status.estimatedDeparturePhase}
                </div>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-utu-text-muted">
                {status.stateName && (
                  <span>{t('stateLabel')}: {status.stateName}</span>
                )}
                {status.registrationDate && (
                  <span>
                    {t('registrationDateLabel')}: {new Date(status.registrationDate).toLocaleDateString('ms-MY')}
                  </span>
                )}
                {status.lastHajjYear && (
                  <span>{t('lastHajjLabel')}: {status.lastHajjYear}</span>
                )}
              </div>
            </div>

            {/* Link booking section */}
            {bookingId && status.registrationStatus !== 'NOT_REGISTERED' && !linked && (
              <div className="rounded-xl border border-dashed border-utu-border-default p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-utu-text-primary">
                    {t('linkTitle')}
                  </p>
                  <p className="text-xs text-utu-text-muted mt-0.5">
                    {t('linkDesc')}
                  </p>
                </div>
                <button
                  onClick={handleLink}
                  disabled={linkLoading}
                  className="w-full text-sm font-semibold py-2.5 rounded-xl border-2 transition-all disabled:opacity-40"
                  style={{
                    borderColor: TH_GREEN,
                    color:       TH_GREEN,
                    minHeight:   44,
                  }}
                  aria-label={`${t('linkBtn')} ${bookingId}`}
                >
                  {linkLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      {t('linking')}
                    </span>
                  ) : (
                    t('linkBtn')
                  )}
                </button>
              </div>
            )}

            {/* Link result */}
            {linkMsg && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={
                  linked
                    ? { backgroundColor: `${TH_GREEN}11`, color: TH_GREEN }
                    : { backgroundColor: '#fef2f2', color: '#dc2626' }
                }
                role="status"
              >
                {linked && (
                  <svg className="inline w-4 h-4 me-1.5 -mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {linkMsg}
              </div>
            )}

          </div>
        )}

        {/* ── Privacy notice ────────────────────────────────────────────── */}
        <p className="text-xs text-utu-text-muted border-t border-utu-border-default pt-3">
          🔒 {t('privacyNote')}
        </p>

      </div>
    </div>
  );
}
