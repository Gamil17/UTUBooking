import type { Metadata } from 'next';
import Link from 'next/link';
import CorporateApplyForm from './CorporateApplyForm';

export const metadata: Metadata = {
  title: 'Apply for UTUBooking for Business — Corporate Travel Portal',
  description: 'Apply for free access to UTUBooking for Business. Corporate travel management with negotiated rates, policy controls, and VAT invoicing for Gulf companies.',
};

const highlights = [
  'Negotiated rates — up to 30% below public prices',
  'VAT-compliant invoicing for Saudi Arabia & UAE',
  'Travel policy controls & approval workflows',
  'Group bookings for Hajj, Umrah & corporate trips',
  'Dedicated Arabic & English support team',
];

export default function CorporateApplyPage() {
  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Compact header */}
      <div className="bg-utu-navy py-8 px-4 text-center">
        <Link href="/corporate" className="text-white/70 hover:text-white text-xs mb-3 inline-block">
          ← UTUBooking for Business
        </Link>
        <h1 className="text-2xl font-bold text-white">Apply for Business Access</h1>
        <p className="text-white/70 text-sm mt-1">Takes under 3 minutes. Our team responds within 1–2 business days.</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* Left: value props */}
        <aside className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 shadow-sm">
            <h2 className="font-bold text-utu-text-primary mb-4 text-sm">What you get</h2>
            <ul className="space-y-3">
              {highlights.map(h => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-utu-text-secondary">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 shadow-sm">
            <h2 className="font-bold text-utu-text-primary mb-3 text-sm">How it works</h2>
            <ol className="space-y-3">
              {[
                'Fill in the 3-step form',
                'Our team reviews within 1–2 business days',
                'Get portal credentials by email',
                'Your team starts booking immediately',
              ].map((s, i) => (
                <li key={s} className="flex items-start gap-2.5 text-sm text-utu-text-secondary">
                  <span className="w-5 h-5 rounded-full bg-utu-navy/10 text-utu-navy text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 text-center">
            <p className="text-xs text-utu-text-muted">Questions before applying?</p>
            <a href="mailto:corporate@utubooking.com"
              className="text-sm font-semibold text-utu-blue hover:underline mt-1 block">
              corporate@utubooking.com
            </a>
          </div>
        </aside>

        {/* Right: the form */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <CorporateApplyForm />
        </div>

      </div>
    </div>
  );
}
