'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFunnelMetrics, type FunnelRow } from '@/lib/api';

const PERIODS = [
  { value: '7d',  label: '7 days'  },
  { value: '30d', label: '30 days' },
] as const;

const FUNNEL_STEPS = ['search', 'detail_view', 'booking_started', 'booking_completed'] as const;
const STEP_LABELS: Record<string, string> = {
  search:             'Search',
  detail_view:        'Detail View',
  booking_started:    'Booking Started',
  booking_completed:  'Booking Completed',
};

export function ConversionFunnelWidget() {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

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
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#111827]">Conversion Funnel</h2>
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors
                ${period === p.value
                  ? 'bg-[#10B981] text-white'
                  : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'}`}
              style={{ minHeight: 44 }}
              aria-pressed={period === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-[#6B7280]">Loading...</div>}
      {error    && <div className="py-8 text-center text-sm text-red-500">Failed to load funnel data</div>}

      {data && (
        <div className="mt-5 space-y-4">
          {/* Funnel step bars */}
          {FUNNEL_STEPS.map((step) => {
            const count = stepTotals[step] ?? 0;
            const pct   = Math.round((count / maxStep) * 100);
            return (
              <div key={step}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-[#111827]">{STEP_LABELS[step]}</span>
                  <span className="text-[#6B7280]">{count.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#F9FAFB]">
                  <div
                    className="h-3 rounded-full bg-[#10B981] transition-all duration-500"
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
            <div className="mt-5 border-t border-[#E5E7EB] pt-4">
              <p className="mb-2 text-xs font-medium text-[#6B7280]">Top Search Countries</p>
              <div className="flex flex-wrap gap-2">
                {topCountries.map(([country, count]) => (
                  <span
                    key={country}
                    className="rounded-full bg-[#F9FAFB] px-3 py-1 text-xs text-[#111827]"
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
