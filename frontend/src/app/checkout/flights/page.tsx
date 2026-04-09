'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { JSX } from 'react';

const PaymentSelector = dynamic(
  () => import('@/components/checkout/PaymentSelector'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'form' | 'paying' | 'confirmed';

interface PassengerForm {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  nationality: string;
  agreed:      boolean;
}

const EMPTY_FORM: PassengerForm = {
  firstName: '', lastName: '', email: '',
  phone: '', nationality: '', agreed: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDuration(minutes: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function fmtPrice(n: number, currency: string): string {
  return n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });
}

// ─── Airline logo placeholder ──────────────────────────────────────────────────
function AirlineBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 shrink-0">
      {code.slice(0, 2).toUpperCase()}
    </span>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', required = true }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

// ─── Flight summary widget ─────────────────────────────────────────────────────
interface FlightSummaryCardProps {
  airline: string; flightNum: string; cabin: string;
  from: string; to: string; depart: string; returnDate: string;
  isReturn: boolean; adults: number; price: number; totalPrice: number;
  currency: string; duration: number; stops: number;
}

function FlightSummaryCard({ airline, flightNum, cabin, from, to, depart, returnDate, isReturn, adults, price, totalPrice, currency, duration, stops }: FlightSummaryCardProps): JSX.Element {
  const tFR = useTranslations('flightResults');
  const tCO = useTranslations('checkout');
  const stopsLabel = stops === 0 ? tFR('direct') : stops === 1 ? tFR('oneStop') : tFR('twoStops');
  const cabinLabel = cabin.charAt(0).toUpperCase() + cabin.slice(1).replace(/_/g, ' ');
  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <AirlineBadge code={airline} />
        <div>
          <p className="font-semibold text-utu-text-primary text-sm">{airline} {flightNum}</p>
          <p className="text-xs text-utu-text-muted">{cabinLabel} · {stopsLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-xl font-bold text-utu-text-primary">{from}</p>
          <p className="text-xs text-utu-text-muted">{fmtDate(depart)}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <p className="text-[10px] text-utu-text-muted">{fmtDuration(duration)}</p>
          <div className="relative w-full h-px bg-utu-border-default">
            <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-utu-text-muted" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <p className="text-[10px] text-utu-text-muted">{stopsLabel}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-utu-text-primary">{to}</p>
          {isReturn && <p className="text-xs text-emerald-600">Return: {fmtDate(returnDate)}</p>}
        </div>
      </div>

      <div className="pt-4 border-t border-utu-border-default mt-4 space-y-1 text-xs text-utu-text-secondary">
        <div className="flex justify-between">
          <span>{tCO('passengers')}</span>
          <span className="font-medium text-utu-text-primary">{adults} adult{adults > 1 ? 's' : ''}</span>
        </div>
        <div className="flex justify-between">
          <span>{tFR('perPerson')}</span>
          <span className="font-medium text-utu-text-primary">{fmtPrice(price, currency)}</span>
        </div>
        <div className="flex justify-between font-bold text-utu-text-primary pt-1">
          <span>{tCO('total')}</span>
          <span className="text-emerald-700">{fmtPrice(totalPrice, currency)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FlightCheckoutPage() {
  const sp     = useSearchParams();
  const router = useRouter();
  const t      = useTranslations('booking');
  const tCO    = useTranslations('checkout');

  // ── Parse URL params ────────────────────────────────────────────────────────
  const offerId   = sp.get('offerId')   ?? '';
  const from      = sp.get('from')      ?? '';
  const to        = sp.get('to')        ?? '';
  const depart    = sp.get('depart')    ?? '';
  const returnDate= sp.get('return')    ?? '';
  const airline   = sp.get('airline')   ?? '';
  const flightNum = sp.get('flightNum') ?? '';
  const cabin     = sp.get('cabin')     ?? 'economy';
  const adults    = parseInt(sp.get('adults')   ?? '1', 10);
  const price     = parseFloat(sp.get('price')    ?? '0');
  const currency  = sp.get('currency')            ?? 'SAR';
  const duration  = parseInt(sp.get('duration')   ?? '0', 10);
  const stops     = parseInt(sp.get('stops')      ?? '0', 10);
  const isReturn  = !!returnDate;
  const totalPrice = price * adults;

  // ── State ────────────────────────────────────────────────────────────────────
  const [step,         setStep]         = useState<Step>('form');
  const [form,         setForm]         = useState<PassengerForm>(EMPTY_FORM);
  const [localRef]     = useState(() => `FLT-${Date.now().toString(36).toUpperCase()}`);
  const [bookingRef,   setBookingRef]   = useState('');
  const [persistError, setPersistError] = useState(false);

  function setField<K extends keyof PassengerForm>(key: K, value: PassengerForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canProceed = !!(
    form.firstName && form.lastName && form.email && form.phone && form.agreed
  );

  const handlePaymentSuccess = useCallback(async () => {
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem('utu_access_token')
      : null;
    if (token) {
      try {
        const res = await fetch('/api/bookings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            productType: 'flight',
            offerId:     offerId,
            totalPrice,
            currency,
            meta: { from, to, depart, return: returnDate, airline, flightNum, cabin, adults },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.referenceNo) setBookingRef(data.referenceNo);
        }
      } catch (err) { console.error('[checkout] booking persistence failed:', err); setPersistError(true); }
    }
    setStep('confirmed');
  }, [offerId, totalPrice, currency, from, to, depart, returnDate, airline, flightNum, cabin, adults]);

  if (!offerId && !from) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-utu-text-muted text-sm">{tCO('noOfferSelected')} <button onClick={() => router.back()} className="text-emerald-700 underline">{tCO('goBack')}</button></p>
      </div>
    );
  }

  const cabinLabel = cabin.charAt(0).toUpperCase() + cabin.slice(1).replace(/_/g, ' ');

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════════
  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-utu-text-primary mb-1">{t('success')}</h1>
          <p className="text-sm text-utu-text-muted mb-1">
            {t('ref')}: <span className="font-semibold text-utu-text-primary">{bookingRef || localRef}</span>
          </p>
          {!bookingRef && persistError && (
            <p className="text-xs text-amber-600 mb-5">{tCO('bookingNotSaved')}</p>
          )}

          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm mb-6 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-utu-text-primary">{from}</span>
              <svg className="w-4 h-4 text-utu-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
              </svg>
              <span className="font-bold text-lg text-utu-text-primary">{to}</span>
            </div>
            <div className="text-utu-text-muted">{airline} {flightNum} · {cabinLabel}</div>
            <div className="text-utu-text-secondary">{fmtDate(depart)}</div>
            {isReturn && <div className="text-utu-text-secondary">{tCO('returnFlight')} {fmtDate(returnDate)}</div>}
            <div className="text-utu-text-secondary">{adults} passenger{adults > 1 ? 's' : ''}</div>
            <div className="font-semibold text-emerald-700 pt-1">{fmtPrice(totalPrice, currency)}</div>
          </div>

          <Link href="/account" className="w-full inline-block text-center border border-emerald-200 text-emerald-700 font-semibold py-2.5 rounded-xl text-sm transition-colors hover:bg-emerald-50 mb-3">
            {tCO('viewInMyTrips')}
          </Link>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {tCO('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAYMENT
  // ═══════════════════════════════════════════════════════════════════════════════
  if (step === 'paying') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setStep('form')} className="flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-text-primary mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            {tCO('back')}
          </button>
          <div className="mb-6">
            <FlightSummaryCard airline={airline} flightNum={flightNum} cabin={cabin} from={from} to={to} depart={depart} returnDate={returnDate} isReturn={isReturn} adults={adults} price={price} totalPrice={totalPrice} currency={currency} duration={duration} stops={stops} />
          </div>
          <h2 className="font-bold text-utu-text-primary mb-4">{t('payment')}</h2>
          <PaymentSelector
            bookingId={localRef}
            amount={totalPrice}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setStep('form')}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PASSENGER DETAILS FORM
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-text-primary mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          {tCO('backToResults')}
        </button>

        <h1 className="text-2xl font-bold text-utu-text-primary mb-6">{t('title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Form ─────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5">
              <h2 className="font-semibold text-utu-text-primary mb-4">{t('guestDetails')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('firstName')}   value={form.firstName}   onChange={(v) => setField('firstName', v)} />
                <Field label={t('lastName')}    value={form.lastName}    onChange={(v) => setField('lastName', v)} />
                <Field label={t('email')}       value={form.email}       onChange={(v) => setField('email', v)}       type="email" />
                <Field label={t('phone')}       value={form.phone}       onChange={(v) => setField('phone', v)}       type="tel" />
                <div className="sm:col-span-2">
                  <Field label={t('nationality')} value={form.nationality} onChange={(v) => setField('nationality', v)} required={false} />
                </div>
              </div>
              <label className="flex items-start gap-3 mt-5 cursor-pointer">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.agreed}
                  onClick={() => setField('agreed', !form.agreed)}
                  className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                    form.agreed ? 'bg-emerald-700 border-emerald-700' : 'border-utu-border-strong bg-utu-bg-card'
                  }`}
                >
                  {form.agreed && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5"/>
                    </svg>
                  )}
                </button>
                <span className="text-xs text-utu-text-muted leading-relaxed">{t('terms')}</span>
              </label>
            </div>

            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setStep('paying')}
              className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {t('confirm')} → {t('payment')}
            </button>
          </div>

          {/* ── Booking summary ───────────────────────────────────────────────── */}
          <div className="lg:col-span-1 sticky top-6">
            <FlightSummaryCard airline={airline} flightNum={flightNum} cabin={cabin} from={from} to={to} depart={depart} returnDate={returnDate} isReturn={isReturn} adults={adults} price={price} totalPrice={totalPrice} currency={currency} duration={duration} stops={stops} />
          </div>

        </div>
      </div>
    </div>
  );
}
