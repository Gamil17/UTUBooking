'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWfTaskInbox, getWfTaskStats, wfDecide, getWfRecommendation,
  type WfTaskInboxRow, type WfTaskStats, type WfDecision, type WfSlaHealth,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(iso: string | null | undefined) {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffH  = Math.round(diffMs / 3_600_000);
  if (diffH < 0)  return `${Math.abs(diffH)}h overdue`;
  if (diffH < 1)  return 'due < 1h';
  if (diffH < 24) return `due in ${diffH}h`;
  return `due in ${Math.round(diffH / 24)}d`;
}

const SLA_COLORS: Record<WfSlaHealth | string, string> = {
  on_track: 'bg-green-100 text-green-700',
  due_soon: 'bg-amber-100 text-amber-700',
  overdue:  'bg-red-100   text-red-700',
  no_sla:   'bg-gray-100  text-gray-500',
};

const DEPT_COLORS: Record<string, string> = {
  compliance:       'bg-red-100  text-red-700',
  finance:          'bg-green-100 text-green-700',
  hr:               'bg-blue-100  text-blue-700',
  legal:            'bg-purple-100 text-purple-700',
  ops:              'bg-orange-100 text-orange-700',
  fraud:            'bg-pink-100   text-pink-700',
  revenue:          'bg-cyan-100   text-cyan-700',
  products:         'bg-indigo-100 text-indigo-700',
  marketing:        'bg-yellow-100 text-yellow-700',
  customer_success: 'bg-teal-100   text-teal-700',
  procurement:      'bg-lime-100   text-lime-700',
  dev:              'bg-violet-100 text-violet-700',
};

const STEP_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100  text-amber-700',
  active:     'bg-blue-100   text-blue-700',
  overdue:    'bg-red-100    text-red-700',
  escalated:  'bg-orange-100 text-orange-700',
  approved:   'bg-green-100  text-green-700',
  rejected:   'bg-gray-100   text-gray-500',
};

