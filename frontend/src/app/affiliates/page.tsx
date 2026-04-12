import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AffiliatesPageFaq from './AffiliatesPageFaq';

export const metadata: Metadata = {
  title: 'Affiliate Program — Earn Up to 8% Commission | UTUBooking',
  description: 'Join UTUBooking affiliate program and earn up to 8% commission on every hotel, flight, and car rental booking. Monthly payouts, 30-day cookie, 25+ markets.',
};

// ── Static GEO list ───────────────────────────────────────────────────────────
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

// ── Benefit icons (inline SVG to avoid bundle overhead for simple shapes) ────
function IconChart() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function IconTrending() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function IconHeadset() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

export default async function AffiliatesPage() {
  const t = await getTranslations('affiliates');

  const stats = [
    { label: t('stat1Label'), value: t('stat1Value') },
    { label: t('stat2Label'), value: t('stat2Value') },
    { label: t('stat3Label'), value: t('stat3Value') },
    { label: t('stat4Label'), value: t('stat4Value') },
  ];

  const benefits = [
    { icon: <IconChart />, title: t('why1Title'), desc: t('why1Desc') },
    { icon: <IconWallet />, title: t('why2Title'), desc: t('why2Desc') },
    { icon: <IconTrending />, title: t('why3Title'), desc: t('why3Desc') },
    { icon: <IconHeadset />, title: t('why4Title'), desc: t('why4Desc') },
    { icon: <IconGlobe />, title: t('why5Title'), desc: t('why5Desc') },
    { icon: <IconStar />, title: t('why6Title'), desc: t('why6Desc') },
  ];

  const tiers = [
    {
      name: t('tier1Name'),
      commission: '3%',
      threshold: 'SAR 0',
      perks: [t('tier1Perk1'), t('tier1Perk2'), t('tier1Perk3')],
    },
    {
      name: t('tier2Name'),
      commission: '5%',
      threshold: 'SAR 50,000 / mo',
      perks: [t('tier2Perk1'), t('tier2Perk2'), t('tier2Perk3'), t('tier2Perk4')],
      featured: true,
    },
    {
      name: t('tier3Name'),
      commission: '8%',
      threshold: 'SAR 200,000 / mo',
      perks: [t('tier3Perk1'), t('tier3Perk2'), t('tier3Perk3'), t('tier3Perk4')],
    },
  ];

  const steps = [
    { n: '01', title: t('step1Title'), desc: t('step1Desc') },
    { n: '02', title: t('step2Title'), desc: t('step2Desc') },
    { n: '03', title: t('step3Title'), desc: t('step3Desc') },
    { n: '04', title: t('step4Title'), desc: t('step4Desc') },
  ];

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
    { q: t('faq6Q'), a: t('faq6A') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-utu-navy relative overflow-hidden">
        {/* subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}
          aria-hidden="true" />

        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <span className="inline-block bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-amber-400/30">
            {t('tagline')}
          </span>

          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
            {t('heroHeading')}
          </h1>

          <p className="text-white/75 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-16">
            <Link
              href="/affiliates/apply"
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-amber-400/20"
            >
              {t('signUpNow')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#tiers"
              className="inline-block border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              {t('viewRates')}
            </a>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
            {stats.map((s) => (
              <div key={s.label} className="bg-utu-navy/80 px-6 py-5 text-center">
                <p className="text-3xl font-black text-amber-400">{s.value}</p>
                <p className="text-xs text-white/60 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Join ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-12">
            {t('whyHeading')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-utu-bg-subtle flex items-center justify-center text-utu-blue mb-4">
                  {b.icon}
                </div>
                <h3 className="font-semibold text-utu-text-primary mb-2">{b.title}</h3>
                <p className="text-sm text-utu-text-muted leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission Tiers ─────────────────────────────────────────────────── */}
      <section id="tiers" className="bg-utu-bg-card border-y border-utu-border-default py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-4">
            {t('tiersHeading')}
          </h2>
          <p className="text-center text-utu-text-muted text-sm mb-12">
            Commission tiers unlock automatically as your monthly referral volume grows.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-7 relative ${
                  tier.featured
                    ? 'border-utu-blue bg-gradient-to-b from-blue-50 to-white shadow-lg shadow-blue-100'
                    : 'border-utu-border-default bg-utu-bg-card shadow-sm'
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3 start-1/2 -translate-x-1/2 inline-block bg-utu-navy text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    {t('mostPopular')}
                  </span>
                )}
                <h3 className="font-bold text-utu-text-primary text-lg">{tier.name}</h3>
                <div className="text-4xl font-black text-utu-blue my-3">{tier.commission}</div>
                <p className="text-xs text-utu-text-muted mb-5">
                  {t('from')} {tier.threshold} {t('referrals')}
                </p>
                <ul className="space-y-2.5">
                  {tier.perks.map((p) => (
                    <li key={p} className="text-sm text-utu-text-secondary flex items-start gap-2.5">
                      <span className="text-utu-blue mt-0.5 shrink-0" aria-hidden="true">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/affiliates/apply"
              className="inline-flex items-center gap-2 bg-utu-navy hover:bg-utu-blue text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              {t('signUpNow')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-14">
            {t('howItWorksHeading')}
          </h2>

          <div className="relative">
            {/* connecting line (desktop) */}
            <div className="hidden md:block absolute top-6 start-[10%] end-[10%] h-px bg-utu-border-default" aria-hidden="true" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {steps.map((s, i) => (
                <div key={s.n} className="text-center relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 font-black text-sm
                    ${i === 0 ? 'bg-amber-400 text-utu-navy' : 'bg-utu-bg-subtle text-utu-blue border border-utu-border-default'}`}>
                    {s.n}
                  </div>
                  <h3 className="font-semibold text-utu-text-primary mb-2 text-sm">{s.title}</h3>
                  <p className="text-xs text-utu-text-muted leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported Markets ────────────────────────────────────────────────── */}
      <section className="bg-utu-navy py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-10">
            {t('geoHeading')}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {GEOS.map((g) => (
              <div
                key={g.name}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-lg leading-none" aria-hidden="true">{g.flag}</span>
                {g.name}
              </div>
            ))}
          </div>
          <p className="text-center text-white/50 text-xs mt-6">
            + more markets added regularly
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">
            {t('faqHeading')}
          </h2>
          <AffiliatesPageFaq items={faqs} />
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-utu-navy to-utu-blue py-20 px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
          {t('ctaHeading')}
        </h2>
        <p className="text-white/75 max-w-md mx-auto mb-8 text-sm leading-relaxed">
          {t('ctaDesc')}
        </p>
        <Link
          href="/affiliates/apply"
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-10 py-4 rounded-xl transition-colors text-sm shadow-xl shadow-black/20"
        >
          {t('ctaBtn')}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <p className="text-white/40 text-xs mt-4">No upfront cost. No monthly fees. Commission only.</p>
      </section>

    </div>
  );
}
