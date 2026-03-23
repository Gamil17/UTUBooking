import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from '@ducanh2912/next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withPWA = withPWAInit({
  dest: 'public',
  customWorkerSrc: 'src/sw',
  disable: process.env.NODE_ENV === 'development',
  register: false,
  scope: '/',
  sw: 'sw.js',
  fallbacks: { document: '/offline' },
  workboxOptions: {
    runtimeCaching: [
      // Hotel search — NetworkFirst, 30-minute cache
      {
        urlPattern: /\/api\/v1\/hotels\/search/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'hotel-search-cache',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // User bookings — StaleWhileRevalidate (always available offline)
      {
        urlPattern: /\/api\/v1\/bookings/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'bookings-cache',
          expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Static pages (home, about, contact) — CacheFirst
      {
        urlPattern: ({ request }: { request: Request }) =>
          request.mode === 'navigate' &&
          ['/', '/about', '/contact'].some(
            (p) => new URL(request.url).pathname === p
          ),
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-pages-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
        },
      },
      // Hajj pre-cache API response — CacheFirst, 6 hours
      {
        urlPattern: /\/api\/hajj-precache/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'hajj-hotels-cache',
          expiration: { maxEntries: 1, maxAgeSeconds: 6 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Next.js static assets — CacheFirst forever (content-hashed)
      {
        urlPattern: /\/_next\/static\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withNextIntl(withPWA(nextConfig));
