'use client';

/**
 * PaymentSelector — Smart payment method router
 *
 * Reads currency + locale from TenantContext and renders the correct regional
 * payment component. Add new gateways here as new markets launch.
 *
 * Routing logic (priority order — first match wins):
 *   CHF (any locale)              → SwitzerlandPaymentSelector (TWINT + Stripe card)
 *   PKR (any locale)              → PakistanPaymentSelector   (JazzCash + Easypaisa)
 *   INR (any locale)              → IndiaPaymentSelector      (Razorpay UPI/Card/EMI)
 *   IDR (any locale)              → IndonesianPaymentSelector (Midtrans Snap)
 *   MYR (any locale)              → MalaysianPaymentSelector  (iPay88)
 *   TRY (any locale)              → TurkeyPaymentSelector     (iyzico)
 *   EUR | GBP | PLN | SEK | NOK
 *     | DKK | CZK | HUF | RON
 *     | BRL (any locale)          → EuropePaymentSelector     (Stripe Payment Element)
 *   SAR | AED | KWD | JOD (any)  → GCCPaymentSelector        (STC Pay / Mada / Stripe)
 *   fallback                      → EuropePaymentSelector     (Stripe card)
 *
 * Props:
 *   bookingId  — UUID of the booking being paid for
 *   onSuccess  — called with paymentId on confirmed payment
 *   onCancel   — called when user dismisses the flow
 */

import { useContext, useState, useEffect } from 'react';
import TenantContext from '@/contexts/TenantContext';
import EuropePaymentSelector from './EuropePaymentSelector';
import SwitzerlandPaymentSelector from './SwitzerlandPaymentSelector';
import PakistanPaymentSelector from './PakistanPaymentSelector';
import IndiaPaymentSelector from './IndiaPaymentSelector';
import IndonesianPaymentSelector from './IndonesianPaymentSelector';
import USAPaymentSelector from './USAPaymentSelector';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PaymentSelectorProps {
  bookingId: string;
  amount:    number;   // in the tenant's native currency
  onSuccess: (paymentId: string) => void;
  onCancel:  () => void;
}

// ── Currency routing helpers ───────────────────────────────────────────────────

/**
 * Derive an ISO 3166-1 alpha-2 country code from a tenant's locale string.
 * Used to pass `countryCode` to EuropePaymentSelector so Stripe can surface
 * the right local payment methods (iDEAL for NL, Bancontact for BE, etc.).
 */
function localeToCountryCode(locale: string): string {
  const map: Record<string, string> = {
    de:       'DE',
    'en-GB':  'GB',
    it:       'IT',
    nl:       'NL',
    pl:       'PL',
    es:       'ES',
    'es-419': 'MX',   // fallback to MX for LATAM — parent can override
    'pt-BR':  'BR',
    fr:       'FR',
    sv:       'SE',
    nb:       'NO',
    da:       'DK',
    cs:       'CZ',
    hu:       'HU',
    ro:       'RO',
    pt:       'PT',
    en:       'US',
  };
  // Honour explicit region tags (e.g. "en-AU" → "AU")
  const parts = locale.split('-');
  if (parts.length === 2 && parts[1].length === 2) return parts[1].toUpperCase();
  return map[locale] ?? 'GB';
}

// EU + global Stripe currencies
const STRIPE_CURRENCIES = new Set([
  'EUR', 'GBP', 'PLN', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF', 'RON',
  'BRL', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'USD',
]);

// GCC currencies handled by STC Pay / Mada / legacy Stripe flow
const GCC_CURRENCIES = new Set(['SAR', 'AED', 'KWD', 'JOD', 'BHD', 'OMR', 'QAR']);

// ── Component ──────────────────────────────────────────────────────────────────

export default function PaymentSelector({
  bookingId,
  amount,
  onSuccess,
  onCancel,
}: PaymentSelectorProps) {
  const tenant   = useContext(TenantContext);
  const currency = (tenant?.currency ?? 'USD').toUpperCase();
  const locale   = tenant?.locale ?? 'en';

  // Card-fallback state for Switzerland (when user taps "Weiter zur Kartenzahlung")
  const [forceStripe, setForceStripe] = useState(false);

  // SwitzerlandPaymentSelector dispatches this CustomEvent when user selects card
  useEffect(() => {
    const handler = () => setForceStripe(true);
    window.addEventListener('utu:switch-to-stripe', handler);
    return () => window.removeEventListener('utu:switch-to-stripe', handler);
  }, []);

  // ── CH — TWINT primary, Stripe card fallback ─────────────────────────────
  if (currency === 'CHF' && !forceStripe) {
    return (
      <SwitzerlandPaymentSelector
        bookingId={bookingId}
        amountCHF={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── PK — JazzCash + Easypaisa ─────────────────────────────────────────────
  if (currency === 'PKR') {
    return (
      <PakistanPaymentSelector
        bookingId={bookingId}
        amountPKR={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── IN — Razorpay (UPI / Card / EMI) ──────────────────────────────────────
  if (currency === 'INR') {
    return (
      <IndiaPaymentSelector
        bookingId={bookingId}
        amountINR={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── ID — Midtrans Snap ────────────────────────────────────────────────────
  if (currency === 'IDR') {
    return (
      <IndonesianPaymentSelector
        bookingId={bookingId}
        amountIDR={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── USD (US market) — PayPal primary ──────────────────────────────────────
  if (currency === 'USD' && !forceStripe) {
    return (
      <USAPaymentSelector
        bookingId={bookingId}
        amountUSD={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── MYR — iPay88 (Malaysia) ───────────────────────────────────────────────
  // MalaysianPaymentSelector not yet implemented — fall through to Stripe
  // TODO: add MalaysianPaymentSelector when iPay88 frontend component is ready

  // ── TRY — iyzico (Turkey) ─────────────────────────────────────────────────
  // TurkeyPaymentSelector not yet implemented — fall through to Stripe
  // TODO: add TurkeyPaymentSelector when iyzico frontend component is ready

  // ── GCC — legacy STC Pay / Mada / Stripe (handled by BookingFlowScreen) ──
  // GCC tenants use the mobile BookingFlowScreen; web checkout uses Stripe card.
  // Fall through to EuropePaymentSelector which renders Stripe Payment Element.

  // ── EU + Stripe fallback (CHF card, MYR, TRY, GCC web, USD, everything else)
  // EuropePaymentSelector handles all Stripe-supported currencies.
  const countryCode = localeToCountryCode(locale);

  return (
    <EuropePaymentSelector
      bookingId={bookingId}
      amount={amount}
      currency={currency}
      countryCode={countryCode}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}

// ── utu:switch-to-stripe event listener ───────────────────────────────────────
// SwitzerlandPaymentSelector dispatches this when the user taps "Weiter zur
// Kartenzahlung". The parent checkout page should listen and re-render with
// forceStripe=true — but since PaymentSelector manages this state internally
// via the forceStripe flag, you can also wire it at the checkout page level:
//
//   useEffect(() => {
//     const handler = () => setPaymentMethod('stripe');
//     window.addEventListener('utu:switch-to-stripe', handler);
//     return () => window.removeEventListener('utu:switch-to-stripe', handler);
//   }, []);
//
// Alternatively, mount PaymentSelector inside a wrapper that listens:
//
//   <StripeEventBridge bookingId={...} amount={...} onSuccess={...} onCancel={...} />
