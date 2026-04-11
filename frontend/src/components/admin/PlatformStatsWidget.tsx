'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getAdminPlatformStats, type PlatformStats } from '@/lib/api';

function StatCard({
  label,
  value,
  href,
  alert,
}: {
  label: string;
  value: string | number | null;
  href?: string;
  alert?: boolean;
}) {
  const content = (
    <div className={`rounded-xl border p-5 shadow-sm transition-colors ${
      alert && Number(value) > 0
        ? 'border-amber-200 bg-amber-50'
        : 'border-utu-border-default bg-utu-bg-card'
    } ${href ? 'hover:border-utu-blue cursor-pointer' : ''}`}>
      <p className="text-sm font-medium text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${
        alert && Number(value) > 0 ? 'text-amber-700' : 'text-utu-text-primary'
      }`}>
        {value != null ? value.toLocaleString() : '—'}
      </p>
      {alert && Number(value) > 0 && (
        <p className="mt-1 text-xs text-amber-600">Action required</p>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function PlatformStatsWidget() {
  const { data, isLoading } = useQuery<PlatformStats>({
    queryKey: ['admin-platform-stats'],
    queryFn:  getAdminPlatformStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-utu-border-default bg-utu-bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Total Users"      value={data?.users    ?? null} href="/admin/users" />
      <StatCard label="Pending Approvals" value={data?.pending  ?? null} href="/admin/pending-users" alert />
      <StatCard label="Active Hotels"    value={data?.hotels   ?? null} href="/admin/inventory" />
      <StatCard label="Active Flights"   value={data?.flights  ?? null} href="/admin/inventory" />
      <StatCard label="Active Cars"      value={data?.cars     ?? null} href="/admin/inventory" />
      <StatCard
        label="Total Revenue (SAR)"
        value={data?.revenue != null ? `SAR ${Number(data.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : null}
      />
    </div>
  );
}
