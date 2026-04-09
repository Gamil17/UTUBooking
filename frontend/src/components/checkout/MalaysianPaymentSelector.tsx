'use client';

/**
 * MalaysianPaymentSelector
 *
 * Shown for MY country code users (currency = MYR) at checkout.
 * Gateway: iPay88 — Malaysia's leading payment aggregator
 * EXCEPTION: #0A67B2 is iPay88/FPX official brand blue. Do not replace with design tokens.
 *
 * Supported methods:
 *   FPX (Financial Process Exchange) — all Malaysian banks
 *   DuitNow QR — instant mobile QR payment (Bank Negara Malaysia)
 *   Touch 'n Go eWallet — largest Malaysian e-wallet (18M+ users)
 *   GrabPay Malaysia — ride-hailing + payments
 *   Credit / Debit Card — Visa, Mastercard, American Express
 *
 * Flow:
 *   1. Customer selects payment method (and bank if FPX)
 *   2. POST /api/payments/ipay88/initiate → { paymentUrl, formParams }
 *   3. Hidden form is dynamically submitted to iPay88's payment URL
 *   4. Customer completes payment on iPay88 site
 *   5. iPay88 redirects browser to IPAY88_RESPONSE_URL (our return page)
 *   6. iPay88 also POSTs silently to IPAY88_BACKEND_URL (server-side verification)
 *
 * Env vars required: IPAY88_MERCHANT_CODE, IPAY88_MERCHANT_KEY,
 *                    IPAY88_RESPONSE_URL, IPAY88_BACKEND_URL
 */

import { useState, useCallback } from 'react';
import { formatPrice } from '@/utils/formatting';

// ── Types ──────────────────────────────────────────────────────────────────────
type MethodId = 'fpx' | 'duitnow' | 'tng' | 'grabpay' | 'card';
type Step     = 'select' | 'loading' | 'redirecting' | 'failed';

interface Method {
  id:      MethodId;
  label:   string;
  tagline: string;
  color:   string;
  logo:    string;          // short text logo placeholder
  paymentId: string;        // iPay88 PaymentId
}

interface FPXBank {
  code:  string;
  label: string;
}

interface Props {
  bookingId:      string;
  amountMYR:      number;
  onCancel:       () => void;
  customerName?:  string;
  customerEmail?: string;
  customerPhone?: string;
}

// ── Payment methods ────────────────────────────────────────────────────────────
const METHODS: Method[] = [
  {
    id:        'fpx',
    label:     'FPX Online Banking',
    tagline:   'Semua bank Malaysia — cepat & selamat',
    color:     '#0A67B2',
    logo:      'FPX',
    paymentId: '6',      // MEPS FPX all banks
  },
  {
    id:        'duitnow',
    label:     'DuitNow QR',
    tagline:   'Imbas QR dari mana-mana aplikasi bank',
    color:     '#E8192C',
    logo:      'DN',
    paymentId: '523',
  },
  {
    id:        'tng',
    label:     "Touch 'n Go eWallet",
    tagline:   '18 juta+ pengguna aktif',
    color:     '#1A60B9',
    logo:      'TnG',
    paymentId: '538',
  },
  {
    id:        'grabpay',
    label:     'GrabPay',
    tagline:   'Bayar dengan baki GrabPay anda',
    color:     '#00B14F',
    logo:      'GP',
    paymentId: '523',
  },
  {
    id:        'card',
    label:     'Kad Kredit / Debit',
    tagline:   'Visa · Mastercard · AmEx',
    color:     '#374151',
    logo:      'CC',
    paymentId: '1',
  },
];

