import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AffiliateApplyForm from '../AffiliateApplyForm';

export const metadata: Metadata = {
  title: 'Apply — UTUBooking Affiliate Program',
  description: 'Apply to the UTUBooking affiliate program. Earn up to 8% CPS commission on hotels, flights, and car rentals. 30-day cookie, monthly payouts.',
};

// ── GEO list with flags ───────────────────────────────────────────────────────
const GEOS = [
  { flag: '🇸🇦', name: 'Saudi Arabia' },
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇰🇼', name: 'Kuwait' },
  { flag: '🇶🇦', name: 'Qatar' },
  { flag: '🇧🇭', name: 'Bahrain' },
  { flag: '🇴🇲', name: 'Oman' },
  { flag: '🇪🇬', name: 'Egypt' },
  { flag: '🇯🇴', name: 'Jordan' },
  { flag: '🇵🇰', name: 'Pakistan' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇧🇩', name: 'Bangladesh' },
  { flag: '🇹🇷', name: 'Turkey' },
  { flag: '🇮🇩', name: 'Indonesia' },
  { flag: '🇲🇾', name: 'Malaysia' },
  { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇫🇷', name: 'France' },
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇨🇦', name: 'Canada' },
];

export default async function AffiliateApplyPage() {
  const t = await getTranslations('affiliates');

  const specs = [
    { label: t('applyPageCommissionLabel'), value: t('applyPageCommissionValue'), highlight: true },
    { label: t('applyPageCookieLabel'),     value: t('applyPageCookieValue') },
    { label: t('applyPageHoldLabel'),       value: t('applyPageHoldValue') },
    { label: t('applyPageApprovalLabel'),   value: t('applyPageApprovalValue') },
    { label: t('applyPageCategoryLabel'),   value: t('applyPageCategory') },
  ];

  const allowed = [
    t('allow1'), t('allow2'), t('allow3'), t('allow4'),
    t('allow5'), t('allow6'), t('allow7'), t('allow8'),
  ];

  const forbidden = [
    t('forbid1'), t('forbid2'), t('forbid3'), t('forbid4'), t('forbid5'),
  ];

  const formLabels = {
    applyHeading:        t('applyHeading'),
    applyDesc:           t('applyDesc'),
    formName:            t('formName'),
    formEmail:           t('formEmail'),
    formWebsite:         t('formWebsite'),
    formPlatform:        t('formPlatform'),
    formPlatformBlog:    t('formPlatformBlog'),
    formPlatformYoutube: t('formPlatformYoutube'),
    formPlatformInstagram: t('formPlatformInstagram'),
    formPlatformTwitter: t('formPlatformTwitter'),
    formPlatformTelegram: t('formPlatformTelegram'),
    formPlatformTiktok:  t('formPlatformTiktok'),
    formPlatformOther:   t('formPlatformOther'),
    formAudience:        t('formAudience'),
    formAudience1k:      t('formAudience1k'),
    formAudience10k:     t('formAudience10k'),
    formAudience100k:    t('formAudience100k'),
    formAudience100kplus: t('formAudience100kplus'),
    formMessage:         t('formMessage'),
    formSubmit:          t('formSubmit'),
    formSubmitting:      t('formSubmitting'),
    formSuccess:         t('formSuccess'),
    formError:           t('formError'),
  };

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="bg-utu-bg-card border-b border-utu-border-default">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <Link
            href="/affiliates"
            className="inline-flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-blue transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('applyPageBack')}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {/* Logo mark */}
            <div className="w-12 h-12 rounded-xl bg-utu-navy flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-black text-sm">UTU</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-lg font-bold text-utu-text-primary">{t('applyPageHeading')}</h1>
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {t('applyPageCategory')}
                </span>
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Active Program
                </span>
              </div>
              <p className="text-xs text-utu-text-muted">{t('applyPageType')}</p>
            </div>

            {/* Commission badge — right side */}
            <div className="ms-auto bg-utu-navy rounded-xl px-5 py-3 text-center hidden sm:block">
              <p className="text-3xl font-black text-amber-400">8%</p>
              <p className="text-white/70 text-xs font-medium">max commission</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start">

          {/* ── Left: Program specs ─────────────────────────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-6">

            {/* Key specs card */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default overflow-hidden shadow-sm">
              <div className="bg-utu-navy px-5 py-3">
                <p className="text-white font-semibold text-sm">Program Details</p>
              </div>
              <div className="divide-y divide-utu-border-default">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-xs text-utu-text-muted font-medium">{s.label}</span>
                    <span className={`text-sm font-semibold ${s.highlight ? 'text-utu-blue' : 'text-utu-text-primary'}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allowed traffic */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default overflow-hidden shadow-sm">
              <div className="bg-green-600 px-5 py-3">
                <p className="text-white font-semibold text-sm">{t('applyPageAllowedHeading')}</p>
              </div>
              <ul className="divide-y divide-utu-border-default">
                {allowed.map((item) => (
                  <li key={item} className="flex items-start gap-3 px-5 py-3">
                    <span className="shrink-0 mt-0.5 w-4 h-4 text-green-600" aria-hidden="true">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-xs text-utu-text-secondary leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Restricted traffic */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default overflow-hidden shadow-sm">
              <div className="bg-red-600 px-5 py-3">
                <p className="text-white font-semibold text-sm">{t('applyPageForbiddenHeading')}</p>
              </div>
              <ul className="divide-y divide-utu-border-default">
                {forbidden.map((item) => (
                  <li key={item} className="flex items-start gap-3 px-5 py-3">
                    <span className="shrink-0 mt-0.5 w-4 h-4 text-red-500" aria-hidden="true">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-xs text-utu-text-secondary leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supported GEOs */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default overflow-hidden shadow-sm">
              <div className="bg-utu-bg-subtle px-5 py-3 border-b border-utu-border-default">
                <p className="text-utu-text-primary font-semibold text-sm">{t('applyPageGeoHeading')}</p>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {GEOS.map((g) => (
                    <div
                      key={g.name}
                      title={g.name}
                      className="flex items-center gap-1.5 bg-utu-bg-subtle border border-utu-border-default text-utu-text-secondary text-xs px-2.5 py-1.5 rounded-lg hover:bg-utu-bg-card transition-colors"
                    >
                      <span className="text-base leading-none" aria-hidden="true">{g.flag}</span>
                      <span>{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── Right: About + Application form ────────────────────────────── */}
          <div className="space-y-6">

            {/* About the program */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 shadow-sm">
              <h2 className="font-bold text-utu-text-primary mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-utu-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('applyPageAboutHeading')}
              </h2>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{t('applyPageAboutText')}</p>

              {/* Quick commission breakdown */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { tier: 'Starter', rate: '3%', note: 'Any volume' },
                  { tier: 'Pro',     rate: '5%', note: 'SAR 50K+/mo' },
                  { tier: 'Elite',   rate: '8%', note: 'SAR 200K+/mo' },
                ].map((c) => (
                  <div key={c.tier} className="bg-utu-bg-subtle rounded-xl p-3 text-center border border-utu-border-default">
                    <p className="text-xs text-utu-text-muted mb-1">{c.tier}</p>
                    <p className="text-xl font-black text-utu-blue">{c.rate}</p>
                    <p className="text-xs text-utu-text-muted mt-1">{c.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Application form */}
            <AffiliateApplyForm labels={formLabels} />

          </div>
        </div>
      </div>

    </div>
  );
}
