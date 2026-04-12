import { MetadataRoute } from 'next';

const BASE = 'https://utubooking.com';

/**
 * Dynamic sitemap — Next.js App Router.
 *
 * Static pages are hardcoded. Blog posts are fetched from the backend at
 * build/ISR time (revalidate: 3600 — refreshed hourly in prod).
 *
 * Google Search Console: submit https://utubooking.com/sitemap.xml
 */

// ── Static page definitions ───────────────────────────────────────────────────

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

interface StaticPage {
  url:        string;
  priority:   number;
  changeFreq: ChangeFreq;
}

const STATIC_PAGES: StaticPage[] = [
  // Core booking
  { url: '/',               priority: 1.0, changeFreq: 'daily'   },
  { url: '/hotels',         priority: 0.9, changeFreq: 'daily'   },
  { url: '/flights',        priority: 0.9, changeFreq: 'daily'   },
  { url: '/cars',           priority: 0.8, changeFreq: 'weekly'  },

  // Hajj & Umrah specific
  { url: '/hajj-services',  priority: 1.0, changeFreq: 'weekly'  },
  { url: '/umrah-packages', priority: 0.9, changeFreq: 'weekly'  },

  // Business & partners
  { url: '/corporate',         priority: 0.7, changeFreq: 'monthly' },
  { url: '/corporate/apply',   priority: 0.6, changeFreq: 'monthly' },
  { url: '/partners',          priority: 0.7, changeFreq: 'monthly' },
  { url: '/hotel-partners',    priority: 0.8, changeFreq: 'monthly' },
  { url: '/hotel-partners/apply', priority: 0.6, changeFreq: 'monthly' },
  { url: '/affiliates',        priority: 0.7, changeFreq: 'monthly' },
  { url: '/affiliates/apply',  priority: 0.6, changeFreq: 'monthly' },
  { url: '/advertise',         priority: 0.6, changeFreq: 'monthly' },
  { url: '/advertise/partner', priority: 0.5, changeFreq: 'monthly' },

  // Loyalty
  { url: '/loyalty',        priority: 0.6, changeFreq: 'weekly'  },
  { url: '/promo-codes',    priority: 0.5, changeFreq: 'weekly'  },

  // Blog
  { url: '/blog',           priority: 0.8, changeFreq: 'daily'   },

  // Company
  { url: '/about',          priority: 0.6, changeFreq: 'monthly' },
  { url: '/careers',        priority: 0.6, changeFreq: 'weekly'  },
  { url: '/contact',        priority: 0.5, changeFreq: 'monthly' },
  { url: '/faq',            priority: 0.5, changeFreq: 'monthly' },
  { url: '/press',          priority: 0.4, changeFreq: 'monthly' },

  // Legal / compliance
  { url: '/privacy',        priority: 0.3, changeFreq: 'yearly'  },
  { url: '/terms',          priority: 0.3, changeFreq: 'yearly'  },
];

// ── Blog post fetcher ─────────────────────────────────────────────────────────

interface BlogApiPost {
  slug:           string;
  published_date: string;
  updated_at?:    string;
}

async function fetchPublishedBlogPosts(): Promise<BlogApiPost[]> {
  try {
    const res = await fetch(
      `${process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'}/api/blog?limit=200&published=true`,
      {
        next:   { revalidate: 3600 }, // Revalidate every hour in prod
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    // If backend is unavailable during build, just return empty — static pages
    // still get indexed. Blog posts will appear on next revalidation.
    return [];
  }
}

// ── Sitemap export ────────────────────────────────────────────────────────────

export const revalidate = 3600; // ISR: regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await fetchPublishedBlogPosts();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url:            `${BASE}${page.url}`,
    lastModified:   new Date(),
    changeFrequency: page.changeFreq,
    priority:       page.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url:            `${BASE}/blog/${post.slug}`,
    lastModified:   post.updated_at ? new Date(post.updated_at) : new Date(post.published_date),
    changeFrequency: 'monthly' as ChangeFreq,
    priority:       0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
