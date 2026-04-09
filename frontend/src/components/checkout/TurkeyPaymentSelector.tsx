'use client';

/**
 * TurkeyPaymentSelector
 *
 * EXCEPTION: bg-[#1A1D6E], hover:bg-[#23278A], active:bg-[#111450] are iyzico's
 * official brand navy colors. Do not replace with design system tokens.
 * Shown for TR country code users (currency = TRY) at checkout.
 * Gateway: iyzico — Turkey's leading payment provider
 *
 * Supported: Visa, Mastercard, TROY (domestic Turkish card), instalment plans (taksit)
 * 3D Secure is handled internally by iyzico's embedded checkout form.
 *
 * Flow:
 *   1. User sees amount + "Ödemeye Devam Et" button
 *   2. POST /api/payments/iyzico/initiate → { token, checkoutFormContent }
 *   3. checkoutFormContent (iyzico inline script) is injected into the DOM
 *   4. iyzico renders their 3DS-capable form overlay
 *   5. After 3DS, iyzico POSTs token to IYZICO_CALLBACK_URL (server callback)
 *   6. Frontend polls /api/payments/:bookingId every 3s until completed | failed
 *
 * Env vars required: IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_CALLBACK_URL
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatPrice } from '@/utils/formatting';

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = 'ready' | 'loading' | 'form' | 'verifying' | 'completed' | 'failed';

interface Props {
  bookingId:     string;
  amountTRY:     number;
  onSuccess:     (paymentId: string) => void;
  onCancel:      () => void;
  buyerName?:    string;
  buyerEmail?:   string;
}

interface InitiateResponse {
  token:               string;
  checkoutFormContent: string;  // raw HTML/script from iyzico
  error?:              string;
}

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 300_000; // 5 min — 3DS can take a while

// ── Component ──────────────────────────────────────────────────────────────────
export default function TurkeyPaymentSelector({
  bookingId,
  amountTRY,
  onSuccess,
  onCancel,
  buyerName,
  buyerEmail,
}: Props) {
  const [step,      setStep]      = useState<Step>('ready');
  const [token,     setToken]     = useState<string>('');
  const [errorMsg,  setErrorMsg]  = useState<string>('');

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed   = useRef(0);

  const formattedAmount = formatPrice(amountTRY, 'tr');

  // ── Stop polling ──────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Poll for booking payment confirmation ─────────────────────────────────
  const startPolling = useCallback((tok: string) => {
    elapsed.current = 0;
    setStep('verifying');

    pollTimer.current = setInterval(async () => {
      elapsed.current += POLL_INTERVAL_MS;

      if (elapsed.current >= POLL_TIMEOUT_MS) {
        stopPolling();
        setStep('failed');
        setErrorMsg('Ödeme zaman aşımına uğradı. Lütfen tekrar deneyin.');
        return;
      }

      try {
        // Poll generic booking payment status
        const res  = await fetch(`/api/payments/${encodeURIComponent(bookingId)}`);
        const data = await res.json() as { payments?: Array<{ status: string; paymentId?: string }> };
        const payment = (data.payments ?? [])[0];

        if (payment?.status === 'completed') {
          stopPolling();
          setStep('completed');
          onSuccess(payment.paymentId ?? tok);
        } else if (payment?.status === 'failed') {
          stopPolling();
          setStep('failed');
          setErrorMsg('Ödeme başarısız. Lütfen tekrar deneyin.');
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);
  }, [bookingId, stopPolling, onSuccess]);

  // ── Inject iyzico checkout form into DOM ──────────────────────────────────
  const mountIyzicoForm = useCallback((content: string) => {
    // iyzico provides a self-contained HTML snippet that creates its overlay
    // We inject it into a hidden container; iyzico SDK attaches to body itself
    const container = document.getElementById('iyzico-checkout-container');
    if (container) {
      container.innerHTML = content;
      // Execute any <script> tags in the content
      const scripts = container.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.async = true;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
      });
    }
  }, []);

  // ── Initiate payment ──────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    setStep('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/payments/iyzico/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amount: amountTRY, buyerName, buyerEmail }),
      });

      const data = await res.json() as InitiateResponse;

      if (!res.ok || data.error) {
        setStep('failed');
        setErrorMsg(data.error ?? 'Ödeme başlatılamadı. Lütfen tekrar deneyin.');
        return;
      }

      setToken(data.token);
      setStep('form');

      // Mount iyzico form on next tick (after state update renders container)
      setTimeout(() => {
        mountIyzicoForm(data.checkoutFormContent);
        // Start polling — iyzico will redirect to callback which server processes
        // After 5 seconds give iyzico form time to appear before polling
        setTimeout(() => startPolling(data.token), 5_000);
      }, 0);

    } catch {
      setStep('failed');
      setErrorMsg('Ödeme servisi şu anda kullanılamıyor.');
    }
  }, [bookingId, amountTRY, buyerName, buyerEmail, mountIyzicoForm, startPolling]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Completed
  if (step === 'completed') {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-emerald-800">Ödeme Başarılı!</h3>
        <p className="text-sm text-emerald-600">Rezervasyonunuz onaylandı. Teşekkür ederiz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" lang="tr">

      {/* ── Amount summary ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-utu-bg-muted border border-utu-border-default px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-utu-text-muted">Ödenecek Tutar</span>
        <span className="text-lg font-bold text-utu-text-primary">{formattedAmount}</span>
      </div>

      {/* ── Ready — show pay button ─────────────────────────────────────── */}
      {step === 'ready' && (
        <div className="space-y-4">
          {/* iyzico brand info */}
          <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1D6E] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-black">iyz</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-utu-text-primary">iyzico ile Güvenli Ödeme</p>
              <p className="text-xs text-utu-text-muted">Visa · Mastercard · TROY · Taksit seçenekleri</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-utu-border-default text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted transition-colors"
              style={{ minHeight: 48 }}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handlePay}
              className="flex-[2] bg-[#1A1D6E] hover:bg-[#23278A] active:bg-[#111450] text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              style={{ minHeight: 48 }}
            >
              Ödemeye Devam Et
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {step === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-10">
          <span className="w-8 h-8 border-[3px] border-[#E8E9F5] border-t-[#1A1D6E] rounded-full animate-spin" />
          <p className="text-sm text-utu-text-muted">Ödeme sayfası hazırlanıyor…</p>
        </div>
      )}

      {/* ── iyzico form container (injected by mountIyzicoForm) ─────────── */}
      {(step === 'form' || step === 'verifying') && (
        <div className="space-y-4">
          {/* iyzico SDK mounts its overlay into the DOM directly */}
          <div id="iyzico-checkout-container" />

          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="w-6 h-6 border-2 border-utu-border-strong border-t-[#1A1D6E] rounded-full animate-spin" />
            <p className="text-sm text-utu-text-muted">
              {step === 'verifying'
                ? 'Ödeme doğrulanıyor, lütfen bekleyin…'
                : 'iyzico ödeme formu yükleniyor…'}
            </p>
            {token && (
              <p className="text-xs text-utu-text-muted font-mono">Ref: {token.slice(0, 12)}…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Failed ──────────────────────────────────────────────────────── */}
      {step === 'failed' && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMsg || 'Ödeme başarısız.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-utu-text-muted underline underline-offset-2 hover:text-utu-text-secondary"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => { setStep('ready'); setErrorMsg(''); stopPolling(); }}
              className="text-sm text-red-600 underline underline-offset-2 hover:text-red-500"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
