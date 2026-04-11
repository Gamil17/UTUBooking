'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBizDevStats, getBizDevPartners, createBizDevPartner, updateBizDevPartner, deleteBizDevPartner,
  getPartnerActivities, createPartnerActivity,
  getBizDevAgreements, getExpiringAgreements, createBizDevAgreement, updateBizDevAgreement, deleteBizDevAgreement,
  getBizDevMarkets, createBizDevMarket, updateBizDevMarket,
  type BizDevStats, type BizDevPartner, type BizDevAgreement, type BizDevActivity, type BizDevMarket,
  type PartnerType, type PartnerTier, type PartnerStatus,
  type AgreementType, type AgreementStatus, type MarketStatus, type MarketRegion, type MarketPriority, type BdActivityType,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sarFmt(n: number) { return `SAR ${Math.round(n).toLocaleString()}`; }
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const TIER_COLORS: Record<PartnerTier, string> = {
  platinum: 'bg-purple-100 text-purple-700',
  gold:     'bg-yellow-100 text-yellow-700',
  silver:   'bg-gray-100   text-gray-600',
  standard: 'bg-blue-100   text-blue-700',
};

const STATUS_COLORS: Record<PartnerStatus, string> = {
  prospect:    'bg-gray-100   text-gray-600',
  contacted:   'bg-blue-100   text-blue-700',
  negotiating: 'bg-amber-100  text-amber-700',
  signed:      'bg-indigo-100 text-indigo-700',
  live:        'bg-green-100  text-green-700',
  paused:      'bg-orange-100 text-orange-700',
  churned:     'bg-red-100    text-red-600',
};

const AGR_STATUS_COLORS: Record<AgreementStatus, string> = {
  draft:      'bg-gray-100   text-gray-600',
  active:     'bg-green-100  text-green-700',
  expired:    'bg-red-100    text-red-600',
  terminated: 'bg-gray-200   text-gray-500',
};

const MARKET_STATUS_COLS: MarketStatus[] = ['target','researching','pilot','launched','paused'];
const MARKET_STATUS_LABELS: Record<MarketStatus, string> = {
  target: 'Target', researching: 'Researching', pilot: 'Pilot', launched: 'Launched', paused: 'Paused',
};
const PRIORITY_COLORS: Record<MarketPriority, string> = {
  critical: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-700', low: 'bg-gray-100 text-gray-500',
};
const ACTIVITY_ICONS: Record<BdActivityType, string> = {
  call: '📞', email: '✉️', demo: '🖥️', meeting: '🤝',
  proposal: '📄', negotiation: '⚖️', signed: '✅', note: '📝',
};

// ─── Shared Components ────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colors = {
    green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50', blue: 'border-utu-blue bg-blue-50',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? colors[accent] : 'border-utu-border-default bg-utu-bg-card'}`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

