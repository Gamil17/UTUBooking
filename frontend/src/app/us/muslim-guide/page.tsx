import type { Metadata } from 'next';
import Link from 'next/link';
import { CITY_GUIDES } from '@/lib/usCityGuides';

export const metadata: Metadata = {
  title:       'US Muslim Travel Guide — Halal Hotels, Mosques & Umrah Flights · UTUBooking',
  description: 'City-by-city guide for Muslim travelers across the United States. Find halal restaurants, mosques, Islamic services, and Umrah departure airports near you.',
  robots:      { index: true, follow: true },
  openGraph: {
    title:       'US Muslim Travel Guide · UTUBooking',
    description: 'Halal dining, mosques, and Umrah flights for every major US Muslim community.',
    type:        'website',
  },
};

export default function UsMuslimGuidePage() {
  const cities = Object.values(CITY_GUIDES);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Hero */}
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">
          US Muslim Travel Guide
        </h1>
        <p className="text-base text-emerald-700 font-medium">
          Your community-by-community guide to halal travel, mosques, and Umrah departures across America.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          The United States is home to an estimated 3.45 million Muslims. UTUBooking serves every
          major Muslim community with city guides covering halal dining, mosques, Islamic services,
          and the fastest routes to Makkah for Umrah and Hajj.
        </p>
        <div className="inline-flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2 text-sm text-emerald-800">
          <span aria-hidden="true">🕌</span>
          <span>3.45 million Muslims in the US &middot; {cities.length} city guides</span>
        </div>
      </header>

      {/* City grid */}
      <section aria-labelledby="cities-heading">
        <h2 id="cities-heading" className="text-base font-semibold text-gray-900 mb-4">
          Choose your city
        </h2>
        <ul className="space-y-3" role="list">
          {cities.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/us/muslim-guide/${guide.slug}`}
                className="block rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {guide.name}
                      <span className="ml-1.5 text-xs font-normal text-gray-400">{guide.state}</span>
                    </p>
                    <p className="text-xs text-emerald-700 italic">{guide.tagline}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-gray-500">
                        Muslim pop. {guide.muslimPopEstimate}
                      </span>
                      <span className="text-xs text-gray-500">
                        Flights from {guide.departureAirport}
                      </span>
                    </div>
                  </div>
                  <span className="text-emerald-400 group-hover:text-emerald-600 transition-colors shrink-0 mt-1" aria-hidden="true">
                    &rarr;
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Umrah CTA */}
      <section className="rounded-2xl bg-gray-900 text-white p-6 text-center space-y-3">
        <p className="text-base font-semibold">Ready for Umrah?</p>
        <p className="text-sm text-gray-300">
          Compare halal-friendly hotels near Al-Haram, flights from any US airport, and complete Umrah packages.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/hotels/search?destination=Makkah"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-5 py-3 text-sm font-semibold min-h-[44px] transition-colors"
          >
            Hotels in Makkah
          </Link>
          <Link
            href="/flights/search?to=JED"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-xl px-5 py-3 text-sm font-semibold min-h-[44px] transition-colors"
          >
            Flights to Jeddah
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        <p>
          City guide content is reviewed annually. Community listings are for informational purposes only.
          UTUBooking recommends verifying halal certification directly with restaurants and hotels.
        </p>
      </footer>

    </main>
  );
}
