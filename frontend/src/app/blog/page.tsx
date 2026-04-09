import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BlogPostsGrid from './BlogPostsGrid';

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

      <BlogPostsGrid
        posts={posts}
        categories={categories}
        allLabel={t('catAll')}
        readMoreLabel={t('readMore')}
        moreComingSoon={t('moreComingSoon')}
      />

    </div>
  );
}
