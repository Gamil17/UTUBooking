'use client';

import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminBookingStats,
  getAdminBookings,
  updateAdminBookingStatus,
  type AdminBooking,
  type BookingStats,
  getBookingInsights, analyzeBookings, type BookingInsights,
} from '@/lib/api';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'cancelled', 'refunded'];
const TYPE_OPTIONS   = ['', 'hotel', 'flight', 'car'];

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  refunded:  'bg-purple-100 text-purple-700',
};

const TYPE_ICONS: Record<string, string> = {
  hotel:  '🏨',
  flight: '✈️',
  car:    '🚗',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── AI Booking Insights Panel ────────────────────────────────────────────────

const BOOKING_HEALTH_BADGE: Record<string, string> = {
  excellent: 'border-green-300  bg-green-50  text-green-700',
  good:      'border-blue-200   bg-blue-50   text-blue-700',
  fair:      'border-amber-200  bg-amber-50  text-amber-700',
  poor:      'border-red-200    bg-red-50    text-red-700',
};
const SEVERITY_COLORS: Record<string, string> = {
  high:   'border-red-200    bg-red-50    text-red-700',
  medium: 'border-amber-200  bg-amber-50  text-amber-700',
  low:    'border-blue-200   bg-blue-50   text-blue-700',
};
const EFFORT_COLORS: Record<string, string> = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100   text-red-700',
};

