import type { Metadata } from 'next';
import Link from 'next/link';
import HotelPartnerForm from './HotelPartnerForm';

export const metadata: Metadata = {
  title: 'Apply to List Your Hotel — UTUBooking Hotel Partners',
  description:
    'Submit your property for listing on UTUBooking. Reach millions of Hajj and Umrah pilgrims. Our team reviews every application within 2 business days.',
};

const SIDEBAR_STATS = [
  { label: 'Pilgrims reached annually', value: '3M+' },
  { label: 'Hotels currently listed',   value: '1,200+' },
  { label: 'Booking conversion rate',   value: '4.8%' },
  { label: 'Average booking value',     value: 'SAR 1,400' },
];

const AD_FORMATS = [
  { title: 'Standard Listing', desc: 'Free visibility in search results' },
  { title: 'Featured Listing', desc: 'Priority placement and enhanced profile' },
  { title: 'Premium Partner',  desc: 'Homepage spotlight + API integration' },
];

const KEY_MARKETS = ['Saudi Arabia', 'UAE', 'Egypt', 'Malaysia', 'Indonesia', 'Pakistan', 'UK (diaspora)', 'US (diaspora)'];

export default function HotelPartnerApplyPage() {
  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Page header */}
      <div className="bg-utu-navy py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/hotel-partners"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Hotel Partners
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Apply to List Your Property</h1>
          <p className="text-white/70 text-sm">
            Join 1,200+ hotels reaching Hajj and Umrah travelers from 25+ countries.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-start">

          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-24 space-y-6">

            {/* Audience reach */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-sm font-semibold text-utu-text-primary mb-4">Audience Reach</h2>
              <div className="grid grid-cols-2 gap-4">
                {SIDEBAR_STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-xl font-bold text-utu-navy">{s.value}</p>
                    <p className="text-xs text-utu-text-muted mt-0.5 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Listing tiers */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-sm font-semibold text-utu-text-primary mb-3">Listing Options</h2>
              <ul className="space-y-3">
                {AD_FORMATS.map((f) => (
                  <li key={f.title} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-utu-blue shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-medium text-utu-text-primary">{f.title}</p>
                      <p className="text-xs text-utu-text-muted">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key markets */}
            <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-sm font-semibold text-utu-text-primary mb-3">Traveler Source Markets</h2>
              <div className="flex flex-wrap gap-1.5">
                {KEY_MARKETS.map((m) => (
                  <span
                    key={m}
                    className="bg-utu-bg-page border border-utu-border-default rounded-full px-2.5 py-1 text-xs text-utu-text-muted"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-utu-navy rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                Partnerships Team
              </p>
              <p className="text-sm text-white/80 mb-3">
                Prefer to speak with someone first?
              </p>
              <a
                href="mailto:partners@utubooking.com"
                className="block text-center bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
              >
                partners@utubooking.com
              </a>
            </div>

          </aside>

          {/* Application form */}
          <main>
            <HotelPartnerForm />
          </main>

        </div>
      </div>
    </div>
  );
}
