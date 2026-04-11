'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComplianceStats,
  getErasureRequests,
  updateErasureRequest,
  getDataExports,
  type ComplianceStats,
  type ErasureRequest,
  type DataExportRequest,
  type ErasureStatus,
  type ComplianceLaw,
} from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: number | string; sub?: string; accent?: 'red' | 'amber' | 'green' | 'blue';
}) {
  const ring = accent === 'red'   ? 'border-red-400'
             : accent === 'amber' ? 'border-amber-400'
             : accent === 'green' ? 'border-green-400'
             : 'border-utu-border-default';
  const val  = accent === 'red'   ? 'text-red-600'
             : accent === 'amber' ? 'text-amber-600'
             : accent === 'green' ? 'text-green-600'
             : 'text-utu-text-primary';
  return (
    <div className={`rounded-utu-card bg-utu-bg-card border ${ring} p-4`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${val}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
};

const LAW_COLORS: Record<string, string> = {
  GDPR:   'bg-blue-100 text-blue-700',
  CCPA:   'bg-purple-100 text-purple-700',
  LGPD:   'bg-green-100 text-green-700',
  PIPEDA: 'bg-orange-100 text-orange-700',
  KVKK:   'bg-rose-100 text-rose-700',
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-stats'],
    queryFn:  () => getComplianceStats().then(r => (r as any).data as ComplianceStats),
  });

  if (isLoading) return <p className="text-sm text-utu-text-muted py-8 text-center">Loading compliance statistics...</p>;
  if (!data)     return <p className="text-sm text-red-500 py-8 text-center">Failed to load stats.</p>;

  const LAWS: ComplianceLaw[] = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];

  return (
    <div className="space-y-6">
      {/* SLA alert banner */}
      {data.overdue_erasures > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700 font-medium">
          {data.overdue_erasures} erasure request{data.overdue_erasures !== 1 ? 's' : ''} past the 30-day SLA — immediate DPO action required.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Pending Erasures"    value={data.pending_erasures}      accent={data.pending_erasures > 0 ? 'amber' : undefined} />
        <KpiCard label="In Progress"         value={data.in_progress_erasures}  accent={data.in_progress_erasures > 0 ? 'blue' : undefined} />
        <KpiCard label="Overdue (>30 days)"  value={data.overdue_erasures}      accent={data.overdue_erasures > 0 ? 'red' : undefined} />
        <KpiCard label="Completed (30d)"     value={data.completed_erasures_30d} accent="green" />
        <KpiCard label="Pending Exports"     value={data.pending_exports}       accent={data.pending_exports > 0 ? 'amber' : undefined} />
      </div>

      {/* By-law breakdown */}
      <div className="rounded-utu-card bg-utu-bg-card border border-utu-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-utu-border-default">
          <h3 className="text-sm font-semibold text-utu-text-primary">Breakdown by Regulation</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-utu-text-muted text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-start">Regulation</th>
              <th className="px-4 py-2 text-end">Pending Erasures</th>
              <th className="px-4 py-2 text-end">Pending Exports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {LAWS.map(law => {
              const row = data.by_law[law] ?? { pending_erasures: 0, pending_exports: 0 };
              return (
                <tr key={law}>
                  <td className="px-4 py-2.5">
                    <Badge label={law} color={LAW_COLORS[law] ?? 'bg-gray-100 text-gray-700'} />
                  </td>
                  <td className={`px-4 py-2.5 text-end font-medium ${row.pending_erasures > 0 ? 'text-amber-600' : 'text-utu-text-muted'}`}>
                    {row.pending_erasures}
                  </td>
                  <td className={`px-4 py-2.5 text-end font-medium ${row.pending_exports > 0 ? 'text-amber-600' : 'text-utu-text-muted'}`}>
                    {row.pending_exports}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Erasure Requests
// ─────────────────────────────────────────────────────────────────────────────

function ErasureTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [lawFilter,    setLawFilter]    = useState('');
  const [page,         setPage]         = useState(1);
  const [notesEditing, setNotesEditing] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-erasures', statusFilter, lawFilter, page],
    queryFn:  () => getErasureRequests({
      status: statusFilter || undefined,
      law:    lawFilter    || undefined,
      page,
      limit:  50,
    }).then(r => r as any),
  });

  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { status?: ErasureStatus; dpo_notes?: string; _shard: string } }) =>
      updateErasureRequest(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-erasures'] }),
  });

  const rows: ErasureRequest[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  function rowBg(row: ErasureRequest) {
    if (row.status !== 'pending') return '';
    const days = daysSince(row.requested_at);
    if (days > 30) return 'bg-red-50';
    if (days > 25) return 'bg-amber-50';
    return '';
  }

  function saveNotes(row: ErasureRequest) {
    const notes = notesEditing[row.id];
    if (notes === undefined || notes === (row.dpo_notes ?? '')) return;
    mutation.mutate({ id: row.id, updates: { dpo_notes: notes, _shard: row._shard } });
    setNotesEditing(prev => { const n = { ...prev }; delete n[row.id]; return n; });
  }

  const LAWS: ComplianceLaw[] = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={lawFilter}
          onChange={e => { setLawFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All Regulations</option>
          {LAWS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <span className="ms-auto text-xs text-utu-text-muted self-center">
          {total} request{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading erasure requests...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No erasure requests found.</p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-utu-bg-muted text-utu-text-muted text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-start">Email</th>
                <th className="px-3 py-2 text-start">Law</th>
                <th className="px-3 py-2 text-start">Requested</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">Shard</th>
                <th className="px-3 py-2 text-start">DPO Notes</th>
                <th className="px-3 py-2 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => {
                const days   = daysSince(row.requested_at);
                const bg     = rowBg(row);
                const isPending    = row.status === 'pending';
                const isInProgress = row.status === 'in_progress';
                const noteVal = notesEditing[row.id] !== undefined ? notesEditing[row.id] : (row.dpo_notes ?? '');

                return (
                  <tr key={`${row._shard}-${row.id}`} className={bg}>
                    <td className="px-3 py-2 font-mono text-xs max-w-[180px] truncate" title={row.email_snapshot}>
                      {row.email_snapshot}
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={row.law} color={LAW_COLORS[row.law] ?? 'bg-gray-100 text-gray-700'} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span>{fmtDate(row.requested_at)}</span>
                      {isPending && days > 25 && (
                        <span className={`ms-1.5 text-xs font-medium ${days > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                          ({days}d)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        label={row.status.replace('_', ' ')}
                        color={STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-utu-bg-muted px-1.5 py-0.5 text-xs font-mono text-utu-text-muted">
                        {row._shard}
                      </span>
                    </td>
                    <td className="px-3 py-2 min-w-[160px]">
                      <input
                        type="text"
                        value={noteVal}
                        placeholder="Add DPO notes..."
                        onChange={e => setNotesEditing(prev => ({ ...prev, [row.id]: e.target.value }))}
                        onBlur={() => saveNotes(row)}
                        className="w-full rounded border border-utu-border-default bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {isPending && (
                          <button
                            onClick={() => mutation.mutate({ id: row.id, updates: { status: 'in_progress', _shard: row._shard } })}
                            disabled={mutation.isPending}
                            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Start
                          </button>
                        )}
                        {(isPending || isInProgress) && (
                          <>
                            <button
                              onClick={() => mutation.mutate({ id: row.id, updates: { status: 'completed', _shard: row._shard } })}
                              disabled={mutation.isPending}
                              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => mutation.mutate({ id: row.id, updates: { status: 'rejected', _shard: row._shard } })}
                              disabled={mutation.isPending}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button
            disabled={rows.length < 50}
            onClick={() => setPage(p => p + 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Data Exports
// ─────────────────────────────────────────────────────────────────────────────

function ExportsTab() {
  const [lawFilter, setLawFilter] = useState('');
  const [page,      setPage]      = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-exports', lawFilter, page],
    queryFn:  () => getDataExports({
      law:   lawFilter || undefined,
      page,
      limit: 50,
    }).then(r => r as any),
  });

  const rows: DataExportRequest[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const LAWS: ComplianceLaw[] = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];

  function isDownloadable(row: DataExportRequest) {
    if (!row.download_url) return false;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return false;
    return true;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={lawFilter}
          onChange={e => { setLawFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All Regulations</option>
          {LAWS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <p className="ms-auto text-xs text-utu-text-muted">
          {total} export{total !== 1 ? 's' : ''} — read-only (auto-generated by auth service)
        </p>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading data exports...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No data export requests found.</p>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-utu-bg-muted text-utu-text-muted text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-start">User ID</th>
                <th className="px-3 py-2 text-start">Law</th>
                <th className="px-3 py-2 text-start">Type</th>
                <th className="px-3 py-2 text-start">Format</th>
                <th className="px-3 py-2 text-start">Requested</th>
                <th className="px-3 py-2 text-start">Generated</th>
                <th className="px-3 py-2 text-start">Download</th>
                <th className="px-3 py-2 text-start">Shard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => (
                <tr key={`${row._shard}-${row.id}`}>
                  <td className="px-3 py-2 font-mono text-xs max-w-[120px] truncate" title={row.user_id}>
                    {row.user_id.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-2">
                    <Badge label={row.law} color={LAW_COLORS[row.law] ?? 'bg-gray-100 text-gray-700'} />
                  </td>
                  <td className="px-3 py-2 capitalize text-utu-text-secondary">{row.export_type}</td>
                  <td className="px-3 py-2 uppercase text-xs text-utu-text-muted">{row.format}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-utu-text-secondary">{fmtDate(row.requested_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.generated_at ? (
                      <span className="text-green-600">{fmtDate(row.generated_at)}</span>
                    ) : (
                      <span className="text-amber-600 text-xs">Pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isDownloadable(row) ? (
                      <a
                        href={row.download_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-utu-blue hover:underline text-xs"
                      >
                        Download
                      </a>
                    ) : row.download_url && row.expires_at && new Date(row.expires_at) < new Date() ? (
                      <span className="text-xs text-red-500">Expired</span>
                    ) : (
                      <span className="text-xs text-utu-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-utu-bg-muted px-1.5 py-0.5 text-xs font-mono text-utu-text-muted">
                      {row._shard}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button
            disabled={rows.length < 50}
            onClick={() => setPage(p => p + 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Erasure Requests', 'Data Exports'] as const;
type Tab = typeof TABS[number];

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Data &amp; Privacy</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          GDPR, CCPA, LGPD, PIPEDA, KVKK — cross-shard DPO dashboard
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'Dashboard'        && <DashboardTab />}
        {activeTab === 'Erasure Requests' && <ErasureTab />}
        {activeTab === 'Data Exports'     && <ExportsTab />}
      </div>
    </div>
  );
}
