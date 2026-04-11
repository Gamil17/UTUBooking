'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminWalletStats,
  getAdminWalletBalances,
  getAdminWalletTransactions,
  creditUserWallet,
  type WalletStats,
  type WalletRow,
  type WalletTransaction,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCIES = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'MYR', 'IDR', 'TRY', 'BDT', 'PKR'];

const TX_TYPE_COLORS: Record<string, string> = {
  topup:       'bg-green-100 text-green-700',
  debit:       'bg-red-100 text-red-600',
  convert_out: 'bg-amber-100 text-amber-700',
  convert_in:  'bg-blue-100 text-blue-700',
  refund:      'bg-purple-100 text-purple-700',
};

function fmtCurrency(amount: number, currency: string) {
  return amount.toLocaleString(undefined, {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 shadow-sm">
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

// ─── Credit modal ─────────────────────────────────────────────────────────────

function CreditModal({
  onClose,
  onSuccess,
}: {
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ userId: '', currency: 'SAR', amount: '', note: '' });
  const [err,  setErr]  = useState('');

  const mutation = useMutation({
    mutationFn: () => creditUserWallet({
      userId:   form.userId.trim(),
      currency: form.currency,
      amount:   parseFloat(form.amount),
      note:     form.note.trim() || undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError:   (e: unknown) => setErr(e instanceof Error ? e.message : 'Credit failed'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!form.userId.trim()) { setErr('User ID is required'); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setErr('Amount must be greater than 0'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-utu-bg-card shadow-xl border border-utu-border-default">
        <div className="px-6 py-4 border-b border-utu-border-default flex items-center justify-between">
          <h2 className="text-base font-semibold text-utu-text-primary">Credit User Wallet</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{err}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">User ID (UUID)</label>
            <input
              type="text"
              value={form.userId}
              onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
              placeholder="e.g. 550e8400-e29b-41d4-a716-..."
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue font-mono"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">
              Reason / Note <span className="text-utu-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Compensation for failed booking #REF123"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-navy/90 disabled:opacity-50">
              {mutation.isPending ? 'Crediting…' : 'Credit Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'balances' | 'transactions';

export default function AdminWalletPage() {
  const qc  = useQueryClient();
  const [tab,           setTab]           = useState<ActiveTab>('overview');
  const [showCredit,    setShowCredit]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [currFilter,    setCurrFilter]    = useState('');
  const [txTypeFilter,  setTxTypeFilter]  = useState('');
  const [page,          setPage]          = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [msg,           setMsg]           = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  }

  const statsQuery = useQuery({
    queryKey: ['admin-wallet-stats'],
    queryFn:  getAdminWalletStats,
    staleTime: 60_000,
  });

  const balancesQuery = useQuery({
    queryKey: ['admin-wallet-balances', debouncedSearch, currFilter, page],
    queryFn:  () => getAdminWalletBalances({
      search:   debouncedSearch || undefined,
      currency: currFilter      || undefined,
      page,
      limit:    50,
    }),
    enabled:  tab === 'balances',
    staleTime: 30_000,
  });

  const txQuery = useQuery({
    queryKey: ['admin-wallet-transactions', txTypeFilter, page],
    queryFn:  () => getAdminWalletTransactions({
      type:  txTypeFilter || undefined,
      page,
      limit: 50,
    }),
    enabled:  tab === 'transactions',
    staleTime: 30_000,
  });

  const stats: WalletStats | null = (statsQuery.data as { data: WalletStats } | undefined)?.data ?? null;
  const balances: WalletRow[]     = (balancesQuery.data?.data ?? []) as WalletRow[];
  const txList: WalletTransaction[] = (txQuery.data?.data ?? []) as WalletTransaction[];

  const txTypes = ['topup', 'debit', 'convert_out', 'convert_in', 'refund'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">Wallet Management</h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Monitor user wallet balances, FX conversions, and manually credit accounts.
          </p>
        </div>
        <button
          onClick={() => setShowCredit(true)}
          className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-navy/90 transition-colors"
        >
          + Credit Wallet
        </button>
      </div>

      {msg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-utu-border-default">
        {(['overview', 'balances', 'transactions'] as ActiveTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {statsQuery.isLoading && <p className="text-sm text-utu-text-muted">Loading stats…</p>}
          {statsQuery.isError  && <p className="text-sm text-red-500">Failed to load wallet stats.</p>}

          {stats && (
            <>
              {/* Transaction stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Total Transactions" value={stats.transactions.total} />
                <StatCard label="Top-ups"            value={stats.transactions.topups} />
                <StatCard label="Debits"             value={stats.transactions.debits} />
                <StatCard label="FX Conversions"     value={stats.transactions.conversions} />
                <StatCard label="Refunds"            value={stats.transactions.refunds} />
                <StatCard
                  label="Total Topped Up"
                  value={stats.transactions.total_topped_up.toLocaleString(undefined, {
                    minimumFractionDigits: 0, maximumFractionDigits: 0,
                  })}
                  sub="all currencies combined"
                />
              </div>

              {/* Outstanding by currency */}
              <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-utu-border-default">
                  <h2 className="text-sm font-semibold text-utu-text-primary">Outstanding Balances by Currency</h2>
                </div>
                {stats.byCurrency.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-center text-utu-text-muted">No wallet balances on record.</p>
                ) : (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                    <thead className="bg-utu-bg-muted">
                      <tr>
                        {['Currency', 'Wallets', 'Total Outstanding', 'Avg Balance'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {stats.byCurrency.map((row) => (
                        <tr key={row.currency} className="hover:bg-utu-bg-muted/50">
                          <td className="px-4 py-3 font-bold text-utu-text-primary">{row.currency}</td>
                          <td className="px-4 py-3 text-utu-text-secondary">{row.wallet_count.toLocaleString()}</td>
                          <td className="px-4 py-3 font-medium text-utu-text-primary">
                            {fmtCurrency(row.total_outstanding, row.currency)}
                          </td>
                          <td className="px-4 py-3 text-utu-text-muted">
                            {fmtCurrency(row.avg_balance, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Balances tab ─────────────────────────────────────────────────────── */}
      {tab === 'balances' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by user ID…"
              className="w-72 rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
            <select
              value={currFilter}
              onChange={(e) => { setCurrFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              <option value="">All currencies</option>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            {balancesQuery.isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>}
            {balancesQuery.isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load balances.</div>}
            {!balancesQuery.isLoading && !balancesQuery.isError && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                  <thead className="bg-utu-bg-muted">
                    <tr>
                      {['User ID', 'Currency', 'Balance', 'Transactions', 'Last Updated'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {balances.map((w) => (
                      <tr key={w.id} className="hover:bg-utu-bg-muted/50">
                        <td className="px-4 py-3 font-mono text-xs text-utu-text-secondary">{w.user_id}</td>
                        <td className="px-4 py-3 font-medium text-utu-text-primary">{w.currency}</td>
                        <td className="px-4 py-3 font-medium text-utu-text-primary">
                          {fmtCurrency(parseFloat(String(w.balance)), w.currency)}
                        </td>
                        <td className="px-4 py-3 text-utu-text-muted">{w.tx_count}</td>
                        <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                          {fmtDate(w.updated_at)}
                        </td>
                      </tr>
                    ))}
                    {balances.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-utu-text-muted">
                          No wallets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {balancesQuery.data && (
            <div className="flex items-center justify-between text-sm text-utu-text-muted">
              <span>{balancesQuery.data.total.toLocaleString()} total wallets</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">
                  Previous
                </button>
                <span className="flex items-center px-2">Page {page}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={balances.length < 50}
                  className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Transactions tab ─────────────────────────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-3">
            <select
              value={txTypeFilter}
              onChange={(e) => { setTxTypeFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              <option value="">All types</option>
              {txTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            {txQuery.isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>}
            {txQuery.isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load transactions.</div>}
            {!txQuery.isLoading && !txQuery.isError && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                  <thead className="bg-utu-bg-muted">
                    <tr>
                      {['Date', 'User ID', 'Currency', 'Amount', 'Type', 'Note'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {txList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-utu-bg-muted/50">
                        <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                          {fmtDate(tx.created_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-utu-text-secondary">{tx.user_id}</td>
                        <td className="px-4 py-3 font-medium text-utu-text-primary">{tx.currency}</td>
                        <td className={`px-4 py-3 font-medium ${parseFloat(String(tx.amount)) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {parseFloat(String(tx.amount)) >= 0 ? '+' : ''}
                          {fmtCurrency(parseFloat(String(tx.amount)), tx.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TX_TYPE_COLORS[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-utu-text-muted max-w-xs truncate">
                          {tx.note ?? '—'}
                        </td>
                      </tr>
                    ))}
                    {txList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-utu-text-muted">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {txQuery.data && (
            <div className="flex items-center justify-between text-sm text-utu-text-muted">
              <span>{txQuery.data.total.toLocaleString()} total transactions</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">
                  Previous
                </button>
                <span className="flex items-center px-2">Page {page}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={txList.length < 50}
                  className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credit modal */}
      {showCredit && (
        <CreditModal
          onClose={() => setShowCredit(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin-wallet-stats'] });
            qc.invalidateQueries({ queryKey: ['admin-wallet-balances'] });
            setMsg('Wallet credited successfully.');
            setTimeout(() => setMsg(''), 4000);
          }}
        />
      )}
    </div>
  );
}
