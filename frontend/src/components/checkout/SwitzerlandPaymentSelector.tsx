'use client';

/**
 * SwitzerlandPaymentSelector
 *
 * Payment selector for Swiss (CH) users.
 * TWINT is the dominant mobile payment (80% of Swiss mobile transactions).
 *
 * Supports two flows:
 *   1. TWINT   — QR code (desktop) + app deep-link (mobile) via TWINT Partner API
 *   2. Card    — Stripe Payment Element fallback (for non-TWINT users)
 *
 * TWINT flow:
 *   1. POST /api/payments/twint/initiate → { qrCodeUrl, appLink, checkoutId, expiresAt }
 *   2. Show QR on desktop / app-link button on mobile
 *   3. Poll GET /api/payments/twint/status/:checkoutId every 3s (up to 5 min)
 *   4. On status = 'completed' → onSuccess(paymentId)
 *
 * Alternative note:
 *   Stripe also supports TWINT for CHF since 2024.
 *   If you prefer a single integration, enable TWINT in your Stripe Dashboard
 *   (Settings → Payment Methods → Switzerland → TWINT) and use EuropePaymentSelector
 *   with currency='CHF'. The TWINT QR will appear in the Stripe Payment Element.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type Method = 'twint' | 'card';

interface TwintCheckout {
  paymentId:  string;
  checkoutId: string;
  qrCodeUrl:  string;
  appLink:    string;
  expiresAt:  string;
}

interface Props {
  bookingId:  string;
  amountCHF:  number;
  onSuccess:  (paymentId: string) => void;
  onCancel:   () => void;
}

// ── Amount formatter (Swiss locale: 1'234.56 CHF) ─────────────────────────────
function formatChf(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style:    'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Detect mobile for app-link vs QR rendering ────────────────────────────────
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

// ── Countdown timer hook ───────────────────────────────────────────────────────
function useCountdown(expiresAt: string | null): string {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!expiresAt) { setRemaining(''); return; }

    const tick = () => {
      const ms  = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setRemaining('Expired'); return; }
      const m   = Math.floor(ms / 60_000);
      const s   = Math.floor((ms % 60_000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SwitzerlandPaymentSelector({
  bookingId,
  amountCHF,
  onSuccess,
  onCancel,
}: Props) {
  const [method,   setMethod]   = useState<Method>('twint');
  const [phase,    setPhase]    = useState<'idle' | 'loading' | 'qr' | 'polling' | 'done' | 'error'>('idle');
  const [error,    setError]    = useState('');
  const [checkout, setCheckout] = useState<TwintCheckout | null>(null);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobile     = typeof navigator !== 'undefined' && isMobile();
  const countdown  = useCountdown(checkout?.expiresAt ?? null);

  const formattedAmount = formatChf(amountCHF);

  // ── TWINT: initiate checkout ───────────────────────────────────────────────
  async function handleTwintStart() {
    setPhase('loading');
    setError('');

    try {
      const res  = await fetch('/api/payments/twint/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amount: amountCHF, currency: 'CHF' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Failed to start TWINT payment');
        setPhase('error');
        return;
      }

      setCheckout(data as TwintCheckout);
      setPhase('qr');
      startPolling(data.checkoutId, data.paymentId);
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setPhase('error');
    }
  }

  // ── TWINT: poll status every 3 seconds ────────────────────────────────────
  const startPolling = useCallback((checkoutId: string, paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    let attempts = 0;
    const MAX_ATTEMPTS = 100; // 5 minutes at 3s interval

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setError('Payment timed out. Please try again or use card payment.');
        setPhase('error');
        return;
      }

      try {
        const res  = await fetch(`/api/payments/twint/status/${checkoutId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(pollRef.current!);
          setPhase('done');
          onSuccess(paymentId);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!);
          setError('TWINT payment was cancelled or failed. Please try again.');
          setPhase('error');
        }
      } catch {
        // Network hiccup — continue polling
      }
    }, 3000);
  }, [onSuccess]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Shared classes ─────────────────────────────────────────────────────────
  const tabCls = (active: boolean) =>
    [
      'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors min-h-[44px]',
      active ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
    ].join(' ');

  return (
    <div className="w-full max-w-md mx-auto space-y-5">

      {/* Amount */}
      <div className="text-center bg-emerald-50 rounded-2xl py-4 px-6 border border-emerald-100">
        <p className="text-xs text-emerald-600 mb-1">Gesamtbetrag</p>
        <p className="text-2xl font-bold text-emerald-800">{formattedAmount}</p>
      </div>

      {/* Method tabs */}
      <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => { setMethod('twint'); setPhase('idle'); setError(''); }}
          className={tabCls(method === 'twint')}
          aria-pressed={method === 'twint'}
        >
          TWINT
        </button>
        <button
          type="button"
          onClick={() => { setMethod('card'); setPhase('idle'); setError(''); }}
          className={tabCls(method === 'card')}
          aria-pressed={method === 'card'}
        >
          Karte / Card
        </button>
      </div>

      {/* ── TWINT flow ────────────────────────────────────────────────────── */}
      {method === 'twint' && (
        <div className="space-y-4">
          {/* Idle */}
          {phase === 'idle' && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">TWINT — Schweizer Mobile Payment</p>
                <p className="text-xs text-blue-600">
                  Scannen Sie den QR-Code mit der TWINT-App oder tippen Sie auf
                  «Mit TWINT zahlen» für die App-Weiterleitung.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTwintStart}
                className="w-full bg-[#FFD700] hover:bg-yellow-400 text-[#1A1A1A] rounded-xl py-3.5 text-sm font-bold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                aria-label="Mit TWINT bezahlen"
              >
                {/* TWINT brand color: yellow #FFD700 */}
                <span className="text-lg" aria-hidden>📱</span>
                Mit TWINT bezahlen
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
              <span className="w-5 h-5 border-2 border-[#FFD700]/40 border-t-[#FFD700] rounded-full animate-spin" />
              <span className="text-sm">TWINT-Zahlung wird vorbereitet…</span>
            </div>
          )}

          {/* QR + polling */}
          {(phase === 'qr' || phase === 'polling') && checkout && (
            <div className="space-y-4">
              {mobile ? (
                // Mobile: app deep-link button
                <div className="space-y-3 text-center">
                  <p className="text-sm text-gray-600">
                    Tippen Sie auf den Button, um die TWINT-App zu öffnen:
                  </p>
                  <a
                    href={checkout.appLink}
                    className="block w-full bg-[#FFD700] hover:bg-yellow-400 text-[#1A1A1A] rounded-xl py-4 text-base font-bold min-h-[44px] text-center transition-colors"
                    rel="noopener noreferrer"
                    aria-label="TWINT App öffnen und zahlen"
                  >
                    📱 TWINT App öffnen
                  </a>
                  <p className="text-xs text-gray-400">
                    Warten auf Zahlungsbestätigung…
                  </p>
                </div>
              ) : (
                // Desktop: QR code
                <div className="space-y-3 text-center">
                  <p className="text-sm text-gray-600">
                    QR-Code mit der TWINT-App scannen:
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={checkout.qrCodeUrl}
                    alt="TWINT QR-Code für die Zahlung"
                    className="mx-auto w-48 h-48 rounded-xl border border-gray-200 shadow-sm"
                    width={192}
                    height={192}
                  />
                  {countdown && countdown !== 'Expired' && (
                    <p className="text-xs text-gray-400">
                      QR gültig für <span className="font-mono text-gray-600">{countdown}</span>
                    </p>
                  )}
                  {countdown === 'Expired' && (
                    <p className="text-xs text-red-500">
                      QR-Code abgelaufen.{' '}
                      <button
                        type="button"
                        className="underline font-medium"
                        onClick={() => { setPhase('idle'); setCheckout(null); if (pollRef.current) clearInterval(pollRef.current); }}
                      >
                        Erneut versuchen
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Waiting indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                Warte auf Zahlung in TWINT-App…
              </div>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="text-center bg-emerald-50 rounded-2xl py-6 border border-emerald-100">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-base font-semibold text-emerald-800">TWINT-Zahlung erfolgreich</p>
            </div>
          )}
        </div>
      )}

      {/* ── Card fallback (Stripe Payment Element) ────────────────────────── */}
      {method === 'card' && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 space-y-1 border border-gray-200">
            <p className="font-semibold">Kreditkarte / Debitkarte</p>
            <p className="text-xs text-gray-500">
              Visa · Mastercard · American Express
              <br />
              3D Secure erzwungen. Sicheres Stripe-Formular wird geladen.
            </p>
          </div>
          {/* Card checkout delegates to the Europe selector with CHF */}
          <p className="text-xs text-center text-gray-400">
            Klicken Sie auf «Weiter zur Kartenzahlung» um das Stripe-Formular zu öffnen.
          </p>
          <button
            type="button"
            onClick={() => {
              // Signal to parent to switch to EuropePaymentSelector with currency='CHF'
              // This is handled by the parent checkout page which renders
              // <EuropePaymentSelector currency="CHF" countryCode="CH" ... />
              window.dispatchEvent(new CustomEvent('utu:switch-to-stripe', {
                detail: { bookingId, amount: amountCHF, currency: 'CHF', countryCode: 'CH' },
              }));
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 text-sm font-semibold min-h-[44px] transition-colors"
          >
            Weiter zur Kartenzahlung →
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      {/* Cancel */}
      {phase !== 'done' && (
        <button
          type="button"
          onClick={() => {
            if (pollRef.current) clearInterval(pollRef.current);
            onCancel();
          }}
          className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 min-h-[44px]"
        >
          Abbrechen / Cancel
        </button>
      )}

      {/* Trust badge */}
      <p className="text-xs text-center text-gray-400">
        TWINT ist die sichere Schweizer Zahlungsmethode — kein Konto nötig.
      </p>
    </div>
  );
}
