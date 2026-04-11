'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminPendingUsers,
  approveUser,
  rejectUser,
  type PendingUser,
} from '@/lib/api';

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPendingUsersPage() {
  const qc = useQueryClient();
  const [offset, setOffset]           = useState(0);
  const [rejectingUser, setRejectingUser] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason]   = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-pending-users', offset],
    queryFn:  () => getAdminPendingUsers({ limit: PAGE_SIZE, offset }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveUser(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-pending-users'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectUser(id, reason || undefined),
    onSuccess:  () => {
      setRejectingUser(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['admin-pending-users'] });
    },
  });

  const users: PendingUser[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">Pending User Approvals</h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Review and approve or reject users awaiting verification.
          </p>
        </div>
        {data && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-amber-700">{data.total}</p>
            <p className="text-xs text-amber-600">Pending</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading...</div>}
        {isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load pending users.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Email', 'Name', 'Country', 'Registered', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-primary">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{u.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted uppercase">{u.country ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(u.id)}
                          disabled={approveMutation.isPending}
                          className="rounded border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium
                                     text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectingUser(u); setRejectReason(''); }}
                          className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium
                                     text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-utu-text-muted">
                      <p className="text-base font-medium">No pending approvals</p>
                      <p className="mt-1 text-xs">All users are verified.</p>
                    </td>
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

      {/* Reject modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Reject User</h3>
            <p className="mt-1 text-sm text-utu-text-muted">
              Rejecting <span className="font-mono text-xs text-utu-text-secondary">{rejectingUser.email}</span>.
              This will set their status to rejected.
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-utu-text-secondary">Reason (optional)</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-utu-border-default p-3 text-sm text-utu-text-primary
                           focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setRejectingUser(null); setRejectReason(''); }}
                className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted
                           hover:bg-utu-bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectingUser.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white
                           hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
