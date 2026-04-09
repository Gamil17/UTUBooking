import type { Metadata } from 'next';
import HajjPackageBuilder from '@/components/us/HajjPackageBuilder';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Umrah Packages from the USA — UTUBooking',
  description:
    'Book Umrah packages from New York, Detroit, Chicago, Los Angeles, Washington D.C. and Houston. ' +
    'Flight + halal hotel bundles to Makkah & Madinah. Verified hotels near the Haram.',
  robots: { index: true, follow: true },
  openGraph: {
    title:       'Umrah Packages from the USA · UTUBooking',
    description: 'JFK, DTW, ORD, LAX, IAD, IAH → Jeddah. Flight + hotel bundles for US Muslims.',
    type:        'website',
  },
};

export default function UmrahPackagesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs text-utu-text-muted">
        <Link href="/us/muslim-guide" className="hover:underline">US Muslim Guide</Link>
        {' / '}
        <span>Umrah Packages</span>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">🕌</span>
          <div>
            <h1 className="text-2xl font-bold text-utu-text-primary">Umrah Packages from the US</h1>
            <p className="text-sm text-utu-text-muted">Flight + halal-friendly hotel · Makkah &amp; Madinah</p>
          </div>
        </div>
        <p className="text-sm text-utu-text-secondary leading-relaxed">
          Search and compare complete Umrah travel packages — round-trip flight from your nearest
          US city paired with a verified halal-friendly hotel near the Haram in Makkah. All packages
          connect through a Gulf or European hub (16–22 hours total journey time).
        </p>

        {/* Key airports */}
        <div className="flex flex-wrap gap-2">
          {['DTW', 'JFK', 'ORD', 'LAX', 'IAD', 'IAH'].map((iata) => (
            <span
              key={iata}
              className="bg-utu-bg-subtle text-utu-navy text-xs font-semibold px-3 py-1 rounded-full border border-utu-border-default"
            >
              {iata}
            </span>
          ))}
          <span className="text-xs text-utu-text-muted self-center">→ JED</span>
        </div>
      </header>

      {/* ── Package Builder ─────────────────────────────────────────── */}
      <HajjPackageBuilder />

      {/* ── Why book a package? ─────────────────────────────────────── */}
      <section aria-labelledby="why-heading" className="rounded-2xl bg-utu-bg-muted border border-utu-border-default p-6 space-y-4">
        <h2 id="why-heading" className="text-base font-semibold text-utu-text-primary">
          Why Book a Package?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { icon: '💰', title: 'Save on bundles', body: 'Flight + hotel packages are typically 10–20% cheaper than booking separately.' },
            { icon: '✅', title: 'Verified halal', body: 'Every hotel is screened for halal food, prayer rooms, and Qibla direction.' },
            { icon: '📞', title: 'US support', body: 'English-speaking support team familiar with US departure logistics and visa requirements.' },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-1">
              <span className="text-2xl">{item.icon}</span>
              <p className="font-semibold text-utu-text-primary">{item.title}</p>
              <p className="text-utu-text-muted text-xs leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── US connection note ─────────────────────────────────────── */}
      <section
        aria-labelledby="flight-note-heading"
        className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800"
      >
        <h2 id="flight-note-heading" className="font-semibold mb-1">✈️ About US→Jeddah Flights</h2>
        <p className="leading-relaxed">
          There are currently no nonstop US–Jeddah services. All itineraries connect via a Gulf or
          European hub. Recommended connections: <strong>Qatar Airways via Doha</strong>,{' '}
          <strong>Etihad via Abu Dhabi</strong>, <strong>Emirates via Dubai</strong>, or{' '}
          <strong>Turkish Airlines via Istanbul</strong>. American Airlines and United Airlines
          offer convenient codeshare options through their respective alliances.
        </p>
      </section>

      {/* ── Visa reminder ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">🛂 Saudi Umrah Visa</p>
        <p className="leading-relaxed">
          US citizens require a Saudi Umrah visa (eVisa — apply online at
          {' '}<strong>visa.visitsaudi.com</strong>). Processing typically takes 1–3 business days.
          Your hotel confirmation from this booking can be used as proof of accommodation.
        </p>
      </section>

      {/* ── Footer links ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/us/muslim-guide/dearborn" className="text-utu-blue hover:underline">
          Muslim Guide — Dearborn
        </Link>
        <Link href="/" className="text-utu-blue hover:underline">
          Browse Makkah Hotels
        </Link>
        <Link href="/flights/search?destination=JED&tripType=umrah" className="text-utu-blue hover:underline">
          Flights to Jeddah
        </Link>
      </div>

    </main>
  );
}
