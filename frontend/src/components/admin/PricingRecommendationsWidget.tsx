'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPricingRecommendations,
  acceptRecommendation,
  rejectRecommendation,
  type PricingRecommendation,
} from '@/lib/api';

const SEASON_COLORS: Record<string, string> = {
  hajj:       'bg-amber-100 text-amber-700',
  umrah_peak: 'bg-blue-100 text-blue-700',
  normal:     'bg-utu-bg-muted text-utu-text-secondary',
};

export function PricingRecommendationsWidget() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [rejectNote, setRejectNote]   = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const SEASON_BADGE: Record<string, { label: string; color: string }> = {
    hajj:       { label: t('seasonHajj'),       color: SEASON_COLORS.hajj },
    umrah_peak: { label: t('seasonUmrahPeak'),   color: SEASON_COLORS.umrah_peak },
    normal:     { label: t('seasonNormal'),      color: SEASON_COLORS.normal },
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['pricing-recs', 'pending'],
    queryFn:  () => getPricingRecommendations('pending'),
    staleTime: 60_000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptRecommendation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-recs'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectRecommendation(id, note),
    onSuccess: () => {
      setRejectingId(null);
      setRejectNote('');
      qc.invalidateQueries({ queryKey: ['pricing-recs'] });
    },
  });

  const recs: PricingRecommendation[] = data?.results ?? [];

  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-utu-text-primary">{t('pricingTitle')}</h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          {t('pendingCount', { n: data?.total ?? 0 })}
        </span>
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>}
      {error     && <div className="py-8 text-center text-sm text-red-500">{t('pricingLoadError')}</div>}
      {!isLoading && recs.length === 0 && (
        <div className="py-8 text-center text-sm text-utu-text-muted">{t('noPendingRecs')}</div>
      )}

      {recs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-utu-border-default">
                <th className="pb-2 text-start text-xs font-medium text-utu-text-muted">{t('colHotelId')}</th>
                <th className="pb-2 text-start text-xs font-medium text-utu-text-muted">{t('colSeason')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colBasePrice')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colAiRec')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colConfidence')}</th>
                <th className="pb-2 text-start text-xs font-medium text-utu-text-muted">{t('colReasoning')}</th>
                <th className="pb-2 text-end text-xs font-medium text-utu-text-muted">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((rec) => {
                const badge  = SEASON_BADGE[rec.season] ?? SEASON_BADGE.normal;
                const pctChg = ((rec.recommended_price - rec.base_price) / rec.base_price * 100).toFixed(1);
                const isUp   = rec.recommended_price > rec.base_price;

                return (
                  <tr key={rec.id} className="border-b border-utu-border-default last:border-0">
                    <td className="py-3 font-mono text-xs text-utu-text-primary">
                      {rec.hotel_id.slice(0, 12)}…
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 text-end text-utu-text-muted">
                      {Number(rec.base_price).toLocaleString()}
                    </td>
                    <td className="py-3 text-end font-semibold text-utu-text-primary">
                      {Number(rec.recommended_price).toLocaleString()}
                      <span className={`ms-1 text-xs ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUp ? '↑' : '↓'}{Math.abs(Number(pctChg))}%
                      </span>
                    </td>
                    <td className="py-3 text-end">
                      <span className="text-utu-text-primary">
                        {Math.round(rec.confidence_score * 100)}%
                      </span>
                      {/* Confidence bar */}
                      <div className="mt-1 h-1 w-16 rounded-full bg-utu-border-default ms-auto">
                        <div
                          className="h-1 rounded-full bg-emerald-600"
                          style={{ width: `${Math.round(rec.confidence_score * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 max-w-[200px] text-xs text-utu-text-muted">
                      {rec.reasoning}
                    </td>
                    <td className="py-3 text-end">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => acceptMutation.mutate(rec.id)}
                          disabled={acceptMutation.isPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white
                                     hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          style={{ minHeight: 44 }}
                          aria-label={`Accept pricing recommendation for hotel ${rec.hotel_id}`}
                        >
                          {t('accept')}
                        </button>
                        <button
                          onClick={() => setRejectingId(rec.id)}
                          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs font-medium
                                     text-utu-text-muted hover:bg-utu-bg-muted transition-colors"
                          style={{ minHeight: 44 }}
                          aria-label={`Reject pricing recommendation for hotel ${rec.hotel_id}`}
                        >
                          {t('reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={t('rejectTitle')}
        >
          <div className="w-full max-w-md rounded-2xl bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">{t('rejectTitle')}</h3>
            <p className="mt-1 text-sm text-utu-text-muted">{t('rejectDesc')}</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder={t('rejectPlaceholder')}
              rows={3}
              className="mt-3 w-full rounded-lg border border-utu-border-default p-3 text-sm text-utu-text-primary
                         focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
              aria-label="Rejection note"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setRejectingId(null); setRejectNote(''); }}
                className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted
                           hover:bg-utu-bg-muted transition-colors"
                style={{ minHeight: 44 }}
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectingId, note: rejectNote })}
                disabled={rejectMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white
                           hover:bg-red-600 disabled:opacity-50 transition-colors"
                style={{ minHeight: 44 }}
              >
                {rejectMutation.isPending ? t('rejecting') : t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
