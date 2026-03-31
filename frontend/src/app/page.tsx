'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import LocaleDatePicker from '@/components/DatePicker';
import TabSections from '@/components/home/TabSections';
import HomeHeader from '@/components/home/HomeHeader';

// ─── Module-level constants ────────────────────────────────────────────────────
// Computed once at module load — a booking session never spans midnight.
function isoDate(offset = 0) {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
const TODAY    = isoDate(0);
const TOMORROW = isoDate(1);

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'hotels' | 'flights' | 'cars';


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

// ─── Flight search form state ─────────────────────────────────────────────────
type FlightTripType = 'oneway' | 'roundtrip';
interface FlightForm {
  from:     string;
  to:       string;
  depart:   string;
  returnDate: string;
  tripType: FlightTripType;
  adults:   number;
}

// ─── Hotel search form state ──────────────────────────────────────────────────
interface HotelForm {
  location: string;
  checkIn:  string;
  checkOut: string;
  guests:   number;
}

// ─── Car search form state ────────────────────────────────────────────────────
interface CarForm {
  pickupLocation: string;
  pickupDate:     string;
  pickupTime:     string;
  dropoffDate:    string;
  dropoffTime:    string;
  driverAge30to65: boolean;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const VALID_TABS = new Set<Tab>(['hotels', 'flights', 'cars']);
function parseTab(value: string | null): Tab {
  return VALID_TABS.has(value as Tab) ? (value as Tab) : 'hotels';
}

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const tHero    = useTranslations('hero');
  const tNav     = useTranslations('nav');
  const tSearch  = useTranslations('search');

  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get('tab')));

  // Sync tab when URL param changes (e.g. footer link navigates to /?tab=flights)
  // Also scroll to the search card so the user sees the tab switch immediately.
  useEffect(() => {
    const next = parseTab(searchParams.get('tab'));
    setTab(next);
    if (searchParams.get('tab')) {
      document.getElementById('search-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  // Hotel search form (controlled)
  const [hotelForm, setHotelForm] = useState<HotelForm>({
    location: 'MCM',
    checkIn:  TODAY,
    checkOut: TOMORROW,
    guests:   2,
  });

  // Car search form (controlled)
  const [carForm, setCarForm] = useState<CarForm>({
    pickupLocation:  '',
    pickupDate:      TODAY,
    pickupTime:      '10:00',
    dropoffDate:     TOMORROW,
    dropoffTime:     '10:00',
    driverAge30to65: true,
  });

  function handleCarSearch() {
    if (!carForm.pickupLocation || !carForm.pickupDate || !carForm.dropoffDate) return;
    router.push(`/cars/search?${new URLSearchParams({
      pickupLocation:   carForm.pickupLocation,
      dropoffLocation:  carForm.pickupLocation,
      pickupDate:       carForm.pickupDate,
      pickupTime:       carForm.pickupTime,
      dropoffDate:      carForm.dropoffDate,
      dropoffTime:      carForm.dropoffTime,
      driverAge30to65:  String(carForm.driverAge30to65),
      differentDropoff: 'false',
    })}`);
  }

  function handleHotelSearch() {
    if (!hotelForm.location || !hotelForm.checkIn || !hotelForm.checkOut) return;
    router.push(`/hotels/search?${new URLSearchParams({
      destination: hotelForm.location,
      checkIn:     hotelForm.checkIn,
      checkOut:    hotelForm.checkOut,
      adults:      String(hotelForm.guests),
      children:    '0',
      rooms:       '1',
      freeCancelOnly: 'false',
    })}`);
  }

  // Flight search form (controlled)
  const [flightForm, setFlightForm] = useState<FlightForm>({
    from:       '',
    to:         '',
    depart:     TODAY,
    returnDate: '',
    tripType:   'oneway',
    adults:     1,
  });

  function handleFlightSearch() {
    if (!flightForm.from || !flightForm.to || !flightForm.depart) return;
    const params: Record<string, string> = {
      from:     flightForm.from.toUpperCase(),
      to:       flightForm.to.toUpperCase(),
      depart:   flightForm.depart,
      tripType: flightForm.tripType,
      adults:   String(flightForm.adults),
    };
    if (flightForm.tripType === 'roundtrip' && flightForm.returnDate) {
      params.return = flightForm.returnDate;
    }
    router.push(`/flights/search?${new URLSearchParams(params)}`);
  }


  // Keep html[lang] and html[dir] in sync when client-side locale is known
  useEffect(() => {
    const html = document.documentElement;
    const rtl = ['ar', 'ur', 'fa'].some((l) => locale.startsWith(l));
    html.lang = locale;
    html.dir  = rtl ? 'rtl' : 'ltr';
    html.setAttribute('data-currency', (locale === 'id' || locale === 'ms') ? 'IDR' : 'SAR');
  }, [locale]);

  const tabList = useMemo(() => [
    { key: 'hotels'  as const, label: tNav('hotels'),  icon: '🏨' },
    { key: 'flights' as const, label: tNav('flights'), icon: '✈️' },
    { key: 'cars'    as const, label: tNav('cars'),    icon: '🚗' },
  ], [tNav]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <HomeHeader
        tab={tab}
        onTabChange={setTab}
      />

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
            {tHero('tagline')}
          </h1>
          <p className="text-emerald-200 text-sm sm:text-base">
            {tHero('subtitle')}
          </p>
        </div>
      </section>

      {/* ── Search Box (floats over hero) ──────────────────────────────────── */}
      <div id="search-card" className="max-w-4xl w-full mx-auto px-4 -mt-20 relative z-10">
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
                  label={tSearch('destination')}
                  placeholder={tSearch('destinationHint')}
                  value={hotelForm.location}
                  onChange={(v) => setHotelForm((f) => ({ ...f, location: v }))}
                  className="sm:col-span-2 lg:col-span-1"
                />
                <InputField
                  label={tSearch('checkIn')}
                  type="date"
                  value={hotelForm.checkIn}
                  onChange={(v) => setHotelForm((f) => ({ ...f, checkIn: v }))}
                  lang={locale}
                  min={TODAY}
                />
                <InputField
                  label={tSearch('checkOut')}
                  type="date"
                  value={hotelForm.checkOut}
                  onChange={(v) => setHotelForm((f) => ({ ...f, checkOut: v }))}
                  lang={locale}
                  min={hotelForm.checkIn || TOMORROW}
                />
                <InputField
                  label={tSearch('guests')}
                  type="number"
                  placeholder={tSearch('guestsHint')}
                  value={String(hotelForm.guests)}
                  onChange={(v) => setHotelForm((f) => ({ ...f, guests: Math.max(1, parseInt(v) || 1) }))}
                />
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    onClick={handleHotelSearch}
                    disabled={!hotelForm.location || !hotelForm.checkIn || !hotelForm.checkOut}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    {tSearch('searchHotels')}
                  </button>
                </div>
              </div>
            )}

            {tab === 'flights' && (
              <div className="space-y-3">
                {/* Trip type pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['oneway', 'roundtrip'] as FlightTripType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFlightForm((f) => ({ ...f, tripType: type }))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                        flightForm.tripType === type
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      {type === 'oneway' ? tSearch('oneWay') : tSearch('roundTrip')}
                    </button>
                  ))}
                  <span className="px-3 py-1 rounded-full text-xs text-gray-400 border border-dashed border-gray-200">
                    {tSearch('multiCity')} — {tSearch('comingSoon')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InputField
                    label={tSearch('from')}
                    placeholder={tSearch('fromHint')}
                    value={flightForm.from}
                    onChange={(v) => setFlightForm((f) => ({ ...f, from: v.toUpperCase().slice(0, 3) }))}
                  />
                  <InputField
                    label={tSearch('to')}
                    placeholder={tSearch('toHint')}
                    value={flightForm.to}
                    onChange={(v) => setFlightForm((f) => ({ ...f, to: v.toUpperCase().slice(0, 3) }))}
                  />
                  <InputField
                    label={tSearch('departDate')}
                    type="date"
                    value={flightForm.depart}
                    onChange={(v) => setFlightForm((f) => ({ ...f, depart: v }))}
                    lang={locale}
                    min={TODAY}
                  />
                  {flightForm.tripType === 'roundtrip' ? (
                    <InputField
                      label={tSearch('returnDate')}
                      type="date"
                      value={flightForm.returnDate}
                      onChange={(v) => setFlightForm((f) => ({ ...f, returnDate: v }))}
                      lang={locale}
                      min={flightForm.depart || TODAY}
                    />
                  ) : (
                    <InputField
                      label={tSearch('passengers')}
                      type="number"
                      placeholder={tSearch('passengersHint')}
                      value={String(flightForm.adults)}
                      onChange={(v) => setFlightForm((f) => ({ ...f, adults: Math.max(1, parseInt(v) || 1) }))}
                    />
                  )}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <button
                      onClick={handleFlightSearch}
                      disabled={!flightForm.from || !flightForm.to || !flightForm.depart}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                      </svg>
                      {tSearch('searchFlights')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'cars' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InputField
                    label={tSearch('pickupLocation')}
                    placeholder={tSearch('pickupLocationHint')}
                    value={carForm.pickupLocation}
                    onChange={(v) => setCarForm((f) => ({ ...f, pickupLocation: v }))}
                    className="sm:col-span-2"
                  />
                  <InputField
                    label={tSearch('pickupDate')}
                    type="date"
                    value={carForm.pickupDate}
                    onChange={(v) => setCarForm((f) => ({ ...f, pickupDate: v }))}
                    lang={locale}
                    min={TODAY}
                  />
                  <InputField
                    label={tSearch('dropoffDate')}
                    type="date"
                    value={carForm.dropoffDate}
                    onChange={(v) => setCarForm((f) => ({ ...f, dropoffDate: v }))}
                    lang={locale}
                    min={carForm.pickupDate || TOMORROW}
                  />
                  <div className="sm:col-span-2 lg:col-span-4">
                    <button
                      onClick={handleCarSearch}
                      disabled={!carForm.pickupLocation || !carForm.pickupDate || !carForm.dropoffDate}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                      </svg>
                      {tSearch('searchCars')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab-contextual sections ─────────────────────────────────────────── */}
      <TabSections tab={tab} />


    </div>
  );
}
