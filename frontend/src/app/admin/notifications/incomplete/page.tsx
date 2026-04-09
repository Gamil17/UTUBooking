'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import {
  getIncompleteBookings,
  triggerRecoveryEmail,
  suppressBooking,
  type IncompleteBookingRow,
} from '@/lib/api';

const MAX_RECOVERY = 7;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type TFn = (key: string, values?: Record<string, string | number>) => string;

function relativeTime(iso: string | null, t: TFn) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return t('justNow');
  if (h < 24) return t('hoursAgo', { h });
  return t('daysAgo', { d: Math.floor(h / 24) });
}

export default function IncompleteBookingsPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['incomplete-bookings', page],
    queryFn: () => getIncompleteBookings(page, 20),
  });

  const triggerMutation = useMutation({
    mutationFn: (bookingId: string) => triggerRecoveryEmail(bookingId),
    onSuccess: (_, bookingId) => {
      setFeedback((f) => ({ ...f, [bookingId]: t('feedbackQueued') }));
      setTimeout(() => setFeedback((f) => { const c = { ...f }; delete c[bookingId]; return c; }), 3000);
      qc.invalidateQueries({ queryKey: ['incomplete-bookings'] });
    },
    onError: (_, bookingId) => {
      setFeedback((f) => ({ ...f, [bookingId]: t('feedbackError') }));
    },
  });

  const suppressMutation = useMutation({
    mutationFn: (row: IncompleteBookingRow) =>
      suppressBooking(row.user_id, row.booking_id, 'manual'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomplete-bookings'] }),
  });

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-utu-text-primary">{t('incompleteBookings')}</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard label={t('statTotalPending')}    value={stats?.total_pending   ?? '—'} />
        <AdminStatCard label={t('statRecoveryActive')}  value={stats?.recovery_active ?? '—'} />
        <AdminStatCard label={t('statSuppressed')}      value={stats?.suppressed      ?? '—'} />
        <AdminStatCard label={t('statRecoveredToday')}  value={stats?.recovered_today ?? '—'} trend="up" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-red-500">{t('failLoadBookings')}</div>
        )}
        {data && (
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colCustomer')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colBookingRef')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colCheckIn')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colPrice')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colEmails')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colLastSent')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((row) => (
                <tr key={row.booking_id} className="hover:bg-utu-bg-muted">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{row.name_en || '—'}</p>
                    <p className="text-xs text-utu-text-muted">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-utu-text-primary">{row.reference_no}</p>
                    <p className="text-xs text-utu-text-muted capitalize">{row.product_type}</p>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{formatDate(row.check_in)}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">
                    {row.currency} {Number(row.total_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${row.email_count >= MAX_RECOVERY ? 'text-utu-text-muted' : 'text-utu-text-primary'}`}>
                      {row.email_count}/{MAX_RECOVERY}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-muted">{relativeTime(row.last_sent_at, t)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {row.suppressed ? (
                        <span className="rounded-full bg-utu-error-bg px-2 py-0.5 text-xs font-medium text-red-600">
                          {t('suppressed')}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => triggerMutation.mutate(row.booking_id)}
                            disabled={triggerMutation.isPending || row.email_count >= MAX_RECOVERY}
                            className="rounded bg-utu-blue px-3 py-1 text-xs font-medium text-white hover:bg-utu-blue disabled:opacity-40"
                          >
                            {feedback[row.booking_id] ?? t('sendNow')}
                          </button>
                          <button
                            onClick={() => suppressMutation.mutate(row)}
                            disabled={suppressMutation.isPending}
                            className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
                          >
                            {t('suppress')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-utu-text-muted">
                    {t('noIncompleteBookings')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.data.length === 20 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
          >
            {t('previous')}
          </button>
          <span className="flex items-center px-3 text-sm text-utu-text-muted">{t('page', { n: page })}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  );
}
