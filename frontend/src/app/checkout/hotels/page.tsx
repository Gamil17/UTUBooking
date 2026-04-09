'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const PaymentSelector = dynamic(
  () => import('@/components/checkout/PaymentSelector'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'form' | 'paying' | 'confirmed';

interface GuestForm {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  nationality: string;
  agreed:      boolean;
}

const EMPTY_FORM: GuestForm = {
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

function fmtPrice(n: number, currency: string): string {
  return n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });
}

// ─── Star row ─────────────────────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  const n = Math.min(Math.max(Math.round(count), 0), 5);
  return (
    <span className="flex gap-px">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < n ? 'text-amber-400' : 'text-utu-border-default'}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
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
      <label className="text-[10px] font-semibold text-utu-text-muted uppercase tracking-wide block mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-utu-border-default rounded-xl px-3 py-2.5 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HotelCheckoutPage() {
  const sp     = useSearchParams();
  const router = useRouter();
  const t      = useTranslations('booking');
  const tHR    = useTranslations('hotelResults');
  const tCO    = useTranslations('checkout');
  const locale = useLocale();

  // ── Parse URL params ────────────────────────────────────────────────────────
  const rateKey      = sp.get('rateKey')      ?? '';
  const name         = sp.get('name')         ?? 'Hotel';
  const checkIn      = sp.get('checkIn')      ?? '';
  const checkOut     = sp.get('checkOut')     ?? '';
  const nights       = parseInt(sp.get('nights')      ?? '1', 10);
  const pricePerNight= parseFloat(sp.get('pricePerNight') ?? '0');
  const totalPrice   = parseFloat(sp.get('totalPrice')    ?? '0');
  const city         = sp.get('city')         ?? '';
  const stars        = parseInt(sp.get('stars')       ?? '0', 10);
  const image        = sp.get('image')        ?? '';
  const rooms        = parseInt(sp.get('rooms')        ?? '1', 10);
  const adults       = parseInt(sp.get('adults')       ?? '1', 10);
  const currency     = sp.get('currency')     ?? 'SAR';

  // ── State ────────────────────────────────────────────────────────────────────
  const [step,        setStep]        = useState<Step>('form');
  const [form,        setForm]        = useState<GuestForm>(EMPTY_FORM);
  const [localRef]    = useState(() => `BOOK-${Date.now().toString(36).toUpperCase()}`);
  const [bookingRef,  setBookingRef]  = useState('');
  const [persistError, setPersistError] = useState(false);

  function setField<K extends keyof GuestForm>(key: K, value: GuestForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canProceed = !!(
    form.firstName && form.lastName && form.email && form.phone && form.agreed
  );

  const handlePaymentSuccess = useCallback(async () => {
    // Persist booking to backend if user is logged in
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem('utu_access_token')
      : null;
    if (token) {
      try {
        const res = await fetch('/api/bookings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            productType: 'hotel',
            offerId:     rateKey,
            totalPrice,
            currency,
            meta: { name, checkIn, checkOut, nights, city, stars, image, rooms, adults },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.referenceNo) setBookingRef(data.referenceNo);
        }
      } catch (err) { console.error('[checkout] booking persistence failed:', err); setPersistError(true); }
    }
    setStep('confirmed');
  }, [rateKey, totalPrice, currency, name, checkIn, checkOut, nights, city, stars, image, rooms, adults]);

  // ── Redirect if no offer ─────────────────────────────────────────────────────
  if (!rateKey && !name) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-utu-text-muted text-sm">{tCO('noOfferSelected')} <button onClick={() => router.back()} className="text-utu-blue underline">{tCO('goBack')}</button></p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════════
  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-utu-bg-page flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-utu-bg-subtle rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-utu-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-utu-text-primary mb-1">{t('success')}</h1>
          <p className="text-sm text-utu-text-muted mb-1">{t('ref')}: <span className="font-semibold text-utu-text-primary">{bookingRef || localRef}</span></p>
          {!bookingRef && persistError && (
            <p className="text-xs text-amber-600 mb-5">{tCO('bookingNotSaved')}</p>
          )}

          <div className="bg-utu-bg-page rounded-xl p-4 text-left text-sm mb-6 space-y-1.5">
            <div className="font-semibold text-utu-text-primary">{name}</div>
            <div className="text-utu-text-muted">{city}</div>
            <div className="text-utu-text-secondary">{fmtDate(checkIn)} → {fmtDate(checkOut)}</div>
            <div className="text-utu-text-secondary">{nights} nights · {rooms} room{rooms > 1 ? 's' : ''} · {adults} adult{adults > 1 ? 's' : ''}</div>
            <div className="font-semibold text-utu-blue pt-1">{fmtPrice(totalPrice, currency)}</div>
          </div>

          <a
            href={`/api/bookings/confirmation-pdf?ref=${bookingRef || localRef}&locale=${locale}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-utu-bg-muted hover:bg-slate-200 text-utu-text-secondary font-semibold py-2.5 rounded-xl text-sm transition-colors mb-3"
            download
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/>
            </svg>
            {tCO('downloadPdf')}
          </a>

          <Link href="/account" className="w-full inline-block text-center border border-utu-border-default text-utu-blue font-semibold py-2.5 rounded-xl text-sm transition-colors hover:bg-utu-bg-subtle mb-3">
            {tCO('viewInMyTrips')}
          </Link>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-utu-navy hover:bg-utu-blue text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
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
      <div className="min-h-screen bg-utu-bg-page">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setStep('form')} className="flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-text-primary mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            {tCO('back')}
          </button>

          {/* Offer summary */}
          <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 mb-6">
            <div className="flex gap-4">
              {image && (
                <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0">
                  <Image src={image} alt={name} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-utu-text-primary text-sm leading-tight truncate">{name}</p>
                    <p className="text-xs text-utu-text-muted mt-0.5">{city}</p>
                    {stars > 0 && <Stars count={stars} />}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-utu-blue">{fmtPrice(totalPrice, currency)}</p>
                    <p className="text-[11px] text-utu-text-muted">{fmtPrice(pricePerNight, currency)} {tHR('perNight')}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-utu-text-muted">
                  {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} night{nights > 1 ? 's' : ''}
                </div>
              </div>
            </div>
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
  // GUEST DETAILS FORM
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-utu-bg-page">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-text-primary mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          {tCO('backToResults')}
        </button>

        <h1 className="text-2xl font-bold text-utu-text-primary mb-6">{t('title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Form ───────────────────────────────────────────────────── */}
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

              {/* Terms */}
              <label className="flex items-start gap-3 mt-5 cursor-pointer">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.agreed}
                  onClick={() => setField('agreed', !form.agreed)}
                  className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                    form.agreed ? 'bg-utu-navy border-utu-navy' : 'border-utu-border-strong bg-utu-bg-card'
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
              className="w-full bg-utu-navy hover:bg-utu-blue active:bg-utu-navy disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {t('confirm')} → {t('payment')}
            </button>
          </div>

          {/* ── Right: Booking summary ───────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 sticky top-6">
              {image && (
                <div className="relative w-full h-36 rounded-xl overflow-hidden mb-4">
                  <Image src={image} alt={name} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="space-y-2 text-sm">
                <p className="font-bold text-utu-text-primary leading-tight">{name}</p>
                {city && <p className="text-utu-text-muted text-xs">{city}</p>}
                {stars > 0 && <Stars count={stars} />}

                <div className="pt-3 border-t border-utu-border-default space-y-1.5 text-xs text-utu-text-secondary">
                  <div className="flex justify-between">
                    <span>{tCO('checkIn')}</span>
                    <span className="font-medium text-utu-text-primary">{fmtDate(checkIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{tCO('checkOut')}</span>
                    <span className="font-medium text-utu-text-primary">{fmtDate(checkOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{tCO('duration')}</span>
                    <span className="font-medium text-utu-text-primary">{nights} night{nights > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{tCO('guests')}</span>
                    <span className="font-medium text-utu-text-primary">{adults} adult{adults > 1 ? 's' : ''}, {rooms} room{rooms > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-utu-border-default">
                  <div className="flex justify-between text-xs text-utu-text-muted mb-1">
                    <span>{fmtPrice(pricePerNight, currency)} × {nights} nights</span>
                    <span>{fmtPrice(pricePerNight * nights, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-utu-text-primary">
                    <span>{tHR('totalPrice')}</span>
                    <span className="text-utu-blue">{fmtPrice(totalPrice, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
