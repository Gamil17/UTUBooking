import { notFound }               from 'next/navigation';
import { Metadata }               from 'next';
import Link                       from 'next/link';
import { getCityGuide, CITY_SLUGS } from '@/lib/usCityGuides';
import HalalRestaurantList        from '@/components/us/HalalRestaurantList';

// ── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { city: string } }
): Promise<Metadata> {
  const guide = getCityGuide(params.city);
  if (!guide) return { title: 'Not Found' };

  return {
    title:       `Muslim Guide to ${guide.name}, ${guide.state}`,
    description: guide.heroDescription.slice(0, 160),
    robots:      { index: true, follow: true },
    openGraph: {
      title:       `Muslim Travel Guide — ${guide.name} · UTUBooking`,
      description: guide.heroDescription.slice(0, 160),
      type:        'website',
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CityGuidePage({ params }: { params: { city: string } }) {
  const guide = getCityGuide(params.city);
  if (!guide) notFound();

  const flightSearchUrl =
    `/flights/search?origin=${guide.departureAirport}&destination=JED&tripType=umrah`;

  return (
    <article className="max-w-2xl mx-auto px-4 py-8 space-y-10">

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs text-gray-400">
        <Link href="/us/muslim-guide" className="hover:underline">US Muslim Guide</Link>
        {' / '}
        <span>{guide.name}</span>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">🕌</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Muslim Guide to {guide.name}
            </h1>
            <p className="text-sm text-gray-500">{guide.state}</p>
          </div>
        </div>
        <p className="text-lg font-medium text-emerald-700 italic">{guide.tagline}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{guide.heroDescription}</p>
        <div className="inline-flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2 text-sm text-emerald-800">
          <span>🕌</span>
          <span>Muslim Population: {guide.muslimPopEstimate}</span>
        </div>
      </header>

      {/* ── Umrah Departure ────────────────────────────────────────── */}
      <section aria-labelledby="departure-heading" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 space-y-3">
        <h2 id="departure-heading" className="text-base font-semibold text-emerald-900 flex items-center gap-2">
          <span aria-hidden="true">✈️</span> Nearest Umrah Departure Airport
        </h2>
        <p className="text-sm text-emerald-800">
          <strong>{guide.departureAirport}</strong> — {guide.airportName}
        </p>
        <Link
          href={flightSearchUrl}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-colors"
        >
          ✈️ Search Umrah Flights from {guide.departureAirport}
        </Link>
      </section>

      {/* ── Halal Restaurants ──────────────────────────────────────── */}
      <section aria-labelledby="halal-heading" className="space-y-3">
        <h2 id="halal-heading" className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span aria-hidden="true">🥩</span> Halal Dining Nearby
        </h2>
        <HalalRestaurantList
          lat={guide.centerLat}
          lng={guide.centerLng}
          radius={2000}
          cityName={guide.name}
        />
      </section>

      {/* ── Mosques ────────────────────────────────────────────────── */}
      <section aria-labelledby="mosques-heading" className="space-y-3">
        <h2 id="mosques-heading" className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span aria-hidden="true">🕌</span> Mosques
        </h2>
        <ul className="space-y-3" role="list">
          {guide.mosques.map((mosque) => (
            <li key={mosque.name} className="rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
              <p className="text-sm font-semibold text-gray-900">{mosque.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{mosque.address}</p>
              <a
                href={mosque.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline mt-1 inline-block"
                aria-label={`Open ${mosque.name} in Google Maps`}
              >
                View on Google Maps →
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Islamic Services ───────────────────────────────────────── */}
      <section aria-labelledby="services-heading" className="space-y-4">
        <h2 id="services-heading" className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span aria-hidden="true">🌙</span> Islamic Services
        </h2>
        {guide.islamicServices.map((group) => (
          <div key={group.category} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.category}</h3>
            <ul className="space-y-1" role="list">
              {group.items.map((item) => (
                <li key={item} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5" aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── Hotel Search CTA ───────────────────────────────────────── */}
      <section className="rounded-2xl bg-gray-900 text-white p-6 text-center space-y-3">
        <p className="text-base font-semibold">Find Halal-Friendly Hotels near {guide.name}</p>
        <p className="text-sm text-gray-300">
          Filter by halal food, prayer rooms, and more.
        </p>
        <Link
          href={`/hotels/search?location=${guide.name}&halal_friendly=true`}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-5 py-3 text-sm font-semibold min-h-[44px] transition-colors"
        >
          🕌 Search Halal Hotels in {guide.name}
        </Link>
      </section>

      {/* ── Disclaimer ─────────────────────────────────────────────── */}
      <footer className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        <p>
          Content reviewed annually. Community listings are for informational purposes only.
          UTUBooking recommends verifying halal certification directly with restaurants and hotels.
          Human QA required — see <code>marketing/approvals/us-content-qa.md</code>.
        </p>
      </footer>

    </article>
  );
}
