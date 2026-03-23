'use client';

/**
 * PakistanPaymentSelector
 *
 * Shown for PK country code users at checkout.
 * Primary:   JazzCash  (Jazz/Mobilink — 60M+ users)
 * Secondary: Easypaisa (Telenor Pakistan — 40M+ users)
 *
 * Both are mobile wallet payments — customer enters their Pakistan
 * mobile number and confirms with PIN/OTP in their wallet app.
 * No card details needed.
 *
 * Flow:
 *   1. User picks wallet + enters mobile number
 *   2. POST /api/payments/{jazzcash|easypaisa}/initiate
 *   3. Poll status endpoint every 3 seconds for up to 3 minutes
 *   4. On 'completed' → show confirmation; on 'failed' → show error
 */

import { useState, useEffect, useRef } from 'react';
import { formatPrice } from '@/utils/formatting';

// ── Types ──────────────────────────────────────────────────────────────────────
type Wallet    = 'jazzcash' | 'easypaisa';
type StepState = 'select' | 'awaiting' | 'completed' | 'failed';

interface Props {
  bookingId:    string;
  amountPKR:    number;
  onSuccess:    (ref: string, gateway: string) => void;
  onCancel:     () => void;
  /** Pre-fill customer mobile number if available from booking form */
  defaultMobile?: string;
}

// ── Wallet metadata ────────────────────────────────────────────────────────────
const WALLETS = {
  jazzcash: {
    name:       'JazzCash',
    tagline:    'Jazz / Mobilink — 60M+ صارفین',
    color:      '#D60B0B',          // JazzCash red
    textColor:  '#FFFFFF',
    logo:       'JZ',               // placeholder — swap with actual SVG/image
    hint:       '03xx-xxxxxxx (Jazz نمبر)',
    statusKey:  'txnRefNo',
  },
  easypaisa: {
    name:       'Easypaisa',
    tagline:    'Telenor Pakistan — 40M+ صارفین',
    color:      '#009688',          // Easypaisa teal
    textColor:  '#FFFFFF',
    logo:       'EP',
    hint:       '034x-xxxxxxx (Telenor نمبر)',
    statusKey:  'orderRef',
  },
} as const;

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 180_000; // 3 minutes

