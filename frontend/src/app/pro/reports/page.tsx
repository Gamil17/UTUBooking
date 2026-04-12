'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBookings, getEmployees, type CorporateBooking, type CorporateEmployee } from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sarFmt(n: number | null | undefined) {
  if (!n) return 'SAR 0';
  return `SAR ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthKey(iso: string) {
  return iso.slice(0, 7); // 'YYYY-MM'
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCsv(rows: CorporateBooking[], filename: string) {
  const HEADERS = [
    'Reference', 'Type', 'Employee', 'Department', 'Origin', 'Destination',
    'Depart Date', 'Return Date', 'Cabin/Stars', 'Est. Cost (SAR)',
    'Status', 'Policy Compliant', 'Requires Approval', 'Purpose', 'Booked On',
  ];

  const lines = rows.map(b => [
    b.booking_ref ?? b.id.slice(0, 8).toUpperCase(),
    b.booking_type,
    b.employee_name,
    b.employee_dept ?? '',
    b.origin ?? '',
    b.destination,
    b.depart_date,
    b.return_date ?? '',
    b.flight_class ?? (b.hotel_stars ? `${b.hotel_stars}★` : ''),
    Math.round(b.estimated_cost_sar ?? 0),
    b.status,
    b.policy_compliant ? 'Yes' : 'No',
    b.requires_approval ? 'Yes' : 'No',
    b.purpose ?? '',
    fmtDate(b.created_at),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = [HEADERS.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportView = 'overview' | 'by_employee' | 'by_department' | 'by_destination' | 'by_month';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProReportsPage() {
  const [view, setView]           = useState<ReportView>('overview');
  const [fromDate, setFromDate]   = useState('');
  const [toDate, setToDate]       = useState('');
  const [empFilter, setEmpFilter] = useState('');

  // Fetch all bookings (up to 500 for reporting)
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ['portal-bookings-report'],
    queryFn:  () => getBookings({ limit: 500 }),
    staleTime: 60_000,
  });
  const allBookings: CorporateBooking[] = (bookingData as any)?.data ?? [];

  const { data: empData } = useQuery({
    queryKey: ['portal-employees-all'],
    queryFn:  () => getEmployees({ status: 'active', limit: 500 }),
    staleTime: 60_000,
  });
  const employees: CorporateEmployee[] = (empData as any)?.data ?? [];

  // ── Filter bookings ───────────────────────────────────────────────────────

  const filtered = allBookings.filter(b => {
    if (b.status === 'cancelled') return false;
    if (fromDate && b.depart_date < fromDate) return false;
    if (toDate   && b.depart_date > toDate)   return false;
    if (empFilter && b.employee_id !== empFilter) return false;
    return true;
  });

  const totalSpend   = filtered.reduce((s, b) => s + (b.estimated_cost_sar ?? 0), 0);
  const compliant    = filtered.filter(b => b.policy_compliant).length;
  const compliancePct = filtered.length > 0 ? Math.round((compliant / filtered.length) * 100) : 100;

  // ── Aggregations ──────────────────────────────────────────────────────────

  function byKey<T>(
    rows: CorporateBooking[],
    keyFn: (b: CorporateBooking) => string,
    labelFn: (k: string) => string
  ): { key: string; label: string; count: number; spend: number; pct: number }[] {
    const map: Record<string, { count: number; spend: number }> = {};
    for (const b of rows) {
      const k = keyFn(b);
      if (!map[k]) map[k] = { count: 0, spend: 0 };
      map[k].count++;
      map[k].spend += b.estimated_cost_sar ?? 0;
    }
    const total = rows.reduce((s, b) => s + (b.estimated_cost_sar ?? 0), 0) || 1;
    return Object.entries(map)
      .map(([k, v]) => ({ key: k, label: labelFn(k), count: v.count, spend: v.spend, pct: Math.round((v.spend / total) * 100) }))
      .sort((a, b) => b.spend - a.spend);
  }

  const byEmployee    = byKey(filtered, b => b.employee_id, id => employees.find(e => e.id === id)?.name ?? id.slice(0, 8));
  const byDepartment  = byKey(filtered, b => b.employee_dept ?? 'No Department', k => k);
  const byDestination = byKey(filtered, b => b.destination, k => k);
  const byMonth       = byKey(filtered, b => monthKey(b.depart_date), k => monthLabel(k));
  const byMonthSorted = [...byMonth].sort((a, b) => a.key.localeCompare(b.key));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-utu-text-primary">Spend Reports</h1>
          <p className="text-sm text-utu-text-muted mt-1">
            Travel spend analysis for your organisation.
          </p>
        </div>
        <button
          onClick={() => exportCsv(filtered, `utubooking-report-${new Date().toISOString().slice(0, 10)}.csv`)}
          className="rounded-xl border border-utu-border-default bg-utu-bg-card hover:bg-utu-bg-subtle text-utu-text-secondary font-medium px-4 py-2 text-sm transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </div>
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </div>
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">Employee</label>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue bg-white">
            <option value="">All employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {(fromDate || toDate || empFilter) && (
          <button onClick={() => { setFromDate(''); setToDate(''); setEmpFilter(''); }}
            className="text-xs text-utu-blue hover:underline self-end pb-1.5">
            Clear filters
          </button>
        )}
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}

      {!isLoading && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Kpi label="Total spend" value={sarFmt(totalSpend)} />
            <Kpi label="Bookings" value={String(filtered.length)} />
            <Kpi label="Policy compliance" value={`${compliancePct}%`} />
            <Kpi label="Avg cost / booking" value={filtered.length > 0 ? sarFmt(totalSpend / filtered.length) : '—'} />
          </div>

          {/* View tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['overview',        'Overview'],
              ['by_employee',     'By Employee'],
              ['by_department',   'By Department'],
              ['by_destination',  'By Destination'],
              ['by_month',        'By Month'],
            ] as [ReportView, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  view === v
                    ? 'bg-utu-navy border-utu-navy text-white'
                    : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {view === 'overview' && (
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <Empty />
              ) : (
                <div className="bg-utu-bg-card rounded-xl border border-utu-border-default overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-utu-border-default text-utu-text-muted text-xs">
                        <Th>Employee</Th>
                        <Th>Trip</Th>
                        <Th>Depart</Th>
                        <Th>Est. Cost</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 100).map(b => (
                        <tr key={b.id} className="border-b border-utu-border-default last:border-0 hover:bg-utu-bg-subtle">
                          <td className="px-4 py-3">
                            <p className="font-medium text-utu-text-primary">{b.employee_name}</p>
                            {b.employee_dept && <p className="text-xs text-utu-text-muted">{b.employee_dept}</p>}
                          </td>
                          <td className="px-4 py-3 text-utu-text-secondary">
                            {b.booking_type === 'flight' && b.origin ? `${b.origin} → ${b.destination}` : b.destination}
                          </td>
                          <td className="px-4 py-3 text-utu-text-secondary">{fmtDate(b.depart_date)}</td>
                          <td className="px-4 py-3 font-medium text-utu-text-primary">{sarFmt(b.estimated_cost_sar)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={b.status} compliant={b.policy_compliant} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length > 100 && (
                    <p className="px-4 py-3 text-xs text-utu-text-muted text-center border-t border-utu-border-default">
                      Showing first 100 of {filtered.length} rows — export CSV for full data.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Aggregated views ── */}
          {view !== 'overview' && (
            <AggTable
              rows={view === 'by_month' ? byMonthSorted : {
                by_employee:    byEmployee,
                by_department:  byDepartment,
                by_destination: byDestination,
              }[view] ?? []}
              labelHeader={{
                by_employee:    'Employee',
                by_department:  'Department',
                by_destination: 'Destination',
                by_month:       'Month',
              }[view] ?? 'Group'}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-4">
      <p className="text-xs text-utu-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-utu-text-primary">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-start font-semibold">{children}</th>;
}

function StatusBadge({ status, compliant }: { status: string; compliant: boolean }) {
  if (!compliant) return (
    <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
      Out of policy
    </span>
  );
  const colors: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    pending:   'bg-blue-50 text-utu-blue border-blue-200',
    failed:    'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 border capitalize ${colors[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function AggTable({ rows, labelHeader }: {
  rows: { key: string; label: string; count: number; spend: number; pct: number }[];
  labelHeader: string;
}) {
  if (rows.length === 0) return <Empty />;
  const maxSpend = rows[0]?.spend ?? 1;

  return (
    <div className="bg-utu-bg-card rounded-xl border border-utu-border-default overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-utu-border-default text-utu-text-muted text-xs">
            <Th>{labelHeader}</Th>
            <Th>Bookings</Th>
            <Th>Total Spend</Th>
            <Th>Share</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-utu-border-default last:border-0 hover:bg-utu-bg-subtle">
              <td className="px-4 py-3 font-medium text-utu-text-primary">{r.label}</td>
              <td className="px-4 py-3 text-utu-text-secondary">{r.count}</td>
              <td className="px-4 py-3 font-semibold text-utu-text-primary">{sarFmt(r.spend)}</td>
              <td className="px-4 py-3 w-40">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-utu-bg-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-utu-blue"
                      style={{ width: `${Math.round((r.spend / maxSpend) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-utu-text-muted w-8 text-end">{r.pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card p-12 text-center">
      <p className="text-sm font-medium text-utu-text-primary">No bookings match the selected filters.</p>
      <p className="text-xs text-utu-text-muted mt-1">Adjust the date range or employee filter.</p>
    </div>
  );
}
