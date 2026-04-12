'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProcurementStats, getProcurementSuppliers, createProcurementSupplier, updateProcurementSupplier, deleteProcurementSupplier,
  getProcurementContracts, createProcurementContract, updateProcurementContract, deleteProcurementContract,
  getExpiringContracts,
  getProcurementSlas, createProcurementSla, updateProcurementSla, deleteProcurementSla,
  getProcurementPOs as getProcurementPurchaseOrders, createProcurementPO as createProcurementPurchaseOrder, updateProcurementPO as updateProcurementPurchaseOrder, deleteProcurementPO as deleteProcurementPurchaseOrder,
  getProcurementRisk, analyzeProcurementRisk,
  type ProcurementStats, type ProcurementSupplier, type ProcurementContract, type ProcurementSla, type ProcurementPurchaseOrder,
  type ProcurementRisk,
} from '@/lib/api';

const TABS = ['Overview', 'Suppliers', 'Contracts', 'SLAs', 'Purchase Orders'] as const;
type Tab = typeof TABS[number];

const SUPPLIER_TYPES = ['api_provider','gds','hotel_chain','airline','car_rental','insurance','technology','other'];
const SUPPLIER_STATUSES = ['active','onboarding','suspended','terminated'];
const CONTRACT_TYPES = ['service','api','license','distribution','nda','framework','other'];
const CONTRACT_STATUSES = ['draft','active','expired','terminated','under_review'];
const SLA_STATUSES = ['met','at_risk','breached','pending'];
const PO_STATUSES = ['draft','approved','sent','delivered','paid','cancelled'];

