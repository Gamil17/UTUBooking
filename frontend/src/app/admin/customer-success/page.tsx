'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, AlertTriangle, Heart, Plus, Edit2, Trash2, X, MessageSquare } from 'lucide-react';
import {
  getCsStats, getCsAccounts, createCsAccount, updateCsAccount, deleteCsAccount,
  getCsTouchpoints, createCsTouchpoint,
  getCsEscalations, createCsEscalation, updateCsEscalation, deleteCsEscalation,
  type CsAccount, type CsTouchpoint, type CsEscalation,
} from '@/lib/api';

const TABS = ['Overview', 'Accounts', 'Escalations', 'Activity Log'] as const;
type Tab = typeof TABS[number];

const TIER_COLORS: Record<string, string> = {
  enterprise: 'bg-purple-100 text-purple-800', premium: 'bg-amber-100 text-amber-800', standard: 'bg-gray-100 text-gray-700',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800', at_risk: 'bg-amber-100 text-amber-800', churned: 'bg-red-100 text-red-800', onboarding: 'bg-blue-100 text-blue-800',
};
const CHURN_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-green-100 text-green-800',
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-green-100 text-green-800',
};
const ESC_STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-800', in_progress: 'bg-amber-100 text-amber-800', resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-700',
};
const OUTCOME_COLORS: Record<string, string> = {
  positive: 'text-green-600', neutral: 'text-gray-500', negative: 'text-red-600',
};

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-4">
      <p className="text-xs font-medium text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-utu-text-primary'}`}>{value}</p>
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// ── Account Panel (slide-in) ──────────────────────────────────────────────────
function AccountPanel({ account, onClose }: { account: CsAccount; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: 'call', summary: '', outcome: 'neutral', owner: '' });
  const { data } = useQuery({ queryKey: ['cs-touchpoints', account.id], queryFn: () => getCsTouchpoints(account.id) });
  const touchpoints = data?.data ?? [];

  const logMut = useMutation({
    mutationFn: (d: Partial<CsTouchpoint>) => createCsTouchpoint(account.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cs-touchpoints', account.id] }); setForm({ type: 'call', summary: '', outcome: 'neutral', owner: '' }); },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-lg flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-utu-text-primary">{account.name}</h2>
            <p className="text-xs text-utu-text-muted">{account.contact_email ?? account.country ?? '—'}</p>
          </div>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-utu-bg-muted p-3"><p className="text-utu-text-muted">Tier</p><p className="font-semibold capitalize text-utu-text-primary">{account.tier}</p></div>
            <div className="rounded-lg bg-utu-bg-muted p-3"><p className="text-utu-text-muted">Health</p><p className="font-semibold text-utu-text-primary">{account.health_score}/100</p></div>
            <div className="rounded-lg bg-utu-bg-muted p-3"><p className="text-utu-text-muted">LTV</p><p className="font-semibold text-utu-text-primary">SAR {Number(account.ltv_sar).toLocaleString()}</p></div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-utu-text-primary">Log Touchpoint</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="flex-1 rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
                  {['call','email','meeting','qbr','onboarding','renewal','escalation','note'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
                  className="flex-1 rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
                  {['positive','neutral','negative'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Summary…"
                rows={2} className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30 resize-none" />
              <div className="flex gap-2">
                <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Owner (optional)"
                  className="flex-1 rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
                <button onClick={() => form.summary && logMut.mutate(form)} disabled={!form.summary || logMut.isPending}
                  className="rounded-lg bg-utu-blue px-3 py-2 text-sm font-medium text-white hover:bg-utu-blue/90 disabled:opacity-50">
                  {logMut.isPending ? '…' : 'Log'}
                </button>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-utu-text-primary">Activity Timeline</h3>
            {touchpoints.length === 0 ? (
              <p className="text-sm text-utu-text-muted">No touchpoints yet.</p>
            ) : (
              <div className="space-y-3">
                {touchpoints.map(tp => (
                  <div key={tp.id} className="flex gap-3 text-sm">
                    <MessageSquare size={16} className={`mt-0.5 shrink-0 ${OUTCOME_COLORS[tp.outcome]}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize text-utu-text-primary">{tp.type}</span>
                        <span className="text-xs text-utu-text-muted">{fmtDate(tp.touched_at)}</span>
                        {tp.owner && <span className="text-xs text-utu-text-muted">· {tp.owner}</span>}
                      </div>
                      <p className="text-utu-text-secondary">{tp.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: statsData } = useQuery({ queryKey: ['cs-stats'], queryFn: getCsStats });
  const s = statsData?.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Active Accounts" value={s?.active_accounts ?? '—'} />
        <StatCard label="At Risk" value={s?.at_risk ?? '—'} color={(s?.at_risk ?? 0) > 0 ? 'text-amber-600' : undefined} />
        <StatCard label="Enterprise Tier" value={s?.enterprise_count ?? '—'} />
        <StatCard label="Open Escalations" value={s?.open_escalations ?? '—'} color={(s?.open_escalations ?? 0) > 0 ? 'text-red-600' : undefined} />
        <StatCard label="Avg Health Score" value={s?.avg_health_score !== undefined ? `${s.avg_health_score}/100` : '—'} />
      </div>
    </div>
  );
}

// ── Accounts Tab ──────────────────────────────────────────────────────────────
function AccountsTab() {
  const qc = useQueryClient();
  const [filterTier, setFilterTier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<CsAccount | null>(null);
  const [editPanel, setEditPanel] = useState<Partial<CsAccount> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const params: Record<string, unknown> = {};
  if (filterTier)   params.tier = filterTier;
  if (filterStatus) params.status = filterStatus;
  if (search)       params.search = search;

  const { data } = useQuery({ queryKey: ['cs-accounts', params], queryFn: () => getCsAccounts(params) });
  const accounts = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: Partial<CsAccount>) => isNew ? createCsAccount(d) : updateCsAccount(editPanel!.id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cs-accounts'] }); qc.invalidateQueries({ queryKey: ['cs-stats'] }); setEditPanel(null); },
  });
  const delMut = useMutation({
    mutationFn: deleteCsAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cs-accounts'] }); qc.invalidateQueries({ queryKey: ['cs-stats'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…"
          className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
        <div className="flex gap-1">
          {['', 'enterprise', 'premium', 'standard'].map(t => (
            <button key={t} onClick={() => setFilterTier(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterTier === t ? 'bg-utu-blue text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
              {t || 'All Tiers'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['', 'active', 'at_risk', 'onboarding', 'churned'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-utu-navy text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
        <button onClick={() => { setIsNew(true); setEditPanel({ tier: 'standard', status: 'active', churn_risk: 'low', health_score: 50 }); }} className="ms-auto flex items-center gap-1 rounded-utu-card bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-utu-blue/90">
          <Plus size={14} /> Add Account
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
            <tr>{['Tier', 'Name', 'Type', 'Country', 'Health', 'Churn Risk', 'Last Contact', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {accounts.map(a => (
              <tr key={a.id} className="cursor-pointer hover:bg-utu-bg-muted/50" onClick={() => setPanel(a)}>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[a.tier]}`}>{a.tier}</span></td>
                <td className="px-4 py-3 font-medium text-utu-text-primary">{a.name}</td>
                <td className="px-4 py-3 text-utu-text-secondary capitalize">{a.type.replace('_',' ')}</td>
                <td className="px-4 py-3 text-utu-text-muted">{a.country ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-utu-bg-muted">
                      <div className={`h-1.5 rounded-full ${a.health_score >= 70 ? 'bg-green-500' : a.health_score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.health_score}%` }} />
                    </div>
                    <span className="text-xs text-utu-text-muted">{a.health_score}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHURN_COLORS[a.churn_risk]}`}>{a.churn_risk}</span></td>
                <td className="px-4 py-3 text-xs text-utu-text-muted">{a.last_contacted_at ? `${daysSince(a.last_contacted_at)}d ago` : 'Never'}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button onClick={() => { setIsNew(false); setEditPanel(a); }} className="p-1 text-utu-text-muted hover:text-utu-blue"><Edit2 size={14} /></button>
                    <button onClick={() => delMut.mutate(a.id)} className="p-1 text-utu-text-muted hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!accounts.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-utu-text-muted">No accounts found.</td></tr>}
          </tbody>
        </table>
      </div>

      {panel && <AccountPanel account={panel} onClose={() => setPanel(null)} />}

      {editPanel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{isNew ? 'New Account' : 'Edit Account'}</h2>
              <button onClick={() => setEditPanel(null)} className="text-utu-text-muted hover:text-utu-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Company Name *', key: 'name', type: 'text' },
                { label: 'Country', key: 'country', type: 'text' },
                { label: 'Contact Name', key: 'contact_name', type: 'text' },
                { label: 'Contact Email', key: 'contact_email', type: 'email' },
                { label: 'Contact Phone', key: 'contact_phone', type: 'text' },
                { label: 'Owner (CS Rep)', key: 'owner', type: 'text' },
                { label: 'LTV SAR', key: 'ltv_sar', type: 'number' },
                { label: 'NPS Score', key: 'nps_score', type: 'number' },
                { label: 'Health Score (0-100)', key: 'health_score', type: 'number' },
                { label: 'Renewal Date', key: 'renewal_date', type: 'date' },
                { label: 'Notes', key: 'notes', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <input type={f.type} value={(editPanel as Record<string,unknown>)[f.key] as string ?? ''}
                    onChange={e => setEditPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
                </div>
              ))}
              {[
                { label: 'Type', key: 'type', opts: ['corporate','travel_agency','vip_individual','group_operator','government'] },
                { label: 'Tier', key: 'tier', opts: ['enterprise','premium','standard'] },
                { label: 'Status', key: 'status', opts: ['active','at_risk','onboarding','churned'] },
                { label: 'Churn Risk', key: 'churn_risk', opts: ['critical','high','medium','low'] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <select value={(editPanel as Record<string,unknown>)[f.key] as string ?? ''} onChange={e => setEditPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
                    {f.opts.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-utu-border-default px-5 py-4">
              <button onClick={() => setEditPanel(null)} className="rounded-lg px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => saveMut.mutate(editPanel)} disabled={saveMut.isPending}
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

// ── Escalations Tab ───────────────────────────────────────────────────────────
function EscalationsTab() {
  const qc = useQueryClient();
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [panel, setPanel] = useState<Partial<CsEscalation> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const params: Record<string, unknown> = {};
  if (filterPriority) params.priority = filterPriority;
  if (filterStatus)   params.status = filterStatus;

  const { data } = useQuery({ queryKey: ['cs-escalations', params], queryFn: () => getCsEscalations(params) });
  const escalations = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: Partial<CsEscalation>) => isNew ? createCsEscalation(d) : updateCsEscalation(panel!.id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cs-escalations'] }); qc.invalidateQueries({ queryKey: ['cs-stats'] }); setPanel(null); },
  });
  const delMut = useMutation({
    mutationFn: deleteCsEscalation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cs-escalations'] }); qc.invalidateQueries({ queryKey: ['cs-stats'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {['', 'critical', 'high', 'medium', 'low'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPriority === p ? 'bg-utu-blue text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
              {p || 'All Priority'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-utu-navy text-white' : 'bg-utu-bg-muted text-utu-text-muted hover:bg-utu-border-default'}`}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
        <button onClick={() => { setIsNew(true); setPanel({ priority: 'medium', status: 'open' }); }} className="ms-auto flex items-center gap-1 rounded-utu-card bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-utu-blue/90">
          <Plus size={14} /> New Escalation
        </button>
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-xs font-medium text-utu-text-muted">
            <tr>{['Priority', 'Account', 'Subject', 'Owner', 'Days Open', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {escalations.map(e => (
              <tr key={e.id} className="hover:bg-utu-bg-muted/50">
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[e.priority]}`}>{e.priority}</span></td>
                <td className="px-4 py-3 font-medium text-utu-text-primary">{e.account_name}</td>
                <td className="px-4 py-3 text-utu-text-secondary max-w-xs truncate">{e.subject}</td>
                <td className="px-4 py-3 text-utu-text-muted">{e.owner ?? '—'}</td>
                <td className="px-4 py-3 text-utu-text-secondary">{daysSince(e.opened_at)}d</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESC_STATUS_COLORS[e.status]}`}>{e.status.replace('_',' ')}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setIsNew(false); setPanel(e); }} className="p-1 text-utu-text-muted hover:text-utu-blue"><Edit2 size={14} /></button>
                    <button onClick={() => delMut.mutate(e.id)} className="p-1 text-utu-text-muted hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!escalations.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-utu-text-muted">No escalations found.</td></tr>}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{isNew ? 'New Escalation' : 'Edit Escalation'}</h2>
              <button onClick={() => setPanel(null)} className="text-utu-text-muted hover:text-utu-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Account Name *', key: 'account_name', type: 'text' },
                { label: 'Subject *', key: 'subject', type: 'text' },
                { label: 'Owner', key: 'owner', type: 'text' },
                { label: 'Root Cause', key: 'root_cause', type: 'text' },
                { label: 'Resolution', key: 'resolution', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <input type={f.type} value={(panel as Record<string,unknown>)[f.key] as string ?? ''}
                    onChange={e => setPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30" />
                </div>
              ))}
              {[
                { label: 'Priority', key: 'priority', opts: ['critical','high','medium','low'] },
                { label: 'Status', key: 'status', opts: ['open','in_progress','resolved','closed'] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">{f.label}</label>
                  <select value={(panel as Record<string,unknown>)[f.key] as string ?? ''} onChange={e => setPanel(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
                    {f.opts.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                  </select>
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

// ── Activity Log Tab ──────────────────────────────────────────────────────────
function ActivityLogTab() {
  const { data: accountsData } = useQuery({ queryKey: ['cs-accounts-all'], queryFn: () => getCsAccounts({ limit: 200 }) });
  const accounts = accountsData?.data ?? [];
  const [selectedAccount, setSelectedAccount] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data } = useQuery({
    queryKey: ['cs-touchpoints-all', selectedAccount],
    queryFn: () => selectedAccount ? getCsTouchpoints(selectedAccount) : Promise.resolve({ data: [] }),
    enabled: !!selectedAccount,
  });
  const touchpoints = data?.data ?? [];
  const filtered = filterType ? touchpoints.filter(t => t.type === filterType) : touchpoints;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
          <option value="">Select account…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue/30">
          <option value="">All Types</option>
          {['call','email','meeting','qbr','onboarding','renewal','escalation','note'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {!selectedAccount ? (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-8 text-center">
          <Users className="mx-auto mb-2 text-utu-text-muted" size={32} />
          <p className="text-sm text-utu-text-muted">Select an account to view its activity log.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-utu-text-muted">No touchpoints found for this account.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(tp => (
            <div key={tp.id} className="flex gap-3 rounded-utu-card border border-utu-border-default bg-utu-bg-card p-4 text-sm">
              <MessageSquare size={16} className={`mt-0.5 shrink-0 ${OUTCOME_COLORS[tp.outcome]}`} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium capitalize text-utu-text-primary">{tp.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tp.outcome === 'positive' ? 'bg-green-100 text-green-800' : tp.outcome === 'negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{tp.outcome}</span>
                  <span className="text-xs text-utu-text-muted">{fmtDate(tp.touched_at)}</span>
                  {tp.owner && <span className="text-xs text-utu-text-muted">· {tp.owner}</span>}
                </div>
                <p className="text-utu-text-secondary">{tp.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomerSuccessPage() {
  const [tab, setTab] = useState<Tab>('Overview');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Customer Success</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Account health, touchpoint log, and escalation management</p>
      </div>
      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-utu-blue text-utu-blue' : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview'      && <OverviewTab />}
      {tab === 'Accounts'      && <AccountsTab />}
      {tab === 'Escalations'   && <EscalationsTab />}
      {tab === 'Activity Log'  && <ActivityLogTab />}
    </div>
  );
}
