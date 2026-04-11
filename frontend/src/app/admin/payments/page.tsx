'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminPaymentStats,
  getAdminPayments,
  getPaymentAudit,
  initiateRefund,
  type Payment,
  type PaymentAuditEntry,
} from '@/lib/api';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-red-600' : 'text-utu-text-primary'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-utu-text-primary capitalize">{label}</span>
        <span className="text-utu-text-muted">{value.toLocaleString()}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-utu-bg-muted">
        <div
          className="h-3 rounded-full bg-red-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  paid:     'bg-emerald-100 text-emerald-700',
  failed:   'bg-red-100 text-red-600',
  pending:  'bg-amber-100 text-amber-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const GATEWAYS = [
  'stcpay', 'mada', 'stripe', 'iyzico', 'midtrans',
  'ipay88', 'jazzcash', 'easypaisa', 'razorpay', 'twint',
  'paypal', 'affirm', 'interac', 'pix', 'mercadopago',
];

// ─── Audit timeline ───────────────────────────────────────────────────────────

function AuditTimeline({ paymentId }: { paymentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-audit', paymentId],
    queryFn:  () => getPaymentAudit(paymentId),
    enabled:  !!paymentId,
  });

  if (isLoading) {
    return <p className="py-2 text-xs text-utu-text-muted animate-pulse">Loading audit trail…</p>;
  }
  const entries: PaymentAuditEntry[] = data?.data ?? [];
  if (!entries.length) {
    return <p className="py-2 text-xs text-utu-text-muted">No audit entries found.</p>;
  }

  return (
    <ol className="relative border-s border-utu-border-default ps-4 space-y-3 py-2">
      {entries.map((e) => (
        <li key={e.id} className="text-xs">
          <span className="absolute -start-1.5 mt-1 h-3 w-3 rounded-full bg-utu-blue border-2 border-utu-bg-card" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-utu-text-primary capitalize">{e.event}</span>
            {e.status && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {e.status}
              </span>
            )}
            <span className="text-utu-text-muted">{e.gateway}</span>
            {e.amount != null && (
              <span className="text-utu-text-muted">{e.currency} {Number(e.amount).toLocaleString()}</span>
            )}
            <span className="ms-auto text-utu-text-muted">{new Date(e.created_at).toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Refund modal ─────────────────────────────────────────────────────────────

interface RefundTarget { id: string; amount: number; currency: string; method: string }

function RefundModal({
  target,
  onClose,
  onSuccess,
}: {
  target:    RefundTarget;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason]       = useState<'requested_by_customer' | 'fraudulent' | 'duplicate'>('requested_by_customer');
  const [partial, setPartial]     = useState(false);
  const [partialAmt, setPartialAmt] = useState('');
  const [error, setError]         = useState('');

  const mutation = useMutation({
    mutationFn: () => initiateRefund(target.id, {
      reason,
      amount: partial && partialAmt ? parseFloat(partialAmt) : undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError:   (e: unknown) => setError(e instanceof Error ? e.message : 'Refund failed'),
  });

  const isStripe  = target.method === 'stripe';
  const refundAmt = partial && partialAmt ? parseFloat(partialAmt) : target.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-utu-bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold text-utu-text-primary">Issue Refund</h3>
        <p className="mt-1 text-sm text-utu-text-muted">
          Payment ID: <span className="font-mono text-xs">{target.id.slice(0, 8)}…</span>
        </p>

        {!isStripe && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Gateway <strong>{target.method}</strong> requires manual refund via its dashboard.
            This will mark the payment as refunded in UTUBooking — complete the actual refund in {target.method}.
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-utu-text-secondary">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              <option value="requested_by_customer">Requested by customer</option>
              <option value="duplicate">Duplicate payment</option>
              <option value="fraudulent">Fraudulent</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-utu-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
              className="h-4 w-4 rounded border-utu-border-default accent-utu-blue"
            />
            Partial refund
          </label>

          {partial && (
            <label className="block">
              <span className="text-sm font-medium text-utu-text-secondary">
                Amount ({target.currency}) — max {Number(target.amount).toLocaleString()}
              </span>
              <input
                type="number"
                min={0.01}
                max={target.amount}
                step={0.01}
                value={partialAmt}
                onChange={(e) => setPartialAmt(e.target.value)}
                placeholder={String(target.amount)}
                className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </label>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <p className="mt-4 text-sm font-semibold text-utu-text-primary">
          Refund amount: {target.currency} {refundAmt.toLocaleString()}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => { setError(''); mutation.mutate(); }}
            disabled={mutation.isPending || (partial && (!partialAmt || parseFloat(partialAmt) <= 0))}
            className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {mutation.isPending ? 'Processing…' : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentsAdminPage() {
  const qc = useQueryClient();
  const [statusFilter,  setStatusFilter]  = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [page,          setPage]          = useState(1);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [refundTarget,  setRefundTarget]  = useState<RefundTarget | null>(null);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn:  getAdminPaymentStats,
    refetchInterval: 60_000,
  });

  const { data: paymentsData, isLoading: listLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, gatewayFilter, page],
    queryFn:  () => getAdminPayments({ status: statusFilter || undefined, gateway: gatewayFilter || undefined, page }),
    refetchInterval: 30_000,
  });

  const stats    = statsData?.data;
  const payments: Payment[] = paymentsData?.data ?? [];
  const total    = paymentsData?.total ?? 0;
  const limit    = paymentsData?.limit ?? 50;
  const maxPages = Math.max(1, Math.ceil(total / limit));

  const maxFailures = Math.max(1, ...(stats?.gateway_failures ?? []).map((g) => g.failures));

  function toggleAudit(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-utu-text-primary">Payment Monitoring</h1>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-utu-bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Payments today"
            value={stats?.today_total ?? 0}
          />
          <StatCard
            label="Failed today"
            value={stats?.today_failed ?? 0}
            alert={(stats?.today_failed ?? 0) > 0}
          />
          <StatCard
            label="Pending"
            value={stats?.pending ?? 0}
            alert={(stats?.pending ?? 0) > 0}
          />
          <StatCard
            label="7d success rate"
            value={stats?.success_rate_7d != null ? `${stats.success_rate_7d}%` : '—'}
            sub={`${stats?.paid ?? 0} paid of ${stats?.total ?? 0} total`}
          />
        </div>
      )}

      {/* ── Gateway failure breakdown ───────────────────────────────────────── */}
      {stats && stats.gateway_failures.length > 0 && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-utu-text-primary">
            Gateway failures — last 7 days
          </h2>
          <div className="space-y-3">
            {stats.gateway_failures.map((g) => (
              <BarRow key={g.method} label={g.method} value={g.failures} max={maxFailures} />
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All statuses</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>

        <select
          value={gatewayFilter}
          onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All gateways</option>
          {GATEWAYS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        {(statusFilter || gatewayFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setGatewayFilter(''); setPage(1); }}
            className="text-xs text-utu-blue hover:underline"
          >
            Clear filters
          </button>
        )}

        <span className="ms-auto text-xs text-utu-text-muted">
          {total.toLocaleString()} payment{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Payments table ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
        {listLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-utu-bg-muted animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-utu-text-muted">No payments found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-utu-border-default bg-utu-bg-muted text-xs font-semibold text-utu-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-start">Booking ID</th>
                <th className="px-4 py-3 text-start">Gateway</th>
                <th className="px-4 py-3 text-end">Amount</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">Date</th>
                <th className="px-4 py-3 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {payments.map((p) => (
                <>
                  <tr key={p.id} className="hover:bg-utu-bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-utu-text-secondary">
                      {p.booking_id ? p.booking_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-utu-text-primary capitalize">
                      {p.method}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold text-utu-text-primary tabular-nums">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-utu-text-secondary">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleAudit(p.id)}
                          className="text-xs text-utu-blue hover:underline font-medium"
                        >
                          {expandedId === p.id ? 'Hide' : 'Audit ▶'}
                        </button>
                        {p.status === 'paid' && (
                          <button
                            onClick={() => setRefundTarget({ id: p.id, amount: Number(p.amount), currency: p.currency, method: p.method })}
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr key={`${p.id}-audit`}>
                      <td colSpan={6} className="bg-utu-bg-muted/60 px-6 pb-4 pt-2">
                        <AuditTimeline paymentId={p.id} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {maxPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-utu-bg-muted"
          >
            Previous
          </button>
          <span className="text-sm text-utu-text-muted">
            Page {page} of {maxPages}
          </span>
          <button
            disabled={page >= maxPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-utu-bg-muted"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Refund modal ────────────────────────────────────────────────────── */}
      {refundTarget && (
        <RefundModal
          target={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin-payments'] });
            qc.invalidateQueries({ queryKey: ['admin-payment-stats'] });
          }}
        />
      )}
    </div>
  );
}