// ─── KPI strip ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: {
  label: string; value: number; accent?: 'red' | 'amber' | 'green' | 'blue';
}) {
  const val = accent === 'red'   ? 'text-red-600'   :
              accent === 'amber' ? 'text-amber-600'  :
              accent === 'green' ? 'text-green-600'  :
              accent === 'blue'  ? 'text-utu-blue'   : 'text-utu-text-primary';
  return (
    <div className="rounded-utu-card bg-utu-bg-card border border-utu-border-default p-4">
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${val}`}>{value}</p>
    </div>
  );
}

// ─── Decision modal ───────────────────────────────────────────────────────────

function DecisionModal({
  task,
  onClose,
  onDone,
}: {
  task: WfTaskInboxRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [decision,  setDecision]  = useState<WfDecision>('approve');
  const [comments,  setComments]  = useState('');
  const [recOpen,   setRecOpen]   = useState(false);
  const [rec,       setRec]       = useState<{ recommended_decision: string; confidence: string; rationale: string; risk_factors: string[]; policy_notes: string[] } | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: () => wfDecide({ instance_id: task.instance_id, step_log_id: task.id, decision, comments: comments || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-inbox'] });
      qc.invalidateQueries({ queryKey: ['wf-stats'] });
      onDone();
    },
  });

  async function loadRec() {
    setRecOpen(true);
    if (rec) return;
    setRecLoading(true);
    try {
      const result = await getWfRecommendation(task.id);
      setRec(result.recommendation ?? null);
    } catch {
      // non-fatal
    } finally {
      setRecLoading(false);
    }
  }

  const decisionBg = decision === 'approve' ? 'border-green-500 bg-green-50' :
                     decision === 'reject'  ? 'border-red-400  bg-red-50'   :
                                             'border-amber-400 bg-amber-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-utu-card bg-utu-bg-card shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-utu-border-default px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-utu-text-primary">{task.step_name}</h2>
            <p className="mt-0.5 text-xs text-utu-text-muted">{task.workflow_name} · {task.department.replace(/_/g,' ')}</p>
          </div>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Context summary */}
          <div className="rounded bg-utu-bg-muted px-3 py-2 text-xs text-utu-text-secondary space-y-1">
            <p><span className="font-medium">Trigger:</span> {task.trigger_event.replace(/_/g,' ')}</p>
            {task.trigger_ref_type && <p><span className="font-medium">Ref:</span> {task.trigger_ref_type} {task.trigger_ref?.slice(0,8)}</p>}
            {task.sla_deadline && (
              <p><span className="font-medium">SLA:</span> {fmtDate(task.sla_deadline)} ({fmtRelative(task.sla_deadline)})</p>
            )}
            <p><span className="font-medium">Initiated by:</span> {task.initiated_by}</p>
          </div>

          {/* Context fields */}
          {Object.keys(task.context ?? {}).length > 0 && (
            <div className="rounded bg-utu-bg-muted px-3 py-2 text-xs text-utu-text-secondary">
              <p className="font-medium mb-1.5 text-utu-text-primary">Context</p>
              {Object.entries(task.context ?? {}).slice(0, 8).map(([k, v]) => (
                <p key={k}><span className="font-medium">{k.replace(/_/g,' ')}:</span> {String(v ?? '—').slice(0, 80)}</p>
              ))}
            </div>
          )}

          {/* AI Recommendation */}
          <div>
            <button
              onClick={loadRec}
              className="flex items-center gap-1.5 text-xs text-utu-blue hover:underline"
            >
              <span className="text-utu-blue">✦</span>
              {recOpen ? 'Hide' : 'Analyse with Claude'}
            </button>
            {recOpen && (
              <div className="mt-2 rounded border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-xs space-y-1.5">
                {recLoading && <p className="text-utu-text-muted animate-pulse">Analysing…</p>}
                {!recLoading && rec && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 font-semibold ${
                        rec.recommended_decision === 'approve' ? 'bg-green-100 text-green-700' :
                        rec.recommended_decision === 'reject'  ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {rec.recommended_decision.toUpperCase()}
                      </span>
                      <span className="text-utu-text-muted capitalize">{rec.confidence} confidence</span>
                    </div>
                    <p className="text-utu-text-secondary">{rec.rationale}</p>
                    {rec.risk_factors?.length > 0 && (
                      <p className="text-red-600"><span className="font-medium">Risk:</span> {rec.risk_factors.join(' · ')}</p>
                    )}
                    {rec.policy_notes?.length > 0 && (
                      <p className="text-blue-600"><span className="font-medium">Policy:</span> {rec.policy_notes.join(' · ')}</p>
                    )}
                  </>
                )}
                {!recLoading && !rec && <p className="text-utu-text-muted">No recommendation available.</p>}
              </div>
            )}
          </div>

          {/* Decision selector */}
          <div>
            <p className="text-xs font-medium text-utu-text-primary mb-2">Your Decision</p>
            <div className="flex gap-2">
              {(['approve', 'reject', 'escalate'] as WfDecision[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDecision(d)}
                  className={`flex-1 rounded border-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    decision === d ? decisionBg : 'border-utu-border-default text-utu-text-muted hover:border-utu-blue'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-medium text-utu-text-primary mb-1">
              Comments {decision === 'reject' ? '(required for rejection)' : '(optional)'}
            </label>
            <textarea
              rows={3}
              className="w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Add context for the audit trail…"
            />
          </div>

          {/* Submit */}
          <button
            disabled={mutation.isPending || (decision === 'reject' && !comments.trim())}
            onClick={() => mutation.mutate()}
            className={`w-full rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              decision === 'approve' ? 'bg-green-600 hover:bg-green-700' :
              decision === 'reject'  ? 'bg-red-600 hover:bg-red-700' :
                                       'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {mutation.isPending ? 'Submitting…' : `Submit ${decision}`}
          </button>

          {mutation.isError && (
            <p className="text-xs text-red-600">Failed to submit decision. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onDecide }: { task: WfTaskInboxRow; onDecide: (t: WfTaskInboxRow) => void }) {
  const slaColor    = SLA_COLORS[task.sla_health ?? 'no_sla'] ?? SLA_COLORS.no_sla;
  const deptColor   = DEPT_COLORS[task.department] ?? 'bg-gray-100 text-gray-600';
  const statusColor = STEP_STATUS_COLORS[task.status] ?? '';
  const rel = fmtRelative(task.sla_deadline);

  return (
    <tr className={task.status === 'overdue' ? 'bg-red-50' : undefined}>
      <td className="px-3 py-3">
        <p className="text-sm font-medium text-utu-text-primary">{task.step_name}</p>
        <p className="text-xs text-utu-text-muted mt-0.5">{task.workflow_name}</p>
      </td>
      <td className="px-3 py-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${deptColor}`}>
          {task.department.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-utu-text-secondary">{task.trigger_event.replace(/_/g, ' ')}</td>
      <td className="px-3 py-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${statusColor}`}>{task.status}</span>
      </td>
      <td className="px-3 py-3">
        {rel ? (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${slaColor}`}>{rel}</span>
        ) : <span className="text-xs text-utu-text-muted">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-utu-text-muted whitespace-nowrap">{fmtDate(task.activated_at)}</td>
      <td className="px-3 py-3">
        <button
          onClick={() => onDecide(task)}
          className="rounded bg-utu-blue px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Review
        </button>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'pending' | 'overdue' | 'escalated';

export default function TasksPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [page,         setPage]         = useState(1);
  const [deciding,     setDeciding]     = useState<WfTaskInboxRow | null>(null);

  const limit = 25;

  const { data: statsData } = useQuery({
    queryKey:  ['wf-stats'],
    queryFn:   getWfTaskStats,
    refetchInterval: 60_000,
  });
  const stats: WfTaskStats = statsData ?? { pending: 0, overdue: 0, escalated: 0, completed_week: 0 };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wf-inbox', filterStatus, page],
    queryFn:  () => getWfTaskInbox({
      status: filterStatus === 'all' ? undefined : filterStatus,
      limit,
      offset: (page - 1) * limit,
    }),
  });

  const tasks: WfTaskInboxRow[] = data?.rows ?? [];
  const total: number           = data?.total ?? 0;

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => refetch(), 30_000);
    return () => clearInterval(t);
  }, [refetch]);

  const FILTERS: { label: string; value: FilterStatus; count?: number; accent?: string }[] = [
    { label: 'All',       value: 'all',       count: stats.pending + stats.overdue + stats.escalated },
    { label: 'Pending',   value: 'pending',   count: stats.pending },
    { label: 'Overdue',   value: 'overdue',   count: stats.overdue,   accent: 'text-red-600' },
    { label: 'Escalated', value: 'escalated', count: stats.escalated, accent: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">My Task Inbox</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          All pending workflow approvals assigned to your role — across every department.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pending"          value={stats.pending}        accent="blue"  />
        <StatCard label="Overdue"          value={stats.overdue}        accent="red"   />
        <StatCard label="Escalated"        value={stats.escalated}      accent="amber" />
        <StatCard label="Completed (7 d)"  value={stats.completed_week} accent="green" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-utu-border-default">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilterStatus(f.value); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filterStatus === f.value
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={`rounded-full bg-utu-bg-muted px-1.5 py-0.5 text-xs font-semibold ${f.accent ?? ''}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => refetch()}
          className="ms-auto rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-muted hover:bg-utu-bg-muted mb-1"
        >
          Refresh
        </button>
      </div>

      {/* Task table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-utu-text-muted animate-pulse">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-medium text-utu-text-primary">All clear</p>
            <p className="text-xs text-utu-text-muted mt-1">No pending tasks for your role right now.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-utu-bg-muted text-xs uppercase text-utu-text-muted">
              <tr>
                <th className="px-3 py-2 text-start">Step / Workflow</th>
                <th className="px-3 py-2 text-start">Department</th>
                <th className="px-3 py-2 text-start">Trigger</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">SLA</th>
                <th className="px-3 py-2 text-start">Activated</th>
                <th className="px-3 py-2 text-start">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {tasks.map(task => (
                <TaskRow key={task.id} task={task} onDecide={setDeciding} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Previous</button>
          <span className="text-xs text-utu-text-muted">Page {page} of {Math.ceil(total / limit)}</span>
          <button disabled={tasks.length < limit} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Decision modal */}
      {deciding && (
        <DecisionModal
          task={deciding}
          onClose={() => setDeciding(null)}
          onDone={() => setDeciding(null)}
        />
      )}
    </div>
  );
}
