'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getEmailLog, type EmailLogRow } from '@/lib/api';


const TYPE_COLORS: Record<string, string> = {
  abandoned_booking_recovery: 'bg-amber-100 text-amber-700',
  check_in_reminder:          'bg-blue-100  text-blue-700',
  price_change_alert:         'bg-purple-100 text-purple-700',
  monthly_deal_digest:        'bg-emerald-100 text-emerald-700',
};

const STATUS_COLORS: Record<string, string> = {
  queued:    'bg-utu-bg-muted   text-utu-text-secondary',
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
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  const EMAIL_TYPES = [
    { value: '',                           label: t('typeAll') },
    { value: 'abandoned_booking_recovery', label: t('typeAbandonedBooking') },
    { value: 'check_in_reminder',          label: t('typeCheckInReminder') },
    { value: 'price_change_alert',         label: t('typePriceAlert') },
    { value: 'monthly_deal_digest',        label: t('typeCampaign') },
  ];

  const DELIVERY_STATUSES = [
    { value: '',          label: t('statusAll') },
    { value: 'queued',    label: t('statusQueued') },
    { value: 'sent',      label: t('statusSent') },
    { value: 'delivered', label: t('statusDelivered') },
    { value: 'opened',    label: t('statusOpened') },
    { value: 'bounced',   label: t('statusBounced') },
    { value: 'failed',    label: t('statusFailed') },
  ];

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
      <h1 className="text-2xl font-bold text-utu-text-primary">{t('emailLog')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={emailType}
          onChange={handleFilterChange(setEmailType)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-secondary focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {EMAIL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={deliveryStatus}
          onChange={handleFilterChange(setDeliveryStatus)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-secondary focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {DELIVERY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder={t('bookingRefPlaceholder')}
          value={bookingRef}
          onChange={handleFilterChange(setBookingRef)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-secondary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-red-500">{t('failLoadEmailLog')}</div>
        )}
        {data && (
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colRecipient')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colType')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colBookingRef')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colSentAt')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colStatus')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colLocale')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((row: EmailLogRow) => (
                <tr key={row.id} className="hover:bg-utu-bg-muted">
                  <td className="px-4 py-3 font-mono text-xs text-utu-text-secondary">
                    {truncateEmail(row.recipient_email)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[row.email_type] ?? 'bg-utu-bg-muted text-utu-text-secondary'}`}>
                      {row.email_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-utu-text-muted">
                    {row.booking_ref ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    {formatSentAt(row.sent_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.delivery_status] ?? 'bg-utu-bg-muted text-utu-text-secondary'}`}>
                      {row.delivery_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted uppercase">{row.locale}</td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-utu-text-muted">
                    {t('noEmailsMatch')}
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
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
          >
            {t('previous')}
          </button>
          <span className="flex items-center px-3 text-sm text-utu-text-muted">{t('page', { n: page })}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.data.length < 50}
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  );
}
