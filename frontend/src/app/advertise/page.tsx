import type { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Advertise on UTUBooking — Reach 3M+ Hajj & Umrah Travellers',
    description:
      'Turn traveler intent into real bookings. Performance ads, display media, and CRM campaigns targeting 3M+ Hajj and Umrah travellers across 25+ markets.',
    alternates: { canonical: 'https://utubooking.com/advertise' },
  };
}

const AD_FORMATS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title:  'Performance Ads',
    desc:   'Cost-per-click and cost-per-booking campaigns. You pay only when travellers act — search result placements, hotel card sponsorships, and flight grid highlights.',
    tags:   ['CPC', 'CPA', 'CPB'],
    color:  'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4" strokeLinecap="round"/>
      </svg>
    ),
    title:  'Display & Native',
    desc:   'Full-bleed banners, native content cards, and destination spotlights embedded naturally into Hajj and Umrah travel journeys — desktop and mobile.',
    tags:   ['CPM', 'Branding'],
    color:  'bg-violet-50 border-violet-200 text-violet-700',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    title:  'CRM & Email',
    desc:   'Sponsor our traveller newsletters and Ramadan/Hajj season email campaigns reaching verified bookers. Segment by destination, language, and travel date.',
    tags:   ['Newsletter', 'Seasonal'],
    color:  'bg-amber-50 border-amber-200 text-amber-700',
  },
];

const TARGETING = [
  { label: 'Demographic',  desc: 'Age, gender, nationality, language — Arabic, English, Urdu, Bahasa, Turkish and 10 more.' },
  { label: 'Behavioral',   desc: 'Hajj/Umrah intent signals, hotel star preference, flight class, past booking history.' },
  { label: 'Geographic',   desc: '25+ markets: Saudi Arabia, UAE, Egypt, Turkey, Indonesia, Malaysia, Pakistan and beyond.' },
  { label: 'Device',       desc: '80%+ mobile traffic — app-first campaigns with deep links to your product or booking page.' },
  { label: 'Seasonal',     desc: 'Hajj season, Ramadan, Eid Al-Fitr, Eid Al-Adha — peak intent windows with programmatic surge.' },
  { label: 'Retargeting',  desc: 'Re-engage visitors who browsed your category on UTUBooking — highest conversion intent.' },
];

const STATS = [
  { value: '3M+',  label: 'Monthly Searches' },
  { value: '25+',  label: 'Markets Covered' },
  { value: '80%+', label: 'Mobile Traffic' },
  { value: '#1',   label: 'Hajj & Umrah Focus' },
];

const TRUSTED_TYPES = [
  'Airlines', 'Hotel Chains', 'Tourism Boards', 'OTAs', 'Car Rental',
  'Travel Tech', 'Halal Brands', 'Financial / Payments',
];

export default async function AdvertisePage() {
  return (
    <main className="bg-utu-bg-page min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-utu-navy py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-amber-400/20 text-amber-300 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Advertising
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Turn Traveler Intent<br />Into Real Bookings
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            UTUBooking connects your brand with 3 million Hajj and Umrah travellers every month.
            Performance ads, display media, and CRM campaigns across 25+ markets in 15 languages.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/advertise/partner"
              className="bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
            >
              Partner with Us
            </Link>
            <a
              href="#formats"
              className="border border-white/30 hover:border-white/60 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
            >
              See Ad Formats
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-utu-border-default">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-utu-border-default">
          {STATS.map((s) => (
            <div key={s.label} className="py-8 px-6 text-center">
              <p className="text-3xl font-extrabold text-utu-navy">{s.value}</p>
              <p className="text-utu-text-muted text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ad Formats ────────────────────────────────────────────────────────── */}
      <section id="formats" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-utu-text-primary text-center mb-2">
            Advertising Formats
          </h2>
          <p className="text-utu-text-muted text-center text-sm mb-10">
            Choose the format that fits your goal — from direct-response to brand awareness.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {AD_FORMATS.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-utu-border-default p-6 flex flex-col gap-4">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl border ${f.color}`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-utu-text-primary text-base mb-2">{f.title}</h3>
                  <p className="text-utu-text-muted text-sm leading-relaxed">{f.desc}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {f.tags.map((tag) => (
                    <span key={tag} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${f.color}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Targeting ─────────────────────────────────────────────────────────── */}
      <section className="bg-utu-navy py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-white text-center mb-2">
            Precision Targeting
          </h2>
          <p className="text-white/60 text-center text-sm mb-10">
            Reach the right traveller at the right moment — no wasted impressions.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TARGETING.map((t) => (
              <div key={t.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-bold text-white text-sm mb-1.5">{t.label}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Advertises ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-utu-text-primary mb-2">
            Trusted by Leading Travel Brands
          </h2>
          <p className="text-utu-text-muted text-sm mb-10">
            From national tourism boards to boutique halal brands — advertisers across the Muslim travel ecosystem choose UTUBooking.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {TRUSTED_TYPES.map((type) => (
              <span
                key={type}
                className="bg-utu-bg-muted border border-utu-border-default text-utu-text-secondary text-sm font-medium px-4 py-2 rounded-full"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why UTUBooking ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-utu-bg-page">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-utu-text-primary text-center mb-10">
            Why Advertise with UTUBooking?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: 'High-Intent Audience',
                desc:  'Every visitor is actively planning travel — searching hotels in Makkah, comparing flights, booking cars. Your ads appear at the moment of decision.',
              },
              {
                title: 'Muslim-World Focus',
                desc:  'Unmatched depth in Hajj, Umrah, and Ramadan travel segments. Reach travellers that mainstream OTAs underserve.',
              },
              {
                title: 'Multilingual Reach',
                desc:  'Campaigns run in Arabic, English, Urdu, Bahasa Indonesia, Bahasa Malaysia, Turkish, and 9 more languages — native creatives, not machine translation.',
              },
              {
                title: 'Verified Performance',
                desc:  'Full attribution reporting: impressions, clicks, conversions, and booking completions. CPA campaigns with confirmed booking events.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-utu-border-default p-6">
                <h3 className="font-bold text-utu-text-primary mb-2 text-base">{item.title}</h3>
                <p className="text-utu-text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-utu-navy to-utu-blue py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">
            Ready to Reach Muslim Travellers?
          </h2>
          <p className="text-white/70 text-base mb-8">
            Tell us about your brand and goals. Our partnerships team will put together a custom media plan.
          </p>
          <Link
            href="/advertise/partner"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-10 py-4 rounded-xl transition-colors text-base"
          >
            Get Started — Partner with Us
          </Link>
        </div>
      </section>

    </main>
  );
}
