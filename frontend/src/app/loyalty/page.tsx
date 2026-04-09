import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'UTU Rewards Loyalty Program — UTUBooking',
  description: 'Earn points on every hotel, flight, and car rental booking. Redeem for upgrades, free nights, and exclusive Hajj packages with UTU Rewards.',
};

const TIERS = [
  {
    key:       'Silver',
    color:     'bg-utu-bg-muted border-utu-border-strong',
    badge:     'bg-utu-bg-muted text-utu-text-secondary',
    icon:      '🥈',
    ptsKey:    'tierSilverPts',
    descKey:   'tierSilverDesc',
    benefits:  ['tierSilverBenefit1', 'tierSilverBenefit2'],
  },
  {
    key:       'Gold',
    color:     'bg-amber-50 border-amber-300',
    badge:     'bg-amber-100 text-amber-700',
    icon:      '🥇',
    ptsKey:    'tierGoldPts',
    descKey:   'tierGoldDesc',
    benefits:  ['tierGoldBenefit1', 'tierGoldBenefit2', 'tierGoldBenefit3'],
  },
  {
    key:       'Platinum',
    color:     'bg-blue-50 border-blue-300',
    badge:     'bg-blue-100 text-blue-700',
    icon:      '💎',
    ptsKey:    'tierPlatinumPts',
    descKey:   'tierPlatinumDesc',
    benefits:  ['tierPlatinumBenefit1', 'tierPlatinumBenefit2', 'tierPlatinumBenefit3'],
  },
  {
    key:       'Elite',
    color:     'bg-utu-bg-subtle border-utu-blue ring-2 ring-utu-blue',
    badge:     'bg-utu-bg-subtle text-utu-navy',
    icon:      '🕋',
    ptsKey:    'tierElitePts',
    descKey:   'tierEliteDesc',
    benefits:  ['tierEliteBenefit1', 'tierEliteBenefit2', 'tierEliteBenefit3', 'tierEliteBenefit4'],
  },
] as const;

const EARN_RATES = [
  { icon: '🏨', labelKey: 'earnHotels',  rateKey: 'earnHotelRate'  },
  { icon: '✈️', labelKey: 'earnFlights', rateKey: 'earnFlightRate' },
  { icon: '🚗', labelKey: 'earnCars',    rateKey: 'earnCarRate'    },
  { icon: '🎁', labelKey: 'earnBonus',   rateKey: 'earnBonusRate'  },
] as const;

const FAQS = [
  { qKey: 'faq1Q', aKey: 'faq1A' },
  { qKey: 'faq2Q', aKey: 'faq2A' },
  { qKey: 'faq3Q', aKey: 'faq3A' },
  { qKey: 'faq4Q', aKey: 'faq4A' },
] as const;

export default async function LoyaltyPage() {
  const t = await getTranslations('loyalty');

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Hero */}
      <section className="bg-utu-navy py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
          {t('heroTagline')}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto text-lg mb-8">{t('heroDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            {t('joinNow')}
          </Link>
          <Link
            href="/login"
            className="inline-block border border-utu-blue hover:bg-utu-navy text-white/80 font-medium px-8 py-3 rounded-xl transition-colors text-sm"
          >
            {t('signIn')}
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">{t('howItWorks')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: '01', title: t('step1Title'), desc: t('step1Desc'), icon: '📲' },
            { num: '02', title: t('step2Title'), desc: t('step2Desc'), icon: '🏅' },
            { num: '03', title: t('step3Title'), desc: t('step3Desc'), icon: '🎁' },
          ].map((step) => (
            <div key={step.num} className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 shadow-sm text-center">
              <div className="text-3xl mb-3">{step.icon}</div>
              <p className="text-xs font-bold text-utu-blue mb-1">{step.num}</p>
              <h3 className="font-semibold text-utu-text-primary mb-2">{step.title}</h3>
              <p className="text-sm text-utu-text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earn Rates */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-8">{t('earnRatesHeading')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EARN_RATES.map((item) => (
              <div key={item.labelKey} className="flex flex-col items-center text-center p-4 rounded-xl bg-utu-bg-page border border-utu-border-default">
                <span className="text-2xl mb-2">{item.icon}</span>
                <p className="text-sm font-semibold text-utu-text-primary mb-1">{t(item.labelKey)}</p>
                <p className="text-xs text-utu-blue font-medium">{t(item.rateKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">{t('tiersHeading')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier) => (
            <div
              key={tier.key}
              className={`rounded-2xl border-2 p-5 shadow-sm ${tier.color}`}
            >
              <div className="text-2xl mb-2">{tier.icon}</div>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${tier.badge}`}>
              {(t as (k: string) => string)(`tier${tier.key}`)}
              </span>
              <p className="text-xs text-utu-text-muted mb-1">{t(tier.ptsKey)}</p>
              <p className="text-sm text-utu-text-secondary mb-4">{t(tier.descKey)}</p>
              <ul className="space-y-1.5">
                {tier.benefits.map((bKey) => (
                  <li key={bKey} className="flex items-start gap-2 text-xs text-utu-text-secondary">
                    <span className="text-utu-blue mt-0.5 shrink-0">✓</span>
                    {(t as (k: string) => string)(bKey)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-utu-bg-card border-t border-utu-border-default py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-8">{t('faqHeading')}</h2>
          <div className="space-y-4">
            {FAQS.map((item) => (
              <div key={item.qKey} className="rounded-xl border border-utu-border-default p-5">
                <h3 className="font-semibold text-utu-text-primary mb-2">{t(item.qKey)}</h3>
                <p className="text-sm text-utu-text-muted">{t(item.aKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-utu-navy py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">{t('ctaHeading')}</h2>
        <p className="text-white/80 mb-6 max-w-md mx-auto text-sm">{t('ctaDesc')}</p>
        <Link
          href="/register"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {t('joinNow')}
        </Link>
      </section>

    </div>
  );
}
