'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import {
  getFinanceSummary, getFinanceDaily, getFinanceRefunds, getFinanceReconciliation,
  getFinanceVendors, createFinanceVendor, updateFinanceVendor, deleteFinanceVendor,
  getFinanceInvoices, createFinanceInvoice, updateFinanceInvoice,
  getFinanceBudgets, createFinanceBudget, updateFinanceBudget,
  getBudgetLines, createBudgetLine, updateBudgetLine, deleteBudgetLine,
  getExpenseClaims, createExpenseClaim, updateExpenseClaim,
  getExpenseAnalysis, analyzeExpenseClaim,
  getVendorDiligence, runVendorDiligence,
  type FinanceSummary, type DailyRevenue, type RefundRecord, type ReconciliationReport,
  type FinanceVendor, type FinanceInvoice, type FinanceBudget, type FinanceBudgetLine, type FinanceExpenseClaim,
  type VendorStatus, type VendorType, type InvoiceStatus, type BudgetStatus, type ClaimStatus, type FinanceCategory,
  type ExpenseAnalysis, type ExpenseRecommendation,
  type VendorDiligence,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sarFmt(n: number) {
  return `SAR ${n.toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const PRODUCT_ICONS: Record<string, string> = { hotel: '🏨', flight: '✈️', car: '🚗' };

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  payment_gateway: 'Payment Gateway', hotel_supplier: 'Hotel Supplier', airline_gds: 'Airline GDS',
  saas: 'SaaS', professional_services: 'Professional Services', infrastructure: 'Infrastructure', other: 'Other',
};

const VENDOR_STATUS_COLORS: Record<VendorStatus, string> = {
  active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', blocked: 'bg-red-100 text-red-700',
};

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  disputed: 'bg-orange-100 text-orange-700', cancelled: 'bg-gray-100 text-gray-500',
};

const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  draft: 'bg-gray-100 text-gray-600', approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700', closed: 'bg-gray-200 text-gray-500',
};

const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', paid: 'bg-blue-100 text-blue-700',
};

const FINANCE_CATEGORIES: FinanceCategory[] = ['hosting', 'software', 'salaries', 'marketing', 'legal', 'travel', 'other'];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = {
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    red:   'border-red-200   bg-red-50',
    blue:  'border-utu-blue  bg-blue-50',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? colors[accent] : 'border-utu-border-default bg-utu-bg-card'}`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

// ─── Slide Panel ──────────────────────────────────────────────────────────────

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

const inputCls = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const selectCls = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: DailyRevenue[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-utu-text-muted">No data.</p>;

  const max = Math.max(...data.map(d => d.revenue_sar), 1);
  const W   = 700;
  const H   = 180;
  const BAR_W = Math.max(4, Math.floor(W / data.length) - 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" style={{ minWidth: 480 }}>
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.revenue_sar / max) * H));
          const x    = Math.round((i / data.length) * W + (W / data.length - BAR_W) / 2);
          const y    = H - barH;
          const showLabel = data.length <= 31 && i % Math.ceil(data.length / 10) === 0;
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={BAR_W} height={barH}
                fill="#2563EB" fillOpacity={0.8} rx={2}
              >
                <title>{fmtShortDate(d.day)}: {sarFmt(d.revenue_sar)} ({d.booking_count} bookings)</title>
              </rect>
              {showLabel && (
                <text x={x + BAR_W / 2} y={H + 18} textAnchor="middle"
                  fontSize={9} fill="#9CA3AF">
                  {fmtShortDate(d.day)}
                </text>
              )}
            </g>
          );
        })}
        <text x={4} y={12} fontSize={9} fill="#9CA3AF">{sarFmt(max)}</text>
        <text x={4} y={H - 4} fontSize={9} fill="#9CA3AF">SAR 0</text>
        <line x1={0} y1={H} x2={W} y2={H} stroke="#E5E7EB" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-summary'],
    queryFn:  getFinanceSummary,
    staleTime: 60_000,
  });

  const s: FinanceSummary | undefined = data?.data;

  if (isLoading) return <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>;
  if (isError || !s) return <div className="py-16 text-center text-sm text-red-500">Failed to load finance data.</div>;

  const recon = s.reconciliation;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Revenue (confirmed bookings, SAR equiv.)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Today"      value={sarFmt(s.today_sar)} sub={`${s.today_count} bookings`} accent="blue" />
          <KpiCard label="This week"  value={sarFmt(s.week_sar)} />
          <KpiCard label="This month" value={sarFmt(s.month_sar)} sub={`${s.month_count} bookings`} accent="green" />
          <KpiCard label="Year to date" value={sarFmt(s.ytd_sar)} sub={`${s.total_confirmed} total confirmed`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['hotel', 'flight', 'car'] as const).map(pt => (
          <div key={pt} className="rounded-xl border border-utu-border-default bg-utu-bg-card px-5 py-4">
            <p className="text-xs text-utu-text-muted">{PRODUCT_ICONS[pt]} {pt.charAt(0).toUpperCase() + pt.slice(1)}s this month</p>
            <p className="mt-1 text-xl font-bold text-utu-text-primary">{sarFmt(s.by_product[pt])}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-xs font-medium text-amber-700">Refunds this month</p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-xl font-bold text-amber-800">{sarFmt(s.refunds_month_sar)}</p>
          <p className="text-sm text-amber-600">{s.refunds_month_count} refund{s.refunds_month_count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {Object.keys(s.by_currency).length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Currency breakdown (this month)</h2>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Currency', 'Bookings', 'Revenue'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {Object.entries(s.by_currency).map(([cur, v]) => (
                  <tr key={cur} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-medium text-utu-text-primary">{cur}</td>
                    <td className="px-4 py-3 text-utu-text-secondary">{v.count}</td>
                    <td className="px-4 py-3 text-utu-text-primary">{cur} {v.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`rounded-xl border px-5 py-4 ${
        recon.status === 'ok'      ? 'border-green-200 bg-green-50' :
        recon.status === 'warning' ? 'border-amber-200 bg-amber-50' :
                                     'border-red-200   bg-red-50'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              recon.status === 'ok' ? 'text-green-700' : recon.status === 'warning' ? 'text-amber-700' : 'text-red-700'
            }`}>
              Reconciliation — {recon.status === 'ok' ? 'Clean' : recon.status === 'warning' ? 'Minor discrepancy' : 'Alert: large discrepancy'}
            </p>
            <div className="mt-2 flex gap-6 text-sm">
              <div>
                <p className="text-xs text-utu-text-muted">Confirmed bookings</p>
                <p className="font-medium text-utu-text-primary">{sarFmt(recon.bookings_sar)}</p>
              </div>
              <div>
                <p className="text-xs text-utu-text-muted">Paid payments</p>
                <p className="font-medium text-utu-text-primary">{sarFmt(recon.payments_sar)}</p>
              </div>
              <div>
                <p className="text-xs text-utu-text-muted">Discrepancy</p>
                <p className={`font-medium ${recon.status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                  {recon.discrepancy_pct}%
                </p>
              </div>
            </div>
          </div>
          <span className={`text-2xl ${recon.status === 'ok' ? 'text-green-600' : recon.status === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
            {recon.status === 'ok' ? '✓' : '⚠'}
          </span>
        </div>
        {recon.status !== 'ok' && (
          <p className="mt-2 text-xs text-utu-text-muted">
            Run the Reconciliation tab for a detailed breakdown of unmatched records.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Revenue Trend ───────────────────────────────────────────────────────

function TrendTab() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-daily', days],
    queryFn:  () => getFinanceDaily(days),
    staleTime: 120_000,
  });

  const series: DailyRevenue[] = data?.data ?? [];
  const totalSAR = series.reduce((s, d) => s + d.revenue_sar, 0);
  const totalBookings = series.reduce((s, d) => s + d.booking_count, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-utu-text-primary">Daily Revenue</h2>
          {series.length > 0 && (
            <p className="text-xs text-utu-text-muted mt-0.5">
              {sarFmt(totalSAR)} across {totalBookings} bookings in last {days} days
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-utu-navy text-white'
                  : 'border border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-muted'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
        {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}
        {isError   && <div className="py-16 text-center text-sm text-red-500">Failed to load chart data.</div>}
        {!isLoading && !isError && <BarChart data={series} />}
      </div>

      {series.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Date', 'Bookings', 'Revenue (SAR equiv.)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {[...series].reverse().slice(0, 10).map(d => (
                <tr key={d.day} className="hover:bg-utu-bg-muted">
                  <td className="px-4 py-3 text-utu-text-secondary">{fmtDate(d.day + 'T00:00:00')}</td>
                  <td className="px-4 py-3 text-utu-text-secondary">{d.booking_count}</td>
                  <td className="px-4 py-3 font-medium text-utu-text-primary">{sarFmt(d.revenue_sar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Refunds ─────────────────────────────────────────────────────────────

function RefundsTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-refunds', page],
    queryFn:  () => getFinanceRefunds(page),
    staleTime: 60_000,
  });

  const refunds: RefundRecord[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-utu-text-primary">
          Refunds
          {total > 0 && <span className="ms-2 text-xs font-normal text-utu-text-muted">({total} total)</span>}
        </h2>
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-16 text-center text-sm text-red-500">Failed to load refunds.</div>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Ref / Product', 'Customer', 'Amount', 'Refunded', 'Gateway Ref'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {refunds.map(r => (
                  <tr key={r.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3">
                      <div className="font-medium text-utu-text-primary text-sm">{r.reference_no ?? '—'}</div>
                      <div className="text-xs text-utu-text-muted capitalize">{r.product_type ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-utu-text-primary">{r.user_name ?? '—'}</div>
                      <div className="text-xs text-utu-text-muted">{r.user_email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-red-600">
                        {r.currency} {(r.refund_amount ?? r.amount).toLocaleString()}
                      </div>
                      {r.refund_amount && r.refund_amount !== r.amount && (
                        <div className="text-xs text-utu-text-muted">of {r.currency} {r.amount.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary whitespace-nowrap">
                      {fmtDate(r.refunded_at)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-muted">
                      {r.gateway_ref ? r.gateway_ref.slice(0, 20) + (r.gateway_ref.length > 20 ? '…' : '') : '—'}
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-utu-text-muted">No refunds found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-utu-text-muted">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
                  Previous
                </button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Reconciliation ──────────────────────────────────────────────────────

function ReconciliationTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-reconciliation'],
    queryFn:  getFinanceReconciliation,
    staleTime: 120_000,
  });

  const r: ReconciliationReport | undefined = data?.data;

  if (isLoading) return <div className="py-16 text-center text-sm text-utu-text-muted">Running reconciliation…</div>;
  if (isError || !r) return <div className="py-16 text-center text-sm text-red-500">Failed to run reconciliation.</div>;

  const isClean = r.status === 'clean';

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border px-5 py-4 ${isClean ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <p className={`text-sm font-semibold ${isClean ? 'text-green-700' : 'text-red-700'}`}>
          {isClean ? 'All records reconciled — no discrepancies found.' : 'Discrepancies detected — investigation required.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Confirmed bookings with no payment</p>
          <p className="mt-2 text-3xl font-bold text-utu-text-primary">{r.confirmed_no_payment.count}</p>
          {r.confirmed_no_payment.count > 0 && (
            <p className="mt-1 text-sm text-red-600">{sarFmt(r.confirmed_no_payment.total_sar)} unmatched</p>
          )}
        </div>
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Paid payments with no confirmed booking</p>
          <p className="mt-2 text-3xl font-bold text-utu-text-primary">{r.paid_no_confirmed.count}</p>
          {r.paid_no_confirmed.count > 0 && (
            <p className="mt-1 text-sm text-red-600">{sarFmt(r.paid_no_confirmed.total_sar)} unmatched</p>
          )}
        </div>
      </div>

      {r.confirmed_no_payment.sample.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-utu-text-muted">
            Sample: confirmed bookings without payment (most recent 10)
          </h3>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Reference', 'Product', 'Amount', 'Customer', 'Booked'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {r.confirmed_no_payment.sample.map(b => (
                  <tr key={b.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-mono text-xs text-utu-text-primary">{b.reference_no}</td>
                    <td className="px-4 py-3 text-xs capitalize text-utu-text-secondary">{b.product_type}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-primary">{b.currency} {b.total_price?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted">{b.user_email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">{fmtDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Vendor Diligence Modal ────────────────────────────────────────────────

const RISK_BADGE: Record<string, string> = {
  low:      'bg-green-100 text-green-700 border-green-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-600 border-red-200',
};

const APPROVE_BADGE: Record<string, string> = {
  approve:                'bg-green-100 text-green-700',
  approve_with_conditions:'bg-amber-100 text-amber-700',
  defer:                  'bg-orange-100 text-orange-700',
  reject:                 'bg-red-100 text-red-600',
};

function AIVendorDiligenceModal({
  vendor,
  onClose,
}: {
  vendor: FinanceVendor;
  onClose: () => void;
}) {
  const [diligence, setDiligence] = useState<VendorDiligence | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [running,   setRunning]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVendorDiligence(vendor.id)
      .then(r => { if (!cancelled) { setDiligence(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vendor.id]);

  async function handleRun() {
    setRunning(true);
    setError('');
    try {
      const res = await runVendorDiligence(vendor.id);
      if (res.data) setDiligence(res.data);
      else setError('Due diligence failed. Please try again.');
    } catch {
      setError('Failed to run analysis. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-violet-600">✦</span>
              <h2 className="text-base font-bold text-utu-text-primary">AI Vendor Due Diligence</h2>
            </div>
            <p className="mt-0.5 text-xs text-utu-text-muted">{vendor.name}</p>
          </div>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading && (
            <p className="text-xs text-utu-text-muted italic py-8 text-center">Loading diligence report…</p>
          )}

          {!loading && !diligence && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-utu-text-secondary">
                No diligence report yet. Run AI Due Diligence to get risk score, compliance gaps, financial health, and approval recommendation.
              </p>
              <button
                onClick={handleRun}
                disabled={running}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Running…' : '✦ Run Due Diligence'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {diligence && !loading && (
            <>
              {/* Score + risk + recommendation */}
              <div className="flex flex-wrap gap-3">
                <div className={`rounded-xl border px-4 py-3 ${RISK_BADGE[diligence.risk_level] ?? 'border-utu-border-default bg-utu-bg-muted'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Risk Level</p>
                  <p className="mt-0.5 text-lg font-bold capitalize">{diligence.risk_level}</p>
                </div>
                <div className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-3">
                  <p className="text-xs text-utu-text-muted">Overall Score</p>
                  <p className="mt-0.5 text-lg font-bold text-utu-text-primary">{diligence.overall_score}/100</p>
                </div>
                <div className={`rounded-xl border px-4 py-3 ${APPROVE_BADGE[diligence.approve_recommendation] ?? ''}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Recommendation</p>
                  <p className="mt-0.5 text-sm font-bold capitalize">{diligence.approve_recommendation.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Executive summary */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-1">Executive Summary</h3>
                <p className="text-sm text-utu-text-secondary leading-relaxed">{diligence.executive_summary}</p>
              </div>

              {/* Financial + payment + SLA notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                  <p className="text-xs font-semibold text-utu-text-muted mb-1">Financial Health</p>
                  <p className="text-xs text-utu-text-secondary">{diligence.financial_health_note}</p>
                </div>
                <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                  <p className="text-xs font-semibold text-utu-text-muted mb-1">Payment History</p>
                  <p className="text-xs text-utu-text-secondary">{diligence.payment_history_note}</p>
                </div>
                <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                  <p className="text-xs font-semibold text-utu-text-muted mb-1">SLA Performance</p>
                  <p className="text-xs text-utu-text-secondary">{diligence.sla_performance_note}</p>
                </div>
              </div>

              {/* Risk flags */}
              {diligence.risk_flags.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <h3 className="text-xs font-semibold text-red-700 mb-2">Risk Flags</h3>
                  <ul className="space-y-1">
                    {diligence.risk_flags.map((f, i) => (
                      <li key={i} className="text-xs text-red-600">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing compliance */}
              {diligence.missing_compliance.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <h3 className="text-xs font-semibold text-amber-700 mb-2">Missing Compliance</h3>
                  <ul className="space-y-1">
                    {diligence.missing_compliance.map((f, i) => (
                      <li key={i} className="text-xs text-amber-700">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {diligence.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {diligence.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary">
                        <span className="mt-0.5 text-violet-400">▸</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-utu-border-default">
                <p className="text-xs text-utu-text-muted">
                  Generated {new Date(diligence.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Re-running…' : 'Re-run'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Vendors ─────────────────────────────────────────────────────────────

function VendorsTab() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<{ open: boolean; editing: FinanceVendor | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<FinanceVendor>>({});
  const [diligenceVendor, setDiligenceVendor] = useState<FinanceVendor | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-vendors', filterType, filterStatus, page],
    queryFn: () => getFinanceVendors({ type: filterType || undefined, status: filterStatus || undefined, page, limit: 20 }),
    staleTime: 30_000,
  });

  const vendors: FinanceVendor[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  const saveMut = useMutation({
    mutationFn: (v: Partial<FinanceVendor>) =>
      panel.editing ? updateFinanceVendor(panel.editing.id, v) : createFinanceVendor(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-vendors'] }); setPanel({ open: false, editing: null }); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteFinanceVendor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-vendors'] }),
  });

  function openCreate() { setForm({}); setPanel({ open: true, editing: null }); }
  function openEdit(v: FinanceVendor) { setForm(v); setPanel({ open: true, editing: v }); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Types</option>
          {(Object.keys(VENDOR_TYPE_LABELS) as VendorType[]).map(t => <option key={t} value={t}>{VENDOR_TYPE_LABELS[t]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Statuses</option>
          {(['active', 'inactive', 'blocked'] as VendorStatus[]).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <div className="ms-auto">
          <button onClick={openCreate} className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors">
            + New Vendor
          </button>
        </div>
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-16 text-center text-sm text-red-500">Failed to load vendors.</div>}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Name', 'Type', 'Country', 'Currency', 'Tax ID', 'Terms', 'Contact', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-utu-bg-muted">
                  <td className="px-4 py-3 font-medium text-utu-text-primary">{v.name}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{VENDOR_TYPE_LABELS[v.vendor_type]}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{v.country ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{v.currency}</td>
                  <td className="px-4 py-3 text-xs font-mono text-utu-text-muted">{v.tax_id ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{v.payment_terms ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">{v.contact_email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VENDOR_STATUS_COLORS[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => openEdit(v)} className="text-xs text-utu-blue hover:underline me-3">Edit</button>
                    <button
                      onClick={() => setDiligenceVendor(v)}
                      className="text-xs text-violet-600 hover:underline me-3"
                    >✦ Diligence</button>
                    {v.status !== 'blocked' && (
                      <button onClick={() => deleteMut.mutate(v.id)}
                        className="text-xs text-red-500 hover:underline">
                        {deleteMut.isPending ? '…' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-utu-text-muted">No vendors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-utu-text-muted">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, editing: null })}
        title={panel.editing ? 'Edit Vendor' : 'New Vendor'}>
        <div className="space-y-4">
          <Field label="Name *">
            <input className={inputCls} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Type">
            <select className={selectCls} value={form.vendor_type ?? 'other'} onChange={e => setForm(f => ({ ...f, vendor_type: e.target.value as VendorType }))}>
              {(Object.keys(VENDOR_TYPE_LABELS) as VendorType[]).map(t => <option key={t} value={t}>{VENDOR_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country">
              <input className={inputCls} value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </Field>
            <Field label="Currency">
              <input className={inputCls} value={form.currency ?? 'SAR'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tax ID / VAT Reg">
              <input className={inputCls} value={form.tax_id ?? ''} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} />
            </Field>
            <Field label="Payment Terms">
              <input className={inputCls} placeholder="e.g. net_30" value={form.payment_terms ?? ''} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
            </Field>
          </div>
          <Field label="Contact Email">
            <input className={inputCls} type="email" value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
          </Field>
          <Field label="IBAN">
            <input className={inputCls} value={form.iban ?? ''} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bank Name">
              <input className={inputCls} value={form.bank_name ?? ''} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
            </Field>
            <Field label="SWIFT / BIC">
              <input className={inputCls} value={form.swift_bic ?? ''} onChange={e => setForm(f => ({ ...f, swift_bic: e.target.value }))} />
            </Field>
          </div>
          {panel.editing && (
            <Field label="Status">
              <select className={selectCls} value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value as VendorStatus }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </Field>
          )}
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <button onClick={() => saveMut.mutate(form)} disabled={!form.name || saveMut.isPending}
            className="w-full rounded-lg bg-utu-navy py-2.5 text-sm font-medium text-white hover:bg-utu-blue disabled:opacity-50 transition-colors">
            {saveMut.isPending ? 'Saving…' : panel.editing ? 'Save Changes' : 'Create Vendor'}
          </button>
          {saveMut.isError && <p className="text-xs text-red-500">Save failed. Please try again.</p>}
        </div>
      </SlidePanel>

      {diligenceVendor && (
        <AIVendorDiligenceModal vendor={diligenceVendor} onClose={() => setDiligenceVendor(null)} />
      )}
    </div>
  );
}

// ─── Tab: Invoices ────────────────────────────────────────────────────────────

function InvoicesTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<{ open: boolean; editing: FinanceInvoice | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<FinanceInvoice>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-invoices', filterStatus, filterCategory, page],
    queryFn: () => getFinanceInvoices({ status: filterStatus || undefined, category: filterCategory || undefined, page, limit: 20 }),
    staleTime: 30_000,
  });

  const invoices: FinanceInvoice[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  const saveMut = useMutation({
    mutationFn: (v: Partial<FinanceInvoice>) =>
      panel.editing ? updateFinanceInvoice(panel.editing.id, v) : createFinanceInvoice(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-invoices'] }); setPanel({ open: false, editing: null }); },
  });

  const quickPatch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinanceInvoice> }) => updateFinanceInvoice(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-invoices'] }),
  });

  function openCreate() { setForm({ currency: 'SAR', tax_amount: 0 }); setPanel({ open: true, editing: null }); }
  function openEdit(inv: FinanceInvoice) { setForm(inv); setPanel({ open: true, editing: inv }); }

  function isOverdue(inv: FinanceInvoice) {
    if (!inv.due_date || inv.status === 'paid' || inv.status === 'cancelled') return false;
    return daysUntil(inv.due_date) !== null && (daysUntil(inv.due_date) as number) < 0;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Statuses</option>
          {(['pending', 'approved', 'paid', 'overdue', 'disputed', 'cancelled'] as InvoiceStatus[]).map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Categories</option>
          {FINANCE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <div className="ms-auto">
          <button onClick={openCreate} className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors">
            + New Invoice
          </button>
        </div>
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-16 text-center text-sm text-red-500">Failed to load invoices.</div>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Invoice No', 'Vendor', 'Category', 'Amount', 'Invoice Date', 'Due Date', 'Status', 'Ref', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {invoices.map(inv => {
                const overdue = isOverdue(inv);
                const daysLeft = daysUntil(inv.due_date);
                return (
                  <tr key={inv.id} className={overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-utu-bg-muted'}>
                    <td className="px-4 py-3 font-mono text-xs text-utu-text-primary">{inv.invoice_no}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-primary">{inv.vendor_name}</td>
                    <td className="px-4 py-3 text-xs capitalize text-utu-text-secondary">{inv.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-utu-text-primary">{inv.currency} {inv.total_amount.toLocaleString()}</div>
                      {inv.tax_amount > 0 && <div className="text-xs text-utu-text-muted">+{inv.currency} {inv.tax_amount} tax</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap font-medium ${
                      overdue ? 'text-red-600' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-600' : 'text-utu-text-secondary'
                    }`}>
                      {inv.due_date ? fmtDate(inv.due_date) : '—'}
                      {overdue && <span className="ms-1 text-red-500">(overdue)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-muted">
                      {inv.payment_ref ? inv.payment_ref.slice(0, 16) + (inv.payment_ref.length > 16 ? '…' : '') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {inv.status === 'pending' && (
                        <button onClick={() => quickPatch.mutate({ id: inv.id, data: { status: 'approved' } })}
                          className="text-xs text-blue-600 hover:underline me-2">Approve</button>
                      )}
                      {(inv.status === 'pending' || inv.status === 'approved') && (
                        <button onClick={() => quickPatch.mutate({ id: inv.id, data: { status: 'paid' } })}
                          className="text-xs text-green-600 hover:underline me-2">Mark Paid</button>
                      )}
                      <button onClick={() => openEdit(inv)} className="text-xs text-utu-blue hover:underline">Edit</button>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-utu-text-muted">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-utu-text-muted">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, editing: null })}
        title={panel.editing ? 'Edit Invoice' : 'New Invoice'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice No *">
              <input className={inputCls} value={form.invoice_no ?? ''} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} />
            </Field>
            <Field label="Vendor Name *">
              <input className={inputCls} value={form.vendor_name ?? ''} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice Date *">
              <input type="date" className={inputCls} value={form.invoice_date ?? ''} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
            </Field>
            <Field label="Due Date">
              <input type="date" className={inputCls} value={form.due_date ?? ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Amount *">
              <input type="number" className={inputCls} value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Tax Amount">
              <input type="number" className={inputCls} value={form.tax_amount ?? 0} onChange={e => setForm(f => ({ ...f, tax_amount: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Total">
              <input type="number" className={inputCls} value={form.total_amount ?? ((form.amount ?? 0) + (form.tax_amount ?? 0))} onChange={e => setForm(f => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <input className={inputCls} value={form.currency ?? 'SAR'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </Field>
            <Field label="Category">
              <select className={selectCls} value={form.category ?? 'other'} onChange={e => setForm(f => ({ ...f, category: e.target.value as FinanceCategory }))}>
                {FINANCE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
          </div>
          {panel.editing && (
            <>
              <Field label="Status">
                <select className={selectCls} value={form.status ?? 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value as InvoiceStatus }))}>
                  {(['pending', 'approved', 'paid', 'overdue', 'disputed', 'cancelled'] as InvoiceStatus[]).map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment Ref">
                <input className={inputCls} value={form.payment_ref ?? ''} onChange={e => setForm(f => ({ ...f, payment_ref: e.target.value }))} />
              </Field>
            </>
          )}
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <button onClick={() => saveMut.mutate(form)} disabled={!form.invoice_no || !form.vendor_name || !form.amount || !form.invoice_date || saveMut.isPending}
            className="w-full rounded-lg bg-utu-navy py-2.5 text-sm font-medium text-white hover:bg-utu-blue disabled:opacity-50 transition-colors">
            {saveMut.isPending ? 'Saving…' : panel.editing ? 'Save Changes' : 'Create Invoice'}
          </button>
          {saveMut.isError && <p className="text-xs text-red-500">Save failed. Please try again.</p>}
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Budgets ─────────────────────────────────────────────────────────────

function BudgetLinesSection({ budget }: { budget: FinanceBudget }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [lineForm, setLineForm] = useState<Partial<FinanceBudgetLine>>({});

  const { data } = useQuery({
    queryKey: ['budget-lines', budget.id],
    queryFn:  () => getBudgetLines(budget.id),
    staleTime: 30_000,
  });

  const lines: FinanceBudgetLine[] = data?.data ?? [];

  const addMut = useMutation({
    mutationFn: (l: Partial<FinanceBudgetLine>) => createBudgetLine(budget.id, l),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-lines', budget.id] }); qc.invalidateQueries({ queryKey: ['finance-budgets'] }); setLineForm({}); setShowForm(false); },
  });

  const delMut = useMutation({
    mutationFn: deleteBudgetLine,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-lines', budget.id] }); qc.invalidateQueries({ queryKey: ['finance-budgets'] }); },
  });

  return (
    <div className="mt-3 border-t border-utu-border-default pt-3">
      <div className="overflow-hidden rounded-lg border border-utu-border-default">
        <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
          <thead className="bg-utu-bg-muted">
            <tr>
              {['Department', 'Category', 'Amount (SAR)', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-utu-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {lines.map(l => (
              <tr key={l.id} className="hover:bg-utu-bg-muted">
                <td className="px-3 py-2 text-xs text-utu-text-primary">{l.department}</td>
                <td className="px-3 py-2 text-xs capitalize text-utu-text-secondary">{l.category}</td>
                <td className="px-3 py-2 text-xs font-medium text-utu-text-primary">SAR {l.amount_sar.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <button onClick={() => delMut.mutate(l.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-xs text-utu-text-muted">No lines. Add below.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <p className="text-xs text-utu-text-muted mb-1">Department</p>
            <input className="rounded border border-utu-border-default px-2 py-1.5 text-xs w-36" placeholder="e.g. Engineering"
              value={lineForm.department ?? ''} onChange={e => setLineForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs text-utu-text-muted mb-1">Category</p>
            <select className="rounded border border-utu-border-default px-2 py-1.5 text-xs" value={lineForm.category ?? 'other'}
              onChange={e => setLineForm(f => ({ ...f, category: e.target.value as FinanceCategory }))}>
              {FINANCE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-utu-text-muted mb-1">Amount SAR</p>
            <input type="number" className="rounded border border-utu-border-default px-2 py-1.5 text-xs w-28" placeholder="0"
              value={lineForm.amount_sar ?? ''} onChange={e => setLineForm(f => ({ ...f, amount_sar: parseFloat(e.target.value) || 0 }))} />
          </div>
          <button onClick={() => addMut.mutate(lineForm)} disabled={!lineForm.department || !lineForm.amount_sar || addMut.isPending}
            className="rounded bg-utu-navy px-3 py-1.5 text-xs text-white hover:bg-utu-blue disabled:opacity-50">
            {addMut.isPending ? '…' : 'Add'}
          </button>
          <button onClick={() => setShowForm(false)} className="text-xs text-utu-text-muted hover:text-utu-text-primary">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-utu-blue hover:underline">+ Add Line</button>
      )}
    </div>
  );
}

function BudgetsTab() {
  const qc = useQueryClient();
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<{ open: boolean; editing: FinanceBudget | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<FinanceBudget>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-budgets', filterYear, filterStatus, page],
    queryFn: () => getFinanceBudgets({ year: filterYear ? parseInt(filterYear) : undefined, status: filterStatus || undefined, page, limit: 20 }),
    staleTime: 30_000,
  });

  const budgets: FinanceBudget[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  const saveMut = useMutation({
    mutationFn: (v: Partial<FinanceBudget>) =>
      panel.editing ? updateFinanceBudget(panel.editing.id, v) : createFinanceBudget(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-budgets'] }); setPanel({ open: false, editing: null }); },
  });

  const approveMut = useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) =>
      updateFinanceBudget(id, { status: 'approved', approved_by: approvedBy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  });

  function openCreate() {
    setForm({ period_type: 'annual', year: currentYear, status: 'draft' });
    setPanel({ open: true, editing: null });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Years</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Statuses</option>
          {(['draft', 'approved', 'active', 'closed'] as BudgetStatus[]).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <div className="ms-auto">
          <button onClick={openCreate} className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors">
            + New Budget
          </button>
        </div>
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-16 text-center text-sm text-red-500">Failed to load budgets.</div>}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {budgets.map(b => (
            <div key={b.id} className="rounded-xl border border-utu-border-default bg-utu-bg-card">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-utu-text-primary">{b.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BUDGET_STATUS_COLORS[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-utu-text-muted capitalize">
                    {b.period_type} {b.year}{b.quarter ? ` Q${b.quarter}` : ''}{b.month ? ` M${b.month}` : ''}
                    {b.approved_by && ` · Approved by ${b.approved_by}`}
                  </p>
                </div>
                <p className="text-lg font-bold text-utu-text-primary whitespace-nowrap">SAR {b.total_sar.toLocaleString()}</p>
                <div className="flex gap-2">
                  {b.status === 'draft' && (
                    <button onClick={() => {
                      const by = window.prompt('Approved by (name/title):');
                      if (by) approveMut.mutate({ id: b.id, approvedBy: by });
                    }} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                      Approve
                    </button>
                  )}
                  <button onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                    {expanded === b.id ? 'Hide Lines' : 'View Lines'}
                  </button>
                </div>
              </div>
              {expanded === b.id && <BudgetLinesSection budget={b} />}
            </div>
          ))}
          {budgets.length === 0 && (
            <div className="rounded-xl border border-utu-border-default bg-utu-bg-card py-12 text-center text-sm text-utu-text-muted">
              No budgets found.
            </div>
          )}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-utu-text-muted">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, editing: null })}
        title={panel.editing ? 'Edit Budget' : 'New Budget'}>
        <div className="space-y-4">
          <Field label="Title *">
            <input className={inputCls} value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period Type">
              <select className={selectCls} value={form.period_type ?? 'annual'} onChange={e => setForm(f => ({ ...f, period_type: e.target.value as 'annual' | 'quarterly' | 'monthly' }))}>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            <Field label="Year *">
              <select className={selectCls} value={form.year ?? currentYear} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          {form.period_type === 'quarterly' && (
            <Field label="Quarter">
              <select className={selectCls} value={form.quarter ?? 1} onChange={e => setForm(f => ({ ...f, quarter: parseInt(e.target.value) }))}>
                <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
              </select>
            </Field>
          )}
          {form.period_type === 'monthly' && (
            <Field label="Month">
              <select className={selectCls} value={form.month ?? 1} onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <button onClick={() => saveMut.mutate(form)} disabled={!form.title || !form.year || saveMut.isPending}
            className="w-full rounded-lg bg-utu-navy py-2.5 text-sm font-medium text-white hover:bg-utu-blue disabled:opacity-50 transition-colors">
            {saveMut.isPending ? 'Saving…' : panel.editing ? 'Save Changes' : 'Create Budget'}
          </button>
          {saveMut.isError && <p className="text-xs text-red-500">Save failed. Please try again.</p>}
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Expense Claims ──────────────────────────────────────────────────────

// ─── AI Expense Analyzer Panel ───────────────────────────────────────────────

const REC_CONFIG: Record<ExpenseRecommendation, { label: string; bg: string; text: string; border: string }> = {
  approve: { label: 'Approve',            bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  query:   { label: 'Query / Clarify',    bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  reject:  { label: 'Reject',             bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
};

function AIExpensePanel({ claimId }: { claimId: string }) {
  const [analysis, setAnalysis] = useState<ExpenseAnalysis | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getExpenseAnalysis(claimId)
      .then(r => { if (!cancelled) { setAnalysis(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [claimId, open]);

  async function handleAnalyze() {
    setRunning(true);
    setError('');
    try {
      const res = await analyzeExpenseClaim(claimId);
      if (res.data) setAnalysis(res.data);
      else setError('Analysis failed. Please try again.');
    } catch {
      setError('Failed to run analysis. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  function copyNotes() {
    if (!analysis?.suggested_notes) return;
    navigator.clipboard.writeText(analysis.suggested_notes).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const rec = analysis ? REC_CONFIG[analysis.recommendation] : null;

  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/40">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Expense Audit</span>
          {analysis && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rec?.bg} ${rec?.text}`}>
              {rec?.label}
            </span>
          )}
          {analysis && (
            <span className="text-xs text-violet-500 font-normal">
              · {new Date(analysis.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-4 pt-3 space-y-3">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading audit…</p>}

          {!loading && !analysis && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                No audit yet. Run AI Expense Audit to get a policy compliance check, anomaly detection, and an approve/reject/query recommendation.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Analysing…' : 'Audit with AI'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Recommendation + confidence */}
              {rec && (
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${rec.bg} ${rec.border}`}>
                  <div>
                    <p className={`text-xs font-bold ${rec.text}`}>{rec.label}</p>
                    <p className={`text-xs ${rec.text} opacity-75`}>{analysis.confidence}% confidence</p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={running}
                    className="rounded border border-violet-300 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                  >
                    {running ? 'Re-auditing…' : 'Re-audit'}
                  </button>
                </div>
              )}

              {/* Summary */}
              {analysis.summary && (
                <p className="text-xs text-utu-text-secondary leading-relaxed">{analysis.summary}</p>
              )}

              {/* Policy flags */}
              {analysis.policy_flags.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-800">Policy Concerns</p>
                  <ul className="space-y-1">
                    {analysis.policy_flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        <span className="text-xs text-red-800 leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Anomaly flags */}
              {analysis.anomaly_flags.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-800">Anomalies Detected</p>
                  <ul className="space-y-1">
                    {analysis.anomaly_flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span className="text-xs text-amber-800 leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Justification */}
              {analysis.justification && (
                <div className="rounded-lg bg-utu-bg-muted px-3 py-2.5">
                  <p className="text-xs font-semibold text-utu-text-secondary mb-1">Justification</p>
                  <p className="text-xs text-utu-text-secondary leading-relaxed">{analysis.justification}</p>
                </div>
              )}

              {/* Suggested admin notes */}
              {analysis.suggested_notes && (
                <div className="rounded-lg border border-violet-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-violet-800">Suggested Admin Notes</p>
                    <button
                      onClick={copyNotes}
                      className="flex items-center gap-1 rounded border border-violet-200 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-utu-text-secondary leading-relaxed">{analysis.suggested_notes}</p>
                </div>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Expense Claims Tab ───────────────────────────────────────────────────────

function ExpenseClaimsTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<{ open: boolean; editing: FinanceExpenseClaim | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<FinanceExpenseClaim>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-claims', filterStatus, filterCategory, page],
    queryFn: () => getExpenseClaims({ status: filterStatus || undefined, category: filterCategory || undefined, page, limit: 20 }),
    staleTime: 30_000,
  });

  const claims: FinanceExpenseClaim[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  const saveMut = useMutation({
    mutationFn: (v: Partial<FinanceExpenseClaim>) =>
      panel.editing ? updateExpenseClaim(panel.editing.id, v) : createExpenseClaim(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-claims'] }); setPanel({ open: false, editing: null }); },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ClaimStatus; notes?: string }) =>
      updateExpenseClaim(id, { status, admin_notes: notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-claims'] }),
  });

  function openCreate() {
    setForm({ currency: 'SAR', claim_date: new Date().toISOString().slice(0, 10) });
    setPanel({ open: true, editing: null });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Statuses</option>
          {(['pending', 'approved', 'rejected', 'paid'] as ClaimStatus[]).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary">
          <option value="">All Categories</option>
          {FINANCE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <div className="ms-auto">
          <button onClick={openCreate} className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors">
            + New Claim
          </button>
        </div>
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-16 text-center text-sm text-red-500">Failed to load expense claims.</div>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Employee', 'Category', 'Amount', 'Date', 'Description', 'Status', 'Reviewed By', 'Admin Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {claims.map(c => (
                <tr key={c.id} className={c.status === 'pending' ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-utu-bg-muted'}>
                  <td className="px-4 py-3 text-xs font-medium text-utu-text-primary">{c.employee_name}</td>
                  <td className="px-4 py-3 text-xs capitalize text-utu-text-secondary">{c.category}</td>
                  <td className="px-4 py-3 text-xs font-medium text-utu-text-primary whitespace-nowrap">{c.currency} {c.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary whitespace-nowrap">{fmtDate(c.claim_date)}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary max-w-xs truncate">{c.description}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLAIM_STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">{c.reviewed_by ?? '—'}</td>
                  <td className="px-4 py-3">
                    <input className="w-32 rounded border border-utu-border-default px-2 py-1 text-xs" placeholder="Notes…"
                      value={adminNotes[c.id] ?? (c.admin_notes ?? '')}
                      onChange={e => setAdminNotes(n => ({ ...n, [c.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.status === 'pending' && (
                      <>
                        <button onClick={() => actionMut.mutate({ id: c.id, status: 'approved', notes: adminNotes[c.id] })}
                          className="text-xs text-green-600 hover:underline me-2">Approve</button>
                        <button onClick={() => actionMut.mutate({ id: c.id, status: 'rejected', notes: adminNotes[c.id] })}
                          className="text-xs text-red-500 hover:underline">Reject</button>
                      </>
                    )}
                    {c.status === 'approved' && (
                      <button onClick={() => actionMut.mutate({ id: c.id, status: 'paid' })}
                        className="text-xs text-blue-600 hover:underline">Mark Paid</button>
                    )}
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-utu-text-muted">No expense claims found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-utu-text-muted">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, editing: null })}
        title={panel.editing ? 'Edit Claim' : 'New Expense Claim'}>
        <div className="space-y-4">
          <Field label="Employee Name *">
            <input className={inputCls} value={form.employee_name ?? ''} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className={selectCls} value={form.category ?? 'other'} onChange={e => setForm(f => ({ ...f, category: e.target.value as FinanceCategory }))}>
                {FINANCE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
            <Field label="Claim Date *">
              <input type="date" className={inputCls} value={form.claim_date ?? ''} onChange={e => setForm(f => ({ ...f, claim_date: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount *">
              <input type="number" className={inputCls} value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Currency">
              <input className={inputCls} value={form.currency ?? 'SAR'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description *">
            <textarea className={inputCls} rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Receipt URL">
            <input className={inputCls} placeholder="https://…" value={form.file_url ?? ''} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} />
          </Field>
          <button onClick={() => saveMut.mutate(form)} disabled={!form.employee_name || !form.amount || !form.description || !form.claim_date || saveMut.isPending}
            className="w-full rounded-lg bg-utu-navy py-2.5 text-sm font-medium text-white hover:bg-utu-blue disabled:opacity-50 transition-colors">
            {saveMut.isPending ? 'Saving…' : panel.editing ? 'Save Changes' : 'Submit Claim'}
          </button>
          {saveMut.isError && <p className="text-xs text-red-500">Save failed. Please try again.</p>}

          {/* AI Expense Audit — only for existing claims */}
          {panel.editing && <AIExpensePanel claimId={panel.editing.id} />}
        </div>
      </SlidePanel>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Revenue Trend', 'Refunds', 'Reconciliation', 'Vendors', 'Invoices', 'Budgets', 'Expense Claims'] as const;
type Tab = typeof TABS[number];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Finance</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Revenue reporting, refund tracking, reconciliation, vendor payments, invoices, budgets, and expense claims.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-utu-border-default">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview'        && <OverviewTab />}
      {activeTab === 'Revenue Trend'   && <TrendTab />}
      {activeTab === 'Refunds'         && <RefundsTab />}
      {activeTab === 'Reconciliation'  && <ReconciliationTab />}
      {activeTab === 'Vendors'         && <VendorsTab />}
      {activeTab === 'Invoices'        && <InvoicesTab />}
      {activeTab === 'Budgets'         && <BudgetsTab />}
      {activeTab === 'Expense Claims'  && <ExpenseClaimsTab />}
    </div>
  );
}
