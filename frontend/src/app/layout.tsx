import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter, Noto_Kufi_Arabic } from 'next/font/google';
import Providers from '@/providers';
import TenantProvider from '@/components/TenantProvider';
import PwaInit from '@/components/PwaInit';
import { parseTenantHeader, getLocaleAttrs } from '@/lib/tenant';
import KVKKBanner        from '@/components/compliance/KVKKBanner';
import GDPRConsentBanner from '@/components/compliance/GDPRConsentBanner';
import DpdpConsentBanner from '@/components/compliance/DpdpConsentBanner';
import CCPAFooterLink    from '@/components/compliance/CCPAFooterLink';
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
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read tenant config injected by middleware.ts edge function
  const headersList = await headers();
  const tenantConfig = parseTenantHeader(headersList.get('x-tenant-config'));
  const { lang, dir } = getLocaleAttrs(tenantConfig.locale);
  const countryCode  = headersList.get('x-country-code') ?? '';

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
          <Providers>{children}</Providers>
          {/* Compliance banners — each self-guards by locale/countryCode */}
          <GDPRConsentBanner countryCode={countryCode} />
          <KVKKBanner        countryCode={countryCode} />
          <DpdpConsentBanner countryCode={countryCode} />
          <CCPAFooterLink    countryCode={countryCode} />
        </TenantProvider>
        <PwaInit />
      </body>
    </html>
  );
}
