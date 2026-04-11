'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLegalStats, getLegalMatters, createLegalMatter, updateLegalMatter, deleteLegalMatter,
  getLegalTasks, createLegalTask, updateLegalTask, deleteLegalTask,
  getLegalDocuments, createLegalDocument, updateLegalDocument, deleteLegalDocument,
  type LegalStats, type LegalMatter, type LegalTask, type LegalDocument,
  type MatterStatus, type MatterUrgency, type TaskStatus,
} from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: number | string; sub?: string;
  accent?: 'red' | 'amber' | 'green' | 'blue';
}) {
  const ring = accent === 'red' ? 'border-red-400' : accent === 'amber' ? 'border-amber-400'
             : accent === 'green' ? 'border-green-400' : 'border-utu-border-default';
  const val  = accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600'
             : accent === 'green' ? 'text-green-600' : 'text-utu-text-primary';
  return (
    <div className={`rounded-utu-card bg-utu-bg-card border ${ring} p-4`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${val}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

function SlidePanel({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-utu-bg-card shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">{title}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const URGENCY_COLORS: Record<string, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const MATTER_STATUS_COLORS: Record<string, string> = {
  open:        'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  closed:      'bg-green-100 text-green-700',
  on_hold:     'bg-gray-100 text-gray-600',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  overdue:     'bg-red-100 text-red-700',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  draft:      'bg-gray-100 text-gray-600',
  active:     'bg-green-100 text-green-700',
  expired:    'bg-red-100 text-red-700',
  terminated: 'bg-red-50 text-red-600',
  archived:   'bg-gray-100 text-gray-500',
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function inputCls(extra = '') {
  return `w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue ${extra}`;
}

function labelCls() { return 'block text-xs font-medium text-utu-text-muted mb-1'; }

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['legal-stats'],
    queryFn:  () => getLegalStats().then(r => (r as any).data as LegalStats),
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-utu-text-muted">Loading...</p>;
  if (!data)     return <p className="py-8 text-center text-sm text-red-500">Failed to load stats.</p>;

  return (
    <div className="space-y-6">
      {data.critical_matters > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {data.critical_matters} critical legal matter{data.critical_matters !== 1 ? 's' : ''} require immediate attention.
        </div>
      )}
      {data.overdue_tasks > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          {data.overdue_tasks} compliance task{data.overdue_tasks !== 1 ? 's' : ''} overdue.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Open Matters"       value={data.open_matters}           accent={data.open_matters > 0 ? 'amber' : undefined} />
        <KpiCard label="Critical"           value={data.critical_matters}       accent={data.critical_matters > 0 ? 'red' : undefined} />
        <KpiCard label="Overdue Tasks"      value={data.overdue_tasks}          accent={data.overdue_tasks > 0 ? 'red' : undefined} />
        <KpiCard label="Due in 14 Days"     value={data.due_soon_tasks}         accent={data.due_soon_tasks > 0 ? 'amber' : undefined} />
        <KpiCard label="Expiring Docs"      value={data.expiring_documents}     accent={data.expiring_documents > 0 ? 'amber' : undefined} sub="within 60 days" />
        <KpiCard label="Active Documents"   value={data.total_active_documents} accent="green" />
      </div>

      {Object.keys(data.by_jurisdiction).length > 0 && (
        <div className="rounded-utu-card bg-utu-bg-card border border-utu-border-default overflow-hidden">
          <div className="border-b border-utu-border-default px-4 py-3">
            <h3 className="text-sm font-semibold text-utu-text-primary">By Jurisdiction</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-utu-bg-muted text-xs uppercase text-utu-text-muted">
              <tr>
                <th className="px-4 py-2 text-start">Jurisdiction</th>
                <th className="px-4 py-2 text-end">Open Matters</th>
                <th className="px-4 py-2 text-end">Pending Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {Object.entries(data.by_jurisdiction).map(([j, v]) => (
                <tr key={j}>
                  <td className="px-4 py-2.5 font-medium text-utu-text-primary">{j}</td>
                  <td className={`px-4 py-2.5 text-end font-medium ${v.open_matters > 0 ? 'text-amber-600' : 'text-utu-text-muted'}`}>{v.open_matters}</td>
                  <td className={`px-4 py-2.5 text-end font-medium ${v.pending_tasks > 0 ? 'text-amber-600' : 'text-utu-text-muted'}`}>{v.pending_tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Matters
// ─────────────────────────────────────────────────────────────────────────────

function MatterPanel({ matter, onClose }: { matter: LegalMatter | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!matter;
  const [form, setForm] = useState<Partial<LegalMatter>>(matter ?? {
    matter_type: 'other', status: 'open', urgency: 'medium',
  });

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? updateLegalMatter(matter!.id, form)
      : createLegalMatter(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-matters'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); onClose(); },
  });

  const set = (k: keyof LegalMatter, v: string) => setForm(p => ({ ...p, [k]: v || undefined }));

  return (
    <SlidePanel title={isEdit ? 'Edit Matter' : 'New Matter'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls()}>Title *</label>
          <input className={inputCls()} value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Matter title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Type</label>
            <select className={inputCls()} value={form.matter_type ?? 'other'} onChange={e => set('matter_type', e.target.value)}>
              {['dispute','contract_review','regulatory','ip','employment','other'].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls()}>Urgency</label>
            <select className={inputCls()} value={form.urgency ?? 'medium'} onChange={e => set('urgency', e.target.value)}>
              {['low','medium','high','critical'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Status</label>
            <select className={inputCls()} value={form.status ?? 'open'} onChange={e => set('status', e.target.value)}>
              {['open','in_progress','on_hold','closed'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls()}>Jurisdiction</label>
            <input className={inputCls()} value={form.jurisdiction ?? ''} onChange={e => set('jurisdiction', e.target.value)} placeholder="SA, GB, EU…" />
          </div>
        </div>
        <div>
          <label className={labelCls()}>Assigned To</label>
          <input className={inputCls()} value={form.assigned_to ?? ''} onChange={e => set('assigned_to', e.target.value)} placeholder="Counsel name or firm" />
        </div>
        <div>
          <label className={labelCls()}>Due Date</label>
          <input type="date" className={inputCls()} value={form.due_date ?? ''} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls()}>Description</label>
          <textarea rows={3} className={inputCls()} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className={labelCls()}>Notes</label>
          <textarea rows={2} className={inputCls()} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <button
          disabled={!form.title?.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Matter'}
        </button>
      </div>
    </SlidePanel>
  );
}

function MattersTab() {
  const qc = useQueryClient();
  const [statusFilter,   setStatusFilter]   = useState('');
  const [typeFilter,     setTypeFilter]     = useState('');
  const [urgencyFilter,  setUrgencyFilter]  = useState('');
  const [page,           setPage]           = useState(1);
  const [panelMatter,    setPanelMatter]    = useState<LegalMatter | null | 'new'>('new' as any);
  const [showPanel,      setShowPanel]      = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['legal-matters', statusFilter, typeFilter, urgencyFilter, page],
    queryFn:  () => getLegalMatters({ status: statusFilter || undefined, type: typeFilter || undefined, urgency: urgencyFilter || undefined, page, limit: 50 }).then(r => r as any),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => deleteLegalMatter(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-matters'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); },
  });

  const rows: LegalMatter[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          {['open','in_progress','on_hold','closed'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Types</option>
          {['dispute','contract_review','regulatory','ip','employment','other'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={urgencyFilter} onChange={e => { setUrgencyFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Urgencies</option>
          {['critical','high','medium','low'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <button onClick={() => { setPanelMatter(null); setShowPanel(true); }} className="ms-auto rounded bg-utu-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + New Matter
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading matters...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No legal matters found.</p>
        ) : (
          <table className="w-full text-sm min-w-[780px]">
            <thead className="bg-utu-bg-muted text-xs uppercase text-utu-text-muted">
              <tr>
                <th className="px-3 py-2 text-start">Title</th>
                <th className="px-3 py-2 text-start">Type</th>
                <th className="px-3 py-2 text-start">Urgency</th>
                <th className="px-3 py-2 text-start">Jurisdiction</th>
                <th className="px-3 py-2 text-start">Assigned To</th>
                <th className="px-3 py-2 text-start">Due</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => (
                <tr key={row.id} className={row.urgency === 'critical' ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-medium text-utu-text-primary max-w-[200px] truncate" title={row.title}>{row.title}</td>
                  <td className="px-3 py-2"><Badge label={row.matter_type} color="bg-utu-bg-muted text-utu-text-secondary" /></td>
                  <td className="px-3 py-2"><Badge label={row.urgency} color={URGENCY_COLORS[row.urgency] ?? ''} /></td>
                  <td className="px-3 py-2 text-utu-text-secondary">{row.jurisdiction ?? '—'}</td>
                  <td className="px-3 py-2 text-utu-text-secondary max-w-[120px] truncate">{row.assigned_to ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-utu-text-secondary">{fmtDate(row.due_date)}</td>
                  <td className="px-3 py-2"><Badge label={row.status} color={MATTER_STATUS_COLORS[row.status] ?? ''} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button onClick={() => { setPanelMatter(row); setShowPanel(true); }} className="rounded bg-utu-bg-muted px-2 py-1 text-xs hover:bg-utu-bg-subtle">Edit</button>
                      {row.status !== 'closed' && (
                        <button
                          onClick={() => closeMutation.mutate(row.id)}
                          disabled={closeMutation.isPending}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Previous</button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button disabled={rows.length < 50} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Next</button>
        </div>
      )}

      {showPanel && <MatterPanel matter={panelMatter as LegalMatter | null} onClose={() => setShowPanel(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Compliance Tasks
// ─────────────────────────────────────────────────────────────────────────────

function TaskPanel({ task, onClose }: { task: LegalTask | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!task;
  const [form, setForm] = useState<Partial<LegalTask>>(task ?? { task_type: 'other', status: 'pending' });

  const mutation = useMutation({
    mutationFn: () => isEdit ? updateLegalTask(task!.id, form) : createLegalTask(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-tasks'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); onClose(); },
  });

  const set = (k: keyof LegalTask, v: string) => setForm(p => ({ ...p, [k]: v || undefined }));

  return (
    <SlidePanel title={isEdit ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls()}>Title *</label>
          <input className={inputCls()} value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Task title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Type</label>
            <select className={inputCls()} value={form.task_type ?? 'other'} onChange={e => set('task_type', e.target.value)}>
              {['license_renewal','tax_filing','audit_prep','regulatory_report','certification','other'].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls()}>Status</label>
            <select className={inputCls()} value={form.status ?? 'pending'} onChange={e => set('status', e.target.value)}>
              {['pending','in_progress','completed','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Jurisdiction</label>
            <input className={inputCls()} value={form.jurisdiction ?? ''} onChange={e => set('jurisdiction', e.target.value)} placeholder="SA, GB, EU…" />
          </div>
          <div>
            <label className={labelCls()}>Recurrence</label>
            <select className={inputCls()} value={form.recurrence ?? ''} onChange={e => set('recurrence', e.target.value)}>
              <option value="">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls()}>Due Date</label>
          <input type="date" className={inputCls()} value={form.due_date ?? ''} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls()}>Assigned To</label>
          <input className={inputCls()} value={form.assigned_to ?? ''} onChange={e => set('assigned_to', e.target.value)} />
        </div>
        <div>
          <label className={labelCls()}>Notes</label>
          <textarea rows={2} className={inputCls()} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <button
          disabled={!form.title?.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </SlidePanel>
  );
}

function TasksTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [page,         setPage]         = useState(1);
  const [showPanel,    setShowPanel]    = useState(false);
  const [editTask,     setEditTask]     = useState<LegalTask | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['legal-tasks', statusFilter, typeFilter, page],
    queryFn:  () => getLegalTasks({ status: statusFilter || undefined, type: typeFilter || undefined, page, limit: 50 }).then(r => r as any),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => updateLegalTask(id, { status: 'completed' as TaskStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-tasks'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLegalTask(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-tasks'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); },
  });

  const rows: LegalTask[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  function dueCls(row: LegalTask) {
    if (!row.due_date || row.status === 'completed') return 'text-utu-text-secondary';
    const days = daysUntil(row.due_date);
    if (days === null) return 'text-utu-text-secondary';
    if (days < 0)  return 'text-red-600 font-medium';
    if (days <= 14) return 'text-amber-600 font-medium';
    return 'text-utu-text-secondary';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          {['pending','in_progress','completed','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Types</option>
          {['license_renewal','tax_filing','audit_prep','regulatory_report','certification','other'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button onClick={() => { setEditTask(null); setShowPanel(true); }} className="ms-auto rounded bg-utu-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Add Task
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading tasks...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No compliance tasks found.</p>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-utu-bg-muted text-xs uppercase text-utu-text-muted">
              <tr>
                <th className="px-3 py-2 text-start">Title</th>
                <th className="px-3 py-2 text-start">Type</th>
                <th className="px-3 py-2 text-start">Jurisdiction</th>
                <th className="px-3 py-2 text-start">Due Date</th>
                <th className="px-3 py-2 text-start">Assigned</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">Recurrence</th>
                <th className="px-3 py-2 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => {
                const isEffectivelyOverdue = row.status !== 'completed' && row.due_date
                  && daysUntil(row.due_date)! < 0;
                return (
                  <tr key={row.id} className={isEffectivelyOverdue ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 font-medium text-utu-text-primary max-w-[200px] truncate" title={row.title}>{row.title}</td>
                    <td className="px-3 py-2"><Badge label={row.task_type} color="bg-utu-bg-muted text-utu-text-secondary" /></td>
                    <td className="px-3 py-2 text-utu-text-secondary">{row.jurisdiction ?? '—'}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${dueCls(row)}`}>{fmtDate(row.due_date)}</td>
                    <td className="px-3 py-2 text-utu-text-secondary">{row.assigned_to ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge
                        label={isEffectivelyOverdue && row.status !== 'overdue' ? 'overdue' : row.status}
                        color={TASK_STATUS_COLORS[isEffectivelyOverdue ? 'overdue' : row.status] ?? ''}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-utu-text-muted capitalize">{row.recurrence ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {row.status !== 'completed' && (
                          <button onClick={() => completeMutation.mutate(row.id)} disabled={completeMutation.isPending} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 disabled:opacity-50">Done</button>
                        )}
                        <button onClick={() => { setEditTask(row); setShowPanel(true); }} className="rounded bg-utu-bg-muted px-2 py-1 text-xs hover:bg-utu-bg-subtle">Edit</button>
                        <button onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate(row.id); }} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Previous</button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button disabled={rows.length < 50} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Next</button>
        </div>
      )}

      {showPanel && <TaskPanel task={editTask} onClose={() => setShowPanel(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4: Documents
// ─────────────────────────────────────────────────────────────────────────────

function DocumentPanel({ doc, onClose }: { doc: LegalDocument | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!doc;
  const [form, setForm] = useState<Partial<LegalDocument>>(doc ?? { doc_type: 'other', status: 'active' });

  const mutation = useMutation({
    mutationFn: () => isEdit ? updateLegalDocument(doc!.id, form) : createLegalDocument(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-documents'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); onClose(); },
  });

  const set = (k: keyof LegalDocument, v: string) => setForm(p => ({ ...p, [k]: v || undefined }));

  return (
    <SlidePanel title={isEdit ? 'Edit Document' : 'New Document'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls()}>Title *</label>
          <input className={inputCls()} value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Document title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Type</label>
            <select className={inputCls()} value={form.doc_type ?? 'other'} onChange={e => set('doc_type', e.target.value)}>
              {['contract','nda','license','certificate','filing','opinion','other'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls()}>Status</label>
            <select className={inputCls()} value={form.status ?? 'active'} onChange={e => set('status', e.target.value)}>
              {['draft','active','expired','terminated','archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Counterparty</label>
            <input className={inputCls()} value={form.counterparty ?? ''} onChange={e => set('counterparty', e.target.value)} placeholder="Vendor / authority" />
          </div>
          <div>
            <label className={labelCls()}>Jurisdiction</label>
            <input className={inputCls()} value={form.jurisdiction ?? ''} onChange={e => set('jurisdiction', e.target.value)} placeholder="SA, GB, EU…" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls()}>Execution Date</label>
            <input type="date" className={inputCls()} value={form.execution_date ?? ''} onChange={e => set('execution_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls()}>Expiry Date</label>
            <input type="date" className={inputCls()} value={form.expiry_date ?? ''} onChange={e => set('expiry_date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls()}>File URL / S3 Key</label>
          <input className={inputCls()} value={form.file_url ?? ''} onChange={e => set('file_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className={labelCls()}>Notes</label>
          <textarea rows={2} className={inputCls()} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <button
          disabled={!form.title?.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Document'}
        </button>
      </div>
    </SlidePanel>
  );
}

function DocumentsTab() {
  const qc = useQueryClient();
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page,         setPage]         = useState(1);
  const [showPanel,    setShowPanel]    = useState(false);
  const [editDoc,      setEditDoc]      = useState<LegalDocument | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['legal-documents', typeFilter, statusFilter, page],
    queryFn:  () => getLegalDocuments({ type: typeFilter || undefined, status: statusFilter || undefined, page, limit: 50 }).then(r => r as any),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLegalDocument(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-documents'] }); qc.invalidateQueries({ queryKey: ['legal-stats'] }); },
  });

  const rows: LegalDocument[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  function expiryCls(row: LegalDocument) {
    if (!row.expiry_date || row.status !== 'active') return 'text-utu-text-secondary';
    const days = daysUntil(row.expiry_date);
    if (days === null) return 'text-utu-text-secondary';
    if (days < 0)   return 'text-red-600 font-medium';
    if (days <= 60) return 'text-amber-600 font-medium';
    return 'text-utu-text-secondary';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Types</option>
          {['contract','nda','license','certificate','filing','opinion','other'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          {['draft','active','expired','terminated','archived'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setEditDoc(null); setShowPanel(true); }} className="ms-auto rounded bg-utu-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Add Document
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading documents...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No documents found.</p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-utu-bg-muted text-xs uppercase text-utu-text-muted">
              <tr>
                <th className="px-3 py-2 text-start">Title</th>
                <th className="px-3 py-2 text-start">Type</th>
                <th className="px-3 py-2 text-start">Counterparty</th>
                <th className="px-3 py-2 text-start">Jurisdiction</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">Executed</th>
                <th className="px-3 py-2 text-start">Expires</th>
                <th className="px-3 py-2 text-start">File</th>
                <th className="px-3 py-2 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => {
                const days = daysUntil(row.expiry_date);
                const expiryHighlight = row.status === 'active' && days !== null && days < 0;
                return (
                  <tr key={row.id} className={expiryHighlight ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 font-medium text-utu-text-primary max-w-[180px] truncate" title={row.title}>{row.title}</td>
                    <td className="px-3 py-2"><Badge label={row.doc_type} color="bg-utu-bg-muted text-utu-text-secondary" /></td>
                    <td className="px-3 py-2 text-utu-text-secondary max-w-[120px] truncate">{row.counterparty ?? '—'}</td>
                    <td className="px-3 py-2 text-utu-text-secondary">{row.jurisdiction ?? '—'}</td>
                    <td className="px-3 py-2"><Badge label={row.status} color={DOC_STATUS_COLORS[row.status] ?? ''} /></td>
                    <td className="px-3 py-2 whitespace-nowrap text-utu-text-secondary">{fmtDate(row.execution_date)}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${expiryCls(row)}`}>{fmtDate(row.expiry_date)}</td>
                    <td className="px-3 py-2">
                      {row.file_url ? (
                        <a href={row.file_url} target="_blank" rel="noopener noreferrer" className="text-utu-blue hover:underline text-xs">View</a>
                      ) : <span className="text-xs text-utu-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditDoc(row); setShowPanel(true); }} className="rounded bg-utu-bg-muted px-2 py-1 text-xs hover:bg-utu-bg-subtle">Edit</button>
                        <button onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(row.id); }} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Previous</button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button disabled={rows.length < 50} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40">Next</button>
        </div>
      )}

      {showPanel && <DocumentPanel doc={editDoc} onClose={() => setShowPanel(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Matters', 'Compliance Tasks', 'Documents'] as const;
type Tab = typeof TABS[number];

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Legal &amp; Contracts</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Matter tracking, regulatory compliance tasks, and document registry
        </p>
      </div>

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

      <div>
        {activeTab === 'Dashboard'         && <DashboardTab />}
        {activeTab === 'Matters'           && <MattersTab />}
        {activeTab === 'Compliance Tasks'  && <TasksTab />}
        {activeTab === 'Documents'         && <DocumentsTab />}
      </div>
    </div>
  );
}
