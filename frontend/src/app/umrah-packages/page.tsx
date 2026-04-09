import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export const metadata: Metadata = {
  title: 'Umrah Packages — UTUBooking',
  description: 'Book all-inclusive Umrah packages with verified hotels near Masjid al-Haram in Makkah and Madinah. SAR pricing, Arabic support.',
};

export default async function UmrahPackagesPage() {
  const t = await getTranslations('umrahPackages');

  const packages = [
    { title: t('pkg1Title'), price: t('pkg1Price'), nights: t('pkg1Nights'), desc: t('pkg1Desc') },
    { title: t('pkg2Title'), price: t('pkg2Price'), nights: t('pkg2Nights'), desc: t('pkg2Desc') },
    { title: t('pkg3Title'), price: t('pkg3Price'), nights: t('pkg3Nights'), desc: t('pkg3Desc') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page">

      <section className="bg-utu-navy py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto text-lg mb-8">{t('heroDesc')}</p>
        <Link
          href="/hotels/search"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {t('searchHotelsBtn')}
        </Link>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {packages.map((pkg) => (
              <div key={pkg.title} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6">
                <h3 className="font-bold text-utu-text-primary mb-1">{pkg.title}</h3>
                <div className="text-lg font-black text-utu-blue mb-1">{pkg.price}</div>
                <div className="text-xs text-utu-text-muted mb-3">{pkg.nights} {t('perPerson')}</div>
                <p className="text-sm text-utu-text-muted">{pkg.desc}</p>
                <Link href="/hotels/search" className="mt-4 block text-center bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                  {t('searchHotels')}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-utu-text-muted mt-10">{t('comingSoonDesc')}</p>
        </div>
      </section>

    </div>
  );
}
