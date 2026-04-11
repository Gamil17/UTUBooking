'use client';

/**
 * /admin/dev — Development Department
 *
 * Tabs: Overview | Sprint Board | Tasks | Deployments
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Code, GitBranch, Rocket, CheckCircle, Clock, AlertCircle,
  Plus, Pencil, Trash2, X, ExternalLink, RefreshCw, ChevronRight,
} from 'lucide-react';
import {
  getDevStats, getDevSprints, createDevSprint, updateDevSprint, deleteDevSprint,
  getDevTasks, createDevTask, updateDevTask, deleteDevTask,
  getDevDeployments, createDevDeployment, updateDevDeployment, deleteDevDeployment,
  type DevStats, type DevSprint, type DevTask, type DevDeployment,
  type TaskType, type TaskPriority, type TaskStatus,
  type SprintStatus, type DeployEnv, type DeployStatus,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Sprint Board', 'Tasks', 'Deployments'] as const;
type Tab = typeof TABS[number];

const TASK_STATUS_COLS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog:     'bg-slate-100 text-slate-600',
  todo:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  review:      'bg-purple-100 text-purple-700',
  done:        'bg-green-100 text-green-700',
  cancelled:   'bg-slate-100 text-slate-400',
};

const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  high:     'bg-orange-100 text-orange-700 border border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low:      'bg-green-100 text-green-700 border border-green-200',
};

const TASK_TYPE_COLORS: Record<TaskType, string> = {
  feature: 'bg-blue-50 text-blue-600',
  bug:     'bg-red-50 text-red-600',
  chore:   'bg-slate-50 text-slate-500',
  task:    'bg-indigo-50 text-indigo-600',
  spike:   'bg-purple-50 text-purple-600',
};

const DEPLOY_STATUS_COLORS: Record<DeployStatus, string> = {
  success:     'bg-green-100 text-green-700',
  failed:      'bg-red-100 text-red-700',
  rolled_back: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-blue-100 text-blue-700',
};

const DEPLOY_ENV_COLORS: Record<DeployEnv, string> = {
  development: 'bg-slate-100 text-slate-600',
  staging:     'bg-yellow-100 text-yellow-700',
  production:  'bg-green-100 text-green-700',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDay(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? 'text-utu-text-primary'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

// ─── Task Form Panel ──────────────────────────────────────────────────────────

interface TaskFormData {
  title:        string;
  description:  string;
  type:         TaskType;
  priority:     TaskPriority;
  status:       TaskStatus;
  assignee:     string;
  story_points: string;
  service:      string;
  pr_url:       string;
  sprint_id:    string;
}

function TaskPanel({
  task,
  sprints,
  onClose,
  onSaved,
}: {
  task: DevTask | null;
  sprints: DevSprint[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TaskFormData>(task ? {
    title:        task.title,
    description:  task.description ?? '',
    type:         task.type,
    priority:     task.priority,
    status:       task.status,
    assignee:     task.assignee ?? '',
    story_points: task.story_points != null ? String(task.story_points) : '',
    service:      task.service ?? '',
    pr_url:       task.pr_url ?? '',
    sprint_id:    task.sprint_id ?? '',
  } : {
    title: '', description: '', type: 'task', priority: 'medium', status: 'backlog',
    assignee: '', story_points: '', service: '', pr_url: '', sprint_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: keyof TaskFormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title:        form.title.trim(),
        description:  form.description.trim() || null,
        type:         form.type,
        priority:     form.priority,
        status:       form.status,
        assignee:     form.assignee.trim() || null,
        story_points: form.story_points ? parseInt(form.story_points) : null,
        service:      form.service.trim() || null,
        pr_url:       form.pr_url.trim() || null,
        sprint_id:    form.sprint_id || null,
      };
      if (task) {
        await updateDevTask(task.id, payload);
      } else {
        await createDevTask(payload);
      }
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Title *</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Type</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.type} onChange={e => set('type', e.target.value as TaskType)}
              >
                {(['feature','bug','chore','task','spike'] as TaskType[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Priority</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)}
              >
                {(['critical','high','medium','low'] as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Status</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.status} onChange={e => set('status', e.target.value as TaskStatus)}
              >
                {(['backlog','todo','in_progress','review','done','cancelled'] as TaskStatus[]).map(s => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Story Points</label>
              <input
                type="number" min="1" max="21"
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.story_points} onChange={e => set('story_points', e.target.value)}
                placeholder="1–21"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Sprint</label>
            <select
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.sprint_id} onChange={e => set('sprint_id', e.target.value)}
            >
              <option value="">Backlog (no sprint)</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Assignee</label>
              <input
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.assignee} onChange={e => set('assignee', e.target.value)}
                placeholder="Dev name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Service</label>
              <input
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.service} onChange={e => set('service', e.target.value)}
                placeholder="e.g. booking-service"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">PR URL</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.pr_url} onChange={e => set('pr_url', e.target.value)}
              placeholder="https://github.com/…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Description</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Acceptance criteria, notes…"
            />
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sprint Form Panel ────────────────────────────────────────────────────────

function SprintPanel({
  sprint,
  onClose,
  onSaved,
}: {
  sprint: DevSprint | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name:       sprint?.name ?? '',
    goal:       sprint?.goal ?? '',
    status:     sprint?.status ?? 'planned' as SprintStatus,
    start_date: sprint?.start_date?.slice(0, 10) ?? '',
    end_date:   sprint?.end_date?.slice(0, 10) ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name:       form.name.trim(),
        goal:       form.goal.trim() || null,
        status:     form.status,
        start_date: form.start_date || null,
        end_date:   form.end_date || null,
      };
      if (sprint) {
        await updateDevSprint(sprint.id, payload as Partial<DevSprint>);
      } else {
        await createDevSprint(payload as Partial<DevSprint>);
      }
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-sm flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">
            {sprint ? 'Edit Sprint' : 'New Sprint'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Sprint Name *</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Sprint 14"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Status</label>
            <select
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.status} onChange={e => set('status', e.target.value)}
            >
              {(['planned','active','completed','cancelled'] as SprintStatus[]).map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Start Date</label>
              <input type="date" className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">End Date</label>
              <input type="date" className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Sprint Goal</label>
            <textarea rows={2} className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="What will be achieved?" />
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : sprint ? 'Save Changes' : 'Create Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deployment Form Panel ────────────────────────────────────────────────────

function DeploymentPanel({
  deployment,
  onClose,
  onSaved,
}: {
  deployment: DevDeployment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    service:     deployment?.service ?? '',
    version:     deployment?.version ?? '',
    environment: deployment?.environment ?? 'staging' as DeployEnv,
    status:      deployment?.status ?? 'success' as DeployStatus,
    deployed_by: deployment?.deployed_by ?? 'admin',
    notes:       deployment?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.service.trim()) { setError('Service is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        service:     form.service.trim(),
        version:     form.version.trim() || null,
        environment: form.environment,
        status:      form.status,
        deployed_by: form.deployed_by.trim() || 'admin',
        notes:       form.notes.trim() || null,
      };
      if (deployment) {
        await updateDevDeployment(deployment.id, payload as Partial<DevDeployment>);
      } else {
        await createDevDeployment(payload as Partial<DevDeployment>);
      }
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-sm flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">
            {deployment ? 'Edit Deployment' : 'Log Deployment'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Service *</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.service} onChange={e => set('service', e.target.value)} placeholder="e.g. booking-service" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Version / Tag</label>
              <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.version} onChange={e => set('version', e.target.value)} placeholder="v1.2.3 or SHA" />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Deployed By</label>
              <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.deployed_by} onChange={e => set('deployed_by', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Environment</label>
              <select className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.environment} onChange={e => set('environment', e.target.value)}>
                {(['development','staging','production'] as DeployEnv[]).map(e => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Status</label>
              <select className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.status} onChange={e => set('status', e.target.value)}>
                {(['success','failed','rolled_back','in_progress'] as DeployStatus[]).map(s => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Notes</label>
            <textarea rows={2} className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What changed?" />
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : deployment ? 'Save Changes' : 'Log Deployment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ onGoToBoard, onGoToDeployments }: { onGoToBoard: () => void; onGoToDeployments: () => void }) {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dev-stats'],
    queryFn:  getDevStats,
    refetchInterval: 60_000,
  });

  const stats: DevStats | undefined = statsData?.data;

  return (
    <div className="space-y-6">
      {/* Task KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Tasks</h2>
        {isLoading ? <p className="text-sm text-utu-text-muted">Loading…</p> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Open"           value={stats?.tasks.open ?? 0}          color={stats?.tasks.open ? 'text-blue-600' : 'text-green-600'} />
            <StatCard label="In Progress"    value={stats?.tasks.in_progress ?? 0}   color="text-yellow-600" />
            <StatCard label="In Review"      value={stats?.tasks.in_review ?? 0}     color="text-purple-600" />
            <StatCard label="Done (7d)"      value={stats?.tasks.done_7d ?? 0}       color="text-green-600" />
            <StatCard label="Critical Open"  value={stats?.tasks.critical_open ?? 0} color={stats?.tasks.critical_open ? 'text-red-600' : 'text-slate-400'} />
            <StatCard label="Sprint Velocity" value={`${stats?.tasks.active_sprint_velocity ?? 0} pts`} sub="done points this sprint" />
          </div>
        )}
      </div>

      {/* Active sprint */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Active Sprint</h2>
        {isLoading ? null : !stats?.active_sprint ? (
          <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5 text-sm text-utu-text-muted">
            No active sprint. Create one in the Sprint Board tab.
          </div>
        ) : (
          <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-utu-text-primary">{stats.active_sprint.name}</p>
                {stats.active_sprint.goal && <p className="mt-1 text-sm text-utu-text-secondary">{stats.active_sprint.goal}</p>}
                <p className="mt-2 text-xs text-utu-text-muted">
                  {fmtDay(stats.active_sprint.start_date)} — {fmtDay(stats.active_sprint.end_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-utu-blue">{stats.active_sprint.progress_pct}%</p>
                <p className="text-xs text-utu-text-muted">{stats.active_sprint.done_tasks} / {stats.active_sprint.total_tasks} tasks done</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 w-full rounded-full bg-utu-bg-muted">
              <div
                className="h-2 rounded-full bg-utu-blue transition-all"
                style={{ width: `${stats.active_sprint.progress_pct}%` }}
              />
            </div>
            <div className="mt-3">
              <button onClick={onGoToBoard} className="text-xs text-utu-blue hover:underline flex items-center gap-1">
                View sprint board <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deployment stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Deployments</h2>
        {isLoading ? null : (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Last 24h"      value={stats?.deployments.deployments_24h ?? 0} />
            <StatCard label="Failed (24h)"  value={stats?.deployments.failed_24h ?? 0}      color={stats?.deployments.failed_24h ? 'text-red-600' : 'text-slate-400'} />
            <StatCard label="Prod (7d)"     value={stats?.deployments.prod_7d ?? 0}          color="text-green-600" />
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <button onClick={onGoToBoard} className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
          <GitBranch size={14} /> Sprint Board
        </button>
        <button onClick={onGoToDeployments} className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
          <Rocket size={14} /> Deployments
        </button>
      </div>
    </div>
  );
}

// ─── Sprint Board Tab ─────────────────────────────────────────────────────────

function SprintBoardTab() {
  const qc = useQueryClient();
  const [sprintPanel, setSprintPanel] = useState<DevSprint | null | 'new'>(null);
  const [taskPanel,   setTaskPanel]   = useState<DevTask   | null | 'new'>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [delId, setDelId] = useState('');

  const { data: sprintData } = useQuery({
    queryKey: ['dev-sprints'],
    queryFn:  () => getDevSprints(),
  });

  const { data: taskData } = useQuery({
    queryKey: ['dev-tasks-board', selectedSprint],
    queryFn:  () => getDevTasks({ sprint_id: selectedSprint || undefined, limit: 200 }),
    enabled:  true,
  });

  const sprints = sprintData?.data ?? [];
  const tasks   = taskData?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: deleteDevSprint,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['dev-sprints'] }); setDelId(''); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateDevTask(id, { status }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['dev-tasks-board'] }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dev-sprints'] });
    qc.invalidateQueries({ queryKey: ['dev-tasks-board'] });
    qc.invalidateQueries({ queryKey: ['dev-stats'] });
  };

  return (
    <div className="space-y-5">
      {/* Sprint selector + create */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedSprint}
          onChange={e => setSelectedSprint(e.target.value)}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All tasks (backlog)</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.status}) — {s.done_tasks}/{s.total_tasks} done
            </option>
          ))}
        </select>
        <button
          onClick={() => setSprintPanel('new')}
          className="flex items-center gap-2 rounded border border-utu-border-default px-3 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"
        >
          <Plus size={14} /> New Sprint
        </button>
        {selectedSprint && (
          <>
            <button onClick={() => setSprintPanel(sprints.find(s => s.id === selectedSprint) ?? null)} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted" title="Edit sprint">
              <Pencil size={14} />
            </button>
            <button onClick={() => setDelId(selectedSprint)} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-red-50 hover:text-red-600" title="Delete sprint">
              <Trash2 size={14} />
            </button>
          </>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setTaskPanel('new')}
            className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-5 gap-3">
        {TASK_STATUS_COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col);
          return (
            <div key={col} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[col]}`}>
                  {col.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-xs text-utu-text-muted">{colTasks.length}</span>
              </div>
              <div className="min-h-[200px] space-y-2 rounded-lg border border-utu-border-default bg-utu-bg-muted p-2">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="rounded border border-utu-border-default bg-utu-bg-card p-3 shadow-sm hover:shadow-md cursor-pointer"
                    onClick={() => setTaskPanel(task)}
                  >
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TASK_TYPE_COLORS[task.type]}`}>
                      {task.type}
                    </span>
                    <p className="mt-1.5 text-xs font-medium text-utu-text-primary leading-snug">{task.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${TASK_PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.story_points != null && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{task.story_points}pt</span>
                      )}
                    </div>
                    {task.assignee && <p className="mt-1.5 text-xs text-utu-text-muted">{task.assignee}</p>}
                    {/* Quick status arrows */}
                    <div className="mt-2 flex gap-1" onClick={e => e.stopPropagation()}>
                      {col !== 'backlog' && (
                        <button
                          className="rounded p-0.5 text-utu-text-muted hover:bg-utu-bg-muted"
                          title="Move left"
                          onClick={() => {
                            const prev = TASK_STATUS_COLS[TASK_STATUS_COLS.indexOf(col) - 1];
                            if (prev) statusMut.mutate({ id: task.id, status: prev });
                          }}
                        >←</button>
                      )}
                      {col !== 'done' && (
                        <button
                          className="rounded p-0.5 text-utu-text-muted hover:bg-utu-bg-muted"
                          title="Move right"
                          onClick={() => {
                            const next = TASK_STATUS_COLS[TASK_STATUS_COLS.indexOf(col) + 1];
                            if (next) statusMut.mutate({ id: task.id, status: next });
                          }}
                        >→</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sprint delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Delete sprint?</h3>
            <p className="mt-2 text-sm text-utu-text-secondary">Sprint must have no active tasks to delete.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDelId('')} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => deleteMut.mutate(delId)} disabled={deleteMut.isPending} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sprintPanel !== null && (
        <SprintPanel
          sprint={sprintPanel === 'new' ? null : sprintPanel as DevSprint}
          onClose={() => setSprintPanel(null)}
          onSaved={() => { setSprintPanel(null); refresh(); }}
        />
      )}
      {taskPanel !== null && (
        <TaskPanel
          task={taskPanel === 'new' ? null : taskPanel as DevTask}
          sprints={sprints}
          onClose={() => setTaskPanel(null)}
          onSaved={() => { setTaskPanel(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab() {
  const qc = useQueryClient();
  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter,     setTypeFilter]     = useState('');
  const [page,  setPage]  = useState(1);
  const [panel, setPanel] = useState<DevTask | null | 'new'>(null);
  const [delId, setDelId] = useState('');

  const { data: sprintData } = useQuery({ queryKey: ['dev-sprints'], queryFn: () => getDevSprints() });
  const sprints = sprintData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['dev-tasks', statusFilter, priorityFilter, typeFilter, page],
    queryFn:  () => getDevTasks({
      status:   statusFilter   || undefined,
      priority: priorityFilter || undefined,
      type:     typeFilter     || undefined,
      page, limit: 25,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDevTask,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); qc.invalidateQueries({ queryKey: ['dev-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); qc.invalidateQueries({ queryKey: ['dev-stats'] }); qc.invalidateQueries({ queryKey: ['dev-tasks-board'] }); };

  const tasks = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter}   onChange={e => { setStatusFilter(e.target.value);   setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All statuses</option>
          {(['backlog','todo','in_progress','review','done','cancelled'] as TaskStatus[]).map(s => (
            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All priorities</option>
          {(['critical','high','medium','low'] as TaskPriority[]).map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select value={typeFilter}     onChange={e => { setTypeFilter(e.target.value);     setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All types</option>
          {(['feature','bug','chore','task','spike'] as TaskType[]).map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted"><RefreshCw size={14} /></button>
        <div className="ml-auto">
          <button onClick={() => setPanel('new')} className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !tasks.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No tasks found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Title','Type','Priority','Status','Sprint','Assignee','Pts','PR',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-utu-bg-muted/50">
                  <td className="max-w-xs px-4 py-3 font-medium text-utu-text-primary">
                    <div className="truncate">{task.title}</div>
                    {task.service && <div className="text-xs text-utu-text-muted">{task.service}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TASK_TYPE_COLORS[task.type]}`}>{task.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[task.status]}`}>{task.status.replace('_',' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{task.sprint_name ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{task.assignee ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-muted">{task.story_points ?? '—'}</td>
                  <td className="px-4 py-3">
                    {task.pr_url ? (
                      <a href={task.pr_url} target="_blank" rel="noreferrer" className="text-utu-blue hover:underline flex items-center gap-1 text-xs">
                        PR <ExternalLink size={10} />
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPanel(task)} className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => setDelId(task.id)} className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Prev</button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Next</button>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Delete task?</h3>
            <p className="mt-2 text-sm text-utu-text-secondary">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDelId('')} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => deleteMut.mutate(delId)} disabled={deleteMut.isPending} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panel !== null && (
        <TaskPanel
          task={panel === 'new' ? null : panel as DevTask}
          sprints={sprints}
          onClose={() => setPanel(null)}
          onSaved={() => { setPanel(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Deployments Tab ──────────────────────────────────────────────────────────

function DeploymentsTab() {
  const qc = useQueryClient();
  const [envFilter,    setEnvFilter]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,  setPage]  = useState(1);
  const [panel, setPanel] = useState<DevDeployment | null | 'new'>(null);
  const [delId, setDelId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dev-deployments', envFilter, statusFilter, page],
    queryFn:  () => getDevDeployments({
      environment: envFilter    || undefined,
      status:      statusFilter || undefined,
      page, limit: 25,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDevDeployment,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['dev-deployments'] }); qc.invalidateQueries({ queryKey: ['dev-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['dev-deployments'] }); qc.invalidateQueries({ queryKey: ['dev-stats'] }); };

  const deployments = data?.data ?? [];
  const total       = data?.total ?? 0;
  const pages       = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={envFilter}    onChange={e => { setEnvFilter(e.target.value);    setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All environments</option>
          {(['development','staging','production'] as DeployEnv[]).map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All statuses</option>
          {(['success','failed','rolled_back','in_progress'] as DeployStatus[]).map(s => (
            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted"><RefreshCw size={14} /></button>
        <div className="ml-auto">
          <button onClick={() => setPanel('new')} className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={14} /> Log Deployment
          </button>
        </div>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !deployments.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No deployments logged.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Service','Version','Environment','Status','Deployed By','When','Notes',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {deployments.map(dep => (
                <tr key={dep.id} className="hover:bg-utu-bg-muted/50">
                  <td className="px-4 py-3 font-medium text-utu-text-primary">{dep.service}</td>
                  <td className="px-4 py-3 font-mono text-xs text-utu-text-secondary">{dep.version ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEPLOY_ENV_COLORS[dep.environment]}`}>{dep.environment}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEPLOY_STATUS_COLORS[dep.status]}`}>{dep.status.replace('_',' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{dep.deployed_by}</td>
                  <td className="px-4 py-3 text-utu-text-muted whitespace-nowrap">{fmtDate(dep.deployed_at)}</td>
                  <td className="max-w-xs px-4 py-3 text-utu-text-muted">
                    <div className="truncate">{dep.notes ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPanel(dep)} className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => setDelId(dep.id)} className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Prev</button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Next</button>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Delete deployment log?</h3>
            <p className="mt-2 text-sm text-utu-text-secondary">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDelId('')} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => deleteMut.mutate(delId)} disabled={deleteMut.isPending} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panel !== null && (
        <DeploymentPanel
          deployment={panel === 'new' ? null : panel as DevDeployment}
          onClose={() => setPanel(null)}
          onSaved={() => { setPanel(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Development</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Sprint planning, task tracking, and deployment log.</p>
      </div>

      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-utu-blue text-utu-blue'
                : 'text-utu-text-secondary hover:text-utu-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview'      && <OverviewTab onGoToBoard={() => setActiveTab('Sprint Board')} onGoToDeployments={() => setActiveTab('Deployments')} />}
      {activeTab === 'Sprint Board'  && <SprintBoardTab />}
      {activeTab === 'Tasks'         && <TasksTab />}
      {activeTab === 'Deployments'   && <DeploymentsTab />}
    </div>
  );
}
