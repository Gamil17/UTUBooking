'use client';

/**
 * EuropePaymentSelector
 *
 * Unified payment component for European users using Stripe Payment Element.
 * The Payment Element automatically surfaces the correct local payment methods
 * based on currency + customer browser locale — no manual method mapping needed.
 *
 * Methods auto-surfaced per country (requires enabling in Stripe Dashboard):
 *   GB (GBP)  → Card, Apple Pay, Google Pay, Klarna
 *   DE (EUR)  → Card, SEPA Direct Debit, Klarna
 *   FR (EUR)  → Card, SEPA Direct Debit, Klarna, Apple Pay
 *   NL (EUR)  → iDEAL (first — 65% market share), Card, SEPA
 *   BE (EUR)  → Bancontact (first), Card, SEPA
 *   IT (EUR)  → Card, SEPA
 *   ES (EUR)  → Card, SEPA
 *   PL (PLN)  → BLIK (first — 90% market), Card, SEPA
 *   AT (EUR)  → Card, SEPA, Klarna
 *   SE (SEK)  → Klarna (home market), Card
 *   PT (EUR)  → Card, MB WAY, SEPA
 *
 * Dashboard prerequisites:
 *   Stripe → Settings → Payment Methods → enable:
 *   SEPA Direct Debit · iDEAL · Bancontact · BLIK · Klarna
 *   Apple Pay · Google Pay  (add EUR + GBP wallet configs)
 *   [Giropay: discontinued June 2024 — do NOT enable]
 *
 * Stripe currencies to activate: EUR, GBP, PLN, SEK, NOK, DKK, CHF, CZK, HUF
 *
 * Flow:
 *   1. POST /api/payments/stripe/element/initiate → { clientSecret }
 *   2. Stripe Elements provider mounts <PaymentElement>
 *   3. stripe.confirmPayment({ elements, confirmParams: { return_url } })
 *   4. Stripe handles redirect (iDEAL/Bancontact) or in-page (card/BLIK)
 *   5. On return URL, retrieve intent to confirm status
 */

import { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  bookingId:   string;
  amount:      number;     // in local currency units (e.g. 250.00 EUR)
  currency:    string;     // ISO 4217 (EUR, GBP, PLN, etc.)
  countryCode: string;     // ISO 3166-1 alpha-2 (DE, GB, NL, etc.)
  returnUrl?:  string;     // where Stripe redirects after bank-based payment
  onSuccess:   (paymentId: string) => void;
  onCancel:    () => void;
}

// ── Currency formatting ────────────────────────────────────────────────────────

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  EUR: 'de-DE',    // comma decimal, dot thousands  → 1.234,56 €
  GBP: 'en-GB',    // dot decimal, comma thousands  → £1,234.56
  PLN: 'pl-PL',    // space thousands, comma dec    → 1 234,56 zł
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  CHF: 'de-CH',
  CZK: 'cs-CZ',
  HUF: 'hu-HU',
  RON: 'ro-RO',
};

