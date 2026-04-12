'use client';

import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLegalStats, getLegalMatters, createLegalMatter, updateLegalMatter, deleteLegalMatter,
  getLegalTasks, createLegalTask, updateLegalTask, deleteLegalTask,
  getLegalDocuments, createLegalDocument, updateLegalDocument, deleteLegalDocument,
  getContractReview, reviewContract,
  type LegalStats, type LegalMatter, type LegalTask, type LegalDocument,
  type MatterStatus, type MatterUrgency, type TaskStatus,
  type ContractRiskLevel, type ContractReview,
  getLegalAdvice, analyzeLegal, type LegalAdvice,
} from '@/lib/api';

// ─── AI Legal Advisor Panel ───────────────────────────────────────────────────

const LEGAL_HEALTH_BADGE: Record<string, string> = {
  excellent: 'border-green-300  bg-green-50  text-green-700',
  good:      'border-blue-200   bg-blue-50   text-blue-700',
  fair:      'border-amber-200  bg-amber-50  text-amber-700',
  poor:      'border-red-200    bg-red-50    text-red-700',
};
const LEGAL_URGENCY_COLORS: Record<string, string> = {
  immediate:   'bg-red-100 text-red-700',
  this_week:   'bg-amber-100 text-amber-700',
  this_month:  'bg-blue-100 text-blue-700',
};
const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: 'border-red-200    bg-red-50    text-red-700',
  high:     'border-amber-200  bg-amber-50  text-amber-700',
  medium:   'border-blue-200   bg-blue-50   text-blue-700',
  low:      'border-gray-200   bg-gray-50   text-gray-600',
};

