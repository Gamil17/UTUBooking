'use client';

/**
 * /admin/workflows/[id] — Workflow Definition Detail + Step Builder
 *
 * Sections:
 *   Header        — name, status, version badges + action buttons
 *   Metadata      — department, trigger_event, description, approval_chain
 *   Step Builder  — ordered list of steps, each fully editable
 *   Version History — all versions of this definition
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Save, CheckCircle, Archive,
  GitBranch, Trash2, ChevronUp, ChevronDown, Info,
  Zap, Clock, Users, AlertTriangle,
} from 'lucide-react';
import {
  getWfDefinition, updateWfDefinition, approveWfDefinition,
  archiveWfDefinition, newWfDefinitionVersion, getWfDefinitionVersions,
  type WfDefinition, type WfStepDef, type WfDefinitionStatus,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'finance','hr','legal','compliance','ops','dev','products',
  'revenue','customer-success','procurement','fraud','analytics',
  'marketing','sales','bizdev','affiliates','corporate','advertising',
];

const STEP_TYPES = ['action','approval','condition','notification','ai_check'] as const;

const STEP_TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  action:       { label: 'Action',       icon: <Zap size={12} />,          color: 'bg-purple-100 text-purple-700' },
  approval:     { label: 'Approval',     icon: <CheckCircle size={12} />,  color: 'bg-blue-100 text-blue-700' },
  condition:    { label: 'Condition',    icon: <Info size={12} />,         color: 'bg-yellow-100 text-yellow-700' },
  notification: { label: 'Notification', icon: <Users size={12} />,        color: 'bg-teal-100 text-teal-700' },
  ai_check:     { label: 'AI Check',     icon: <Zap size={12} />,          color: 'bg-indigo-100 text-indigo-700' },
};

const DEF_STATUS_COLORS: Record<WfDefinitionStatus, string> = {
  draft:    'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-500',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step, idx, total, isDraft, isExpanded,
  onChange, onRemove, onMoveUp, onMoveDown, onToggle,
}: {
  step:       WfStepDef;
  idx:        number;
  total:      number;
  isDraft:    boolean;
  isExpanded: boolean;
  onChange:   (k: keyof WfStepDef, v: unknown) => void;
  onRemove:   () => void;
  onMoveUp:   () => void;
  onMoveDown: () => void;
  onToggle:   () => void;
}) {
  const typeInfo = STEP_TYPE_INFO[step.type] ?? STEP_TYPE_INFO.action;

  return (
    <div className={`rounded-lg border ${isExpanded ? 'border-utu-blue' : 'border-utu-border-default'} bg-utu-bg-card overflow-hidden`}>
      {/* Step header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-utu-bg-muted/50 select-none"
        onClick={onToggle}
      >
        {/* Step number */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-utu-bg-muted text-xs font-bold text-utu-text-secondary">
          {idx + 1}
        </span>

        {/* Type badge */}
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${typeInfo.color}`}>
          {typeInfo.icon} {typeInfo.label}
        </span>

        {/* Name */}
        <span className="flex-1 truncate text-sm font-medium text-utu-text-primary">
          {step.name || <span className="italic text-utu-text-muted">Unnamed step</span>}
        </span>

        {/* SLA tag */}
        {step.sla_hours && (
          <span className="flex items-center gap-1 text-xs text-utu-text-muted shrink-0">
            <Clock size={11} /> {step.sla_hours}h
          </span>
        )}

        {/* Reorder + delete */}
        {isDraft && (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={onMoveUp} disabled={idx === 0}
              className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={onMoveDown} disabled={idx === total - 1}
              className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>
            {total > 1 && (
              <button
                onClick={onRemove}
                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                title="Remove step"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-utu-border-default px-4 py-4 space-y-4 bg-utu-bg-muted/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Step Name *</label>
              <input
                disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={step.name}
                onChange={e => onChange('name', e.target.value)}
                placeholder="e.g. Finance Manager Review"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Step Type *</label>
              <select
                disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={step.type}
                onChange={e => onChange('type', e.target.value)}
              >
                {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Assignee Role</label>
              <input
                disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={step.assignee_role ?? ''}
                onChange={e => onChange('assignee_role', e.target.value || undefined)}
                placeholder="e.g. finance_manager"
              />
              <p className="mt-0.5 text-xs text-utu-text-muted">User role in DB</p>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Assignee Email (override)</label>
              <input
                disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={step.assignee_email ?? ''}
                onChange={e => onChange('assignee_email', e.target.value || undefined)}
                placeholder="direct@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">SLA (hours)</label>
              <input
                type="number" min={1} disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={step.sla_hours ?? ''}
                onChange={e => onChange('sla_hours', parseInt(e.target.value) || undefined)}
                placeholder="24"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Escalate To Role</label>
              <input
                disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={step.escalate_to_role ?? ''}
                onChange={e => onChange('escalate_to_role', e.target.value || undefined)}
                placeholder="super_admin"
              />
              <p className="mt-0.5 text-xs text-utu-text-muted">Auto-escalated to this role on SLA breach</p>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">
                Auto-approve if <code className="bg-utu-bg-muted px-1 rounded">amount</code> &lt;
              </label>
              <input
                type="number" min={0} disabled={!isDraft}
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
                value={(step.auto_approve_condition as {value?:number})?.value ?? ''}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  onChange('auto_approve_condition', isNaN(val) ? null : { field: 'amount', op: 'lt', value: val });
                }}
                placeholder="leave blank to disable"
              />
              <p className="mt-0.5 text-xs text-utu-text-muted">AI skips human approval below this value</p>
            </div>
          </div>

          {/* Flow display */}
          <div className="rounded bg-utu-bg-muted px-3 py-2">
            <p className="text-xs text-utu-text-muted">
              <span className="font-medium text-utu-text-secondary">On Approve:</span>{' '}
              {step.on_approve ? <code className="text-xs">{step.on_approve}</code> : 'workflow ends (approved)'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowDefinitionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: def, isLoading } = useQuery({
    queryKey: ['wf-definition', id],
    queryFn:  () => getWfDefinition(id),
  });

  const { data: versions } = useQuery({
    queryKey: ['wf-versions', id],
    queryFn:  () => getWfDefinitionVersions(id),
  });

  // Local editable state
  const [name, setName]             = useState('');
  const [department, setDepartment] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [description, setDescription]   = useState('');
  const [approvalChain, setApprovalChain] = useState('');
  const [steps, setSteps]           = useState<WfStepDef[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [dirty, setDirty]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // Sync from server data
  useEffect(() => {
    if (!def) return;
    setName(def.name);
    setDepartment(def.department);
    setTriggerEvent(def.trigger_event);
    setDescription(def.description ?? '');
    setApprovalChain(Array.isArray(def.approval_chain) ? def.approval_chain.join(', ') : '');
    setSteps(Array.isArray(def.steps) ? def.steps : []);
    setDirty(false);
  }, [def]);

  const isDraft = def?.status === 'draft';

  // ── Step helpers ──────────────────────────────────────────────────────────

  function updateStep(idx: number, k: keyof WfStepDef, v: unknown) {
    setSteps(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [k]: v };
      // Rewire on_approve chain
      next.forEach((s, i) => { s.on_approve = i < next.length - 1 ? next[i + 1].id : undefined; });
      return next;
    });
    setDirty(true);
  }

  function addStep() {
    const newStep: WfStepDef = {
      id:               `step_${Date.now()}`,
      name:             '',
      type:             'approval',
      assignee_role:    '',
      sla_hours:        24,
      escalate_to_role: 'super_admin',
    };
    setSteps(prev => {
      const next = [...prev, newStep];
      next.forEach((s, i) => { s.on_approve = i < next.length - 1 ? next[i + 1].id : undefined; });
      return next;
    });
    setExpandedStep(newStep.id);
    setDirty(true);
  }

  function removeStep(idx: number) {
    setSteps(prev => {
      const next = prev.filter((_, i) => i !== idx);
      next.forEach((s, i) => { s.on_approve = i < next.length - 1 ? next[i + 1].id : undefined; });
      return next;
    });
    setDirty(true);
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      next.forEach((s, i) => { s.on_approve = i < next.length - 1 ? next[i + 1].id : undefined; });
      return next;
    });
    setDirty(true);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: () => updateWfDefinition(id, {
      name: name.trim(),
      department,
      trigger_event: triggerEvent.trim().toLowerCase().replace(/\s+/g, '_'),
      description:   description.trim() || undefined,
      steps,
      approval_chain: approvalChain.split(',').map(r => r.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      setDirty(false);
      setSuccess('Saved');
      setTimeout(() => setSuccess(''), 2000);
      qc.invalidateQueries({ queryKey: ['wf-definition', id] });
    },
    onError: () => setError('Save failed. Please try again.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveWfDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-definition', id] }),
    onError: () => setError('Failed to activate.'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveWfDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-definition', id] }),
    onError: () => setError('Failed to archive.'),
  });

  const newVersionMutation = useMutation({
    mutationFn: () => newWfDefinitionVersion(id),
    onSuccess: (newDef) => {
      router.push(`/admin/workflows/${newDef.id}`);
    },
    onError: () => setError('Failed to create new version.'),
  });

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!department)  { setError('Department is required'); return; }
    if (!triggerEvent.trim()) { setError('Trigger event is required'); return; }
    if (steps.some(s => !s.name.trim())) { setError('All steps must have a name'); return; }
    setError(''); setSaving(true);
    try { await saveMutation.mutateAsync(); }
    finally { setSaving(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-utu-text-muted">Loading definition...</div>
    );
  }

  if (!def) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-utu-text-muted">Definition not found.</p>
        <Link href="/admin/workflows" className="mt-3 inline-block text-sm text-utu-blue hover:underline">
          Back to Workflows
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/workflows" className="mt-1 text-utu-text-muted hover:text-utu-text-primary shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-utu-text-primary truncate">{def.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DEF_STATUS_COLORS[def.status]}`}>
              {def.status}
            </span>
            <span className="text-xs text-utu-text-muted">v{def.version}</span>
          </div>
          <p className="mt-1 text-xs text-utu-text-muted">
            {def.department} &middot; trigger: <code className="bg-utu-bg-muted px-1 rounded">{def.trigger_event}</code>
            &middot; created by {def.created_by}
            {def.approved_by && <span> &middot; approved by {def.approved_by} on {fmtDate(def.approved_at)}</span>}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {isDraft && dirty && (
            <button
              onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 rounded bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {isDraft && !dirty && (
            <button
              onClick={() => { if (confirm('Activate this workflow? It will become the live version.')) approveMutation.mutate(); }}
              className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <CheckCircle size={13} /> Activate
            </button>
          )}
          {def.status === 'active' && (
            <button
              onClick={() => newVersionMutation.mutate()}
              className="flex items-center gap-1.5 rounded border border-utu-border-default px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted"
            >
              <GitBranch size={13} /> New Version
            </button>
          )}
          {def.status === 'active' && (
            <button
              onClick={() => { if (confirm('Archive this workflow? All new instances will stop.')) archiveMutation.mutate(); }}
              className="flex items-center gap-1.5 rounded border border-utu-border-default px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted"
            >
              <Archive size={13} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error   && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">{success}</p>}

      {!isDraft && (
        <div className="flex items-center gap-2 rounded border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          <AlertTriangle size={14} />
          This definition is <strong>{def.status}</strong>. To make changes, create a New Version.
        </div>
      )}

      {/* Metadata */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-utu-text-primary">Definition Settings</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Workflow Name *</label>
            <input
              disabled={!isDraft}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
              value={name} onChange={e => { setName(e.target.value); setDirty(true); }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Department *</label>
            <select
              disabled={!isDraft}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
              value={department} onChange={e => { setDepartment(e.target.value); setDirty(true); }}
            >
              <option value="">Select...</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Trigger Event *</label>
            <input
              disabled={!isDraft}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
              value={triggerEvent} onChange={e => { setTriggerEvent(e.target.value); setDirty(true); }}
              placeholder="e.g. expense_submitted"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Approval Chain (roles, comma-separated)</label>
            <input
              disabled={!isDraft}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue disabled:opacity-60"
              value={approvalChain} onChange={e => { setApprovalChain(e.target.value); setDirty(true); }}
              placeholder="super_admin"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-utu-text-muted">Description</label>
          <textarea
            rows={2} disabled={!isDraft}
            className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue resize-none disabled:opacity-60"
            value={description} onChange={e => { setDescription(e.target.value); setDirty(true); }}
            placeholder="What does this workflow do?"
          />
        </div>
      </div>

      {/* Step Builder */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-utu-text-primary">
            Steps <span className="ms-1 text-utu-text-muted font-normal">({steps.length})</span>
          </h2>
          {isDraft && (
            <button
              onClick={addStep}
              className="flex items-center gap-1.5 text-xs font-medium text-utu-blue hover:underline"
            >
              <Plus size={12} /> Add Step
            </button>
          )}
        </div>

        {steps.length === 0 && (
          <div className="rounded border-2 border-dashed border-utu-border-default py-8 text-center">
            <p className="text-sm text-utu-text-muted">No steps yet.</p>
            {isDraft && (
              <button onClick={addStep} className="mt-2 text-xs font-medium text-utu-blue hover:underline">
                Add the first step
              </button>
            )}
          </div>
        )}

        {/* Flow connector + step cards */}
        <div className="space-y-0">
          {steps.map((step, idx) => (
            <div key={step.id}>
              <StepCard
                step={step} idx={idx} total={steps.length} isDraft={isDraft}
                isExpanded={expandedStep === step.id}
                onToggle={() => setExpandedStep(prev => prev === step.id ? null : step.id)}
                onChange={(k, v) => updateStep(idx, k, v)}
                onRemove={() => removeStep(idx)}
                onMoveUp={() => moveStep(idx, -1)}
                onMoveDown={() => moveStep(idx, 1)}
              />
              {idx < steps.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <div className="h-5 w-px bg-utu-border-default" />
                  <span className="absolute text-xs text-utu-text-muted bg-utu-bg-muted px-1 rounded">approve</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save changes reminder */}
        {isDraft && dirty && (
          <div className="mt-4 flex items-center justify-end gap-3">
            <p className="text-xs text-yellow-600">Unsaved changes</p>
            <button
              onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 rounded bg-utu-blue px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={12} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Version History */}
      {versions && versions.length > 1 && (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
          <div className="border-b border-utu-border-default px-5 py-3">
            <h2 className="text-sm font-semibold text-utu-text-primary">Version History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-muted">
              <tr>
                {['Version','Status','Created By','Approved By','Created'].map(h => (
                  <th key={h} className="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr
                  key={v.id}
                  className={`border-b border-utu-border-default last:border-b-0 hover:bg-utu-bg-muted/40 ${v.id === id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    {v.id === id
                      ? <span className="font-bold text-utu-blue">v{v.version} (current)</span>
                      : <Link href={`/admin/workflows/${v.id}`} className="text-utu-blue hover:underline">v{v.version}</Link>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DEF_STATUS_COLORS[v.status as WfDefinitionStatus]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary text-xs">{v.created_by}</td>
                  <td className="px-4 py-3 text-utu-text-secondary text-xs">{v.approved_by ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-muted text-xs">{fmtDate(v.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
