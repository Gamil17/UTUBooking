'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getAdminUsers,
  suspendUser,
  unsuspendUser,
  type AdminUser,
} from '@/lib/api';

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [page, setPage]             = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [suspendingUser, setSuspendingUser]   = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason]     = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', debouncedSearch, status, page],
    queryFn:  () => getAdminUsers({ search: debouncedSearch || undefined, status: status || undefined, page }),
    staleTime: 30_000,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => suspendUser(id, reason),
    onSuccess: () => {
      setSuspendingUser(null);
      setSuspendReason('');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => unsuspendUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users: AdminUser[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">{t('users')}</h1>
        <p className="mt-1 text-sm text-utu-text-muted">{t('usersSubtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('userSearch')}
          className="w-72 rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">{t('filterAll')}</option>
          <option value="active">{t('filterActive')}</option>
          <option value="suspended">{t('filterSuspended')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && (
          <div className="p-10 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>
        )}
        {isError && (
          <div className="p-10 text-center text-sm text-red-500">{t('usersLoadError')}</div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {[
                    t('colEmail'), t('colName'), t('colCountry'),
                    t('colBookings'), t('colSpent'), t('colJoined'),
                    t('colLastSeen'), t('colStatus'), t('colActions'),
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-primary">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{u.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted uppercase">{u.country}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{u.booking_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">
                      {Number(u.total_spent).toLocaleString(undefined, { minimumFractionDigits: 0 })} SAR
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {formatDate(u.created_at) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {formatDate(u.last_seen_at) ?? t('never')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium
                        ${u.status === 'active'
                          ? 'bg-utu-bg-subtle text-utu-blue'
                          : 'bg-red-100 text-red-600'}`}
                      >
                        {u.status === 'active' ? t('statusActive') : t('statusSuspended')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.status === 'active' ? (
                        <button
                          onClick={() => setSuspendingUser(u)}
                          className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium
                                     text-red-500 hover:bg-red-50 transition-colors"
                          style={{ minHeight: 32 }}
                        >
                          {t('suspend')}
                        </button>
                      ) : (
                        <button
                          onClick={() => unsuspendMutation.mutate(u.id)}
                          disabled={unsuspendMutation.isPending}
                          className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium
                                     text-utu-blue hover:bg-utu-bg-subtle transition-colors disabled:opacity-40"
                          style={{ minHeight: 32 }}
                        >
                          {unsuspendMutation.isPending ? t('unsuspending') : t('unsuspend')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-utu-text-muted">
                      {t('noUsers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>
            {t('usersTotal', { n: data.total.toLocaleString() })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >
              {t('previous')}
            </button>
            <span className="flex items-center px-2">{t('page', { n: page })}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={users.length < 25}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {suspendingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={t('suspendTitle')}
        >
          <div className="w-full max-w-md rounded-2xl bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">{t('suspendTitle')}</h3>
            <p className="mt-1 text-sm text-utu-text-muted">{t('suspendDesc')}</p>
            <p className="mt-3 text-xs font-mono text-utu-text-secondary">{suspendingUser.email}</p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-utu-text-secondary">{t('suspendReason')}</span>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={t('suspendReasonPh')}
                rows={3}
                className="mt-1 w-full rounded-lg border border-utu-border-default p-3 text-sm text-utu-text-primary
                           focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setSuspendingUser(null); setSuspendReason(''); }}
                className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted
                           hover:bg-utu-bg-muted transition-colors"
                style={{ minHeight: 44 }}
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => suspendMutation.mutate({ id: suspendingUser.id, reason: suspendReason })}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white
                           hover:bg-red-600 disabled:opacity-40 transition-colors"
                style={{ minHeight: 44 }}
              >
                {suspendMutation.isPending ? t('suspending') : t('confirmSuspend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
