import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AffiliateApplyForm from './AffiliateApplyForm';
export const metadata: Metadata = {
  title: 'Affiliate Program — UTUBooking',
  description: 'Earn commissions by referring travelers to UTUBooking.com. Join our affiliate program and grow your revenue.',
};

export default async function AffiliatesPage() {
  const t = await getTranslations('affiliates');

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

  return (
    <div className="min-h-screen bg-utu-bg-page">

      <section className="bg-utu-navy py-16 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto">{t('heroDesc')}</p>
        <a
          href="#apply"
          className="inline-block mt-6 bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {t('applyNowBtn')}
        </a>
      </section>

      {/* How it works */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-10">{t('howItWorksHeading')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-10 h-10 bg-utu-bg-subtle text-utu-blue font-black text-sm rounded-full flex items-center justify-center mx-auto mb-3">
                  {s.n}
                </div>
                <h3 className="font-semibold text-utu-text-primary mb-1">{s.title}</h3>
                <p className="text-xs text-utu-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-utu-bg-card py-14 px-4 border-y border-utu-border-default">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-10">{t('tiersHeading')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-6 ${
                  tier.featured
                    ? 'border-utu-blue bg-utu-bg-subtle shadow-md'
                    : 'border-utu-border-default bg-utu-bg-card shadow-sm'
                }`}
              >
                {tier.featured && (
                  <span className="inline-block bg-utu-navy text-white text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                    {t('mostPopular')}
                  </span>
                )}
                <h3 className="font-bold text-utu-text-primary text-lg">{tier.name}</h3>
                <div className="text-3xl font-black text-utu-blue my-2">{tier.commission}</div>
                <p className="text-xs text-utu-text-muted mb-4">{t('from')} {tier.threshold} {t('referrals')}</p>
                <ul className="space-y-2">
                  {tier.perks.map((p) => (
                    <li key={p} className="text-sm text-utu-text-secondary flex items-start gap-2">
                      <span className="text-utu-blue mt-0.5" aria-hidden="true">&#10003;</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply form */}
      <section id="apply" className="py-14 px-4">
        <AffiliateApplyForm labels={{
          applyHeading: t('applyHeading'),
          applyDesc: t('applyDesc'),
          formName: t('formName'),
          formEmail: t('formEmail'),
          formWebsite: t('formWebsite'),
          formPlatform: t('formPlatform'),
          formPlatformBlog: t('formPlatformBlog'),
          formPlatformYoutube: t('formPlatformYoutube'),
          formPlatformInstagram: t('formPlatformInstagram'),
          formPlatformTwitter: t('formPlatformTwitter'),
          formPlatformTelegram: t('formPlatformTelegram'),
          formPlatformOther: t('formPlatformOther'),
          formAudience: t('formAudience'),
          formAudience1k: t('formAudience1k'),
          formAudience10k: t('formAudience10k'),
          formAudience100k: t('formAudience100k'),
          formAudience100kplus: t('formAudience100kplus'),
          formMessage: t('formMessage'),
          formSubmit: t('formSubmit'),
          formSubmitting: t('formSubmitting'),
          formSuccess: t('formSuccess'),
          formError: t('formError'),
        }} />
      </section>

    </div>
  );
}
