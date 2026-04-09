'use client';

/**
 * USAPaymentSelector
 *
 * EXCEPTION: bg-[#003087] and bg-[#FFC439] are PayPal's official brand colors.
 * bg-[#1A3055] is Stripe's brand navy. Do not replace with design system tokens.
 * Payment selector for US users (Phase 10).
 * Three methods:
 *   1. Card (Stripe)    — dispatches `utu:switch-to-stripe` CustomEvent; PaymentSelector mounts StripeElement
 *   2. PayPal           — redirect flow (200M+ US accounts, 80% of US online shoppers)
 *   3. Affirm BNPL      — shown only when amountUSD >= 200 (UTUBooking policy)
 *
 * PayPal flow:
 *   POST /api/payments/paypal/initiate → { orderId, approveUrl }
 *   → redirect → ?token=ORDERID on return → POST /api/payments/paypal/capture
 *
 * Affirm flow:
 *   POST /api/payments/affirm/initiate → { checkoutToken, redirectUrl, monthlyEstimate }
 *   → redirect → ?checkout_token=XXX on return → POST /api/payments/affirm/confirm
 */

import { useState, useEffect } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const AFFIRM_MIN_USD = 200; // Must match RECOMMENDED_MIN_USD in affirm.gateway.js

// ── Types ─────────────────────────────────────────────────────────────────────

type Method = 'card' | 'paypal' | 'affirm';
type Phase  = 'idle' | 'loading' | 'redirecting' | 'capturing' | 'done' | 'error';

