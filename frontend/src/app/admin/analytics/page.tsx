'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getRevParMetrics, getFunnelMetrics } from '@/lib/api';

const PERIODS = ['today', 'week', 'month', 'year'] as const;
type Period = typeof PERIODS[number];

const PERIOD_API_MAP: Record<Period, string> = {
  today: '7d',
  week:  '7d',
  month: '30d',
  year:  '90d',
};

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor =
    trend === 'up' ? 'text-emerald-600' :
    trend === 'down' ? 'text-red-500' :
    'text-utu-text-muted';
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && (
        <p className={`mt-1 text-xs ${trendColor}`}>
          {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{sub}
        </p>
      )}
    </div>
  );
}

function BarRow({ label, value, max, color = 'bg-emerald-600' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-utu-text-primary">{label}</span>
        <span className="text-utu-text-muted">{value.toLocaleString()}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-utu-bg-muted">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [period, setPeriod] = useState<Period>('month');

  const apiPeriod = PERIOD_API_MAP[period];

  const { data: revpar, isLoading: revLoading } = useQuery({
    queryKey: ['revpar-analytics', apiPeriod],
    queryFn:  () => getRevParMetrics('all', apiPeriod),
    staleTime: 5 * 60 * 1000,
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['funnel-analytics', apiPeriod],
    queryFn:  () => getFunnelMetrics(apiPeriod as '7d' | '30d'),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = revLoading || funnelLoading;

  // Aggregate totals from revpar data
  type RevparRow = { bookings?: number; avg_revenue?: number; market?: string };
  type FunnelRow = { event_type?: string; count?: number; country?: string };

  const totalBookings = revpar?.data?.reduce((s: number, r: RevparRow) => s + (r.bookings ?? 0), 0) ?? 0;
  const totalRevenue  = revpar?.data?.reduce((s: number, r: RevparRow) => s + Number(r.avg_revenue ?? 0), 0) ?? 0;
  const avgValue      = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // Funnel search count = proxy for active users
  const searchCount   = funnel?.data?.filter((r: FunnelRow) => r.event_type === 'search')
    .reduce((s: number, r: FunnelRow) => s + (r.count ?? 0), 0) ?? 0;
  const completedCount = funnel?.data?.filter((r: FunnelRow) => r.event_type === 'booking_completed')
    .reduce((s: number, r: FunnelRow) => s + (r.count ?? 0), 0) ?? 0;
  const convRate = searchCount > 0 ? ((completedCount / searchCount) * 100).toFixed(1) : '0.0';

  // Market breakdown from revpar
  const makkahRow = revpar?.data?.find((r: RevparRow) => r.market === 'MCM');
  const madinahRow = revpar?.data?.find((r: RevparRow) => r.market === 'MED');
  const makkahBookings = makkahRow?.bookings ?? 0;
  const madinahBookings = madinahRow?.bookings ?? 0;
  const maxDest = Math.max(makkahBookings, madinahBookings, 1);

  // Country breakdown from funnel
  const countryMap: Record<string, number> = {};
  funnel?.data?.forEach((r: FunnelRow) => {
    if (r.event_type === 'search') {
      countryMap[r.country] = (countryMap[r.country] ?? 0) + r.count;
    }
  });
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCountry = topCountries[0]?.[1] ?? 1;

  const PERIOD_LABELS: Record<Period, string> = {
    today: t('periodToday'),
    week:  t('periodWeek'),
    month: t('periodMonth'),
    year:  t('periodYear'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">{t('analytics')}</h1>
          <p className="mt-1 text-sm text-utu-text-muted">{t('analyticsSubtitle')}</p>
        </div>
        {/* Period selector */}
        <div className="flex rounded-lg border border-utu-border-default overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium transition-colors
                ${period === p ? 'bg-emerald-600 text-white' : 'bg-utu-bg-card text-utu-text-muted hover:bg-utu-bg-muted'}`}
              style={{ minHeight: 40 }}
              aria-pressed={period === p}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-12 text-center text-sm text-utu-text-muted">
          {tCommon('loading')}
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('totalBookings')}
              value={totalBookings.toLocaleString()}
              trend="up"
              sub={t('vsLastPeriod')}
            />
            <StatCard
              label={t('totalRevenue')}
              value={`SAR ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
              trend="up"
              sub={t('vsLastPeriod')}
            />
            <StatCard
              label={t('avgBookingValue')}
              value={`SAR ${avgValue.toLocaleString()}`}
              trend="neutral"
            />
            <StatCard
              label={t('activeUsers')}
              value={searchCount.toLocaleString()}
              trend="up"
              sub={t('vsLastPeriod')}
            />
          </div>

          {/* Row 2 */}
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Top Destinations */}
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
              <h2 className="mb-5 text-base font-semibold text-utu-text-primary">{t('topDestinations')}</h2>
              <div className="space-y-4">
                <BarRow label={`🕋 ${t('destMakkah')}`}  value={makkahBookings} max={maxDest} color="bg-amber-400" />
                <BarRow label={`🕌 ${t('destMadinah')}`} value={madinahBookings} max={maxDest} color="bg-emerald-500" />
              </div>
            </div>

            {/* Bookings by Market */}
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
              <h2 className="mb-5 text-base font-semibold text-utu-text-primary">{t('bookingsByMarket')}</h2>
              {topCountries.length > 0 ? (
                <div className="space-y-4">
                  {topCountries.map(([country, count]) => (
                    <BarRow key={country} label={country.toUpperCase()} value={count} max={maxCountry} />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-utu-text-muted">{t('noAnalyticsData')}</p>
              )}
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-utu-text-primary">{t('conversionRate')}</h2>
                <p className="mt-1 text-sm text-utu-text-muted">{t('searchToBooking')}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-emerald-600">{convRate}%</p>
                <p className="text-xs text-utu-text-muted mt-1">
                  {completedCount.toLocaleString()} / {searchCount.toLocaleString()}
                </p>
              </div>
            </div>
            {/* Visual bar */}
            <div className="mt-4 h-3 w-full rounded-full bg-utu-bg-muted">
              <div
                className="h-3 rounded-full bg-emerald-600 transition-all duration-700"
                style={{ width: `${Math.min(parseFloat(convRate), 100)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
