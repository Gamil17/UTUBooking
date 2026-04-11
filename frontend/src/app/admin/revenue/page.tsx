'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, Ban, Edit2, Trash2, Plus, X, CheckCircle, XCircle, Brain } from 'lucide-react';
import {
  getRevenueStats, getRevenueRules, createRevenueRule, updateRevenueRule, deleteRevenueRule,
  getRevenueBlackouts, createRevenueBlackout, updateRevenueBlackout, deleteRevenueBlackout,
  getRevenueOverrides, createRevenueOverride, updateRevenueOverride, deleteRevenueOverride,
  getRevenueTargets, createRevenueTarget, updateRevenueTarget,
  getAiRecommendations, acceptAiRecommendation, rejectAiRecommendation,
  type RevenueRule, type RevenueBlackout, type RevenueOverride, type RevenueTarget,
  type AiPricingRecommendation,
} from '@/lib/api';

const TABS = ['Overview', 'Pricing Rules', 'Blackout Periods', 'Manual Overrides', 'AI Audit'] as const;
type Tab = typeof TABS[number];

const RULE_TYPE_COLORS: Record<string, string> = {
  seasonal: 'bg-blue-100 text-blue-800', event: 'bg-purple-100 text-purple-800',
  demand: 'bg-green-100 text-green-800', occupancy: 'bg-amber-100 text-amber-800', manual: 'bg-gray-100 text-gray-800',
};
const OVERRIDE_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800', expired: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-800',
};
const CONF_COLOR = (s: number) => s >= 0.8 ? 'bg-green-100 text-green-800' : s >= 0.6 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
const AI_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', accepted: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-4">
      <p className="text-xs font-medium text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-utu-text-primary'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data: statsData } = useQuery({ queryKey: ['rev-stats'], queryFn: getRevenueStats });
  const { data: targetsData } = useQuery({ queryKey: ['rev-targets'], queryFn: () => getRevenueTargets() });
  const s = statsData?.data;
  const targets = targetsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active Rules" value={s?.active_rules ?? '—'} />
        <StatCard label="Blackouts This Month" value={s?.blackouts_this_month ?? '—'} />
        <StatCard label="Overrides This Week" value={s?.overrides_this_week ?? '—'} />
        <StatCard label="Pending AI Recs" value={s?.pending_ai_recs ?? '—'} color={(s?.pending_ai_recs ?? 0) > 0 ? 'text-amber-600' : undefined} />
      </div>

      {targets.length > 0 && (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-utu-text-primary">RevPAR Targets</h3>
          <div className="space-y-4">
            {targets.map(t => {
              const pct = t.target_revpar && t.actual_revpar ? Math.min(Math.round((t.actual_revpar / t.target_revpar) * 100), 100) : 0;
              const color = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={t.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-utu-text-primary capitalize">{t.period_type}: {t.period}</span>
                    <span className="text-utu-text-muted">
                      {t.actual_revpar ? `SAR ${t.actual_revpar}` : 'No data'} / SAR {t.target_revpar ?? '—'} target
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-utu-bg-muted">
                    <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button onClick={() => onNavigate('Pricing Rules')}
          className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-4 text-left hover:bg-utu-bg-muted transition-colors">
          <p className="text-sm font-semibold text-utu-text-primary">Manage Pricing Rules</p>
          <p className="mt-1 text-xs text-utu-text-muted">Seasonal, event, and demand-based adjustments</p>
        </button>
        <button onClick={() => onNavigate('AI Audit')}
          className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-4 text-left hover:bg-utu-bg-muted transition-colors">
          <p className="text-sm font-semibold text-utu-text-primary">Review AI Recommendations</p>
          <p className="mt-1 text-xs text-utu-text-muted">Accept or reject AI-generated pricing suggestions</p>
        </button>
      </div>
    </div>
  );
}

// ── Pricing Rules Tab ─────────────────────────────────────────────────────────
function RulesTab() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [panel, setPanel] = useState<Partial<RevenueRule> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data } = useQuery({ queryKey: ['rev-rules', filterType], queryFn: () => getRevenueRules(filterType ? { type: filterType } : undefined) });
  const rules = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: Partial<RevenueRule>) => isNew ? createRevenueRule(d) : updateRevenueRule(panel!.id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-rules'] }); qc.invalidateQueries({ queryKey: ['rev-stats'] }); setPanel(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteRevenueRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-rules'] }); qc.invalidateQueries({ queryKey: ['rev-stats'] }); },
  });

  const openNew = () => { setIsNew(true); setPanel({ type: 'seasonal', adjustment: 'percent', value: 0, priority: 5, active: true }); };
  const openEdit = (r: RevenueRule) => { setIsNew(false); setPanel(r); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'seasonal', 'event', 'demand', 'occupancy', 'manual'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterType === t ? 'bg-utu-blue text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="flex items-center gap-1 rounded-utu-card bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-utu-blue/90">
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
            <tr>
              {['Name', 'Type', 'Adjustment', 'Value', 'Period', 'Priority', 'Active', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {rules.map(r => (
              <tr key={r.id} className="hover:bg-utu-bg-muted/50">
                <td className="px-4 py-3 font-medium text-utu-text-primary">{r.name}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RULE_TYPE_COLORS[r.type]}`}>{r.type}</span></td>
                <td className="px-4 py-3 text-utu-text-secondary capitalize">{r.adjustment}</td>
                <td className="px-4 py-3 font-medium text-utu-text-primary">{r.value > 0 ? '+' : ''}{r.value}{r.adjustment === 'percent' ? '%' : ' SAR'}</td>
                <td className="px-4 py-3 text-utu-text-muted text-xs">{r.start_date ? `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}` : 'Always'}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{r.priority}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block h-2 w-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 text-utu-text-muted hover:text-utu-blue"><Edit2 size={14} /></button>
                    <button onClick={() => delMut.mutate(r.id)} className="p-1 text-utu-text-muted hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!rules.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-utu-text-muted">No pricing rules found.</td></tr>}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{isNew ? 'New Rule' : 'Edit Rule'}</h2>
              <button onClick={() => setPanel(null)} className="text-utu-text-muted hover:text-utu-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Name *', key: 'name', type: 'text' },
                { label: 'Hotel ID (leave blank for all)', key: 'hotel_id', type: 'text' },
                { label: 'Value *', key: 'value', type: 'number' },
                { label: 'Priority (1=highest)', key: 'priority', type: 'number' },
                { label: 'Start Date', key: 'start_date', type: 'date' },
                { label: 'End Date', key: 'end_date', type: 'date' },
                { label: 'Notes', key: 'notes', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <input type={f.type} value={(panel as Record<string,unknown>)[f.key] as string ?? ''} onChange={e => setPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
                </div>
              ))}
              {[
                { label: 'Type', key: 'type', opts: ['seasonal','event','demand','occupancy','manual'] },
                { label: 'Adjustment', key: 'adjustment', opts: ['percent','absolute'] },
                { label: 'Applies To', key: 'applies_to', opts: ['all','hotel'] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <select value={(panel as Record<string,unknown>)[f.key] as string ?? ''} onChange={e => setPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm text-utu-text-secondary">
                <input type="checkbox" checked={!!panel.active} onChange={e => setPanel(p => ({ ...p!, active: e.target.checked }))} />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-utu-border-default px-5 py-4">
              <button onClick={() => setPanel(null)} className="rounded-lg px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => saveMut.mutate(panel)} disabled={saveMut.isPending}
                className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue/90 disabled:opacity-50">
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Blackout Periods Tab ──────────────────────────────────────────────────────
function BlackoutsTab() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Partial<RevenueBlackout> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data } = useQuery({ queryKey: ['rev-blackouts'], queryFn: () => getRevenueBlackouts() });
  const blackouts = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: Partial<RevenueBlackout>) => isNew ? createRevenueBlackout(d) : updateRevenueBlackout(panel!.id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-blackouts'] }); qc.invalidateQueries({ queryKey: ['rev-stats'] }); setPanel(null); },
  });
  const delMut = useMutation({
    mutationFn: deleteRevenueBlackout,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-blackouts'] }); qc.invalidateQueries({ queryKey: ['rev-stats'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setIsNew(true); setPanel({}); }} className="flex items-center gap-1 rounded-utu-card bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-utu-blue/90">
          <Plus size={14} /> Add Blackout
        </button>
      </div>
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
            <tr>{['Name', 'Hotel', 'Start', 'End', 'Reason', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {blackouts.map(b => (
              <tr key={b.id} className="hover:bg-utu-bg-muted/50">
                <td className="px-4 py-3 font-medium text-utu-text-primary">{b.name}</td>
                <td className="px-4 py-3 text-utu-text-muted">{b.hotel_id ?? 'All hotels'}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{fmtDate(b.start_date)}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{fmtDate(b.end_date)}</td>
                <td className="px-4 py-3 text-utu-text-muted max-w-xs truncate">{b.reason ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setIsNew(false); setPanel(b); }} className="p-1 text-utu-text-muted hover:text-utu-blue"><Edit2 size={14} /></button>
                    <button onClick={() => delMut.mutate(b.id)} className="p-1 text-utu-text-muted hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!blackouts.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-utu-text-muted">No blackout periods defined.</td></tr>}
          </tbody>
        </table>
      </div>
      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{isNew ? 'New Blackout' : 'Edit Blackout'}</h2>
              <button onClick={() => setPanel(null)} className="text-utu-text-muted hover:text-utu-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Name *', key: 'name', type: 'text' },
                { label: 'Hotel ID (blank = all)', key: 'hotel_id', type: 'text' },
                { label: 'Start Date *', key: 'start_date', type: 'date' },
                { label: 'End Date *', key: 'end_date', type: 'date' },
                { label: 'Reason', key: 'reason', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <input type={f.type} value={(panel as Record<string,unknown>)[f.key] as string ?? ''}
                    onChange={e => setPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-utu-border-default px-5 py-4">
              <button onClick={() => setPanel(null)} className="rounded-lg px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => saveMut.mutate(panel)} disabled={saveMut.isPending}
                className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue/90 disabled:opacity-50">
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overrides Tab ─────────────────────────────────────────────────────────────
function OverridesTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [panel, setPanel] = useState<Partial<RevenueOverride> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data } = useQuery({ queryKey: ['rev-overrides', filterStatus], queryFn: () => getRevenueOverrides(filterStatus ? { status: filterStatus } : undefined) });
  const overrides = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: Partial<RevenueOverride>) => isNew ? createRevenueOverride(d) : updateRevenueOverride(panel!.id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-overrides'] }); qc.invalidateQueries({ queryKey: ['rev-stats'] }); setPanel(null); },
  });
  const delMut = useMutation({
    mutationFn: deleteRevenueOverride,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-overrides'] }); qc.invalidateQueries({ queryKey: ['rev-stats'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'active', 'expired', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-utu-blue text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => { setIsNew(true); setPanel({ status: 'active' }); }} className="flex items-center gap-1 rounded-utu-card bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-utu-blue/90">
          <Plus size={14} /> Add Override
        </button>
      </div>
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
            <tr>{['Hotel', 'Date', 'Price SAR', 'Reason', 'Approved By', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {overrides.map(o => (
              <tr key={o.id} className="hover:bg-utu-bg-muted/50">
                <td className="px-4 py-3 font-medium text-utu-text-primary">{o.hotel_name}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{fmtDate(o.override_date)}</td>
                <td className="px-4 py-3 font-medium text-utu-text-primary">SAR {Number(o.price_sar).toLocaleString()}</td>
                <td className="px-4 py-3 text-utu-text-muted max-w-xs truncate">{o.reason}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{o.approved_by}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OVERRIDE_STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setIsNew(false); setPanel(o); }} className="p-1 text-utu-text-muted hover:text-utu-blue"><Edit2 size={14} /></button>
                    <button onClick={() => delMut.mutate(o.id)} className="p-1 text-utu-text-muted hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!overrides.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-utu-text-muted">No manual overrides found.</td></tr>}
          </tbody>
        </table>
      </div>
      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{isNew ? 'New Override' : 'Edit Override'}</h2>
              <button onClick={() => setPanel(null)} className="text-utu-text-muted hover:text-utu-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Hotel ID *', key: 'hotel_id', type: 'text' },
                { label: 'Hotel Name *', key: 'hotel_name', type: 'text' },
                { label: 'Date *', key: 'override_date', type: 'date' },
                { label: 'Price SAR *', key: 'price_sar', type: 'number' },
                { label: 'Reason *', key: 'reason', type: 'text' },
                { label: 'Approved By', key: 'approved_by', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <input type={f.type} value={(panel as Record<string,unknown>)[f.key] as string ?? ''}
                    onChange={e => setPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
                </div>
              ))}
              {!isNew && (
                <div>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">Status</label>
                  <select value={panel.status ?? 'active'} onChange={e => setPanel(p => ({ ...p!, status: e.target.value as RevenueOverride['status'] }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
                    {['active','expired','cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-utu-border-default px-5 py-4">
              <button onClick={() => setPanel(null)} className="rounded-lg px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => saveMut.mutate(panel)} disabled={saveMut.isPending}
                className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue/90 disabled:opacity-50">
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Audit Tab ──────────────────────────────────────────────────────────────
function AiAuditTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['rev-ai-recs', filterStatus],
    queryFn: () => getAiRecommendations(filterStatus ? { status: filterStatus } : undefined),
  });
  const recs = (data as { data?: AiPricingRecommendation[] })?.data ?? [];

  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptAiRecommendation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rev-ai-recs'] }),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectAiRecommendation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rev-ai-recs'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'accepted', 'rejected', ''].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-utu-blue text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-sm text-utu-text-muted">Loading AI recommendations…</p>
      ) : recs.length === 0 ? (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-8 text-center">
          <Brain className="mx-auto mb-2 text-utu-text-muted" size={32} />
          <p className="text-sm text-utu-text-muted">No AI recommendations found. The pricing service may be offline.</p>
        </div>
      ) : (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
              <tr>{['Hotel', 'Base SAR', 'Recommended SAR', 'Confidence', 'Season', 'Occ %', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {recs.map((r) => (
                <tr key={r.id} className="hover:bg-utu-bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-utu-text-primary">{r.hotel_id}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">SAR {r.base_price}</td>
                  <td className="px-4 py-3 font-medium text-utu-text-primary">SAR {r.recommended_price}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONF_COLOR(r.confidence_score)}`}>{(r.confidence_score * 100).toFixed(0)}%</span></td>
                  <td className="px-4 py-3 text-utu-text-secondary capitalize">{r.season}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{r.occupancy_pct}%</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${AI_STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => acceptMut.mutate(r.id)} disabled={acceptMut.isPending} className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50">
                          <CheckCircle size={12} /> Accept
                        </button>
                        <button onClick={() => rejectMut.mutate(r.id)} disabled={rejectMut.isPending} className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50">
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RevenuePage() {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Revenue Management</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Pricing rules, blackout periods, manual overrides, and AI recommendation audit</p>
      </div>

      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-utu-blue text-utu-blue' : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview'          && <OverviewTab onNavigate={setTab} />}
      {tab === 'Pricing Rules'     && <RulesTab />}
      {tab === 'Blackout Periods'  && <BlackoutsTab />}
      {tab === 'Manual Overrides'  && <OverridesTab />}
      {tab === 'AI Audit'          && <AiAuditTab />}
    </div>
  );
}
