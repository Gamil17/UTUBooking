'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiPromo {
  id:             string;
  code:           string;
  title:          string;
  description:    string | null;
  discount_type:  'percent' | 'fixed';
  discount_value: number;
  currency:       string;
  expires_at:     string | null;
}

interface ValidateResult {
  valid?:          boolean;
  error?:          string;
  title?:          string;
  discount_type?:  'percent' | 'fixed';
  discount_value?: number;
  currency?:       string;
  message?:        string;
}

// ─── Error code → user-facing message map ────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  CODE_NOT_FOUND:    'Code not found. Check for typos.',
  CODE_INACTIVE:     'This code is no longer active.',
  CODE_EXPIRED:      'This code has expired.',
  CODE_EXHAUSTED:    'This code has reached its usage limit.',
  MIN_ORDER_NOT_MET: 'Order minimum not met for this code.',
  CODE_REQUIRED:     'Please enter a promo code.',
};

// ─── Hardcoded fallback deals (i18n) ──────────────────────────────────────────

const FALLBACK_DEALS = [
  { titleKey: 'deal1Title', codeKey: 'deal1Code', descKey: 'deal1Desc', expiryKey: 'deal1Expiry', color: 'border-amber-300 bg-amber-50' },
  { titleKey: 'deal2Title', codeKey: 'deal2Code', descKey: 'deal2Desc', expiryKey: 'deal2Expiry', color: 'border-utu-border-default bg-utu-bg-subtle' },
  { titleKey: 'deal3Title', codeKey: 'deal3Code', descKey: 'deal3Desc', expiryKey: 'deal3Expiry', color: 'border-blue-300 bg-blue-50' },
  { titleKey: 'deal4Title', codeKey: 'deal4Code', descKey: 'deal4Desc', expiryKey: 'deal4Expiry', color: 'border-purple-300 bg-purple-50' },
] as const;

const CARD_COLORS = [
  'border-amber-300 bg-amber-50',
  'border-utu-border-default bg-utu-bg-subtle',
  'border-blue-300 bg-blue-50',
  'border-purple-300 bg-purple-50',
  'border-emerald-300 bg-emerald-50',
];

