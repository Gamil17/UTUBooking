'use client';

/**
 * IndiaPaymentSelector
 *
 * Payment method selector for India (IN) locale users.
 * UPI is shown as primary — 70%+ of Indian digital transactions use UPI.
 *
 * Supported methods:
 *   UPI        — VPA input + one-tap deeplinks (PhonePe, GPay, Paytm)
 *   NetBanking — top 5 banks (HDFC, SBI, ICICI, Axis, Kotak)
 *   Cards      — RuPay, Visa, Mastercard (3DS handled by Razorpay)
 *   EMI        — 3/6/9/12 months for bookings ≥ ₹5,000
 *   Wallets    — PayZapp, Mobikwik
 *
 * Flow:
 *   1. POST /api/payments/razorpay/initiate → { orderId, keyId, amountPaise }
 *   2. Open Razorpay Checkout with orderId + keyId
 *   3. Razorpay modal calls handler with { paymentId, orderId, signature }
 *   4. POST /api/payments/razorpay/verify → { status }
 *   5. onSuccess(paymentId) or show error
 */

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Method = 'upi' | 'netbanking' | 'card' | 'emi' | 'wallet';

interface EmiOption {
  months:        number;
  monthlyAmount: number;
  totalAmount:   number;
  labelEn:       string;
  labelHi:       string;
}

interface Props {
  bookingId:     string;
  amountINR:     number;
  onSuccess:     (paymentId: string) => void;
  onCancel:      () => void;
}

// ── UPI app metadata ───────────────────────────────────────────────────────────
const UPI_APPS = [
  { key: 'phonepe', label: 'PhonePe',  color: '#5F259F', shortCode: 'PP' },
  { key: 'gpay',    label: 'GPay',     color: '#4285F4', shortCode: 'GP' },
  { key: 'paytm',   label: 'Paytm',    color: '#00B9F5', shortCode: 'PT' },
] as const;

// Top 5 Indian banks by transaction volume
const NETBANKING_BANKS = [
  { code: 'HDFC', label: 'HDFC Bank' },
  { code: 'SBI',  label: 'State Bank of India' },
  { code: 'ICIC', label: 'ICICI Bank' },
  { code: 'UTIB', label: 'Axis Bank' },
  { code: 'KKBK', label: 'Kotak Mahindra Bank' },
] as const;

const WALLETS = [
  { code: 'payzapp',   label: 'PayZapp (HDFC)' },
  { code: 'mobikwik',  label: 'Mobikwik' },
] as const;

const EMI_SHOW_THRESHOLD_INR = 5000;