// Popular FPX banks
const FPX_BANKS: FPXBank[] = [
  { code: 'maybank',    label: 'Maybank2U' },
  { code: 'cimb',      label: 'CIMB Clicks' },
  { code: 'publicbank', label: 'Public Bank' },
  { code: 'rhb',       label: 'RHB Now' },
  { code: 'hongleong', label: 'Hong Leong' },
  { code: 'ambank',    label: 'AmBank' },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function MalaysianPaymentSelector({
  bookingId,
  amountMYR,
  onCancel,
  customerName,
  customerEmail,
  customerPhone,
}: Props) {
  const [selected,  setSelected]  = useState<MethodId>('fpx');
  const [fpxBank,   setFpxBank]   = useState<string>('maybank');
  const [step,      setStep]      = useState<Step>('select');
  const [errorMsg,  setErrorMsg]  = useState('');

  const formattedAmount = formatPrice(amountMYR, 'ms');
  const method = METHODS.find(m => m.id === selected)!;

  // ── Submit to iPay88 ───────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    setStep('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/payments/ipay88/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bookingId,
          amount:        amountMYR,
          paymentId:     method.paymentId,
          remark:        `UTUBooking — ${method.label}`,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = await res.json() as {
        paymentUrl:  string;
        formParams:  Record<string, string>;
        error?:      string;
      };

      if (!res.ok || data.error) {
        setStep('failed');
        setErrorMsg(data.error ?? 'Pembayaran tidak dapat dimulakan. Sila cuba lagi.');
        return;
      }

      setStep('redirecting');

      // Build a hidden form and submit to iPay88
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.paymentUrl;

      Object.entries(data.formParams).forEach(([key, value]) => {
        const input   = document.createElement('input');
        input.type    = 'hidden';
        input.name    = key;
        input.value   = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch {
      setStep('failed');
      setErrorMsg('Perkhidmatan pembayaran tidak tersedia buat masa ini.');
    }
  }, [bookingId, amountMYR, method, customerName, customerEmail, customerPhone]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Amount summary ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-utu-bg-muted border border-utu-border-default px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-utu-text-muted">Jumlah Bayaran</span>
        <span className="text-lg font-bold text-utu-text-primary">{formattedAmount}</span>
      </div>

      {/* ── Method selector ────────────────────────────────────────────── */}
      {step === 'select' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-utu-text-secondary">Pilih kaedah pembayaran</p>

          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(m.id)}
              aria-pressed={selected === m.id}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-left
                ${selected === m.id
                  ? 'border-utu-blue bg-utu-bg-subtle'
                  : 'border-utu-border-default bg-utu-bg-card hover:border-utu-border-strong'
                }`}
              style={{ minHeight: 56 }}
            >
              <span
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{ backgroundColor: m.color }}
              >
                {m.logo}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-utu-text-primary">{m.label}</span>
                <span className="block text-xs text-utu-text-muted">{m.tagline}</span>
              </span>
              {selected === m.id && (
                <svg className="w-5 h-5 text-utu-blue flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}

          {/* FPX bank selector */}
          {selected === 'fpx' && (
            <div className="ps-2">
              <p className="text-xs text-utu-text-muted mb-2">Pilih bank anda:</p>
              <div className="grid grid-cols-2 gap-2">
                {FPX_BANKS.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => setFpxBank(b.code)}
                    aria-pressed={fpxBank === b.code}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-left
                      ${fpxBank === b.code
                        ? 'border-[#0A67B2] bg-blue-50 text-[#0A67B2]'
                        : 'border-utu-border-default bg-utu-bg-card text-utu-text-secondary hover:border-utu-border-strong'
                      }`}
                    style={{ minHeight: 40 }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-utu-border-default text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted transition-colors"
              style={{ minHeight: 48 }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handlePay}
              className="flex-[2] text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              style={{ minHeight: 48, backgroundColor: method.color }}
            >
              Teruskan ke {method.label}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading / Redirecting ──────────────────────────────────────── */}
      {(step === 'loading' || step === 'redirecting') && (
        <div className="flex flex-col items-center gap-3 py-10">
          <span
            className="w-8 h-8 border-[3px] border-utu-border-default rounded-full animate-spin"
            style={{ borderTopColor: method.color }}
          />
          <p className="text-sm text-utu-text-muted">
            {step === 'loading'
              ? 'Sesi pembayaran sedang dibuka…'
              : `Anda akan dipindahkan ke ${method.label}…`}
          </p>
          <p className="text-xs text-utu-text-muted">Jangan tutup tab ini</p>
        </div>
      )}

      {/* ── Failed ────────────────────────────────────────────────────── */}
      {step === 'failed' && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMsg || 'Pembayaran gagal.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-utu-text-muted underline underline-offset-2"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => { setStep('select'); setErrorMsg(''); }}
              className="text-sm text-red-600 underline underline-offset-2"
            >
              Cuba Lagi
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
