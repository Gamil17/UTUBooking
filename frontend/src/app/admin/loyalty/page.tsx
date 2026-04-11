'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminLoyaltyStats,
  getAdminLoyaltyMembers,
  getAdminLoyaltyLedger,
  getAdminLoyaltyRewards,
  createLoyaltyReward,
  updateLoyaltyReward,
  deleteLoyaltyReward,
  type LoyaltyStats,
  type LoyaltyMember,
  type LoyaltyLedgerEntry,
  type LoyaltyReward,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  bronze:   'bg-orange-100 text-orange-700',
  silver:   'bg-gray-100 text-gray-600',
  gold:     'bg-amber-100 text-amber-700',
  platinum: 'bg-purple-100 text-purple-700',
};

const REWARD_TYPES = [
  'hotel_discount',
  'flight_discount',
  'upgrade',
  'voucher',
  'free_night',
  'lounge_access',
];

const BLANK_FORM = {
  name_en:      '',
  name_ar:      '',
  points_cost:  0,
  type:         'hotel_discount',
  discount_sar: 0,
  valid_until:  '',
  is_active:    true,
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 shadow-sm">
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

// ─── Member ledger panel ──────────────────────────────────────────────────────

function MemberLedger({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['loyalty-ledger', userId],
    queryFn:  () => getAdminLoyaltyLedger(userId),
    staleTime: 60_000,
  });

  const entries: LoyaltyLedgerEntry[] = data?.data ?? [];

  return (
    <div className="border-t border-utu-border-default bg-utu-bg-muted px-4 py-3">
      <p className="mb-2 text-xs font-semibold text-utu-text-secondary">Points History (last 50)</p>
      {isLoading && <p className="text-xs text-utu-text-muted">Loading…</p>}
      {isError   && <p className="text-xs text-red-500">Failed to load ledger.</p>}
      {!isLoading && !isError && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-utu-text-muted">
              <th className="pb-1 text-start font-medium">Date</th>
              <th className="pb-1 text-start font-medium">Action</th>
              <th className="pb-1 text-start font-medium">Note</th>
              <th className="pb-1 text-end font-medium">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-1 text-utu-text-muted whitespace-nowrap">
                  {new Date(e.created_at).toLocaleDateString('en-GB')}
                </td>
                <td className="py-1 text-utu-text-secondary capitalize">{e.action.replace(/_/g, ' ')}</td>
                <td className="py-1 text-utu-text-muted">{e.note ?? '—'}</td>
                <td className={`py-1 text-end font-medium ${e.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {e.points >= 0 ? '+' : ''}{e.points.toLocaleString()}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-center text-utu-text-muted">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [search, setSearch]     = useState('');
  const [tierFilter, setTier]   = useState('');
  const [searchInput, setInput] = useState('');
  const [page, setPage]         = useState(1);
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-loyalty-stats'],
    queryFn:  getAdminLoyaltyStats,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['admin-loyalty-members', search, tierFilter, page],
    queryFn:  () => getAdminLoyaltyMembers({ search: search || undefined, tier: tierFilter || undefined, page }),
    enabled:  true,
  });

  const stats: LoyaltyStats | undefined = statsData?.data;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-utu-bg-muted animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Members"  value={stats.total_members} />
            <StatCard label="Silver"         value={stats.silver} />
            <StatCard label="Gold"           value={stats.gold} />
            <StatCard label="Platinum"       value={stats.platinum} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Points Outstanding" value={stats.total_points_outstanding.toLocaleString()} sub="redeemable points" />
            <StatCard label="Lifetime Points"    value={stats.total_lifetime_points.toLocaleString()}    sub="all-time earned" />
          </div>
        </>
      ) : null}

      {/* Member search */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-utu-text-primary mb-3">Member Lookup</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={searchInput}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by user ID…"
            className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue w-56"
          />
          <select
            value={tierFilter}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none"
          >
            <option value="">All tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

        {membersLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-utu-bg-muted animate-pulse" />)}
          </div>
        ) : membersData?.data && membersData.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-utu-border-default text-xs text-utu-text-muted">
                    <th className="pb-2 text-start font-medium">User ID</th>
                    <th className="pb-2 text-start font-medium">Tier</th>
                    <th className="pb-2 text-end font-medium">Points</th>
                    <th className="pb-2 text-end font-medium">Lifetime</th>
                    <th className="pb-2 text-end font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-utu-border-default">
                  {membersData.data.map((m: LoyaltyMember) => (
                    <>
                      <tr
                        key={m.id}
                        onClick={() => setLedgerUserId(ledgerUserId === m.user_id ? null : m.user_id)}
                        className="cursor-pointer hover:bg-utu-bg-muted/30 transition-colors"
                        title="Click to view points history"
                      >
                        <td className="py-2.5 font-mono text-xs text-utu-text-secondary">
                          <span className="me-1 text-utu-text-muted">{ledgerUserId === m.user_id ? '▾' : '▸'}</span>
                          {m.user_id}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TIER_COLORS[m.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                            {m.tier}
                          </span>
                        </td>
                        <td className="py-2.5 text-end font-medium text-utu-text-primary">{m.points.toLocaleString()}</td>
                        <td className="py-2.5 text-end text-utu-text-secondary">{m.lifetime_points.toLocaleString()}</td>
                        <td className="py-2.5 text-end text-utu-text-muted text-xs">
                          {new Date(m.created_at).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                      {ledgerUserId === m.user_id && (
                        <tr key={`${m.id}-ledger`}>
                          <td colSpan={5} className="p-0">
                            <MemberLedger userId={m.user_id} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {membersData.total > 50 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-utu-text-muted">{membersData.total} total</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs hover:bg-utu-bg-muted disabled:opacity-40 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1.5 text-xs text-utu-text-muted">Page {page}</span>
                  <button
                    disabled={page * 50 >= membersData.total}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs hover:bg-utu-bg-muted disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-utu-text-muted py-4 text-center">No members found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Rewards tab ──────────────────────────────────────────────────────────────

function RewardsTab() {
  const qc = useQueryClient();

  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...BLANK_FORM });
  const [formError, setFormError] = useState('');
  const [page,      setPage]      = useState(1);
  const [active,    setActive]    = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-loyalty-rewards', active, page],
    queryFn:  () => getAdminLoyaltyRewards({ active: active || undefined, page }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) => {
      const body = {
        ...payload,
        points_cost:  Number(payload.points_cost),
        discount_sar: Number(payload.discount_sar),
        valid_until:  payload.valid_until || null,
        name_ar:      payload.name_ar || null,
      };
      if (editId) return updateLoyaltyReward(editId, body);
      return createLoyaltyReward(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-loyalty-rewards'] });
      setShowForm(false);
      setEditId(null);
      setForm({ ...BLANK_FORM });
      setFormError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Save failed. Please check the fields.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deleteLoyaltyReward(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-loyalty-rewards'] }),
  });

  function openCreate() {
    setEditId(null);
    setForm({ ...BLANK_FORM });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(r: LoyaltyReward) {
    setEditId(r.id);
    setForm({
      name_en:      r.name_en,
      name_ar:      r.name_ar ?? '',
      points_cost:  r.points_cost,
      type:         r.type,
      discount_sar: r.discount_sar,
      valid_until:  r.valid_until ? r.valid_until.slice(0, 16) : '',
      is_active:    r.is_active,
    });
    setFormError('');
    setShowForm(true);
  }

  function handleToggleActive(r: LoyaltyReward) {
    if (r.is_active) {
      if (!confirm(`Deactivate "${r.name_en}"?`)) return;
      deactivateMutation.mutate(r.id);
    } else {
      updateLoyaltyReward(r.id, { is_active: true }).then(() =>
        qc.invalidateQueries({ queryKey: ['admin-loyalty-rewards'] }),
      );
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={active}
          onChange={(e) => { setActive(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none"
        >
          <option value="">All rewards</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <button
          onClick={openCreate}
          className="rounded-xl bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + New Reward
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-utu-text-primary">
            {editId ? 'Edit Reward' : 'New Reward'}
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-utu-text-muted">Name (EN) *</span>
              <input
                value={form.name_en}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                placeholder="e.g. Hotel Discount Voucher"
              />
            </label>
            <label className="block">
              <span className="text-xs text-utu-text-muted">Name (AR)</span>
              <input
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-utu-blue"
                dir="rtl"
                placeholder="اسم المكافأة"
              />
            </label>
            <label className="block">
              <span className="text-xs text-utu-text-muted">Type *</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none"
              >
                {REWARD_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-utu-text-muted">Points Cost *</span>
              <input
                type="number"
                min={0}
                value={form.points_cost}
                onChange={(e) => setForm((f) => ({ ...f, points_cost: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </label>
            <label className="block">
              <span className="text-xs text-utu-text-muted">Discount (SAR)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.discount_sar}
                onChange={(e) => setForm((f) => ({ ...f, discount_sar: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </label>
            <label className="block">
              <span className="text-xs text-utu-text-muted">Valid Until</span>
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-utu-text-primary">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded"
            />
            Active
          </label>

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="rounded-xl bg-utu-blue px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Reward'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm({ ...BLANK_FORM }); }}
              className="rounded-xl border border-utu-border-default px-5 py-2 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rewards table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-utu-bg-muted animate-pulse" />)}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-utu-border-default">
                <tr className="text-xs text-utu-text-muted">
                  <th className="px-4 py-3 text-start font-medium">Name</th>
                  <th className="px-4 py-3 text-start font-medium">Type</th>
                  <th className="px-4 py-3 text-end font-medium">Points</th>
                  <th className="px-4 py-3 text-end font-medium">SAR</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-end font-medium">Valid Until</th>
                  <th className="px-4 py-3 text-end font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-utu-border-default">
                {data.data.map((r: LoyaltyReward) => (
                  <tr key={r.id} className="hover:bg-utu-bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-utu-text-primary">{r.name_en}</p>
                      {r.name_ar && <p className="text-xs text-utu-text-muted font-arabic" dir="rtl">{r.name_ar}</p>}
                    </td>
                    <td className="px-4 py-3 text-utu-text-secondary capitalize">{r.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-end font-medium text-utu-text-primary">{r.points_cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end text-utu-text-secondary">
                      {r.discount_sar > 0 ? `SAR ${r.discount_sar}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(r)}
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                          r.is_active
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {r.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-end text-xs text-utu-text-muted">
                      {r.valid_until
                        ? new Date(r.valid_until).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-xs text-utu-blue hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > 50 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-utu-text-muted">{data.total} total</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs hover:bg-utu-bg-muted disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-2 py-1.5 text-xs text-utu-text-muted">Page {page}</span>
                <button
                  disabled={page * 50 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs hover:bg-utu-bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-10 text-center text-sm text-utu-text-muted shadow-sm">
          No rewards yet. Click &ldquo;+ New Reward&rdquo; to create one.
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoyaltyAdminPage() {
  const [tab, setTab] = useState<'overview' | 'rewards'>('overview');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Loyalty Program</h1>
        <p className="text-sm text-utu-text-muted mt-0.5">Member tiers, points accounts, and rewards catalog</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-utu-border-default bg-utu-bg-muted p-1 w-fit">
        {(['overview', 'rewards'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-utu-bg-card text-utu-text-primary shadow-sm'
                : 'text-utu-text-muted hover:text-utu-text-primary'
            }`}
          >
            {t === 'overview' ? 'Overview & Members' : 'Rewards Catalog'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewTab /> : <RewardsTab />}
    </div>
  );
}
