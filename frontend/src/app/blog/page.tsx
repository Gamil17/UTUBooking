import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export const metadata: Metadata = {
  title: 'Travel Guides & Blog — UTUBooking',
  description: 'Hajj and Umrah travel guides, tips for Muslim travelers, hotel reviews, and destination guides for Saudi Arabia and beyond.',
};

export default async function BlogPage() {
  const t = await getTranslations('blog');

  const posts = [
    { slug: 'hajj-2026-guide',             category: t('post1Category'), title: t('post1Title'), excerpt: t('post1Excerpt'), date: t('post1Date') },
    { slug: 'umrah-hotels-makkah',          category: t('post2Category'), title: t('post2Title'), excerpt: t('post2Excerpt'), date: t('post2Date') },
    { slug: 'madinah-travel-tips',          category: t('post3Category'), title: t('post3Title'), excerpt: t('post3Excerpt'), date: t('post3Date') },
    { slug: 'muslim-travel-southeast-asia', category: t('post4Category'), title: t('post4Title'), excerpt: t('post4Excerpt'), date: t('post4Date') },
  ];

  const categories = [
    { key: 'catAll',          label: t('catAll') },
    { key: 'catHajj',         label: t('catHajj') },
    { key: 'catUmrah',        label: t('catUmrah') },
    { key: 'catDestinations', label: t('catDestinations') },
    { key: 'catTips',         label: t('catTips') },
    { key: 'catDeals',        label: t('catDeals') },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <section className="bg-emerald-900 py-16 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('heroHeading')}</h1>
        <p className="text-emerald-100 max-w-xl mx-auto text-base">{t('heroDesc')}</p>
      </section>

      {/* Categories */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                cat.key === 'catAll'
                  ? 'bg-emerald-700 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                {post.category}
              </span>
              <h2 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{post.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{post.date}</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors"
                >
                  {t('readMore')}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">{t('moreComingSoon')}</p>
      </div>

    </div>
  );
}
