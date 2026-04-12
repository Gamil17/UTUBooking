import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'UTUBooking for Business — Corporate Travel Management',
  description: 'Manage corporate travel across the Gulf with negotiated rates, policy controls, group bookings, and VAT-compliant invoicing. Apply for UTUBooking for Business today.',
};

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Negotiated Corporate Rates',
    desc: 'Exclusive rates on hotels in Makkah, Madinah, Riyadh, Dubai, and 50+ destinations — up to 30% below public prices.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: 'Travel Policy Controls',
    desc: 'Set per-diem limits, cabin class rules, advance booking windows, and hotel star ratings. Every booking is policy-checked automatically.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Group & Hajj Travel',
    desc: 'Coordinate group bookings for Umrah delegations, government missions, and corporate retreats with a single dashboard.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'VAT-Compliant Invoicing',
    desc: 'Saudi VAT and UAE VAT invoices generated automatically for every booking. Export to Excel or your ERP in one click.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: 'Real-Time Spend Analytics',
    desc: 'Track spend by department, destination, and employee. Budget alerts at 80% and 100% so there are no surprises at month end.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-6-3.75H6m.75 3.75H6" />
      </svg>
    ),
    title: 'Approval Workflows',
    desc: 'Out-of-policy bookings automatically route to travel managers for approval — with full audit trail and email notifications.',
  },
];

const stats = [
  { value: '2M+', label: 'Travellers served' },
  { value: '50+', label: 'Hotel suppliers' },
  { value: '25+', label: 'Markets supported' },
  { value: '24/7', label: 'Arabic & English support' },
];

const steps = [
  { n: '01', title: 'Apply online', desc: 'Fill in your company details. Takes under 3 minutes.' },
  { n: '02', title: 'We review', desc: 'Our corporate team reviews within 1–2 business days.' },
  { n: '03', title: 'Get approved', desc: 'Receive portal credentials by email.' },
  { n: '04', title: 'Start booking', desc: 'Your team books flights, hotels, and cars immediately.' },
];

export default function CorporateLandingPage() {
  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Hero */}
      <section className="bg-utu-navy py-20 px-4 text-center">
        <span className="inline-block bg-amber-400 text-utu-navy text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
          UTUBooking for Business
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 max-w-3xl mx-auto leading-tight">
          Corporate Travel Management<br className="hidden sm:block" /> Built for the Gulf
        </h1>
        <p className="text-white/80 max-w-xl mx-auto text-base mb-10">
          Policy controls, negotiated rates, VAT invoicing, and group bookings —
          all in one portal designed for Saudi Arabia, UAE, and the wider Muslim World.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/corporate/apply"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-4 rounded-xl transition-colors text-sm shadow-lg"
          >
            Apply for Free Access
          </Link>
          <Link
            href="#how-it-works"
            className="inline-block border border-white/30 hover:border-white text-white font-semibold px-8 py-4 rounded-xl transition-colors text-sm"
          >
            How it works
          </Link>
        </div>
        <p className="text-white/40 text-xs mt-6">
          Already have an account?{' '}
          <Link href="/pro" className="text-white/60 hover:text-white underline transition-colors">
            Sign in to your portal
          </Link>
        </p>
      </section>

      {/* Stats bar */}
      <div className="bg-utu-bg-card border-b border-utu-border-default">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-utu-navy">{s.value}</p>
              <p className="text-xs text-utu-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-3">
            Everything your travel team needs
          </h2>
          <p className="text-utu-text-muted text-center text-sm mb-10 max-w-xl mx-auto">
            Purpose-built for Gulf corporates — government, oil &amp; gas, finance, and beyond.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-utu-bg-card rounded-xl border border-utu-border-default p-6 flex gap-4 shadow-sm">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-utu-navy/10 flex items-center justify-center text-utu-navy">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-utu-text-primary mb-1 text-sm">{f.title}</h3>
                  <p className="text-xs text-utu-text-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-utu-bg-card border-y border-utu-border-default py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-utu-navy text-white font-bold text-lg flex items-center justify-center mb-4">
                  {s.n}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute" />
                )}
                <h3 className="font-semibold text-utu-text-primary mb-1 text-sm">{s.title}</h3>
                <p className="text-xs text-utu-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is this for */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary text-center mb-8">Who uses UTUBooking for Business</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: '🏛️', label: 'Government & Public Sector' },
              { icon: '⛽', label: 'Oil, Gas & Energy' },
              { icon: '🏦', label: 'Finance & Banking' },
              { icon: '🏥', label: 'Healthcare & Pharma' },
              { icon: '🎓', label: 'Education & Universities' },
              { icon: '🤝', label: 'NGOs & Charities' },
              { icon: '💻', label: 'Technology & Startups' },
              { icon: '🕌', label: 'Islamic Organizations' },
            ].map(i => (
              <div key={i.label} className="bg-utu-bg-card rounded-xl border border-utu-border-default p-4 shadow-sm">
                <div className="text-2xl mb-2">{i.icon}</div>
                <p className="text-xs font-medium text-utu-text-secondary">{i.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-utu-navy py-14 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to simplify corporate travel?</h2>
        <p className="text-white/80 text-sm mb-8 max-w-md mx-auto">
          Apply in under 3 minutes. Our team reviews within 1–2 business days.
        </p>
        <Link
          href="/corporate/apply"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-10 py-4 rounded-xl transition-colors text-sm shadow-lg"
        >
          Apply for Business Access
        </Link>
        <p className="text-white/50 text-xs mt-4">
          No credit card required. Cancel anytime. Questions? Email{' '}
          <a href="mailto:corporate@utubooking.com" className="text-white/70 hover:text-white underline">
            corporate@utubooking.com
          </a>
        </p>
        <p className="text-white/40 text-xs mt-3">
          Already have an account?{' '}
          <Link href="/pro" className="text-white/60 hover:text-white underline transition-colors">
            Sign in to your portal
          </Link>
        </p>
      </section>

    </div>
  );
}