interface Props {
  bookingId:  string;
  amountUSD:  number;
  onSuccess:  (paymentId: string) => void;
  onCancel:   () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function USAPaymentSelector({
  bookingId,
  amountUSD,
  onSuccess,
  onCancel,
}: Props) {
  const showAffirm = amountUSD >= AFFIRM_MIN_USD;

  const [method,           setMethod]           = useState<Method>('card');
  const [phase,            setPhase]            = useState<Phase>('idle');
  const [error,            setError]            = useState('');
  const [monthlyEstimate,  setMonthlyEstimate]  = useState('');

  const formattedAmount = formatUSD(amountUSD);

  // ── Handle returns from PayPal or Affirm redirect ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // PayPal return: ?token=ORDERID
    const paypalToken = params.get('token');
    // Affirm return: ?checkout_token=XXX
    const affirmToken = params.get('checkout_token');
    const pid         = params.get('paymentId');

    if (paypalToken) {
      setMethod('paypal');
      setPhase('capturing');
      fetch('/api/payments/paypal/capture', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId: paypalToken, paymentId: pid ?? undefined }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'completed') {
            setPhase('done');
            onSuccess(data.paymentId ?? pid ?? paypalToken);
          } else {
            setError(data.message ?? 'Payment not completed. Please try again.');
            setPhase('error');
          }
        })
        .catch((err: Error) => { setError(err.message ?? 'Network error'); setPhase('error'); });
      return;
    }

    if (affirmToken) {
      setMethod('affirm');
      setPhase('capturing');
      fetch('/api/payments/affirm/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ checkoutToken: affirmToken, paymentId: pid ?? undefined }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'completed') {
            setPhase('done');
            onSuccess(data.paymentId ?? pid ?? affirmToken);
          } else {
            setError(data.message ?? 'Affirm payment not confirmed. Please try again.');
            setPhase('error');
          }
        })
        .catch((err: Error) => { setError(err.message ?? 'Network error'); setPhase('error'); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Switch to method ───────────────────────────────────────────────────────
  function switchMethod(m: Method) {
    setMethod(m);
    setPhase('idle');
    setError('');

    if (m === 'card') {
      window.dispatchEvent(new CustomEvent('utu:switch-to-stripe', {
        detail: { bookingId, amount: amountUSD, currency: 'USD', countryCode: 'US' },
      }));
    }
  }

  // ── PayPal: initiate ───────────────────────────────────────────────────────
  async function handlePayPalStart() {
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/payments/paypal/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bookingId,
          amount:      amountUSD,
          currency:    'USD',
          description: `UTUBooking reservation ${bookingId}`,
          returnUrl:   `${window.location.origin}${window.location.pathname}?bookingId=${bookingId}`,
          cancelUrl:   `${window.location.origin}${window.location.pathname}?cancelled=true&bookingId=${bookingId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? 'Failed to start PayPal'); setPhase('error'); return; }
      setPhase('redirecting');
      window.location.href = data.approveUrl;
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setPhase('error');
    }
  }

  // ── Affirm: initiate ───────────────────────────────────────────────────────
  async function handleAffirmStart() {
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/payments/affirm/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bookingId,
          amountUSD,
          description: `UTUBooking reservation ${bookingId}`,
          confirmUrl:  `${window.location.origin}${window.location.pathname}?bookingId=${bookingId}`,
          cancelUrl:   `${window.location.origin}${window.location.pathname}?cancelled=true&bookingId=${bookingId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? 'Failed to start Affirm'); setPhase('error'); return; }
      if (data.monthlyEstimate) setMonthlyEstimate(data.monthlyEstimate);
      setPhase('redirecting');
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setPhase('error');
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const tabCls = (active: boolean) =>
    [
      'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors min-h-[44px]',
      active ? 'bg-[#003087] text-white shadow-sm' : 'text-utu-text-secondary hover:bg-utu-bg-muted',
    ].join(' ');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto space-y-5">

      {/* Amount */}
      <div className="text-center bg-blue-50 rounded-2xl py-4 px-6 border border-blue-100">
        <p className="text-xs text-blue-600 mb-1">Total</p>
        <p className="text-2xl font-bold text-blue-900">{formattedAmount}</p>
      </div>

      {/* Method tabs */}
      <div className="bg-utu-bg-muted rounded-2xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => switchMethod('card')}
          className={tabCls(method === 'card')}
          aria-pressed={method === 'card'}
        >
          Card
        </button>
        <button
          type="button"
          onClick={() => switchMethod('paypal')}
          className={tabCls(method === 'paypal')}
          aria-pressed={method === 'paypal'}
        >
          PayPal
        </button>
        {showAffirm && (
          <button
            type="button"
            onClick={() => switchMethod('affirm')}
            className={tabCls(method === 'affirm')}
            aria-pressed={method === 'affirm'}
          >
            Pay Monthly
          </button>
        )}
      </div>

      {/* ── Card (placeholder — PaymentSelector will mount StripeElement) ──── */}
      {method === 'card' && (
        <div className="bg-utu-bg-muted rounded-2xl px-4 py-5 text-sm text-utu-text-muted text-center border border-utu-border-default">
          <p className="font-medium text-utu-text-secondary mb-1">Credit / Debit Card</p>
          <p className="text-xs">Secure card payment powered by Stripe.</p>
          <p className="text-xs mt-1">Apple Pay and Google Pay also available.</p>
        </div>
      )}

      {/* ── PayPal flow ──────────────────────────────────────────────────────── */}
      {method === 'paypal' && (
        <div className="space-y-4">

          {phase === 'idle' && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Pay with PayPal</p>
                <p className="text-xs text-blue-600">
                  You&apos;ll be redirected to PayPal to sign in and confirm your payment.
                  Fast, secure, and buyer-protected.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePayPalStart}
                className="w-full bg-[#FFC439] hover:bg-yellow-400 text-[#003087] rounded-xl py-3.5 text-sm font-bold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                aria-label="Pay with PayPal"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                </svg>
                Pay with PayPal
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
              <span className="w-5 h-5 border-2 border-[#FFC439]/40 border-t-[#FFC439] rounded-full animate-spin" />
              <span className="text-sm">Connecting to PayPal…</span>
            </div>
          )}

          {phase === 'redirecting' && (
            <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
              <span className="w-5 h-5 border-2 border-blue-200 border-t-[#003087] rounded-full animate-spin" />
              <span className="text-sm">Redirecting to PayPal…</span>
            </div>
          )}

          {phase === 'capturing' && (
            <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
              <span className="w-5 h-5 border-2 border-utu-border-default border-t-utu-blue rounded-full animate-spin" />
              <span className="text-sm">Confirming payment…</span>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center bg-utu-bg-subtle rounded-2xl py-6 border border-utu-border-default">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-base font-semibold text-utu-navy">PayPal payment successful</p>
            </div>
          )}
        </div>
      )}

      {/* ── Affirm BNPL flow ─────────────────────────────────────────────────── */}
      {method === 'affirm' && showAffirm && (
        <div className="space-y-4">

          {phase === 'idle' && (
            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-xl px-4 py-4 text-sm text-indigo-900 space-y-2 border border-indigo-100">
                <p className="font-semibold">Pay Monthly with Affirm</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-indigo-700">
                    {monthlyEstimate || 'as low as'}
                  </span>
                  {!monthlyEstimate && (
                    <span className="text-xs text-indigo-600">per month</span>
                  )}
                </div>
                <ul className="text-xs text-indigo-700 space-y-0.5">
                  <li>• 0–36% APR — your rate shown at checkout after a soft credit check</li>
                  <li>• No hidden fees · No prepayment penalty</li>
                  <li>• 3, 6, or 12-month plans available</li>
                </ul>
                <p className="text-xs text-indigo-500 pt-1">
                  Available on bookings of {formatUSD(AFFIRM_MIN_USD)} or more. US residents only.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAffirmStart}
                className="w-full bg-[#1A3055] hover:bg-[#0f1f36] text-white rounded-xl py-3.5 text-sm font-bold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                aria-label="Pay with Affirm"
              >
                {/* Affirm wordmark text — no public SVG logo; brand color is #1A3055 navy */}
                <span className="text-base font-black tracking-tight">affirm</span>
                <span className="opacity-80">— Pay monthly</span>
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
              <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm">Connecting to Affirm…</span>
            </div>
          )}

          {phase === 'redirecting' && (
            <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
              <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm">Redirecting to Affirm checkout…</span>
            </div>
          )}

          {phase === 'capturing' && (
            <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
              <span className="w-5 h-5 border-2 border-utu-border-default border-t-utu-blue rounded-full animate-spin" />
              <span className="text-sm">Confirming your Affirm plan…</span>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center bg-utu-bg-subtle rounded-2xl py-6 border border-utu-border-default">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-base font-semibold text-utu-navy">Affirm plan confirmed</p>
              <p className="text-xs text-utu-blue mt-1">
                You&apos;ll receive a payment schedule from Affirm by email.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Cancel */}
      {phase !== 'done' && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full border border-utu-border-strong text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted min-h-[44px]"
        >
          Cancel
        </button>
      )}

      {/* Trust badge */}
      <p className="text-xs text-center text-utu-text-muted">
        {method === 'affirm'
          ? 'Buy Now, Pay Later by Affirm. Subject to eligibility. US only.'
          : method === 'paypal'
          ? 'Payments processed by PayPal. Buyer Protection included.'
          : 'Payments secured by Stripe. SSL encrypted.'}
      </p>
    </div>
  );
}
