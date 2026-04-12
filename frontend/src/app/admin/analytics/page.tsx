'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBiStats, getBiKpiSummary, getBiKpiTargets, createBiKpiTarget, updateBiKpiTarget, deleteBiKpiTarget,
  getBiDashboards, createBiDashboard, updateBiDashboard, deleteBiDashboard,
  getBiReports, createBiReport, updateBiReport, deleteBiReport,
  getBiAlerts, createBiAlert, updateBiAlert, deleteBiAlert,
  getKpiAnalysis, analyzeKpiAlert,
  type BiStats, type BiKpiTarget, type BiDashboard, type BiReport, type BiAlert,
  type KpiAnalysis, type KpiRecommendedAction,
} from '@/lib/api';

const TABS = ['Overview', 'KPI Targets', 'Dashboards', 'Reports', 'Alerts'] as const;
type Tab = typeof TABS[number];

const KPI_CATEGORIES = ['revenue','bookings','users','conversion','retention','operations'];
const KPI_UNITS = ['SAR','%','count','ms','days'];
const KPI_PERIODS = ['daily','weekly','monthly','quarterly','annual'];
const QUERY_TYPES = ['bookings','revenue','users','flights','hotels','cars','loyalty','funnel'];
const ALERT_CONDITIONS = ['below_target','above_target','below_threshold','above_threshold'];

function HitBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-400 text-xs">—</span>;
  const cls = pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{pct.toFixed(0)}%</span>;
}

