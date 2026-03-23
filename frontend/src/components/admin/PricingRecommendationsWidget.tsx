'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPricingRecommendations,
  acceptRecommendation,
  rejectRecommendation,
  type PricingRecommendation,
} from '@/lib/api';

const SEASON_BADGE: Record<string, { label: string; color: string }> = {
  hajj:       { label: 'Hajj',       color: 'bg-amber-100 text-amber-700' },
  umrah_peak: { label: 'Umrah Peak', color: 'bg-blue-100 text-blue-700'   },
  normal:     { label: 'Normal',     color: 'bg-gray-100 text-gray-600'   },
};

export function PricingRecommendationsWidget() {
  const qc = useQueryClient();
  const [rejectNote, setRejectNote]   = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#111827]">AI Pricing Recommendations</h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          {data?.total ?? 0} pending
        </span>
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-[#6B7280]">Loading...</div>}
      {error     && <div className="py-8 text-center text-sm text-red-500">Failed to load recommendations</div>}
      {!isLoading && recs.length === 0 && (
        <div className="py-8 text-center text-sm text-[#6B7280]">No pending recommendations</div>
      )}

      {recs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="pb-2 text-start text-xs font-medium text-[#6B7280]">Hotel ID</th>
                <th className="pb-2 text-start text-xs font-medium text-[#6B7280]">Season</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Base (SAR)</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">AI Rec (SAR)</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Confidence</th>
                <th className="pb-2 text-start text-xs font-medium text-[#6B7280]">Reasoning</th>
                <th className="pb-2 text-end text-xs font-medium text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((rec) => {
                const badge  = SEASON_BADGE[rec.season] ?? SEASON_BADGE.normal;
                const pctChg = ((rec.recommended_price - rec.base_price) / rec.base_price * 100).toFixed(1);
                const isUp   = rec.recommended_price > rec.base_price;

                return (
                  <tr key={rec.id} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="py-3 font-mono text-xs text-[#111827]">
                      {rec.hotel_id.slice(0, 12)}…
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 text-end text-[#6B7280]">
                      {Number(rec.base_price).toLocaleString()}
                    </td>
                    <td className="py-3 text-end font-semibold text-[#111827]">
                      {Number(rec.recommended_price).toLocaleString()}
                      <span className={`ms-1 text-xs ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUp ? '↑' : '↓'}{Math.abs(Number(pctChg))}%
                      </span>
                    </td>
                    <td className="py-3 text-end">
                      <span className="text-[#111827]">
                        {Math.round(rec.confidence_score * 100)}%
                      </span>
                      {/* Confidence bar */}
                      <div className="mt-1 h-1 w-16 rounded-full bg-[#E5E7EB] ms-auto">
                        <div
                          className="h-1 rounded-full bg-[#10B981]"
                          style={{ width: `${Math.round(rec.confidence_score * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 max-w-[200px] text-xs text-[#6B7280]">
                      {rec.reasoning}
                    </td>
                    <td className="py-3 text-end">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => acceptMutation.mutate(rec.id)}
                          disabled={acceptMutation.isPending}
                          className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-medium text-white
                                     hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          style={{ minHeight: 44 }}
                          aria-label={`Accept pricing recommendation for hotel ${rec.hotel_id}`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => setRejectingId(rec.id)}
                          className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium
                                     text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                          style={{ minHeight: 44 }}
                          aria-label={`Reject pricing recommendation for hotel ${rec.hotel_id}`}
                        >
                          Reject
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
          aria-label="Reject recommendation"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#111827]">Reject Recommendation</h3>
            <p className="mt-1 text-sm text-[#6B7280]">Optionally explain why you're rejecting this recommendation.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Price too aggressive for low season…"
              rows={3}
              className="mt-3 w-full rounded-lg border border-[#E5E7EB] p-3 text-sm text-[#111827]
                         focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
              aria-label="Rejection note"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setRejectingId(null); setRejectNote(''); }}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#6B7280]
                           hover:bg-[#F9FAFB] transition-colors"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectingId, note: rejectNote })}
                disabled={rejectMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white
                           hover:bg-red-600 disabled:opacity-50 transition-colors"
                style={{ minHeight: 44 }}
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
