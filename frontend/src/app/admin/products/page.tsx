'use client';

/**
 * /admin/products — Products Department
 *
 * Tabs: Overview | Roadmap | Feature Flags | Changelog
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Map, Flag, BookOpen, Plus, Pencil, Trash2, X, RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  getProductsStats, getRoadmap, createRoadmapItem, updateRoadmapItem, deleteRoadmapItem,
  getFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag,
  getChangelog, createChangelogEntry, updateChangelogEntry, deleteChangelogEntry,
  getRoadmapAdvice, analyzeRoadmap,
  type ProductsStats, type RoadmapItem, type FeatureFlag, type ChangelogEntry,
  type RoadmapAdvice,
  type RoadmapStatus, type RoadmapPriority, type ChangelogType,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Roadmap', 'Feature Flags', 'Changelog'] as const;
type Tab = typeof TABS[number];

const ROADMAP_STATUS_COLORS: Record<RoadmapStatus, string> = {
  idea:        'bg-slate-100 text-slate-600',
  planned:     'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  launched:    'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-500',
};

const ROADMAP_PRIORITY_COLORS: Record<RoadmapPriority, string> = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  high:     'bg-orange-100 text-orange-700 border border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low:      'bg-green-100 text-green-700 border border-green-200',
};

const CHANGELOG_TYPE_COLORS: Record<ChangelogType, string> = {
  release:     'bg-blue-100 text-blue-700',
  hotfix:      'bg-red-100 text-red-700',
  feature:     'bg-green-100 text-green-700',
  deprecation: 'bg-orange-100 text-orange-700',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? 'text-utu-text-primary'}`}>{value}</p>
    </div>
  );
}

// ─── Roadmap Panel ────────────────────────────────────────────────────────────

function RoadmapPanel({ item, onClose, onSaved }: { item: RoadmapItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title:       item?.title ?? '',
    description: item?.description ?? '',
    status:      item?.status ?? 'planned' as RoadmapStatus,
    priority:    item?.priority ?? 'medium' as RoadmapPriority,
    quarter:     item?.quarter ?? '',
    tags:        item?.tags?.join(', ') ?? '',
    votes:       String(item?.votes ?? 0),
    owner:       item?.owner ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim() || null,
        status:      form.status,
        priority:    form.priority,
        quarter:     form.quarter.trim() || null,
        tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
        votes:       parseInt(form.votes) || 0,
        owner:       form.owner.trim() || null,
      };
      if (item) { await updateRoadmapItem(item.id, payload); }
      else      { await createRoadmapItem(payload as Partial<RoadmapItem>); }
      onSaved();
    } catch { setError('Failed to save. Please try again.'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">{item ? 'Edit Roadmap Item' : 'New Roadmap Item'}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Title *</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Feature or improvement name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Status</label>
              <select className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.status} onChange={e => set('status', e.target.value)}>
                {(['idea','planned','in_progress','launched','cancelled'] as RoadmapStatus[]).map(s => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Priority</label>
              <select className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {(['critical','high','medium','low'] as RoadmapPriority[]).map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Quarter</label>
              <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.quarter} onChange={e => set('quarter', e.target.value)} placeholder="e.g. Q3 2026" />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Votes</label>
              <input type="number" min="0" className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.votes} onChange={e => set('votes', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Tags (comma-separated)</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="search, booking, mobile" />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Owner</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="PM or team name" />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Description</label>
            <textarea rows={3} className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Problem statement or user story…" />
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : item ? 'Save Changes' : 'Create Item'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Flag Panel ───────────────────────────────────────────────────────────────

const ALL_ENVS = ['development', 'staging', 'production'];

function FlagPanel({ flag, onClose, onSaved }: { flag: FeatureFlag | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    key:          flag?.key ?? '',
    description:  flag?.description ?? '',
    enabled:      flag?.enabled ?? false,
    rollout_pct:  String(flag?.rollout_pct ?? 0),
    environments: flag?.environments ?? ['development'],
    owner:        flag?.owner ?? '',
    expires_at:   flag?.expires_at?.slice(0, 10) ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function toggleEnv(env: string) {
    setForm(p => ({
      ...p,
      environments: p.environments.includes(env)
        ? p.environments.filter(e => e !== env)
        : [...p.environments, env],
    }));
  }

  async function handleSave() {
    if (!form.key.trim()) { setError('Key is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        key:          form.key.trim().toLowerCase().replace(/\s+/g, '_'),
        description:  form.description.trim() || null,
        enabled:      form.enabled,
        rollout_pct:  parseInt(form.rollout_pct) || 0,
        environments: form.environments,
        owner:        form.owner.trim() || null,
        expires_at:   form.expires_at || null,
      };
      if (flag) { await updateFeatureFlag(flag.id, payload); }
      else      { await createFeatureFlag(payload as Partial<FeatureFlag>); }
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg?.includes('FLAG_KEY_EXISTS') ? 'A flag with this key already exists.' : 'Failed to save.');
    }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">{flag ? 'Edit Flag' : 'New Feature Flag'}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Key *</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 font-mono text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value }))} placeholder="new_search_ui" disabled={!!flag} />
            {flag && <p className="mt-1 text-xs text-utu-text-muted">Key cannot be changed after creation.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Description</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this flag control?" />
          </div>
          <div className="flex items-center justify-between rounded border border-utu-border-default px-4 py-3">
            <div>
              <p className="text-sm font-medium text-utu-text-primary">Enabled</p>
              <p className="text-xs text-utu-text-muted">Toggle to activate the flag</p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, enabled: !p.enabled }))} className={`transition-colors ${form.enabled ? 'text-green-600' : 'text-utu-text-muted'}`}>
              {form.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Rollout % (0 = off, 100 = all users)</label>
            <div className="mt-1 flex items-center gap-3">
              <input type="range" min="0" max="100" className="flex-1" value={form.rollout_pct} onChange={e => setForm(p => ({ ...p, rollout_pct: e.target.value }))} />
              <span className="w-10 text-right text-sm font-medium text-utu-text-primary">{form.rollout_pct}%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Environments</label>
            <div className="mt-2 flex gap-2">
              {ALL_ENVS.map(env => (
                <button
                  key={env}
                  onClick={() => toggleEnv(env)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.environments.includes(env)
                      ? 'border-utu-blue bg-blue-50 text-utu-blue'
                      : 'border-utu-border-default text-utu-text-muted hover:border-utu-blue'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Owner</label>
              <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="Team or dev name" />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Expires</label>
              <input type="date" className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : flag ? 'Save Changes' : 'Create Flag'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Changelog Panel ──────────────────────────────────────────────────────────

function ChangelogPanel({ entry, onClose, onSaved }: { entry: ChangelogEntry | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    version:      entry?.version ?? '',
    title:        entry?.title ?? '',
    summary:      entry?.summary ?? '',
    body:         entry?.body ?? '',
    type:         entry?.type ?? 'release' as ChangelogType,
    published_at: entry?.published_at?.slice(0, 10) ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.version.trim() || !form.title.trim()) { setError('Version and title are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        version:      form.version.trim(),
        title:        form.title.trim(),
        summary:      form.summary.trim() || null,
        body:         form.body.trim() || null,
        type:         form.type,
        published_at: form.published_at || null,
      };
      if (entry) { await updateChangelogEntry(entry.id, payload); }
      else       { await createChangelogEntry(payload as Partial<ChangelogEntry>); }
      onSaved();
    } catch { setError('Failed to save. Please try again.'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">{entry ? 'Edit Changelog Entry' : 'New Changelog Entry'}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Version *</label>
              <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 font-mono text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.version} onChange={e => set('version', e.target.value)} placeholder="v2.4.0" />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Type</label>
              <select className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.type} onChange={e => set('type', e.target.value)}>
                {(['release','hotfix','feature','deprecation'] as ChangelogType[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Title *</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What changed in this release?" />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Publish Date</label>
            <input type="date" className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.published_at} onChange={e => set('published_at', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Summary (one-liner)</label>
            <input className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Short description for release notes" />
          </div>
          <div>
            <label className="text-xs font-medium text-utu-text-muted">Body (full notes, markdown OK)</label>
            <textarea rows={6} className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 font-mono text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue" value={form.body} onChange={e => set('body', e.target.value)} placeholder="- Added: ...&#10;- Fixed: ...&#10;- Removed: ..." />
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : entry ? 'Save Changes' : 'Create Entry'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteModal({ label, onConfirm, onCancel, pending }: { label: string; onConfirm: () => void; onCancel: () => void; pending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold text-utu-text-primary">Delete {label}?</h3>
        <p className="mt-2 text-sm text-utu-text-secondary">This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
          <button onClick={onConfirm} disabled={pending} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{pending ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ onGoToRoadmap, onGoToFlags, onGoToChangelog }: { onGoToRoadmap: () => void; onGoToFlags: () => void; onGoToChangelog: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['products-stats'], queryFn: getProductsStats, refetchInterval: 60_000 });
  const stats: ProductsStats | undefined = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Roadmap</h2>
        {isLoading ? <p className="text-sm text-utu-text-muted">Loading…</p> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Planned"     value={stats?.roadmap.planned ?? 0}     color="text-blue-600" />
            <StatCard label="In Progress" value={stats?.roadmap.in_progress ?? 0} color="text-yellow-600" />
            <StatCard label="Launched"    value={stats?.roadmap.launched ?? 0}    color="text-green-600" />
            <StatCard label="Ideas"       value={stats?.roadmap.ideas ?? 0} />
            <StatCard label="Cancelled"   value={stats?.roadmap.cancelled ?? 0}   color="text-slate-400" />
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Feature Flags</h2>
        {isLoading ? null : (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total"          value={stats?.flags.total ?? 0} />
            <StatCard label="Enabled"        value={stats?.flags.enabled ?? 0}         color="text-green-600" />
            <StatCard label="Partial Rollout" value={stats?.flags.partial_rollout ?? 0} color="text-yellow-600" />
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Changelog</h2>
        {isLoading ? null : (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total"      value={stats?.changelog.total ?? 0} />
            <StatCard label="Published"  value={stats?.changelog.published ?? 0}  color="text-green-600" />
            <StatCard label="Last 30 days" value={stats?.changelog.last_30d ?? 0} color="text-blue-600" />
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onGoToRoadmap}   className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"><Map size={14} /> Roadmap</button>
        <button onClick={onGoToFlags}     className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"><Flag size={14} /> Feature Flags</button>
        <button onClick={onGoToChangelog} className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"><BookOpen size={14} /> Changelog</button>
      </div>
    </div>
  );
}

// ─── AI Roadmap Advisor Panel ─────────────────────────────────────────────────

const RM_HEALTH_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700 border-green-200',
  good:      'bg-blue-50  text-blue-700  border-blue-200',
  fair:      'bg-amber-100 text-amber-700 border-amber-200',
  poor:      'bg-red-100  text-red-600   border-red-200',
};

const RM_EFFORT_COLORS: Record<string, string> = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
};

function AIRoadmapAdvisorPanel() {
  const [advice,  setAdvice]  = useState<RoadmapAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getRoadmapAdvice()
      .then(r => { if (!cancelled) { setAdvice(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeRoadmap();
      if (res.data) setAdvice(res.data);
      else setError('Analysis failed. Please try again.');
    } catch { setError('Failed to run analysis.'); }
    finally { setRunning(false); }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 mb-4">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Roadmap Advisor</span>
          {advice && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${RM_HEALTH_COLORS[advice.roadmap_health] ?? ''}`}>
              {advice.roadmap_health}
            </span>
          )}
          {advice && <span className="text-xs text-violet-500">{advice.total_items} items</span>}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading advice…</p>}

          {!loading && !advice && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">Run AI Roadmap Advisor to get priority adjustments, quick wins, strategic bets, and Gulf market alignment assessment.</p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Advise Roadmap'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {advice && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{advice.executive_summary}</p>

              {advice.next_release_rec && (
                <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-4 py-3">
                  <p className="text-xs font-semibold text-utu-text-muted mb-1">Next Release Recommendation</p>
                  <p className="text-xs text-utu-text-secondary">{advice.next_release_rec}</p>
                </div>
              )}

              {advice.market_alignment && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Gulf Market Alignment</p>
                  <p className="text-xs text-blue-600">{advice.market_alignment}</p>
                </div>
              )}

              {advice.priority_adjustments.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Priority Adjustments</h3>
                  <div className="space-y-2">
                    {advice.priority_adjustments.map((a, i) => (
                      <div key={i} className="rounded-lg border border-utu-border-default bg-white px-3 py-2">
                        <p className="text-xs font-semibold text-utu-text-primary">{a.title}</p>
                        <p className="text-xs text-utu-text-muted mt-0.5">
                          <span className="line-through">{a.current_priority}</span> → <span className="font-medium text-violet-700">{a.suggested_priority}</span>
                        </p>
                        <p className="text-xs text-utu-text-secondary mt-0.5 italic">{a.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.quick_wins.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Quick Wins</h3>
                    <div className="space-y-2">
                      {advice.quick_wins.map((w, i) => (
                        <div key={i} className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-green-800 flex-1">{w.title}</p>
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${RM_EFFORT_COLORS[w.effort] ?? ''}`}>{w.effort}</span>
                          </div>
                          <p className="text-xs text-green-600 mt-0.5">{w.why}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {advice.strategic_bets.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Strategic Bets</h3>
                    <div className="space-y-2">
                      {advice.strategic_bets.map((b, i) => (
                        <div key={i} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                          <p className="text-xs font-semibold text-violet-800">{b.title}</p>
                          <p className="text-xs text-violet-600 mt-0.5">{b.market_opportunity}</p>
                          {b.quarter && <p className="text-xs text-violet-500 mt-0.5">{b.quarter}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(advice.tech_debt_flags.length > 0 || advice.feature_flag_risks.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {advice.tech_debt_flags.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Tech Debt Flags</p>
                      <ul className="space-y-1">{advice.tech_debt_flags.map((f, i) => <li key={i} className="text-xs text-amber-600">• {f}</li>)}</ul>
                    </div>
                  )}
                  {advice.feature_flag_risks.length > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                      <p className="text-xs font-semibold text-orange-700 mb-1">Feature Flag Risks</p>
                      <ul className="space-y-1">{advice.feature_flag_risks.map((f, i) => <li key={i} className="text-xs text-orange-600">• {f}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {advice.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                  <ul className="space-y-1">{advice.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary"><span className="text-violet-400 mt-0.5">▸</span>{r}</li>)}</ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-violet-200">
                <p className="text-xs text-utu-text-muted">Generated {new Date(advice.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <button onClick={handleAnalyze} disabled={running}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors">
                  {running ? 'Re-analysing…' : 'Re-analyse'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Roadmap Tab ──────────────────────────────────────────────────────────────

function RoadmapTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]   = useState(1);
  const [panel, setPanel] = useState<RoadmapItem | null | 'new'>(null);
  const [delId, setDelId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products-roadmap', statusFilter, page],
    queryFn:  () => getRoadmap({ status: statusFilter || undefined, page, limit: 25 }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteRoadmapItem,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products-roadmap'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['products-roadmap'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); };

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All statuses</option>
          {(['idea','planned','in_progress','launched','cancelled'] as RoadmapStatus[]).map(s => (
            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted"><RefreshCw size={14} /></button>
        <div className="ml-auto">
          <button onClick={() => setPanel('new')} className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={14} /> Add Item</button>
        </div>
      </div>
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !items.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No roadmap items found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Title','Status','Priority','Quarter','Tags','Votes','Owner',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-utu-bg-muted/50">
                  <td className="max-w-xs px-4 py-3 font-medium text-utu-text-primary">
                    <div className="truncate">{item.title}</div>
                    {item.description && <div className="truncate text-xs text-utu-text-muted">{item.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROADMAP_STATUS_COLORS[item.status]}`}>{item.status.replace('_',' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROADMAP_PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{item.quarter ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.tags?.map(tag => (
                        <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{item.votes}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{item.owner ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPanel(item)} className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue"><Pencil size={14} /></button>
                      <button onClick={() => setDelId(item.id)} className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
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
      {delId && <DeleteModal label="roadmap item" onConfirm={() => deleteMut.mutate(delId)} onCancel={() => setDelId('')} pending={deleteMut.isPending} />}
      {panel !== null && <RoadmapPanel item={panel === 'new' ? null : panel as RoadmapItem} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); refresh(); }} />}
    </div>
  );
}

// ─── Feature Flags Tab ────────────────────────────────────────────────────────

function FeatureFlagsTab() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<FeatureFlag | null | 'new'>(null);
  const [delId, setDelId] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['products-flags'], queryFn: () => getFeatureFlags() });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateFeatureFlag(id, { enabled }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products-flags'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteFeatureFlag,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products-flags'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['products-flags'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); };
  const flags   = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted"><RefreshCw size={14} /></button>
        <div className="ml-auto">
          <button onClick={() => setPanel('new')} className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={14} /> New Flag</button>
        </div>
      </div>
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !flags.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No feature flags. Create your first flag above.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Key','Description','Enabled','Rollout','Environments','Owner','Expires',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {flags.map(flag => (
                <tr key={flag.id} className="hover:bg-utu-bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-utu-text-primary">{flag.key}</td>
                  <td className="max-w-[200px] px-4 py-3 text-utu-text-secondary">
                    <div className="truncate">{flag.description ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMut.mutate({ id: flag.id, enabled: !flag.enabled })}
                      className={`transition-colors ${flag.enabled ? 'text-green-600' : 'text-utu-text-muted'}`}
                      title={flag.enabled ? 'Disable' : 'Enable'}
                    >
                      {flag.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-utu-bg-muted">
                        <div className="h-1.5 rounded-full bg-utu-blue" style={{ width: `${flag.rollout_pct}%` }} />
                      </div>
                      <span className="text-xs text-utu-text-muted">{flag.rollout_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {flag.environments.map(env => (
                        <span key={env} className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${env === 'production' ? 'bg-green-100 text-green-700' : env === 'staging' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{env}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{flag.owner ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-muted">{fmtDate(flag.expires_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPanel(flag)} className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue"><Pencil size={14} /></button>
                      <button onClick={() => setDelId(flag.id)} className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {delId && <DeleteModal label="feature flag" onConfirm={() => deleteMut.mutate(delId)} onCancel={() => setDelId('')} pending={deleteMut.isPending} />}
      {panel !== null && <FlagPanel flag={panel === 'new' ? null : panel as FeatureFlag} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); refresh(); }} />}
    </div>
  );
}

// ─── Changelog Tab ────────────────────────────────────────────────────────────

function ChangelogTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]   = useState(1);
  const [panel, setPanel] = useState<ChangelogEntry | null | 'new'>(null);
  const [delId, setDelId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products-changelog', typeFilter, page],
    queryFn:  () => getChangelog({ type: typeFilter || undefined, page, limit: 20 }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteChangelogEntry,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products-changelog'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['products-changelog'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); };

  const entries = data?.data ?? [];
  const total   = data?.total ?? 0;
  const pages   = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue">
          <option value="">All types</option>
          {(['release','hotfix','feature','deprecation'] as ChangelogType[]).map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted"><RefreshCw size={14} /></button>
        <div className="ml-auto">
          <button onClick={() => setPanel('new')} className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={14} /> New Entry</button>
        </div>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-utu-text-muted">Loading…</p>
        ) : !entries.length ? (
          <p className="text-sm text-utu-text-muted">No changelog entries. Start documenting releases above.</p>
        ) : entries.map(entry => (
          <div key={entry.id} className="rounded-utu-card border border-utu-border-default bg-utu-bg-card">
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${CHANGELOG_TYPE_COLORS[entry.type]}`}>{entry.type}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-utu-text-primary">{entry.version}</span>
                    <span className="text-sm font-medium text-utu-text-primary">{entry.title}</span>
                  </div>
                  {entry.summary && <p className="mt-1 text-sm text-utu-text-secondary">{entry.summary}</p>}
                  <p className="mt-1 text-xs text-utu-text-muted">
                    {entry.published_at ? `Published ${fmtDate(entry.published_at)}` : 'Draft — not published'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {entry.body && (
                  <button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)} className="rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-muted hover:bg-utu-bg-muted">
                    {expanded === entry.id ? 'Collapse' : 'Expand'}
                  </button>
                )}
                <button onClick={() => setPanel(entry)} className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue"><Pencil size={14} /></button>
                <button onClick={() => setDelId(entry.id)} className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
            {expanded === entry.id && entry.body && (
              <div className="border-t border-utu-border-default px-5 py-4">
                <pre className="whitespace-pre-wrap font-mono text-xs text-utu-text-secondary leading-relaxed">{entry.body}</pre>
              </div>
            )}
          </div>
        ))}
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
      {delId && <DeleteModal label="changelog entry" onConfirm={() => deleteMut.mutate(delId)} onCancel={() => setDelId('')} pending={deleteMut.isPending} />}
      {panel !== null && <ChangelogPanel entry={panel === 'new' ? null : panel as ChangelogEntry} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); refresh(); }} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Products</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Product roadmap, feature flags, and release changelog.</p>
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

      {activeTab === 'Overview'      && <OverviewTab onGoToRoadmap={() => setActiveTab('Roadmap')} onGoToFlags={() => setActiveTab('Feature Flags')} onGoToChangelog={() => setActiveTab('Changelog')} />}
      {activeTab === 'Roadmap'       && <><AIRoadmapAdvisorPanel /><RoadmapTab /></>}
      {activeTab === 'Feature Flags' && <FeatureFlagsTab />}
      {activeTab === 'Changelog'     && <ChangelogTab />}
    </div>
  );
}
