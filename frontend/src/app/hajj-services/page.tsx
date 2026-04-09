import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export const metadata: Metadata = {
  title: 'Hajj Services — UTUBooking',
  description: 'Plan your Hajj journey with UTUBooking — verified Makkah accommodation, Madinah hotels, national quotas, and Tabung Haji integration.',
};

export default async function HajjServicesPage() {
  const t = await getTranslations('hajjServices');

  const services = [
    { icon: '🏨', title: t('svc1Title'), desc: t('svc1Desc') },
    { icon: '🕌', title: t('svc2Title'), desc: t('svc2Desc') },
    { icon: '✈️', title: t('svc3Title'), desc: t('svc3Desc') },
    { icon: '🚌', title: t('svc4Title'), desc: t('svc4Desc') },
    { icon: '📋', title: t('svc5Title'), desc: t('svc5Desc') },
    { icon: '🌙', title: t('svc6Title'), desc: t('svc6Desc') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page">

      <section className="bg-utu-navy py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto text-lg">{t('heroDesc')}</p>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <div key={s.title} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6">
                <span className="text-3xl" aria-hidden="true">{s.icon}</span>
                <h3 className="font-bold text-utu-text-primary mt-3 mb-2">{s.title}</h3>
                <p className="text-sm text-utu-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-utu-navy py-14 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">{t('ctaHeading')}</h2>
        <p className="text-white/80 mb-6 max-w-lg mx-auto">{t('ctaDesc')}</p>
        <Link
          href="/hotels/search?destination=Makkah"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {t('searchBtn')}
        </Link>
      </section>

    </div>
  );
}