function AIBookingInsightsPanel() {
  const [insights, setInsights] = useState<BookingInsights | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState('');
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getBookingInsights()
      .then(r => { if (!cancelled) { setInsights(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeBookings();
      if (res.data) setInsights(res.data);
      else setError('Analysis failed. Please try again.');
    } catch { setError('Failed to run analysis.'); }
    finally { setRunning(false); }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 mb-4">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Revenue & Booking Insights</span>
          {insights && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${BOOKING_HEALTH_BADGE[insights.booking_health] ?? ''}`}>
              {insights.booking_health}
            </span>
          )}
          {insights && (
            <span className="text-xs text-violet-500">
              {insights.total_bookings.toLocaleString()} bookings · SAR {Number(insights.revenue_sar).toLocaleString(undefined, { maximumFractionDigits: 0 })} · {insights.cancellation_rate_pct}% cancel
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading insights…</p>}

          {!loading && !insights && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                Run AI Booking Insights to surface booking anomalies, cancellation patterns, product revenue breakdown, and seasonal forecasts.
              </p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Booking Analysis'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {insights && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{insights.executive_summary}</p>

              {insights.anomalies.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Anomalies Detected</h3>
                  <div className="space-y-2">
                    {insights.anomalies.map((a, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${SEVERITY_COLORS[a.severity] ?? ''}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold capitalize">{a.description}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-xs capitalize ${
                            a.type === 'spike' ? 'bg-green-100 text-green-700' :
                            a.type === 'drop'  ? 'bg-red-100 text-red-700' :
                                                 'bg-gray-100 text-gray-600'
                          }`}>{a.type}</span>
                        </div>
                        <p className="text-xs mt-0.5 italic opacity-80">Likely cause: {a.likely_cause}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.product_breakdown.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Product Assessment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {insights.product_breakdown.map((p, i) => (
                      <div key={i} className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                        <p className="text-xs font-semibold text-utu-text-primary capitalize">{
                          p.product === 'hotel' ? '🏨' : p.product === 'flight' ? '✈️' : '🚗'
                        } {p.product}</p>
                        <p className="text-xs text-utu-text-secondary mt-0.5">{p.assessment}</p>
                        <p className="text-xs text-violet-600 mt-0.5 italic">{p.opportunity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {insights.conversion_insights && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">Conversion Insights</p>
                    <p className="text-xs text-utu-text-secondary">{insights.conversion_insights}</p>
                  </div>
                )}
                {insights.cancellation_patterns && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">Cancellation Patterns</p>
                    <p className="text-xs text-utu-text-secondary">{insights.cancellation_patterns}</p>
                  </div>
                )}
              </div>

              {insights.revenue_opportunities.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Revenue Opportunities</h3>
                  <div className="space-y-2">
                    {insights.revenue_opportunities.map((o, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-green-800">{o.opportunity}</p>
                          <p className="text-xs text-green-600 mt-0.5">{o.estimated_impact}</p>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${EFFORT_COLORS[o.effort] ?? ''}`}>{o.effort} effort</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.seasonal_forecast && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-semibold text-indigo-800 mb-1">Seasonal Forecast</p>
                  <p className="text-xs text-indigo-700">{insights.seasonal_forecast}</p>
                </div>
              )}

              {insights.risk_flags.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-semibold text-red-800 mb-1">Risk Flags</p>
                  <ul className="space-y-0.5">
                    {insights.risk_flags.map((f, i) => <li key={i} className="text-xs text-red-700">• {f}</li>)}
                  </ul>
                </div>
              )}

              {insights.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {insights.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-utu-text-secondary before:content-['✓'] before:mr-1.5 before:text-violet-500">{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                <p className="text-xs text-violet-400">Last run: {new Date(insights.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <button onClick={handleAnalyze} disabled={running}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {running ? 'Refreshing…' : '↺ Refresh'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

export default function AdminBookingsPage() {
  const qc = useQueryClient();

  const [search,       setSearch]       = useState('');
  const [debSearch,    setDebSearch]    = useState('');
  const [status,       setStatus]       = useState('');
  const [productType,  setProductType]  = useState('');
  const [offset,       setOffset]       = useState(0);
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; current: string } | null>(null);
  const [newStatus,    setNewStatus]    = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebSearch(val); setOffset(0); }, 350);
  }

  const { data: stats } = useQuery<BookingStats>({
    queryKey: ['admin-booking-stats'],
    queryFn:  getAdminBookingStats,
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-bookings', debSearch, status, productType, offset],
    queryFn:  () => getAdminBookings({
      search:       debSearch       || undefined,
      status:       status          || undefined,
      product_type: productType     || undefined,
      limit:        PAGE_SIZE,
      offset,
    }),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => updateAdminBookingStatus(id, s),
    onSuccess:  () => {
      setPendingStatus(null);
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      qc.invalidateQueries({ queryKey: ['admin-booking-stats'] });
    },
  });

  const bookings: AdminBooking[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Bookings</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          All platform bookings — search, filter, and update status.
        </p>
      </div>

      {/* AI Booking Insights */}
      <AIBookingInsightsPanel />

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total"     value={stats.total} />
          <StatCard label="Pending"   value={stats.pending} />
          <StatCard label="Confirmed" value={stats.confirmed} />
          <StatCard label="Cancelled" value={stats.cancelled} />
          <StatCard
            label="Confirmed Revenue"
            value={`SAR ${Number(stats.confirmed_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub={`Hotels ${stats.hotels} · Flights ${stats.flights} · Cars ${stats.cars}`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search reference, email, name…"
          className="w-64 rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <select
          value={productType}
          onChange={(e) => { setProductType(e.target.value); setOffset(0); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t || 'All types'}</option>
          ))}
        </select>
        {data && (
          <span className="flex items-center text-sm text-utu-text-muted">
            {data.total.toLocaleString()} bookings
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>}
        {isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load bookings.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Reference', 'Type', 'User', 'Amount', 'Status', 'Booked', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-utu-bg-muted cursor-pointer"
                    onClick={() => setDetailId(detailId === b.id ? null : b.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-utu-text-primary">{b.reference_no}</td>
                    <td className="px-4 py-3 text-sm">
                      <span title={b.product_type}>{TYPE_ICONS[b.product_type]} {b.product_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-utu-text-secondary">{b.user_email ?? '—'}</div>
                      {b.user_name && <div className="text-xs text-utu-text-muted">{b.user_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary whitespace-nowrap">
                      {Number(b.total_price).toLocaleString(undefined, { maximumFractionDigits: 0 })} {b.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-utu-bg-muted text-utu-text-muted'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">{formatDate(b.created_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setPendingStatus({ id: b.id, current: b.status }); setNewStatus(b.status); }}
                        className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-text-secondary
                                   hover:bg-utu-bg-muted transition-colors"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-utu-text-muted">No bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Status update modal */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Update Booking Status</h3>
            <p className="mt-1 text-sm text-utu-text-muted">
              Current: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pendingStatus.current]}`}>
                {pendingStatus.current}
              </span>
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-utu-text-secondary">New status</span>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                           text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              >
                {['pending', 'confirmed', 'cancelled', 'refunded'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setPendingStatus(null)}
                className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => statusMutation.mutate({ id: pendingStatus.id, s: newStatus })}
                disabled={newStatus === pendingStatus.current || statusMutation.isPending}
                className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white
                           hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {statusMutation.isPending ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
