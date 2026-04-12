'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  getBookings,
  type CorporateBooking, type BookingStatus, type BookingType,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sarFmt(n?: number | null) {
  if (!n) return '—';
  return `SAR ${Math.round(n).toLocaleString()}`;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending:   'bg-amber-100  text-amber-700',
  confirmed: 'bg-green-100  text-green-700',
  cancelled: 'bg-gray-100   text-gray-500',
  failed:    'bg-red-100    text-red-600',
};

const TYPE_ICONS: Record<BookingType, string> = {
  flight:  '✈',
  hotel:   '🏨',
  car:     '🚗',
  package: '📦',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProBookingsPage() {
  const [status, setStatus]       = useState('');
  const [bookType, setBookType]   = useState('');
  const [selected, setSelected]   = useState<CorporateBooking | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-bookings', status, bookType],
    queryFn: () => getBookings({
      status:       status   || undefined,
      booking_type: bookType || undefined,
      limit: 100,
    }),
    staleTime: 30_000,
  });
  const bookings: CorporateBooking[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-utu-text-primary">Bookings</h1>
          <p className="text-sm text-utu-text-muted mt-1">
            All travel bookings made through UTUBooking for Business.
          </p>
        </div>
        <Link
          href="/pro/book"
          className="rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          + Book Travel
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
        <select value={bookType} onChange={e => setBookType(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Types</option>
          <option value="flight">Flights</option>
          <option value="hotel">Hotels</option>
        </select>
        <span className="text-xs text-utu-text-muted">{total} bookings</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <p className="text-sm text-utu-text-muted">No bookings yet.</p>
          <Link href="/pro/book" className="text-sm text-utu-blue hover:underline">
            Book travel for an employee
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Trip', 'Employee', 'Dates', 'Cost', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">{TYPE_ICONS[b.booking_type]}</span>
                      <div>
                        <p className="font-medium text-utu-text-primary">
                          {b.booking_type === 'flight'
                            ? `${b.origin ?? '?'} → ${b.destination}`
                            : b.destination}
                        </p>
                        {b.booking_type === 'flight' && b.flight_class && (
                          <p className="text-xs text-utu-text-muted capitalize">{b.flight_class.replace(/_/g, ' ')}</p>
                        )}
                        {b.booking_type === 'hotel' && b.hotel_stars && (
                          <p className="text-xs text-utu-text-muted">{'★'.repeat(b.hotel_stars)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-utu-text-secondary">{b.employee_name}</p>
                    {b.employee_dept && <p className="text-xs text-utu-text-muted">{b.employee_dept}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    <p>{fmtDate(b.depart_date)}</p>
                    {b.return_date && <p>→ {fmtDate(b.return_date)}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">
                    {sarFmt(b.actual_cost_sar ?? b.estimated_cost_sar)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                        {b.status}
                      </span>
                      {b.requires_approval && b.status === 'pending' && (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Needs approval
                        </span>
                      )}
                      {!b.policy_compliant && (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                          Policy flag
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(b)}
                      className="rounded-lg border border-utu-border-default px-3 py-1 text-xs text-utu-text-muted hover:bg-gray-50">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">Booking Details</h2>
              <button onClick={() => setSelected(null)} className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <DRow label="Ref">{selected.id.slice(0, 8).toUpperCase()}</DRow>
                <DRow label="Status">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                    {selected.status}
                  </span>
                </DRow>
                <DRow label="Employee">{selected.employee_name}</DRow>
                <DRow label="Email">{selected.employee_email}</DRow>
                <DRow label="Type"><span className="capitalize">{selected.booking_type}</span></DRow>
                {selected.booking_type === 'flight' && (
                  <DRow label="Route">{selected.origin ?? '?'} → {selected.destination}</DRow>
                )}
                {selected.booking_type === 'hotel' && (
                  <DRow label="Hotel">{selected.destination}</DRow>
                )}
                <DRow label="Depart / Check-in">{fmtDate(selected.depart_date)}</DRow>
                {selected.return_date && <DRow label="Return">{fmtDate(selected.return_date)}</DRow>}
                {selected.flight_class && (
                  <DRow label="Cabin"><span className="capitalize">{selected.flight_class.replace(/_/g,' ')}</span></DRow>
                )}
                {selected.hotel_stars && <DRow label="Stars">{'★'.repeat(selected.hotel_stars)}</DRow>}
                <DRow label="Est. Cost">{sarFmt(selected.estimated_cost_sar)}</DRow>
                {selected.actual_cost_sar && <DRow label="Actual Cost">{sarFmt(selected.actual_cost_sar)}</DRow>}
                {selected.purpose && <DRow label="Purpose">{selected.purpose}</DRow>}
                {selected.booking_ref && <DRow label="Booking Ref">{selected.booking_ref}</DRow>}
              </div>

              {selected.policy_flags && selected.policy_flags.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2">Policy Flags</p>
                  <ul className="space-y-1">
                    {selected.policy_flags.map(f => (
                      <li key={f} className="text-xs text-amber-700">{f.split(':')[0].replace(/_/g,' ')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.approved_by && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-800">Approved by {selected.approved_by}</p>
                  {selected.approved_at && (
                    <p className="text-xs text-green-700">{fmtDate(selected.approved_at)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="font-medium text-utu-text-primary mt-0.5">{children}</p>
    </div>
  );
}
