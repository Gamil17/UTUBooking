'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// ─── Airline Policies (operational data — not translated) ──────────────────────
type PolicyRow = {
  airline: string;
  code: string;
  region: string;
  changes: string;
  refunds: string;
  vouchers: string;
  note?: string;
};

const airlinePolicies: PolicyRow[] = [
  // Gulf & Middle East
  { airline: 'Saudia', code: 'SV', region: 'Gulf', changes: 'Free rebooking on affected routes', refunds: 'Full refund for cancelled flights', vouchers: 'Contact airline', note: 'Routes: Amman, Kuwait, Dubai, Abu Dhabi, Doha, Bahrain' },
  { airline: 'Gulf Air', code: 'GF', region: 'Gulf', changes: '2 free changes within 10 days', refunds: 'Full refund if unused', vouchers: 'None' },
  { airline: 'Flynas', code: 'XY', region: 'Gulf', changes: 'Free change on affected flights', refunds: 'Yes', vouchers: 'Voucher via call center' },
  { airline: 'Flyadeal', code: 'F3', region: 'Gulf', changes: 'Free change on affected flights', refunds: 'Yes', vouchers: 'Contact airline' },
  { airline: 'Qatar Airways', code: 'QR', region: 'Gulf', changes: 'Up to 2 free changes (±14 days)', refunds: 'Refund fee waived', vouchers: 'None' },
  { airline: 'Emirates', code: 'EK', region: 'Gulf', changes: 'Free change until 20 Mar 2026', refunds: 'Yes (unused tickets)', vouchers: 'None' },
  { airline: 'Etihad Airways', code: 'EY', region: 'Gulf', changes: 'Free change until 31 Mar 2026', refunds: 'Full refund (unused)', vouchers: 'None' },
  { airline: 'Flydubai', code: 'FZ', region: 'Gulf', changes: 'Free change within ±10 days', refunds: 'Yes (unused tickets)', vouchers: 'None' },
  { airline: 'Air Arabia', code: 'G9', region: 'Gulf', changes: 'Free reschedule to new date', refunds: 'Yes', vouchers: 'Contact airline' },
  { airline: 'Kuwait Airways', code: 'KU', region: 'Gulf', changes: 'Flights rescheduled — new dates communicated by airline', refunds: 'Contact airline', vouchers: 'Contact airline', note: 'WhatsApp: +965-1802050' },
  { airline: 'Jazeera Airways', code: 'J9', region: 'Gulf', changes: 'Free change within 7 days', refunds: 'Refund allowed', vouchers: 'Contact airline' },
  { airline: 'SalamAir', code: 'OV', region: 'Gulf', changes: 'Contact airline directly', refunds: 'Contact airline', vouchers: 'Contact airline', note: 'Routes to Sharjah, Doha, Dammam, Kuwait, Iraq, Iran suspended' },
  { airline: 'Oman Air', code: 'WY', region: 'Gulf', changes: 'Free change until 29 Mar 2026', refunds: 'Full refund allowed', vouchers: 'None' },
  { airline: 'EgyptAir', code: 'MS', region: 'Middle East', changes: 'Free change (fare diff may apply) — via airline offices/call center', refunds: 'Full refund allowed', vouchers: 'Voucher valid 1 year (airline offices/call center only)' },
  { airline: 'Royal Jordanian', code: 'RJ', region: 'Middle East', changes: 'Free change', refunds: 'As per fare rules', vouchers: 'Voucher valid 1 year (airline offices/call center only)' },
  { airline: 'Riyadh Air', code: 'RX', region: 'Gulf', changes: 'Contact airline directly', refunds: 'Contact airline', vouchers: 'Contact airline', note: 'New carrier — policies evolving' },
  // South Asia
  { airline: 'Air India', code: 'AI', region: 'South Asia', changes: 'One free change (fare diff may apply)', refunds: 'Yes', vouchers: 'None' },
  { airline: 'Air India Express', code: 'IX', region: 'South Asia', changes: 'Free change (fare diff may apply)', refunds: 'Yes', vouchers: 'None' },
  { airline: 'IndiGo', code: '6E', region: 'South Asia', changes: 'Free reschedule', refunds: 'Full refund allowed', vouchers: 'None' },
  { airline: 'SpiceJet', code: 'SG', region: 'South Asia', changes: 'Free reschedule on affected routes', refunds: 'Yes', vouchers: 'Refund to original payment' },
  { airline: 'Pakistan International Airlines', code: 'PK', region: 'South Asia', changes: 'Contact airline directly', refunds: 'Contact airline', vouchers: 'Contact airline', note: 'Gulf routes (UAE, Bahrain, Qatar, Kuwait) affected' },
  { airline: 'Biman Bangladesh', code: 'BG', region: 'South Asia', changes: 'Contact airline directly', refunds: 'Contact airline', vouchers: 'Contact airline', note: 'UAE flights suspended until further notice' },
  { airline: 'SriLankan Airlines', code: 'UL', region: 'South Asia', changes: 'Contact airline directly', refunds: 'Yes', vouchers: 'Refund to original payment' },
  // Southeast Asia
  { airline: 'Malaysia Airlines', code: 'MH', region: 'SE Asia', changes: 'Free change on affected routes', refunds: 'Yes', vouchers: 'Contact airline' },
  { airline: 'Cebu Pacific', code: '5J', region: 'SE Asia', changes: 'Free rebooking within 30 days', refunds: 'Yes', vouchers: 'Travel Fund (wallet credit) via airline offices/call center' },
  { airline: 'Philippine Airlines', code: 'PR', region: 'SE Asia', changes: 'Change up to 60 days from original date', refunds: 'Full refund allowed', vouchers: 'None' },
  { airline: 'Myanmar Airways Intl', code: '8M', region: 'SE Asia', changes: 'One free change', refunds: 'Contact airline', vouchers: 'None', note: 'Dubai flights suspended from 1 Mar 2026' },
  // Turkey
  { airline: 'Turkish Airlines', code: 'TK', region: 'Turkey', changes: 'Free change until 10 May 2026', refunds: 'Refund allowed', vouchers: 'None' },
  { airline: 'Pegasus Airlines', code: 'PC', region: 'Turkey', changes: 'Free change on affected routes', refunds: 'Yes', vouchers: 'Open Ticket', note: 'Iran, Iraq, Jordan, Lebanon, Saudi routes affected' },
  // East Asia
  { airline: 'Air China', code: 'CA', region: 'East Asia', changes: 'One free change (fare diff may apply)', refunds: 'Full refund (unused)', vouchers: 'None' },
  { airline: 'China Eastern', code: 'MU', region: 'East Asia', changes: 'Free change within ±3 days', refunds: 'Unused segments — no fee', vouchers: 'None' },
  { airline: 'Xiamen Air', code: 'MF', region: 'East Asia', changes: 'Free change', refunds: 'Refund fee waived', vouchers: 'None' },
  { airline: 'Korean Air', code: 'KE', region: 'East Asia', changes: 'Free change within 7 days', refunds: 'Yes (involuntary change)', vouchers: 'None' },
  { airline: 'Cathay Pacific', code: 'CX', region: 'East Asia', changes: 'Free change on affected routes', refunds: 'Refund to original payment', vouchers: 'Refund to original payment' },
  // Africa
  { airline: 'Ethiopian Airlines', code: 'ET', region: 'Africa', changes: 'Free change within 2 weeks', refunds: 'Full refund allowed', vouchers: 'None' },
  // Europe & North America
  { airline: 'Lufthansa', code: 'LH', region: 'Europe', changes: 'Free rebooking on later flights', refunds: 'Full refund for cancelled flights', vouchers: 'Refund to original payment', note: 'Dubai, Tel Aviv, Beirut, Amman, Erbil, Dammam, Tehran routes affected' },
  { airline: 'British Airways', code: 'BA', region: 'Europe', changes: 'Free change until 29 Mar 2026', refunds: 'Yes (cancelled flights)', vouchers: 'None' },
  { airline: 'Wizz Air', code: '5W', region: 'Europe', changes: 'Any Wizz Air flight ±14 to 30 days from original date — free', refunds: '100% cash refund', vouchers: '120% Wizz credit (alternative to cash refund)' },
  { airline: 'Fly SAS', code: 'FE', region: 'Europe', changes: 'Free change until 31 May 2026', refunds: 'As per fare rules', vouchers: 'None', note: 'Beirut and Tel Aviv routes' },
  { airline: 'Singapore Airlines', code: 'SQ', region: 'Asia Pacific', changes: 'Free change on affected routes', refunds: 'Refund to original payment', vouchers: 'Refund to original payment', note: 'Dubai and Jeddah routes affected' },
  { airline: 'Air Canada', code: 'AC', region: 'North America', changes: 'One free date change (same cabin) — rebook by 31 Mar 2026', refunds: 'Yes', vouchers: 'None' },
  { airline: 'American Airlines', code: 'AA', region: 'North America', changes: 'Free change (same cabin, rebook Feb 28–Mar 31 2026)', refunds: 'Only if flight cancelled or significantly delayed', vouchers: 'None' },
];

