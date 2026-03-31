'use client';

import { useState } from 'react';

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
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <span className="text-xs text-gray-600 font-medium">App Store</span>
    </div>
  );
}

function PlayStoreBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 20.5v-17l18 8.5-18 8.5z" fill="#34A853"/>
        <path d="M3 3.5l10.5 10.5L3 20.5V3.5z" fill="#EA4335"/>
        <path d="M3 3.5l10.5 10.5 4.5-4.5L3 3.5z" fill="#FBBC04"/>
        <path d="M13.5 14l4.5 4.5L3 20.5l10.5-6.5z" fill="#4285F4"/>
      </svg>
      <span className="text-xs text-gray-600 font-medium">Google Play</span>
    </div>
  );
}

function TrustBanner() {
  return (
    <section className="bg-white py-10 px-4 text-center border-b border-gray-100">
      <p className="text-lg font-bold text-gray-900 mb-6">
        Trusted by 2 million+ travelers across the Muslim World
      </p>
      <div className="flex flex-wrap justify-center gap-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-gray-900">4.7</span>
          <div>
            <div className="flex gap-0.5">{[0,1,2,3].map(i => <StarFull key={i}/>)}<StarHalf /></div>
            <div className="flex items-center gap-1 mt-0.5">
              <AppStoreBadge />
              <span className="text-xs text-gray-400">12,400+ reviews</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-gray-900">4.5</span>
          <div>
            <div className="flex gap-0.5">{[0,1,2,3].map(i => <StarFull key={i}/>)}<StarHalf /></div>
            <div className="flex items-center gap-1 mt-0.5">
              <PlayStoreBadge />
              <span className="text-xs text-gray-400">8,900+ reviews</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Shared: Feature highlights ───────────────────────────────────────────────

const FEATURES = [
  {
    icon: '💰',
    title: 'Best prices, verified',
    desc: 'We compare live rates from Hotelbeds, Amadeus, and 50+ suppliers — you always get the real price in SAR.',
  },
  {
    icon: '💳',
    title: 'Flexible ways to pay',
    desc: 'Mada, STC Pay, Apple Pay, Visa, Mastercard, and local payment methods across 25+ markets.',
  },
  {
    icon: '🕐',
    title: 'Support 24/7',
    desc: 'Arabic and English support around the clock — especially during Hajj and Umrah peak season.',
  },
];

function Features() {
  return (
    <section className="bg-white py-14 px-4 border-b border-gray-100">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-gray-900 mb-1 text-sm">{f.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Shared: App download ─────────────────────────────────────────────────────

function AppDownload() {
  return (
    <section id="app-download" className="py-14 px-4">
      <div className="max-w-5xl mx-auto bg-emerald-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
        {/* Phone mockup */}
        <div className="shrink-0 w-36 md:w-44">
          <div className="bg-emerald-800 rounded-3xl border-4 border-emerald-700 p-3 aspect-[9/16] flex flex-col items-center justify-start gap-2 shadow-2xl">
            <div className="w-full bg-emerald-700 rounded-xl p-2 text-center">
              <div className="w-6 h-6 bg-amber-400 rounded-lg mx-auto flex items-center justify-center mb-1">
                <span className="text-emerald-900 font-black text-xs">U</span>
              </div>
              <p className="text-white text-xs font-bold">UTUBooking</p>
            </div>
            <div className="flex gap-1 w-full">
              <div className="flex-1 bg-emerald-700/60 rounded-lg p-1.5 text-center">
                <div className="text-base">✈️</div>
                <p className="text-white text-[8px]">Flights</p>
              </div>
              <div className="flex-1 bg-amber-400/20 rounded-lg p-1.5 text-center border border-amber-400/40">
                <div className="text-base">🏨</div>
                <p className="text-white text-[8px]">Hotels</p>
              </div>
            </div>
            <div className="w-full bg-emerald-700/40 rounded-lg p-2">
              <p className="text-white text-[8px] mb-1 font-semibold">Makkah Hotels</p>
              <div className="space-y-1">
                {['Swissotel Makkah', 'Hilton Suites'].map(n => (
                  <div key={n} className="bg-emerald-700/60 rounded p-1 flex justify-between">
                    <span className="text-[7px] text-emerald-100">{n}</span>
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
            The Muslim World's travel app — coming soon
          </h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-emerald-100 mb-6">
            <span className="flex items-center gap-1"><span className="text-amber-300">✓</span> App-only deals</span>
            <span className="flex items-center gap-1"><span className="text-amber-300">✓</span> Offline itineraries</span>
            <span className="flex items-center gap-1"><span className="text-amber-300">✓</span> Prayer time alerts</span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <a href="#app-download" className="flex items-center gap-2 bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-900 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div><p className="text-[9px] opacity-70">Download on the</p><p>App Store</p></div>
            </a>
            <a href="#app-download" className="flex items-center gap-2 bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-900 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 20.5v-17l18 8.5-18 8.5z" fill="#34A853"/>
                <path d="M3 3.5l10.5 10.5L3 20.5V3.5z" fill="#EA4335"/>
                <path d="M3 3.5l10.5 10.5 4.5-4.5L3 3.5z" fill="#FBBC04"/>
                <path d="M13.5 14l4.5 4.5L3 20.5l10.5-6.5z" fill="#4285F4"/>
              </svg>
              <div><p className="text-[9px] opacity-70">GET IT ON</p><p>Google Play</p></div>
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
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            <svg
              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100">
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
  { name: 'Swissotel Makkah', city: 'Makkah', stars: 5, score: '9.2', reviews: 2841, price: 'SAR 1,250', gradient: 'from-emerald-800 to-teal-600' },
  { name: 'Dar Al Hijra InterContinental', city: 'Madinah', stars: 5, score: '9.0', reviews: 1923, price: 'SAR 980', gradient: 'from-blue-800 to-indigo-600' },
  { name: 'Mövenpick Hotel & Residences', city: 'Makkah', stars: 5, score: '8.8', reviews: 3120, price: 'SAR 1,100', gradient: 'from-amber-800 to-orange-600' },
  { name: 'Anwar Al Madinah Mövenpick', city: 'Madinah', stars: 5, score: '9.1', reviews: 1654, price: 'SAR 850', gradient: 'from-purple-800 to-violet-600' },
];

const HOTEL_CITIES = ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Dubai', 'Istanbul', 'Kuala Lumpur', 'Jakarta', 'Cairo', 'London'];
const HOTEL_COUNTRIES = ['Saudi Arabia', 'UAE', 'Turkey', 'Malaysia', 'Indonesia', 'Egypt', 'Jordan', 'Morocco', 'Germany', 'United Kingdom'];

const HOTEL_FAQS = [
  {
    q: 'What is UTUBooking Hotels, and how does it work?',
    a: 'UTUBooking searches live hotel availability from Hotelbeds, Booking.com, and direct hotel partners in real time. You compare prices, select your preferred property, and confirm your booking instantly — with a confirmation sent directly to your email.',
  },
  {
    q: 'How does UTUBooking find the lowest hotel rate (with taxes and fees)?',
    a: 'We display the total price inclusive of taxes and fees before you book. Our search engine pulls live rates from multiple suppliers simultaneously, so you always see the best available rate at the time of search.',
  },
  {
    q: 'What payment methods are accepted for hotel bookings?',
    a: 'We accept Mada, STC Pay, Apple Pay, Visa, Mastercard, and local payment methods for every market. Saudi Arabia (SAR), UAE (AED), and all 25+ markets have dedicated payment options.',
  },
  {
    q: 'Can I see room details, amenities, and cancellation rules before I book?',
    a: 'Yes. Each listing shows full room details, halal amenity filters (prayer mats, Quran, Zamzam water, qibla direction), distance from Masjid al-Haram, bed type, breakfast inclusion, and the exact cancellation and refund policy.',
  },
  {
    q: 'What support does UTUBooking provide after I book a hotel?',
    a: 'Our 24/7 Arabic and English support team handles changes, cancellations, no-shows, and refunds. During Hajj and Umrah peak season, we add dedicated support agents for pilgrims.',
  },
];

function HotelSections() {
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);

  return (
    <>
      <TrustBanner />

      {/* Hotel partners */}
      <section className="bg-white py-12 px-4 border-b border-gray-100 text-center">
        <p className="text-base font-bold text-gray-900 mb-6">
          Live rates from 50+ hotel suppliers. One simple search.
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
        <p className="text-xs text-gray-400 mt-4">...and more</p>
      </section>

      <Features />

      {/* Popular hotels */}
      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Popular Hotels for Hajj & Umrah</h2>
          <p className="text-xs text-gray-400 text-center mb-8">Rates for tonight — subject to availability</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_HOTELS.map((h) => (
              <div key={h.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className={`h-36 bg-gradient-to-br ${h.gradient} flex items-end p-3`}>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{h.name}</p>
                    <p className="text-white/70 text-xs">{h.city}, Saudi Arabia</p>
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
                      <span className="bg-emerald-700 text-white text-xs font-bold px-1.5 py-0.5 rounded">{h.score}</span>
                      <span className="text-xs text-gray-400">{h.reviews.toLocaleString()} reviews</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">From <span className="font-bold text-gray-900">{h.price}</span> / night</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Prices shown are the best recent rates and are subject to availability.
          </p>
        </div>
      </section>

      {/* Explore popular hotels */}
      <section className="py-14 px-4 bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Explore popular hotels</h2>
          <div className="space-y-2">
            {/* Cities */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                onClick={() => setCitiesOpen(!citiesOpen)}
              >
                <span>Hotels in top cities</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${citiesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {citiesOpen && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {HOTEL_CITIES.map((c) => (
                      <span key={c} className="text-sm text-emerald-700 hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Countries */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                onClick={() => setCountriesOpen(!countriesOpen)}
              >
                <span>Hotels in top countries</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${countriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {countriesOpen && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {HOTEL_COUNTRIES.map((c) => (
                      <span key={c} className="text-sm text-emerald-700 hover:underline cursor-pointer">{c}</span>
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
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
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
  { city: 'Jakarta', code: 'CGK', price: 'SAR 1,350', gradient: 'from-green-800 to-emerald-500' },
  { city: 'Amman', code: 'AMM', price: 'SAR 290', gradient: 'from-slate-700 to-slate-500' },
];

const FLIGHT_CITIES = ['Dubai', 'Cairo', 'Istanbul', 'Amman', 'Kuala Lumpur', 'Jakarta', 'London', 'Paris', 'Frankfurt', 'New York'];
const FLIGHT_COUNTRIES = ['UAE', 'Egypt', 'Turkey', 'Jordan', 'Malaysia', 'Indonesia', 'United Kingdom', 'France', 'Germany', 'United States'];

const FLIGHT_FAQS = [
  {
    q: 'What is UTUBooking Flights, and how does it work?',
    a: 'UTUBooking searches live flight availability from Saudia, Flynas, Flyadeal, EgyptAir, Air Arabia, and 50+ carriers via Amadeus GDS. You compare prices, select your preferred itinerary, and book in seconds — with your e-ticket sent directly to your email.',
  },
  {
    q: 'How does UTUBooking find the cheapest airfare (with taxes and fees)?',
    a: 'All prices shown include taxes, airport fees, and carrier surcharges. Our search engine compares fares in real time across multiple GDS systems and direct airline APIs, so you see the true total cost before you book.',
  },
  {
    q: 'What payment options and currencies are supported for flights?',
    a: 'We support Mada, STC Pay, Apple Pay, Visa, and Mastercard. Flights can be paid in SAR, AED, USD, and all 25+ market currencies. Instalment options via Tamara and Tabby are available for Saudi Arabia.',
  },
  {
    q: 'Can I see baggage, seat selection, and cancellation rules before I book?',
    a: 'Yes. Each fare shows the included baggage allowance, hand luggage limits, seat selection availability, and the exact change and cancellation fee schedule before you confirm payment.',
  },
  {
    q: 'What support does UTUBooking provide after I book a flight?',
    a: 'Our 24/7 support team handles rebooking, cancellation requests, schedule change notifications, and refund processing. Arabic-language support is available at all times.',
  },
];

function FlightSections() {
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);

  return (
    <>
      <TrustBanner />

      {/* Airline partners */}
      <section className="bg-white py-12 px-4 border-b border-gray-100 text-center">
        <p className="text-base font-bold text-gray-900 mb-6">
          50+ airlines searched. One simple result.
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
        <p className="text-xs text-gray-400 mt-4">...and more</p>
      </section>

      <Features />

      {/* Top destinations */}
      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">
            Top searched destinations from Riyadh
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
                  <p className="text-amber-300 text-xs font-semibold mt-0.5">from {d.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore popular flights */}
      <section className="py-14 px-4 bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Explore popular flights</h2>
          <div className="space-y-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                onClick={() => setCitiesOpen(!citiesOpen)}
              >
                <span>Flights to top cities from Saudi Arabia</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${citiesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {citiesOpen && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {FLIGHT_CITIES.map((c) => (
                      <span key={c} className="text-sm text-emerald-700 hover:underline cursor-pointer">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                onClick={() => setCountriesOpen(!countriesOpen)}
              >
                <span>Flights to top countries from Saudi Arabia</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${countriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {countriesOpen && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {FLIGHT_COUNTRIES.map((c) => (
                      <span key={c} className="text-sm text-emerald-700 hover:underline cursor-pointer">{c}</span>
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
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
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

const CAR_STEPS = [
  {
    n: '1',
    icon: '🔍',
    title: 'Search',
    desc: 'Find the best car options in Makkah, Madinah, Riyadh, Jeddah, and 500+ cities — instantly.',
  },
  {
    n: '2',
    icon: '⚖️',
    title: 'Compare',
    desc: 'Compare prices, car category, mileage, and cancellation policy at a glance — no hidden fees.',
  },
  {
    n: '3',
    icon: '✅',
    title: 'Book',
    desc: 'Book with confidence. Free cancellation on most cars. Instant confirmation in SAR.',
  },
];

const CAR_FAQS = [
  {
    q: 'What is UTUBooking Car Rentals, and how does it work?',
    a: 'UTUBooking searches live car availability from Budget, Hertz, SIXT, Avis, Enterprise, and local Saudi rental companies. Compare prices, choose your vehicle, and get instant confirmation — with pickup instructions sent to your email.',
  },
  {
    q: 'What documents do I need to rent a car in Saudi Arabia?',
    a: 'You need a valid driving licence from your home country (along with an International Driving Permit for most nationalities), your passport, and the credit card used to book. GCC nationals can use their national ID and local licence.',
  },
  {
    q: 'Are there special rates for Hajj and Umrah transfers?',
    a: 'Yes. We offer Makkah-to-Madinah one-way and round-trip packages at pilgrimage rates during Hajj and Umrah season. These are bookable directly from the Car Rentals search.',
  },
  {
    q: 'Can I rent a car with a debit card or Mada?',
    a: 'Most suppliers require a credit card at pickup for the security deposit. You can pay the booking cost via Mada or STC Pay on UTUBooking, but please check individual supplier policies for deposit requirements.',
  },
  {
    q: 'What support is available if I have a problem with my rental?',
    a: 'Our 24/7 Arabic and English support team is available to help with pickup issues, vehicle problems, extensions, and damage disputes at any time.',
  },
];

const CAR_LOCATIONS = ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Dammam', 'Dubai', 'Abu Dhabi', 'Istanbul', 'Cairo', 'Amman'];

function CarSections() {
  const [locationsOpen, setLocationsOpen] = useState(false);

  return (
    <>
      <TrustBanner />

      {/* Car rental partners */}
      <section className="bg-white py-12 px-4 border-b border-gray-100 text-center">
        <p className="text-base font-bold text-gray-900 mb-6">
          Find the best car rental in seconds
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
        <p className="text-xs text-gray-400 mt-4">...and local Saudi suppliers</p>
      </section>

      <Features />

      {/* 3-step process */}
      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-12">Rent a car in three simple steps</h2>
          <div className="relative">
            {/* Progress line */}
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-0.5 bg-emerald-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {CAR_STEPS.map((s) => (
                <div key={s.n} className="relative flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xl font-black mb-4 shadow-lg z-10 relative">
                    {s.n}
                  </div>
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Explore locations */}
      <section className="py-14 px-4 bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Explore car rentals by location</h2>
          <div className="space-y-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                onClick={() => setLocationsOpen(!locationsOpen)}
              >
                <span>Car rentals in top cities</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${locationsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {locationsOpen && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {CAR_LOCATIONS.map((c) => (
                      <span key={c} className="text-sm text-emerald-700 hover:underline cursor-pointer">{c}</span>
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
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
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
