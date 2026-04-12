import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'List Your Hotel on UTUBooking — Reach Hajj & Umrah Travelers',
  description:
    'Join 1,200+ hotels listed on UTUBooking and reach 3 million+ Hajj and Umrah pilgrims. Premium listings in Makkah and Madinah. Free to apply.',
  openGraph: {
    title: 'List Your Hotel on UTUBooking — Reach Hajj & Umrah Travelers',
    description:
      'Join 1,200+ hotels listed on UTUBooking and reach 3 million+ Hajj and Umrah pilgrims. Premium listings in Makkah and Madinah.',
    url: 'https://utubooking.com/hotel-partners',
  },
};

const BENEFITS = [
  {
    icon: '🕌',
    title: 'Haram Proximity Filter',
    desc: 'Pilgrims search specifically by walking distance to the Haram. Your distance is prominently displayed — the #1 decision factor for Makkah bookings.',
  },
  {
    icon: '🌍',
    title: 'Arabic-First Audience',
    desc: 'Our platform is built for Arabic speakers across 25+ countries. Your listing is shown in Arabic and English, reaching Gulf, Levant, and diaspora travelers.',
  },
  {
    icon: '📊',
    title: 'Partner Analytics Dashboard',
    desc: 'Real-time occupancy rates, demand forecasts for peak Hajj and Ramadan seasons, and conversion insights — all in one dashboard.',
  },
  {
    icon: '💰',
    title: 'Competitive Commission',
    desc: 'Industry-standard commission with no hidden fees. SAR invoicing with local bank transfers. Monthly payouts, transparent reporting.',
  },
  {
    icon: '📅',
    title: 'Hajj & Umrah Demand Calendar',
    desc: 'Advance booking surges for Ramadan, Hajj season, and school holidays. We surface your property at exactly the right moment.',
  },
  {
    icon: '🔗',
    title: 'Direct API Integration',
    desc: 'Connect your existing PMS or channel manager. We support XML/JSON feeds and major GDS connections so inventory stays in sync automatically.',
  },
];

const TIERS = [
  {
    name: 'Standard Listing',
    price: 'Free',
    highlight: false,
    features: [
      'Listed in search results',
      'Basic property profile',
      'Standard photo gallery (up to 10 photos)',
      'Real-time availability sync',
      'Monthly payout',
    ],
  },
  {
    name: 'Featured Listing',
    price: 'Contact us',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Priority placement in search',
      'Enhanced property profile',
      'Unlimited photos + virtual tour',
      'Haram distance badge',
      'Demand forecasting dashboard',
      'Dedicated account manager',
      'Priority support',
    ],
  },
  {
    name: 'Premium Partner',
    price: 'Contact us',
    highlight: false,
    features: [
      'Everything in Featured',
      'Homepage spotlight during Hajj season',
      'API / PMS direct integration',
      'Co-marketing opportunities',
      'Custom analytics reports',
      'Multi-property management',
    ],
  },
];

const STATS = [
  { value: '3M+',    label: 'Pilgrims reached annually' },
  { value: '1,200+', label: 'Hotels listed' },
  { value: '25+',    label: 'Source countries' },
  { value: '#1',     label: 'Hajj & Umrah booking platform' },
];

const PROPERTY_TYPES = [
  'Hotels near the Haram',
  'Madinah hotels',
  'Jeddah business hotels',
  'Airport transit hotels',
  'Furnished apartments',
  'Pilgrimage guesthouses',
];