const regions = ['All', ...Array.from(new Set(airlinePolicies.map((a) => a.region)))];

// ─── Travel Advisory (operational data — not translated) ───────────────────────
const advisories = [
  {
    severity: 'high',
    region: 'Gulf & Middle East',
    title: 'Gulf Airspace Disruption — Active',
    updated: 'Updated: March 2026',
    body: 'Multiple airlines have suspended or significantly reduced services to and from Gulf and Middle East airports including Dubai (DXB), Abu Dhabi (AUH), Doha (DOH), Kuwait City (KWI), and select Saudi airports. Passengers on affected routes should check My Trips immediately and contact UTUBooking support. Free change and refund waivers are active for most carriers — see Airline Policies tab.',
    action: 'Check My Trips',
    actionHref: '/login',
  },
  {
    severity: 'medium',
    region: 'South Asia',
    title: 'India & Pakistan — Gulf Route Suspensions',
    updated: 'Updated: March 2026',
    body: 'Multiple Indian carriers (Air India, Air India Express, IndiGo, SpiceJet) and Pakistan International Airlines have suspended Gulf routes due to regional airspace closures. Passengers should contact their airline or UTUBooking support for rebooking options.',
    action: 'View Airline Policies',
    actionHref: '#airline-policies',
  },
  {
    severity: 'low',
    region: 'Saudi Arabia',
    title: 'Saudi Airspace — Domestic Delays',
    updated: 'Updated: March 2026',
    body: 'Saudi airports have reported delays and cancellations due to airspace restrictions. Flynas and Flyadeal passengers are advised to check flight status before departing for the airport. UTUBooking will notify affected passengers by email and SMS.',
    action: 'Check Flight Status',
    actionHref: '/faq#airline-policies',
  },
  {
    severity: 'info',
    region: 'Global',
    title: 'Hajj 2026 Season — Early Booking Advisory',
    updated: 'Updated: January 2026',
    body: 'Hajj 2026 flights and hotel packages near Masjid al-Haram are filling rapidly. National quotas for Malaysia (Tabung Haji), India (Hajj Committee), and other markets are confirmed. Book early to secure accommodation within walking distance of the Haram.',
    action: 'Book Hajj Package',
    actionHref: '/',
  },
];

