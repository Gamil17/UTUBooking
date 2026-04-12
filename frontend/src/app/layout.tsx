import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter, Noto_Kufi_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import Providers from '@/providers';
import TenantProvider from '@/components/TenantProvider';
import PwaInit from '@/components/PwaInit';
import { parseTenantHeader, getLocaleAttrs } from '@/lib/tenant';
import KVKKBanner        from '@/components/compliance/KVKKBanner';
import GDPRConsentBanner from '@/components/compliance/GDPRConsentBanner';
import DpdpConsentBanner from '@/components/compliance/DpdpConsentBanner';
import CCPAFooterLink    from '@/components/compliance/CCPAFooterLink';
import Footer               from '@/components/Footer';
import ConditionalHeader    from '@/components/ConditionalHeader';
import AffiliateRefTracker  from '@/components/AffiliateRefTracker';
import { Suspense }         from 'react';
import redis from '@/lib/redis';
import './globals.css';
import '@/styles/urdu.css';
import '@/styles/hindi.css';

/** Read maintenance mode from Redis (same key written by admin settings). */
async function getMaintenanceMode(): Promise<{ on: boolean; message: string }> {
  try {
    const raw = await redis.get('settings:platform');
    if (!raw) return { on: false, message: '' };
    const s = JSON.parse(raw);
    return {
      on:      !!s.maintenance?.mode,
      message: s.maintenance?.message ?? '',
    };
  } catch {
    return { on: false, message: '' }; // Redis unavailable — don't block traffic
  }
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
});

const SITE_URL = 'https://utubooking.com';

// BCP-47 locale → hreflang value map
// next-intl uses cookie routing (no URL segments), so all locales share the
// same canonical URL. We list every alternate so Google can serve the right
// language variant based on Accept-Language / geo.
const HREFLANG_LOCALES: Record<string, string> = {
  'en':       'en',
  'ar':       'ar',
  'fr':       'fr',
  'tr':       'tr',
  'id':       'id',
  'ms':       'ms',
  'ur':       'ur',
  'hi':       'hi',
  'fa':       'fa',
  'de':       'de',
  'en-GB':    'en-GB',
  'en-US':    'en-US',
  'it':       'it',
  'nl':       'nl',
  'pl':       'pl',
  'es':       'es',
  'sv':       'sv',
  'ru':       'ru',
  'pt-BR':    'pt-BR',
  'es-419':   'es-419',
  'ja':       'ja',
  'ko':       'ko',
  'th':       'th',
  'vi':       'vi',
  'zh-CN':    'zh-Hans',
  'zh-HK':    'zh-Hant-HK',
  'zh-TW':    'zh-Hant-TW',
};

export const metadata: Metadata = {
  title: 'UTUBooking.com — Hotels, Flights & Cars for Hajj & Umrah',
  description:
    'Book verified hotels in Makkah and Madinah, flights, and car rentals for Hajj and Umrah travelers. Real-time availability. SAR pricing. Arabic support.',
  keywords: 'Makkah hotel booking, Hajj accommodation, Umrah hotels, travel Saudi Arabia, مكة المكرمة فنادق',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'UTUBooking',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    type:        'website',
    url:         SITE_URL,
    siteName:    'UTUBooking',
    title:       'UTUBooking.com — Hotels, Flights & Cars for Hajj & Umrah',
    description: 'Book verified hotels in Makkah and Madinah, flights, and car rentals for Hajj and Umrah travelers. Real-time availability. SAR pricing. Arabic support.',
    images: [
      {
        url:    `${SITE_URL}/icons/icon-512x512.png`,
        width:  512,
        height: 512,
        alt:    'UTUBooking — Hajj & Umrah Travel Platform',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'UTUBooking.com — Hotels, Flights & Cars for Hajj & Umrah',
    description: 'Book verified hotels in Makkah and Madinah, flights, and car rentals for Hajj and Umrah travelers.',
    images:      [`${SITE_URL}/icons/icon-512x512.png`],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'x-default': SITE_URL,
      ...Object.fromEntries(
        Object.entries(HREFLANG_LOCALES).map(([, hreflang]) => [hreflang, SITE_URL])
      ),
    },
  },
};

// ── Site-wide structured data ─────────────────────────────────────────────────

