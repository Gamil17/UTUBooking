import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hajj 2026 Planning Guide — Hotels, Flights & Services | UTUBooking',
  description:
    'Plan your Hajj 2026 journey with UTUBooking. Book verified hotels near Masjid al-Haram, flights from 25+ countries, and ground transport. SAR pricing. Arabic support.',
  keywords:
    'Hajj 2026, Hajj hotels Makkah, flights to Jeddah, Hajj packages, Madinah hotels, حج 2026, فنادق مكة المكرمة',
  openGraph: {
    title: 'Hajj 2026 Planning Guide — UTUBooking',
    description:
      'Everything you need for Hajj 2026 — verified Makkah hotels, international flights, Madinah accommodation, and national quota information.',
    url: 'https://utubooking.com/hajj-services',
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const HAJJ_2026 = {
  year:        '2026',
  hijri:       '1447 AH',
  arafatDay:   'Thursday, 19 June 2026',
  eidAlAdha:   'Friday, 20 June 2026',
  season:      'Mid-June 2026',
  peakWindow:  '5 June – 25 June 2026',
};

const JOURNEY_STAGES = [
  {
    day:   'Before Departure',
    title: 'Preparation',
    steps: [
      'Obtain Hajj visa through your national quota authority',
      'Book your Makkah hotel (ideally 6–12 months in advance)',
      'Book return flights to Jeddah (KAIA) or Madinah (AMMA)',
      'Purchase ihram garments and travel essentials',
      'Register with your country's Hajj mission',
    ],
  },
  {
    day:   'Days 1–2',
    title: 'Arrival & Makkah',
    steps: [
      'Land at King Abdulaziz International Airport (JED)',
      'Transfer to your Makkah hotel (60–90 min)',
      'Enter ihram and perform Tawaf al-Qudum (arrival circumambulation)',
      'Perform Sa\'i between Safa and Marwa',
      'Rest and prepare for the journey ahead',
    ],
  },
  {
    day:   'Day 3 (8 Dhul Hijjah)',
    title: 'Mina',
    steps: [
      'Travel to Mina (5 km from Makkah) for the Day of Tarwiyah',
      'Spend the night in your assigned tent in Mina',
      'Offer Dhuhr, Asr, Maghrib, and Isha prayers in Mina',
      'Remain in a state of contemplation and dhikr',
    ],
  },
  {
    day:   'Day 4 (9 Dhul Hijjah)',
    title: 'Arafat',
    steps: [
      'Travel to the plain of Arafat after Fajr',
      'Stand in Wuquf (vigil) — the central pillar of Hajj',
      '19 June 2026 — Day of Arafat, prayers and supplication until sunset',
      'Travel to Muzdalifah after sunset for Maghrib and Isha',
      'Collect 70 pebbles for the Rami (stoning) ritual',
    ],
  },
  {
    day:   'Day 5 (10 Dhul Hijjah)',
    title: 'Eid al-Adha',
    steps: [
      'Return to Mina after Fajr',
      'Stone the large Jamarah (Jamarat al-Aqabah)',
      'Perform Qurbani (sacrifice) — now managed digitally in KSA',
      'Shave or trim hair — exiting partial ihram',
      'Return to Makkah for Tawaf al-Ifadah and Sa\'i',
    ],
  },
  {
    day:   'Days 6–7 (Tashreeq)',
    title: 'Back in Mina',
    steps: [
      'Stone all three Jamarat in sequence',
      'Optional: perform each stoning after Zawwal (noon)',
      'Days of Tashreeq are days of eating, drinking, and dhikr',
      'Final Jamarat stoning on the last day in Mina',
      'Farewell Tawaf (Tawaf al-Wada) before leaving Makkah',
    ],
  },
  {
    day:   'After Hajj',
    title: 'Madinah Visit',
    steps: [
      'Travel to Madinah (450 km north of Makkah)',
      'Visit Masjid al-Nabawi and offer salah at the Prophet\'s Mosque',
      'Visit Rawdah Sharif — booking now required (Nusuk app)',
      'Visit historical sites: Quba Mosque, Qiblatain, Uhud',
      'Return home with Hajj accepted, insha\'Allah',
    ],
  },
];

const MAKKAH_HOTELS = [
  { name: 'Abraj Towers Zone',     dist: '50–150m',  stars: 5, note: 'Fairmont, Swissôtel, Raffles, Pullman — world-famous, directly adjacent to Haram' },
  { name: 'Jabal Omar Complex',    dist: '120–300m',  stars: 5, note: 'Hyatt, Marriott, Anantara, Kempinski — extensive retail and dining complex' },
  { name: 'Ajyad District',        dist: '300–700m',  stars: '3–5', note: 'Wide range of mid-range and budget hotels, popular with group pilgrims' },
  { name: 'Aziziyah / Mashair',    dist: '2–5 km',   stars: '2–4', note: 'More affordable, good transport links to Haram via bus and train' },
  { name: 'Rusayfah / Al Awali',   dist: '5–10 km',  stars: '2–3', note: 'Budget accommodation, shuttle buses to Haram available' },
];

const MADINAH_HOTELS = [
  { name: 'Central Area (Haram)',  dist: '50–300m',  stars: '4–5', note: 'Anwar Al Madinah Mövenpick, Swissôtel, Pullman — walking distance to Nabawi' },
  { name: 'Al Haram Zone',         dist: '300m–1km', stars: '3–5', note: 'Mix of international chains and local hotels close to the mosque' },
  { name: 'Al Anbariyah District', dist: '1–2 km',   stars: '2–4', note: 'Good value, close to the old city market and transport' },
];

const FLIGHT_ROUTES = [
  { from: 'London (LHR)',     to: 'Jeddah (JED)',   carriers: 'Saudi, BA, flydubai',  duration: '~7h' },
  { from: 'Kuala Lumpur (KUL)', to: 'Jeddah (JED)', carriers: 'Malaysia, Saudi, flynas', duration: '~9h' },
  { from: 'Jakarta (CGK)',    to: 'Jeddah (JED)',   carriers: 'Garuda, Saudi',         duration: '~10h' },
  { from: 'Karachi (KHI)',    to: 'Jeddah (JED)',   carriers: 'PIA, flynas, Saudi',    duration: '~3.5h' },
  { from: 'Cairo (CAI)',      to: 'Jeddah (JED)',   carriers: 'EgyptAir, flynas',      duration: '~2h' },
  { from: 'Istanbul (IST)',   to: 'Jeddah (JED)',   carriers: 'Turkish, Saudi',        duration: '~4h' },
  { from: 'Dubai (DXB)',      to: 'Jeddah (JED)',   carriers: 'Emirates, flydubai',    duration: '~2h' },
  { from: 'Islamabad (ISB)',  to: 'Jeddah (JED)',   carriers: 'PIA, flynas, Saudi',    duration: '~3h' },
];

const QUOTAS = [
  { country: 'Indonesia',     quota: '~231,000', note: 'Managed by BPIH/Kemenag, wait list 10–40 years' },
  { country: 'Pakistan',      quota: '~184,000', note: 'Hajj Policy announced annually, Tabung Haji equivalent: Waqf-e-Awlad' },
  { country: 'India',         quota: '~175,000', note: 'Hajj Committee of India, priority for first-timers' },
  { country: 'Bangladesh',    quota: '~127,000', note: 'Hajj Agencies Bangladesh, state and private schemes' },
  { country: 'Nigeria',       quota: '~95,000',  note: 'National Hajj Commission of Nigeria (NAHCON)' },
  { country: 'Egypt',         quota: '~90,000',  note: 'Hajj and Umrah Ministry, priority for first-timers' },
  { country: 'Malaysia',      quota: '~29,700',  note: 'Tabung Haji manages all Malaysian pilgrims' },
  { country: 'UK',            quota: '~25,000',  note: 'Via licensed UK Hajj operators, no government quota body' },
];

const CHECKLIST = [
  'Valid passport (min 6 months validity beyond travel dates)',
  'Hajj visa (issued through national quota authority or licensed operator)',
  'Two sets of white unstitched ihram cloth (men)',
  'Comfortable walking shoes suitable for marble floors',
  'Small backpack for the Jamarat stoning days',
  'Pebble collection bag for Muzdalifah',
  'Nusuk app installed — required for Rawdah Sharif booking in Madinah',
  'Saudi Riyal cash — ATMs are available but queues are long in peak',
  'Prescription medications with doctor's letter',
  'Sunscreen, electrolyte sachons, and light layers for variable temperatures',
  'Portable phone charger — essential during the Mina tent days',
  'Travel insurance including medical evacuation cover',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HajjServicesPage() {
  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Hero */}
      <section className="bg-utu-navy py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-4">
            Hajj {HAJJ_2026.year} · {HAJJ_2026.hijri}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto leading-tight">
            Your Complete Hajj 2026 Planning Guide
          </h1>
          <p className="text-white/75 text-lg max-w-2xl mx-auto mb-6">
            Day of Arafat: {HAJJ_2026.arafatDay}. Book your Makkah hotel and flights early — peak availability fills by December.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/hotels?destination=Makkah&checkIn=2026-06-12&checkOut=2026-06-22"
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

      {/* Key dates bar */}
      <section className="bg-utu-blue py-4 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-white">
          {[
            { label: 'Hajj Year', value: `${HAJJ_2026.year} · ${HAJJ_2026.hijri}` },
            { label: 'Day of Arafat', value: '19 June 2026' },
            { label: 'Eid al-Adha', value: '20 June 2026' },
            { label: 'Peak Season', value: HAJJ_2026.peakWindow },
          ].map((d) => (
            <div key={d.label}>
              <p className="text-white/70 text-xs mb-0.5">{d.label}</p>
              <p className="font-bold text-sm">{d.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey stages */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">The Hajj Journey — Step by Step</h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              A day-by-day breakdown of the pillars and rituals of Hajj, from preparation to the farewell Tawaf.
            </p>
          </div>
          <div className="space-y-4">
            {JOURNEY_STAGES.map((stage, i) => (
              <div key={stage.title} className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-utu-navy text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-bold text-utu-text-primary">{stage.title}</h3>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-medium">{stage.day}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {stage.steps.map((step) => (
                        <li key={step} className="flex items-start gap-2 text-sm text-utu-text-muted">
                          <span className="text-utu-blue mt-0.5 shrink-0 text-xs">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hotels section */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Makkah hotels */}
            <div>
              <h2 className="text-xl font-bold text-utu-text-primary mb-2">Makkah Accommodation</h2>
              <p className="text-utu-text-muted text-sm mb-6">
                Hotels are categorised by walking distance to Masjid al-Haram. The Haram zone fills 6–9 months before Hajj season — book early.
              </p>
              <div className="space-y-3">
                {MAKKAH_HOTELS.map((h) => (
                  <div key={h.name} className="rounded-xl border border-utu-border-default bg-utu-bg-page p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-semibold text-utu-text-primary text-sm">{h.name}</h3>
                      <div className="flex gap-2 shrink-0">
                        <span className="text-xs bg-utu-navy/10 text-utu-navy px-2 py-0.5 rounded-full font-medium">{h.dist}</span>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{'★'} {h.stars}</span>
                      </div>
                    </div>
                    <p className="text-xs text-utu-text-muted">{h.note}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/hotels?destination=Makkah"
                className="mt-5 inline-block bg-utu-navy hover:bg-utu-blue text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Search All Makkah Hotels
              </Link>
            </div>

            {/* Madinah hotels */}
            <div>
              <h2 className="text-xl font-bold text-utu-text-primary mb-2">Madinah Accommodation</h2>
              <p className="text-utu-text-muted text-sm mb-6">
                Most pilgrims spend 6–8 nights in Madinah visiting Masjid al-Nabawi. Hotels within 300m of the mosque fill rapidly.
              </p>
              <div className="space-y-3">
                {MADINAH_HOTELS.map((h) => (
                  <div key={h.name} className="rounded-xl border border-utu-border-default bg-utu-bg-page p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-semibold text-utu-text-primary text-sm">{h.name}</h3>
                      <div className="flex gap-2 shrink-0">
                        <span className="text-xs bg-utu-navy/10 text-utu-navy px-2 py-0.5 rounded-full font-medium">{h.dist}</span>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{'★'} {h.stars}</span>
                      </div>
                    </div>
                    <p className="text-xs text-utu-text-muted">{h.note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                <Link
                  href="/hotels?destination=Madinah"
                  className="inline-block bg-utu-navy hover:bg-utu-blue text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                >
                  Search All Madinah Hotels
                </Link>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Rawdah Sharif Booking</p>
                  <p className="text-xs text-amber-700">
                    Visiting the Rawdah in Masjid al-Nabawi now requires advance booking via the <strong>Nusuk app</strong> (Saudi Ministry of Hajj). Slots fill within hours of release.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Flights */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">Flights to Jeddah (King Abdulaziz Airport)</h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              Jeddah is the gateway airport for Hajj. Flights from most Muslim-majority countries are significantly cheaper when booked 6+ months in advance.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {FLIGHT_ROUTES.map((f) => (
              <div key={f.from} className="bg-utu-bg-card rounded-xl border border-utu-border-default p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-utu-text-primary text-sm">{f.from}</p>
                  <p className="text-xs text-utu-text-muted mt-0.5">{f.carriers}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-medium text-utu-blue">{f.duration}</p>
                  <p className="text-xs text-utu-text-muted">{f.to}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/flights?destination=JED"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
            >
              Search Flights to Jeddah
            </Link>
          </div>
        </div>
      </section>

      {/* National quotas */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">National Hajj Quotas</h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              Saudi Arabia allocates Hajj visas per country based on 1 pilgrim per 1,000 Muslim citizens. Quotas are managed by each country's Hajj authority.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-page">
            <table className="w-full text-sm">
              <thead className="bg-utu-bg-subtle border-b border-utu-border-default">
                <tr>
                  {['Country', 'Approx. Quota', 'Key Information'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-utu-border-default">
                {QUOTAS.map((q) => (
                  <tr key={q.country} className="hover:bg-utu-bg-subtle transition-colors">
                    <td className="px-5 py-3 font-medium text-utu-text-primary">{q.country}</td>
                    <td className="px-5 py-3 text-utu-blue font-semibold">{q.quota}</td>
                    <td className="px-5 py-3 text-utu-text-muted text-xs">{q.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-utu-text-muted text-center mt-4">
            Quotas subject to annual revision by the Saudi Ministry of Hajj and Umrah. Always confirm with your national Hajj authority.
          </p>
        </div>
      </section>

      {/* Packing checklist */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-bold text-utu-text-primary mb-2">Pilgrim Checklist</h2>
              <p className="text-utu-text-muted text-sm mb-6">
                Essential items for every Hajj pilgrim. Print this list and tick off each item before departure.
              </p>
              <ul className="space-y-2.5">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-utu-text-secondary">
                    <span className="mt-0.5 w-4 h-4 rounded border-2 border-utu-border-strong shrink-0 flex items-center justify-center">
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              {/* Ground transport card */}
              <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6">
                <h3 className="font-bold text-utu-text-primary mb-3">Ground Transport in KSA</h3>
                <ul className="space-y-3 text-sm text-utu-text-muted">
                  {[
                    { icon: '🚌', title: 'Haramain Train', desc: 'High-speed rail linking Makkah, Madinah, and King Abdulaziz Airport. Book via Haramain Train app.' },
                    { icon: '🚗', title: 'Car Rental', desc: 'Available at Jeddah Airport and in Makkah/Madinah. Book in advance — Hajj season prices spike 3–5x.' },
                    { icon: '🚌', title: 'Hajj Mission Buses', desc: 'Your national Hajj mission provides buses for Mina, Arafat, and Muzdalifah transfers. Included in most packages.' },
                    { icon: '🕌', title: 'Naqabah Shuttle', desc: 'Free shuttle buses operate from most major Makkah hotels to the Haram gates around the clock.' },
                  ].map((t) => (
                    <li key={t.title} className="flex gap-3">
                      <span className="text-lg shrink-0" aria-hidden="true">{t.icon}</span>
                      <div>
                        <p className="font-medium text-utu-text-primary">{t.title}</p>
                        <p className="text-xs mt-0.5">{t.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Car rental CTA */}
              <div className="rounded-2xl bg-utu-navy p-6 text-white text-center">
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Book Now</p>
                <p className="font-bold text-lg mb-1">Car Rental in Makkah & Jeddah</p>
                <p className="text-white/70 text-sm mb-4">From SAR 95/day. Airport pick-up available.</p>
                <Link
                  href="/cars?pickup=Makkah"
                  className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold text-sm px-6 py-2.5 rounded-xl transition-colors"
                >
                  Search Car Rentals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA strip */}
      <section className="bg-utu-navy py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">Start Planning</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Begin Your Hajj 2026 Booking
          </h2>
          <p className="text-white/70 mb-7 text-sm max-w-lg mx-auto">
            Makkah hotel rooms within 500m of the Haram are typically fully booked 6 months before Hajj season. Reserve now to secure your preferred property.
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
        </div>
      </section>

    </div>
  );
}