// ── Component ──────────────────────────────────────────────────────────────────
export default function PakistanPaymentSelector({
  bookingId,
  amountPKR,
  onSuccess,
  onCancel,
  defaultMobile = '',
}: Props) {
  const [selectedWallet, setSelectedWallet] = useState<Wallet>('jazzcash');
  const [mobileNumber,   setMobileNumber]   = useState(defaultMobile);
  const [step,           setStep]           = useState<StepState>('select');
  const [paymentRef,     setPaymentRef]     = useState('');
  const [errorMessage,   setErrorMessage]   = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [pollElapsed,    setPollElapsed]    = useState(0);

  const pollTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed    = useRef(0);

  // Format PKR with Urdu locale
  const formattedAmount = formatPrice(amountPKR, 'ur');

  // ── Validate Pakistan mobile number ────────────────────────────────────────
  function isMobileValid(n: string): boolean {
    return /^03\d{9}$/.test(n.replace(/[-\s]/g, ''));
  }

  // ── Initiate payment ───────────────────────────────────────────────────────
  async function handlePay() {
    const normalised = mobileNumber.replace(/[-\s]/g, '');
    if (!isMobileValid(normalised)) {
      setErrorMessage('براہ کرم ایک درست پاکستانی موبائل نمبر درج کریں (03xxxxxxxxx)');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/payments/${selectedWallet}/initiate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amount: amountPKR, mobileNumber: normalised }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message ?? data.error ?? 'ادائیگی شروع نہیں ہو سکی');
        setSubmitting(false);
        return;
      }

      const ref = data[WALLETS[selectedWallet].statusKey] ?? data.txnRefNo ?? data.orderRef;
      setPaymentRef(ref);
      setStep('awaiting');
      startPolling(ref);
    } catch {
      setErrorMessage('نیٹ ورک کی خرابی۔ براہ کرم دوبارہ کوشش کریں۔');
      setSubmitting(false);
    }
  }

  // ── Poll for status ────────────────────────────────────────────────────────
  function startPolling(ref: string) {
    elapsed.current = 0;
    pollTimer.current = setInterval(async () => {
      elapsed.current += POLL_INTERVAL_MS;
      setPollElapsed(elapsed.current);

      if (elapsed.current >= POLL_TIMEOUT_MS) {
        stopPolling();
        setStep('failed');
        setErrorMessage('وقت ختم ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔');
        return;
      }

      try {
        const res  = await fetch(`/api/payments/${selectedWallet}/status/${ref}`);
        const data = await res.json();

        if (data.status === 'completed') {
          stopPolling();
          setStep('completed');
          onSuccess(ref, selectedWallet);
        } else if (data.status === 'failed') {
          stopPolling();
          setStep('failed');
          setErrorMessage(data.responseMessage ?? 'ادائیگی ناکام ہو گئی۔');
        }
        // 'pending' → keep polling
      } catch {
        // Network error during poll — keep trying until timeout
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  const wallet   = WALLETS[selectedWallet];
  const progress = Math.min((pollElapsed / POLL_TIMEOUT_MS) * 100, 100);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="w-full max-w-md mx-auto"
      style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
    >

      {/* ── Step 1: Select wallet + enter mobile ─────────────────────────── */}
      {step === 'select' && (
        <div className="space-y-5">
          {/* Amount header */}
          <div className="text-center bg-emerald-50 rounded-2xl py-4 px-6 border border-emerald-100">
            <p className="text-xs text-emerald-600 mb-1">کل رقم</p>
            <p className="text-2xl font-bold text-emerald-800" style={{ lineHeight: 2 }}>
              {formattedAmount}
            </p>
          </div>

          {/* Wallet selection */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium" style={{ lineHeight: 2 }}>
              ادائیگی کا طریقہ منتخب کریں
            </p>

            {(Object.keys(WALLETS) as Wallet[]).map(w => {
              const meta    = WALLETS[w];
              const checked = selectedWallet === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWallet(w)}
                  className={[
                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-right',
                    checked
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                  aria-pressed={checked}
                >
                  {/* Logo badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                    style={{ backgroundColor: meta.color, color: meta.textColor }}
                  >
                    {meta.logo}
                  </div>

                  {/* Name + tagline */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base" style={{ lineHeight: 2 }}>
                      {meta.name}
                    </p>
                    <p className="text-xs text-gray-500" style={{ lineHeight: 2 }}>
                      {meta.tagline}
                    </p>
                  </div>

                  {/* Radio indicator */}
                  <div className={[
                    'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    checked ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300',
                  ].join(' ')}>
                    {checked && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile number input */}
          <div className="space-y-1.5">
            <label
              htmlFor="pk-mobile"
              className="block text-sm font-medium text-gray-700"
              style={{ lineHeight: 2 }}
            >
              موبائل نمبر
            </label>
            <input
              id="pk-mobile"
              type="tel"
              dir="ltr"                           // phone numbers are always LTR
              inputMode="numeric"
              placeholder="03xxxxxxxxx"
              value={mobileNumber}
              onChange={e => { setMobileNumber(e.target.value); setErrorMessage(''); }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 min-h-[44px]"
              style={{ fontFamily: 'Inter, sans-serif', textAlign: 'left' }}
              maxLength={13}
            />
            <p className="text-xs text-gray-400" style={{ lineHeight: 2, direction: 'rtl' }}>
              {wallet.hint}
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3" style={{ lineHeight: 2 }}>
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
              style={{ lineHeight: 2 }}
            >
              منسوخ
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={submitting || !mobileNumber}
              className={[
                'flex-2 flex-grow rounded-xl py-3 text-white text-sm font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2',
                submitting || !mobileNumber
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
              ].join(' ')}
              style={{ lineHeight: 2 }}
            >
              {submitting
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : null}
              {wallet.name} سے ادا کریں
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Awaiting customer confirmation ─────────────────────────── */}
      {step === 'awaiting' && (
        <div className="text-center space-y-6 py-4">
          {/* Wallet badge */}
          <div
            className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black text-white"
            style={{ backgroundColor: wallet.color }}
          >
            {wallet.logo}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900" style={{ lineHeight: 2 }}>
              {wallet.name} ایپ کھولیں
            </h3>
            <p className="text-sm text-gray-600 mt-2 leading-loose">
              آپ کے موبائل پر ادائیگی کی درخواست بھیجی گئی ہے۔
              <br />
              اپنا PIN داخل کر کے تصدیق کریں۔
            </p>
          </div>

          {/* Amount reminder */}
          <div className="bg-gray-50 rounded-xl py-3 px-5">
            <p className="text-xs text-gray-500" style={{ lineHeight: 2 }}>ادائیگی کی رقم</p>
            <p className="text-xl font-bold text-emerald-700" style={{ lineHeight: 2 }}>
              {formattedAmount}
            </p>
          </div>

          {/* Progress bar (timeout indicator) */}
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {Math.max(0, Math.round((POLL_TIMEOUT_MS - pollElapsed) / 1000))} سیکنڈ باقی
            </p>
          </div>

          {/* Spinning indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span style={{ lineHeight: 2 }}>تصدیق کا انتظار ہے…</span>
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => { stopPolling(); setStep('select'); }}
            className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
            style={{ lineHeight: 2 }}
          >
            منسوخ کریں
          </button>
        </div>
      )}

      {/* ── Step 3: Completed ─────────────────────────────────────────────── */}
      {step === 'completed' && (
        <div className="text-center space-y-4 py-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-emerald-700" style={{ lineHeight: 2 }}>
            ادائیگی کامیاب!
          </h3>
          <p className="text-sm text-gray-600" style={{ lineHeight: 2 }}>
            آپ کی بکنگ تصدیق شدہ ہے۔
          </p>
          <p className="text-xs text-gray-400 font-mono" dir="ltr">{paymentRef}</p>
        </div>
      )}

      {/* ── Step 4: Failed ────────────────────────────────────────────────── */}
      {step === 'failed' && (
        <div className="text-center space-y-4 py-6">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-red-600" style={{ lineHeight: 2 }}>
            ادائیگی ناکام
          </h3>
          {errorMessage && (
            <p className="text-sm text-gray-600" style={{ lineHeight: 2 }}>{errorMessage}</p>
          )}
          <button
            type="button"
            onClick={() => { setStep('select'); setErrorMessage(''); }}
            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[44px]"
            style={{ lineHeight: 2 }}
          >
            دوبارہ کوشش کریں
          </button>
        </div>
      )}
    </div>
  );
}
