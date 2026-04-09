'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getRevParMetrics, type RevParRow } from '@/lib/api';

const PERIODS = ['7d', '30d', '90d'] as const;
type Period = typeof PERIODS[number];

export function RevParWidget() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [period, setPeriod] = useState<Period>('30d');
  const [market, setMarket] = useState('all');

  const MARKETS = [
    { value: 'all', label: t('marketAll') },
    { value: 'MCM', label: t('marketMakkah') },
    { value: 'MED', label: t('marketMadinah') },
  ];

  const { data, isLoading, error } = useQuery({
    queryKey: ['revpar', market, period],
    queryFn:  () => getRevParMetrics(market, period),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-utu-text-primary">{t('revparTitle')}</h2>

        <div className="flex gap-2">
          {/* Market selector */}
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-600"
            aria-label="Select market"
          >
            {MARKETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Period tabs */}
          <div className="flex rounded-lg border border-utu-border-default overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors
                  ${period === p
                    ? 'bg-emerald-600 text-white'
                    : 'bg-utu-bg-card text-utu-text-muted hover:bg-utu-bg-muted'}`}
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
          <div className="py-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>
        )}
        {error && (
          <div className="py-8 text-center text-sm text-red-500">{t('revparLoadError')}</div>
        )}
        {data && data.data.length === 0 && (
          <div className="py-8 text-center text-sm text-utu-text-muted">{t('noDataPeriod')}</div>
        )}
        {data && data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-utu-border-default">
                <th className="pb-2 text-start text-xs font-medium text-utu-text-muted">{t('colMarket')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colHotels')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colBookings')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colAvgPrice')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colAvgRevenue')}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row: RevParRow) => (
                <tr key={row.market} className="border-b border-utu-border-default last:border-0">
                  <td className="py-3 font-medium text-utu-text-primary">
                    {row.market === 'MCM' ? '🕋 Makkah' :
                     row.market === 'MED' ? '🕌 Madinah' : row.market}
                  </td>
                  <td className="py-3 text-end text-utu-text-muted">{row.hotels}</td>
                  <td className="py-3 text-end text-utu-text-muted">{row.bookings.toLocaleString()}</td>
                  <td className="py-3 text-end font-medium text-utu-text-primary">
                    {Number(row.avg_effective_price).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 text-end font-semibold text-emerald-600">
                    {Number(row.avg_revenue).toLocaleString(undefined, { minimumFractionDigits: 0 })}
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
