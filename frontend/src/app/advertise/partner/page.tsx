import type { Metadata } from 'next';
import Link from 'next/link';
import AdvertisingPartnerForm from './AdvertisingPartnerForm';

export const metadata: Metadata = {
  title: 'Partner with UTUBooking — Advertising Enquiry',
  description:
    'Tell us about your brand and campaign goals. Our partnerships team will build a custom media plan for you.',
  alternates: { canonical: 'https://utubooking.com/advertise/partner' },
};

const FORMATS_QUICK = [
  { icon: '⚡', label: 'Performance Ads', desc: 'CPC / CPA — pay per click or confirmed booking' },
  { icon: '🖼', label: 'Display & Native', desc: 'CPM banners and content cards' },
  { icon: '✉️',  label: 'CRM / Email',     desc: 'Sponsored newsletters and seasonal campaigns' },
];

const REACH_STATS = [
  { value: '3M+', label: 'Monthly searches' },
  { value: '15',  label: 'Languages' },
  { value: '25+', label: 'Markets' },
];

export default function AdvertisingPartnerPage() {
  return (
    <main className="bg-utu-bg-page min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Back link */}
        <Link
          href="/advertise"
          className="inline-flex items-center gap-1.5 text-utu-text-muted hover:text-utu-text-primary text-sm mb-8 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Advertising
        </Link>

        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-block bg-utu-navy text-amber-400 text-xs font-black px-3 py-1.5 rounded-lg tracking-widest uppercase">
              UTU
            </span>
            <span className="text-utu-text-primary font-bold text-lg">Advertising</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Partner Programme</span>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Open</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-utu-text-primary">
            Let&apos;s Build Something Big
          </h1>
          <p className="text-utu-text-muted text-base mt-2 max-w-xl">
            Tell us about your brand, region, and goals. We&apos;ll come back with a custom media plan within 2 business days.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-[360px_1fr] gap-8 items-start">

          {/* Left — program specs (sticky) */}
          <aside className="space-y-4 lg:sticky lg:top-24">

            {/* Audience reach */}
            <div className="bg-white rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-xs font-bold text-utu-text-muted uppercase tracking-widest mb-4">Audience Reach</h2>
              <div className="grid grid-cols-3 divide-x divide-utu-border-default">
                {REACH_STATS.map((s) => (
                  <div key={s.label} className="text-center px-2">
                    <p className="text-xl font-extrabold text-utu-navy">{s.value}</p>
                    <p className="text-xs text-utu-text-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ad formats */}
            <div className="bg-white rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-xs font-bold text-utu-text-muted uppercase tracking-widest mb-4">Ad Formats</h2>
              <div className="space-y-4">
                {FORMATS_QUICK.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5" aria-hidden="true">{f.icon}</span>
                    <div>
                      <p className="font-semibold text-utu-text-primary text-sm">{f.label}</p>
                      <p className="text-xs text-utu-text-muted">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeting */}
            <div className="bg-white rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-xs font-bold text-utu-text-muted uppercase tracking-widest mb-4">Targeting</h2>
              <div className="space-y-2">
                {['Demographic', 'Behavioral', 'Geographic', 'Device', 'Seasonal', 'Retargeting'].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-green-500 shrink-0" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-sm text-utu-text-secondary">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Markets */}
            <div className="bg-white rounded-2xl border border-utu-border-default p-5">
              <h2 className="text-xs font-bold text-utu-text-muted uppercase tracking-widest mb-4">Key Markets</h2>
              <div className="flex flex-wrap gap-1.5">
                {['🇸🇦 KSA', '🇦🇪 UAE', '🇪🇬 Egypt', '🇹🇷 Turkey', '🇮🇩 Indonesia', '🇲🇾 Malaysia', '🇵🇰 Pakistan', '🇧🇩 Bangladesh', '🇬🇧 UK', '🇫🇷 France'].map((flag) => (
                  <span key={flag} className="text-xs bg-utu-bg-muted border border-utu-border-default px-2 py-1 rounded-full text-utu-text-secondary">
                    {flag}
                  </span>
                ))}
                <span className="text-xs text-utu-text-muted px-2 py-1">+ 15 more</span>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-utu-navy rounded-2xl p-5">
              <p className="text-white/80 text-xs mb-1">Direct enquiries</p>
              <a href="mailto:partners@utubooking.com" className="text-amber-300 text-sm font-semibold hover:underline">
                partners@utubooking.com
              </a>
            </div>

          </aside>

          {/* Right — form */}
          <div>
            <AdvertisingPartnerForm />
          </div>
        </div>
      </div>
    </main>
  );
}
