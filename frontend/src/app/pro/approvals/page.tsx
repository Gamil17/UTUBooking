'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  getPendingApprovals, approveBooking, rejectBooking,
  type CorporateBooking, type BookingType,
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

const POLICY_FLAG_LABELS: Record<string, string> = {
  FLIGHT_CLASS_EXCEEDED: 'Cabin class exceeds policy',
  HOTEL_STARS_EXCEEDED:  'Hotel stars exceed policy',
  ADVANCE_BOOKING:       'Short-notice booking',
};

function friendlyFlag(flag: string) {
  const code = flag.split(':')[0];
  return POLICY_FLAG_LABELS[code] ?? code.replace(/_/g, ' ').toLowerCase();
}

const TYPE_ICONS: Record<BookingType, string> = {
  flight: '✈', hotel: '🏨', car: '🚗', package: '📦',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProApprovalsPage() {
  const qc = useQueryClient();
  const [selected, setSelected]   = useState<CorporateBooking | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [actionError, setActionError]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['portal-approvals'],
    queryFn:  () => getPendingApprovals({ limit: 100 }),
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
  const bookings: CorporateBooking[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const approveMut = useMutation({
    mutationFn: approveBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-approvals'] });
      qc.invalidateQueries({ queryKey: ['portal-bookings'] });
      setSelected(null);
      setActionError('');
    },
    onError: (e: any) => setActionError(e?.message || 'Failed to approve. Please try again.'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-approvals'] });
      qc.invalidateQueries({ queryKey: ['portal-bookings'] });
      setSelected(null);
      setShowReject(false);
      setRejectReason('');
      setActionError('');
    },
    onError: (e: any) => setActionError(e?.message || 'Failed to reject. Please try again.'),
  });

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Approvals</h1>
        <p className="text-sm text-utu-text-muted mt-1">
          Review and approve out-of-policy travel requests before they are processed.
        </p>
      </div>

      {/* Empty state */}
      {!isLoading && bookings.length === 0 && (
        <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card p-12 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl" aria-hidden="true">&#10003;</span>
          </div>
          <p className="text-sm font-semibold text-utu-text-primary">All clear</p>
          <p className="text-sm text-utu-text-muted mt-1">No bookings are currently awaiting approval.</p>
          <Link href="/pro/bookings" className="mt-4 inline-block text-sm text-utu-blue hover:underline">
            View all bookings
          </Link>
        </div>
      )}

      {isLoading && (
        <div className="py-20 text-center text-sm text-utu-text-muted">Loading…</div>
      )}

      {/* Approval cards */}
      {bookings.length > 0 && (
        <>
          <p className="text-xs text-utu-text-muted">{total} request{total !== 1 ? 's' : ''} awaiting approval</p>
          <div className="space-y-4">
            {bookings.map(b => (
              <div key={b.id} className="bg-utu-bg-card rounded-xl border border-amber-200 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5 shrink-0" aria-hidden="true">{TYPE_ICONS[b.booking_type]}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-utu-text-primary">
                          {b.booking_type === 'flight'
                            ? `${b.origin ?? '?'} → ${b.destination}`
                            : b.destination}
                          {b.hotel_stars ? ` ${'★'.repeat(b.hotel_stars)}` : ''}
                        </p>
                        <p className="text-xs text-utu-text-muted mt-0.5">
                          For <span className="font-medium text-utu-text-secondary">{b.employee_name}</span>
                          {b.employee_dept ? ` · ${b.employee_dept}` : ''}
                          {b.purpose ? ` · ${b.purpose}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-utu-text-primary shrink-0">
                        {sarFmt(b.estimated_cost_sar)}
                      </span>
                    </div>

                    {/* Trip dates */}
                    <p className="text-xs text-utu-text-muted mt-2">
                      {b.booking_type === 'hotel' ? 'Check-in' : 'Depart'}: {fmtDate(b.depart_date)}
                      {b.return_date ? ` → ${fmtDate(b.return_date)}` : ''}
                      {b.flight_class && ` · ${b.flight_class.replace(/_/g, ' ')}`}
                    </p>

                    {/* Policy flags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(b.policy_flags ?? []).map(f => (
                        <span key={f} className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
                          <span aria-hidden="true">⚠</span>
                          {friendlyFlag(f)}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        disabled={approveMut.isPending}
                        onClick={() => { setActionError(''); approveMut.mutate(b.id); }}
                        className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition-colors"
                      >
                        {approveMut.isPending && approveMut.variables === b.id ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => { setSelected(b); setShowReject(true); setActionError(''); }}
                        className="rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-medium px-4 py-2 text-sm transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => { setSelected(b); setShowReject(false); }}
                        className="rounded-lg border border-utu-border-default px-3 py-2 text-xs text-utu-text-muted hover:bg-gray-50"
                      >
                        Details
                      </button>
                    </div>

                    {actionError && approveMut.variables === b.id && (
                      <p className="text-xs text-red-600 mt-2">{actionError}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail / reject slide panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setSelected(null); setShowReject(false); setRejectReason(''); }} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">
                {showReject ? 'Reject Booking' : 'Booking Details'}
              </h2>
              <button onClick={() => { setSelected(null); setShowReject(false); setRejectReason(''); }}
                className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
              {showReject ? (
                <div className="space-y-4">
                  <p className="text-utu-text-muted">
                    Rejecting this booking for <strong>{selected.employee_name}</strong> will cancel the request.
                    The employee will need to submit a new booking.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1">
                      Reason (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Policy violation, budget constraints…"
                      className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue resize-none"
                    />
                  </div>
                  {actionError && <p className="text-xs text-red-600">{actionError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowReject(false); setRejectReason(''); }}
                      className="flex-1 rounded-lg border border-utu-border-default px-4 py-2.5 text-sm text-utu-text-secondary hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      disabled={rejectMut.isPending}
                      onClick={() => rejectMut.mutate({ id: selected.id, reason: rejectReason })}
                      className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 text-sm transition-colors"
                    >
                      {rejectMut.isPending ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <DRow label="Employee">{selected.employee_name}</DRow>
                    <DRow label="Department">{selected.employee_dept ?? '—'}</DRow>
                    <DRow label="Type"><span className="capitalize">{selected.booking_type}</span></DRow>
                    {selected.booking_type === 'flight'
                      ? <DRow label="Route">{selected.origin ?? '?'} → {selected.destination}</DRow>
                      : <DRow label="Destination">{selected.destination}</DRow>}
                    <DRow label="Depart">{fmtDate(selected.depart_date)}</DRow>
                    {selected.return_date && <DRow label="Return">{fmtDate(selected.return_date)}</DRow>}
                    {selected.flight_class && (
                      <DRow label="Cabin"><span className="capitalize">{selected.flight_class.replace(/_/g,' ')}</span></DRow>
                    )}
                    {selected.hotel_stars && <DRow label="Stars">{'★'.repeat(selected.hotel_stars)}</DRow>}
                    <DRow label="Est. Cost">{sarFmt(selected.estimated_cost_sar)}</DRow>
                    {selected.purpose && <DRow label="Purpose">{selected.purpose}</DRow>}
                  </div>

                  {selected.policy_flags && selected.policy_flags.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold text-amber-800 mb-2">Policy Flags</p>
                      <ul className="space-y-1.5">
                        {selected.policy_flags.map(f => (
                          <li key={f} className="text-xs text-amber-700 flex items-start gap-1.5">
                            <span>⚠</span> {friendlyFlag(f)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      disabled={approveMut.isPending}
                      onClick={() => { setActionError(''); approveMut.mutate(selected.id); }}
                      className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 text-sm transition-colors"
                    >
                      {approveMut.isPending ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => { setShowReject(true); setActionError(''); }}
                      className="flex-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-medium px-4 py-2.5 text-sm transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                  {actionError && <p className="text-xs text-red-600">{actionError}</p>}
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