function formatAmount(amount: number, currency: string): string {
  const locale = CURRENCY_LOCALE_MAP[currency.toUpperCase()] ?? 'en-US';
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Country → preferred method order label ─────────────────────────────────────

const COUNTRY_HERO_METHOD: Record<string, string> = {
  NL: 'iDEAL, card, SEPA',
  BE: 'Bancontact, card, SEPA',
  PL: 'BLIK, card',
  DE: 'Card, SEPA Direct Debit, Klarna',
  AT: 'Card, SEPA, Klarna',
  FR: 'Card, SEPA, Klarna, Apple Pay',
  GB: 'Card, Klarna, Apple Pay',
  SE: 'Klarna, card',
  IT: 'Card, SEPA',
  ES: 'Card, SEPA',
  PT: 'Card, MB Way, SEPA',
  DEFAULT: 'Card, SEPA',
};

function getMethodHint(countryCode: string): string {
  return COUNTRY_HERO_METHOD[countryCode.toUpperCase()] ?? COUNTRY_HERO_METHOD.DEFAULT;
}

// ── Stripe SDK loader ──────────────────────────────────────────────────────────

let stripePromise: Promise<unknown> | null = null;

function loadStripeJs(): Promise<unknown> {
  if (stripePromise) return stripePromise;
  stripePromise = new Promise<unknown>((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return; }
    if ((window as unknown as Record<string, unknown>).Stripe) {
      resolve((window as unknown as Record<string, unknown>).Stripe);
      return;
    }
    const script    = document.createElement('script');
    script.src      = 'https://js.stripe.com/v3/';
    script.async    = true;
    script.onload   = () => resolve((window as unknown as Record<string, unknown>).Stripe);
    script.onerror  = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });
  return stripePromise;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function EuropePaymentSelector({
  bookingId,
  amount,
  currency,
  countryCode,
  returnUrl,
  onSuccess,
  onCancel,
}: Props) {
  const [phase,       setPhase]       = useState<'idle' | 'loading' | 'element' | 'confirming' | 'done' | 'error'>('idle');
  const [error,       setError]       = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [paymentId,   setPaymentId]   = useState('');

  const elementsRef   = useRef<unknown>(null);
  const stripeRef     = useRef<unknown>(null);
  const elementMounted = useRef(false);
  const containerRef  = useRef<HTMLDivElement>(null);

  const formattedAmount = formatAmount(amount, currency);
  const methodHint      = getMethodHint(countryCode);

  // ── Step 1: Fetch client secret from backend ──────────────────────────────
  async function handleStart() {
    setPhase('loading');
    setError('');

    try {
      const res  = await fetch('/api/payments/stripe/element/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amount, currency, countryCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Failed to initialise payment');
        setPhase('error');
        return;
      }
      setClientSecret(data.clientSecret);
      setPaymentId(data.paymentId);
      setPhase('element');
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setPhase('error');
    }
  }

  // ── Step 2: Mount Stripe Payment Element after clientSecret is ready ────────
  useEffect(() => {
    if (phase !== 'element' || !clientSecret || elementMounted.current) return;
    elementMounted.current = true;

    async function mountElement() {
      try {
        const StripeConstructor = await loadStripeJs() as (key: string) => unknown;
        const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripeInstance = (StripeConstructor as any)(pk) as Record<string, (...args: unknown[]) => unknown>;
        stripeRef.current = stripeInstance;

        // Stripe Elements appearance — matches UTUBooking brand
        const appearance = {
          theme:     'stripe' as const,
          variables: {
            colorPrimary:       '#10B981',   // brand green
            colorBackground:    '#ffffff',
            colorText:          '#111827',
            colorDanger:        '#ef4444',
            fontFamily:         'Inter, system-ui, sans-serif',
            spacingUnit:        '4px',
            borderRadius:       '12px',
            fontSizeSm:         '14px',
          },
          rules: {
            '.Input': { border: '1px solid #E5E7EB', padding: '12px 16px', minHeight: '44px' },
            '.Input:focus': { borderColor: '#10B981', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' },
            '.Label': { color: '#374151', fontWeight: '500', fontSize: '14px' },
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elements = (stripeInstance as any).elements({
          clientSecret,
          appearance,
        }) as Record<string, (...args: unknown[]) => unknown>;

        elementsRef.current = elements;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentElement = (elements as any).create('payment', {
          // paymentMethodOrder guides Stripe to surface local methods first
          // but the Payment Element also respects Stripe Dashboard configuration.
          layout: 'tabs',
        });

        if (containerRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (paymentElement as any).mount(containerRef.current);
        }
      } catch (err) {
        setError((err as Error).message ?? 'Failed to load payment form');
        setPhase('error');
      }
    }

    mountElement();
  }, [phase, clientSecret]);

  // ── Step 3: Confirm payment ───────────────────────────────────────────────
  async function handleConfirm() {
    if (!stripeRef.current || !elementsRef.current) return;
    setPhase('confirming');
    setError('');

    const baseUrl     = typeof window !== 'undefined' ? window.location.origin : '';
    const confirmReturn = returnUrl ?? `${baseUrl}/booking/confirm?paymentId=${paymentId}&bookingId=${bookingId}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: confirmError } = await (stripeRef.current as any).confirmPayment({
        elements: elementsRef.current,
        confirmParams: { return_url: confirmReturn },
        // redirect: 'if_required' — only redirect for methods that need it (iDEAL, Bancontact)
        // card, BLIK complete in-page and call the handler without redirect
        redirect: 'if_required',
      }) as { error?: { message?: string }; paymentIntent?: { status: string } };

      if (confirmError) {
        // Card declined, BLIK timeout, etc.
        setError(confirmError.message ?? 'Payment failed. Please try another method.');
        setPhase('element');
        return;
      }

      // Redirect-less methods (card, BLIK) reach here on success
      setPhase('done');
      onSuccess(paymentId);
    } catch (err) {
      setError((err as Error).message ?? 'Unexpected error');
      setPhase('element');
    }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const btnPrimary =
    'w-full rounded-xl py-3.5 text-white text-sm font-semibold min-h-[44px] ' +
    'flex items-center justify-center gap-2 transition-colors ';

  const btnActive  = 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800';
  const btnDisabled = 'bg-utu-border-strong cursor-not-allowed';

  return (
    <div className="w-full max-w-md mx-auto space-y-5">

      {/* Amount header */}
      <div className="text-center bg-emerald-50 rounded-2xl py-4 px-6 border border-emerald-100">
        <p className="text-xs text-emerald-600 mb-1">Total</p>
        <p className="text-2xl font-bold text-emerald-800">{formattedAmount}</p>
        <p className="text-xs text-utu-text-muted mt-1">{methodHint}</p>
      </div>

      {/* Idle state — prompt to start */}
      {phase === 'idle' && (
        <button
          type="button"
          onClick={handleStart}
          className={btnPrimary + btnActive}
        >
          Continue to Payment
        </button>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
          <span className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm">Loading secure payment form…</span>
        </div>
      )}

      {/* Stripe Payment Element mount point */}
      {(phase === 'element' || phase === 'confirming') && (
        <div className="space-y-4">
          {/* The Payment Element renders inside this div */}
          <div ref={containerRef} className="min-h-[120px]" />

          <p className="text-xs text-center text-utu-text-muted flex items-center justify-center gap-1.5">
            <span aria-hidden>🔒</span>
            Secured by{' '}
            <a
              href="https://stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Stripe
            </a>
            . Your payment details are encrypted.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      {/* Success */}
      {phase === 'done' && (
        <div className="text-center bg-emerald-50 rounded-2xl py-6 border border-emerald-100">
          <p className="text-2xl mb-1">✓</p>
          <p className="text-base font-semibold text-emerald-800">Payment confirmed</p>
        </div>
      )}

      {/* Action buttons */}
      {phase !== 'done' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={phase === 'loading' || phase === 'confirming'}
            className="flex-1 border border-utu-border-strong text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted min-h-[44px] disabled:opacity-50"
          >
            Cancel
          </button>

          {(phase === 'element' || phase === 'confirming') && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={phase === 'confirming'}
              className={[
                btnPrimary + 'flex-grow',
                phase === 'confirming' ? btnDisabled : btnActive,
              ].join(' ')}
            >
              {phase === 'confirming' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                `Pay ${formattedAmount}`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Global Stripe type augmentation ───────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Stripe?: (key: string, options?: Record<string, unknown>) => any;
  }
}
