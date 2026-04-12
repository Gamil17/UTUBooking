'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '../layout';
import {
  getDashboardStats,
  type DashboardStats, type UpcomingTrip, type TopDestination, type ExpiringPassport,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sarFmt(n: number) {
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `SAR ${Math.round(n / 1_000)}K`;
  return `SAR ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const FLIGHT_CLASS_LABELS: Record<string, string> = {
  economy: 'Economy', premium_economy: 'Premium Economy',
  business: 'Business', first: 'First',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-utu-navy border-utu-navy' : 'bg-utu-bg-card border-utu-border-default'}`}>
      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${accent ? 'text-white/60' : 'text-utu-text-muted'}`}>{label}</p>
      <p className={`text-2xl font-bold leading-none ${accent ? 'text-white' : 'text-utu-text-primary'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/60' : 'text-utu-text-muted'}`}>{sub}</p>}
    </div>
  );
}

function SpendBar({ pct, monthSar, budgetSar }: { pct: number; monthSar: number; budgetSar: number }) {
  const clamped = Math.min(pct, 100);
  const color   = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-utu-text-muted uppercase tracking-wider">Spend this month</p>
          <p className="text-2xl font-bold text-utu-text-primary mt-0.5">{sarFmt(monthSar)}</p>
        </div>
        <p className="text-sm font-semibold text-utu-text-secondary">of {sarFmt(budgetSar)}</p>
      </div>
      <div className="h-2 rounded-full bg-utu-bg-subtle overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className={`text-xs mt-1.5 font-medium ${pct > 90 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-utu-text-muted'}`}>
        {pct}% of monthly budget used
      </p>
    </div>
  );
}

function AnnualBudgetBar({ ytdSar, annualSar }: { ytdSar: number; annualSar: number }) {
  if (!annualSar) return null;
  const pct     = Math.min(Math.round((ytdSar / annualSar) * 100), 100);
  const color   = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-utu-blue';
  const remaining = Math.max(annualSar - ytdSar, 0);
  return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-utu-text-muted uppercase tracking-wider">Annual budget consumed</p>
          <p className="text-2xl font-bold text-utu-text-primary mt-0.5">{sarFmt(ytdSar)}</p>
        </div>
        <div className="text-end">
          <p className="text-xs text-utu-text-muted">Budget: {sarFmt(annualSar)}</p>
          <p className="text-xs font-medium text-utu-text-secondary mt-0.5">
            {sarFmt(remaining)} remaining
          </p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-utu-bg-subtle overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs mt-1.5 font-medium ${pct > 90 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-utu-text-muted'}`}>
        {pct}% of annual budget used
        {pct > 90 && ' — approaching limit'}
      </p>
    </div>
  );
}