// ── INR formatting (Indian number system: lakh/crore grouping) ─────────────────
function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ── UPI VPA validation ─────────────────────────────────────────────────────────
function isValidVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9._+\-]{2,256}@[a-zA-Z]{2,64}$/.test(vpa.trim());
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function IndiaPaymentSelector({
  bookingId,
  amountINR,
  onSuccess,
  onCancel,
}: Props) {
  const [method,      setMethod]      = useState<Method>('upi');
  const [vpa,         setVpa]         = useState('');
  const [bankCode,    setBankCode]    = useState('');
  const [walletCode,  setWalletCode]  = useState('');
  const [emiMonths,   setEmiMonths]   = useState<number | null>(null);
  const [emiOptions,  setEmiOptions]  = useState<EmiOption[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [status,      setStatus]      = useState<'idle' | 'processing' | 'done'>('idle');

  const showEmi = amountINR >= EMI_SHOW_THRESHOLD_INR;

  // ── Initiate order → open Razorpay Checkout ──────────────────────────────
  async function handlePay() {
    setError('');

    if (method === 'upi' && !isValidVpa(vpa)) {
      setError('कृपया एक वैध UPI ID दर्ज करें (जैसे name@upi या 9876543210@paytm)');
      return;
    }
    if (method === 'netbanking' && !bankCode) {
      setError('कृपया अपना बैंक चुनें');
      return;
    }
    if (method === 'emi' && !emiMonths) {
      setError('कृपया EMI अवधि चुनें');
      return;
    }

    setLoading(true);
    setStatus('processing');

    try {
      // Step 1: Create Razorpay Order
      const initRes = await fetch('/api/payments/razorpay/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amount: amountINR, currency: 'INR' }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setError(initData.message ?? initData.error ?? 'ऑर्डर बनाने में विफल');
        setLoading(false);
        setStatus('idle');
        return;
      }

      if (emiOptions.length === 0 && initData.emiOptions?.length) {
        setEmiOptions(initData.emiOptions);
      }

      const { orderId, keyId, amountPaise } = initData;

      // Step 2: Open Razorpay Checkout
      // Load Razorpay JS SDK if not present (dynamic — avoids SSR issues)
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script    = document.createElement('script');
          script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload   = () => resolve();
          script.onerror  = () => reject(new Error('Failed to load Razorpay SDK'));
          document.head.appendChild(script);
        });
      }

      const rzpOptions: Record<string, unknown> = {
        key:         keyId,
        amount:      amountPaise,
        currency:    'INR',
        order_id:    orderId,
        name:        'UTUBooking',
        description: 'Hajj / Umrah Booking',
        prefill: {
          contact: '',
          email:   '',
          method:  method === 'upi' ? 'upi' : undefined,
          vpa:     method === 'upi' ? vpa.trim() : undefined,
          bank:    method === 'netbanking' ? bankCode : undefined,
          wallet:  method === 'wallet'     ? walletCode : undefined,
        },
        config: {
          display: {
            blocks: {
              upi:        { name: 'UPI',         instruments: [{ method: 'upi' }] },
              netbanking: { name: 'Net Banking',  instruments: [{ method: 'netbanking' }] },
              card:       { name: 'Cards',        instruments: [{ method: 'card' }] },
              emi:        { name: 'EMI',          instruments: [{ method: 'emi' }] },
              wallet:     { name: 'Wallets',      instruments: [{ method: 'wallet' }] },
            },
            sequence: ['block.upi', 'block.netbanking', 'block.card', 'block.emi', 'block.wallet'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          // Step 3: Verify signature server-side
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                orderId:   response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.status === 'completed') {
              setStatus('done');
              onSuccess(response.razorpay_payment_id);
            } else {
              setError('भुगतान सत्यापित नहीं हो सका। कृपया सहायता से संपर्क करें।');
              setStatus('idle');
            }
          } catch {
            setError('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
            setStatus('idle');
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus('idle');
          },
        },
        theme: { color: '#2563EB' },
      };

      // EMI — pass selected tenor
      if (method === 'emi' && emiMonths) {
        rzpOptions.emi_duration = emiMonths;
      }

      const rzp = new window.Razorpay(rzpOptions);
      rzp.open();
    } catch (err) {
      setError((err as Error).message ?? 'कुछ गलत हो गया');
      setLoading(false);
      setStatus('idle');
    }
  }

  const inputCls =
    'w-full border border-utu-border-strong rounded-xl px-4 py-3 text-base text-utu-text-primary ' +
    'focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent ' +
    'placeholder-gray-400 min-h-[44px] bg-utu-bg-card';

  const tabCls = (active: boolean) =>
    [
      'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors min-h-[44px]',
      active ? 'bg-utu-blue text-white shadow-sm' : 'text-utu-text-secondary hover:bg-utu-bg-muted',
    ].join(' ');

  return (
    <div className="w-full max-w-md mx-auto space-y-5" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>

      {/* Amount header */}
      <div className="text-center bg-utu-bg-subtle rounded-2xl py-4 px-6 border border-utu-border-default">
        <p className="text-xs text-utu-blue mb-1">कुल राशि</p>
        <p className="text-2xl font-bold text-utu-navy">{formatInr(amountINR)}</p>
      </div>

      {/* Payment method tabs */}
      <div className="bg-utu-bg-muted rounded-2xl p-1 flex gap-1 flex-wrap">
        {([
          ['upi',        'UPI'],
          ['netbanking', 'Net Banking'],
          ['card',       'Card'],
          ...(showEmi ? [['emi', 'EMI'] as [Method, string]] : []),
          ['wallet',     'Wallet'],
        ] as [Method, string][]).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMethod(m); setError(''); }}
            className={tabCls(method === m)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── UPI ──────────────────────────────────────────────────────────── */}
      {method === 'upi' && (
        <div className="space-y-4">
          {/* Quick-launch UPI app buttons */}
          <div>
            <p className="text-xs text-utu-text-muted mb-2 font-medium">ऐप से सीधे भुगतान करें</p>
            <div className="flex gap-3">
              {UPI_APPS.map(app => (
                <button
                  key={app.key}
                  type="button"
                  aria-label={`${app.label} से भुगतान करें`}
                  onClick={() => setVpa(app.key === 'paytm' ? `${vpa.split('@')[0]}@paytm` : vpa)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-utu-border-default hover:border-utu-border-strong transition-colors min-h-[60px]"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: app.color }}
                  >
                    {app.shortCode}
                  </div>
                  <span className="text-xs text-utu-text-secondary">{app.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-utu-border-default" />
            <span className="text-xs text-utu-text-muted">या UPI ID दर्ज करें</span>
            <div className="flex-1 h-px bg-utu-border-default" />
          </div>

          {/* VPA input */}
          <div className="space-y-1.5">
            <label htmlFor="upi-vpa" className="block text-sm font-medium text-utu-text-secondary">
              UPI ID (VPA)
            </label>
            <input
              id="upi-vpa"
              type="text"
              placeholder="name@upi या 9876543210@paytm"
              value={vpa}
              onChange={e => { setVpa(e.target.value); setError(''); }}
              className={inputCls}
              style={{ fontFamily: 'Inter, monospace' }}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-utu-text-muted">
              {isValidVpa(vpa) ? (
                <span className="text-utu-blue font-medium">✓ वैध UPI ID</span>
              ) : vpa.length > 3 ? (
                <span className="text-red-500">@ के बाद प्रदाता का नाम जोड़ें</span>
              ) : (
                'जैसे: yourname@oksbi, mobile@paytm'
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── NetBanking ──────────────────────────────────────────────────── */}
      {method === 'netbanking' && (
        <div className="space-y-1.5">
          <label htmlFor="nb-bank" className="block text-sm font-medium text-utu-text-secondary">
            बैंक चुनें
          </label>
          <select
            id="nb-bank"
            value={bankCode}
            onChange={e => setBankCode(e.target.value)}
            className={inputCls}
          >
            <option value="">— बैंक चुनें —</option>
            {NETBANKING_BANKS.map(b => (
              <option key={b.code} value={b.code}>{b.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Card ──────────────────────────────────────────────────────── */}
      {method === 'card' && (
        <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">RuPay · Visa · Mastercard</p>
          <p className="text-xs text-blue-600">3D Secure अनिवार्य। Razorpay का सुरक्षित फ़ॉर्म खुलेगा।</p>
        </div>
      )}

      {/* ── EMI ──────────────────────────────────────────────────────── */}
      {method === 'emi' && showEmi && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-utu-text-secondary">EMI अवधि चुनें</p>
          <div className="space-y-2">
            {(emiOptions.length > 0 ? emiOptions : getApproxEmi(amountINR)).map(opt => (
              <button
                key={opt.months}
                type="button"
                onClick={() => setEmiMonths(opt.months)}
                className={[
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all min-h-[44px]',
                  emiMonths === opt.months
                    ? 'border-utu-blue bg-utu-bg-subtle'
                    : 'border-utu-border-default hover:border-utu-border-strong',
                ].join(' ')}
              >
                <span className="font-semibold text-utu-text-primary text-sm">{opt.months} महीने</span>
                <span className="text-sm text-utu-text-secondary">{formatInr(opt.monthlyAmount)}/माह</span>
                <span className="text-xs text-utu-text-muted">कुल {formatInr(opt.totalAmount)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-utu-text-muted">* ब्याज दर बैंक-विशिष्ट है। Razorpay checkout में सटीक दर दिखाई देगी।</p>
        </div>
      )}

      {/* ── Wallets ──────────────────────────────────────────────────── */}
      {method === 'wallet' && (
        <div className="space-y-2">
          {WALLETS.map(w => (
            <button
              key={w.code}
              type="button"
              onClick={() => setWalletCode(w.code)}
              aria-pressed={walletCode === w.code}
              className={[
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all min-h-[44px]',
                walletCode === w.code
                  ? 'border-utu-blue bg-utu-bg-subtle'
                  : 'border-utu-border-default hover:border-utu-border-strong',
              ].join(' ')}
            >
              <span className="font-medium text-utu-text-primary text-sm">{w.label}</span>
              <div className={[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                walletCode === w.code ? 'border-utu-blue bg-utu-bg-subtle0' : 'border-utu-border-strong',
              ].join(' ')}>
                {walletCode === w.code && <div className="w-2 h-2 rounded-full bg-utu-bg-card" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-utu-border-strong text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted min-h-[44px]"
        >
          रद्द करें
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={loading || status === 'done'}
          className={[
            'flex-grow rounded-xl py-3 text-white text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors',
            loading || status === 'done'
              ? 'bg-utu-border-strong cursor-not-allowed'
              : 'bg-utu-blue hover:bg-utu-navy active:bg-utu-navy',
          ].join(' ')}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : null}
          {status === 'done' ? '✓ भुगतान हो गया' : 'अभी भुगतान करें'}
        </button>
      </div>
    </div>
  );
}

// ── Approx EMI helper (before server response) ─────────────────────────────────
function getApproxEmi(amountInr: number): EmiOption[] {
  const rate   = 0.15 / 12;
  const tenors = [3, 6, 9, 12];
  return tenors.map(months => {
    const monthly = Math.ceil(amountInr * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1));
    return {
      months,
      monthlyAmount: monthly,
      totalAmount:   monthly * months,
      labelEn:       `${months} months`,
      labelHi:       `${months} महीने`,
    };
  });
}

// ── Razorpay global type augmentation ─────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}
