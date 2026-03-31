import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
export const metadata: Metadata = {
  title: 'Press & Media — UTUBooking',
  description: 'Press releases, media resources, and brand assets for UTUBooking.com by AMEC Solutions.',
};

export default async function PressPage() {
  const t = await getTranslations('press');

  const releases = [
    { date: t('r1Date'), headline: t('r1Headline'), summary: t('r1Summary') },
    { date: t('r2Date'), headline: t('r2Headline'), summary: t('r2Summary') },
    { date: t('r3Date'), headline: t('r3Headline'), summary: t('r3Summary') },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      <section className="bg-emerald-900 py-16 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('heroHeading')}</h1>
        <p className="text-emerald-100 max-w-xl mx-auto">{t('heroDesc')}</p>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-10">

        {/* Press releases */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">{t('releasesHeading')}</h2>
          {releases.map((r) => (
            <div key={r.headline} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-emerald-700 font-semibold mb-2">{r.date}</p>
              <h3 className="font-bold text-gray-900 mb-2 leading-snug">{r.headline}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{r.summary}</p>
            </div>
          ))}
        </div>

        {/* Media kit sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">{t('pressContactHeading')}</h3>
            <p className="text-sm text-gray-500 mb-1">{t('pressContactDesc')}</p>
            <a href="mailto:press@utubooking.com" className="text-sm text-emerald-700 underline">
              press@utubooking.com
            </a>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">{t('brandAssetsHeading')}</h3>
            <p className="text-sm text-gray-500 mb-3">{t('brandAssetsDesc')}</p>
            <a
              href="mailto:press@utubooking.com"
              className="inline-block bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {t('downloadKit')}
            </a>
          </div>

          <div className="bg-slate-50 rounded-xl border border-gray-100 p-5 text-sm text-gray-500 leading-relaxed">
            <strong className="text-gray-900 block mb-1">{t('aboutHeading')}</strong>
            {t('aboutText')}
          </div>
        </div>

      </div>

    </div>
  );
}