const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph':   [
    {
      '@type':       'Organization',
      '@id':         'https://utubooking.com/#organization',
      name:          'UTUBooking',
      url:           'https://utubooking.com',
      logo: {
        '@type': 'ImageObject',
        url:     'https://utubooking.com/icons/icon-512x512.png',
      },
      sameAs: [
        'https://www.instagram.com/utubooking',
        'https://www.linkedin.com/company/utubooking',
      ],
      contactPoint: {
        '@type':             'ContactPoint',
        email:               'support@utubooking.com',
        contactType:         'customer service',
        availableLanguage:   ['English', 'Arabic'],
        areaServed:          'Worldwide',
      },
    },
    {
      '@type':           'WebSite',
      '@id':             'https://utubooking.com/#website',
      url:               'https://utubooking.com',
      name:              'UTUBooking',
      description:       'Hotels, Flights & Cars for Hajj & Umrah Travelers',
      publisher:         { '@id': 'https://utubooking.com/#organization' },
      potentialAction: {
        '@type':       'SearchAction',
        target: {
          '@type':       'EntryPoint',
          urlTemplate:   'https://utubooking.com/hotels?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read tenant config injected by middleware.ts edge function
  const headersList  = await headers();
  const tenantConfig = parseTenantHeader(headersList.get('x-tenant-config'));
  // x-user-locale: user's manual language selection (from LocaleSwitcher cookie), takes priority
  const userLocale   = headersList.get('x-user-locale') ?? tenantConfig.locale;
  const { lang, dir } = getLocaleAttrs(userLocale);
  const countryCode  = headersList.get('x-country-code') ?? '';
  const pathname     = headersList.get('x-pathname') ?? '';

  // Maintenance mode — skip for /admin so ops can turn it off
  const isAdminPath = pathname.startsWith('/admin');
  const maintenance = isAdminPath ? { on: false, message: '' } : await getMaintenanceMode();

  // Load messages + locale for NextIntlClientProvider so 'use client' components
  // can call useTranslations() and useLocale() hooks.
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#1E3A5F" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        {/* Organization + WebSite structured data — site-wide rich result eligibility */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        {/* CJK & Thai fonts via Google Fonts CDN.
            NOT loaded via @fontsource CSS imports in globals.css — each CJK
            fontsource package contains ~124 @font-face subsets (~250 file refs
            per weight) which overwhelms Turbopack's dev-mode watcher and causes
            "An unexpected Turbopack error". Google Fonts serves the same
            optimized unicode-range subsets without that overhead.
            eslint-disable-next-line is intentional: next/font cannot replace
            multi-family CJK+Thai subsets without triggering Turbopack watcher OOM. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+KR:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+TC:wght@400;700&family=Noto+Sans+Thai:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${notoKufiArabic.variable} antialiased`}
      >
        {maintenance.on ? (
          /* ── Maintenance mode — full page block (admin paths are exempt) ── */
          <div className="min-h-screen bg-utu-navy flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="text-6xl mb-6">🛠️</div>
              <h1 className="text-3xl font-bold text-white mb-3">Down for Maintenance</h1>
              <p className="text-white/70 text-lg mb-4">
                {maintenance.message || 'UTUBooking is undergoing scheduled maintenance. We\'ll be back shortly.'}
              </p>
              <p className="text-white/50 text-sm">
                For urgent support, contact{' '}
                <a href="mailto:support@utubooking.com" className="text-amber-300 hover:underline">
                  support@utubooking.com
                </a>
              </p>
            </div>
          </div>
        ) : (
          <TenantProvider config={tenantConfig}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ConditionalHeader />
              <Providers>{children}</Providers>
              <Footer />
              {/* Affiliate referral click tracker — fires once per session when ?ref= is present */}
              <Suspense fallback={null}>
                <AffiliateRefTracker />
              </Suspense>
              {/* Compliance banners — each self-guards by locale/countryCode */}
              <GDPRConsentBanner countryCode={countryCode} />
              <KVKKBanner        countryCode={countryCode} />
              <DpdpConsentBanner countryCode={countryCode} />
              <CCPAFooterLink    countryCode={countryCode} />
            </NextIntlClientProvider>
          </TenantProvider>
        )}
        <PwaInit />
      </body>
    </html>
  );
}
