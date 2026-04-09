'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getFunnelMetrics, type FunnelRow } from '@/lib/api';

const FUNNEL_STEPS = ['search', 'detail_view', 'booking_started', 'booking_completed'] as const;

export function ConversionFunnelWidget() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

  const PERIODS = [
    { value: '7d',  label: t('period7d')  },
    { value: '30d', label: t('period30d') },
  ] as const;

  const STEP_LABELS: Record<string, string> = {
    search:             t('stepSearch'),
    detail_view:        t('stepDetailView'),
    booking_started:    t('stepBookingStarted'),
    booking_completed:  t('stepBookingCompleted'),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['funnel', period],
    queryFn:  () => getFunnelMetrics(period),
    staleTime: 5 * 60 * 1000,
  });

  // Aggregate total counts per step and top 5 countries
  const stepTotals: Record<string, number> = {};
  const countryTotals: Record<string, number> = {};

  if (data) {
    for (const row of data.data as FunnelRow[]) {
      stepTotals[row.event_type] = (stepTotals[row.event_type] ?? 0) + row.count;
      if (row.event_type === 'search') {
        countryTotals[row.country] = (countryTotals[row.country] ?? 0) + row.count;
      }
    }
  }

  const topCountries = Object.entries(countryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxStep = Math.max(...FUNNEL_STEPS.map((s) => stepTotals[s] ?? 0), 1);

  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-utu-text-primary">{t('funnelTitle')}</h2>
        <div className="flex rounded-lg border border-utu-border-default overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors
                ${period === p.value
                  ? 'bg-utu-blue text-white'
                  : 'bg-utu-bg-card text-utu-text-muted hover:bg-utu-bg-muted'}`}
              style={{ minHeight: 44 }}
              aria-pressed={period === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>}
      {error    && <div className="py-8 text-center text-sm text-red-500">{t('funnelLoadError')}</div>}

      {data && (
        <div className="mt-5 space-y-4">
          {/* Funnel step bars */}
          {FUNNEL_STEPS.map((step) => {
            const count = stepTotals[step] ?? 0;
            const pct   = Math.round((count / maxStep) * 100);
            return (
              <div key={step}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-utu-text-primary">{STEP_LABELS[step]}</span>
                  <span className="text-utu-text-muted">{count.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-utu-bg-muted">
                  <div
                    className="h-3 rounded-full bg-utu-blue transition-all duration-500"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            );
          })}

          {/* Top countries */}
          {topCountries.length > 0 && (
            <div className="mt-5 border-t border-utu-border-default pt-4">
              <p className="mb-2 text-xs font-medium text-utu-text-muted">{t('topSearchCountries')}</p>
              <div className="flex flex-wrap gap-2">
                {topCountries.map(([country, count]) => (
                  <span
                    key={country}
                    className="rounded-full bg-utu-bg-muted px-3 py-1 text-xs text-utu-text-primary"
                  >
                    {country.toUpperCase()} · {count.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
