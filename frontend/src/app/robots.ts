import { MetadataRoute } from 'next';

/**
 * robots.ts — generates /robots.txt via Next.js App Router.
 *
 * Rules:
 * - Allow all indexing for public pages
 * - Block /admin/* (login guarded but we also block crawlers)
 * - Block /pro/* (authenticated corporate portal)
 * - Block /api/* (no need for API routes in index)
 * - Block /account/* (private user account pages)
 * - Block checkout flow (duplicate / transactional pages)
 * - Block locale test and offline pages
 * - Point to sitemap for faster discovery
 */

export default function robots(): MetadataRoute.Robots {
  const base = 'https://utubooking.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow:     ['/'],
        disallow:  [
          '/admin/',
          '/pro/',
          '/api/',
          '/account/',
          '/checkout/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/locales-test/',
          '/offline',
        ],
      },
      // Block AI training scrapers explicitly (best practice for content protection)
      {
        userAgent: 'GPTBot',
        disallow:  ['/'],
      },
      {
        userAgent: 'Google-Extended',
        disallow:  ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow:  ['/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host:    base,
  };
}