function HitBar({ pct }: { pct: number | null }) {
  if (pct === null) return <div className="h-2 bg-gray-100 rounded-full" />;
  const capped = Math.min(pct, 100);
  const color = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${capped}%` }} />
    </div>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const map: Record<string, string> = {
    revenue: 'bg-green-100 text-green-700',
    bookings: 'bg-blue-100 text-blue-700',
    users: 'bg-purple-100 text-purple-700',
    conversion: 'bg-orange-100 text-orange-700',
    retention: 'bg-teal-100 text-teal-700',
    operations: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[cat] ?? 'bg-gray-100 text-gray-500'}`}>{cat}</span>;
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: BiStats | undefined }) {
  const { data: summaryData } = useQuery({
    queryKey: ['analytics', 'kpi-summary'],
    queryFn: () => getBiKpiSummary(),
  });
  const kpis: (BiKpiTarget & { hit_pct: number | null })[] = (summaryData as any)?.data ?? [];

  const grouped = kpis.reduce<Record<string, typeof kpis>>((acc, k) => {
    (acc[k.category] = acc[k.category] ?? []).push(k);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'KPIs On Target', value: stats?.kpis_on_target ?? '—', good: true },
          { label: 'KPIs Off Target', value: stats?.kpis_off_target ?? '—', warn: (stats?.kpis_off_target ?? 0) > 0 },
          { label: 'Active Alerts', value: stats?.active_alerts ?? '—' },
          { label: 'Reports', value: stats?.reports_count ?? '—' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.warn ? 'text-red-600' : c.good ? 'text-green-600' : 'text-gray-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 capitalize">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(k => (
              <div key={k.id} className={`p-4 rounded-lg border ${k.hit_pct !== null && k.hit_pct < 70 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{k.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{k.period}</p>
                  </div>
                  <HitBadge pct={k.hit_pct} />
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-lg font-bold text-gray-900">{k.current_value ?? '—'}</span>
                  <span className="text-xs text-gray-400">/ {k.target_value} {k.unit}</span>
                </div>
                <HitBar pct={k.hit_pct} />
                {k.owner && <p className="text-xs text-gray-400 mt-1">Owner: {k.owner}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {kpis.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No KPI targets configured yet</div>
      )}
    </div>
  );
}

// ─── KPI Targets ──────────────────────────────────────────────────────────────

function KpiTargetsTab() {
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState('');
  const [panel, setPanel] = useState<Partial<BiKpiTarget> | null>(null);

  const { data } = useQuery({
    queryKey: ['analytics', 'kpi-targets', catFilter],
    queryFn: () => getBiKpiTargets({ category: catFilter }),
  });
  const rows: BiKpiTarget[] = (data as any)?.data ?? [];

  const { data: summaryData } = useQuery({
    queryKey: ['analytics', 'kpi-summary'],
    queryFn: () => getBiKpiSummary(),
  });
  const summary: (BiKpiTarget & { hit_pct: number | null })[] = (summaryData as any)?.data ?? [];
  const hitMap = Object.fromEntries(summary.map(k => [k.id, k.hit_pct]));

  const save = useMutation({
    mutationFn: (body: Partial<BiKpiTarget>) =>
      panel?.id ? updateBiKpiTarget(panel.id!, body) : createBiKpiTarget(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['analytics'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBiKpiTarget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Categories</option>
          {KPI_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setPanel({ unit: 'SAR', period: 'monthly', category: 'revenue' })} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New KPI</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Hit %</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-3"><CategoryBadge cat={r.category} /></td>
                <td className="px-4 py-3 font-semibold">{r.current_value ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.target_value}</td>
                <td className="px-4 py-3 text-gray-500">{r.unit}</td>
                <td className="px-4 py-3 text-gray-500">{r.period}</td>
                <td className="px-4 py-3"><HitBadge pct={hitMap[r.id] ?? null} /></td>
                <td className="px-4 py-3 text-gray-500">{r.owner ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete KPI?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No KPI targets found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit KPI Target' : 'New KPI Target'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Name *</label><input required value={panel.name ?? ''} onChange={e => setPanel(p => ({ ...p!, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Metric Key *</label><input required value={panel.metric_key ?? ''} onChange={e => setPanel(p => ({ ...p!, metric_key: e.target.value }))} placeholder="e.g. monthly_revenue_sar" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Category</label>
                <select value={panel.category ?? 'revenue'} onChange={e => setPanel(p => ({ ...p!, category: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {KPI_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Target Value *</label><input required type="number" step="0.0001" value={panel.target_value ?? ''} onChange={e => setPanel(p => ({ ...p!, target_value: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Current Value</label><input type="number" step="0.0001" value={panel.current_value ?? ''} onChange={e => setPanel(p => ({ ...p!, current_value: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Unit</label>
                <select value={panel.unit ?? 'SAR'} onChange={e => setPanel(p => ({ ...p!, unit: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {KPI_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Period</label>
                <select value={panel.period ?? 'monthly'} onChange={e => setPanel(p => ({ ...p!, period: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {KPI_PERIODS.map(per => <option key={per} value={per}>{per}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Owner</label><input value={panel.owner ?? ''} onChange={e => setPanel(p => ({ ...p!, owner: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboards ───────────────────────────────────────────────────────────────

function DashboardsTab() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Partial<BiDashboard> | null>(null);

  const { data } = useQuery({
    queryKey: ['analytics', 'dashboards'],
    queryFn: () => getBiDashboards(),
  });
  const rows: BiDashboard[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<BiDashboard>) =>
      panel?.id ? updateBiDashboard(panel.id!, body) : createBiDashboard(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['analytics', 'dashboards'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBiDashboard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics', 'dashboards'] }),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setPanel({ config: {}, is_default: false })} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New Dashboard</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{r.name}</h3>
              {r.is_default && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>}
            </div>
            {r.description && <p className="text-sm text-gray-500 mb-3">{r.description}</p>}
            <p className="text-xs text-gray-400 mb-3">Created by {r.created_by}</p>
            <div className="flex gap-2">
              <button onClick={() => setPanel(r)} className="text-xs text-blue-600 hover:underline">Edit</button>
              <button onClick={() => { if (confirm('Delete dashboard?')) remove.mutate(r.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No dashboards yet</div>
        )}
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit Dashboard' : 'New Dashboard'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Name *</label><input required value={panel.name ?? ''} onChange={e => setPanel(p => ({ ...p!, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Description</label><textarea value={panel.description ?? ''} onChange={e => setPanel(p => ({ ...p!, description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Config (JSON)</label>
                <textarea
                  value={typeof panel.config === 'object' ? JSON.stringify(panel.config, null, 2) : (panel.config ?? '{}')}
                  onChange={e => { try { setPanel(p => ({ ...p!, config: JSON.parse(e.target.value) })); } catch { setPanel(p => ({ ...p!, config: e.target.value as any })); } }}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_default" checked={!!panel.is_default} onChange={e => setPanel(p => ({ ...p!, is_default: e.target.checked }))} />
                <label htmlFor="is_default" className="text-sm text-gray-700">Set as default dashboard</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function ReportsTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [panel, setPanel] = useState<Partial<BiReport> | null>(null);

  const { data } = useQuery({
    queryKey: ['analytics', 'reports', typeFilter],
    queryFn: () => getBiReports({ query_type: typeFilter }),
  });
  const rows: BiReport[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<BiReport>) =>
      panel?.id ? updateBiReport(panel.id!, body) : createBiReport(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['analytics', 'reports'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBiReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics', 'reports'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Types</option>
          {QUERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setPanel({ query_type: 'bookings', filters: {} })} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New Report</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Filters</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Last Run</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.query_type}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{Object.keys(r.filters ?? {}).length > 0 ? JSON.stringify(r.filters).slice(0, 40) + '…' : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.schedule ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.last_run_at ? new Date(r.last_run_at).toLocaleString() : 'Never'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete report?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No reports found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit Report' : 'New Report'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Name *</label><input required value={panel.name ?? ''} onChange={e => setPanel(p => ({ ...p!, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Description</label><textarea value={panel.description ?? ''} onChange={e => setPanel(p => ({ ...p!, description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Query Type *</label>
                <select value={panel.query_type ?? 'bookings'} onChange={e => setPanel(p => ({ ...p!, query_type: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {QUERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Filters (JSON)</label>
                <textarea
                  value={typeof panel.filters === 'object' ? JSON.stringify(panel.filters, null, 2) : (panel.filters ?? '{}')}
                  onChange={e => { try { setPanel(p => ({ ...p!, filters: JSON.parse(e.target.value) })); } catch { setPanel(p => ({ ...p!, filters: e.target.value as any })); } }}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono"
                />
              </div>
              <div><label className="text-xs text-gray-500">Schedule (cron or description)</label><input value={panel.schedule ?? ''} onChange={e => setPanel(p => ({ ...p!, schedule: e.target.value }))} placeholder="e.g. 0 9 * * 1 or Every Monday 9am" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

// ─── AI KPI Root Cause Panel ──────────────────────────────────────────────────

function AIKpiModal({ alert, onClose }: { alert: BiAlert; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<KpiAnalysis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKpiAnalysis(alert.id).then(r => { if (!cancelled) { setAnalysis(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [alert.id]);

  async function run() {
    setRunning(true);
    try {
      const res = await analyzeKpiAlert(alert.id);
      setAnalysis(res.data);
    } finally {
      setRunning(false);
    }
  }

  const CONF_COLORS: Record<string, string> = {
    high:   'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-slate-100 text-slate-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-utu-navy text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider">✦ AI Root Cause Analyzer</p>
            <p className="font-semibold text-sm mt-0.5 truncate max-w-[300px]">{alert.name}</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading existing analysis...</p>
          ) : analysis ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONF_COLORS[analysis.confidence] ?? 'bg-gray-100 text-gray-600'}`}>
                  {analysis.confidence} confidence
                </span>
                <span className="text-xs text-gray-400">Generated {new Date(analysis.generated_at).toLocaleString()}</span>
                <button onClick={run} disabled={running} className="ms-auto text-xs text-blue-600 hover:underline disabled:opacity-40">
                  {running ? 'Analyzing…' : 'Re-analyze'}
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Root Cause</p>
                <p className="text-sm text-gray-800 font-medium">{analysis.root_cause_summary}</p>
                <span className="mt-1 inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Dept: {analysis.root_cause_dept}</span>
              </div>

              {analysis.contributing_factors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contributing Factors</p>
                  <ul className="space-y-1">
                    {analysis.contributing_factors.map((f, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-amber-500 mt-0.5">&#9670;</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.ruling_out.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ruling Out</p>
                  <ul className="space-y-0.5">
                    {analysis.ruling_out.map((r, i) => (
                      <li key={i} className="text-xs text-gray-400 flex gap-2"><span>&#8722;</span>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommended_actions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Actions</p>
                  <div className="space-y-2">
                    {analysis.recommended_actions.map((a: KpiRecommendedAction, i) => (
                      <div key={i} className="rounded-lg border border-gray-200 p-3">
                        <span className="text-xs font-semibold text-blue-600 uppercase">{a.department}</span>
                        <p className="text-sm text-gray-700 mt-0.5">{a.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.escalate_to.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Escalate To</p>
                  <p className="text-sm text-red-600">{analysis.escalate_to.join(', ')}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-gray-500">No analysis yet for this alert.</p>
              <button
                onClick={run}
                disabled={running}
                className="bg-utu-navy text-white text-sm px-5 py-2 rounded-lg hover:bg-utu-blue disabled:opacity-50"
              >
                {running ? 'Analyzing…' : '✦ Analyse with Claude'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('');
  const [aiAlert, setAiAlert] = useState<BiAlert | null>(null);
  const [panel, setPanel] = useState<Partial<BiAlert> | null>(null);

  const { data } = useQuery({
    queryKey: ['analytics', 'alerts', activeFilter],
    queryFn: () => getBiAlerts({ active: activeFilter }),
  });
  const rows: BiAlert[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<BiAlert>) =>
      panel?.id ? updateBiAlert(panel.id!, body) : createBiAlert(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['analytics', 'alerts'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBiAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics', 'alerts'] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateBiAlert(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics', 'alerts'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={() => setPanel({ condition: 'below_target', active: true })} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New Alert</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Threshold</th>
              <th className="px-4 py-3">Notify Email</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Last Fired</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.condition.replace('_', ' ')}</td>
                <td className="px-4 py-3">{r.threshold ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.notify_email ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle.mutate({ id: r.id, active: !r.active })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${r.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {r.active ? 'Active' : 'Off'}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.last_fired_at ? new Date(r.last_fired_at).toLocaleString() : 'Never'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setAiAlert(r)} className="text-purple-600 hover:underline text-xs">✦ Analyse</button>
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete alert?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No alerts configured</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit Alert' : 'New Alert'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Name *</label><input required value={panel.name ?? ''} onChange={e => setPanel(p => ({ ...p!, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Condition *</label>
                <select value={panel.condition ?? 'below_target'} onChange={e => setPanel(p => ({ ...p!, condition: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {ALERT_CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Threshold</label><input type="number" step="0.0001" value={panel.threshold ?? ''} onChange={e => setPanel(p => ({ ...p!, threshold: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Notify Email</label><input type="email" value={panel.notify_email ?? ''} onChange={e => setPanel(p => ({ ...p!, notify_email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="alert_active" checked={panel.active !== false} onChange={e => setPanel(p => ({ ...p!, active: e.target.checked }))} />
                <label htmlFor="alert_active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aiAlert && <AIKpiModal alert={aiAlert} onClose={() => setAiAlert(null)} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('Overview');

  const { data: statsData } = useQuery({
    queryKey: ['analytics', 'stats'],
    queryFn: () => getBiStats(),
  });
  const stats: BiStats | undefined = (statsData as any)?.data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & BI</h1>
        <p className="text-sm text-gray-500 mt-1">KPI scorecards, custom dashboards, reports, and alerts</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'KPI Targets' && (stats?.kpis_off_target ?? 0) > 0 && (
              <span className="ms-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{stats!.kpis_off_target}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab stats={stats} />}
      {tab === 'KPI Targets' && <KpiTargetsTab />}
      {tab === 'Dashboards' && <DashboardsTab />}
      {tab === 'Reports' && <ReportsTab />}
      {tab === 'Alerts' && <AlertsTab />}
    </div>
  );
}
