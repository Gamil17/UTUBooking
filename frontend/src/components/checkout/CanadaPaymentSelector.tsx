'use client';

/**
 * CanadaPaymentSelector
 *
 * Payment selector for Canadian users (Phase 11).
 * Two methods:
 *   1. Interac Online (primary) — redirect-based via Bambora/Worldline
 *   2. Card (Stripe)            — dispatches `utu:switch-to-stripe` CustomEvent
 *
 * Interac Online flow:
 *   POST /api/payments/interac/initiate → { redirectUrl, paymentId, bamboraId }
 *   → redirect → Interac bank portal
 *   → bank redirects → /api/payments/interac/return (backend handler)
 *   → backend redirects → /booking/confirmation?paymentId=XXX
 *
 * Quebec Note: interface rendered in French if locale === 'fr' (Law 25 / Bill 96).
 * Locale is passed as prop from the parent checkout page which reads x-locale-override.
 */

import { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Method = 'interac' | 'card';
type Phase  = 'idle' | 'loading' | 'redirecting' | 'error';

interface Props {
  bookingId:     string;
  amountCAD:     number;
  customerEmail: string;
  customerName:  string;
  onSuccess:     (paymentId: string) => void;
  onCancel:      () => void;
  locale?:       string; // 'fr' for Quebec; defaults to English
}

// ── Strings ───────────────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    total:             'Total',
    interac:           'Interac Online',
    card:              'Credit / Debit Card',
    interacTitle:      'Pay with Interac Online',
    interacSubtitle:   "You'll be redirected to your bank's secure Interac portal. Supported by all major Canadian banks.",
    interacBtn:        'Pay with Interac Online',
    connecting:        'Connecting to Interac…',
    redirecting:       'Redirecting to your bank…',
    cardInfo:          'Secure card payment powered by Stripe.',
    cardSub:           'Visa, Mastercard, American Express. Apple Pay and Google Pay also available.',
    cancel:            'Cancel',
    trust_interac:     'Interac Online secured by Bambora (Worldline Canada). Bank-grade security.',
    trust_card:        'Payments secured by Stripe. SSL encrypted.',
    bankList:          'Supported: RBC, TD, BMO, Scotiabank, CIBC, Desjardins, National Bank',
    errorPrefix:       'Payment error',
  },
  fr: {
    total:             'Total',
    interac:           'Interac en ligne',
    card:              'Carte de crédit / débit',
    interacTitle:      'Payer avec Interac en ligne',
    interacSubtitle:   "Vous serez redirigé vers le portail sécurisé Interac de votre banque. Pris en charge par toutes les grandes banques canadiennes.",
    interacBtn:        'Payer avec Interac en ligne',
    connecting:        'Connexion à Interac…',
    redirecting:       'Redirection vers votre banque…',
    cardInfo:          'Paiement par carte sécurisé par Stripe.',
    cardSub:           'Visa, Mastercard, American Express. Apple Pay et Google Pay disponibles.',
    cancel:            'Annuler',
    trust_interac:     'Interac en ligne sécurisé par Bambora (Worldline Canada). Sécurité bancaire.',
    trust_card:        'Paiements sécurisés par Stripe. Chiffrement SSL.',
    bankList:          'Compatible : RBC, TD, BMO, Banque Scotia, CIBC, Desjardins, Banque Nationale',
    errorPrefix:       'Erreur de paiement',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style:    'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CanadaPaymentSelector({
  bookingId,
  amountCAD,
  customerEmail,
  customerName,
  onSuccess,
  onCancel,
  locale = 'en',
}: Props) {
  const t = locale === 'fr' ? STRINGS.fr : STRINGS.en;

  const [method, setMethod] = useState<Method>('interac');
  const [phase,  setPhase]  = useState<Phase>('idle');
  const [error,  setError]  = useState('');

  const formattedAmount = formatCAD(amountCAD);

  // ── Handle return from Bambora if page is re-loaded after bank redirect ────
  // The backend /interac/return handler already processes the outcome and
  // redirects to /booking/confirmation — so we only need a loading indicator
  // if we somehow land back on this page (edge case for SPAs).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const approved = params.get('approved');
    const pid      = params.get('paymentId');
    if (approved === '1' && pid) {
      onSuccess(pid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Switch method ─────────────────────────────────────────────────────────
  function switchMethod(m: Method) {
    setMethod(m);
    setPhase('idle');
    setError('');

    if (m === 'card') {
      window.dispatchEvent(new CustomEvent('utu:switch-to-stripe', {
        detail: { bookingId, amount: amountCAD, currency: 'CAD', countryCode: 'CA' },
      }));
    }
  }

  // ── Interac: initiate ─────────────────────────────────────────────────────
  async function handleInteracStart() {
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/payments/interac/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amountCAD, customerEmail, customerName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Failed to start Interac payment');
        setPhase('error');
        return;
      }
      setPhase('redirecting');
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setPhase('error');
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const tabCls = (active: boolean) =>
    [
      'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors min-h-[44px]',
      active ? 'bg-[#D32F2F] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
    ].join(' ');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto space-y-5">

      {/* Amount */}
      <div className="text-center bg-red-50 rounded-2xl py-4 px-6 border border-red-100">
        <p className="text-xs text-red-700 mb-1">{t.total}</p>
        <p className="text-2xl font-bold text-red-900">{formattedAmount}</p>
        <p className="text-xs text-red-500 mt-0.5">CAD</p>
      </div>

      {/* Method tabs */}
      <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => switchMethod('interac')}
          className={tabCls(method === 'interac')}
          aria-pressed={method === 'interac'}
        >
          {t.interac}
        </button>
        <button
          type="button"
          onClick={() => switchMethod('card')}
          className={tabCls(method === 'card')}
          aria-pressed={method === 'card'}
        >
          {t.card}
        </button>
      </div>

      {/* ── Interac Online flow ─────────────────────────────────────────────── */}
      {method === 'interac' && (
        <div className="space-y-4">

          {phase === 'idle' && (
            <div className="space-y-3">
              {/* Info box */}
              <div className="bg-red-50 rounded-xl px-4 py-4 border border-red-100 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Interac wordmark colours: red #D32F2F + yellow #FFC107 */}
                  <span className="text-[#D32F2F] font-black text-base tracking-tight">
                    inter<span className="text-[#FFC107]">ac</span>
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Online</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">{t.interacTitle}</p>
                <p className="text-xs text-gray-600">{t.interacSubtitle}</p>
                <p className="text-xs text-gray-500 pt-1">{t.bankList}</p>
              </div>

              <button
                type="button"
                onClick={handleInteracStart}
                className="w-full bg-[#D32F2F] hover:bg-red-700 text-white rounded-xl py-3.5 text-sm font-bold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                aria-label={t.interacBtn}
              >
                {/* Interac icon — red/yellow wordmark inline */}
                <span className="font-black tracking-tight">
                  inter<span className="text-yellow-300">ac</span>
                </span>
                <span>— {t.interacBtn.replace('Pay with Interac Online', '').replace('Payer avec Interac en ligne', '').trim() || t.interacBtn}</span>
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
              <span className="w-5 h-5 border-2 border-red-200 border-t-[#D32F2F] rounded-full animate-spin" />
              <span className="text-sm">{t.connecting}</span>
            </div>
          )}

          {phase === 'redirecting' && (
            <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
              <span className="w-5 h-5 border-2 border-red-200 border-t-[#D32F2F] rounded-full animate-spin" />
              <span className="text-sm">{t.redirecting}</span>
            </div>
          )}

          {phase === 'error' && (
            <button
              type="button"
              onClick={() => { setPhase('idle'); setError(''); }}
              className="w-full bg-[#D32F2F] hover:bg-red-700 text-white rounded-xl py-3.5 text-sm font-bold min-h-[44px]"
            >
              {t.interacBtn}
            </button>
          )}
        </div>
      )}

      {/* ── Card (Stripe placeholder) ────────────────────────────────────────── */}
      {method === 'card' && (
        <div className="bg-gray-50 rounded-2xl px-4 py-5 text-sm text-gray-500 text-center border border-gray-200">
          <p className="font-medium text-gray-700 mb-1">{t.card}</p>
          <p className="text-xs">{t.cardInfo}</p>
          <p className="text-xs mt-1">{t.cardSub}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          {t.errorPrefix}: {error}
        </p>
      )}

      {/* Cancel */}
      {phase !== 'redirecting' && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 min-h-[44px]"
        >
          {t.cancel}
        </button>
      )}

      {/* Trust badge */}
      <p className="text-xs text-center text-gray-400">
        {method === 'interac' ? t.trust_interac : t.trust_card}
      </p>
    </div>
  );
}
