'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEmailLog, type EmailLogRow } from '@/lib/api';

const EMAIL_TYPES = [
  { value: '',                           label: 'All types' },
  { value: 'abandoned_booking_recovery', label: 'Abandoned booking' },
  { value: 'check_in_reminder',          label: 'Check-in reminder' },
  { value: 'price_change_alert',         label: 'Price alert' },
  { value: 'monthly_deal_digest',        label: 'Campaign' },
];

const DELIVERY_STATUSES = [
  { value: '',          label: 'All statuses' },
  { value: 'queued',    label: 'Queued' },
  { value: 'sent',      label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'opened',    label: 'Opened' },
  { value: 'bounced',   label: 'Bounced' },
  { value: 'failed',    label: 'Failed' },
];

const TYPE_COLORS: Record<string, string> = {
  abandoned_booking_recovery: 'bg-amber-100 text-amber-700',
  check_in_reminder:          'bg-blue-100  text-blue-700',
  price_change_alert:         'bg-purple-100 text-purple-700',
  monthly_deal_digest:        'bg-emerald-100 text-emerald-700',
};

const STATUS_COLORS: Record<string, string> = {
  queued:    'bg-gray-100   text-gray-600',
  sent:      'bg-blue-100   text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  opened:    'bg-green-100  text-green-700',
  bounced:   'bg-red-100    text-red-700',
  failed:    'bg-red-100    text-red-700',
};

function formatSentAt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncateEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 4) return email;
  return `${local.slice(0, 3)}…@${domain}`;
}

export default function EmailLogPage() {
  const [page, setPage] = useState(1);
  const [emailType,      setEmailType]      = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [bookingRef,     setBookingRef]     = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['email-log', page, emailType, deliveryStatus, bookingRef],
    queryFn: () => getEmailLog({ emailType, deliveryStatus, bookingRef }, page, 50),
  });

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setter(e.target.value as T);
      setPage(1);
    };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#111827]">Email Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={emailType}
          onChange={handleFilterChange(setEmailType)}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        >
          {EMAIL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={deliveryStatus}
          onChange={handleFilterChange(setDeliveryStatus)}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        >
          {DELIVERY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Booking ref…"
          value={bookingRef}
          onChange={handleFilterChange(setBookingRef)}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-sm text-[#6B7280]">Loading…</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-red-500">Failed to load email log.</div>
        )}
        {data && (
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Recipient</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Type</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Booking ref</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Sent at</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Locale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((row: EmailLogRow) => (
                <tr key={row.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3 font-mono text-xs text-[#374151]">
                    {truncateEmail(row.recipient_email)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[row.email_type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.email_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                    {row.booking_ref ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280]">
                    {formatSentAt(row.sent_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.delivery_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.delivery_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280] uppercase">{row.locale}</td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                    No emails match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && (
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
            disabled={data.data.length < 50}
            className="rounded border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
