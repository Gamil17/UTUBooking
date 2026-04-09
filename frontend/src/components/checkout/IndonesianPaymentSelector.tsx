'use client';

/**
 * IndonesianPaymentSelector
 *
 * Full-page checkout payment component for locale='id' / country='ID'.
 * Supports: GoPay · ShopeePay · QRIS · Bank Transfer VA (BCA/BNI/BRI) · Mandiri VA
 *
 * Flow:
 *   1. Customer selects a payment method (and bank if bank_transfer)
 *   2. POST /api/payments/midtrans/charge  → initiates charge
 *   3. Renders method-specific payment instructions:
 *        GoPay/ShopeePay → deeplink button + QR image
 *        QRIS            → QR image (base64 or CDN URL) + qrString
 *        Bank Transfer   → VA number + expiry
 *        Mandiri VA      → biller code + bill key + expiry
 *   4. "Cek Status" button polls GET /api/payments/midtrans/status/:orderId
 *      until completed | failed | timeout (2-minute window, 5s interval)
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentType = 'gopay' | 'shopeepay' | 'qris' | 'bank_transfer' | 'mandiri_va';
type BankCode    = 'bca' | 'bni' | 'bri';
type PayStatus   = 'idle' | 'loading' | 'pending' | 'completed' | 'failed';

interface ChargeResult {
  paymentId:   string;
  orderId:     string;
  paymentType: string;
  status:      string;
  grossAmount: number;
  currency:    string;
  // GoPay / ShopeePay
  deeplinkUrl?: string | null;
  qrUrl?:       string | null;
  // QRIS
  qrBase64?:    string | null;
  qrString?:    string | null;
  expiryTime?:  string | null;
  // Bank Transfer
  bank?:        string;
  vaNumber?:    string | null;
  // Mandiri
  billerCode?:  string | null;
  billKey?:     string | null;
}

interface Props {
  bookingId:     string;
  amountIdr:     number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (orderId: string) => void;
  onError?:   (msg: string)    => void;
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

const WalletIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1" />
    <path d="M23 13v-2a2 2 0 00-2-2h-6a2 2 0 00-2 2v2a2 2 0 002 2h6a2 2 0 002-2z" />
    <circle cx="17" cy="12" r="1" />
  </svg>
);

const QrIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="2"  y="2"  width="8" height="8" rx="1.5" />
    <rect x="14" y="2"  width="8" height="8" rx="1.5" />
    <rect x="2"  y="14" width="8" height="8" rx="1.5" />
    <rect x="4"  y="4"  width="4" height="4" fill="white" />
    <rect x="16" y="4"  width="4" height="4" fill="white" />
    <rect x="4"  y="16" width="4" height="4" fill="white" />
    <rect x="14" y="14" width="3" height="3" />
    <rect x="19" y="14" width="3" height="3" />
    <rect x="14" y="19" width="8" height="3" />
  </svg>
);

const BankIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" />
  </svg>
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatIdr(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatExpiry(raw: string | null | undefined) {
  if (!raw) return null;
  return raw.replace('T', ' ').replace('.000Z', ' WIB');
}

const BANKS: { code: BankCode; label: string; color: string }[] = [
  { code: 'bca', label: 'BCA',  color: '#005DAA' },
  { code: 'bni', label: 'BNI',  color: '#F47920' },
  { code: 'bri', label: 'BRI',  color: '#003D7A' },
];

// ─── Main component ────────────────────────────────────────────────────────────

export default function IndonesianPaymentSelector({
  bookingId,
  amountIdr,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
}: Props) {
  const t = useTranslations('idPayment');

  const [selected,   setSelected]   = useState<PaymentType | null>(null);
  const [bank,       setBank]       = useState<BankCode>('bca');
  const [payStatus,  setPayStatus]  = useState<PayStatus>('idle');
  const [result,     setResult]     = useState<ChargeResult | null>(null);
  const [statusMsg,  setStatusMsg]  = useState<string>('');
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build methods array inside component so t() is in scope
  const METHODS = [
    { type: 'gopay'       as PaymentType, label: 'GoPay',                   desc: t('gopayDesc'),      color: '#00AED6', icon: <WalletIcon className="w-6 h-6" /> },
    { type: 'shopeepay'   as PaymentType, label: 'ShopeePay',               desc: t('shopeepayDesc'),  color: '#EE4D2D', icon: <WalletIcon className="w-6 h-6" /> },
    { type: 'qris'        as PaymentType, label: 'QRIS',                    desc: t('qrisDesc'),       color: '#374151', icon: <QrIcon    className="w-6 h-6" /> },
    { type: 'bank_transfer' as PaymentType, label: 'Transfer Bank (VA)',    desc: t('bankTransferDesc'),color: '#1d4ed8', icon: <BankIcon  className="w-6 h-6" /> },
    { type: 'mandiri_va'  as PaymentType, label: 'Mandiri Virtual Account', desc: t('mandiriDesc'),    color: '#003087', icon: <BankIcon  className="w-6 h-6" /> },
  ];

  // ── Stop polling ─────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Poll for status (5s interval, 2-minute timeout) ──────────────────────────
  const startPolling = useCallback((orderId: string) => {
    const deadline = Date.now() + 2 * 60 * 1000;

    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        stopPolling();
        setStatusMsg(t('timeout'));
        return;
      }

      try {
        const res  = await fetch(`/api/payments/midtrans/status/${encodeURIComponent(orderId)}`);
        const data = await res.json() as { status: string };

        if (data.status === 'completed') {
          stopPolling();
          setPayStatus('completed');
          setStatusMsg(t('successTitle'));
          onSuccess?.(orderId);
        } else if (data.status === 'failed') {
          stopPolling();
          setPayStatus('failed');
          setStatusMsg(t('failed'));
          onError?.(t('failed'));
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, 5_000);
  }, [stopPolling, onSuccess, onError, t]);

  // ── Initiate charge ───────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!selected) return;

    setPayStatus('loading');
    setStatusMsg('');

    try {
      const res = await fetch('/api/payments/midtrans/charge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount:      amountIdr,
          paymentType: selected,
          ...(selected === 'bank_transfer' ? { bank } : {}),
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = await res.json() as ChargeResult & { error?: string };

      if (!res.ok) {
        setPayStatus('failed');
        const msg = data.error ?? t('failedRetry');
        setStatusMsg(msg);
        onError?.(msg);
        return;
      }

      setResult(data);
      setPayStatus('pending');
      startPolling(data.orderId);
    } catch {
      setPayStatus('failed');
      const msg = t('serviceUnavailable');
      setStatusMsg(msg);
      onError?.(msg);
    }
  }, [
    selected, bank, bookingId, amountIdr,
    customerName, customerEmail, customerPhone,
    startPolling, onError, t,
  ]);

  // ── Manual status check ───────────────────────────────────────────────────────
  const handleCheckStatus = useCallback(async () => {
    if (!result?.orderId) return;
    setStatusMsg(t('checking'));

    try {
      const res  = await fetch(`/api/payments/midtrans/status/${encodeURIComponent(result.orderId)}`);
      const data = await res.json() as { status: string };

      if (data.status === 'completed') {
        stopPolling();
        setPayStatus('completed');
        setStatusMsg(t('successTitle'));
        onSuccess?.(result.orderId);
      } else if (data.status === 'failed') {
        stopPolling();
        setPayStatus('failed');
        setStatusMsg(t('failed'));
      } else {
        setStatusMsg(t('statusWaiting', { status: data.status }));
      }
    } catch {
      setStatusMsg(t('checkStatusFailed'));
    }
  }, [result, stopPolling, onSuccess, t]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (payStatus === 'completed') {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center">
        <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-emerald-800 mb-1">{t('successTitle')}</h3>
        <p className="text-sm text-emerald-600">{t('successDesc')}</p>
        {result?.orderId && (
          <p className="text-xs text-utu-text-muted mt-3">Order ID: {result.orderId}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Amount summary ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-utu-bg-muted border border-utu-border-default px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-utu-text-muted">{t('totalLabel')}</span>
        <span className="text-lg font-bold text-utu-text-primary">{formatIdr(amountIdr)}</span>
      </div>

      {/* ── Method selector ────────────────────────────────────────────────── */}
      {payStatus === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-utu-text-secondary">{t('chooseMethod')}</p>

          {METHODS.map((m) => (
            <button
              key={m.type}
              onClick={() => setSelected(m.type)}
              aria-pressed={selected === m.type}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-start
                ${selected === m.type
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-utu-border-default bg-utu-bg-card hover:border-utu-border-strong'
                }`}
              style={{ minHeight: 56 }}
            >
              <span
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.icon}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-utu-text-primary">{m.label}</span>
                <span className="block text-xs text-utu-text-muted">{m.desc}</span>
              </span>
              {selected === m.type && (
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}

          {/* Bank selector — shown only for bank_transfer */}
          {selected === 'bank_transfer' && (
            <div className="flex gap-3 ps-2">
              {BANKS.map((b) => (
                <button
                  key={b.code}
                  onClick={() => setBank(b.code)}
                  aria-pressed={bank === b.code}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2
                    ${bank === b.code ? 'border-transparent text-white' : 'border-utu-border-default text-utu-text-secondary bg-utu-bg-card'}`}
                  style={bank === b.code ? { backgroundColor: b.color } : {}}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={!selected}
            className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            style={{ minHeight: 48 }}
          >
            {t('payNow')}
          </button>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {payStatus === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-10">
          <span className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-utu-text-muted">{t('connecting')}</p>
        </div>
      )}

      {/* ── Pending — payment instructions ─────────────────────────────────── */}
      {payStatus === 'pending' && result && (
        <div className="space-y-4">

          {/* ── GoPay / ShopeePay ─────────────────────────────────────────── */}
          {(result.paymentType === 'gopay' || result.paymentType === 'shopeepay') && (
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-4">
              <h4 className="font-semibold text-utu-text-primary">
                {result.paymentType === 'gopay' ? 'GoPay' : 'ShopeePay'}
              </h4>

              {result.deeplinkUrl && (
                <a
                  href={result.deeplinkUrl}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
                  style={{
                    backgroundColor: result.paymentType === 'gopay' ? '#00AED6' : '#EE4D2D',
                    minHeight: 48,
                  }}
                  aria-label={`Buka aplikasi ${result.paymentType === 'gopay' ? 'GoPay' : 'ShopeePay'}`}
                >
                  Buka Aplikasi
                </a>
              )}

              {result.qrUrl && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-utu-text-muted">{t('orScanQr')}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.qrUrl}
                    alt="QR Code pembayaran"
                    className="w-48 h-48 rounded-lg border border-utu-border-default"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── QRIS ──────────────────────────────────────────────────────── */}
          {result.paymentType === 'qris' && (
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-4">
              <h4 className="font-semibold text-utu-text-primary">{t('qrisScanTitle')}</h4>
              <p className="text-xs text-utu-text-muted">{t('qrisInstructions')}</p>

              <div className="flex justify-center">
                {result.qrBase64 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={result.qrBase64} alt="QRIS QR Code" className="w-56 h-56 rounded-xl border border-utu-border-default" />
                ) : result.qrUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={result.qrUrl}    alt="QRIS QR Code" className="w-56 h-56 rounded-xl border border-utu-border-default" />
                ) : (
                  <div className="w-56 h-56 rounded-xl border border-utu-border-default bg-utu-bg-muted flex items-center justify-center">
                    <span className="text-xs text-utu-text-muted">{t('qrisUnavailable')}</span>
                  </div>
                )}
              </div>

              {result.expiryTime && (
                <p className="text-xs text-utu-text-muted text-center">
                  {t('validUntil')} <strong>{formatExpiry(result.expiryTime)}</strong>
                </p>
              )}
            </div>
          )}

          {/* ── Bank Transfer VA ──────────────────────────────────────────── */}
          {result.paymentType === 'bank_transfer' && (
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-3">
              <h4 className="font-semibold text-utu-text-primary">
                {t('bankTransferTitle', { bank: result.bank?.toUpperCase() ?? '' })}
              </h4>
              <p className="text-xs text-utu-text-muted">{t('bankTransferInstructions')}</p>

              <div className="bg-utu-bg-muted rounded-lg px-4 py-3">
                <p className="text-xs text-utu-text-muted mb-1">{t('vaNumber')}</p>
                <p className="text-xl font-mono font-bold text-utu-text-primary tracking-widest">
                  {result.vaNumber ?? '—'}
                </p>
              </div>

              <div className="bg-utu-bg-muted rounded-lg px-4 py-3">
                <p className="text-xs text-utu-text-muted mb-1">{t('transferAmount')}</p>
                <p className="text-lg font-bold text-emerald-700">{formatIdr(result.grossAmount)}</p>
              </div>

              {result.expiryTime && (
                <p className="text-xs text-utu-text-muted">
                  {t('deadline')} <strong>{formatExpiry(result.expiryTime)}</strong>
                </p>
              )}
            </div>
          )}

          {/* ── Mandiri VA (eChannel) ─────────────────────────────────────── */}
          {result.paymentType === 'mandiri_va' && (
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-3">
              <h4 className="font-semibold text-utu-text-primary">{t('mandiriTitle')}</h4>
              <p className="text-xs text-utu-text-muted">{t('mandiriInstructions')}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-utu-bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-utu-text-muted mb-1">{t('billerCode')}</p>
                  <p className="text-lg font-mono font-bold text-utu-text-primary">
                    {result.billerCode ?? '—'}
                  </p>
                </div>
                <div className="bg-utu-bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-utu-text-muted mb-1">{t('billKey')}</p>
                  <p className="text-lg font-mono font-bold text-utu-text-primary">
                    {result.billKey ?? '—'}
                  </p>
                </div>
              </div>

              <div className="bg-utu-bg-muted rounded-lg px-4 py-3">
                <p className="text-xs text-utu-text-muted mb-1">{t('paymentAmount')}</p>
                <p className="text-lg font-bold text-emerald-700">{formatIdr(result.grossAmount)}</p>
              </div>

              {result.expiryTime && (
                <p className="text-xs text-utu-text-muted">
                  {t('deadline')} <strong>{formatExpiry(result.expiryTime)}</strong>
                </p>
              )}
            </div>
          )}

          {/* ── Status message + manual check ────────────────────────────── */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <div className="flex items-center gap-2 text-sm text-utu-text-muted">
              <span className="w-3 h-3 border-2 border-utu-border-strong border-t-emerald-500 rounded-full animate-spin" />
              {t('waitingConfirmation')}
            </div>

            {statusMsg && (
              <p className={`text-sm font-medium ${
                (payStatus as PayStatus) === 'failed' ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {statusMsg}
              </p>
            )}

            <button
              onClick={handleCheckStatus}
              className="text-sm text-emerald-700 hover:text-emerald-600 underline underline-offset-2"
            >
              {t('checkStatus')}
            </button>
          </div>
        </div>
      )}

      {/* ── Failed ─────────────────────────────────────────────────────────── */}
      {payStatus === 'failed' && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">
            {statusMsg || t('failed')}
          </p>
          <button
            onClick={() => { setPayStatus('idle'); setResult(null); setStatusMsg(''); stopPolling(); }}
            className="text-sm text-red-600 hover:text-red-500 underline underline-offset-2"
          >
            {t('tryAgain')}
          </button>
        </div>
      )}

    </div>
  );
}