function fmt(n: number) {
  return n >= 1_000_000
    ? `SAR ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `SAR ${(n / 1_000).toFixed(0)}K`
    : `SAR ${n.toLocaleString()}`;
}

function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  return Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ date }: { date?: string | null }) {
  const d = daysUntil(date);
  if (d === null) return <span className="text-gray-400">—</span>;
  if (d < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>;
  if (d < 30) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{d}d</span>;
  if (d < 90) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{d}d</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{d}d</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    onboarding: 'bg-blue-100 text-blue-700',
    suspended: 'bg-amber-100 text-amber-700',
    terminated: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-600',
    expired: 'bg-red-100 text-red-700',
    under_review: 'bg-purple-100 text-purple-700',
    met: 'bg-green-100 text-green-700',
    at_risk: 'bg-amber-100 text-amber-700',
    breached: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
    approved: 'bg-green-100 text-green-700',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-purple-100 text-purple-700',
    paid: 'bg-teal-100 text-teal-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── AI Procurement Risk Panel ────────────────────────────────────────────────

const PROC_RISK_BADGE: Record<string, string> = {
  low:      'bg-green-100 text-green-700 border-green-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-600 border-red-200',
};

function AIProcurementRiskPanel() {
  const [risk,    setRisk]    = useState<ProcurementRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getProcurementRisk()
      .then(r => { if (!cancelled) { setRisk(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeProcurementRisk();
      if (res.data) setRisk(res.data);
      else setError('Analysis failed. Please try again.');
    } catch { setError('Failed to run analysis.'); }
    finally { setRunning(false); }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 mb-4">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Procurement Risk Analysis</span>
          {risk && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${PROC_RISK_BADGE[risk.overall_risk] ?? ''}`}>
              {risk.overall_risk} risk
            </span>
          )}
          {risk && <span className="text-xs text-violet-500">{risk.total_suppliers} suppliers · {risk.total_contracts} contracts</span>}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading risk analysis…</p>}

          {!loading && !risk && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">Run AI Procurement Risk to get expiring contracts, SLA breach risks, supplier consolidation opportunities, and ZATCA compliance gaps.</p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Risk Analysis'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {risk && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{risk.executive_summary}</p>

              {risk.expiring_contracts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Expiring Contracts</h3>
                  <div className="space-y-2">
                    {risk.expiring_contracts.map((c, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${c.days_left <= 30 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <p className={`text-xs font-semibold ${c.days_left <= 30 ? 'text-red-800' : 'text-amber-800'}`}>{c.supplier} — {c.title}</p>
                        <p className={`text-xs mt-0.5 ${c.days_left <= 30 ? 'text-red-600' : 'text-amber-700'}`}>{c.days_left} days left · {c.end_date}</p>
                        <p className={`text-xs mt-0.5 italic ${c.days_left <= 30 ? 'text-red-500' : 'text-amber-600'}`}>{c.action_needed}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {risk.sla_breach_risks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">SLA Breach Risks</h3>
                  <div className="space-y-2">
                    {risk.sla_breach_risks.map((s, i) => (
                      <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                        <p className="text-xs font-semibold text-orange-800">{s.supplier} — {s.metric}</p>
                        <p className="text-xs text-orange-600 mt-0.5">Gap: {s.gap} · Impact: {s.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {risk.high_risk_suppliers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">High Risk Suppliers</h3>
                  <div className="space-y-1">
                    {risk.high_risk_suppliers.map((s, i) => (
                      <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs font-semibold text-red-800">{s.name} <span className="font-normal text-red-600">— {s.risk}</span></p>
                        <p className="text-xs text-red-500 mt-0.5">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {risk.spend_concentration && (
                <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                  <p className="text-xs font-semibold text-utu-text-muted mb-1">Spend Concentration</p>
                  <p className="text-xs text-utu-text-secondary">{risk.spend_concentration}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {risk.consolidation_opportunities.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Consolidation Opportunities</h3>
                    <ul className="space-y-1">{risk.consolidation_opportunities.map((o, i) => <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary"><span className="text-green-500 mt-0.5">●</span>{o}</li>)}</ul>
                  </div>
                )}
                {risk.compliance_gaps.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Compliance Gaps</h3>
                    <ul className="space-y-1">{risk.compliance_gaps.map((g, i) => <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary"><span className="text-amber-500 mt-0.5">●</span>{g}</li>)}</ul>
                  </div>
                )}
              </div>

              {risk.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                  <ul className="space-y-1">{risk.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary"><span className="text-violet-400 mt-0.5">▸</span>{r}</li>)}</ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-violet-200">
                <p className="text-xs text-utu-text-muted">Generated {new Date(risk.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: ProcurementStats | undefined }) {
  const { data: expiring } = useQuery({ queryKey: ['procurement', 'expiring'], queryFn: () => getExpiringContracts(90) });
  const contracts = (expiring as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Suppliers', value: stats?.active_suppliers ?? '—' },
          { label: 'Contracts Expiring 90d', value: stats?.contracts_expiring_90d ?? '—', warn: (stats?.contracts_expiring_90d ?? 0) > 0 },
          { label: 'Breached SLAs', value: stats?.breached_slas ?? '—', warn: (stats?.breached_slas ?? 0) > 0 },
          { label: 'POs Pending Approval', value: stats?.pos_pending ?? '—', warn: (stats?.pos_pending ?? 0) > 0 },
          { label: 'Annual Spend', value: stats?.annual_spend_sar ? fmt(Number(stats.annual_spend_sar)) : '—' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.warn ? 'text-amber-600' : 'text-gray-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {contracts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Contracts Expiring Within 90 Days</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2">Title</th>
                <th className="pb-2">Supplier</th>
                <th className="pb-2">Value SAR</th>
                <th className="pb-2">Expires</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map((c: ProcurementContract) => (
                <tr key={c.id} className="text-gray-700">
                  <td className="py-2 font-medium">{c.title}</td>
                  <td className="py-2 text-gray-500">{c.supplier_name}</td>
                  <td className="py-2">{c.value_sar ? fmt(Number(c.value_sar)) : '—'}</td>
                  <td className="py-2"><ExpiryBadge date={c.end_date} /></td>
                  <td className="py-2"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

function SuppliersTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Partial<ProcurementSupplier> | null>(null);

  const { data } = useQuery({
    queryKey: ['procurement', 'suppliers', typeFilter, statusFilter, search],
    queryFn: () => getProcurementSuppliers({ type: typeFilter, status: statusFilter, search }),
  });
  const rows: ProcurementSupplier[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<ProcurementSupplier>) =>
      panel?.id ? updateProcurementSupplier(panel.id!, body) : createProcurementSupplier(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurement', 'suppliers'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProcurementSupplier(id),
    onSuccess: (_res, id) => {
      const soft = (_res as any)?.soft;
      if (soft) alert('Supplier has active contracts — marked as terminated.');
      qc.invalidateQueries({ queryKey: ['procurement', 'suppliers'] });
    },
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Types</option>
          {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          {SUPPLIER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setPanel({})} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New Supplier</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Annual Value</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-gray-500">{r.country ?? '—'}</td>
                <td className="px-4 py-3">{r.annual_value_sar ? fmt(Number(r.annual_value_sar)) : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-gray-500">{r.owner ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm(`Delete ${r.name}?`)) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No suppliers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit Supplier' : 'New Supplier'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Name *</label><input required value={panel.name ?? ''} onChange={e => setPanel(p => ({ ...p!, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Type</label>
                <select value={panel.type ?? 'api_provider'} onChange={e => setPanel(p => ({ ...p!, type: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Status</label>
                <select value={panel.status ?? 'active'} onChange={e => setPanel(p => ({ ...p!, status: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {SUPPLIER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Country</label><input value={panel.country ?? ''} onChange={e => setPanel(p => ({ ...p!, country: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Contact Name</label><input value={panel.contact_name ?? ''} onChange={e => setPanel(p => ({ ...p!, contact_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Contact Email</label><input type="email" value={panel.contact_email ?? ''} onChange={e => setPanel(p => ({ ...p!, contact_email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Annual Value (SAR)</label><input type="number" value={panel.annual_value_sar ?? ''} onChange={e => setPanel(p => ({ ...p!, annual_value_sar: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Owner</label><input value={panel.owner ?? ''} onChange={e => setPanel(p => ({ ...p!, owner: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Notes</label><textarea value={panel.notes ?? ''} onChange={e => setPanel(p => ({ ...p!, notes: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contracts ───────────────────────────────────────────────────────────────

function ContractsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [panel, setPanel] = useState<Partial<ProcurementContract> | null>(null);

  const { data } = useQuery({
    queryKey: ['procurement', 'contracts', statusFilter, typeFilter],
    queryFn: () => getProcurementContracts({ status: statusFilter, type: typeFilter }),
  });
  const rows: ProcurementContract[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<ProcurementContract>) =>
      panel?.id ? updateProcurementContract(panel.id!, body) : createProcurementContract(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurement', 'contracts'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProcurementContract(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', 'contracts'] }),
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Types</option>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setPanel({})} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New Contract</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value SAR</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Auto-renews</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.title}</td>
                <td className="px-4 py-3 text-gray-500">{r.supplier_name}</td>
                <td className="px-4 py-3 text-gray-500">{r.type}</td>
                <td className="px-4 py-3">{r.value_sar ? fmt(Number(r.value_sar)) : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.start_date ? new Date(r.start_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3"><ExpiryBadge date={r.end_date} /></td>
                <td className="px-4 py-3 text-center">{r.auto_renews ? '✓' : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No contracts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit Contract' : 'New Contract'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Supplier Name *</label><input required value={panel.supplier_name ?? ''} onChange={e => setPanel(p => ({ ...p!, supplier_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Title *</label><input required value={panel.title ?? ''} onChange={e => setPanel(p => ({ ...p!, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Type</label>
                <select value={panel.type ?? 'service'} onChange={e => setPanel(p => ({ ...p!, type: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Status</label>
                <select value={panel.status ?? 'draft'} onChange={e => setPanel(p => ({ ...p!, status: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Value (SAR)</label><input type="number" value={panel.value_sar ?? ''} onChange={e => setPanel(p => ({ ...p!, value_sar: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Start Date</label><input type="date" value={panel.start_date ?? ''} onChange={e => setPanel(p => ({ ...p!, start_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">End Date</label><input type="date" value={panel.end_date ?? ''} onChange={e => setPanel(p => ({ ...p!, end_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="auto_renews" checked={!!panel.auto_renews} onChange={e => setPanel(p => ({ ...p!, auto_renews: e.target.checked }))} />
                <label htmlFor="auto_renews" className="text-sm text-gray-700">Auto-renews</label>
              </div>
              <div><label className="text-xs text-gray-500">Signed By</label><input value={panel.signed_by ?? ''} onChange={e => setPanel(p => ({ ...p!, signed_by: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Notes</label><textarea value={panel.notes ?? ''} onChange={e => setPanel(p => ({ ...p!, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SLAs ────────────────────────────────────────────────────────────────────

function SlasTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [panel, setPanel] = useState<Partial<ProcurementSla> | null>(null);

  const { data } = useQuery({
    queryKey: ['procurement', 'slas', statusFilter],
    queryFn: () => getProcurementSlas({ status: statusFilter }),
  });
  const rows: ProcurementSla[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<ProcurementSla>) =>
      panel?.id ? updateProcurementSla(panel.id!, body) : createProcurementSla(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurement', 'slas'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProcurementSla(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', 'slas'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          {SLA_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={() => setPanel({})} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New SLA</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Reviewed</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.supplier_name}</td>
                <td className="px-4 py-3 text-gray-700">{r.metric}</td>
                <td className="px-4 py-3">{r.target_value}</td>
                <td className="px-4 py-3">{r.current_value ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.unit}</td>
                <td className="px-4 py-3 text-gray-500">{r.measurement_period}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.last_reviewed_at ? new Date(r.last_reviewed_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No SLAs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit SLA' : 'New SLA'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Supplier Name *</label><input required value={panel.supplier_name ?? ''} onChange={e => setPanel(p => ({ ...p!, supplier_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Metric *</label><input required value={panel.metric ?? ''} onChange={e => setPanel(p => ({ ...p!, metric: e.target.value }))} placeholder="e.g. API Uptime" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Target Value *</label><input required type="number" step="0.0001" value={panel.target_value ?? ''} onChange={e => setPanel(p => ({ ...p!, target_value: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Unit *</label>
                <select value={panel.unit ?? '%'} onChange={e => setPanel(p => ({ ...p!, unit: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {['%','ms','hours','days'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Period</label>
                <select value={panel.measurement_period ?? 'monthly'} onChange={e => setPanel(p => ({ ...p!, measurement_period: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {['daily','weekly','monthly','quarterly'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Current Value</label><input type="number" step="0.0001" value={panel.current_value ?? ''} onChange={e => setPanel(p => ({ ...p!, current_value: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Status</label>
                <select value={panel.status ?? 'met'} onChange={e => setPanel(p => ({ ...p!, status: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {SLA_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Notes</label><textarea value={panel.notes ?? ''} onChange={e => setPanel(p => ({ ...p!, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

function PurchaseOrdersTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [panel, setPanel] = useState<Partial<ProcurementPurchaseOrder> | null>(null);

  const { data } = useQuery({
    queryKey: ['procurement', 'purchase-orders', statusFilter],
    queryFn: () => getProcurementPurchaseOrders({ status: statusFilter }),
  });
  const rows: ProcurementPurchaseOrder[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<ProcurementPurchaseOrder>) =>
      panel?.id ? updateProcurementPurchaseOrder(panel.id!, body) : createProcurementPurchaseOrder(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProcurementPurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <div className="flex gap-2 flex-wrap">
          {['', ...PO_STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <button onClick={() => setPanel({})} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New PO</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount SAR</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ordered</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.po_number}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.supplier_name}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description}</td>
                <td className="px-4 py-3">{fmt(Number(r.amount_sar))}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.ordered_at ? new Date(r.ordered_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.expected_at ? new Date(r.expected_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No purchase orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit PO' : 'New Purchase Order'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Supplier Name *</label><input required value={panel.supplier_name ?? ''} onChange={e => setPanel(p => ({ ...p!, supplier_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Description *</label><textarea required value={panel.description ?? ''} onChange={e => setPanel(p => ({ ...p!, description: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Amount (SAR) *</label><input required type="number" step="0.01" value={panel.amount_sar ?? ''} onChange={e => setPanel(p => ({ ...p!, amount_sar: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Status</label>
                <select value={panel.status ?? 'draft'} onChange={e => setPanel(p => ({ ...p!, status: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {PO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Ordered At</label><input type="date" value={panel.ordered_at ?? ''} onChange={e => setPanel(p => ({ ...p!, ordered_at: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Expected At</label><input type="date" value={panel.expected_at ?? ''} onChange={e => setPanel(p => ({ ...p!, expected_at: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Approved By</label><input value={panel.approved_by ?? ''} onChange={e => setPanel(p => ({ ...p!, approved_by: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Notes</label><textarea value={panel.notes ?? ''} onChange={e => setPanel(p => ({ ...p!, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProcurementPage() {
  const [tab, setTab] = useState<Tab>('Overview');

  const { data: statsData } = useQuery({
    queryKey: ['procurement', 'stats'],
    queryFn: () => getProcurementStats(),
  });
  const stats: ProcurementStats | undefined = (statsData as any)?.data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
        <p className="text-sm text-gray-500 mt-1">Suppliers, contracts, SLAs, and purchase orders</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <><AIProcurementRiskPanel /><OverviewTab stats={stats} /></>}
      {tab === 'Suppliers' && <SuppliersTab />}
      {tab === 'Contracts' && <ContractsTab />}
      {tab === 'SLAs' && <SlasTab />}
      {tab === 'Purchase Orders' && <PurchaseOrdersTab />}
    </div>
  );
}
