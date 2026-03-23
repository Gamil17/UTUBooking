'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRevParMetrics, type RevParRow } from '@/lib/api';

const PERIODS = ['7d', '30d', '90d'] as const;
type Period = typeof PERIODS[number];

const MARKETS = [
  { value: 'all', label: 'All Markets' },
  { value: 'MCM', label: 'Makkah (MCM)' },
  { value: 'MED', label: 'Madinah (MED)' },
] as const;

export function RevParWidget() {
  const [period, setPeriod] = useState<Period>('30d');
  const [market, setMarket] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['revpar', market, period],
    queryFn:  () => getRevParMetrics(market, period),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#111827]">RevPAR by Market</h2>

        <div className="flex gap-2">
          {/* Market selector */}
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            aria-label="Select market"
          >
            {MARKETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Period tabs */}
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors
                  ${period === p
                    ? 'bg-[#10B981] text-white'
                    : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'}`}
                style={{ minHeight: 44 }}
                aria-pressed={period === p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {isLoading && (
          <div className="py-8 text-center text-sm text-[#6B7280]">Loading...</div>
        )}
        {error && (
          <div className="py-8 text-center text-sm text-red-500">Failed to load RevPAR data</div>
        )}
        {data && data.data.length === 0 && (
          <div className="py-8 text-center text-sm text-[#6B7280]">No data for selected period</div>
        )}
        {data && data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="pb-2 text-start text-xs font-medium text-[#6B7280]">Market</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Hotels</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Bookings</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Avg Price (SAR)</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Avg Revenue (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row: RevParRow) => (
                <tr key={row.market} className="border-b border-[#E5E7EB] last:border-0">
                  <td className="py-3 font-medium text-[#111827]">
                    {row.market === 'MCM' ? '🕋 Makkah' :
                     row.market === 'MED' ? '🕌 Madinah' : row.market}
                  </td>
                  <td className="py-3 text-end text-[#6B7280]">{row.hotels}</td>
                  <td className="py-3 text-end text-[#6B7280]">{row.bookings.toLocaleString()}</td>
                  <td className="py-3 text-end font-medium text-[#111827]">
                    {Number(row.avg_effective_price).toLocaleString('en-SA', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 text-end font-semibold text-[#10B981]">
                    {Number(row.avg_revenue).toLocaleString('en-SA', { minimumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
