'use client';

/**
 * /admin/workflows — Business Process Workflow Hub
 *
 * Tabs:
 *   My Tasks   — unified inbox: all steps pending THIS user's action
 *   Definitions — manage workflow blueprints (create / edit / activate)
 *   Instances   — monitor all running workflow executions
 *   Dashboard   — system-wide SLA health overview (super_admin)
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, BookOpen, Activity, LayoutDashboard,
  Plus, CheckCircle2, XCircle, ArrowUpRight,
  AlertTriangle, Clock, ChevronRight, RefreshCw,
  GitBranch, Layers, Users, Zap, Archive, Sparkles,
  ShieldAlert, Info, TrendingUp, BarChart2, Timer, Target,
} from 'lucide-react';
import {
  getWfDefinitions, getWfInstances, getWfTaskInbox, getWfTaskStats,
  getWfDashboard, wfDecide, cancelWfInstance,
  createWfDefinition, approveWfDefinition, archiveWfDefinition,
  getWfRecommendation, generateWorkflowDraft,
  getWfAnalyticsOverview, getWfAnalyticsByDefinition,
  getWfAnalyticsByDepartment, getWfAnalyticsBottlenecks, getWfAnalyticsTrend,
  type WfDefinition, type WfInstance, type WfTaskInboxRow,
  type WfTaskStats, type WfDashboardData, type WfDefinitionStatus,
  type WfInstanceStatus, type WfStepDef, type WfRecommendation,
  type WfAnalyticsOverview, type WfAnalyticsByDefinition,
  type WfAnalyticsByDepartment, type WfAnalyticsBottleneck,
  type WorkflowBuilderDraft,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['My Tasks', 'Definitions', 'Instances', 'Dashboard', 'Analytics'] as const;
type Tab = typeof TABS[number];

const INSTANCE_STATUS_COLORS: Record<WfInstanceStatus, string> = {
  pending:     'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  approved:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  cancelled:   'bg-slate-100 text-slate-500',
  overdue:     'bg-orange-100 text-orange-700',
};

const DEF_STATUS_COLORS: Record<WfDefinitionStatus, string> = {
  draft:    'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-500',
};

const SLA_COLORS = {
  on_track: 'text-green-600',
  due_soon: 'text-yellow-600',
  overdue:  'text-red-600',
  no_sla:   'text-slate-400',
};

const DEPARTMENTS = [
  'finance','hr','legal','compliance','ops','dev','products',
  'revenue','customer-success','procurement','fraud','analytics',
  'marketing','sales','bizdev','affiliates','corporate','advertising',
];

const STEP_TYPES = ['action','approval','condition','notification','ai_check'] as const;

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDeadline(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const h = Math.floor(diff / 1000 / 3600);
  const m = Math.floor((diff / 1000 / 60) % 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-utu-text-muted">{label}</p>
        {icon && <span className="text-utu-text-muted">{icon}</span>}
      </div>
      <p className={`mt-2 text-3xl font-bold ${color ?? 'text-utu-text-primary'}`}>{value}</p>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── New Definition Slide-over ────────────────────────────────────────────────

const BLANK_STEP = (): WfStepDef => ({
  id:               `step_${Date.now()}`,
  name:             '',
  type:             'approval',
  assignee_role:    '',
  sla_hours:        24,
  escalate_to_role: 'super_admin',
});

interface NewDefFormData {
  name:            string;
  department:      string;
  trigger_event:   string;
  description:     string;
  approval_chain:  string;
  steps:           WfStepDef[];
}

function NewDefinitionPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<NewDefFormData>({
    name: '', department: '', trigger_event: '', description: '',
    approval_chain: 'super_admin',
    steps: [BLANK_STEP()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: keyof NewDefFormData, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }));

  function updateStep(idx: number, k: keyof WfStepDef, v: unknown) {
    setForm(p => {
      const steps = [...p.steps];
      steps[idx] = { ...steps[idx], [k]: v };
      // Update on_approve chain automatically if sequential
      if (idx < steps.length - 1) {
        steps[idx].on_approve = steps[idx + 1].id;
      } else {
        steps[idx].on_approve = undefined;
      }
      return { ...p, steps };
    });
  }

  function addStep() {
    const newStep = BLANK_STEP();
    setForm(p => {
      const steps = [...p.steps, newStep];
      // Wire previous step to this one
      if (steps.length > 1) {
        steps[steps.length - 2].on_approve = newStep.id;
      }
      return { ...p, steps };
    });
  }

  function removeStep(idx: number) {
    setForm(p => {
      const steps = p.steps.filter((_, i) => i !== idx);
      // Rewire on_approve chain
      steps.forEach((s, i) => {
        s.on_approve = i < steps.length - 1 ? steps[i + 1].id : undefined;
      });
      return { ...p, steps };
    });
  }

  function moveStep(idx: number, dir: -1 | 1) {
    setForm(p => {
      const steps = [...p.steps];
      const target = idx + dir;
      if (target < 0 || target >= steps.length) return p;
      [steps[idx], steps[target]] = [steps[target], steps[idx]];
      // Rewire chain
      steps.forEach((s, i) => {
        s.on_approve = i < steps.length - 1 ? steps[i + 1].id : undefined;
      });
      return { ...p, steps };
    });
  }

  async function handleSave() {
    if (!form.name.trim())          { setError('Name is required'); return; }
    if (!form.department)           { setError('Department is required'); return; }
    if (!form.trigger_event.trim()) { setError('Trigger event is required'); return; }
    if (form.steps.some(s => !s.name.trim())) { setError('All steps must have a name'); return; }

    setSaving(true); setError('');
    try {
      await createWfDefinition({
        name:           form.name.trim(),
        department:     form.department,
        trigger_event:  form.trigger_event.trim().toLowerCase().replace(/\s+/g, '_'),
        description:    form.description.trim() || undefined,
        steps:          form.steps,
        approval_chain: form.approval_chain.split(',').map(r => r.trim()).filter(Boolean),
      });
      onCreated();
    } catch {
      setError('Failed to create. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-xl flex-col bg-utu-bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">New Workflow Definition</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {/* Basic info */}
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Workflow Name *</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Expense Claim Approval"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Department *</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.department} onChange={e => set('department', e.target.value)}
              >
                <option value="">Select...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Trigger Event *</label>
              <input
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.trigger_event} onChange={e => set('trigger_event', e.target.value)}
                placeholder="e.g. expense_submitted"
              />
              <p className="mt-1 text-xs text-utu-text-muted">snake_case event name</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Description</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue resize-none"
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What does this workflow do?"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Approval Chain (roles, comma-separated)</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.approval_chain} onChange={e => set('approval_chain', e.target.value)}
              placeholder="super_admin"
            />
            <p className="mt-1 text-xs text-utu-text-muted">Who must approve this definition before it goes active</p>
          </div>

          {/* Steps builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">
                Steps ({form.steps.length})
              </label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-xs font-medium text-utu-blue hover:underline"
              >
                <Plus size={12} /> Add Step
              </button>
            </div>

            <div className="space-y-3">
              {form.steps.map((step, idx) => (
                <div key={step.id} className="rounded-lg border border-utu-border-default bg-utu-bg-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-utu-text-muted">Step {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                        className="text-xs text-utu-text-muted hover:text-utu-text-primary disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStep(idx, 1)} disabled={idx === form.steps.length - 1}
                        className="text-xs text-utu-text-muted hover:text-utu-text-primary disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      {form.steps.length > 1 && (
                        <button
                          onClick={() => removeStep(idx)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-utu-text-muted">Name *</label>
                      <input
                        className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-2 py-1.5 text-xs text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                        value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)}
                        placeholder="e.g. Manager Approval"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-utu-text-muted">Type *</label>
                      <select
                        className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-2 py-1.5 text-xs text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                        value={step.type} onChange={e => updateStep(idx, 'type', e.target.value)}
                      >
                        {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-utu-text-muted">Assignee Role</label>
                      <input
                        className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-2 py-1.5 text-xs text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                        value={step.assignee_role ?? ''} onChange={e => updateStep(idx, 'assignee_role', e.target.value)}
                        placeholder="e.g. finance_manager"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-utu-text-muted">SLA (hours)</label>
                      <input
                        type="number" min={1}
                        className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-2 py-1.5 text-xs text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                        value={step.sla_hours ?? ''} onChange={e => updateStep(idx, 'sla_hours', parseInt(e.target.value) || undefined)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-utu-text-muted">Escalate To Role</label>
                      <input
                        className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-2 py-1.5 text-xs text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                        value={step.escalate_to_role ?? ''} onChange={e => updateStep(idx, 'escalate_to_role', e.target.value)}
                        placeholder="super_admin"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-utu-text-muted">Auto-approve if amount &lt;</label>
                      <input
                        type="number" min={0}
                        className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-2 py-1.5 text-xs text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                        value={(step.auto_approve_condition as {value?:number})?.value ?? ''}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          updateStep(idx, 'auto_approve_condition',
                            isNaN(val) ? null : { field: 'amount', op: 'lt', value: val });
                        }}
                        placeholder="leave blank to disable"
                      />
                    </div>
                  </div>

                  {idx < form.steps.length - 1 && (
                    <p className="text-xs text-utu-text-muted">
                      On approve: <span className="font-medium text-utu-text-primary">{form.steps[idx + 1]?.name || 'next step'}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: My Tasks ────────────────────────────────────────────────────────────

function MyTasksTab() {
  const qc = useQueryClient();
  const { data: stats }  = useQuery({ queryKey: ['wf-stats'],    queryFn: getWfTaskStats,  refetchInterval: 60_000 });
  const { data: inbox, isLoading } = useQuery({
    queryKey: ['wf-inbox'], queryFn: () => getWfTaskInbox({ limit: 50 }), refetchInterval: 30_000,
  });

  const decide = useMutation({
    mutationFn: wfDecide,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wf-inbox'] }); qc.invalidateQueries({ queryKey: ['wf-stats'] }); },
  });

  const [actionRow, setActionRow] = useState<WfTaskInboxRow | null>(null);
  const [comments, setComments]   = useState('');
  const [deciding, setDeciding]   = useState(false);

  // AI recommendation state
  const [aiRec,        setAiRec]        = useState<WfRecommendation | null>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState('');

  async function handleDecide(row: WfTaskInboxRow, decision: 'approve' | 'reject' | 'escalate') {
    setDeciding(true);
    try {
      await decide.mutateAsync({ instance_id: row.instance_id, step_log_id: row.id, decision, comments });
      setActionRow(null); setComments(''); setAiRec(null); setAiError('');
    } finally {
      setDeciding(false);
    }
  }

  async function handleGetRecommendation(row: WfTaskInboxRow) {
    setAiLoading(true); setAiError(''); setAiRec(null);
    try {
      const res = await getWfRecommendation(row.step_log_id);
      setAiRec(res.recommendation);
    } catch {
      setAiError('AI recommendation unavailable. Please decide manually.');
    } finally {
      setAiLoading(false);
    }
  }

  function openDecideModal(row: WfTaskInboxRow) {
    setActionRow(row); setComments(''); setAiRec(null); setAiError('');
  }

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Pending"        value={stats.pending}        color="text-utu-blue"    icon={<Inbox size={16} />} />
          <StatCard label="Overdue"        value={stats.overdue}        color="text-red-600"     icon={<AlertTriangle size={16} />} />
          <StatCard label="Escalated"      value={stats.escalated}      color="text-orange-600"  icon={<ArrowUpRight size={16} />} />
          <StatCard label="Done This Week" value={stats.completed_week} color="text-green-600"   icon={<CheckCircle2 size={16} />} />
        </div>
      )}

      {/* Task list */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-3">
          <h3 className="text-sm font-semibold text-utu-text-primary">
            Pending Approvals {inbox && <span className="text-utu-text-muted font-normal">({inbox.total})</span>}
          </h3>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['wf-inbox'] })}
            className="text-utu-text-muted hover:text-utu-text-primary"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {isLoading && (
          <div className="px-5 py-10 text-center text-sm text-utu-text-muted">Loading tasks...</div>
        )}

        {!isLoading && inbox?.rows.length === 0 && (
          <div className="px-5 py-12 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-3 text-green-400" />
            <p className="text-sm font-medium text-utu-text-primary">All clear</p>
            <p className="text-xs text-utu-text-muted mt-1">No pending approvals for you right now.</p>
          </div>
        )}

        {inbox?.rows.map(row => (
          <div
            key={row.id}
            className={`flex items-start justify-between gap-4 border-b border-utu-border-default px-5 py-4 last:border-b-0 hover:bg-utu-bg-muted/50 transition-colors ${
              row.sla_health === 'overdue' ? 'border-s-2 border-s-red-400' :
              row.sla_health === 'due_soon' ? 'border-s-2 border-s-yellow-400' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-utu-text-primary">{row.step_name}</span>
                <Badge
                  label={row.step_status}
                  className={
                    row.step_status === 'overdue'   ? 'bg-red-100 text-red-700' :
                    row.step_status === 'escalated' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }
                />
              </div>
              <p className="mt-0.5 text-xs text-utu-text-muted">
                <span className="font-medium">{row.workflow_name}</span>
                {' '}&middot; {row.department} &middot; triggered by {row.initiated_by}
              </p>
              {row.trigger_ref && (
                <p className="mt-0.5 text-xs text-utu-text-muted">
                  Ref: {row.trigger_ref_type} / {row.trigger_ref}
                </p>
              )}
              {row.context && Object.keys(row.context).length > 0 && (
                <p className="mt-1 text-xs text-utu-text-muted">
                  {Object.entries(row.context).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </p>
              )}
              {row.sla_deadline && (
                <p className={`mt-1 text-xs font-medium ${SLA_COLORS[row.sla_health]}`}>
                  <Clock size={11} className="inline me-1" />
                  {fmtDeadline(row.sla_deadline)}
                  {row.sla_deadline && <span className="font-normal text-utu-text-muted ms-1">— due {fmtDate(row.sla_deadline)}</span>}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => openDecideModal(row)}
                className="rounded border border-utu-border-default px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted"
              >
                Decide
              </button>
              <Link
                href={`/admin/workflows/instances/${row.instance_id}`}
                className="rounded border border-utu-border-default px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Decision modal */}
      {actionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-utu-card border border-utu-border-default bg-utu-bg-card shadow-xl overflow-hidden">

            {/* Header */}
            <div className="border-b border-utu-border-default px-6 py-4">
              <h3 className="text-base font-semibold text-utu-text-primary">{actionRow.step_name}</h3>
              <p className="text-xs text-utu-text-muted mt-0.5">
                {actionRow.workflow_name} &middot; {actionRow.department} &middot; {actionRow.initiated_by}
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">

              {/* Context summary */}
              {actionRow.context && Object.keys(actionRow.context).length > 0 && (
                <div className="rounded bg-utu-bg-muted px-3 py-2 text-xs text-utu-text-secondary space-y-0.5">
                  {Object.entries(actionRow.context).map(([k, v]) => (
                    <div key={k}><span className="font-medium">{k.replace(/_/g, ' ')}:</span> {String(v)}</div>
                  ))}
                </div>
              )}

              {/* AI Recommendation panel */}
              <div className="rounded border border-utu-border-default overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-utu-text-primary">
                    <Sparkles size={13} className="text-utu-blue" />
                    AI Recommendation
                  </span>
                  {!aiRec && !aiLoading && (
                    <button
                      onClick={() => handleGetRecommendation(actionRow)}
                      className="rounded bg-utu-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Analyse with Claude
                    </button>
                  )}
                  {aiLoading && (
                    <span className="text-xs text-utu-text-muted animate-pulse">Analysing...</span>
                  )}
                </div>

                {aiError && (
                  <div className="px-4 py-3 text-xs text-red-600">{aiError}</div>
                )}

                {aiRec && (
                  <div className="px-4 py-3 space-y-3">
                    {/* Decision + confidence */}
                    <div className="flex items-center gap-2">
                      {aiRec.recommended_decision === 'approve' && (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          <CheckCircle2 size={11} /> Recommend Approve
                        </span>
                      )}
                      {aiRec.recommended_decision === 'reject' && (
                        <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          <XCircle size={11} /> Recommend Reject
                        </span>
                      )}
                      {aiRec.recommended_decision === 'investigate' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                          <AlertTriangle size={11} /> Investigate First
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        aiRec.confidence === 'high'   ? 'bg-green-50 text-green-600' :
                        aiRec.confidence === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                                        'bg-slate-100 text-slate-500'
                      }`}>
                        {aiRec.confidence} confidence
                      </span>
                      <button
                        onClick={() => handleGetRecommendation(actionRow)}
                        className="ms-auto text-utu-text-muted hover:text-utu-text-primary"
                        title="Refresh recommendation"
                      >
                        <RefreshCw size={11} />
                      </button>
                    </div>

                    {/* Context summary */}
                    <p className="text-xs text-utu-text-secondary italic">{aiRec.context_summary}</p>

                    {/* Rationale */}
                    <p className="text-xs text-utu-text-primary">{aiRec.rationale}</p>

                    {/* Risk factors */}
                    {aiRec.risk_factors.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-medium text-red-600 mb-1">
                          <ShieldAlert size={11} /> Risk factors
                        </p>
                        <ul className="space-y-0.5">
                          {aiRec.risk_factors.map((r, i) => (
                            <li key={i} className="text-xs text-red-700 ps-3 before:content-['•'] before:me-1.5">{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Policy notes */}
                    {aiRec.policy_notes.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-medium text-utu-text-muted mb-1">
                          <Info size={11} /> Policy reference
                        </p>
                        <ul className="space-y-0.5">
                          {aiRec.policy_notes.map((n, i) => (
                            <li key={i} className="text-xs text-utu-text-secondary ps-3 before:content-['•'] before:me-1.5">{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {!aiRec && !aiLoading && !aiError && (
                  <div className="px-4 py-3 text-xs text-utu-text-muted">
                    Click "Analyse with Claude" to get an AI-powered recommendation based on the workflow context and company policies.
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <label className="text-xs font-medium text-utu-text-muted">Comments (optional)</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue resize-none"
                  value={comments} onChange={e => setComments(e.target.value)}
                  placeholder="Add context for your decision..."
                />
              </div>

              {/* Decision buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecide(actionRow, 'approve')} disabled={deciding}
                  className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={12} className="inline me-1" />Approve
                </button>
                <button
                  onClick={() => handleDecide(actionRow, 'reject')} disabled={deciding}
                  className="flex-1 rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle size={12} className="inline me-1" />Reject
                </button>
                <button
                  onClick={() => handleDecide(actionRow, 'escalate')} disabled={deciding}
                  className="flex-1 rounded bg-orange-500 px-3 py-2 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  <ArrowUpRight size={12} className="inline me-1" />Escalate
                </button>
              </div>
            </div>

            <div className="border-t border-utu-border-default px-6 py-3">
              <button
                onClick={() => { setActionRow(null); setComments(''); setAiRec(null); setAiError(''); }}
                className="w-full text-center text-xs text-utu-text-muted hover:text-utu-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Workflow Builder Modal ────────────────────────────────────────────────

function WorkflowBuilderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [department,  setDepartment]  = useState('');
  const [context,     setContext]     = useState('');
  const [draft,       setDraft]       = useState<WorkflowBuilderDraft | null>(null);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function generate() {
    if (!description.trim()) return;
    setGenerating(true); setError(''); setDraft(null);
    try {
      const res = await generateWorkflowDraft({ description: description.trim(), department: department || undefined, context: context.trim() || undefined });
      if (res.data) setDraft(res.data);
      else setError('AI returned no draft. Try a more detailed description.');
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function saveToEngine() {
    if (!draft) return;
    setSaving(true); setError('');
    try {
      await createWfDefinition({
        name:           draft.name,
        department:     draft.department,
        trigger_event:  draft.trigger_event,
        description:    draft.description,
        steps:          draft.steps as WfStepDef[],
        approval_chain: draft.approval_chain,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-12 px-4" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-utu-navy text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider">✦ AI Workflow Builder</p>
            <p className="font-semibold">Generate a Workflow from Plain English</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Input form */}
          {!draft && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Workflow Description *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the business process in plain English. E.g.: When an employee submits a leave request, the line manager approves it within 48 hours, HR records it, and the employee gets a confirmation email."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department (optional)</label>
                  <select value={department} onChange={e => setDepartment(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-utu-blue">
                    <option value="">Let AI decide</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Context</label>
                  <input value={context} onChange={e => setContext(e.target.value)} placeholder="E.g.: Amounts above SAR 50,000 need CFO sign-off" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={generate} disabled={generating || !description.trim()} className="flex items-center gap-2 bg-utu-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-utu-blue disabled:opacity-50">
                  <Sparkles size={14} />
                  {generating ? 'Generating…' : 'Generate Draft'}
                </button>
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Draft preview */}
          {draft && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <p className="text-lg font-bold text-utu-text-primary">{draft.name}</p>
                  <p className="text-xs text-gray-500">
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded">{draft.trigger_event}</code>
                    &nbsp;&middot;&nbsp;{draft.department}&nbsp;&middot;&nbsp;{draft.steps.length} steps
                  </p>
                </div>
                <button onClick={() => setDraft(null)} className="ms-auto text-xs text-blue-600 hover:underline">Edit description</button>
              </div>

              <p className="text-sm text-gray-700">{draft.description}</p>

              {/* Builder notes */}
              {draft.builder_notes.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">AI Notes for Review</p>
                  <ul className="space-y-0.5">
                    {draft.builder_notes.map((n, i) => <li key={i} className="text-xs text-amber-800">&bull; {n}</li>)}
                  </ul>
                </div>
              )}

              {/* Steps */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Steps</p>
                <div className="space-y-2">
                  {draft.steps.map((step, i) => (
                    <div key={step.id} className="rounded-lg border border-gray-200 p-3 flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-utu-navy text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-utu-text-primary">{step.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${step.type === 'approval' ? 'bg-blue-100 text-blue-700' : step.type === 'notification' ? 'bg-green-100 text-green-700' : step.type === 'condition' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{step.type}</span>
                          <span className="text-xs text-gray-400">{step.sla_hours}h SLA</span>
                          <span className="text-xs text-gray-500 ms-auto">{step.assignee_role}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={saveToEngine} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save to Workflow Engine'}
                </button>
                <button onClick={generate} disabled={generating} className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                  <Sparkles size={13} /> Regenerate
                </button>
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm ms-auto">Discard</button>
              </div>
              <p className="text-xs text-gray-400 text-center">Review all steps and notes before saving. Saved as draft — activate manually after review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Definitions ─────────────────────────────────────────────────────────

function DefinitionsTab() {
  const qc = useQueryClient();
  const [showNew,     setShowNew]     = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [deptFilter,  setDeptFilter]  = useState('');
  const [statusFilter, setStatusFilter] = useState<WfDefinitionStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['wf-definitions', deptFilter, statusFilter],
    queryFn:  () => getWfDefinitions({
      department: deptFilter || undefined,
      status:     (statusFilter as WfDefinitionStatus) || undefined,
      limit: 100,
    }),
  });

  const approve = useMutation({
    mutationFn: approveWfDefinition,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-definitions'] }),
  });
  const archiveDef = useMutation({
    mutationFn: archiveWfDefinition,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-definitions'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
          value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as WfDefinitionStatus | '')}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 rounded border border-purple-300 bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
        >
          <Sparkles size={14} /> Generate with AI
        </button>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded bg-utu-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={14} /> New Workflow
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-utu-border-default bg-utu-bg-muted">
            <tr>
              {['Name','Department','Trigger Event','Version','Status','Steps','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-utu-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading...</td></tr>
            )}
            {!isLoading && data?.rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-utu-text-muted">No definitions found.</td></tr>
            )}
            {data?.rows.map(def => (
              <tr key={def.id} className="border-b border-utu-border-default last:border-b-0 hover:bg-utu-bg-muted/40">
                <td className="px-4 py-3 font-medium text-utu-text-primary">{def.name}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{def.department}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-utu-bg-muted px-1.5 py-0.5 rounded text-utu-text-secondary">
                    {def.trigger_event}
                  </code>
                </td>
                <td className="px-4 py-3 text-utu-text-muted text-xs">v{def.version}</td>
                <td className="px-4 py-3">
                  <Badge label={def.status} className={DEF_STATUS_COLORS[def.status]} />
                </td>
                <td className="px-4 py-3 text-utu-text-muted">
                  {Array.isArray(def.steps) ? def.steps.length : 0} steps
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/workflows/${def.id}`}
                      className="text-xs font-medium text-utu-blue hover:underline"
                    >
                      Edit
                    </Link>
                    {def.status === 'draft' && (
                      <button
                        onClick={() => approve.mutate(def.id)}
                        className="text-xs font-medium text-green-600 hover:underline"
                      >
                        Activate
                      </button>
                    )}
                    {def.status === 'active' && (
                      <button
                        onClick={() => { if (confirm('Archive this workflow?')) archiveDef.mutate(def.id); }}
                        className="text-xs font-medium text-slate-500 hover:underline"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewDefinitionPanel
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ['wf-definitions'] }); }}
        />
      )}

      {showBuilder && (
        <WorkflowBuilderModal
          onClose={() => setShowBuilder(false)}
          onSaved={() => { setShowBuilder(false); qc.invalidateQueries({ queryKey: ['wf-definitions'] }); }}
        />
      )}
    </div>
  );
}

// ─── Tab: Instances ───────────────────────────────────────────────────────────

function InstancesTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<WfInstanceStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['wf-instances', statusFilter, deptFilter],
    queryFn:  () => getWfInstances({
      status:     (statusFilter as WfInstanceStatus) || undefined,
      department: deptFilter || undefined,
      limit: 100,
    }),
    refetchInterval: 30_000,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelWfInstance(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-instances'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as WfInstanceStatus | '')}
        >
          <option value="">All statuses</option>
          {(['pending','in_progress','overdue','approved','rejected','cancelled'] as WfInstanceStatus[]).map(s => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
        <select
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
          value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['wf-instances'] })}
          className="ms-auto text-utu-text-muted hover:text-utu-text-primary"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-utu-border-default bg-utu-bg-muted">
            <tr>
              {['Workflow','Department','Trigger','Initiated By','Status','Started','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-utu-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading...</td></tr>
            )}
            {!isLoading && data?.rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-utu-text-muted">No instances found.</td></tr>
            )}
            {data?.rows.map(inst => (
              <tr key={inst.id} className="border-b border-utu-border-default last:border-b-0 hover:bg-utu-bg-muted/40">
                <td className="px-4 py-3 font-medium text-utu-text-primary">{inst.workflow_name ?? '—'}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{inst.department ?? '—'}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-utu-bg-muted px-1.5 py-0.5 rounded text-utu-text-secondary">
                    {inst.trigger_event}
                  </code>
                  {inst.trigger_ref && <span className="ms-1 text-xs text-utu-text-muted">({inst.trigger_ref})</span>}
                </td>
                <td className="px-4 py-3 text-utu-text-secondary text-xs">{inst.initiated_by}</td>
                <td className="px-4 py-3">
                  <Badge label={inst.status.replace('_',' ')} className={INSTANCE_STATUS_COLORS[inst.status]} />
                </td>
                <td className="px-4 py-3 text-utu-text-muted text-xs">{fmtDate(inst.started_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/workflows/instances/${inst.id}`}
                      className="text-xs font-medium text-utu-blue hover:underline"
                    >
                      View
                    </Link>
                    {['pending','in_progress','overdue'].includes(inst.status) && (
                      <button
                        onClick={() => { if (confirm('Cancel this workflow?')) cancel.mutate({ id: inst.id }); }}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['wf-dashboard'],
    queryFn:  getWfDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-utu-text-muted">Loading dashboard...</div>;
  }

  if (!data) return null;

  const { sla_health, active_by_department, instances_by_status, recently_completed } = data;
  const totalActive = instances_by_status.find(r => r.status === 'in_progress')?.count ?? 0;
  const totalOverdue = instances_by_status.find(r => r.status === 'overdue')?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* SLA Health strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="On Track"  value={sla_health.on_track}  color="text-green-600"  icon={<Activity size={16} />} />
        <StatCard label="Due Soon"  value={sla_health.due_soon}  color="text-yellow-600" icon={<Clock size={16} />} />
        <StatCard label="Overdue"   value={sla_health.overdue}   color="text-red-600"    icon={<AlertTriangle size={16} />} />
        <StatCard label="Active"    value={totalActive}           color="text-utu-blue"   icon={<Zap size={16} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By department */}
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-utu-text-primary">Active by Department</h3>
          {active_by_department.length === 0 && (
            <p className="text-sm text-utu-text-muted">No active workflows.</p>
          )}
          <div className="space-y-2">
            {active_by_department.map(row => (
              <div key={row.department} className="flex items-center gap-3">
                <span className="w-28 truncate text-xs text-utu-text-secondary">{row.department}</span>
                <div className="flex-1 rounded-full bg-utu-bg-muted h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-utu-blue"
                    style={{ width: `${Math.min(100, (Number(row.count) / Math.max(...active_by_department.map(r => Number(r.count)))) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium text-utu-text-primary">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By status */}
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-utu-text-primary">Instances by Status</h3>
          <div className="space-y-2">
            {instances_by_status.map(row => (
              <div key={row.status} className="flex items-center justify-between">
                <Badge
                  label={row.status.replace('_',' ')}
                  className={INSTANCE_STATUS_COLORS[row.status as WfInstanceStatus] ?? 'bg-slate-100 text-slate-600'}
                />
                <span className="text-sm font-medium text-utu-text-primary">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recently completed */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <div className="border-b border-utu-border-default px-5 py-3">
          <h3 className="text-sm font-semibold text-utu-text-primary">Recently Completed</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-utu-border-default bg-utu-bg-muted">
            <tr>
              {['Workflow','Department','Initiated By','Outcome','Completed'].map(h => (
                <th key={h} className="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-utu-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recently_completed.map(inst => (
              <tr key={inst.id} className="border-b border-utu-border-default last:border-b-0 hover:bg-utu-bg-muted/40">
                <td className="px-4 py-3 font-medium text-utu-text-primary">
                  <Link href={`/admin/workflows/instances/${inst.id}`} className="hover:text-utu-blue">
                    {inst.workflow_name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-utu-text-secondary">{inst.department ?? '—'}</td>
                <td className="px-4 py-3 text-utu-text-secondary text-xs">{inst.initiated_by}</td>
                <td className="px-4 py-3">
                  <Badge label={inst.status} className={INSTANCE_STATUS_COLORS[inst.status]} />
                </td>
                <td className="px-4 py-3 text-utu-text-muted text-xs">{fmtDate(inst.completed_at)}</td>
              </tr>
            ))}
            {recently_completed.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-utu-text-muted">No completed workflows yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-right text-xs text-utu-text-muted">
        Generated at {fmtDate(data.generated_at)}
      </p>
    </div>
  );
}

// ─── Tab: Analytics ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['wf-analytics-overview'],
    queryFn:  getWfAnalyticsOverview,
    refetchInterval: 120_000,
  });
  const { data: byDef, isLoading: defLoading } = useQuery({
    queryKey: ['wf-analytics-by-def'],
    queryFn:  () => getWfAnalyticsByDefinition(50),
    refetchInterval: 120_000,
  });
  const { data: byDept } = useQuery({
    queryKey: ['wf-analytics-by-dept'],
    queryFn:  getWfAnalyticsByDepartment,
    refetchInterval: 120_000,
  });
  const { data: bottlenecks } = useQuery({
    queryKey: ['wf-analytics-bottlenecks'],
    queryFn:  getWfAnalyticsBottlenecks,
    refetchInterval: 120_000,
  });
  const { data: trend } = useQuery({
    queryKey: ['wf-analytics-trend'],
    queryFn:  getWfAnalyticsTrend,
    refetchInterval: 120_000,
  });

  function fmt(n: number | null, suffix = '') {
    if (n === null || n === undefined) return '—';
    return `${n}${suffix}`;
  }
  function fmtHours(h: number | null) {
    if (h === null || h === undefined) return '—';
    if (h < 1) return `${Math.round(h * 60)}m`;
    return `${h}h`;
  }
  function pctBar(pct: number | null, color: string) {
    const w = Math.min(Math.max(pct ?? 0, 0), 100);
    return (
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Overview KPI strip */}
      {ovLoading && <p className="text-sm text-utu-text-muted">Loading analytics...</p>}
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Total Instances"    value={overview.total_instances}              icon={<BarChart2 size={16} />} />
          <StatCard label="Active Now"          value={overview.active}           color="text-utu-blue"   icon={<Activity size={16} />} />
          <StatCard label="Approval Rate"       value={fmt(overview.approval_rate_pct, '%')} color={
            overview.approval_rate_pct !== null && overview.approval_rate_pct >= 80 ? 'text-green-600' :
            overview.approval_rate_pct !== null && overview.approval_rate_pct >= 60 ? 'text-yellow-600' : 'text-red-600'
          } icon={<Target size={16} />} />
          <StatCard label="Avg Completion"      value={fmtHours(overview.avg_completion_hours)}           icon={<Timer size={16} />} />
          <StatCard label="SLA Breach Rate"     value={fmt(overview.sla_breach_rate_pct, '%')} color={
            overview.sla_breach_rate_pct <= 10 ? 'text-green-600' :
            overview.sla_breach_rate_pct <= 25 ? 'text-yellow-600' : 'text-red-600'
          } icon={<AlertTriangle size={16} />} />
          <StatCard label="Done (30d)"          value={overview.completed_30d}    color="text-green-600"  icon={<CheckCircle2 size={16} />} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* By workflow definition */}
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
          <div className="border-b border-utu-border-default px-5 py-3">
            <h3 className="text-sm font-semibold text-utu-text-primary flex items-center gap-2">
              <BarChart2 size={15} className="text-utu-blue" />
              Performance by Workflow
            </h3>
          </div>
          {defLoading && <p className="px-5 py-4 text-sm text-utu-text-muted">Loading...</p>}
          <div className="divide-y divide-utu-border-default">
            {byDef?.filter(d => d.total_runs > 0).map(d => (
              <div key={d.definition_id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-utu-text-primary truncate">{d.workflow_name}</p>
                    <p className="text-xs text-utu-text-muted">{d.department} &middot; {d.total_runs} runs</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-semibold ${
                      d.approval_rate_pct !== null && d.approval_rate_pct >= 80 ? 'text-green-600' :
                      d.approval_rate_pct !== null && d.approval_rate_pct >= 60 ? 'text-yellow-600' : 'text-utu-text-muted'
                    }`}>{fmt(d.approval_rate_pct, '% approved')}</p>
                    <p className="text-xs text-utu-text-muted">{fmtHours(d.avg_completion_hours)} avg</p>
                  </div>
                </div>
                {d.approval_rate_pct !== null && pctBar(d.approval_rate_pct, 'bg-green-400')}
                {d.bottleneck_step && (
                  <p className="mt-1 text-xs text-utu-text-muted">
                    <Timer size={10} className="inline me-1" />
                    Slowest: <span className="font-medium">{d.bottleneck_step}</span>
                    {d.bottleneck_avg_hours !== null && ` (${fmtHours(d.bottleneck_avg_hours)} avg)`}
                  </p>
                )}
              </div>
            ))}
            {byDef?.every(d => d.total_runs === 0) && (
              <p className="px-5 py-6 text-center text-sm text-utu-text-muted">No completed runs yet.</p>
            )}
          </div>
        </div>

        {/* Right column: Departments + Bottlenecks */}
        <div className="space-y-6">

          {/* By department */}
          {byDept && byDept.some(d => d.total_runs > 0) && (
            <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
              <div className="border-b border-utu-border-default px-5 py-3">
                <h3 className="text-sm font-semibold text-utu-text-primary flex items-center gap-2">
                  <Layers size={15} className="text-utu-blue" />
                  By Department
                </h3>
              </div>
              <div className="divide-y divide-utu-border-default">
                {byDept.filter(d => d.total_runs > 0).map(d => (
                  <div key={d.department} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-utu-text-primary capitalize">{d.department}</p>
                      <p className="text-xs text-utu-text-muted">{d.total_runs} total · {d.active} active</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${
                        d.approval_rate_pct !== null && d.approval_rate_pct >= 80 ? 'text-green-600' :
                        d.approval_rate_pct !== null ? 'text-yellow-600' : 'text-utu-text-muted'
                      }`}>{fmt(d.approval_rate_pct, '%')}</p>
                      {d.overdue > 0 && (
                        <p className="text-xs text-red-500">{d.overdue} overdue</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottleneck steps */}
          {bottlenecks && bottlenecks.length > 0 && (
            <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
              <div className="border-b border-utu-border-default px-5 py-3">
                <h3 className="text-sm font-semibold text-utu-text-primary flex items-center gap-2">
                  <Timer size={15} className="text-orange-500" />
                  Slowest Steps (Bottlenecks)
                </h3>
              </div>
              <div className="divide-y divide-utu-border-default">
                {bottlenecks.map((b, i) => (
                  <div key={i} className="px-5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-utu-text-primary truncate">{b.step_name}</p>
                        <p className="text-xs text-utu-text-muted truncate">{b.workflow_name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-orange-600">{fmtHours(b.avg_wait_hours)} avg</p>
                        <p className="text-xs text-utu-text-muted">{b.total_decisions} decisions</p>
                      </div>
                    </div>
                    {b.escalation_count > 0 && (
                      <p className="mt-0.5 text-xs text-red-500">
                        <ArrowUpRight size={10} className="inline me-1" />
                        {b.escalation_count} escalation{b.escalation_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Monthly trend */}
      {trend && trend.length > 0 && (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
          <div className="border-b border-utu-border-default px-5 py-3">
            <h3 className="text-sm font-semibold text-utu-text-primary flex items-center gap-2">
              <TrendingUp size={15} className="text-utu-blue" />
              Monthly Completion Trend (trailing 12 months)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-utu-border-default bg-utu-bg-muted">
                  <th className="px-5 py-2 text-start font-medium text-utu-text-muted">Month</th>
                  <th className="px-4 py-2 text-end font-medium text-utu-text-muted">Completed</th>
                  <th className="px-4 py-2 text-end font-medium text-green-600">Approved</th>
                  <th className="px-4 py-2 text-end font-medium text-red-500">Rejected</th>
                  <th className="px-5 py-2 text-end font-medium text-utu-text-muted">Approval %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-utu-border-default">
                {[...trend].reverse().map(t => {
                  const rate = t.approved + t.rejected > 0
                    ? Math.round((t.approved / (t.approved + t.rejected)) * 100) : null;
                  return (
                    <tr key={t.month} className="hover:bg-utu-bg-muted/40">
                      <td className="px-5 py-2 font-medium text-utu-text-primary">{t.month}</td>
                      <td className="px-4 py-2 text-end text-utu-text-secondary">{t.completed}</td>
                      <td className="px-4 py-2 text-end text-green-600">{t.approved}</td>
                      <td className="px-4 py-2 text-end text-red-500">{t.rejected}</td>
                      <td className="px-5 py-2 text-end">
                        {rate !== null ? (
                          <span className={rate >= 80 ? 'text-green-600 font-medium' : rate >= 60 ? 'text-yellow-600' : 'text-red-500'}>
                            {rate}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ovLoading && overview && overview.total_instances === 0 && (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card px-5 py-12 text-center">
          <BarChart2 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-utu-text-primary">No workflow data yet</p>
          <p className="text-xs text-utu-text-muted mt-1">Analytics will populate as workflows run and complete.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [tab, setTab] = useState<Tab>('My Tasks');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Workflow Engine</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Business process automation across all 18 departments.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-secondary hover:text-utu-text-primary'
            }`}
          >
            {t === 'My Tasks'    && <Inbox size={14} />}
            {t === 'Definitions' && <BookOpen size={14} />}
            {t === 'Instances'   && <Layers size={14} />}
            {t === 'Dashboard'   && <LayoutDashboard size={14} />}
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'My Tasks'    && <MyTasksTab />}
      {tab === 'Definitions' && <DefinitionsTab />}
      {tab === 'Instances'   && <InstancesTab />}
      {tab === 'Dashboard'   && <DashboardTab />}
      {tab === 'Analytics'   && <AnalyticsTab />}
    </div>
  );
}
