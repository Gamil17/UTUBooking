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
import Footer            from '@/components/Footer';
import ConditionalHeader from '@/components/ConditionalHeader';
import './globals.css';
import '@/styles/urdu.css';
import '@/styles/hindi.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/600.css';
import '@fontsource/noto-nastaliq-urdu/400.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read tenant config injected by middleware.ts edge function
  const headersList = await headers();
  const tenantConfig = parseTenantHeader(headersList.get('x-tenant-config'));
  // x-user-locale: user's manual language selection (from LocaleSwitcher cookie), takes priority
  const userLocale   = headersList.get('x-user-locale') ?? tenantConfig.locale;
  const { lang, dir } = getLocaleAttrs(userLocale);
  const countryCode  = headersList.get('x-country-code') ?? '';

  // Load messages + locale for NextIntlClientProvider so 'use client' components
  // can call useTranslations() and useLocale() hooks.
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#10B981" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
      </head>
      <body
        className={`${inter.variable} ${notoKufiArabic.variable} antialiased`}
      >
        <TenantProvider config={tenantConfig}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ConditionalHeader />
            <Providers>{children}</Providers>
            <Footer />
            {/* Compliance banners — each self-guards by locale/countryCode */}
            <GDPRConsentBanner countryCode={countryCode} />
            <KVKKBanner        countryCode={countryCode} />
            <DpdpConsentBanner countryCode={countryCode} />
            <CCPAFooterLink    countryCode={countryCode} />
          </NextIntlClientProvider>
        </TenantProvider>
        <PwaInit />
      </body>
    </html>
  );
}
