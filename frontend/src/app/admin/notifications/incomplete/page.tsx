'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

function relativeTime(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IncompleteBookingsPage() {
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
      setFeedback((f) => ({ ...f, [bookingId]: 'Queued' }));
      setTimeout(() => setFeedback((f) => { const c = { ...f }; delete c[bookingId]; return c; }), 3000);
      qc.invalidateQueries({ queryKey: ['incomplete-bookings'] });
    },
    onError: (_, bookingId) => {
      setFeedback((f) => ({ ...f, [bookingId]: 'Error' }));
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
      <h1 className="text-2xl font-bold text-[#111827]">Incomplete Bookings</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard label="Total Pending"    value={stats?.total_pending   ?? '—'} />
        <AdminStatCard label="Recovery Active"  value={stats?.recovery_active ?? '—'} />
        <AdminStatCard label="Suppressed"       value={stats?.suppressed      ?? '—'} />
        <AdminStatCard label="Recovered Today"  value={stats?.recovered_today ?? '—'} trend="up" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-sm text-[#6B7280]">Loading…</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-red-500">Failed to load bookings.</div>
        )}
        {data && (
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Booking</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Check-in</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Price</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Emails</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Last sent</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((row) => (
                <tr key={row.booking_id} className="hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#111827]">{row.name_en || '—'}</p>
                    <p className="text-xs text-[#6B7280]">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-[#111827]">{row.reference_no}</p>
                    <p className="text-xs text-[#6B7280] capitalize">{row.product_type}</p>
                  </td>
                  <td className="px-4 py-3 text-[#374151]">{formatDate(row.check_in)}</td>
                  <td className="px-4 py-3 text-[#374151]">
                    {row.currency} {Number(row.total_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${row.email_count >= MAX_RECOVERY ? 'text-[#6B7280]' : 'text-[#111827]'}`}>
                      {row.email_count}/{MAX_RECOVERY}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{relativeTime(row.last_sent_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {row.suppressed ? (
                        <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-xs font-medium text-red-600">
                          Suppressed
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => triggerMutation.mutate(row.booking_id)}
                            disabled={triggerMutation.isPending || row.email_count >= MAX_RECOVERY}
                            className="rounded bg-[#10B981] px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                          >
                            {feedback[row.booking_id] ?? 'Send Now'}
                          </button>
                          <button
                            onClick={() => suppressMutation.mutate(row)}
                            disabled={suppressMutation.isPending}
                            className="rounded border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40"
                          >
                            Suppress
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">
                    No incomplete bookings found.
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
            className="rounded border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="flex items-center px-3 text-sm text-[#6B7280]">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#F3F4F6]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
