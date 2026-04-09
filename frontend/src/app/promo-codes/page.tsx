'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const DEALS = [
  { titleKey: 'deal1Title', codeKey: 'deal1Code', descKey: 'deal1Desc', expiryKey: 'deal1Expiry', color: 'border-amber-300 bg-amber-50' },
  { titleKey: 'deal2Title', codeKey: 'deal2Code', descKey: 'deal2Desc', expiryKey: 'deal2Expiry', color: 'border-utu-border-default bg-utu-bg-subtle' },
  { titleKey: 'deal3Title', codeKey: 'deal3Code', descKey: 'deal3Desc', expiryKey: 'deal3Expiry', color: 'border-blue-300 bg-blue-50' },
  { titleKey: 'deal4Title', codeKey: 'deal4Code', descKey: 'deal4Desc', expiryKey: 'deal4Expiry', color: 'border-purple-300 bg-purple-50' },
] as const;

const HOW_TO_STEPS = ['step1', 'step2', 'step3', 'step4'] as const;
const TERMS = ['terms1', 'terms2', 'terms3', 'terms4'] as const;

export default function PromoCodesPage() {
  const t = useTranslations('promoCodes');
  const [code, setCode] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyCode(val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedKey(val);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Hero */}
      <section className="bg-utu-navy py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
          {t('heroTagline')}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto text-lg mb-8">{t('heroDesc')}</p>

        {/* Code check input */}
        <div className="max-w-md mx-auto">
          <p className="text-sm text-white/80 mb-3">{t('checkCode')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('codePlaceholder')}
              className="flex-1 rounded-xl border border-utu-blue bg-utu-navy px-4 py-3 text-sm text-white placeholder:text-utu-blue focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <Link
              href={`/?promo=${encodeURIComponent(code)}`}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-5 py-3 text-sm transition-colors"
            >
              {t('applyBtn')}
            </Link>
          </div>
        </div>
      </section>

      {/* Active Deals */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-utu-text-primary mb-8">{t('activeDeals')}</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {DEALS.map((deal) => {
            const codeVal = t(deal.codeKey);
            return (
              <div
                key={deal.codeKey}
                className={`rounded-2xl border-2 p-5 shadow-sm ${deal.color}`}
              >
                <h3 className="font-bold text-utu-text-primary mb-1">{t(deal.titleKey)}</h3>
                <p className="text-sm text-utu-text-secondary mb-3">{t(deal.descKey)}</p>

                {/* Code pill + copy */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-lg bg-utu-bg-card border border-utu-border-default px-3 py-1.5 font-mono text-sm font-bold text-utu-text-primary tracking-wider">
                    {codeVal}
                  </span>
                  <button
                    onClick={() => copyCode(codeVal)}
                    className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
                    style={{ minHeight: 36 }}
                  >
                    {copiedKey === codeVal ? t('copied') : t('copyCode')}
                  </button>
                </div>

                <p className="text-xs text-utu-text-muted">{t(deal.expiryKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How to Use */}
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

      {/* Terms */}
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