const HOW_TO_STEPS = ['step1', 'step2', 'step3', 'step4'] as const;
const TERMS        = ['terms1', 'terms2', 'terms3', 'terms4'] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromoCodesPage() {
  const t = useTranslations('promoCodes');

  const [code,       setCode]       = useState('');
  const [copiedKey,  setCopiedKey]  = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [result,     setResult]     = useState<ValidateResult | null>(null);

  const [apiPromos, setApiPromos] = useState<ApiPromo[]>([]);

  // Fetch active promo codes from backend on mount
  useEffect(() => {
    fetch('/api/promo-codes')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (Array.isArray(json?.data) && json.data.length > 0) {
          setApiPromos(json.data);
        }
      })
      .catch(() => {/* fallback to hardcoded */});
  }, []);

  function copyCode(val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedKey(val);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleValidate() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setResult({ error: 'CODE_REQUIRED' });
      return;
    }
    setValidating(true);
    setResult(null);
    try {
      const res  = await fetch('/api/promo-codes/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: trimmed }),
      });
      const json: ValidateResult = await res.json();
      setResult(json);
    } catch {
      setResult({ error: 'AUTH_SERVICE_UNAVAILABLE', message: 'Could not reach server. Please try again.' });
    } finally {
      setValidating(false);
    }
  }

  function formatDiscount(promo: ApiPromo): string {
    if (promo.discount_type === 'percent') return `${promo.discount_value}% off`;
    return `${promo.currency} ${promo.discount_value} off`;
  }

  function formatExpiry(iso: string | null): string {
    if (!iso) return '';
    return `Expires ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-utu-navy py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
          {t('heroTagline')}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto text-lg mb-8">{t('heroDesc')}</p>

        {/* Code validation input */}
        <div className="max-w-md mx-auto">
          <p className="text-sm text-white/80 mb-3">{t('checkCode')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleValidate(); }}
              placeholder={t('codePlaceholder')}
              className="flex-1 rounded-xl border border-utu-blue bg-utu-navy px-4 py-3 text-sm text-white placeholder:text-utu-blue focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={handleValidate}
              disabled={validating}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-5 py-3 text-sm transition-colors disabled:opacity-60"
            >
              {validating ? '…' : t('applyBtn')}
            </button>
          </div>

          {/* Validation result */}
          {result && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium text-start ${
              result.valid
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
                : 'bg-red-500/20 text-red-200 border border-red-400/30'
            }`}>
              {result.valid ? (
                <>
                  <span className="font-bold">{result.code}</span> — {result.title}.{' '}
                  {result.discount_type === 'percent'
                    ? `${result.discount_value}% off`
                    : `${result.currency} ${result.discount_value} off`}{' '}
                  at checkout.
                </>
              ) : (
                result.message ?? (result.error ? ERROR_MESSAGES[result.error] ?? 'Invalid code.' : 'Invalid code.')
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Active Deals ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-utu-text-primary mb-8">{t('activeDeals')}</h2>

        {apiPromos.length > 0 ? (
          /* DB-backed cards */
          <div className="grid sm:grid-cols-2 gap-5">
            {apiPromos.map((promo, i) => (
              <div
                key={promo.id}
                className={`rounded-2xl border-2 p-5 shadow-sm ${CARD_COLORS[i % CARD_COLORS.length]}`}
              >
                <h3 className="font-bold text-utu-text-primary mb-1">{promo.title}</h3>
                {promo.description && (
                  <p className="text-sm text-utu-text-secondary mb-3">{promo.description}</p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-lg bg-utu-bg-card border border-utu-border-default px-3 py-1.5 font-mono text-sm font-bold text-utu-text-primary tracking-wider">
                    {promo.code}
                  </span>
                  <button
                    onClick={() => copyCode(promo.code)}
                    className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
                  >
                    {copiedKey === promo.code ? t('copied') : t('copyCode')}
                  </button>
                  <span className="ms-auto text-xs font-semibold text-utu-blue">
                    {formatDiscount(promo)}
                  </span>
                </div>

                {promo.expires_at && (
                  <p className="text-xs text-utu-text-muted">{formatExpiry(promo.expires_at)}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: hardcoded i18n deals */
          <div className="grid sm:grid-cols-2 gap-5">
            {FALLBACK_DEALS.map((deal) => {
              const codeVal = t(deal.codeKey);
              return (
                <div
                  key={deal.codeKey}
                  className={`rounded-2xl border-2 p-5 shadow-sm ${deal.color}`}
                >
                  <h3 className="font-bold text-utu-text-primary mb-1">{t(deal.titleKey)}</h3>
                  <p className="text-sm text-utu-text-secondary mb-3">{t(deal.descKey)}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-lg bg-utu-bg-card border border-utu-border-default px-3 py-1.5 font-mono text-sm font-bold text-utu-text-primary tracking-wider">
                      {codeVal}
                    </span>
                    <button
                      onClick={() => copyCode(codeVal)}
                      className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
                    >
                      {copiedKey === codeVal ? t('copied') : t('copyCode')}
                    </button>
                  </div>

                  <p className="text-xs text-utu-text-muted">{t(deal.expiryKey)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── How to Use ───────────────────────────────────────────────────── */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary mb-8">{t('howToUse')}</h2>
          <ol className="space-y-4">
            {HOW_TO_STEPS.map((key, i) => (
              <li key={key} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-utu-blue text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm text-utu-text-secondary">{t(key)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Terms ────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-lg font-semibold text-utu-text-primary mb-4">{t('termsHeading')}</h2>
        <ul className="space-y-2">
          {TERMS.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-utu-text-muted">
              <span className="mt-1 shrink-0 text-utu-blue">•</span>
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
