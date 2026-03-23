'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchHotels, type HotelOffer } from '@/lib/api';
import LocaleDatePicker from '@/components/DatePicker';

// ─── Module-level constants ────────────────────────────────────────────────────
// Computed once at module load — a booking session never spans midnight.
function isoDate(offset = 0) {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
const TODAY    = isoDate(0);
const TOMORROW = isoDate(1);

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'ar' | 'id';
type Tab  = 'hotels' | 'flights' | 'cars';

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    brand:   'UTUBooking',
    tagline: 'Your Gateway to Makkah & Madinah',
    langBtn: 'العربية',
    nav: { about: 'About', contact: 'Contact Us' },
    tabs: { hotels: 'Hotels', flights: 'Flights', cars: 'Cars' },
    hotel: {
      dest:        'Destination',
      destHolder:  'Makkah, Madinah, Jeddah…',
      checkIn:     'Check-in',
      checkOut:    'Check-out',
      guests:      'Guests',
      guestsHolder:'2 Adults',
      searchBtn:   'Search Hotels',
    },
    flight: {
      from:        'From',
      fromHolder:  'Riyadh (RUH)',
      to:          'To',
      toHolder:    'Jeddah (JED)',
      depart:      'Departure',
      passengers:  'Passengers',
      passHolder:  '1 Adult',
      searchBtn:   'Search Flights',
    },
    car: {
      city:        'Pickup City',
      cityHolder:  'Makkah',
      pickup:      'Pickup Date',
      dropoff:     'Drop-off Date',
      searchBtn:   'Search Cars',
    },
    results: {
      heading:     'Available Hotels in Makkah',
      perNight:    '/ night',
      bookNow:     'Book Now',
      distHaram:   'm from Haram',
      count:       (n: number) => `${n} results`,
      error:       'Search failed. Please try again.',
      empty:       'No hotels found.',
      badge: {
        popular:   'Popular',
        value:     'Best Value',
        closest:   'Closest to Haram',
      },
    },
    hero: {
      subtitle: 'Verified hotels · Real-time availability · SAR pricing',
    },
    footer: {
      tagline: 'The trusted booking platform for Hajj & Umrah travelers.',
      pay:     'Secure payments via',
      links:   ['About', 'Contact', 'Terms', 'Privacy'],
      rights:  '© 2026 UTUBooking.com — AMEC Solutions. All rights reserved.',
    },
  },
  id: {
    brand:   'UTUBooking',
    tagline: 'Gerbang Anda ke Makkah & Madinah',
    langBtn: 'English',
    nav: { about: 'Tentang', contact: 'Hubungi Kami' },
    tabs: { hotels: 'Hotel', flights: 'Penerbangan', cars: 'Mobil' },
    hotel: {
      dest:        'Tujuan',
      destHolder:  'Makkah, Madinah, Jeddah…',
      checkIn:     'Waktu Masuk',
      checkOut:    'Waktu Keluar',
      guests:      'Tamu',
      guestsHolder:'2 Orang Dewasa',
      searchBtn:   'Cari Hotel',
    },
    flight: {
      from:        'Dari',
      fromHolder:  'Jakarta (CGK)',
      to:          'Ke',
      toHolder:    'Jeddah (JED)',
      depart:      'Keberangkatan',
      passengers:  'Penumpang',
      passHolder:  '1 Dewasa',
      searchBtn:   'Cari Penerbangan',
    },
    car: {
      city:        'Kota Pengambilan',
      cityHolder:  'Makkah',
      pickup:      'Tanggal Pengambilan',
      dropoff:     'Tanggal Pengembalian',
      searchBtn:   'Cari Mobil',
    },
    results: {
      heading:     'Hotel Tersedia di Makkah',
      perNight:    '/ malam',
      bookNow:     'Pesan Sekarang',
      distHaram:   'm dari Masjidil Haram',
      count:       (n: number) => `${n} hasil`,
      error:       'Pencarian gagal. Silakan coba lagi.',
      empty:       'Tidak ada hotel ditemukan.',
      badge: {
        popular:   'Populer',
        value:     'Nilai Terbaik',
        closest:   'Terdekat ke Haram',
      },
    },
    hero: {
      subtitle: 'Hotel terverifikasi · Ketersediaan real-time · Harga IDR',
    },
    footer: {
      tagline: 'Platform pemesanan terpercaya untuk jamaah Haji & Umrah.',
      pay:     'Pembayaran aman via',
      links:   ['Tentang', 'Kontak', 'Syarat', 'Privasi'],
      rights:  '© 2026 UTUBooking.com — AMEC Solutions. Semua hak dilindungi.',
    },
  },
  ar: {
    brand:   'يو تي يو بوكينج',
    tagline: 'بوابتك إلى مكة المكرمة والمدينة المنورة',
    langBtn: 'English',
    nav: { about: 'من نحن', contact: 'تواصل معنا' },
    tabs: { hotels: 'فنادق', flights: 'رحلات', cars: 'سيارات' },
    hotel: {
      dest:        'الوجهة',
      destHolder:  'مكة المكرمة، المدينة المنورة، جدة…',
      checkIn:     'تاريخ الوصول',
      checkOut:    'تاريخ المغادرة',
      guests:      'عدد الضيوف',
      guestsHolder:'شخصان',
      searchBtn:   'ابحث عن فنادق',
    },
    flight: {
      from:        'من',
      fromHolder:  'الرياض (RUH)',
      to:          'إلى',
      toHolder:    'جدة (JED)',
      depart:      'تاريخ المغادرة',
      passengers:  'المسافرون',
      passHolder:  'مسافر واحد',
      searchBtn:   'ابحث عن رحلات',
    },
    car: {
      city:        'مدينة الاستلام',
      cityHolder:  'مكة المكرمة',
      pickup:      'تاريخ الاستلام',
      dropoff:     'تاريخ الإعادة',
      searchBtn:   'ابحث عن سيارات',
    },
    results: {
      heading:     'الفنادق المتاحة في مكة المكرمة',
      perNight:    '/ الليلة',
      bookNow:     'احجز الآن',
      distHaram:   'م من الحرم',
      count:       (n: number) => `${n} نتيجة`,
      error:       'فشل البحث. يرجى المحاولة مرة أخرى.',
      empty:       'لا توجد فنادق متاحة.',
      badge: {
        popular:   'الأكثر طلبًا',
        value:     'أفضل قيمة',
        closest:   'الأقرب للحرم',
      },
    },
    hero: {
      subtitle: 'فنادق موثّقة · توفر فوري · أسعار بالريال السعودي',
    },
    footer: {
      tagline: 'منصة الحجز الموثوقة لحجاج وزوار بيت الله الحرام.',
      pay:     'وسائل الدفع الآمنة المقبولة',
      links:   ['من نحن', 'تواصل', 'الشروط', 'الخصوصية'],
      rights:  '© 2026 UTUBooking.com — AMEC Solutions. جميع الحقوق محفوظة.',
    },
  },
} as const;

