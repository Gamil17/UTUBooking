'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAffiliateStats, getAffiliateApplications, updateAffiliateApplication, approveAffiliateApplication,
  getAffiliatePartners, createAffiliatePartner, updateAffiliatePartner, terminateAffiliatePartner,
  getAffiliatePayouts, createAffiliatePayout, updateAffiliatePayout,
  type AffiliateStats, type AffiliateApplication, type AffiliatePartner, type AffiliatePayout,
  type AffiliatePartnerTier, type AffiliateAppStatus, type AffiliatePartnerStatus, type AffiliatePayoutStatus,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sarFmt(n: number) { return `SAR ${Math.round(n).toLocaleString()}`; }
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TIER_COLORS: Record<AffiliatePartnerTier, string> = {
  elite:   'bg-purple-100 text-purple-700',
  pro:     'bg-blue-100   text-blue-700',
  starter: 'bg-gray-100   text-gray-600',
};

const APP_STATUS_COLORS: Record<AffiliateAppStatus, string> = {
  pending:   'bg-amber-100  text-amber-700',
  reviewing: 'bg-blue-100   text-blue-700',
  approved:  'bg-green-100  text-green-700',
  rejected:  'bg-red-100    text-red-600',
};

const PARTNER_STATUS_COLORS: Record<AffiliatePartnerStatus, string> = {
  active:     'bg-green-100  text-green-700',
  paused:     'bg-orange-100 text-orange-700',
  terminated: 'bg-red-100    text-red-600',
};

const PAYOUT_STATUS_COLORS: Record<AffiliatePayoutStatus, string> = {
  pending:    'bg-amber-100  text-amber-700',
  processing: 'bg-blue-100   text-blue-700',
  paid:       'bg-green-100  text-green-700',
  cancelled:  'bg-gray-100   text-gray-500',
};

type Tab = 'overview' | 'applications' | 'partners' | 'payouts';

// ─── Shared UI ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colors = {
    green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50',
    red:   'border-red-200   bg-red-50',   blue:  'border-blue-200  bg-blue-50',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? colors[accent] : 'border-utu-border-default bg-utu-bg-card'}`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

function Badge({ label, colorCls }: { label: string; colorCls: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorCls}`}>{label}</span>;
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