function SlidePanel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">{title}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-utu-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls   = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const selectCls  = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const btnPrimary = 'rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors';
const btnGhost   = 'rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-muted hover:bg-gray-50';

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['bizdev-stats'], queryFn: getBizDevStats, staleTime: 60_000 });
  const { data: expiring }  = useQuery({ queryKey: ['bizdev-expiring-5'], queryFn: () => getExpiringAgreements(90), staleTime: 60_000 });

  const stats: BizDevStats | undefined = (data as any)?.data;
  const expiringList: BizDevAgreement[] = ((expiring as any)?.data ?? []).slice(0, 5);

  if (isLoading) return <div className="py-20 text-center text-sm text-utu-text-muted">Loading...</div>;
  if (!stats)    return <div className="py-20 text-center text-sm text-utu-text-muted">No data available.</div>;

  const pipelineStages: { label: string; key: keyof typeof stats.partners; color: string }[] = [
    { label: 'Prospect',    key: 'prospect',    color: 'bg-gray-400' },
    { label: 'Negotiating', key: 'negotiating', color: 'bg-amber-400' },
    { label: 'Signed',      key: 'signed',      color: 'bg-indigo-400' },
    { label: 'Live',        key: 'live',        color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-8">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Active Partners" value={String(stats.partners.live + stats.partners.signed)}
          sub={`${stats.partners.total} total`} accent="green" />
        <KpiCard label="Agreement Value" value={sarFmt(stats.agreements.active_value_sar)}
          sub={`${stats.agreements.active} active agreements`} accent="blue" />
        <KpiCard label="Expiring (90d)" value={String(stats.agreements.expiring_90d)}
          sub="Agreements needing renewal" accent={stats.agreements.expiring_90d > 0 ? 'amber' : undefined} />
        <KpiCard label="Active Markets" value={String(stats.markets.launched + stats.markets.pilot)}
          sub={`${stats.markets.total} total tracked`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tier breakdown */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-utu-text-primary">Partner Tiers</h3>
            <button onClick={() => onNavigate('Partners')} className={btnGhost}>View all</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['platinum','gold','silver','standard'] as PartnerTier[]).map(tier => (
              <div key={tier} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${TIER_COLORS[tier]}`}>
                <span className="text-xs font-medium capitalize">{tier}</span>
                <span className="text-sm font-bold">{stats.partners.by_tier[tier]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Partner pipeline */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="text-sm font-semibold text-utu-text-primary mb-4">Partner Pipeline</h3>
          <div className="space-y-2">
            {pipelineStages.map(({ label, key, color }) => {
              const count = stats.partners[key] as number;
              const pct   = stats.partners.total > 0 ? Math.round((count / stats.partners.total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-utu-text-muted">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-utu-text-primary">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expiring agreements */}
      {expiringList.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-800">Agreements Expiring Soon</h3>
            <button onClick={() => onNavigate('Agreements')} className="text-xs text-amber-700 underline">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {expiringList.map(a => {
              const days = daysUntil(a.end_date);
              return (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-utu-text-primary">{a.partner_name}</span>
                  <span className="text-utu-text-muted truncate mx-4 flex-1">{a.title}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${days !== null && days <= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {days !== null ? `${days}d` : fmtDate(a.end_date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Market status summary */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-utu-text-primary">Market Expansion</h3>
          <button onClick={() => onNavigate('Market Expansion')} className={btnGhost}>View map</button>
        </div>
        <div className="flex flex-wrap gap-3">
          {MARKET_STATUS_COLS.map(s => (
            <div key={s} className="flex items-center gap-2 rounded-lg border border-utu-border-default bg-white px-3 py-2">
              <span className="text-xs text-utu-text-muted capitalize">{MARKET_STATUS_LABELS[s]}</span>
              <span className="text-sm font-bold text-utu-text-primary">{stats.markets[s as keyof typeof stats.markets] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Partners ────────────────────────────────────────────────────────────

function PartnersTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter]     = useState('');
  const [tierFilter, setTierFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [panel, setPanel]               = useState<BizDevPartner | null | 'new'>(null);
  const [form, setForm]                 = useState<Partial<BizDevPartner>>({});
  const [activityForm, setActivityForm] = useState<Partial<BizDevActivity>>({});
  const [showActivity, setShowActivity] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bizdev-partners', typeFilter, tierFilter, statusFilter, search],
    queryFn: () => getBizDevPartners({
      type: typeFilter || undefined, tier: tierFilter || undefined,
      status: statusFilter || undefined, search: search || undefined, limit: 100,
    }),
    staleTime: 30_000,
  });

  const partnerActivities = useQuery({
    queryKey: ['bizdev-activities', (panel as BizDevPartner)?.id],
    queryFn: () => getPartnerActivities((panel as BizDevPartner).id, { limit: 20 }),
    enabled: !!panel && panel !== 'new',
    staleTime: 30_000,
  });

  const partners: BizDevPartner[] = (data as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createBizDevPartner,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-partners'] }); qc.invalidateQueries({ queryKey: ['bizdev-stats'] }); setPanel(null); setForm({}); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BizDevPartner> }) => updateBizDevPartner(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-partners'] }); setPanel(null); setForm({}); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBizDevPartner(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-partners'] }); qc.invalidateQueries({ queryKey: ['bizdev-stats'] }); setPanel(null); },
  });
  const activityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BizDevActivity> }) => createPartnerActivity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bizdev-activities'] });
      qc.invalidateQueries({ queryKey: ['bizdev-stats'] });
      setActivityForm({}); setShowActivity(false);
    },
  });

  const openNew = () => { setForm({}); setPanel('new'); };
  const openEdit = (p: BizDevPartner) => { setForm({ ...p }); setPanel(p); };
  const savePartner = () => {
    if (panel === 'new') createMutation.mutate(form);
    else if (panel) updateMutation.mutate({ id: (panel as BizDevPartner).id, data: form });
  };

  const TYPE_FILTERS = ['','airline','travel_agency','gds','corporate','ota','bank','whitelabel','other'];
  const TYPE_LABELS: Record<string, string> = {
    '': 'All Types', airline: 'Airline', travel_agency: 'Travel Agency', gds: 'GDS',
    corporate: 'Corporate', ota: 'OTA', bank: 'Bank', whitelabel: 'White-label', other: 'Other',
  };

  const activities: BizDevActivity[] = (partnerActivities.data as any)?.data ?? [];

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search partners..." className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-utu-border-default px-2 py-1.5 text-sm bg-white">
          {TYPE_FILTERS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="rounded-lg border border-utu-border-default px-2 py-1.5 text-sm bg-white">
          <option value="">All Tiers</option>
          {(['platinum','gold','silver','standard'] as PartnerTier[]).map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-utu-border-default px-2 py-1.5 text-sm bg-white">
          <option value="">All Statuses</option>
          {(['prospect','contacted','negotiating','signed','live','paused','churned'] as PartnerStatus[]).map(s =>
            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <div className="ms-auto">
          <button onClick={openNew} className={btnPrimary}>+ Add Partner</button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">Loading...</p>
      ) : partners.length === 0 ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">No partners found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-utu-text-muted">
              <tr>
                {['Tier','Company','Type','Country','Rev. Share','Status','Last Contact',''].map(h => (
                  <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(p)}>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_COLORS[p.tier]}`}>{p.tier}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-utu-text-primary">{p.company_name}</td>
                  <td className="px-4 py-3 text-utu-text-muted capitalize">{p.type.replace('_',' ')}</td>
                  <td className="px-4 py-3 text-utu-text-muted">{p.country ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-muted">{p.revenue_share_pct}%</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-muted">{fmtDate(p.last_contacted_at)}</td>
                  <td className="px-4 py-3 text-end">
                    <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                      className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Partner panel */}
      <SlidePanel open={!!panel} onClose={() => { setPanel(null); setForm({}); setShowActivity(false); }}
        title={panel === 'new' ? 'New Partner' : (panel as BizDevPartner)?.company_name ?? 'Edit Partner'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *">
              <input value={form.company_name ?? ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Country">
              <input value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputCls} placeholder="SA, AE..." />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type ?? 'other'} onChange={e => setForm(f => ({ ...f, type: e.target.value as PartnerType }))} className={selectCls}>
                {(['airline','travel_agency','gds','corporate','ota','bank','whitelabel','other'] as PartnerType[]).map(t =>
                  <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </Field>
            <Field label="Tier">
              <select value={form.tier ?? 'standard'} onChange={e => setForm(f => ({ ...f, tier: e.target.value as PartnerTier }))} className={selectCls}>
                {(['platinum','gold','silver','standard'] as PartnerTier[]).map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={form.status ?? 'prospect'} onChange={e => setForm(f => ({ ...f, status: e.target.value as PartnerStatus }))} className={selectCls}>
                {(['prospect','contacted','negotiating','signed','live','paused','churned'] as PartnerStatus[]).map(s =>
                  <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Field>
            <Field label="Revenue Share %">
              <input type="number" min={0} max={100} step={0.5}
                value={form.revenue_share_pct ?? 0}
                onChange={e => setForm(f => ({ ...f, revenue_share_pct: parseFloat(e.target.value) }))}
                className={inputCls} />
            </Field>
          </div>
          <Field label="Contact Name">
            <input value={form.contact_name ?? ''} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Email">
              <input type="email" value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Contact Phone">
              <input value={form.contact_phone ?? ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="Owner">
            <input value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Notes">
            <textarea rows={3} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </Field>
          <button onClick={savePartner} className={`w-full ${btnPrimary}`}>
            {panel === 'new' ? 'Create Partner' : 'Save Changes'}
          </button>

          {/* Activity log within panel */}
          {panel !== 'new' && (
            <div className="mt-6 border-t border-utu-border-default pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-utu-text-primary">Activity Log</h4>
                <button onClick={() => setShowActivity(v => !v)} className={btnGhost}>
                  {showActivity ? 'Cancel' : '+ Log Activity'}
                </button>
              </div>
              {showActivity && (
                <div className="mb-4 space-y-3 rounded-lg border border-utu-border-default p-3">
                  <Field label="Type">
                    <select value={activityForm.type ?? 'note'} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value as BdActivityType }))} className={selectCls}>
                      {(['call','email','demo','meeting','proposal','negotiation','signed','note'] as BdActivityType[]).map(t =>
                        <option key={t} value={t}>{ACTIVITY_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Summary *">
                    <textarea rows={2} value={activityForm.summary ?? ''} onChange={e => setActivityForm(f => ({ ...f, summary: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Owner">
                    <input value={activityForm.owner ?? ''} onChange={e => setActivityForm(f => ({ ...f, owner: e.target.value }))} className={inputCls} />
                  </Field>
                  <button onClick={() => activityMutation.mutate({ id: (panel as BizDevPartner).id, data: activityForm })}
                    className={btnPrimary} disabled={!activityForm.summary?.trim()}>
                    Save Activity
                  </button>
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activities.length === 0
                  ? <p className="text-xs text-utu-text-muted">No activities logged yet.</p>
                  : activities.map(a => (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <span className="text-base leading-none mt-0.5">{ACTIVITY_ICONS[a.type]}</span>
                      <div className="flex-1">
                        <p className="text-utu-text-primary">{a.summary}</p>
                        <p className="text-utu-text-muted">{a.owner ? `${a.owner} · ` : ''}{fmtDate(a.activity_at)}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Agreements ──────────────────────────────────────────────────────────

function AgreementsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [panel, setPanel]               = useState<BizDevAgreement | 'new' | null>(null);
  const [form, setForm]                 = useState<Partial<BizDevAgreement>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['bizdev-agreements', statusFilter, typeFilter],
    queryFn: () => getBizDevAgreements({ status: statusFilter || undefined, type: typeFilter || undefined, limit: 100 }),
    staleTime: 30_000,
  });

  const agreements: BizDevAgreement[] = (data as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createBizDevAgreement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-agreements'] }); qc.invalidateQueries({ queryKey: ['bizdev-stats'] }); setPanel(null); setForm({}); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BizDevAgreement> }) => updateBizDevAgreement(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-agreements'] }); setPanel(null); setForm({}); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBizDevAgreement(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-agreements'] }); qc.invalidateQueries({ queryKey: ['bizdev-stats'] }); },
  });

  const openNew  = () => { setForm({}); setPanel('new'); };
  const openEdit = (a: BizDevAgreement) => { setForm({ ...a }); setPanel(a); };
  const save     = () => {
    if (panel === 'new') createMutation.mutate(form);
    else if (panel) updateMutation.mutate({ id: (panel as BizDevAgreement).id, data: form });
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['','draft','active','expired','terminated'] as (AgreementStatus | '')[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-utu-navy text-white' : 'bg-gray-100 text-utu-text-muted hover:bg-gray-200'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="ms-2 rounded-lg border border-utu-border-default px-2 py-1.5 text-sm bg-white">
          <option value="">All Types</option>
          {(['revenue_share','white_label','distribution','referral','api_integration','other'] as AgreementType[]).map(t =>
            <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
        <div className="ms-auto"><button onClick={openNew} className={btnPrimary}>+ New Agreement</button></div>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">Loading...</p>
      ) : agreements.length === 0 ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">No agreements found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-utu-text-muted">
              <tr>
                {['Partner','Title','Type','Value SAR','Commission','Start','End','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {agreements.map(a => {
                const days = daysUntil(a.end_date);
                const expiry = a.status === 'active' && days !== null && days <= 90;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(a)}>
                    <td className="px-4 py-3 font-medium text-utu-text-primary">{a.partner_name}</td>
                    <td className="px-4 py-3 text-utu-text-muted max-w-[180px] truncate">{a.title}</td>
                    <td className="px-4 py-3 text-utu-text-muted capitalize">{a.type.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-utu-text-muted">{sarFmt(a.value_sar)}</td>
                    <td className="px-4 py-3 text-utu-text-muted">{a.commission_pct}%</td>
                    <td className="px-4 py-3 text-utu-text-muted">{fmtDate(a.start_date)}</td>
                    <td className="px-4 py-3">
                      <span className={expiry ? (days! <= 30 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium') : 'text-utu-text-muted'}>
                        {fmtDate(a.end_date)}
                        {expiry && <span className="ms-1 text-xs">({days}d)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${AGR_STATUS_COLORS[a.status]}`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(a.id); }}
                        className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SlidePanel open={!!panel} onClose={() => { setPanel(null); setForm({}); }}
        title={panel === 'new' ? 'New Agreement' : 'Edit Agreement'}>
        <div className="space-y-4">
          <Field label="Partner Name *">
            <input value={form.partner_name ?? ''} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Agreement Title *">
            <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type ?? 'revenue_share'} onChange={e => setForm(f => ({ ...f, type: e.target.value as AgreementType }))} className={selectCls}>
                {(['revenue_share','white_label','distribution','referral','api_integration','other'] as AgreementType[]).map(t =>
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status ?? 'draft'} onChange={e => setForm(f => ({ ...f, status: e.target.value as AgreementStatus }))} className={selectCls}>
                {(['draft','active','expired','terminated'] as AgreementStatus[]).map(s =>
                  <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value (SAR)">
              <input type="number" min={0} value={form.value_sar ?? 0} onChange={e => setForm(f => ({ ...f, value_sar: parseFloat(e.target.value) }))} className={inputCls} />
            </Field>
            <Field label="Commission %">
              <input type="number" min={0} max={100} step={0.5} value={form.commission_pct ?? 0} onChange={e => setForm(f => ({ ...f, commission_pct: parseFloat(e.target.value) }))} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input type="date" value={form.start_date?.slice(0,10) ?? ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.end_date?.slice(0,10) ?? ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="Signed By">
            <input value={form.signed_by ?? ''} onChange={e => setForm(f => ({ ...f, signed_by: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="File URL">
            <input value={form.file_url ?? ''} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} className={inputCls} placeholder="https://..." />
          </Field>
          <Field label="Notes">
            <textarea rows={3} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </Field>
          <button onClick={save} className={`w-full ${btnPrimary}`} disabled={!form.partner_name?.trim() || !form.title?.trim()}>
            {panel === 'new' ? 'Create Agreement' : 'Save Changes'}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Activity Log ────────────────────────────────────────────────────────

function ActivityLogTab() {
  const qc = useQueryClient();
  const [partnerFilter, setPartnerFilter] = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState<Partial<BizDevActivity>>({});

  const { data: partnersData } = useQuery({
    queryKey: ['bizdev-partners-all'],
    queryFn: () => getBizDevPartners({ limit: 200 }),
    staleTime: 120_000,
  });
  const partners: BizDevPartner[] = (partnersData as any)?.data ?? [];

  // Fetch activities for selected partner or all
  const { data: actData, isLoading } = useQuery({
    queryKey: ['bizdev-activity-log', partnerFilter],
    queryFn: () => partnerFilter
      ? getPartnerActivities(partnerFilter, { limit: 100 })
      : Promise.resolve({ data: [] }),
    enabled: !!partnerFilter,
    staleTime: 30_000,
  });

  const all: BizDevActivity[] = (actData as any)?.data ?? [];
  const filtered = typeFilter ? all.filter(a => a.type === typeFilter) : all;

  const logMutation = useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: string; data: Partial<BizDevActivity> }) =>
      createPartnerActivity(partnerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bizdev-activity-log'] });
      qc.invalidateQueries({ queryKey: ['bizdev-activities'] });
      qc.invalidateQueries({ queryKey: ['bizdev-stats'] });
      setForm({}); setShowForm(false);
    },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm bg-white w-48">
          <option value="">Select a partner</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-utu-border-default px-2 py-1.5 text-sm bg-white">
          <option value="">All Types</option>
          {(['call','email','demo','meeting','proposal','negotiation','signed','note'] as BdActivityType[]).map(t =>
            <option key={t} value={t}>{ACTIVITY_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <div className="ms-auto">
          <button onClick={() => setShowForm(v => !v)} className={btnPrimary}>
            {showForm ? 'Cancel' : '+ Log Activity'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-utu-border-default bg-utu-bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Partner *">
              <select value={form.partner_id ?? ''} onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))} className={selectCls}>
                <option value="">Select partner</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
              </select>
            </Field>
            <Field label="Activity Type">
              <select value={form.type ?? 'note'} onChange={e => setForm(f => ({ ...f, type: e.target.value as BdActivityType }))} className={selectCls}>
                {(['call','email','demo','meeting','proposal','negotiation','signed','note'] as BdActivityType[]).map(t =>
                  <option key={t} value={t}>{ACTIVITY_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Summary *">
            <textarea rows={2} value={form.summary ?? ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <input value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Date">
              <input type="datetime-local" value={form.activity_at?.slice(0,16) ?? new Date().toISOString().slice(0,16)}
                onChange={e => setForm(f => ({ ...f, activity_at: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <button onClick={() => form.partner_id && logMutation.mutate({ partnerId: form.partner_id, data: form })}
            className={btnPrimary} disabled={!form.partner_id || !form.summary?.trim()}>
            Save Activity
          </button>
        </div>
      )}

      {!partnerFilter ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">Select a partner above to view their activity log.</p>
      ) : isLoading ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-utu-text-muted">No activities logged yet for this partner.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="flex gap-3 rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-3">
              <span className="text-xl leading-none mt-0.5 shrink-0">{ACTIVITY_ICONS[a.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-utu-text-primary">{a.summary}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="rounded-full bg-utu-bg-page px-2 py-0.5 text-xs text-utu-text-muted">{a.partner_name}</span>
                  {a.owner && <span className="text-xs text-utu-text-muted">{a.owner}</span>}
                  <span className="text-xs text-utu-text-muted ms-auto">{fmtDate(a.activity_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Market Expansion ────────────────────────────────────────────────────

function MarketExpansionTab() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<BizDevMarket | 'new' | null>(null);
  const [form, setForm]   = useState<Partial<BizDevMarket>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['bizdev-markets'],
    queryFn: () => getBizDevMarkets({ limit: 200 }),
    staleTime: 60_000,
  });

  const markets: BizDevMarket[] = (data as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createBizDevMarket,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-markets'] }); qc.invalidateQueries({ queryKey: ['bizdev-stats'] }); setPanel(null); setForm({}); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BizDevMarket> }) => updateBizDevMarket(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bizdev-markets'] }); setPanel(null); setForm({}); },
  });

  const save = () => {
    if (panel === 'new') createMutation.mutate(form);
    else if (panel) updateMutation.mutate({ id: (panel as BizDevMarket).id, data: form });
  };

  const REGION_FLAGS: Record<string, string> = {
    SA: '🇸🇦', AE: '🇦🇪', KW: '🇰🇼', QA: '🇶🇦', BH: '🇧🇭', OM: '🇴🇲',
    EG: '🇪🇬', TR: '🇹🇷', PK: '🇵🇰', ID: '🇮🇩', MY: '🇲🇾', IN: '🇮🇳',
    GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', US: '🇺🇸', CA: '🇨🇦', BR: '🇧🇷',
  };

  if (isLoading) return <p className="py-12 text-center text-sm text-utu-text-muted">Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => { setForm({}); setPanel('new'); }} className={btnPrimary}>+ Add Market</button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-5 gap-3 overflow-x-auto" style={{ minWidth: 800 }}>
        {MARKET_STATUS_COLS.map(col => {
          const colMarkets = markets.filter(m => m.status === col);
          return (
            <div key={col} className="rounded-xl border border-utu-border-default bg-utu-bg-page p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-utu-text-primary uppercase tracking-wide">
                  {MARKET_STATUS_LABELS[col]}
                </span>
                <span className="rounded-full bg-white border border-utu-border-default px-2 py-0.5 text-xs text-utu-text-muted">
                  {colMarkets.length}
                </span>
              </div>
              <div className="space-y-2">
                {colMarkets.length === 0 && (
                  <p className="text-xs text-utu-text-muted text-center py-4">No markets</p>
                )}
                {colMarkets.map(m => (
                  <div key={m.id} onClick={() => { setForm({ ...m }); setPanel(m); }}
                    className="cursor-pointer rounded-lg border border-utu-border-default bg-white p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-base">{REGION_FLAGS[m.country_code] ?? '🌍'}</span>
                      <span className="text-xs font-semibold text-utu-text-primary">{m.country_name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-full bg-utu-bg-page px-1.5 py-0.5 text-xs text-utu-text-muted">{m.region}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[m.priority]}`}>
                        {m.priority}
                      </span>
                    </div>
                    {m.target_launch_date && (
                      <p className="mt-1.5 text-xs text-utu-text-muted">Target: {fmtDate(m.target_launch_date)}</p>
                    )}
                    {m.partner_count > 0 && (
                      <p className="mt-0.5 text-xs text-utu-text-muted">{m.partner_count} partner{m.partner_count > 1 ? 's' : ''}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <SlidePanel open={!!panel} onClose={() => { setPanel(null); setForm({}); }}
        title={panel === 'new' ? 'Add Market' : (panel as BizDevMarket)?.country_name ?? 'Edit Market'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country Code *">
              <input value={form.country_code ?? ''} onChange={e => setForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))}
                className={inputCls} placeholder="SA, AE, US..." maxLength={3} />
            </Field>
            <Field label="Country Name *">
              <input value={form.country_name ?? ''} onChange={e => setForm(f => ({ ...f, country_name: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Region">
              <select value={form.region ?? 'MENA'} onChange={e => setForm(f => ({ ...f, region: e.target.value as MarketRegion }))} className={selectCls}>
                {(['GCC','MENA','APAC','EU','US','LATAM','AFRICA','OTHER'] as MarketRegion[]).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status ?? 'target'} onChange={e => setForm(f => ({ ...f, status: e.target.value as MarketStatus }))} className={selectCls}>
                {MARKET_STATUS_COLS.map(s => <option key={s} value={s}>{MARKET_STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={form.priority ?? 'medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value as MarketPriority }))} className={selectCls}>
                {(['critical','high','medium','low'] as MarketPriority[]).map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </Field>
            <Field label="Partner Count">
              <input type="number" min={0} value={form.partner_count ?? 0}
                onChange={e => setForm(f => ({ ...f, partner_count: parseInt(e.target.value) }))} className={inputCls} />
            </Field>
          </div>
          <Field label="Target Launch Date">
            <input type="date" value={form.target_launch_date?.slice(0,10) ?? ''}
              onChange={e => setForm(f => ({ ...f, target_launch_date: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Owner">
            <input value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Notes">
            <textarea rows={3} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </Field>
          <button onClick={save} className={`w-full ${btnPrimary}`} disabled={!form.country_code?.trim() || !form.country_name?.trim()}>
            {panel === 'new' ? 'Add Market' : 'Save Changes'}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Partners', 'Agreements', 'Activity Log', 'Market Expansion'] as const;
type Tab = typeof TABS[number];

export default function BizDevPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="min-h-screen bg-utu-bg-page">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-utu-text-primary">Business Development</h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Strategic partnerships, agreements, and market expansion
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 border-b border-utu-border-default">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-utu-blue text-utu-blue'
                  : 'text-utu-text-muted hover:text-utu-text-primary'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Overview'          && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === 'Partners'          && <PartnersTab />}
        {activeTab === 'Agreements'        && <AgreementsTab />}
        {activeTab === 'Activity Log'      && <ActivityLogTab />}
        {activeTab === 'Market Expansion'  && <MarketExpansionTab />}
      </div>
    </div>
  );
}
