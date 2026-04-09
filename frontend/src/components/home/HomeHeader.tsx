'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CountrySelector  from '@/components/CountrySelector';
import CurrencySelector from '@/components/CurrencySelector';
import LocaleSwitcher   from '@/components/LocaleSwitcher';

type Tab = 'hotels' | 'flights' | 'cars';

interface Props {
  tab:         Tab;
  onTabChange: (t: Tab) => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  );
}
function HotelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-7 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm6 14H6v-1a6 6 0 0 1 12 0v1z"/>
    </svg>
  );
}
function CarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5zm-2.5-3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

// ─── HomeHeader ───────────────────────────────────────────────────────────────

export default function HomeHeader({ tab, onTabChange }: Props) {
  const tNav   = useTranslations('nav');
  const router = useRouter();

  const [scrolled,     setScrolled]     = useState(false);
  const [isAuthed,     setIsAuthed]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 320); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads sessionStorage (SSR-unavailable), must run after hydration
    setIsAuthed(!!sessionStorage.getItem('utu_access_token'));
  }, []);

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
    try {
      await fetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(5000) });
    } catch {
      // Server unreachable — clear client-side token anyway so the user
      // is not stuck logged in locally; the refresh token will expire server-side.
    }
    sessionStorage.removeItem('utu_access_token');
    router.push('/');
    setIsAuthed(false);
  }

  const TABS = [
    { key: 'flights' as Tab, label: tNav('flights'),    Icon: PlaneIcon },
    { key: 'hotels'  as Tab, label: tNav('hotels'),     Icon: HotelIcon },
    { key: 'cars'    as Tab, label: tNav('carRentals'), Icon: CarIcon  },
  ];

  const scrollToSearch = () =>
    document.getElementById('search-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <header className="sticky top-0 z-40">

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className={`transition-colors duration-300 ${
          scrolled ? 'bg-emerald-950 shadow-lg' : 'bg-emerald-900/95 backdrop-blur-sm'
        }`}>
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow">
                <span className="text-emerald-900 font-black text-sm">U</span>
              </div>
              <span className="font-black text-white text-base tracking-tight hidden sm:block">UTUBooking</span>
            </Link>

            {/* Divider */}
            <div className="hidden md:block w-px h-5 bg-utu-bg-card/20" />

            {/* UTUBooking Pro link */}
            <Link
              href="/partners#business"
              className="hidden md:flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors text-sm font-medium shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-10-2h4v2h-4V5zm10 15H4V9h16v11z"/>
              </svg>
              <span className="leading-none">UTUBooking Pro</span>
              <span className="text-[10px] text-emerald-400 font-normal hidden lg:block">for Business Travel</span>
            </Link>

            {/* Primary nav tabs — visible when NOT scrolled on desktop */}
            {!scrolled && (
              <nav className="hidden md:flex items-center gap-1 ms-2">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { onTabChange(t.key); scrollToSearch(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tab === t.key
                        ? 'text-white border-b-2 border-amber-400 rounded-none pb-[calc(0.375rem+2px)]'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    <t.Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
                <Link
                  href="/promo-codes"
                  className="px-3 py-1.5 text-sm font-medium text-emerald-200 hover:text-white transition-colors"
                >
                  {tNav('promoCodes')}
                </Link>
              </nav>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side actions */}
            <div className="flex items-center gap-1 sm:gap-2">

              <CountrySelector />
              <span className="hidden sm:block w-px h-4 bg-utu-bg-card/20" />
              <CurrencySelector />
              <span className="hidden sm:block w-px h-4 bg-utu-bg-card/20" />
              <LocaleSwitcher />

              <div className="hidden lg:block w-px h-4 bg-utu-bg-card/20" />

              <Link
                href="/contact"
                className="hidden lg:block text-xs font-medium text-emerald-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-utu-bg-card/10"
              >
                {tNav('support')}
              </Link>

              {/* Desktop: My Trips dropdown or Login */}
              <div className="hidden md:block">
                {isAuthed ? (
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setDropdownOpen((o) => !o)}
                      className="flex items-center gap-1.5 border border-white/40 hover:border-white text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-utu-bg-card/10"
                      aria-expanded={dropdownOpen}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:block">{tNav('myTrips')}</span>
                      <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-44 bg-utu-bg-card rounded-xl shadow-lg border border-utu-border-default py-1 z-50">
                        <Link
                          href="/account"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-utu-text-secondary hover:bg-slate-50 transition-colors"
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
                    className="flex items-center gap-1.5 border border-white/40 hover:border-white text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-utu-bg-card/10"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">{tNav('login')}</span>
                  </Link>
                )}
              </div>

              {/* Mobile: hamburger */}
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="md:hidden p-2 rounded-lg hover:bg-utu-bg-card/10 transition-colors"
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
        </div>

        {/* ── Sticky pill tabs — appear after scrolling past hero ──────────── */}
        <div className={`transition-all duration-300 overflow-hidden ${
          scrolled ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        } bg-emerald-950/95 backdrop-blur-sm border-t border-white/10 shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 py-2 flex justify-center">
            <div className="inline-flex items-center bg-utu-bg-card/10 rounded-full p-1 gap-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { onTabChange(t.key); scrollToSearch(); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    tab === t.key
                      ? 'bg-utu-bg-card text-emerald-900 shadow'
                      : 'text-white/80 hover:text-white hover:bg-utu-bg-card/10'
                  }`}
                >
                  <t.Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-emerald-900 border-t border-white/10 shadow-xl">
            <nav className="px-4 py-3 space-y-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { onTabChange(t.key); scrollToSearch(); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-colors ${
                    tab === t.key
                      ? 'text-white bg-utu-bg-card/10'
                      : 'text-emerald-100 hover:text-white hover:bg-utu-bg-card/10'
                  }`}
                >
                  <t.Icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
              <Link
                href="/promo-codes"
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-3 py-3 text-sm font-medium text-emerald-100 hover:text-white hover:bg-utu-bg-card/10 rounded-xl transition-colors"
              >
                {tNav('promoCodes')}
              </Link>
            </nav>

            <div className="h-px bg-utu-bg-card/10 mx-4" />

            <div className="px-4 py-3 space-y-1">
              {isAuthed ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-emerald-100 hover:text-white hover:bg-utu-bg-card/10 rounded-xl transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
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
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-white bg-utu-bg-card/10 hover:bg-utu-bg-card/20 rounded-xl transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  {tNav('login')}
                </Link>
              )}

              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-emerald-200 hover:text-white hover:bg-utu-bg-card/10 rounded-xl transition-colors"
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
