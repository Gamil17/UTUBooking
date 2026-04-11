'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminBookingStats,
  getAdminBookings,
  updateAdminBookingStatus,
  type AdminBooking,
  type BookingStats,
} from '@/lib/api';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'cancelled', 'refunded'];
const TYPE_OPTIONS   = ['', 'hotel', 'flight', 'car'];

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  refunded:  'bg-purple-100 text-purple-700',
};

const TYPE_ICONS: Record<string, string> = {
  hotel:  '🏨',
  flight: '✈️',
  car:    '🚗',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

export default function AdminBookingsPage() {
  const qc = useQueryClient();

  const [search,       setSearch]       = useState('');
  const [debSearch,    setDebSearch]    = useState('');
  const [status,       setStatus]       = useState('');
  const [productType,  setProductType]  = useState('');
  const [offset,       setOffset]       = useState(0);
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; current: string } | null>(null);
  const [newStatus,    setNewStatus]    = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebSearch(val); setOffset(0); }, 350);
  }

  const { data: stats } = useQuery<BookingStats>({
    queryKey: ['admin-booking-stats'],
    queryFn:  getAdminBookingStats,
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-bookings', debSearch, status, productType, offset],
    queryFn:  () => getAdminBookings({
      search:       debSearch       || undefined,
      status:       status          || undefined,
      product_type: productType     || undefined,
      limit:        PAGE_SIZE,
      offset,
    }),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => updateAdminBookingStatus(id, s),
    onSuccess:  () => {
      setPendingStatus(null);
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-booking-stats'] });
    },
  });

  const bookings: AdminBooking[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Bookings</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          All platform bookings — search, filter, and update status.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total"     value={stats.total} />
          <StatCard label="Pending"   value={stats.pending} />
          <StatCard label="Confirmed" value={stats.confirmed} />
          <StatCard label="Cancelled" value={stats.cancelled} />
          <StatCard
            label="Confirmed Revenue"
            value={`SAR ${Number(stats.confirmed_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub={`Hotels ${stats.hotels} · Flights ${stats.flights} · Cars ${stats.cars}`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search reference, email, name…"
          className="w-64 rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <select
          value={productType}
          onChange={(e) => { setProductType(e.target.value); setOffset(0); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t || 'All types'}</option>
          ))}
        </select>
        {data && (
          <span className="flex items-center text-sm text-utu-text-muted">
            {data.total.toLocaleString()} bookings
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>}
        {isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load bookings.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Reference', 'Type', 'User', 'Amount', 'Status', 'Booked', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-utu-bg-muted cursor-pointer"
                    onClick={() => setDetailId(detailId === b.id ? null : b.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-utu-text-primary">{b.reference_no}</td>
                    <td className="px-4 py-3 text-sm">
                      <span title={b.product_type}>{TYPE_ICONS[b.product_type]} {b.product_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-utu-text-secondary">{b.user_email ?? '—'}</div>
                      {b.user_name && <div className="text-xs text-utu-text-muted">{b.user_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary whitespace-nowrap">
                      {Number(b.total_price).toLocaleString(undefined, { maximumFractionDigits: 0 })} {b.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-utu-bg-muted text-utu-text-muted'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">{formatDate(b.created_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setPendingStatus({ id: b.id, current: b.status }); setNewStatus(b.status); }}
                        className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-text-secondary
                                   hover:bg-utu-bg-muted transition-colors"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-utu-text-muted">No bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Status update modal */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Update Booking Status</h3>
            <p className="mt-1 text-sm text-utu-text-muted">
              Current: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pendingStatus.current]}`}>
                {pendingStatus.current}
              </span>
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-utu-text-secondary">New status</span>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                           text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              >
                {['pending', 'confirmed', 'cancelled', 'refunded'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setPendingStatus(null)}
                className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => statusMutation.mutate({ id: pendingStatus.id, s: newStatus })}
                disabled={newStatus === pendingStatus.current || statusMutation.isPending}
                className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white
                           hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {statusMutation.isPending ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
