import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export const metadata: Metadata = {
  title: 'About UTUBooking — AMEC Solutions',
  description: 'UTUBooking.com is the trusted travel booking platform for Hajj, Umrah, and Muslim World travelers. Built by AMEC Solutions.',
};

export default async function AboutPage() {
  const t = await getTranslations('about');

  const stats = [
    { value: '25+', label: t('statsMarkets') },
    { value: '8',   label: t('statsRegions') },
    { value: '15',  label: t('statsLanguages') },
    { value: '10+', label: t('statsPayments') },
  ];

  const milestones = [
    { year: t('milestone1Year'), event: t('milestone1Event') },
    { year: t('milestone2Year'), event: t('milestone2Event') },
    { year: t('milestone3Year'), event: t('milestone3Event') },
    { year: t('milestone4Year'), event: t('milestone4Event') },
  ];

  const markets = [
    { region: t('market1Region'), countries: t('market1Countries') },
    { region: t('market2Region'), countries: t('market2Countries') },
    { region: t('market3Region'), countries: t('market3Countries') },
    { region: t('market4Region'), countries: t('market4Countries') },
    { region: t('market5Region'), countries: t('market5Countries') },
    { region: t('market6Region'), countries: t('market6Countries') },
  ];

  const values = [
    { icon: '🕌', title: t('value1Title'), desc: t('value1Desc') },
    { icon: '🌍', title: t('value2Title'), desc: t('value2Desc') },
    { icon: '🔒', title: t('value3Title'), desc: t('value3Desc') },
    { icon: '⚡', title: t('value4Title'), desc: t('value4Desc') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page font-sans">

      {/* Hero */}
      <section className="bg-gradient-to-b from-utu-navy via-[#1a3a6e] to-teal-700 py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
            {t('heroTagline')}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {t('heroHeading')}
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            {t('heroDesc')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-utu-bg-card border-b border-utu-border-default py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-utu-blue">{s.value}</div>
              <div className="text-sm text-utu-text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-utu-text-primary mb-4">{t('missionHeading')}</h2>
          <p className="text-utu-text-secondary text-lg leading-relaxed">
            {t('missionText')}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-utu-bg-card py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">{t('valuesHeading')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-utu-bg-page rounded-2xl p-6 flex gap-4 items-start border border-utu-border-default">
                <span className="text-3xl" aria-hidden="true">{v.icon}</span>
                <div>
                  <h3 className="font-semibold text-utu-text-primary mb-1">{v.title}</h3>
                  <p className="text-sm text-utu-text-muted leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">{t('marketsHeading')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {markets.map((m) => (
              <div key={m.region} className="bg-utu-bg-card rounded-xl p-4 border border-utu-border-default shadow-sm">
                <div className="font-semibold text-utu-blue text-sm mb-1">{m.region}</div>
                <div className="text-sm text-utu-text-muted">{m.countries}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-utu-bg-card py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">{t('journeyHeading')}</h2>
          <div className="relative border-s-2 border-utu-border-default ps-6 space-y-8">
            {milestones.map((m) => (
              <div key={m.year} className="relative">
                <div className="absolute -start-[1.65rem] top-1 w-4 h-4 bg-utu-blue rounded-full border-2 border-white" />
                <div className="text-xs font-bold text-utu-blue uppercase tracking-wide mb-1">{m.year}</div>
                <div className="text-utu-text-secondary text-sm">{m.event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-utu-navy py-16 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">{t('ctaHeading')}</h2>
          <p className="text-white/80 mb-6">{t('ctaDesc')}</p>
          <Link
            href="/hotels/search"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            {t('ctaBtn')}
          </Link>
        </div>
      </section>

    </div>
  );
}
