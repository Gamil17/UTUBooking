import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Umrah Packages 2026 — Hotels, Flights & Planning Guide | UTUBooking',
  description:
    'Plan your Umrah 2026 with UTUBooking. Verified hotels near Masjid al-Haram in Makkah and Masjid al-Nabawi in Madinah. Book flights from 25+ countries. SAR pricing.',
  keywords:
    'Umrah packages 2026, Umrah hotels Makkah, flights Jeddah Umrah, cheap Umrah packages, عمرة 2026, فنادق مكة قريبة من الحرم',
  openGraph: {
    title: 'Umrah Packages 2026 — UTUBooking',
    description:
      'Everything you need to plan and book your Umrah — verified Makkah hotels, international flights, Madinah stays, and step-by-step rituals guide.',
    url: 'https://utubooking.com/umrah-packages',
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const PEAK_SEASONS = [
  { label: 'Ramadan 2026',          dates: 'Late Feb – Late Mar 2026', demand: 'Extreme', note: 'Most spiritual, highest prices — book 6–12 months ahead' },
  { label: 'Last 10 nights (Laylat al-Qadr)', dates: '13–22 Mar 2026', demand: 'Peak',   note: 'Extremely crowded around the Haram; flights fill instantly' },
  { label: 'School Summer Holidays', dates: 'June – Aug 2026',          demand: 'High',   note: 'Popular for GCC families — good availability if booked 3+ months ahead' },
  { label: 'Christmas / New Year',   dates: 'Dec 2026 – Jan 2027',      demand: 'High',   note: 'Popular for European diaspora — mix of Umrah and leisure' },
  { label: 'Off-peak Shoulder',      dates: 'Sep – Nov / Jan – Feb',    demand: 'Moderate', note: 'Best value; shorter crowds; pleasant weather Oct–Nov' },
];

const UMRAH_RITUALS = [
  {
    step: 1,
    title: 'Ihram & Niyyah',
    desc: 'Pilgrims enter the state of ihram (ritual purity) at one of the Miqat stations before entering Makkah. Men wear two seamless white cloths; women wear modest dress covering all except face and hands.',
    tip: 'The Miqat for air travelers is usually Qarn al-Manazil (near Taif Airport) or declared on board. Notify cabin crew if you wish to change into ihram before landing.',
  },
  {
    step: 2,
    title: 'Tawaf al-Qudum',
    desc: 'Perform seven counter-clockwise circuits around the Kaaba beginning and ending at the Black Stone (Hajar al-Aswad). Men are recommended to do Raml (light jogging) in the first three circuits.',
    tip: 'Tawaf is performed 24 hours a day. Quieter periods are typically after Fajr and before noon. The ground floor is most crowded; upper floors offer more space.',
  },
  {
    step: 3,
    title: 'Prayer at Maqam Ibrahim',
    desc: 'After completing Tawaf, offer two rak\'ahs of prayer behind Maqam Ibrahim (the Station of Ibrahim) if possible, or anywhere in the mosque if the area is crowded.',
    tip: 'Crowds at Maqam Ibrahim can be very dense. The obligatory aspect is completing the two rak\'ahs in the mosque, not necessarily immediately behind the Maqam itself.',
  },
  {
    step: 4,
    title: 'Sa\'i between Safa and Marwa',
    desc: 'Walk seven lengths between the hills of Safa and Marwa, commemorating Hajar\'s search for water for her son Ismail. Each one-way passage counts as one length.',
    tip: 'Sa\'i is a brisk walk. Wheelchair-accessible lanes are available. The distance between the hills is approximately 450 metres; total Sa\'i is about 3.15 km.',
  },
  {
    step: 5,
    title: 'Halq or Taqsir',
    desc: 'Men shave the head (halq) or trim the hair (taqsir) to exit the state of ihram. Women cut a small amount from the ends of their hair. This marks the completion of Umrah.',
    tip: 'Barbershops are plentiful near the Haram. If performing multiple Umrahs in one trip, shaving is preferred for the first; trimming is sufficient for subsequent ones.',
  },
];

const PACKAGES = [
  {
    name:     'Economy',
    duration: '7 nights',
    price:    'From SAR 2,800',
    perPerson: 'per person (twin share)',
    highlight: false,
    includes: [
      'Return flights (economy class)',
      '4-star hotel in Makkah (500m–1km from Haram)',
      '3 nights in Madinah (3-star hotel)',
      'Airport transfers',
      'Ziyarat (guided visits) in both cities',
    ],
    note: 'Prices vary by origin country and season. Ramadan prices 2–4x higher.',
  },
  {
    name:     'Standard',
    duration: '10 nights',
    price:    'From SAR 5,200',
    perPerson: 'per person (twin share)',
    highlight: true,
    badge: 'Most Popular',
    includes: [
      'Return flights (economy class)',
      '5-star hotel in Makkah (200–500m from Haram)',
      '4 nights in Madinah (4-star hotel)',
      'Airport transfers with meet-and-greet',
      'Guided Ziyarat in Makkah and Madinah',
      'Umrah orientation session',
      'Group dhikr circles in the evenings',
    ],
    note: 'Best balance of value and proximity to Haram.',
  },
  {
    name:     'Premium',
    duration: '14 nights',
    price:    'From SAR 12,000',
    perPerson: 'per person (twin share)',
    highlight: false,
    includes: [
      'Return flights (business class available)',
      '5-star luxury hotel in Makkah (within 200m of Haram)',
      '5 nights in Madinah (5-star hotel near Nabawi)',
      'Private airport transfers',
      'Dedicated Umrah guide throughout',
      'Rawdah Sharif booking assistance',
      'Private Ziyarat tours by scholar guide',
      'Laundry, breakfast, and daily meals included',
    ],
    note: 'Ideal for elderly pilgrims or families requiring extra support.',
  },
];

const BEST_HOTELS_MAKKAH = [
  { name: 'Abraj Al-Bait Towers',      chain: 'Fairmont / Swissôtel / Raffles',  dist: '50m',  stars: 5 },
  { name: 'Jabal Omar Marriott',        chain: 'Marriott / Westin',               dist: '140m', stars: 5 },
  { name: 'Kempinski Jabal Omar',       chain: 'Kempinski',                       dist: '120m', stars: 5 },
  { name: 'Hyatt Regency Jabal Omar',   chain: 'Hyatt',                           dist: '120m', stars: 5 },
  { name: 'Makkah Hilton Towers',       chain: 'Hilton',                          dist: '180m', stars: 5 },
  { name: 'Grand Millennium Makkah',    chain: 'Millennium',                      dist: '250m', stars: 5 },
  { name: 'Al Safwah Royale Orchid',    chain: 'Independent',                     dist: '300m', stars: 5 },
  { name: 'Dar Al Tawhid IHG',          chain: 'InterContinental',                dist: '100m', stars: 5 },
];

const TIPS = [
  {
    title: 'Book Early for Ramadan',
    body:  'Hotels within 500m of the Haram during the last 10 nights of Ramadan are sold out 8–12 months in advance. If Ramadan Umrah is your goal, set a calendar reminder.',
  },
  {
    title: 'Use Licensed Umrah Operators',
    body:  'Saudi regulations require Umrah pilgrims to travel through licensed operators. Verify your agent\'s license on the Nusuk platform (nusuk.sa) before paying any deposit.',
  },
  {
    title: 'Download Nusuk Before Leaving',
    body:  'The Saudi Ministry of Hajj\'s official Nusuk app is mandatory for Rawdah booking in Madinah and includes prayer time alerts, guided itineraries, and ziyarat maps.',
  },
  {
    title: 'Weather in Makkah',
    body:  'June–August temperatures in Makkah regularly exceed 45°C. Carry a small spray bottle, stay hydrated, and avoid peak sun hours (11am–3pm) for outdoor walking.',
  },
  {
    title: 'Currency and Payments',
    body:  'Saudi Riyals (SAR) are the only accepted currency at most local vendors. ATMs are widely available near the Haram but queues peak after Friday prayers.',
  },
  {
    title: 'Physical Preparation',
    body:  'An average Umrah involves 5–8 km of walking per day. Begin a daily walking programme 4–6 weeks before travel. Compression socks help on the marble floors.',
  },
];

const DEMAND_COLORS: Record<string, string> = {
  Extreme:  'bg-red-100 text-red-700',
  Peak:     'bg-orange-100 text-orange-700',
  High:     'bg-amber-100 text-amber-700',
  Moderate: 'bg-green-100 text-green-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function UmrahPackagesPage() {
  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Hero */}
      <section className="bg-utu-navy py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-4">
            Umrah Planning Guide 2026
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto leading-tight">
            Plan Your Umrah — Step by Step
          </h1>
          <p className="text-white/75 text-lg max-w-2xl mx-auto mb-6">
            Verified hotels near Masjid al-Haram, flights from 25+ countries, and a complete rituals guide — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/hotels?destination=Makkah"
              className="bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              Search Makkah Hotels
            </Link>
            <Link
              href="/flights?destination=JED"
              className="border border-white/30 hover:border-white/60 text-white px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              Find Flights to Jeddah
            </Link>
          </div>
        </div>
      </section>

      {/* When to go */}
      <section className="py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">When to Perform Umrah</h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              Unlike Hajj, Umrah can be performed at any time of year. Prices and crowds vary significantly by season.
            </p>
          </div>
          <div className="space-y-3">
            {PEAK_SEASONS.map((s) => (
              <div key={s.label} className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-utu-text-primary text-sm">{s.label}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${DEMAND_COLORS[s.demand]}`}>{s.demand}</span>
                  </div>
                  <p className="text-xs text-utu-text-muted">{s.note}</p>
                </div>
                <div className="shrink-0 text-sm font-medium text-utu-blue">{s.dates}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Umrah rituals */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">The Five Pillars of Umrah</h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              A step-by-step guide to the rituals of Umrah, with practical tips from experienced pilgrims.
            </p>
          </div>
          <div className="space-y-5">
            {UMRAH_RITUALS.map((r) => (
              <div key={r.step} className="bg-utu-bg-page rounded-2xl border border-utu-border-default p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-utu-navy text-white text-sm font-bold flex items-center justify-center">
                    {r.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-utu-text-primary mb-2">{r.title}</h3>
                    <p className="text-sm text-utu-text-muted leading-relaxed mb-3">{r.desc}</p>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex gap-2">
                      <span className="text-amber-600 shrink-0 text-xs font-bold uppercase tracking-wider mt-0.5">Tip</span>
                      <p className="text-xs text-amber-800 leading-relaxed">{r.tip}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package tiers */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">Umrah Package Options</h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              Reference pricing for common Umrah durations. Exact prices depend on your departure city, season, and hotel choice.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className={`rounded-2xl border p-6 relative flex flex-col ${
                  pkg.highlight
                    ? 'bg-utu-navy border-utu-navy shadow-xl'
                    : 'bg-utu-bg-card border-utu-border-default'
                }`}
              >
                {pkg.badge && (
                  <span className="absolute -top-3 start-1/2 -translate-x-1/2 bg-amber-400 text-utu-navy text-xs font-bold px-3 py-1 rounded-full">
                    {pkg.badge}
                  </span>
                )}
                <div className="mb-4">
                  <h3 className={`font-bold text-lg mb-0.5 ${pkg.highlight ? 'text-white' : 'text-utu-text-primary'}`}>
                    {pkg.name}
                  </h3>
                  <p className={`text-2xl font-bold ${pkg.highlight ? 'text-amber-300' : 'text-utu-blue'}`}>
                    {pkg.price}
                  </p>
                  <p className={`text-xs mt-0.5 ${pkg.highlight ? 'text-white/60' : 'text-utu-text-muted'}`}>
                    {pkg.perPerson} · {pkg.duration}
                  </p>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {pkg.includes.map((item) => (
                    <li key={item} className={`flex items-start gap-2 text-sm ${pkg.highlight ? 'text-white/90' : 'text-utu-text-muted'}`}>
                      <span className={`mt-0.5 shrink-0 ${pkg.highlight ? 'text-amber-300' : 'text-utu-blue'}`}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {pkg.note && (
                  <p className={`text-xs mt-4 pt-4 border-t ${pkg.highlight ? 'text-white/50 border-white/20' : 'text-utu-text-muted border-utu-border-default'}`}>
                    {pkg.note}
                  </p>
                )}
                <Link
                  href="/hotels?destination=Makkah"
                  className={`mt-5 block text-center font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors ${
                    pkg.highlight
                      ? 'bg-amber-400 hover:bg-amber-300 text-utu-navy'
                      : 'bg-utu-navy hover:bg-utu-blue text-white'
                  }`}
                >
                  Book Hotels
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-utu-text-muted mt-6">
            Package prices are illustrative reference ranges only. Actual prices depend on origin, season, and availability at time of booking.
            <br />
            For tailored group or corporate Umrah packages:{' '}
            <a href="mailto:groups@utubooking.com" className="text-utu-blue hover:underline">groups@utubooking.com</a>
          </p>
        </div>
      </section>

      {/* Top Makkah hotels */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-utu-text-primary mb-1">Top Makkah Hotels Near the Haram</h2>
              <p className="text-utu-text-muted text-sm">Verified 5-star properties with confirmed proximity data.</p>
            </div>
            <Link
              href="/hotels?destination=Makkah"
              className="bg-utu-navy hover:bg-utu-blue text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              See All Hotels
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BEST_HOTELS_MAKKAH.map((h) => (
              <div key={h.name} className="bg-utu-bg-page rounded-xl border border-utu-border-default p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-utu-text-primary text-sm truncate">{h.name}</p>
                  <p className="text-xs text-utu-text-muted mt-0.5">{h.chain}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-col items-end">
                  <span className="text-xs bg-utu-navy/10 text-utu-navy px-2 py-0.5 rounded-full font-medium">{h.dist} from Haram</span>
                  <span className="text-xs text-amber-500">{'★'.repeat(h.stars)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practical tips */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">Practical Umrah Tips</h2>
            <p className="text-utu-text-muted text-sm">Advice from pilgrims and our travel specialists.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TIPS.map((tip) => (
              <div key={tip.title} className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
                <h3 className="font-semibold text-utu-text-primary mb-2 text-sm">{tip.title}</h3>
                <p className="text-sm text-utu-text-muted leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Madinah section */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-xl font-bold text-utu-text-primary mb-3">Visiting Madinah</h2>
            <p className="text-utu-text-muted text-sm leading-relaxed mb-4">
              While not an obligatory part of Umrah, visiting Madinah is strongly recommended (Sunnah) and forms part of virtually every Umrah package. Pilgrims typically spend 3–5 nights.
            </p>
            <ul className="space-y-3 text-sm text-utu-text-muted">
              {[
                { icon: '🕌', title: 'Masjid al-Nabawi', desc: 'The Prophet\'s Mosque is the second most sacred mosque in Islam. Visit at any time; the mosque operates 24 hours.' },
                { icon: '📿', title: 'Rawdah Sharif', desc: 'The area between the Prophet\'s grave and his pulpit. Booking via Nusuk app is now mandatory — slots available 30 days ahead.' },
                { icon: '🏔️', title: 'Mount Uhud', desc: 'The site of the Battle of Uhud. The martyrs\' cemetery is a place of deep historical and spiritual significance.' },
                { icon: '🕌', title: 'Masjid Quba', desc: 'The first mosque built in Islam. Praying two rak\'ahs here is equivalent in reward to an Umrah, according to authentic hadith.' },
                { icon: '🌴', title: 'Al-Baqi\' Cemetery', desc: 'Resting place of many Companions of the Prophet and members of his family. Open to visitors at set times.' },
              ].map((place) => (
                <li key={place.title} className="flex gap-3">
                  <span className="text-lg shrink-0" aria-hidden="true">{place.icon}</span>
                  <div>
                    <p className="font-medium text-utu-text-primary">{place.title}</p>
                    <p className="text-xs mt-0.5 text-utu-text-muted">{place.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="bg-utu-navy rounded-2xl p-6 text-white">
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Book Madinah Hotels</p>
              <p className="text-lg font-bold mb-1">Stay Near Masjid al-Nabawi</p>
              <p className="text-white/70 text-sm mb-4">
                Hotels within 300m of the Prophet's Mosque fill 3–6 months ahead of Ramadan. Available year-round for shoulder season travel.
              </p>
              <Link
                href="/hotels?destination=Madinah"
                className="block text-center bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold text-sm py-3 rounded-xl transition-colors"
              >
                Search Madinah Hotels
              </Link>
            </div>
            <div className="rounded-2xl border border-utu-border-default bg-utu-bg-page p-5">
              <h3 className="font-semibold text-utu-text-primary mb-3 text-sm">Getting Madinah to Makkah</h3>
              <ul className="space-y-2 text-sm text-utu-text-muted">
                <li className="flex gap-2"><span>🚅</span><span><strong className="text-utu-text-primary">Haramain Train</strong> — 2h journey, frequent daily services, book via Haramain Train app</span></li>
                <li className="flex gap-2"><span>🚌</span><span><strong className="text-utu-text-primary">SAPTCO Buses</strong> — 4–5h, very affordable, departs from Madinah bus station</span></li>
                <li className="flex gap-2"><span>🚗</span><span><strong className="text-utu-text-primary">Car rental or taxi</strong> — 4–5h, SAR 250–450 one way, flexible departure times</span></li>
                <li className="flex gap-2"><span>✈️</span><span><strong className="text-utu-text-primary">Fly Madinah–Jeddah</strong> — 45 min, available with flynas and Saudi</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-utu-navy py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">Start Planning</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to Book Your Umrah?</h2>
          <p className="text-white/70 mb-7 text-sm max-w-lg mx-auto">
            Search live availability for Makkah and Madinah hotels, compare flights from your city, and book everything in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/hotels?destination=Makkah"
              className="bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              Book Makkah Hotel
            </Link>
            <Link
              href="/hotels?destination=Madinah"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              Book Madinah Hotel
            </Link>
            <Link
              href="/flights?destination=JED"
              className="border border-white/30 hover:border-white/60 text-white px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              Find Flights
            </Link>
          </div>
          <p className="text-white/50 text-xs mt-6">
            Group or corporate Umrah bookings:{' '}
            <a href="mailto:groups@utubooking.com" className="text-amber-300 hover:underline">groups@utubooking.com</a>
          </p>
        </div>
      </section>

    </div>
  );
}
