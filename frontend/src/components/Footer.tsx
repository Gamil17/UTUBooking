import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

// ─── Social icons (SVG inline — no icon library dependency) ───────────────────

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.23H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export default async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  const COLUMNS = [
    {
      heading: t('planBook'),
      links: [
        { label: t('flights'),       href: '/?tab=flights' },
        { label: t('hotels'),        href: '/?tab=hotels' },
        { label: t('carRentals'),    href: '/?tab=cars' },
        { label: t('umrahPackages'), href: '/umrah-packages' },
        { label: t('hajjServices'),  href: '/hajj-services' },
        { label: t('loyalty'),       href: '/loyalty' },
        { label: t('promoCodes'),    href: '/promo-codes' },
        { label: t('travelGuides'),  href: '/blog' },
      ],
    },
    {
      heading: t('companySupport'),
      links: [
        { label: t('aboutUs'),   href: '/about' },
        { label: t('careers'),   href: '/careers' },
        { label: t('press'),     href: '/press' },
        { label: t('faqs'),      href: '/faq' },
        { label: t('contactUs'), href: '/contact' },
        { label: t('blog'),      href: '/blog' },
      ],
    },
    {
      heading: t('businessPartners'),
      links: [
        { label: t('affiliates'),      href: '/affiliates' },
        { label: t('advertise'),       href: '/advertise' },
        { label: t('hotelPartners'),   href: '/hotel-partners' },
        { label: t('utuForBusiness'),  href: '/corporate' },
        { label: t('privacyPolicy'),   href: '/privacy' },
        { label: t('terms'),           href: '/terms' },
      ],
    },
    {
      heading: t('getApp'),
      links: [
        { label: t('appStore'),   href: '/#app-download' },
        { label: t('googlePlay'), href: '/#app-download' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-950 text-utu-text-muted"> {/* EXCEPTION: bg-gray-950 / border-gray-800 — intentional dark footer; not a page surface */}

      {/* Main grid */}
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-white font-bold text-xs tracking-widest mb-5">
                {col.heading}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-utu-text-muted text-center sm:text-start">
          <p>{t('copyright', { year })}</p>
          <p className="mt-0.5 text-start">{t('license')}</p>
        </div>

        {/* Social icons */}
        <div className="flex items-center gap-4 text-utu-text-muted">
          <a href="https://www.facebook.com/UTUBooking"          target="_blank" rel="noopener noreferrer" aria-label="Facebook"    className="hover:text-white transition-colors"><IconFacebook /></a>
          <a href="https://twitter.com/UTUBooking"               target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="hover:text-white transition-colors"><IconX /></a>
          <a href="https://www.instagram.com/utubooking"         target="_blank" rel="noopener noreferrer" aria-label="Instagram"   className="hover:text-white transition-colors"><IconInstagram /></a>
          <a href="https://www.linkedin.com/company/utubooking"  target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"    className="hover:text-white transition-colors"><IconLinkedIn /></a>
          <a href="https://www.youtube.com/@UTUBooking"          target="_blank" rel="noopener noreferrer" aria-label="YouTube"     className="hover:text-white transition-colors"><IconYouTube /></a>
        </div>
      </div>

    </footer>
  );
}