function AILegalAdvisorPanel() {
  const [advice,  setAdvice]  = useState<LegalAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getLegalAdvice()
      .then(r => { if (!cancelled) { setAdvice(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeLegal();
      if (res.data) setAdvice(res.data);
      else setError('Analysis failed. Please try again.');
    } catch { setError('Failed to run analysis.'); }
    finally { setRunning(false); }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 mb-4">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Legal Advisor</span>
          {advice && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${LEGAL_HEALTH_BADGE[advice.legal_health] ?? ''}`}>
              {advice.legal_health}
            </span>
          )}
          {advice && (
            <span className="text-xs text-violet-500">
              {advice.open_matters} open matters · {advice.overdue_tasks} overdue tasks
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading legal analysis…</p>}

          {!loading && !advice && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                Run AI Legal Advisor to surface critical matter risks, jurisdiction exposure, overdue compliance tasks, and expiring contract alerts across Saudi, UAE, and EU frameworks.
              </p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Legal Analysis'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {advice && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{advice.executive_summary}</p>

              {advice.critical_matters.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Critical Matters</h3>
                  <div className="space-y-2">
                    {advice.critical_matters.map((m, i) => (
                      <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-red-800">{m.title}</p>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${LEGAL_URGENCY_COLORS[m.urgency] ?? ''}`}>{m.urgency.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-red-600 mt-0.5">{m.jurisdiction} · {m.type}</p>
                        <p className="text-xs text-red-500 mt-0.5">{m.risk}</p>
                        <p className="text-xs text-red-400 mt-0.5 italic">{m.recommended_action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.jurisdiction_risks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Jurisdiction Risks</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {advice.jurisdiction_risks.map((j, i) => (
                      <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-800">{j.jurisdiction} <span className="font-normal text-amber-600">({j.open_matters} open)</span></p>
                        <p className="text-xs text-amber-700 mt-0.5">{j.risk}</p>
                        <p className="text-xs text-amber-600 mt-0.5 italic">{j.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.overdue_tasks_list.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Overdue Compliance Tasks</h3>
                  <div className="space-y-2">
                    {advice.overdue_tasks_list.map((t, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-orange-800">{t.task}</p>
                          <p className="text-xs text-orange-600 mt-0.5">{t.consequence}</p>
                          <p className="text-xs text-orange-500 mt-0.5 italic">{t.action}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t.days_overdue}d overdue</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.contract_alerts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Contract Expiry Alerts</h3>
                  <div className="space-y-2">
                    {advice.contract_alerts.map((a, i) => (
                      <div key={i} className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                        <p className="text-xs font-semibold text-utu-text-primary">{a.doc_type} <span className="text-amber-600 font-normal">({a.count_expiring} expiring)</span></p>
                        <p className="text-xs text-utu-text-secondary mt-0.5">{a.risk}</p>
                        <p className="text-xs text-violet-600 mt-0.5 italic">{a.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.compliance_gaps.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-xs font-semibold text-red-800 mb-1">Compliance Gaps</p>
                    <ul className="space-y-0.5">
                      {advice.compliance_gaps.map((g, i) => <li key={i} className="text-xs text-red-700">• {g}</li>)}
                    </ul>
                  </div>
                )}
                {advice.quick_wins.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Quick Wins</h3>
                    <ul className="space-y-1">
                      {advice.quick_wins.map((w, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary before:content-['→'] before:mr-1.5 before:text-green-500">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {advice.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {advice.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-utu-text-secondary before:content-['✓'] before:mr-1.5 before:text-violet-500">{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                <p className="text-xs text-violet-400">Last run: {new Date(advice.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <button onClick={handleAnalyze} disabled={running}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {running ? 'Refreshing…' : '↺ Refresh'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

// ─── AI Contract Reviewer panel ───────────────────────────────────────────────

const RISK_CONFIG: Record<ContractRiskLevel, { label: string; badge: string; bar: string }> = {
  low:      { label: 'Low Risk',      badge: 'bg-green-100 text-green-700',  bar: 'bg-green-400' },
  medium:   { label: 'Medium Risk',   badge: 'bg-blue-100 text-blue-700',    bar: 'bg-blue-400'  },
  high:     { label: 'High Risk',     badge: 'bg-amber-100 text-amber-700',  bar: 'bg-amber-400' },
  critical: { label: 'Critical Risk', badge: 'bg-red-100 text-red-700',      bar: 'bg-red-500'   },
};

function AIContractPanel({ docId }: { docId: string }) {
  const [open,    setOpen]    = useState(false);
  const [review,  setReview]  = useState<ContractReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);

  // Auto-load existing review when panel first opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const existing = await getContractReview(docId).catch(() => null);
      if (!cancelled) { setReview(existing); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [docId, open]);

  async function runReview() {
    setLoading(true);
    try {
      const res = await reviewContract(docId);
      setReview(res.data ?? null);
    } finally {
      setLoading(false);
    }
  }

  function copyRecs() {
    if (!review) return;
    const text = review.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const cfg = review ? RISK_CONFIG[review.risk_level] ?? RISK_CONFIG.medium : null;

  return (
    <div className="mt-5 rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-utu-blue">✦</span>
          AI Contract Review
          {review && cfg && !open && (
            <span className={`ms-2 rounded px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
          )}
        </span>
        <span className="text-utu-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-utu-border-default px-4 py-4 space-y-4">
          {loading && (
            <p className="text-sm text-utu-text-muted animate-pulse">
              {review ? 'Re-running review…' : 'Loading review…'}
            </p>
          )}

          {!loading && !review && (
            <div className="text-center py-2">
              <p className="text-sm text-utu-text-muted mb-3">No AI review yet for this document.</p>
              <button
                onClick={runReview}
                className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Run AI Review
              </button>
            </div>
          )}

          {!loading && review && cfg && (
            <>
              {/* Risk level + summary */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs text-utu-text-muted mb-1">Risk Assessment</p>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <button
                  onClick={runReview}
                  className="shrink-0 rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-muted hover:bg-utu-bg-muted"
                >
                  Re-analyse
                </button>
              </div>

              <p className="text-sm text-utu-text-secondary leading-relaxed">{review.overall_summary}</p>

              {/* Expiry alert */}
              {review.expiry_alert && (
                <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  {review.expiry_alert}
                </div>
              )}

              {/* Risk flags + Missing clauses */}
              {(review.risk_flags.length > 0 || review.missing_clauses.length > 0) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {review.risk_flags.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-red-600 uppercase tracking-wide">Risk Flags</p>
                      <ul className="space-y-1">
                        {review.risk_flags.map((f, i) => (
                          <li key={i} className="flex gap-1.5 text-xs text-utu-text-secondary">
                            <span className="mt-0.5 shrink-0 text-red-500">&#9679;</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.missing_clauses.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wide">Missing Clauses</p>
                      <ul className="space-y-1">
                        {review.missing_clauses.map((c, i) => (
                          <li key={i} className="flex gap-1.5 text-xs text-utu-text-secondary">
                            <span className="mt-0.5 shrink-0 text-amber-500">&#9679;</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance notes */}
              {review.compliance_notes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wide">Compliance Notes</p>
                  <ul className="space-y-1">
                    {review.compliance_notes.map((n, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-utu-text-secondary">
                        <span className="mt-0.5 shrink-0 text-blue-400">&#9679;</span>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {review.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-utu-text-primary uppercase tracking-wide">Recommendations</p>
                    <button
                      onClick={copyRecs}
                      className="flex items-center gap-1 rounded border border-utu-border-default px-2 py-0.5 text-xs text-utu-text-muted hover:bg-utu-bg-muted"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <ol className="space-y-1.5">
                    {review.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs text-utu-text-secondary">
                        <span className="shrink-0 font-semibold text-utu-text-primary">{i + 1}.</span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="text-right text-xs text-utu-text-muted">
                Reviewed {new Date(review.generated_at).toLocaleString()}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

        {isEdit && <AIContractPanel docId={doc!.id} />}
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
        {activeTab === 'Dashboard'         && <><AILegalAdvisorPanel /><DashboardTab /></>}
        {activeTab === 'Matters'           && <MattersTab />}
        {activeTab === 'Compliance Tasks'  && <TasksTab />}
        {activeTab === 'Documents'         && <DocumentsTab />}
      </div>
    </div>
  );
}