export default function HotelPartnersPage() {
  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Hero */}
      <section className="bg-utu-navy py-20 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-4">
          Hotel Partner Programme
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto leading-tight">
          Reach Millions of Hajj and Umrah Travelers
        </h1>
        <p className="text-white/75 text-lg max-w-2xl mx-auto mb-8">
          List your property on the Gulf region's leading Islamic travel platform. Join over 1,200 hotels already reaching pilgrims from 25+ countries every day.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/hotel-partners/apply"
            className="bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Send Request
          </Link>
          <a
            href="#how-it-works"
            className="border border-white/30 hover:border-white/60 text-white px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-utu-blue py-6 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-white font-bold text-2xl md:text-3xl">{s.value}</p>
              <p className="text-white/80 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">
              Why Hotels Choose UTUBooking
            </h2>
            <p className="text-utu-text-muted text-sm max-w-xl mx-auto">
              We understand the Hajj and Umrah market better than any other platform. Our tools are built specifically for properties in Makkah, Madinah, and key pilgrim routes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-utu-bg-card rounded-xl border border-utu-border-default shadow-sm p-6"
              >
                <span className="text-3xl mb-3 block" aria-hidden="true">{b.icon}</span>
                <h3 className="font-semibold text-utu-text-primary mb-2">{b.title}</h3>
                <p className="text-sm text-utu-text-muted leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Property types */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary mb-6 text-center">
            Properties We Work With
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {PROPERTY_TYPES.map((type) => (
              <span
                key={type}
                className="bg-utu-bg-page border border-utu-border-default rounded-full px-4 py-2 text-sm text-utu-text-primary font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Listing tiers */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-utu-text-primary mb-2">Listing Options</h2>
            <p className="text-utu-text-muted text-sm">
              Start with a free listing and upgrade as you grow. No lock-in contracts.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 relative ${
                  tier.highlight
                    ? 'bg-utu-navy border-utu-navy text-white shadow-xl'
                    : 'bg-utu-bg-card border-utu-border-default'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 start-1/2 -translate-x-1/2 bg-amber-400 text-utu-navy text-xs font-bold px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                )}
                <h3
                  className={`font-bold text-lg mb-1 ${
                    tier.highlight ? 'text-white' : 'text-utu-text-primary'
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`text-2xl font-bold mb-5 ${
                    tier.highlight ? 'text-amber-300' : 'text-utu-blue'
                  }`}
                >
                  {tier.price}
                </p>
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-sm ${
                        tier.highlight ? 'text-white/90' : 'text-utu-text-muted'
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 ${tier.highlight ? 'text-amber-300' : 'text-utu-blue'}`}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/hotel-partners/apply"
                    className={`block text-center font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      tier.highlight
                        ? 'bg-amber-400 hover:bg-amber-300 text-utu-navy'
                        : 'bg-utu-navy hover:bg-utu-blue text-white'
                    }`}
                  >
                    Send Request
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding steps */}
      <section className="bg-utu-bg-card border-y border-utu-border-default py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary mb-8 text-center">
            How to Get Listed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            {[
              { step: '1', title: 'Submit Request', desc: 'Fill in your property details and contact information.' },
              { step: '2', title: 'Partner Review', desc: 'Our team reviews your property within 2 business days.' },
              { step: '3', title: 'Onboarding Call', desc: 'We connect your PMS or add your inventory manually.' },
              { step: '4', title: 'Go Live', desc: 'Your hotel is live and visible to millions of pilgrims.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-utu-navy text-white font-bold flex items-center justify-center text-lg mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-utu-text-primary mb-1 text-sm">{s.title}</h3>
                <p className="text-xs text-utu-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-utu-text-primary mb-3">
            Ready to Reach More Pilgrims?
          </h2>
          <p className="text-utu-text-muted mb-6">
            Submit your property request today. Our team will be in touch within 2 business days.
          </p>
          <Link
            href="/hotel-partners/apply"
            className="inline-block bg-utu-navy hover:bg-utu-blue text-white font-bold px-10 py-3.5 rounded-xl transition-colors text-sm"
          >
            Send Request
          </Link>
          <p className="text-utu-text-muted text-sm mt-4">
            Require more assistance?{' '}
            <a href="mailto:partners@utubooking.com" className="text-utu-blue hover:underline font-medium">
              Email our partnerships team
            </a>
          </p>
        </div>
      </section>

    </div>
  );
}
