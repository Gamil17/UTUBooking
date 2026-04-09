'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Tab = 'hotels' | 'flights' | 'cars';

// ─── Shared: Trust Banner ─────────────────────────────────────────────────────

function StarHalf() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden="true">
      <defs>
        <linearGradient id="half">
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D1D5DB" />
        </linearGradient>
      </defs>
      <path fill="url(#half)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
function StarFull() {
  return (
    <svg viewBox="0 0 20 20" fill="#F59E0B" className="w-4 h-4" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function AppStoreBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-utu-bg-muted rounded-full px-2 py-1">
      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <span className="text-xs text-utu-text-secondary font-medium">App Store</span>
    </div>
  );
}

function PlayStoreBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-utu-bg-muted rounded-full px-2 py-1">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 20.5v-17l18 8.5-18 8.5z" fill="#34A853"/>
        <path d="M3 3.5l10.5 10.5L3 20.5V3.5z" fill="#EA4335"/>
        <path d="M3 3.5l10.5 10.5 4.5-4.5L3 3.5z" fill="#FBBC04"/>
        <path d="M13.5 14l4.5 4.5L3 20.5l10.5-6.5z" fill="#4285F4"/>
      </svg>
      <span className="text-xs text-utu-text-secondary font-medium">Google Play</span>
    </div>
  );
}