const inputCls  = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const selectCls = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const btnPrimary = 'rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors disabled:opacity-50';
const btnGhost   = 'rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-muted hover:bg-gray-50';

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['affiliate-stats'], queryFn: getAffiliateStats, staleTime: 60_000 });
  const stats: AffiliateStats | undefined = (data as any)?.data;

  if (isLoading) return <div className="py-20 text-center text-sm text-utu-text-muted">Loading...</div>;
  if (!stats)    return <div className="py-20 text-center text-sm text-utu-text-muted">No data available.</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Active Partners"     value={String(stats.partners.active)}     accent="green" />
        <KpiCard label="Pending Applications" value={String(stats.applications.pending)} accent="amber" />
        <KpiCard label="Total Earned"         value={sarFmt(stats.partners.total_earned_sar)} />
        <KpiCard label="Pending Payouts"      value={sarFmt(stats.payouts.pending_sar)}  accent="red"
          sub={`${stats.payouts.pending_count} payouts`} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Partner Tiers */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="text-sm font-semibold text-utu-text-primary mb-4">Partners by Tier</h3>
          <div className="space-y-3">
            {(['elite','pro','starter'] as AffiliatePartnerTier[]).map(tier => (
              <div key={tier} className="flex items-center justify-between">
                <Badge label={tier.charAt(0).toUpperCase() + tier.slice(1)} colorCls={TIER_COLORS[tier]} />
                <span className="text-sm font-semibold text-utu-text-primary">{stats.partners.by_tier[tier]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Applications funnel */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="text-sm font-semibold text-utu-text-primary mb-4">Applications Pipeline</h3>
          <div className="space-y-3">
            {([
              { label: 'Pending',   key: 'pending'   as const, color: 'bg-amber-400' },
              { label: 'Reviewing', key: 'reviewing' as const, color: 'bg-blue-400'  },
              { label: 'Approved',  key: 'approved'  as const, color: 'bg-green-500' },
              { label: 'Rejected',  key: 'rejected'  as const, color: 'bg-red-400'   },
            ]).map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                <span className="text-sm text-utu-text-secondary flex-1">{s.label}</span>
                <span className="text-sm font-semibold text-utu-text-primary">{stats.applications[s.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => onNavigate('applications')} className={btnGhost}>View Applications</button>
        <button onClick={() => onNavigate('partners')}     className={btnGhost}>Manage Partners</button>
        <button onClick={() => onNavigate('payouts')}      className={btnGhost}>Process Payouts</button>
      </div>
    </div>
  );
}

// ─── Tab: Applications ────────────────────────────────────────────────────────

function ApplicationsTab() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [selected, setSelected] = useState<AffiliateApplication | null>(null);
  const [approvePanel, setApprovePanel] = useState(false);
  const [approveTier, setApproveTier]   = useState<AffiliatePartnerTier>('starter');
  const [approveComm, setApproveComm]   = useState('3');

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-applications', search, status],
    queryFn: () => getAffiliateApplications({ search: search || undefined, status: status || undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const apps: AffiliateApplication[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const patchMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<AffiliateApplication> }) => updateAffiliateApplication(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-applications'] }),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, tier, comm }: { id: string; tier: AffiliatePartnerTier; comm: number }) =>
      approveAffiliateApplication(id, { tier, commission_pct: comm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affiliate-applications'] });
      qc.invalidateQueries({ queryKey: ['affiliate-stats'] });
      setApprovePanel(false);
      setSelected(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-xs text-utu-text-muted ms-auto">{total} applications</span>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : apps.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No applications found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Applicant','Platform','Audience','Status','Applied','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {apps.map(app => (
                <tr key={app.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{app.name}</p>
                    <p className="text-xs text-utu-text-muted">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-utu-text-secondary">{app.platform}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{app.audience_size.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3">
                    <Badge label={app.status} colorCls={APP_STATUS_COLORS[app.status]} />
                  </td>
                  <td className="px-4 py-3 text-utu-text-muted">{fmtDate(app.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(app)} className={btnGhost}>View</button>
                      {app.status === 'pending' && (
                        <button onClick={() => patchMut.mutate({ id: app.id, d: { status: 'reviewing' } })}
                          className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50">
                          Review
                        </button>
                      )}
                      {(app.status === 'pending' || app.status === 'reviewing') && (
                        <button onClick={() => { setSelected(app); setApprovePanel(true); }}
                          className="rounded-lg border border-green-200 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50">
                          Approve
                        </button>
                      )}
                      {app.status !== 'rejected' && app.status !== 'approved' && (
                        <button onClick={() => patchMut.mutate({ id: app.id, d: { status: 'rejected' } })}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View panel */}
      <SlidePanel open={!!selected && !approvePanel} onClose={() => setSelected(null)} title="Application Details">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-utu-text-muted">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-utu-text-muted">Email</p><p>{selected.email}</p></div>
              <div><p className="text-xs text-utu-text-muted">Platform</p><p className="capitalize">{selected.platform}</p></div>
              <div><p className="text-xs text-utu-text-muted">Audience</p><p>{selected.audience_size.replace(/_/g,' ')}</p></div>
              <div><p className="text-xs text-utu-text-muted">Website</p><p>{selected.website || '—'}</p></div>
              <div><p className="text-xs text-utu-text-muted">Status</p><Badge label={selected.status} colorCls={APP_STATUS_COLORS[selected.status]} /></div>
            </div>
            {selected.message && (
              <div>
                <p className="text-xs text-utu-text-muted mb-1">Message</p>
                <p className="rounded-lg bg-utu-bg-subtle p-3">{selected.message}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-utu-text-muted mb-1">Admin Notes</p>
              <textarea rows={3} className={inputCls} defaultValue={selected.admin_notes ?? ''}
                onBlur={e => {
                  if (e.target.value !== (selected.admin_notes ?? '')) {
                    patchMut.mutate({ id: selected.id, d: { admin_notes: e.target.value } });
                  }
                }} />
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Approve panel */}
      <SlidePanel open={!!selected && approvePanel} onClose={() => { setApprovePanel(false); setSelected(null); }} title="Approve Application">
        {selected && (
          <div className="space-y-5">
            <p className="text-sm text-utu-text-secondary">
              Approving <strong>{selected.name}</strong> will create an affiliate partner account with the settings below.
            </p>
            <Field label="Tier">
              <select value={approveTier} onChange={e => setApproveTier(e.target.value as AffiliatePartnerTier)} className={selectCls}>
                <option value="starter">Starter (3% default)</option>
                <option value="pro">Pro (5% default)</option>
                <option value="elite">Elite (8% default)</option>
              </select>
            </Field>
            <Field label="Commission %">
              <input type="number" step="0.5" min="1" max="20" value={approveComm}
                onChange={e => setApproveComm(e.target.value)} className={inputCls} />
            </Field>
            <button
              disabled={approveMut.isPending}
              onClick={() => approveMut.mutate({ id: selected.id, tier: approveTier, comm: parseFloat(approveComm) })}
              className={btnPrimary}>
              {approveMut.isPending ? 'Approving…' : 'Confirm Approval'}
            </button>
            {approveMut.isError && <p className="text-xs text-red-600">Failed to approve. Please try again.</p>}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Partners ────────────────────────────────────────────────────────────

function PartnersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tier, setTier]     = useState('');
  const [status, setStatus] = useState('active');
  const [panel, setPanel]   = useState<'edit' | 'add' | null>(null);
  const [selected, setSelected] = useState<AffiliatePartner | null>(null);
  const [form, setForm] = useState({ name:'', email:'', platform:'other', audience_size:'under_1k',
    tier:'starter' as AffiliatePartnerTier, commission_pct:'3', payout_method:'bank_transfer', notes:'' });

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-partners', search, tier, status],
    queryFn: () => getAffiliatePartners({ search: search||undefined, tier: tier||undefined, status: status||undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const partners: AffiliatePartner[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const createMut = useMutation({
    mutationFn: createAffiliatePartner,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['affiliate-partners'] }); setPanel(null); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<AffiliatePartner> }) => updateAffiliatePartner(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['affiliate-partners'] }); setPanel(null); setSelected(null); },
  });

  const terminateMut = useMutation({
    mutationFn: terminateAffiliatePartner,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-partners'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email / code…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Tiers</option>
          <option value="elite">Elite</option>
          <option value="pro">Pro</option>
          <option value="starter">Starter</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="terminated">Terminated</option>
        </select>
        <span className="text-xs text-utu-text-muted">{total} partners</span>
        <button onClick={() => setPanel('add')} className={`${btnPrimary} ms-auto`}>+ Add Partner</button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : partners.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No partners found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Partner','Tier','Referral Code','Commission','Bookings','Earned','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{p.name}</p>
                    <p className="text-xs text-utu-text-muted">{p.email}</p>
                  </td>
                  <td className="px-4 py-3"><Badge label={p.tier} colorCls={TIER_COLORS[p.tier]} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-utu-text-secondary">{p.referral_code ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{p.commission_pct}%</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{p.total_bookings}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{sarFmt(p.total_earned_sar)}</td>
                  <td className="px-4 py-3"><Badge label={p.status} colorCls={PARTNER_STATUS_COLORS[p.status]} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelected(p); setPanel('edit'); }} className={btnGhost}>Edit</button>
                      {p.status === 'active' && (
                        <button onClick={() => updateMut.mutate({ id: p.id, d: { status: 'paused' } })}
                          className="rounded-lg border border-orange-200 px-2 py-1 text-xs text-orange-700 hover:bg-orange-50">
                          Pause
                        </button>
                      )}
                      {p.status === 'paused' && (
                        <button onClick={() => updateMut.mutate({ id: p.id, d: { status: 'active' } })}
                          className="rounded-lg border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50">
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add partner panel */}
      <SlidePanel open={panel === 'add'} onClose={() => setPanel(null)} title="Add Partner Directly">
        <div className="space-y-4">
          <Field label="Name *"><input value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))} className={inputCls} /></Field>
          <Field label="Email *"><input value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))} className={inputCls} /></Field>
          <Field label="Platform">
            <select value={form.platform} onChange={e => setForm(f=>({...f, platform: e.target.value}))} className={selectCls}>
              {['blog','youtube','instagram','twitter','telegram','tiktok','other'].map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Tier">
            <select value={form.tier} onChange={e => setForm(f=>({...f, tier: e.target.value as AffiliatePartnerTier}))} className={selectCls}>
              <option value="starter">Starter</option><option value="pro">Pro</option><option value="elite">Elite</option>
            </select>
          </Field>
          <Field label="Commission %"><input type="number" step="0.5" value={form.commission_pct} onChange={e => setForm(f=>({...f, commission_pct: e.target.value}))} className={inputCls} /></Field>
          <Field label="Payout Method">
            <select value={form.payout_method} onChange={e => setForm(f=>({...f, payout_method: e.target.value}))} className={selectCls}>
              {['bank_transfer','paypal','wise','stc_pay','other'].map(v=><option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
            </select>
          </Field>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={e => setForm(f=>({...f, notes: e.target.value}))} className={inputCls} /></Field>
          <button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, commission_pct: parseFloat(form.commission_pct) })} className={btnPrimary}>
            {createMut.isPending ? 'Creating…' : 'Create Partner'}
          </button>
        </div>
      </SlidePanel>

      {/* Edit partner panel */}
      <SlidePanel open={panel === 'edit' && !!selected} onClose={() => { setPanel(null); setSelected(null); }} title="Edit Partner">
        {selected && (
          <div className="space-y-4">
            <Field label="Tier">
              <select defaultValue={selected.tier}
                onChange={e => updateMut.mutate({ id: selected.id, d: { tier: e.target.value as AffiliatePartnerTier } })}
                className={selectCls}>
                <option value="starter">Starter</option><option value="pro">Pro</option><option value="elite">Elite</option>
              </select>
            </Field>
            <Field label="Commission %">
              <input type="number" step="0.5" defaultValue={selected.commission_pct}
                onBlur={e => updateMut.mutate({ id: selected.id, d: { commission_pct: parseFloat(e.target.value) } })}
                className={inputCls} />
            </Field>
            <Field label="Payout Method">
              <select defaultValue={selected.payout_method}
                onChange={e => updateMut.mutate({ id: selected.id, d: { payout_method: e.target.value } })}
                className={selectCls}>
                {['bank_transfer','paypal','wise','stc_pay','other'].map(v=><option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea rows={3} defaultValue={selected.notes ?? ''}
                onBlur={e => updateMut.mutate({ id: selected.id, d: { notes: e.target.value } })}
                className={inputCls} />
            </Field>
            <div className="pt-2 border-t border-utu-border-default">
              <button onClick={() => { if (confirm(`Terminate ${selected.name}?`)) terminateMut.mutate(selected.id); }}
                className="text-xs text-red-600 hover:underline">
                Terminate Partner
              </button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Payouts ─────────────────────────────────────────────────────────────

function PayoutsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [panel, setPanel]   = useState(false);
  const [form, setForm] = useState({ partner_id:'', amount_sar:'', period_start:'', period_end:'', bookings_count:'0', notes:'' });

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-payouts', status],
    queryFn: () => getAffiliatePayouts({ status: status || undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const payouts: AffiliatePayout[] = (data as any)?.data ?? [];

  const { data: partnersData } = useQuery({
    queryKey: ['affiliate-partners-all'],
    queryFn: () => getAffiliatePartners({ status: 'active', limit: 100 }),
    staleTime: 60_000,
  });
  const partners: AffiliatePartner[] = (partnersData as any)?.data ?? [];

  const createMut = useMutation({
    mutationFn: createAffiliatePayout,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['affiliate-payouts'] }); setPanel(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<AffiliatePayout> }) => updateAffiliatePayout(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['affiliate-payouts'] }); qc.invalidateQueries({ queryKey: ['affiliate-stats'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => setPanel(true)} className={`${btnPrimary} ms-auto`}>+ New Payout</button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : payouts.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No payouts found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Partner','Period','Bookings','Amount','Status','Ref','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {payouts.map(p => (
                <tr key={p.id} className="hover:bg-utu-bg-subtle">
                  <td className="px-4 py-3 font-medium text-utu-text-primary">{p.partner_name}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">{fmtDate(p.period_start)} – {fmtDate(p.period_end)}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{p.bookings_count}</td>
                  <td className="px-4 py-3 font-semibold text-utu-text-primary">{sarFmt(p.amount_sar)}</td>
                  <td className="px-4 py-3"><Badge label={p.status} colorCls={PAYOUT_STATUS_COLORS[p.status]} /></td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">{p.payment_ref ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.status === 'pending' && (
                      <button onClick={() => updateMut.mutate({ id: p.id, d: { status: 'paid', payment_ref: `PAY-${Date.now()}` } })}
                        className="rounded-lg border border-green-200 px-3 py-1 text-xs text-green-700 hover:bg-green-50">
                        Mark Paid
                      </button>
                    )}
                    {(p.status === 'pending' || p.status === 'processing') && (
                      <button onClick={() => updateMut.mutate({ id: p.id, d: { status: 'cancelled' } })}
                        className="ms-2 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlidePanel open={panel} onClose={() => setPanel(false)} title="New Payout">
        <div className="space-y-4">
          <Field label="Partner *">
            <select value={form.partner_id} onChange={e => setForm(f=>({...f, partner_id: e.target.value}))} className={selectCls}>
              <option value="">Select partner…</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Amount (SAR) *"><input type="number" value={form.amount_sar} onChange={e => setForm(f=>({...f, amount_sar: e.target.value}))} className={inputCls} /></Field>
          <Field label="Period Start *"><input type="date" value={form.period_start} onChange={e => setForm(f=>({...f, period_start: e.target.value}))} className={inputCls} /></Field>
          <Field label="Period End *"><input type="date" value={form.period_end} onChange={e => setForm(f=>({...f, period_end: e.target.value}))} className={inputCls} /></Field>
          <Field label="Bookings Count"><input type="number" value={form.bookings_count} onChange={e => setForm(f=>({...f, bookings_count: e.target.value}))} className={inputCls} /></Field>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={e => setForm(f=>({...f, notes: e.target.value}))} className={inputCls} /></Field>
          <button disabled={createMut.isPending} onClick={() => createMut.mutate({ ...form, amount_sar: parseFloat(form.amount_sar), bookings_count: parseInt(form.bookings_count) })} className={btnPrimary}>
            {createMut.isPending ? 'Creating…' : 'Create Payout'}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AffiliatesPage() {
  const [tab, setTab] = useState<Tab>('overview');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview'     },
    { key: 'applications', label: 'Applications' },
    { key: 'partners',     label: 'Partners'     },
    { key: 'payouts',      label: 'Payouts'      },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Affiliates</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Manage affiliate applications, partners, and commissions.</p>
      </div>

      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-utu-navy text-utu-navy'
                : 'text-utu-text-muted hover:text-utu-text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview'     && <OverviewTab onNavigate={setTab} />}
        {tab === 'applications' && <ApplicationsTab />}
        {tab === 'partners'     && <PartnersTab />}
        {tab === 'payouts'      && <PayoutsTab />}
      </div>
    </div>
  );
}
