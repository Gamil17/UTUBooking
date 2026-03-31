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
    <div className="min-h-screen bg-slate-50">

      <section className="bg-emerald-900 py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('heroHeading')}</h1>
        <p className="text-emerald-100 max-w-xl mx-auto text-lg mb-8">{t('heroDesc')}</p>
        <Link
          href="/"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-emerald-900 font-bold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {t('searchHotelsBtn')}
        </Link>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('comingSoonHeading')}</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-8">{t('comingSoonDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-start">
            {packages.map((pkg) => (
              <div key={pkg.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">{pkg.title}</h3>
                <div className="text-lg font-black text-emerald-700 mb-1">{pkg.price}</div>
                <div className="text-xs text-gray-400 mb-3">{pkg.nights} {t('perPerson')}</div>
                <p className="text-sm text-gray-500">{pkg.desc}</p>
                <Link href="/" className="mt-4 block text-center bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                  {t('searchHotels')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