function TrustBanner() {
  const t = useTranslations('hero');
  return (
    <section className="bg-utu-bg-card py-10 px-4 text-center border-b border-utu-border-default">
      <p className="text-lg font-bold text-utu-text-primary mb-6">
        {t('trustTitle')}
      </p>
      <div className="flex flex-wrap justify-center gap-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-utu-text-primary">4.7</span>
          <div>
            <div className="flex gap-0.5">{[0,1,2,3].map(i => <StarFull key={i}/>)}<StarHalf /></div>
            <div className="flex items-center gap-1 mt-0.5">
              <AppStoreBadge />
              <span className="text-xs text-utu-text-muted">{t('appStoreReviews')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-utu-text-primary">4.5</span>
          <div>
            <div className="flex gap-0.5">{[0,1,2,3].map(i => <StarFull key={i}/>)}<StarHalf /></div>
            <div className="flex items-center gap-1 mt-0.5">
              <PlayStoreBadge />
              <span className="text-xs text-utu-text-muted">{t('googlePlayReviews')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Shared: Feature highlights ───────────────────────────────────────────────

function Features() {
  const t = useTranslations('hero');
  const FEATURES = [
    { icon: '💰', title: t('feat1Title'), desc: t('feat1Desc') },
    { icon: '💳', title: t('feat2Title'), desc: t('feat2Desc') },
    { icon: '🕐', title: t('feat3Title'), desc: t('feat3Desc') },
  ];
  return (
    <section className="bg-utu-bg-card py-14 px-4 border-b border-utu-border-default">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-utu-text-primary mb-1 text-sm">{f.title}</h3>
            <p className="text-xs text-utu-text-muted leading-relaxed max-w-xs mx-auto">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Shared: App download ─────────────────────────────────────────────────────

function AppDownload() {
  const t = useTranslations('hero');
  return (
    <section id="app-download" className="py-14 px-4">
      <div className="max-w-5xl mx-auto bg-utu-navy rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
        {/* Phone mockup */}
        <div className="shrink-0 w-36 md:w-44">
          <div className="bg-utu-navy rounded-3xl border-4 border-utu-navy p-3 aspect-[9/16] flex flex-col items-center justify-start gap-2 shadow-2xl">
            <div className="w-full bg-utu-navy rounded-xl p-2 text-center">
              <div className="w-6 h-6 bg-amber-400 rounded-lg mx-auto flex items-center justify-center mb-1">
                <span className="text-utu-navy font-black text-xs">U</span>
              </div>
              <p className="text-white text-xs font-bold">UTUBooking</p>
            </div>
            <div className="flex gap-1 w-full">
              <div className="flex-1 bg-utu-navy/60 rounded-lg p-1.5 text-center">
                <div className="text-base">✈️</div>
                <p className="text-white text-[8px]">Flights</p>
              </div>
              <div className="flex-1 bg-amber-400/20 rounded-lg p-1.5 text-center border border-amber-400/40">
                <div className="text-base">🏨</div>
                <p className="text-white text-[8px]">Hotels</p>
              </div>
            </div>
            <div className="w-full bg-utu-navy/40 rounded-lg p-2">
              <p className="text-white text-[8px] mb-1 font-semibold">Makkah Hotels</p>
              <div className="space-y-1">
                {['Swissotel Makkah', 'Hilton Suites'].map(n => (
                  <div key={n} className="bg-utu-navy/60 rounded p-1 flex justify-between">
                    <span className="text-[7px] text-white/80">{n}</span>
                    <span className="text-[7px] text-amber-300 font-bold">SAR 850</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-snug">
            {t('appTitle')}
          </h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-white/80 mb-6">
            <span className="flex items-center gap-1"><span className="text-amber-300">✓</span> {t('appDeal1')}</span>
            <span className="flex items-center gap-1"><span className="text-amber-300">✓</span> {t('appDeal2')}</span>
            <span className="flex items-center gap-1"><span className="text-amber-300">✓</span> {t('appDeal3')}</span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <a href="#app-download" className="flex items-center gap-2 bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-900 transition-colors /* EXCEPTION: App Store/Google Play buttons use black per Apple/Google brand guidelines */">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div><p className="text-[9px] opacity-70">{t('downloadOn')}</p><p>App Store</p></div>
            </a>
            <a href="#app-download" className="flex items-center gap-2 bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-900 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 20.5v-17l18 8.5-18 8.5z" fill="#34A853"/>
                <path d="M3 3.5l10.5 10.5L3 20.5V3.5z" fill="#EA4335"/>
                <path d="M3 3.5l10.5 10.5 4.5-4.5L3 3.5z" fill="#FBBC04"/>
                <path d="M13.5 14l4.5 4.5L3 20.5l10.5-6.5z" fill="#4285F4"/>
              </svg>
              <div><p className="text-[9px] opacity-70">{t('getItOn')}</p><p>Google Play</p></div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Shared: FAQ accordion ────────────────────────────────────────────────────

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            <svg
              className={`w-5 h-5 text-utu-text-muted shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-utu-text-muted leading-relaxed border-t border-utu-border-default">
              <p className="pt-4">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTELS SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const HOTEL_PARTNERS = [
  { name: 'Hotelbeds', color: '#E31837' },
  { name: 'Booking.com', color: '#003580' },
  { name: 'Agoda', color: '#E4002B' },
  { name: 'Expedia', color: '#00355F' },
  { name: 'Marriott', color: '#8B0000' },
  { name: 'Hilton', color: '#004B87' },
];

const POPULAR_HOTELS = [
  { name: 'Swissotel Makkah', city: 'Makkah', stars: 5, score: '9.2', reviews: 2841, price: 'SAR 1,250', gradient: 'from-utu-navy to-teal-600' },
  { name: 'Dar Al Hijra InterContinental', city: 'Madinah', stars: 5, score: '9.0', reviews: 1923, price: 'SAR 980', gradient: 'from-blue-800 to-indigo-600' },
  { name: 'Mövenpick Hotel & Residences', city: 'Makkah', stars: 5, score: '8.8', reviews: 3120, price: 'SAR 1,100', gradient: 'from-amber-800 to-orange-600' },
  { name: 'Anwar Al Madinah Mövenpick', city: 'Madinah', stars: 5, score: '9.1', reviews: 1654, price: 'SAR 850', gradient: 'from-purple-800 to-violet-600' },
];

const HOTEL_CITIES = ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Dubai', 'Istanbul', 'Kuala Lumpur', 'Jakarta', 'Cairo', 'London'];
const HOTEL_COUNTRIES = ['Saudi Arabia', 'UAE', 'Turkey', 'Malaysia', 'Indonesia', 'Egypt', 'Jordan', 'Morocco', 'Germany', 'United Kingdom'];


function HotelSections() {
  const t = useTranslations('hero');
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);

  const HOTEL_FAQS = [
    { q: t('hotelFaq1Q'), a: t('hotelFaq1A') },
    { q: t('hotelFaq2Q'), a: t('hotelFaq2A') },
    { q: t('hotelFaq3Q'), a: t('hotelFaq3A') },
    { q: t('hotelFaq4Q'), a: t('hotelFaq4A') },
    { q: t('hotelFaq5Q'), a: t('hotelFaq5A') },
  ];

  return (
    <>
      <TrustBanner />

      {/* Hotel partners */}
      <section className="bg-utu-bg-card py-12 px-4 border-b border-utu-border-default text-center">
        <p className="text-base font-bold text-utu-text-primary mb-6">
          {t('hotelPartnerText')}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 max-w-3xl mx-auto">
          {HOTEL_PARTNERS.map((p) => (
            <span
              key={p.name}
              className="text-sm font-black tracking-tight px-1"
              style={{ color: p.color }}
            >
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-utu-text-muted mt-4">{t('andMore')}</p>
      </section>

      <Features />

      {/* Popular hotels */}
      <section className="py-14 px-4 bg-utu-bg-page">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-1">{t('popularHotelsTitle')}</h2>
          <p className="text-xs text-utu-text-muted text-center mb-8">{t('hotelRatesNote')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_HOTELS.map((h) => (
              <div key={h.name} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className={`h-36 bg-gradient-to-br ${h.gradient} flex items-end p-3`}>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{h.name}</p>
                    <p className="text-white/70 text-xs">{h.city}{t('saudiArabiaSuffix')}</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: h.stars }).map((_, i) => (
                      <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-utu-navy text-white text-xs font-bold px-1.5 py-0.5 rounded">{h.score}</span>
                      <span className="text-xs text-utu-text-muted">{h.reviews.toLocaleString()} {t('reviewsLabel')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-utu-text-muted mt-2">{t('fromLabel')} <span className="font-bold text-utu-text-primary">{h.price}</span> {t('perNightLabel')}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-utu-text-muted mt-6">
            {t('pricesDisclaimer')}
          </p>
        </div>
      </section>

      {/* Explore popular hotels */}
      <section className="py-14 px-4 bg-utu-bg-card border-y border-utu-border-default">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('exploreHotels')}</h2>
          <div className="space-y-2">
            {/* Cities */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                onClick={() => setCitiesOpen(!citiesOpen)}
              >
                <span>{t('hotelTopCities')}</span>
                <svg className={`w-5 h-5 text-utu-text-muted transition-transform ${citiesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {citiesOpen && (
                <div className="px-6 pb-5 border-t border-utu-border-default">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {HOTEL_CITIES.map((c) => (
                      <span key={c} className="text-sm text-utu-blue hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Countries */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                onClick={() => setCountriesOpen(!countriesOpen)}
              >
                <span>{t('hotelTopCountries')}</span>
                <svg className={`w-5 h-5 text-utu-text-muted transition-transform ${countriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {countriesOpen && (
                <div className="px-6 pb-5 border-t border-utu-border-default">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {HOTEL_COUNTRIES.map((c) => (
                      <span key={c} className="text-sm text-utu-blue hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('faqHeading')}</h2>
          <Accordion items={HOTEL_FAQS} />
        </div>
      </section>

      <AppDownload />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLIGHTS SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const AIRLINE_PARTNERS = [
  { name: 'Saudia', color: '#006341' },
  { name: 'flynas', color: '#FF6600' },
  { name: 'flyadeal', color: '#00A651' },
  { name: 'EgyptAir', color: '#003087' },
  { name: 'Wingie', color: '#1A1A2E' },
  { name: 'Almosafer', color: '#00A99D' },
  { name: 'Air Arabia', color: '#CE1126' },
];

const TOP_DESTINATIONS = [
  { city: 'Dubai', code: 'DXB', price: 'SAR 315', gradient: 'from-amber-700 to-orange-500' },
  { city: 'Cairo', code: 'CAI', price: 'SAR 420', gradient: 'from-yellow-700 to-amber-500' },
  { city: 'Istanbul', code: 'IST', price: 'SAR 780', gradient: 'from-red-800 to-red-500' },
  { city: 'Kuala Lumpur', code: 'KUL', price: 'SAR 1,100', gradient: 'from-blue-800 to-cyan-500' },
  { city: 'Jakarta', code: 'CGK', price: 'SAR 1,350', gradient: 'from-green-800 to-utu-blue' },
  { city: 'Amman', code: 'AMM', price: 'SAR 290', gradient: 'from-slate-700 to-slate-500' },
];

const FLIGHT_CITIES = ['Dubai', 'Cairo', 'Istanbul', 'Amman', 'Kuala Lumpur', 'Jakarta', 'London', 'Paris', 'Frankfurt', 'New York'];
const FLIGHT_COUNTRIES = ['UAE', 'Egypt', 'Turkey', 'Jordan', 'Malaysia', 'Indonesia', 'United Kingdom', 'France', 'Germany', 'United States'];


function FlightSections() {
  const t = useTranslations('hero');
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);

  const FLIGHT_FAQS = [
    { q: t('flightFaq1Q'), a: t('flightFaq1A') },
    { q: t('flightFaq2Q'), a: t('flightFaq2A') },
    { q: t('flightFaq3Q'), a: t('flightFaq3A') },
    { q: t('flightFaq4Q'), a: t('flightFaq4A') },
    { q: t('flightFaq5Q'), a: t('flightFaq5A') },
  ];

  return (
    <>
      <TrustBanner />

      {/* Airline partners */}
      <section className="bg-utu-bg-card py-12 px-4 border-b border-utu-border-default text-center">
        <p className="text-base font-bold text-utu-text-primary mb-6">
          {t('flightPartnerText')}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 max-w-3xl mx-auto">
          {AIRLINE_PARTNERS.map((a) => (
            <span
              key={a.name}
              className="text-sm font-black tracking-tight px-1"
              style={{ color: a.color }}
            >
              {a.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-utu-text-muted mt-4">{t('andMore')}</p>
      </section>

      <Features />

      {/* Top destinations */}
      <section className="py-14 px-4 bg-utu-bg-page">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">
            {t('topDestTitle')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOP_DESTINATIONS.map((d) => (
              <div
                key={d.city}
                className={`relative rounded-2xl overflow-hidden h-40 cursor-pointer hover:scale-105 transition-transform bg-gradient-to-br ${d.gradient} flex items-end p-3`}
              >
                <div>
                  <p className="text-white font-bold text-sm">{d.city}</p>
                  <p className="text-white/70 text-xs">{d.code}</p>
                  <p className="text-amber-300 text-xs font-semibold mt-0.5">{t('fromPricePrefix')} {d.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore popular flights */}
      <section className="py-14 px-4 bg-utu-bg-card border-y border-utu-border-default">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('exploreFlights')}</h2>
          <div className="space-y-2">
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                onClick={() => setCitiesOpen(!citiesOpen)}
              >
                <span>{t('flightTopCities')}</span>
                <svg className={`w-5 h-5 text-utu-text-muted transition-transform ${citiesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {citiesOpen && (
                <div className="px-6 pb-5 border-t border-utu-border-default">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {FLIGHT_CITIES.map((c) => (
                      <span key={c} className="text-sm text-utu-blue hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                onClick={() => setCountriesOpen(!countriesOpen)}
              >
                <span>{t('flightTopCountries')}</span>
                <svg className={`w-5 h-5 text-utu-text-muted transition-transform ${countriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {countriesOpen && (
                <div className="px-6 pb-5 border-t border-utu-border-default">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {FLIGHT_COUNTRIES.map((c) => (
                      <span key={c} className="text-sm text-utu-blue hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('faqHeading')}</h2>
          <Accordion items={FLIGHT_FAQS} />
        </div>
      </section>

      <AppDownload />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARS SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CAR_PARTNERS = [
  { name: 'Budget', color: '#E31837' },
  { name: 'Hertz', color: '#FFD700', bg: true },
  { name: 'SIXT', color: '#FF6600' },
  { name: 'Avis', color: '#C41230' },
  { name: 'Enterprise', color: '#007A33' },
  { name: 'Europcar', color: '#00A651' },
];

// CAR_STEPS titles/descs are translated inside CarSections() using t()


const CAR_LOCATIONS = ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Dammam', 'Dubai', 'Abu Dhabi', 'Istanbul', 'Cairo', 'Amman'];

function CarSections() {
  const t = useTranslations('hero');
  const [locationsOpen, setLocationsOpen] = useState(false);

  const CAR_FAQS = [
    { q: t('carFaq1Q'), a: t('carFaq1A') },
    { q: t('carFaq2Q'), a: t('carFaq2A') },
    { q: t('carFaq3Q'), a: t('carFaq3A') },
    { q: t('carFaq4Q'), a: t('carFaq4A') },
    { q: t('carFaq5Q'), a: t('carFaq5A') },
  ];

  const CAR_STEPS = [
    { n: '1', icon: '🔍', title: t('carStep1Title'), desc: t('carStep1Desc') },
    { n: '2', icon: '⚖️', title: t('carStep2Title'), desc: t('carStep2Desc') },
    { n: '3', icon: '✅', title: t('carStep3Title'), desc: t('carStep3Desc') },
  ];

  return (
    <>
      <TrustBanner />

      {/* Car rental partners */}
      <section className="bg-utu-bg-card py-12 px-4 border-b border-utu-border-default text-center">
        <p className="text-base font-bold text-utu-text-primary mb-6">
          {t('carPartnerText')}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 max-w-3xl mx-auto">
          {CAR_PARTNERS.map((p) => (
            <span
              key={p.name}
              className="text-sm font-black tracking-tight px-1"
              style={{ color: p.color }}
            >
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-utu-text-muted mt-4">{t('carSuppliersNote')}</p>
      </section>

      <Features />

      {/* 3-step process */}
      <section className="py-14 px-4 bg-utu-bg-page">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-12">{t('carStepsTitle')}</h2>
          <div className="relative">
            {/* Progress line */}
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-0.5 bg-utu-bg-subtle" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {CAR_STEPS.map((s) => (
                <div key={s.n} className="relative flex flex-col items-center">
                  <div className="w-16 h-16 bg-utu-navy text-white rounded-full flex items-center justify-center text-xl font-black mb-4 shadow-lg z-10 relative">
                    {s.n}
                  </div>
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <h3 className="font-bold text-utu-text-primary mb-2">{s.title}</h3>
                  <p className="text-sm text-utu-text-muted leading-relaxed max-w-xs">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Explore locations */}
      <section className="py-14 px-4 bg-utu-bg-card border-y border-utu-border-default">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('exploreCars')}</h2>
          <div className="space-y-2">
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                onClick={() => setLocationsOpen(!locationsOpen)}
              >
                <span>{t('carTopCities')}</span>
                <svg className={`w-5 h-5 text-utu-text-muted transition-transform ${locationsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {locationsOpen && (
                <div className="px-6 pb-5 border-t border-utu-border-default">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {CAR_LOCATIONS.map((c) => (
                      <span key={c} className="text-sm text-utu-blue hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('faqHeading')}</h2>
          <Accordion items={CAR_FAQS} />
        </div>
      </section>

      <AppDownload />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TabSections({ tab }: { tab: Tab }) {
  if (tab === 'flights') return <FlightSections />;
  if (tab === 'cars')    return <CarSections />;
  return <HotelSections />;
}