function UpcomingTripsCard({ trips }: { trips: UpcomingTrip[] }) {
  if (trips.length === 0) return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-3">Upcoming trips (7 days)</p>
      <p className="text-sm text-utu-text-muted text-center py-4">No trips in the next 7 days.</p>
    </div>
  );

  return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider">Upcoming trips (7 days)</p>
        <Link href="/pro/bookings" className="text-xs text-utu-blue hover:underline">View all</Link>
      </div>
      <div className="space-y-2.5">
        {trips.map(t => {
          const days = daysUntil(t.depart_date);
          return (
            <div key={t.id} className="flex items-center gap-3">
              <span className="text-lg shrink-0" aria-hidden="true">{t.booking_type === 'flight' ? '✈' : '🏨'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-utu-text-primary truncate">
                  {t.booking_type === 'flight' && t.origin ? `${t.origin} → ${t.destination}` : t.destination}
                  {t.flight_class ? ` · ${FLIGHT_CLASS_LABELS[t.flight_class] ?? t.flight_class}` : ''}
                </p>
                <p className="text-xs text-utu-text-muted truncate">
                  {t.employee_name}
                  {t.employee_dept ? ` · ${t.employee_dept}` : ''}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-xs font-semibold text-utu-text-primary">{fmtDate(t.depart_date)}</p>
                <p className="text-[10px] text-utu-text-muted">
                  {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`}
                </p>
                {t.approval_status === 'pending' && (
                  <span className="text-[10px] text-amber-600 font-medium">Pending approval</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopDestinationsCard({ destinations }: { destinations: TopDestination[] }) {
  if (destinations.length === 0) return null;
  const max = destinations[0].booking_count;

  return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-4">Top destinations (90 days)</p>
      <div className="space-y-3">
        {destinations.map(d => (
          <div key={d.destination}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-utu-text-primary">{d.destination}</p>
              <p className="text-xs text-utu-text-muted">{d.booking_count} trip{d.booking_count !== 1 ? 's' : ''} · {sarFmt(d.total_spend_sar)}</p>
            </div>
            <div className="h-1.5 rounded-full bg-utu-bg-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-utu-blue"
                style={{ width: `${Math.round((d.booking_count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpiringPassportsCard({ employees }: { employees: ExpiringPassport[] }) {
  if (employees.length === 0) return null;
  return (
    <div className="bg-utu-bg-card rounded-xl border border-red-200 p-5">
      <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-3">
        Passport Expiry Warning ({employees.length})
      </p>
      <div className="space-y-2">
        {employees.map(e => {
          const days = daysUntil(e.passport_expiry);
          return (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-utu-text-primary">{e.name}</p>
                {e.department && <p className="text-xs text-utu-text-muted">{e.department}</p>}
              </div>
              <p className={`text-xs font-semibold ${days < 0 ? 'text-red-600' : days < 60 ? 'text-red-500' : 'text-amber-600'}`}>
                {days < 0 ? 'Expired' : `${fmtDate(e.passport_expiry)} (${days}d)`}
              </p>
            </div>
          );
        })}
      </div>
      <Link href="/pro/employees" className="mt-3 inline-block text-xs text-utu-blue hover:underline">
        Update employee passports
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProDashboardPage() {
  const { claims } = usePortalAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-dashboard-stats'],
    queryFn:  getDashboardStats,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const stats: DashboardStats | null = (data as any)?.data ?? null;

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-utu-navy rounded-2xl px-8 py-10 text-white">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">UTUBooking for Business</p>
          <h1 className="text-2xl font-bold">Loading dashboard…</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error fallback (static welcome) ────────────────────────────────────────

  if (!stats || error) {
    return (
      <div className="space-y-8">
        <div className="bg-utu-navy rounded-2xl px-8 py-10 text-white">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">UTUBooking for Business</p>
          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-white/70 text-sm">Signed in as <span className="text-white font-medium">{claims.email}</span></p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: '/pro/employees',  label: 'Employee Directory' },
            { href: '/pro/book',       label: 'Book Travel' },
            { href: '/pro/groups',     label: 'Group Travel' },
            { href: '/pro/bookings',   label: 'All Bookings' },
            { href: '/pro/approvals',  label: 'Approvals' },
            { href: '/pro/reports',    label: 'Spend Reports' },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5 font-medium text-utu-text-primary hover:border-utu-blue transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { budget, spend, pending_approvals, policy_compliance_pct, upcoming_trips, top_destinations, expiring_passports } = stats;

  // ── Full dashboard ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Welcome bar */}
      <div className="bg-utu-navy rounded-2xl px-8 py-7 text-white flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-1">UTUBooking for Business</p>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-white/60 text-sm mt-0.5">{claims.email}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/pro/book"
            className="rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium px-4 py-2 text-sm transition-colors">
            + Book Travel
          </Link>
          <Link href="/pro/groups"
            className="rounded-xl bg-amber-400 hover:bg-amber-300 text-utu-navy font-semibold px-4 py-2 text-sm transition-colors">
            + Group Trip
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Spend this month"
          value={sarFmt(spend.this_month_sar)}
          sub={`Last month: ${sarFmt(spend.last_month_sar)}`}
          accent
        />
        <KpiCard
          label="YTD spend"
          value={sarFmt(spend.this_year_sar)}
          sub={`Annual budget: ${sarFmt(budget.annual_sar)}`}
        />
        <Link href="/pro/approvals" className="block">
          <KpiCard
            label="Pending approvals"
            value={String(pending_approvals)}
            sub={pending_approvals > 0 ? 'Action required' : 'All clear'}
          />
        </Link>
        <KpiCard
          label="Policy compliance"
          value={`${policy_compliance_pct}%`}
          sub="This quarter"
        />
      </div>

      {/* Spend progress bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpendBar
          pct={spend.month_pct_of_budget}
          monthSar={spend.this_month_sar}
          budgetSar={budget.monthly_sar}
        />
        <AnnualBudgetBar
          ytdSar={spend.this_year_sar}
          annualSar={budget.annual_sar}
        />
      </div>

      {/* Middle row: upcoming trips + passport warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingTripsCard trips={upcoming_trips} />
        <div className="space-y-4">
          {expiring_passports.length > 0 && (
            <ExpiringPassportsCard employees={expiring_passports} />
          )}
          {expiring_passports.length === 0 && top_destinations.length > 0 && (
            <TopDestinationsCard destinations={top_destinations} />
          )}
        </div>
      </div>

      {/* Top destinations (if no passport warning, it's above) */}
      {expiring_passports.length > 0 && top_destinations.length > 0 && (
        <TopDestinationsCard destinations={top_destinations} />
      )}

      {/* Quick-links footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/pro/employees', label: 'Employees' },
          { href: '/pro/bookings',  label: 'All Bookings' },
          { href: '/pro/reports',   label: 'Reports' },
          { href: '/pro/settings',  label: 'Settings' },
        ].map(l => (
          <Link key={l.href} href={l.href}
            className="bg-utu-bg-card rounded-xl border border-utu-border-default p-4 text-sm font-medium text-utu-text-secondary hover:text-utu-blue hover:border-utu-blue transition-colors text-center">
            {l.label}
          </Link>
        ))}
      </div>

    </div>
  );
}
