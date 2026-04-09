'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { JSX } from 'react';

const PaymentSelector = dynamic(
  () => import('@/components/checkout/PaymentSelector'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'form' | 'paying' | 'confirmed';

interface DriverForm {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  licenseNum:  string;
  agreed:      boolean;
}

const EMPTY_FORM: DriverForm = {
  firstName: '', lastName: '', email: '',
  phone: '', licenseNum: '', agreed: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtPrice(n: number, currency: string): string {
  return n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });
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

// ─── Spec row ─────────────────────────────────────────────────────────────────
function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-utu-text-muted">{label}</span>
      <span className="font-medium text-utu-text-primary">{value}</span>
    </div>
  );
}

// ─── Car summary widget ────────────────────────────────────────────────────────
interface CarSummaryCardProps {
  image: string; name: string; category: string; supplier: string;
  pickupLocation: string; pickupDate: string; dropoffDate: string;
  days: number; pricePerDay: number; totalPrice: number; currency: string;
}

function CarSummaryCard({ image, name, category, supplier, pickupLocation, pickupDate, dropoffDate, days, pricePerDay, totalPrice, currency }: CarSummaryCardProps): JSX.Element {
  const tCR = useTranslations('carResults');
  const tCO = useTranslations('checkout');
  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 space-y-4">
      {image && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden">
          <Image src={image} alt={name} fill className="object-cover" unoptimized />
        </div>
      )}

      <div>
        <p className="font-bold text-utu-text-primary leading-tight">{name}</p>
        {category && (
          <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
            {category}
          </span>
        )}
      </div>

      <div className="space-y-1.5 border-t border-utu-border-default pt-3">
        {supplier       && <SpecRow label={tCR('supplier')}   value={supplier} />}
        <SpecRow label={tCO('pickup')}      value={pickupLocation} />
        <SpecRow label={tCO('pickupDate')}  value={fmtDate(pickupDate)} />
        <SpecRow label={tCO('dropoffDate')} value={fmtDate(dropoffDate)} />
        <SpecRow label={tCO('duration')}    value={`${days} day${days > 1 ? 's' : ''}`} />
      </div>

      <div className="border-t border-utu-border-default pt-3 space-y-1">
        <div className="flex justify-between text-xs text-utu-text-muted">
          <span>{fmtPrice(pricePerDay, currency)} × {days} days</span>
          <span>{fmtPrice(pricePerDay * days, currency)}</span>
        </div>
        <div className="flex justify-between font-bold text-utu-text-primary">
          <span>{tCR('totalPrice')}</span>
          <span className="text-emerald-700">{fmtPrice(totalPrice, currency)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CarCheckoutPage() {
  const sp     = useSearchParams();
  const router = useRouter();
  const t      = useTranslations('booking');
  const tCO    = useTranslations('checkout');

  // ── Parse URL params ────────────────────────────────────────────────────────
  const offerId        = sp.get('offerId')        ?? '';
  const name           = sp.get('name')           ?? 'Vehicle';
  const category       = sp.get('category')       ?? '';
  const supplier       = sp.get('supplier')       ?? '';
  const pickupLocation = sp.get('pickupLocation') ?? '';
  const pickupDate     = sp.get('pickupDate')     ?? '';
  const dropoffDate    = sp.get('dropoffDate')    ?? '';
  const days           = parseInt(sp.get('days')       ?? '1', 10);
  const pricePerDay    = parseFloat(sp.get('pricePerDay') ?? '0');
  const totalPrice     = parseFloat(sp.get('totalPrice')  ?? '0');
  const currency       = sp.get('currency')               ?? 'SAR';
  const image          = sp.get('image')                  ?? '';

  // ── State ────────────────────────────────────────────────────────────────────
  const [step,         setStep]         = useState<Step>('form');
  const [form,         setForm]         = useState<DriverForm>(EMPTY_FORM);
  const [localRef]     = useState(() => `CAR-${Date.now().toString(36).toUpperCase()}`);
  const [bookingRef,   setBookingRef]   = useState('');
  const [persistError, setPersistError] = useState(false);

  function setField<K extends keyof DriverForm>(key: K, value: DriverForm[K]) {
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
            productType: 'car',
            offerId:     offerId,
            totalPrice,
            currency,
            meta: { name, category, supplier, pickupLocation, pickupDate, dropoffDate, days },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.referenceNo) setBookingRef(data.referenceNo);
        }
      } catch (err) { console.error('[checkout] booking persistence failed:', err); setPersistError(true); }
    }
    setStep('confirmed');
  }, [offerId, totalPrice, currency, name, category, supplier, pickupLocation, pickupDate, dropoffDate, days]);

  if (!offerId && !name) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-utu-text-muted text-sm">{tCO('noOfferSelected')} <button onClick={() => router.back()} className="text-emerald-700 underline">{tCO('goBack')}</button></p>
      </div>
    );
  }

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
            <div className="font-semibold text-utu-text-primary">{name}</div>
            {supplier && <div className="text-utu-text-muted">{supplier}</div>}
            <div className="text-utu-text-secondary">{pickupLocation}</div>
            <div className="text-utu-text-secondary">{fmtDate(pickupDate)} → {fmtDate(dropoffDate)}</div>
            <div className="text-utu-text-secondary">{days} day{days > 1 ? 's' : ''}</div>
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
            <CarSummaryCard image={image} name={name} category={category} supplier={supplier} pickupLocation={pickupLocation} pickupDate={pickupDate} dropoffDate={dropoffDate} days={days} pricePerDay={pricePerDay} totalPrice={totalPrice} currency={currency} />
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
  // DRIVER DETAILS FORM
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
              <h2 className="font-semibold text-utu-text-primary mb-4">{tCO('driverDetails')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('firstName')}  value={form.firstName}  onChange={(v) => setField('firstName', v)} />
                <Field label={t('lastName')}   value={form.lastName}   onChange={(v) => setField('lastName', v)} />
                <Field label={t('email')}      value={form.email}      onChange={(v) => setField('email', v)}      type="email" />
                <Field label={t('phone')}      value={form.phone}      onChange={(v) => setField('phone', v)}      type="tel" />
                <div className="sm:col-span-2">
                  <Field label={tCO('driverLicense')} value={form.licenseNum} onChange={(v) => setField('licenseNum', v)} required={false} />
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
            <CarSummaryCard image={image} name={name} category={category} supplier={supplier} pickupLocation={pickupLocation} pickupDate={pickupDate} dropoffDate={dropoffDate} days={days} pricePerDay={pricePerDay} totalPrice={totalPrice} currency={currency} />
          </div>

        </div>
      </div>
    </div>
  );
}
