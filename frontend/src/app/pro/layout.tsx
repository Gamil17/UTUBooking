'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getPortalClaims, clearPortalToken, type PortalClaims } from '@/lib/portal-auth';
import { getPendingApprovals } from '@/lib/portal-api';

// ── Context ───────────────────────────────────────────────────────────────────

interface PortalAuthCtx {
  claims:     PortalClaims;
  signOut:    () => void;
}

const PortalAuthContext = createContext<PortalAuthCtx | null>(null);

export function usePortalAuth(): PortalAuthCtx {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used inside <ProLayout>');
  return ctx;
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_STATIC = [
  { href: '/pro/dashboard',  label: 'Dashboard'    },
  { href: '/pro/employees',  label: 'Employees'    },
  { href: '/pro/book',       label: 'Book Travel'  },
  { href: '/pro/groups',     label: 'Group Travel' },
  { href: '/pro/bookings',   label: 'Bookings'     },
  { href: '/pro/approvals',  label: 'Approvals'    },
  { href: '/pro/reports',    label: 'Reports'      },
  { href: '/pro/invoices',   label: 'Invoices'     },
  { href: '/pro/settings',   label: 'Settings'     },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [claims, setClaims] = useState<PortalClaims | null>(null);

  const { data: approvalData } = useQuery({
    queryKey: ['portal-approvals'],
    queryFn:  () => getPendingApprovals({ limit: 1 }),
    enabled:  !!claims && pathname !== '/pro',
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const pendingCount: number = (approvalData as any)?.total ?? 0;

  useEffect(() => {
    // /pro (login page itself) does not need auth guard
    if (pathname === '/pro') return;

    const c = getPortalClaims();
    if (!c) {
      router.replace('/pro');
      return;
    }
    setClaims(c);

    // Refresh check every 60 s — redirect if token has expired
    const timer = setInterval(() => {
      const current = getPortalClaims();
      if (!current) {
        clearPortalToken();
        router.replace('/pro');
      }
    }, 60_000);

    return () => clearInterval(timer);
  }, [pathname, router]);

  // On the login page itself, render children directly (no shell)
  if (pathname === '/pro') return <>{children}</>;

  // Show nothing while verifying (avoids flash)
  if (!claims) return null;

  function signOut() {
    clearPortalToken();
    router.replace('/pro');
  }

  return (
    <PortalAuthContext.Provider value={{ claims, signOut }}>
      <div className="min-h-screen bg-utu-bg-page flex flex-col">

        {/* Top bar */}
        <header className="bg-utu-navy px-6 py-3 flex items-center gap-4">
          <Link href="/pro/dashboard" className="flex items-center gap-2 me-6">
            <span className="text-white font-black text-base tracking-tight">UTUBooking</span>
            <span className="text-amber-300 text-xs font-bold uppercase tracking-widest">for Business</span>
          </Link>

          <nav className="flex items-center gap-1 flex-1">
            {NAV_STATIC.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(n.href)
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {n.label}
                {n.href === '/pro/approvals' && pendingCount > 0 && (
                  <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-utu-navy text-[10px] font-bold">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/60 text-xs hidden sm:block">{claims.email}</span>
            <button onClick={signOut} className="text-white/70 hover:text-white text-xs transition-colors">
              Sign Out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>

      </div>
    </PortalAuthContext.Provider>
  );
}
