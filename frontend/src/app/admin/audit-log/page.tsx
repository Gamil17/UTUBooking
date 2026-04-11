'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminAuditLog, type AuditLogEntry } from '@/lib/api';

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function ActionBadge({ action }: { action: string }) {
  const color =
    action.startsWith('approve') ? 'bg-green-100 text-green-700' :
    action.startsWith('reject')  ? 'bg-red-100 text-red-600'   :
    action.startsWith('remove')  ? 'bg-orange-100 text-orange-700' :
    action.startsWith('create')  ? 'bg-blue-100 text-blue-700' :
    'bg-utu-bg-subtle text-utu-text-secondary';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminAuditLogPage() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-audit-log', offset],
    queryFn:  () => getAdminAuditLog({ limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const entries: AuditLogEntry[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Audit Log</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Immutable record of all admin actions. Most recent first.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading...</div>}
        {isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load audit log.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Timestamp', 'Action', 'Admin', 'Target', 'Meta'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap font-mono">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={e.action} />
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">
                      {e.admin_name ?? '—'}
                      {e.admin_email && (
                        <div className="font-mono text-utu-text-muted">{e.admin_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">
                      {e.target_name ?? '—'}
                      {e.target_email && (
                        <div className="font-mono text-utu-text-muted">{e.target_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted font-mono max-w-xs truncate">
                      {e.meta ? JSON.stringify(e.meta) : '—'}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-utu-text-muted">
                      No audit log entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total.toLocaleString()} entries
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >Previous</button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