const severityStyles: Record<string, { bar: string; badge: string; badgeText: string }> = {
  high:   { bar: 'bg-red-500',    badge: 'bg-red-100',    badgeText: 'text-red-700' },
  medium: { bar: 'bg-amber-500',  badge: 'bg-amber-100',  badgeText: 'text-amber-700' },
  low:    { bar: 'bg-blue-500',   badge: 'bg-blue-100',   badgeText: 'text-blue-700' },
  info:   { bar: 'bg-utu-bg-subtle0',badge: 'bg-utu-bg-subtle',badgeText: 'text-utu-blue' },
};

// ─── Components ────────────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-utu-text-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-utu-border-default last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-4 py-4 text-start">
        <span className="text-sm font-medium text-utu-text-primary leading-snug">{q}</span>
        <ChevronIcon open={open} />
      </button>
      {open && <p className="text-sm text-utu-text-muted leading-relaxed pb-4 pe-6">{a}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function FAQPage() {
  const t = useTranslations('faq');

  const categories = [
    {
      id: 'travel-disruption',
      icon: '⚠️',
      title: t('disruption.title'),
      faqs: [
        { q: t('disruption.q1'), a: t('disruption.a1') },
        { q: t('disruption.q2'), a: t('disruption.a2') },
        { q: t('disruption.q3'), a: t('disruption.a3') },
        { q: t('disruption.q4'), a: t('disruption.a4') },
        { q: t('disruption.q5'), a: t('disruption.a5') },
        { q: t('disruption.q6'), a: t('disruption.a6') },
        { q: t('disruption.q7'), a: t('disruption.a7') },
      ],
    },
    {
      id: 'flights',
      icon: '✈️',
      title: t('flights.title'),
      faqs: [
        { q: t('flights.q1'), a: t('flights.a1') },
        { q: t('flights.q2'), a: t('flights.a2') },
        { q: t('flights.q3'), a: t('flights.a3') },
        { q: t('flights.q4'), a: t('flights.a4') },
        { q: t('flights.q5'), a: t('flights.a5') },
        { q: t('flights.q6'), a: t('flights.a6') },
        { q: t('flights.q7'), a: t('flights.a7') },
        { q: t('flights.q8'), a: t('flights.a8') },
        { q: t('flights.q9'), a: t('flights.a9') },
        { q: t('flights.q10'), a: t('flights.a10') },
      ],
    },
    {
      id: 'hajj-umrah',
      icon: '🕌',
      title: t('hajj.title'),
      faqs: [
        { q: t('hajj.q1'), a: t('hajj.a1') },
        { q: t('hajj.q2'), a: t('hajj.a2') },
        { q: t('hajj.q3'), a: t('hajj.a3') },
        { q: t('hajj.q4'), a: t('hajj.a4') },
        { q: t('hajj.q5'), a: t('hajj.a5') },
        { q: t('hajj.q6'), a: t('hajj.a6') },
        { q: t('hajj.q7'), a: t('hajj.a7') },
      ],
    },
    {
      id: 'hotels',
      icon: '🏨',
      title: t('hotels.title'),
      faqs: [
        { q: t('hotels.q1'), a: t('hotels.a1') },
        { q: t('hotels.q2'), a: t('hotels.a2') },
        { q: t('hotels.q3'), a: t('hotels.a3') },
        { q: t('hotels.q4'), a: t('hotels.a4') },
        { q: t('hotels.q5'), a: t('hotels.a5') },
      ],
    },
    {
      id: 'car-rental',
      icon: '🚗',
      title: t('car.title'),
      faqs: [
        { q: t('car.q1'), a: t('car.a1') },
        { q: t('car.q2'), a: t('car.a2') },
        { q: t('car.q3'), a: t('car.a3') },
        { q: t('car.q4'), a: t('car.a4') },
        { q: t('car.q5'), a: t('car.a5') },
      ],
    },
    {
      id: 'payments-refunds',
      icon: '💳',
      title: t('payments.title'),
      faqs: [
        { q: t('payments.q1'), a: t('payments.a1') },
        { q: t('payments.q2'), a: t('payments.a2') },
        { q: t('payments.q3'), a: t('payments.a3') },
        { q: t('payments.q4'), a: t('payments.a4') },
        { q: t('payments.q5'), a: t('payments.a5') },
        { q: t('payments.q6'), a: t('payments.a6') },
      ],
    },
    {
      id: 'visa-documents',
      icon: '📋',
      title: t('visas.title'),
      faqs: [
        { q: t('visas.q1'), a: t('visas.a1') },
        { q: t('visas.q2'), a: t('visas.a2') },
        { q: t('visas.q3'), a: t('visas.a3') },
        { q: t('visas.q4'), a: t('visas.a4') },
        { q: t('visas.q5'), a: t('visas.a5') },
        { q: t('visas.q6'), a: t('visas.a6') },
      ],
    },
    {
      id: 'account-technical',
      icon: '🔧',
      title: t('account.title'),
      faqs: [
        { q: t('account.q1'), a: t('account.a1') },
        { q: t('account.q2'), a: t('account.a2') },
        { q: t('account.q3'), a: t('account.a3') },
        { q: t('account.q4'), a: t('account.a4') },
        { q: t('account.q5'), a: t('account.a5') },
        { q: t('account.q6'), a: t('account.a6') },
      ],
    },
    {
      id: 'insurance',
      icon: '🛡️',
      title: t('insurance.title'),
      faqs: [
        { q: t('insurance.q1'), a: t('insurance.a1') },
        { q: t('insurance.q2'), a: t('insurance.a2') },
        { q: t('insurance.q3'), a: t('insurance.a3') },
        { q: t('insurance.q4'), a: t('insurance.a4') },
      ],
    },
  ];

  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState<'faq' | 'airline' | 'advisory'>('faq');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams);

  // Sync search from URL ?q= param — React docs "Adjusting state based on props or other state" pattern
  if (prevSearchParams !== searchParams) {
    setPrevSearchParams(searchParams);
    const q = searchParams.get('q');
    if (q) { setSearch(q); setMainTab('faq'); setActiveCategory(null); }
  }

  const filteredFAQs = search.trim()
    ? categories.map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (f) =>
            f.q.toLowerCase().includes(search.toLowerCase()) ||
            f.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.faqs.length > 0)
    : activeCategory
    ? categories.filter((cat) => cat.id === activeCategory)
    : categories;

  const filteredAirlines = regionFilter === 'All'
    ? airlinePolicies
    : airlinePolicies.filter((a) => a.region === regionFilter);

  const severityLabel = (s: string) => {
    if (s === 'high')   return t('severityHigh');
    if (s === 'medium') return t('severityMedium');
    if (s === 'low')    return t('severityLow');
    return t('severityInfo');
  };

  return (
    <div className="min-h-screen bg-utu-bg-page font-sans">

      {/* Hero */}
      <section className="bg-gradient-to-b from-utu-navy to-utu-blue py-14 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-3">{t('heroHeading')}</h1>
          <p className="text-white/80 text-base">{t('heroDesc')}</p>
          {mainTab === 'faq' && (
            <div className="mt-6 max-w-lg mx-auto">
              <div className="flex items-center bg-utu-bg-card rounded-xl overflow-hidden shadow-lg">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
                  placeholder={t('searchPlaceholder')}
                  className="flex-1 px-4 py-3 text-sm text-utu-text-primary outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="px-3 text-utu-text-muted hover:text-utu-text-secondary">✕</button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="bg-utu-navy hover:bg-utu-blue text-white px-5 py-3 text-sm font-medium transition-colors"
                >
                  {t('searchBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Tabs */}
      <section className="bg-utu-bg-card border-b border-utu-border-default sticky top-14 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-3 justify-center">
          {[
            { key: 'faq',      label: t('tabFaqs'),    icon: '❓' },
            { key: 'airline',  label: t('tabAirline'), icon: '✈️' },
            { key: 'advisory', label: t('tabAdvisory'),icon: '📡' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setMainTab(tab.key as typeof mainTab); setSearch(''); setActiveCategory(null); }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                mainTab === tab.key
                  ? 'bg-utu-navy text-white'
                  : 'bg-utu-bg-muted text-utu-text-secondary hover:bg-utu-bg-subtle hover:text-utu-blue'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── FAQs ────────────────────────────────────────────────────────────── */}
      {mainTab === 'faq' && (
        <>
          {/* Category Pills */}
          {!search && (
            <section className="bg-utu-bg-card border-b border-utu-border-default py-3 px-4">
              <div className="max-w-5xl mx-auto flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === null ? 'bg-utu-navy text-white' : 'bg-utu-bg-muted text-utu-text-secondary hover:bg-utu-bg-subtle hover:text-utu-blue'
                  }`}
                >
                  {t('allTopics')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === cat.id ? 'bg-utu-navy text-white' : 'bg-utu-bg-muted text-utu-text-secondary hover:bg-utu-bg-subtle hover:text-utu-blue'
                    }`}
                  >
                    {cat.icon} {cat.title}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
              {filteredFAQs.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-utu-text-muted text-sm">{t('noResults', { search })}</p>
                  <p className="text-utu-text-muted text-xs mt-1">
                    {t('noResultsHint')}{' '}
                    <Link href="/contact" className="text-utu-blue hover:underline">{t('contactSupportLink')}</Link>.
                  </p>
                </div>
              )}
              {filteredFAQs.map((cat) => (
                <div key={cat.id} id={cat.id} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-utu-border-default bg-utu-bg-page">
                    <span className="text-2xl">{cat.icon}</span>
                    <h2 className="font-bold text-utu-text-primary text-base">{cat.title}</h2>
                    <span className="ms-auto text-xs text-utu-text-muted">{t('questionsLabel', { count: cat.faqs.length })}</span>
                  </div>
                  <div className="px-6">
                    {cat.faqs.map((faq) => (
                      <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Airline Policies ─────────────────────────────────────────────────── */}
      {mainTab === 'airline' && (
        <section id="airline-policies" className="py-10 px-4">
          <div className="max-w-6xl mx-auto">

            <div className="mb-6">
              <h2 className="text-xl font-bold text-utu-text-primary mb-1">{t('airlineHeading')}</h2>
              <p className="text-sm text-utu-text-muted">{t('airlineDesc')}</p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 inline-block">
                {t('airlineDisclaimer')}
              </p>
            </div>

            {/* Region Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    regionFilter === r ? 'bg-utu-navy text-white' : 'bg-utu-bg-card border border-utu-border-default text-utu-text-secondary hover:border-utu-border-default hover:text-utu-blue'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-utu-navy text-white">
                      <th className="text-start px-4 py-3 font-semibold text-xs uppercase tracking-wide">{t('colAirline')}</th>
                      <th className="text-start px-4 py-3 font-semibold text-xs uppercase tracking-wide">{t('colRegion')}</th>
                      <th className="text-start px-4 py-3 font-semibold text-xs uppercase tracking-wide">{t('colChanges')}</th>
                      <th className="text-start px-4 py-3 font-semibold text-xs uppercase tracking-wide">{t('colRefunds')}</th>
                      <th className="text-start px-4 py-3 font-semibold text-xs uppercase tracking-wide">{t('colVouchers')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAirlines.map((row, i) => (
                      <tr key={row.code} className={i % 2 === 0 ? 'bg-utu-bg-card' : 'bg-utu-bg-page'}>
                        <td className="px-4 py-3 font-medium text-utu-text-primary">
                          <div>{row.airline}</div>
                          <div className="text-xs text-utu-text-muted font-mono">{row.code}</div>
                          {row.note && <div className="text-xs text-amber-600 mt-0.5">{row.note}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-utu-bg-muted text-utu-text-secondary px-2 py-0.5 rounded-full font-medium">{row.region}</span>
                        </td>
                        <td className="px-4 py-3 text-utu-text-secondary text-xs leading-relaxed max-w-[180px]">{row.changes}</td>
                        <td className="px-4 py-3 text-utu-text-secondary text-xs leading-relaxed max-w-[140px]">{row.refunds}</td>
                        <td className="px-4 py-3 text-utu-text-secondary text-xs leading-relaxed max-w-[160px]">{row.vouchers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-utu-bg-page border-t border-utu-border-default flex items-center justify-between">
                <span className="text-xs text-utu-text-muted">{t('airlinesShown', { count: filteredAirlines.length })}</span>
                <Link href="/contact" className="text-xs text-utu-blue hover:underline font-medium">
                  {t('airlineSupportLink')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Travel Advisory ──────────────────────────────────────────────────── */}
      {mainTab === 'advisory' && (
        <section className="py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-utu-text-primary mb-1">{t('advisoryHeading')}</h2>
              <p className="text-sm text-utu-text-muted">{t('advisoryDesc')}</p>
            </div>

            <div className="space-y-4">
              {advisories.map((adv) => {
                const style = severityStyles[adv.severity];
                return (
                  <div key={adv.title} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden flex">
                    <div className={`w-1.5 flex-shrink-0 ${style.bar}`} />
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.badge} ${style.badgeText}`}>
                              {severityLabel(adv.severity)}
                            </span>
                            <span className="text-xs text-utu-text-muted">{adv.region}</span>
                          </div>
                          <h3 className="font-bold text-utu-text-primary text-sm">{adv.title}</h3>
                        </div>
                        <span className="text-xs text-utu-text-muted whitespace-nowrap flex-shrink-0">{adv.updated}</span>
                      </div>
                      <p className="text-sm text-utu-text-secondary leading-relaxed mb-3">{adv.body}</p>
                      <a
                        href={adv.actionHref}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-utu-blue hover:text-utu-navy hover:underline"
                      >
                        {adv.action} →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 bg-utu-bg-muted rounded-xl px-4 py-3 text-xs text-utu-text-muted">
              {t('advisoryDisclaimer')}
            </div>
          </div>
        </section>
      )}

      {/* Still need help CTA */}
      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto bg-utu-navy rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">{t('helpHeading')}</h2>
          <p className="text-white/80 text-sm mb-6">{t('helpDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="bg-utu-bg-card text-utu-navy font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-utu-bg-subtle transition-colors"
            >
              {t('contactSupportBtn')}
            </Link>
            <a
              href="mailto:support@utubooking.com"
              className="bg-utu-bg-card/10 border border-white/20 text-white font-medium text-sm px-6 py-2.5 rounded-xl hover:bg-utu-bg-card/20 transition-colors"
            >
              support@utubooking.com
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