// ─── Module-level render constants ────────────────────────────────────────────
const BADGE_COLOR_MAP: Record<string, string> = {
  closest: 'bg-emerald-100 text-emerald-700',
  popular: 'bg-blue-100 text-blue-700',
  value:   'bg-amber-100 text-amber-700',
};

// Pre-allocated so StarRow never calls Array.from on every render
const STAR_INDICES = [0, 1, 2, 3, 4];

// ─── Hotel card shape (derived from API HotelOffer) ───────────────────────────
interface HotelCardData {
  id:    string | number;
  name:  { en: string; ar: string | null };
  stars: number;
  dist:  number | null;
  price: number;
  badge: string | null;
}

function apiToCard(h: HotelOffer, idx: number): HotelCardData {
  const badge =
    idx === 0 && h.distanceHaramM !== null ? 'closest'
    : idx === 0                            ? 'popular'
    : h.freeCancellation                   ? 'value'
    : null;
  return {
    id:    h.id,
    name:  { en: h.name.en, ar: h.name.ar },
    stars: h.stars ?? 0,
    dist:  h.distanceHaramM,
    price: h.pricePerNight,
    badge,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <span className="flex gap-px">
      {STAR_INDICES.map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < count ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

interface ResultsT {
  heading: string;
  perNight: string;
  bookNow: string;
  distHaram: string;
  badge: { popular: string; value: string; closest: string };
}

function HotelCard({
  hotel, lang, t,
}: {
  hotel: HotelCardData;
  lang: Lang;
  t: ResultsT;
}) {
  const badgeMap: Record<string, string> = {
    closest: t.badge.closest,
    popular: t.badge.popular,
    value:   t.badge.value,
  };

  return (
    // overflow-hidden is on the image div only — NOT the card root.
    // Keeping it on the root clips Nastaliq descenders in the card body
    // because leading-snug underestimates the line-height Nastaliq needs.
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
      {/* Placeholder image — overflow-hidden clips image to rounded-t-2xl */}
      <div className="relative bg-gradient-to-br from-emerald-800 to-teal-600 h-40 flex items-center justify-center overflow-hidden rounded-t-2xl">
        <svg className="w-16 h-16 text-white/30" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 3a3 3 0 110 6 3 3 0 010-6zm6 14H6v-1a6 6 0 0112 0v1z"/>
        </svg>
        {hotel.badge && (
          <span className={`absolute top-3 start-3 text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_COLOR_MAP[hotel.badge]}`}>
            {badgeMap[hotel.badge]}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">
            {hotel.name[lang as keyof typeof hotel.name] ?? hotel.name.en}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <StarRow count={hotel.stars} />
            <span className="text-xs text-gray-400">
              📍 {hotel.dist} {t.distHaram}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-xl font-bold text-emerald-700">
              {lang === 'id'
                ? `Rp ${hotel.price.toLocaleString('id-ID')}`
                : hotel.price.toLocaleString('en-SA')}
            </span>
            <span className="text-xs text-gray-500 ms-1">
              {lang === 'id' ? '' : 'SAR'} {t.perNight}
            </span>
          </div>
          <button className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            {t.bookNow}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label, type = 'text', placeholder, className = '', value, onChange, lang = 'en', min,
}: {
  label: string; type?: string; placeholder?: string; className?: string;
  value?: string; onChange?: (v: string) => void; readOnly?: boolean;
  lang?: string; min?: string;
}) {
  // Date inputs: use custom LocaleDatePicker so Urdu (and all locales) render
  // month/weekday names in the correct script and font.
  if (type === 'date') {
    return (
      <LocaleDatePicker
        label={label}
        value={value ?? ''}
        onChange={onChange ?? (() => {})}
        min={min}
        lang={lang}
        className={className}
      />
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
      />
    </div>
  );
}

// ─── Hotel search form state ──────────────────────────────────────────────────
interface HotelForm {
  location: string;
  checkIn:  string;
  checkOut: string;
  guests:   number;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab]   = useState<Tab>('hotels');
  const t = T[lang];

  // Hotel search form (controlled)
  const [hotelForm, setHotelForm] = useState<HotelForm>({
    location: 'MCM',
    checkIn:  TODAY,
    checkOut: TOMORROW,
    guests:   2,
  });
  // Only fire query after explicit Search click
  const [hotelQuery, setHotelQuery] = useState<HotelForm | null>(null);

  const { data: hotelData, isFetching, isError } = useQuery({
    queryKey: ['hotels', hotelQuery],
    queryFn:  () => searchHotels({ ...hotelQuery!, currency: 'SAR', isUmrah: true }),
    enabled:  hotelQuery !== null,
  });

  const hotels = useMemo<HotelCardData[]>(
    () => hotelData ? hotelData.results.map(apiToCard) : [],
    [hotelData],
  );

  // Mirror html element dir + lang for full-page RTL
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    html.setAttribute('data-currency', lang === 'id' ? 'IDR' : 'SAR');
  }, [lang]);

  const tabList = useMemo(() => [
    { key: 'hotels'  as const, label: t.tabs.hotels,  icon: '🏨' },
    { key: 'flights' as const, label: t.tabs.flights, icon: '✈️' },
    { key: 'cars'    as const, label: t.tabs.cars,    icon: '🚗' },
  ], [t.tabs]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="bg-emerald-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
              <span className="text-emerald-900 font-black text-xs">U</span>
            </div>
            <span className="font-bold text-base tracking-tight">{t.brand}</span>
          </div>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-emerald-100">
            <a href="#" className="hover:text-white transition-colors">{t.nav.about}</a>
            <a href="#" className="hover:text-white transition-colors">{t.nav.contact}</a>
          </nav>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : lang === 'ar' ? 'id' : 'en')}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            aria-label="Switch language"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
            </svg>
            {t.langBtn}
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-700 pt-12 pb-32 px-4 text-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-60px] start-[-60px] w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-[-40px] end-[-40px] w-48 h-48 rounded-full bg-white" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
            UTUBooking.com
          </p>
          <h1 className="text-white text-3xl sm:text-4xl font-bold leading-tight mb-3">
            {t.tagline}
          </h1>
          <p className="text-emerald-200 text-sm sm:text-base">
            {t.hero.subtitle}
          </p>
        </div>
      </section>

      {/* ── Search Box (floats over hero) ──────────────────────────────────── */}
      <div className="max-w-4xl w-full mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {tabList.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors
                  ${tab === key
                    ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50/60'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Form area */}
          <div className="p-5">
            {tab === 'hotels' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField
                  label={t.hotel.dest}
                  placeholder={t.hotel.destHolder}
                  value={hotelForm.location}
                  onChange={(v) => setHotelForm((f) => ({ ...f, location: v }))}
                  className="sm:col-span-2 lg:col-span-1"
                />
                <InputField
                  label={t.hotel.checkIn}
                  type="date"
                  value={hotelForm.checkIn}
                  onChange={(v) => setHotelForm((f) => ({ ...f, checkIn: v }))}
                  lang={lang}
                  min={TODAY}
                />
                <InputField
                  label={t.hotel.checkOut}
                  type="date"
                  value={hotelForm.checkOut}
                  onChange={(v) => setHotelForm((f) => ({ ...f, checkOut: v }))}
                  lang={lang}
                  min={hotelForm.checkIn || TOMORROW}
                />
                <InputField
                  label={t.hotel.guests}
                  type="number"
                  placeholder={t.hotel.guestsHolder}
                  value={String(hotelForm.guests)}
                  onChange={(v) => setHotelForm((f) => ({ ...f, guests: Math.max(1, parseInt(v) || 1) }))}
                />
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    onClick={() => setHotelQuery({ ...hotelForm })}
                    disabled={isFetching}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isFetching
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                        </svg>
                    }
                    {t.hotel.searchBtn}
                  </button>
                </div>
              </div>
            )}

            {tab === 'flights' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField label={t.flight.from}       placeholder={t.flight.fromHolder} />
                <InputField label={t.flight.to}         placeholder={t.flight.toHolder} />
                <InputField label={t.flight.depart}     type="date" lang={lang} min={TODAY} />
                <InputField label={t.flight.passengers} placeholder={t.flight.passHolder} />
                <div className="sm:col-span-2 lg:col-span-4">
                  <button className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    {t.flight.searchBtn}
                  </button>
                </div>
              </div>
            )}

            {tab === 'cars' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField label={t.car.city}    placeholder={t.car.cityHolder} className="lg:col-span-2" />
                <InputField label={t.car.pickup}  type="date" lang={lang} min={TODAY} />
                <InputField label={t.car.dropoff} type="date" lang={lang} min={TODAY} />
                <div className="sm:col-span-2 lg:col-span-4">
                  <button className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    {t.car.searchBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hotel Results Grid ─────────────────────────────────────────────── */}
      <main className="max-w-6xl w-full mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {t.results.heading}
          </h2>
          <span className="text-sm text-gray-400">
            {t.results.count(hotels.length)}
          </span>
        </div>

        {isError && (
          <p className="text-red-600 text-sm py-8 text-center">{t.results.error}</p>
        )}

        {!isError && hotelQuery && !isFetching && hotels.length === 0 && (
          <p className="text-gray-500 text-sm py-8 text-center">{t.results.empty}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              lang={lang}
              t={t.results}
            />
          ))}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-10">

          {/* Top row: logo + links */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
            {/* Brand */}
            <div className="flex flex-col gap-2 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-900 font-black text-xs">U</span>
                </div>
                <span className="text-white font-bold">{t.brand}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t.footer.tagline}
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {t.footer.links.map((link) => (
                <a key={link} href="#" className="hover:text-white transition-colors">
                  {link}
                </a>
              ))}
            </nav>
          </div>

          {/* Payment badges */}
          <div className="border-t border-gray-800 pt-6">
            <p className="text-xs text-gray-500 mb-3">{t.footer.pay}</p>
            <div className="flex flex-wrap gap-3">

              {lang === 'id' ? (
                <>
                  {/* GoPay */}
                  <div className="flex items-center gap-1.5 bg-[#00AED6] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" opacity="0.3"/>
                      <path d="M12 6a6 6 0 100 12A6 6 0 0012 6zm0 10a4 4 0 110-8 4 4 0 010 8z"/>
                    </svg>
                    <span>GoPay</span>
                  </div>

                  {/* ShopeePay */}
                  <div className="flex items-center gap-1.5 bg-[#EE4D2D] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span className="text-sm">🛍</span>
                    <span>ShopeePay</span>
                  </div>

                  {/* OVO */}
                  <div className="flex items-center gap-1.5 bg-[#4C3494] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span className="text-sm">💜</span>
                    <span>OVO</span>
                  </div>

                  {/* QRIS */}
                  <div className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-800 text-xs font-bold px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/>
                      <rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/>
                      <rect x="20" y="14" width="2" height="2"/><rect x="14" y="20" width="8" height="2"/>
                    </svg>
                    <span>QRIS</span>
                  </div>

                  {/* BCA */}
                  <div className="flex items-center gap-1 bg-[#005DAA] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span>BCA</span>
                  </div>

                  {/* BNI */}
                  <div className="flex items-center gap-1 bg-[#F47920] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span>BNI</span>
                  </div>

                  {/* BRI */}
                  <div className="flex items-center gap-1 bg-[#003D7A] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span>BRI</span>
                  </div>

                  {/* Mandiri */}
                  <div className="flex items-center gap-1 bg-[#003087] text-[#F7A800] text-xs font-bold px-3 py-2 rounded-lg">
                    <span>Mandiri</span>
                  </div>
                </>
              ) : (
                <>
                  {/* STC Pay */}
                  <div className="flex items-center gap-1.5 bg-[#7B2D8B] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span className="text-sm">💜</span>
                    <span>STC Pay</span>
                  </div>

                  {/* Mada */}
                  <div className="flex items-center gap-1.5 bg-[#00A88E] text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <span className="text-sm">💳</span>
                    <span>Mada</span>
                  </div>

                  {/* Visa */}
                  <div className="flex items-center gap-1.5 bg-[#1A1F71] text-white text-xs font-bold px-4 py-2 rounded-lg italic">
                    VISA
                  </div>

                  {/* Mastercard */}
                  <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-[#EB001B]" />
                    <div className="w-5 h-5 rounded-full bg-[#F79E1B] -ms-2.5" />
                  </div>

                  {/* Apple Pay */}
                  <div className="flex items-center gap-1.5 bg-black border border-gray-700 text-white text-xs font-medium px-3 py-2 rounded-lg">
                    <span></span> Pay
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Bottom copyright */}
          <div className="mt-6 text-xs text-gray-600 text-center sm:text-start">
            {t.footer.rights}
          </div>
        </div>
      </footer>

    </div>
  );
}
