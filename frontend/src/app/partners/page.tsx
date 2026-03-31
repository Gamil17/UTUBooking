import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export const metadata: Metadata = {
  title: 'Hotel & Business Partners — UTUBooking',
  description: 'List your hotel on UTUBooking or explore corporate travel solutions for businesses in the Gulf and Muslim World.',
};

export default async function PartnersPage() {
  const t = await getTranslations('partners');

  const hotelBenefits = [
    { icon: '🕌', title: t('hotel1Title'), desc: t('hotel1Desc') },
    { icon: '🌍', title: t('hotel2Title'), desc: t('hotel2Desc') },
    { icon: '💰', title: t('hotel3Title'), desc: t('hotel3Desc') },
    { icon: '📊', title: t('hotel4Title'), desc: t('hotel4Desc') },
  ];

  const bizBenefits = [
    { icon: '✈️', title: t('biz1Title'), desc: t('biz1Desc') },
    { icon: '📋', title: t('biz2Title'), desc: t('biz2Desc') },
    { icon: '👥', title: t('biz3Title'), desc: t('biz3Desc') },
    { icon: '🔒', title: t('biz4Title'), desc: t('biz4Desc') },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      <section className="bg-emerald-900 py-16 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('heroHeading')}</h1>
        <p className="text-emerald-100 max-w-xl mx-auto">{t('heroDesc')}</p>
      </section>

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 flex">
          <a href="#hotels" className="px-5 py-4 text-sm font-semibold text-emerald-700 border-b-2 border-emerald-700">
            {t('tabHotels')}
          </a>
          <a href="#business" className="px-5 py-4 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            {t('tabBusiness')}
          </a>
          <a href="#advertise" className="px-5 py-4 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            {t('tabAdvertise')}
          </a>
        </div>
      </div>

      {/* Hotel Partners */}
      <section id="hotels" className="py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('hotelsHeading')}</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xl">{t('hotelsDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {hotelBenefits.map((b) => (
              <div key={b.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex gap-4">
                <span className="text-2xl shrink-0" aria-hidden="true">{b.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{b.title}</h3>
                  <p className="text-sm text-gray-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/contact"
            className="inline-block bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {t('listPropertyBtn')}
          </Link>
        </div>
      </section>

      {/* Business */}
      <section id="business" className="bg-white py-14 px-4 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('businessHeading')}</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xl">{t('businessDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {bizBenefits.map((b) => (
              <div key={b.title} className="bg-slate-50 rounded-xl border border-gray-100 p-5 flex gap-4">
                <span className="text-2xl shrink-0" aria-hidden="true">{b.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{b.title}</h3>
                  <p className="text-sm text-gray-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/contact"
            className="inline-block bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {t('requestDemoBtn')}
          </Link>
        </div>
      </section>

      {/* Advertise */}
      <section id="advertise" className="py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('advertiseHeading')}</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-lg mx-auto">{t('advertiseDesc')}</p>
          <Link
            href="/contact"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-emerald-900 font-bold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            {t('contactTeamBtn')}
          </Link>
        </div>
      </section>

    </div>
  );
}
