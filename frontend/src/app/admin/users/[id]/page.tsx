'use client';

import Link from 'next/link';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  getAdminUserProfile,
  initiateRefund,
  saveAdminNotes,
  sendEmailToUser,
  suspendUser,
  unsuspendUser,
  type AdminUserProfile,
  type CustomerBooking,
  type CustomerEnquiry,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const BOOKING_STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-600',
  refunded:  'bg-gray-100 text-gray-500',
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid:     'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  failed:   'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-500',
};

const ENQUIRY_STATUS_BADGE: Record<string, string> = {
  new:     'bg-blue-100 text-blue-700',
  read:    'bg-amber-100 text-amber-700',
  replied: 'bg-emerald-100 text-emerald-700',
};

const TIER_BADGE: Record<string, string> = {
  bronze:   'bg-amber-100 text-amber-700',
  silver:   'bg-gray-200 text-gray-600',
  gold:     'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

const PRODUCT_ICON: Record<string, string> = { hotel: '🏨', flight: '✈️', car: '🚗' };
const TOPIC_LABEL: Record<string, string> = {
  flights: 'Flights', hotels: 'Hotels', hajj: 'Hajj', cars: 'Cars',
  payments: 'Payments', tech: 'Technical', visa: 'Visa', privacy: 'Privacy', other: 'Other',
};

// ─── Refund modal (inline for a specific booking's payment) ───────────────────

function RefundModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking:   CustomerBooking;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason]       = useState<'requested_by_customer' | 'fraudulent' | 'duplicate'>('requested_by_customer');
  const [partial, setPartial]     = useState(false);
  const [partialAmt, setPartialAmt] = useState('');
  const [error, setError]         = useState('');

  const mutation = useMutation({
    mutationFn: () => initiateRefund(booking.payment_id!, {
      reason,
      amount: partial && partialAmt ? parseFloat(partialAmt) : undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError:   (e: unknown) => setError(e instanceof Error ? e.message : 'Refund failed'),
  });

  const isStripe  = booking.payment_method === 'stripe';
  const maxAmount = Number(booking.payment_amount ?? booking.total_price);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-utu-bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold text-utu-text-primary">Issue Refund</h3>
        <p className="mt-1 text-sm text-utu-text-muted">
          Booking <span className="font-mono text-xs">{booking.reference_no}</span>
        </p>

        {!isStripe && booking.payment_method && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Gateway <strong>{booking.payment_method}</strong> requires manual refund via its dashboard.
            Confirming here marks UTUBooking records only.
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-utu-text-secondary">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              <option value="requested_by_customer">Requested by customer</option>
              <option value="duplicate">Duplicate payment</option>
              <option value="fraudulent">Fraudulent</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-utu-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
              className="h-4 w-4 rounded accent-utu-blue"
            />
            Partial refund
          </label>

          {partial && (
            <label className="block">
              <span className="text-sm font-medium text-utu-text-secondary">
                Amount ({booking.payment_currency ?? booking.currency}) — max {maxAmount.toLocaleString()}
              </span>
              <input
                type="number"
                min={0.01}
                max={maxAmount}
                step={0.01}
                value={partialAmt}
                onChange={(e) => setPartialAmt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </label>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <p className="mt-4 text-sm font-semibold text-utu-text-primary">
          Refund: {booking.payment_currency ?? booking.currency}{' '}
          {(partial && partialAmt ? parseFloat(partialAmt) : maxAmount).toLocaleString()}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted">
            Cancel
          </button>
          <button
            onClick={() => { setError(''); mutation.mutate(); }}
            disabled={mutation.isPending || (partial && (!partialAmt || parseFloat(partialAmt) <= 0))}
            className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {mutation.isPending ? 'Processing…' : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send Email modal ─────────────────────────────────────────────────────────

function SendEmailModal({
  user,
  onClose,
}: {
  user:    { email: string; name: string | null };
  onClose: () => void;
}) {
  const [subject,  setSubject]  = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState('');

  const mutation = useMutation({
    mutationFn: () => sendEmailToUser({
      email:    user.email,
      name:     user.name ?? user.email,
      subject:  subject.trim(),
      bodyHtml: `<p style="font-family:sans-serif;font-size:14px;line-height:1.6;">${bodyText.trim().replace(/\n/g, '<br/>')}</p>`,
    }),
    onSuccess: () => setSent(true),
    onError:   (e: unknown) => setError(e instanceof Error ? e.message : 'Send failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-utu-bg-card p-6 shadow-xl">
        {sent ? (
          <>
            <p className="text-base font-semibold text-emerald-700">Email sent successfully.</p>
            <p className="mt-1 text-sm text-utu-text-muted">To: {user.email}</p>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-utu-text-primary">Send Email</h3>
            <p className="mt-0.5 text-sm text-utu-text-muted">To: <span className="font-mono text-xs">{user.email}</span></p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-utu-text-secondary">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your booking confirmation — UTUBooking"
                  className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-utu-text-secondary">Message</span>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  placeholder="Dear pilgrim, we're writing to confirm…"
                  className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-utu-blue"
                />
              </label>
            </div>

            {error && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted">
                Cancel
              </button>
              <button
                onClick={() => { setError(''); mutation.mutate(); }}
                disabled={mutation.isPending || !subject.trim() || !bodyText.trim()}
                className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {mutation.isPending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
      <div className="border-b border-utu-border-default bg-utu-bg-muted px-5 py-3">
        <h2 className="text-sm font-semibold text-utu-text-primary">{title}</h2>
      </div>
      <div className="divide-y divide-utu-border-default">{children}</div>
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return (
    <p className="px-5 py-6 text-center text-sm text-utu-text-muted">{msg}</p>
  );
}

function BookingsSection({
  bookings,
  onRefund,
}: {
  bookings:  CustomerBooking[];
  onRefund:  (b: CustomerBooking) => void;
}) {
  if (!bookings.length) return <EmptyRow msg="No bookings yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
            <th className="px-4 py-2 text-start">Ref</th>
            <th className="px-4 py-2 text-start">Type</th>
            <th className="px-4 py-2 text-start">Status</th>
            <th className="px-4 py-2 text-start">Payment</th>
            <th className="px-4 py-2 text-end">Amount</th>
            <th className="px-4 py-2 text-start">Date</th>
            <th className="px-4 py-2 text-start">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-utu-border-default">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-utu-bg-muted/40">
              <td className="px-4 py-2.5 font-mono text-xs text-utu-text-secondary">{b.reference_no}</td>
              <td className="px-4 py-2.5 text-sm">
                {PRODUCT_ICON[b.product_type] ?? ''} {b.product_type}
              </td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BOOKING_STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {b.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {b.payment_status ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_BADGE[b.payment_status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {b.payment_method} · {b.payment_status}
                  </span>
                ) : (
                  <span className="text-xs text-utu-text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-end font-semibold tabular-nums text-utu-text-primary">
                {b.currency} {Number(b.total_price).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-xs text-utu-text-muted whitespace-nowrap">{fmt(b.created_at)}</td>
              <td className="px-4 py-2.5">
                {b.payment_status === 'paid' && b.payment_id ? (
                  <button
                    onClick={() => onRefund(b)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Refund
                  </button>
                ) : b.refunded_at ? (
                  <span className="text-xs text-utu-text-muted">
                    Refunded {fmt(b.refunded_at)}
                    {b.refund_amount != null && ` · ${b.currency} ${Number(b.refund_amount).toLocaleString()}`}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnquiriesSection({ enquiries }: { enquiries: CustomerEnquiry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!enquiries.length) return <EmptyRow msg="No support enquiries." />;
  return (
    <>
      {enquiries.map((e) => (
        <div key={e.id} className="px-5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-utu-text-secondary">
                {TOPIC_LABEL[e.topic] ?? e.topic}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ENQUIRY_STATUS_BADGE[e.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {e.status}
              </span>
              {e.booking_ref && (
                <span className="text-xs font-mono text-utu-text-muted">ref: {e.booking_ref}</span>
              )}
            </div>
            <span className="shrink-0 text-xs text-utu-text-muted">{fmtDt(e.created_at)}</span>
          </div>
          <button
            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
            className="mt-1 text-left text-xs text-utu-text-secondary hover:text-utu-text-primary line-clamp-2"
          >
            {e.message}
          </button>
          {expanded === e.id && (
            <div className="mt-2 rounded-lg bg-utu-bg-muted px-3 py-2 text-xs text-utu-text-secondary whitespace-pre-wrap">
              {e.message}
              {e.admin_notes && (
                <p className="mt-2 border-t border-utu-border-default pt-2 text-utu-text-muted">
                  <strong>Admin notes:</strong> {e.admin_notes}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const qc      = useQueryClient();
  const [refundBooking, setRefundBooking] = useState<CustomerBooking | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendOpen,   setSuspendOpen]   = useState(false);
  const [emailOpen,     setEmailOpen]     = useState(false);
  const [notes,         setNotes]         = useState<string>('');
  const [notesSaved,    setNotesSaved]    = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-user-profile', id],
    queryFn:  () => getAdminUserProfile(id),
    staleTime: 30_000,
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendUser(id, suspendReason),
    onSuccess:  () => { setSuspendOpen(false); qc.invalidateQueries({ queryKey: ['admin-user-profile', id] }); },
  });

  const unsuspendMutation = useMutation({
    mutationFn: () => unsuspendUser(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-user-profile', id] }),
  });

  const notesMutation = useMutation({
    mutationFn: () => saveAdminNotes(id, notes),
    onSuccess:  () => { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 3000); },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-utu-bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        Failed to load customer profile.{' '}
        <Link href="/admin/users" className="text-utu-blue hover:underline">Back to users</Link>
      </div>
    );
  }

  const { user, bookings, loyalty, enquiries } = data.data as AdminUserProfile;

  // Pre-fill notes textarea once on first load (don't overwrite while user is typing)
  if (notes === '' && user.admin_notes) {
    setNotes(user.admin_notes);
  }

  const totalSpent = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const openEnquiries = enquiries.filter((e) => e.status === 'new').length;

  return (
    <div className="space-y-6">

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-utu-blue hover:underline">
        ← All customers
      </Link>

      {/* ── Customer header card ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-utu-text-primary">{user.name ?? user.email}</h1>
            <p className="mt-0.5 text-sm font-mono text-utu-text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-utu-border-default px-2.5 py-0.5 text-xs font-medium uppercase text-utu-text-muted">
                {user.country}
              </span>
              <span className="rounded-full border border-utu-border-default px-2.5 py-0.5 text-xs font-medium text-utu-text-muted">
                {user.preferred_lang?.toUpperCase() ?? 'EN'} · {user.preferred_currency ?? 'SAR'}
              </span>
              {loyalty && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_BADGE[loyalty.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                  {loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {user.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEmailOpen(true)}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm font-medium text-utu-blue hover:bg-utu-bg-subtle transition-colors"
            >
              Send Email
            </button>
            {user.status === 'active' ? (
              <button
                onClick={() => setSuspendOpen(true)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Suspend
              </button>
            ) : (
              <button
                onClick={() => unsuspendMutation.mutate()}
                disabled={unsuspendMutation.isPending}
                className="rounded-lg border border-utu-border-default px-4 py-2 text-sm font-medium text-utu-blue hover:bg-utu-bg-subtle disabled:opacity-40"
              >
                {unsuspendMutation.isPending ? 'Unsuspending…' : 'Unsuspend'}
              </button>
            )}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Bookings',         value: bookings.length.toLocaleString() },
            { label: 'Confirmed spend',  value: `SAR ${totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            { label: 'Loyalty points',   value: loyalty ? loyalty.points.toLocaleString() : '—' },
            { label: 'Open enquiries',   value: openEnquiries.toString(), alert: openEnquiries > 0 },
          ].map(({ label, value, alert }) => (
            <div key={label} className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-4 py-3">
              <p className="text-xs text-utu-text-muted">{label}</p>
              <p className={`mt-0.5 text-lg font-bold ${alert ? 'text-amber-600' : 'text-utu-text-primary'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Meta row ─────────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-utu-text-muted">
          <span>Joined {fmt(user.created_at)}</span>
          <span>Last seen {user.last_seen_at ? fmt(user.last_seen_at) : 'never'}</span>
          {loyalty && <span>Lifetime points {loyalty.lifetime_points.toLocaleString()}</span>}
        </div>
      </div>

      {/* ── Bookings ─────────────────────────────────────────────────────── */}
      <SectionCard title={`Bookings (${bookings.length})`}>
        <BookingsSection bookings={bookings} onRefund={setRefundBooking} />
      </SectionCard>

      {/* ── Support Enquiries ─────────────────────────────────────────────── */}
      <SectionCard title={`Support Enquiries (${enquiries.length})`}>
        <EnquiriesSection enquiries={enquiries} />
      </SectionCard>

      {/* ── Agent Notes ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
        <div className="border-b border-utu-border-default bg-utu-bg-muted px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-utu-text-primary">Agent Notes</h2>
          {user.admin_notes_updated_at && (
            <span className="text-xs text-utu-text-muted">
              Last saved {fmtDt(user.admin_notes_updated_at)}
            </span>
          )}
        </div>
        <div className="p-5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Internal notes visible only to the support team — e.g. customer called about refund on booking HTL-2025-001, agreed to process within 3 days…"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
          <div className="mt-3 flex items-center justify-between">
            {notesSaved ? (
              <span className="text-xs font-medium text-emerald-600">Notes saved.</span>
            ) : (
              <span className="text-xs text-utu-text-muted">Not shared with the customer.</span>
            )}
            <button
              onClick={() => notesMutation.mutate()}
              disabled={notesMutation.isPending}
              className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {notesMutation.isPending ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Refund modal ─────────────────────────────────────────────────── */}
      {refundBooking && (
        <RefundModal
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-user-profile', id] })}
        />
      )}

      {/* ── Send email modal ─────────────────────────────────────────────── */}
      {emailOpen && (
        <SendEmailModal
          user={{ email: user.email, name: user.name }}
          onClose={() => setEmailOpen(false)}
        />
      )}

      {/* ── Suspend modal ────────────────────────────────────────────────── */}
      {suspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Suspend Account</h3>
            <p className="mt-1 text-sm text-utu-text-muted">{user.email}</p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-utu-text-secondary">Reason (required)</span>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-utu-border-default p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setSuspendOpen(false)} className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted">
                Cancel
              </button>
              <button
                onClick={() => suspendMutation.mutate()}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
              >
                {suspendMutation.isPending ? 'Suspending…' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
