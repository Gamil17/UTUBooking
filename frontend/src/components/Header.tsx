'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import CountrySelector from './CountrySelector';
import CurrencySelector from './CurrencySelector';
import LocaleSwitcher from './LocaleSwitcher';

export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const tNav     = useTranslations('nav');

  const [isAuthed,     setIsAuthed]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const [prevPath, setPrevPath] = useState(pathname);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads sessionStorage (unavailable on SSR), must run after hydration
    setIsAuthed(!!sessionStorage.getItem('utu_access_token'));
  }, [pathname]);

  // Close mobile menu on route change — React docs "Adjusting state based on props or other state" pattern
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMobileOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, []);

  async function handleSignOut() {
    setDropdownOpen(false);
    setMobileOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('utu_access_token');
    router.push('/');
    setIsAuthed(false);
  }

  const NAV = [
    { label: tNav('flights'),    href: '/?tab=flights' },
    { label: tNav('hotels'),     href: '/?tab=hotels'  },
    { label: tNav('carRentals'), href: '/?tab=cars'    },
    { label: tNav('promoCodes'), href: '/promo-codes'   },
  ];

  return (
    <>
      <header className="bg-utu-navy text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow">
              <span className="text-utu-navy font-black text-sm">U</span>
            </div>
            <span className="font-black text-white text-base tracking-tight hidden sm:block">UTUBooking</span>
          </Link>

          <div className="hidden md:block w-px h-5 bg-utu-bg-card/20" />

          {/* UTUBooking Pro */}
          <Link
            href="/partners#business"
            className="hidden md:flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-medium shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-10-2h4v2h-4V5zm10 15H4V9h16v11z"/>
            </svg>
            UTUBooking Pro
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ms-2">
            {NAV.map((link) => {
              const active =
                link.href === pathname ||
                (link.href.startsWith('/?tab=') && pathname === '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
                    active
                      ? 'text-white font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-utu-bg-card/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1">

            {/* Country / Region */}
            <CountrySelector />

            {/* Divider */}
            <span className="hidden sm:block w-px h-4 bg-utu-bg-card/20" />

            {/* Currency */}
            <CurrencySelector />

            {/* Divider */}
            <span className="hidden sm:block w-px h-4 bg-utu-bg-card/20" />

            {/* Language */}
            <LocaleSwitcher />

            {/* Divider */}
            <span className="hidden lg:block w-px h-4 bg-utu-bg-card/20 mx-1" />

            <Link href="/contact" className="hidden lg:block text-xs font-medium text-white/80 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-utu-bg-card/10">
              {tNav('support')}
            </Link>

            {/* Desktop: My Trips dropdown / Login */}
            <div className="hidden md:block">
              {isAuthed ? (
                <div ref={dropdownRef} className="relative ms-1">
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 border border-white/40 hover:border-white text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-utu-bg-card/10"
                    aria-expanded={dropdownOpen}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>{tNav('myTrips')}</span>
                    <svg className="w-3 h-3 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 bg-utu-bg-card rounded-xl shadow-lg border border-utu-border-default py-1 z-50">
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
                      >
                        <svg className="w-4 h-4 text-utu-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        {tNav('myTrips')}
                      </Link>
                      <div className="h-px bg-utu-bg-muted mx-3 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        {tNav('signOut')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 border border-white/40 hover:border-white text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-utu-bg-card/10 ms-1"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{tNav('login')}</span>
                </Link>
              )}
            </div>

            {/* Mobile: hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden ms-1 p-2 rounded-lg hover:bg-utu-bg-card/10 transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-utu-navy border-t border-white/10 shadow-xl">
            <nav className="px-4 py-3 space-y-1">
              {NAV.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center px-3 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-utu-bg-card/10 rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="h-px bg-utu-bg-card/10 mx-4" />

            <div className="px-4 py-3 space-y-1">
              {isAuthed ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-utu-bg-card/10 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    {tNav('myTrips')}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-utu-bg-card/10 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    {tNav('signOut')}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-white bg-utu-bg-card/10 hover:bg-utu-bg-card/20 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {tNav('login')}
                </Link>
              )}

              <Link
                href="/contact"
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-utu-bg-card/10 rounded-xl transition-colors"
              >
                {tNav('support')}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
