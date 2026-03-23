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
import { useTenant } from '@/components/TenantProvider';

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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; labelMs: string; color: string }> = {
  REGISTERED:      { label: 'Registered',     labelMs: 'Berdaftar',       color: '#2563eb' },
  CONFIRMED:       { label: 'Confirmed',       labelMs: 'Disahkan',        color: TH_GREEN },
  ACTIVE:          { label: 'On Hajj',         labelMs: 'Dalam Haji',      color: '#7c3aed' },
  COMPLETED:       { label: 'Mabrur',          labelMs: 'Mabrur',          color: '#6b7280' },
  SUSPENDED:       { label: 'Suspended',       labelMs: 'Digantung',       color: '#dc2626' },
  NOT_REGISTERED:  { label: 'Not Registered',  labelMs: 'Belum Berdaftar', color: '#d97706' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, labelMs: status, color: '#6b7280' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: s.color }}
    >
      {s.labelMs} / {s.label}
    </span>
  );
}

// ─── Crescent moon icon (TH brand motif) ─────────────────────────────────────

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

  // Don't render outside MY/ms context
  if (!shouldShow(locale, countryCode)) return null;

  return <TabungHajiWidgetInner countryCode={countryCode} bookingId={bookingId} />;
}

// Inner component — avoids conditional hook calls above
function TabungHajiWidgetInner({ bookingId }: Omit<Props, 'countryCode'>) {
  const [icInput,    setIcInput]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [balance,    setBalance]    = useState<THBalance | null>(null);
  const [status,     setStatus]     = useState<THHajjStatus | null>(null);
  const [linked,     setLinked]     = useState(false);
  const [linkLoading,setLinkLoading]= useState(false);
  const [linkMsg,    setLinkMsg]    = useState<string | null>(null);

  // ── Fetch both balance + status in parallel ──────────────────────────────
  const handleCheck = useCallback(async () => {
    const ic = normaliseIc(icInput);

    if (!isValidIc(ic)) {
      setError('Sila masukkan nombor IC yang sah (12 digit). / Please enter a valid 12-digit IC number.');
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

      // If either is 404, the IC isn't registered with TH
      if (balRes.status === 404 || stRes.status === 404) {
        setError('Nombor IC ini tidak dijumpai dalam sistem Tabung Haji. / This IC number was not found in the Tabung Haji system.');
        return;
      }

      if (!balRes.ok || !stRes.ok) {
        const errBody = await (balRes.ok ? stRes : balRes).json() as { error?: string };
        setError(errBody.error ?? 'Ralat tidak dijangka. Sila cuba lagi. / Unexpected error. Please try again.');
        return;
      }

      const [balData, stData] = await Promise.all([
        balRes.json() as Promise<THBalance>,
        stRes.json()  as Promise<THHajjStatus>,
      ]);

      setBalance(balData);
      setStatus(stData);
    } catch {
      setError('Tidak dapat menghubungi Tabung Haji. Sila cuba lagi. / Could not reach Tabung Haji. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [icInput]);

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
        setLinkMsg(data.message ?? 'Berjaya dikaitkan! / Successfully linked!');
      } else {
        setLinkMsg(data.error ?? 'Gagal mengaitkan. Sila cuba lagi. / Link failed. Please try again.');
      }
    } catch {
      setLinkMsg('Ralat rangkaian. Sila cuba lagi. / Network error. Please try again.');
    } finally {
      setLinkLoading(false);
    }
  }, [icInput, bookingId]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${TH_GREEN}33` }}
      role="region"
      aria-label="Tabung Haji — semak baki dan status Haji"
    >

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: TH_GREEN }}
      >
        <CrescentIcon className="w-7 h-7 text-white flex-shrink-0" />
        <div>
          <h3 className="text-white font-bold text-base leading-tight">
            Tabung Haji
          </h3>
          <p className="text-white/80 text-xs">
            Semak baki &amp; status Haji anda · Check TH balance &amp; Hajj status
          </p>
        </div>
        <div
          className="ms-auto text-xs font-black px-2 py-1 rounded"
          style={{ backgroundColor: TH_YELLOW, color: TH_GREEN }}
        >
          MY
        </div>
      </div>

      <div className="bg-white p-5 space-y-4">

        {/* ── IC Input ────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label
            htmlFor="th-ic-input"
            className="block text-xs font-semibold text-gray-600 uppercase tracking-wide"
          >
            Nombor IC (MyKad) / IC Number
          </label>
          <div className="flex gap-2">
            <input
              id="th-ic-input"
              type="text"
              inputMode="numeric"
              maxLength={14}
              placeholder="e.g. 900101-14-5678"
              value={icInput}
              onChange={(e) => {
                setIcInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': TH_GREEN } as React.CSSProperties}
              aria-label="Nombor IC MyKad — 12 digit"
              aria-describedby="th-ic-hint"
              disabled={loading}
            />
            <button
              onClick={handleCheck}
              disabled={loading || !icInput.trim()}
              className="flex-shrink-0 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity disabled:opacity-40 flex items-center gap-2"
              style={{ backgroundColor: TH_GREEN, minHeight: 44 }}
              aria-label="Semak maklumat Tabung Haji"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              )}
              Semak
            </button>
          </div>
          <p id="th-ic-hint" className="text-xs text-gray-400">
            12 digit nombor MyKad anda (dengan atau tanpa sempang) · Your 12-digit MyKad number (hyphens optional)
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
                  <p className="text-xs text-gray-500 mb-0.5">Baki Tabung Haji / TH Balance</p>
                  <p className="text-2xl font-black" style={{ color: TH_GREEN }}>
                    {formatMyr(balance.balanceMYR)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-1">
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
                        Mencukupi / Sufficient
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Kurang ({formatMyr(balance.requiredAmountMYR - balance.balanceMYR)} lagi)
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Akaun TH: <span className="font-mono">{balance.accountNumber}</span>
                {' '}· Dikemas kini: {new Date(balance.lastUpdated).toLocaleDateString('ms-MY')}
              </p>
            </div>

            {/* Hajj status card */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status Haji / Hajj Status
                </p>
                <StatusBadge status={status.registrationStatus} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {status.queueNumber !== null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Nombor Giliran</p>
                    <p className="text-lg font-black text-gray-900">
                      {status.queueNumber.toLocaleString('ms-MY')}
                    </p>
                  </div>
                )}

                {status.estimatedDepartureYear && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Anggaran Tahun Berlepas</p>
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

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                {status.stateName && (
                  <span>Negeri: {status.stateName}</span>
                )}
                {status.registrationDate && (
                  <span>
                    Tarikh daftar: {new Date(status.registrationDate).toLocaleDateString('ms-MY')}
                  </span>
                )}
                {status.lastHajjYear && (
                  <span>Haji terakhir: {status.lastHajjYear}</span>
                )}
              </div>
            </div>

            {/* Link booking section */}
            {bookingId && status.registrationStatus !== 'NOT_REGISTERED' && !linked && (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Kaitkan tempahan dengan akaun TH anda
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Link your UTUBooking reservation ({bookingId}) to your Tabung Haji account.
                    TH will record your accommodation arrangements.
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
                  aria-label={`Kaitkan tempahan ${bookingId} dengan Tabung Haji`}
                >
                  {linkLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Mengaitkan…
                    </span>
                  ) : (
                    'Kaitkan Tempahan / Link Booking'
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
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-3">
          🔒 Nombor IC anda diproses secara selamat dan tidak disimpan.
          Data Tabung Haji dipaparkan mengikut PDPA Malaysia.
          {' · '}
          Your IC is processed securely and not stored.
        </p>

      </div>
    </div>
  );
}
