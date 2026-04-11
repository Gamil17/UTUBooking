'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminTenants,
  createAdminTenant,
  updateAdminTenant,
  getAdminTenantAnalytics,
  type Tenant,
  type TenantAnalyticsRow,
} from '@/lib/api';

const PAGE_SIZE = 50;
const CURRENCIES = ['SAR', 'AED', 'USD', 'JOD', 'EGP', 'MAD', 'TND'];
const LOCALES    = ['en', 'ar', 'ar-SA', 'ar-JO', 'ar-EG', 'ar-MA', 'ar-TN', 'fr', 'fr-MA', 'fr-TN'];
const MODULES    = ['hotel', 'flight', 'car'];

const BLANK_FORM = {
  slug: '', name: '', domain: '', custom_domain: '', logo_url: '',
  primary_color: '#10B981', secondary_color: '#111827',
  currency: 'USD', locale: 'en',
  commission_rates: { hotel: 0.60, flight: 0.60, car: 0.60 },
  enabled_modules: ['hotel', 'flight', 'car'] as string[],
  hide_platform_branding: false,
  revenue_share_pct: 40,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

// ── Analytics panel ────────────────────────────────────────────────────────────
function TenantAnalyticsPanel({ tenantId }: { tenantId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const ago30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(ago30);
  const [to,   setTo]   = useState(today);
  const [queried, setQueried] = useState<{ from: string; to: string } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-analytics', tenantId, queried?.from, queried?.to],
    queryFn:  () => getAdminTenantAnalytics(tenantId, queried!.from, queried!.to),
    enabled:  !!queried,
    staleTime: 60_000,
  });

  const rows: TenantAnalyticsRow[] = data?.breakdown ?? [];
  const totalGmv = rows.reduce((s, r) => s + Number(r.gmv), 0);

  return (
    <div className="mt-4 rounded-xl border border-utu-border-default bg-utu-bg-muted p-4 space-y-3">
      <p className="text-sm font-semibold text-utu-text-primary">GMV Analytics</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="block text-xs text-utu-text-muted">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="ms-2 rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-primary" />
        </label>
        <label className="block text-xs text-utu-text-muted">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="ms-2 rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-primary" />
        </label>
        <button
          onClick={() => setQueried({ from, to })}
          className="rounded-lg bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Query
        </button>
      </div>
      {isLoading && <p className="text-xs text-utu-text-muted">Loading…</p>}
      {isError   && <p className="text-xs text-red-500">Failed to load analytics.</p>}
      {queried && !isLoading && rows.length > 0 && (
        <table className="min-w-full text-xs divide-y divide-[#E5E7EB]">
          <thead>
            <tr>
              {['Type', 'Bookings', 'GMV', 'Avg Order'].map((h) => (
                <th key={h} className="px-3 py-1.5 text-left font-medium text-utu-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {rows.map((r) => (
              <tr key={r.product_type}>
                <td className="px-3 py-1.5 capitalize text-utu-text-primary">{r.product_type}</td>
                <td className="px-3 py-1.5 text-utu-text-secondary">{r.bookings.toLocaleString()}</td>
                <td className="px-3 py-1.5 text-utu-text-secondary">{Number(r.gmv).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-1.5 text-utu-text-secondary">{Number(r.avg_order).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
            <tr className="font-semibold border-t-2 border-utu-border-default">
              <td className="px-3 py-1.5 text-utu-text-primary">Total</td>
              <td className="px-3 py-1.5 text-utu-text-primary">{rows.reduce((s, r) => s + r.bookings, 0).toLocaleString()}</td>
              <td className="px-3 py-1.5 text-utu-text-primary">{totalGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td />
            </tr>
          </tbody>
        </table>
      )}
      {queried && !isLoading && rows.length === 0 && (
        <p className="text-xs text-utu-text-muted">No bookings in this period.</p>
      )}
    </div>
  );
}

// ── Tenant form ────────────────────────────────────────────────────────────────
function TenantForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  isCreate,
}: {
  initial: typeof BLANK_FORM;
  onSubmit: (v: typeof BLANK_FORM) => void;
  onCancel: () => void;
  isPending: boolean;
  isCreate: boolean;
}) {
  const [form, setForm] = useState(initial);

  function field(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleModule(m: string) {
    setForm((f) => ({
      ...f,
      enabled_modules: f.enabled_modules.includes(m)
        ? f.enabled_modules.filter((x) => x !== m)
        : [...f.enabled_modules, m],
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {isCreate && (
          <label className="block">
            <span className="text-xs font-medium text-utu-text-secondary">Slug *</span>
            <input value={form.slug} onChange={(e) => field('slug', e.target.value)}
              placeholder="my-partner" required
              className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                         text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Name *</span>
          <input value={form.name} onChange={(e) => field('name', e.target.value)}
            placeholder="Partner Name" required
            className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                       text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </label>
        {isCreate && (
          <label className="block">
            <span className="text-xs font-medium text-utu-text-secondary">Domain *</span>
            <input value={form.domain} onChange={(e) => field('domain', e.target.value)}
              placeholder="partner.utubooking.com" required
              className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                         text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Custom Domain</span>
          <input value={form.custom_domain ?? ''} onChange={(e) => field('custom_domain', e.target.value)}
            placeholder="book.mytravel.com"
            className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                       text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Logo URL</span>
          <input value={form.logo_url ?? ''} onChange={(e) => field('logo_url', e.target.value)}
            placeholder="https://cdn.example.com/logo.png"
            className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                       text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Primary Color</span>
          <div className="mt-1 flex gap-2 items-center">
            <input type="color" value={form.primary_color}
              onChange={(e) => field('primary_color', e.target.value)}
              className="h-9 w-12 rounded border border-utu-border-default cursor-pointer" />
            <input value={form.primary_color} onChange={(e) => field('primary_color', e.target.value)}
              className="flex-1 rounded-lg border border-utu-border-default px-3 py-2 text-sm font-mono
                         text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Currency</span>
          <select value={form.currency} onChange={(e) => field('currency', e.target.value)}
            className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                       text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Locale</span>
          <select value={form.locale} onChange={(e) => field('locale', e.target.value)}
            className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                       text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue">
            {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-utu-text-secondary">Revenue Share %</span>
          <input type="number" min={0} max={100} value={form.revenue_share_pct}
            onChange={(e) => setForm((f) => ({ ...f, revenue_share_pct: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                       text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </label>
      </div>

      {/* Modules */}
      <div>
        <span className="text-xs font-medium text-utu-text-secondary">Enabled Modules</span>
        <div className="mt-2 flex gap-3">
          {MODULES.map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm text-utu-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.enabled_modules.includes(m)}
                onChange={() => toggleModule(m)} className="rounded" />
              {m}
            </label>
          ))}
        </div>
      </div>

      {/* Commission rates */}
      <div>
        <span className="text-xs font-medium text-utu-text-secondary">Commission Rates (0–1)</span>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {(['hotel', 'flight', 'car'] as const).map((t) => (
            <label key={t} className="block">
              <span className="text-xs text-utu-text-muted capitalize">{t}</span>
              <input type="number" min={0} max={1} step={0.01}
                value={form.commission_rates[t]}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  commission_rates: { ...f.commission_rates, [t]: Number(e.target.value) },
                }))}
                className="mt-1 w-full rounded border border-utu-border-default px-2 py-1.5 text-sm
                           text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-utu-text-secondary cursor-pointer">
        <input type="checkbox" checked={form.hide_platform_branding}
          onChange={(e) => setForm((f) => ({ ...f, hide_platform_branding: e.target.checked }))}
          className="rounded" />
        Hide UTUBooking platform branding
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel}
          className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-muted hover:bg-utu-bg-muted">
          Cancel
        </button>
        <button onClick={() => onSubmit(form)} disabled={isPending}
          className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
          {isPending ? 'Saving…' : isCreate ? 'Create Tenant' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminTenantsPage() {
  const qc = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [debSearch,    setDebSearch]    = useState('');
  const [offset,       setOffset]       = useState(0);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebSearch(val); setOffset(0); }, 350);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-tenants', debSearch, offset],
    queryFn:  () => getAdminTenants({ search: debSearch || undefined, limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (v: typeof BLANK_FORM) => createAdminTenant(v),
    onSuccess:  () => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['admin-tenants'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: string; v: typeof BLANK_FORM }) => updateAdminTenant(id, v),
    onSuccess:  () => { setEditingId(null); qc.invalidateQueries({ queryKey: ['admin-tenants'] }); },
  });

  const tenants: Tenant[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">White-label Tenants</h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Manage partner tenants — branding, modules, commission rates and revenue share.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="shrink-0 rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + New Tenant
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-utu-blue bg-utu-bg-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-utu-text-primary">New Tenant</h2>
          <TenantForm
            initial={BLANK_FORM}
            onSubmit={(v) => createMutation.mutate(v)}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
            isCreate
          />
          {createMutation.isError && (
            <p className="mt-2 text-sm text-red-500">Failed to create tenant. Check slug/domain uniqueness.</p>
          )}
        </div>
      )}

      {/* Search + list */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search slug, name, domain…"
          className="w-64 rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        {data && <span className="text-sm text-utu-text-muted">{data.total} tenants</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>}
        {isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load tenants.</div>}
        {!isLoading && !isError && (
          <div className="divide-y divide-[#E5E7EB]">
            {tenants.map((t) => (
              <div key={t.id}>
                {/* Row */}
                <div
                  className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-utu-bg-muted cursor-pointer"
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                >
                  {/* Colour swatch */}
                  <div
                    className="h-8 w-8 rounded-full border border-utu-border-default shrink-0"
                    style={{ background: t.primary_color }}
                    title={t.primary_color}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-utu-text-primary">{t.name}</p>
                    <p className="text-xs text-utu-text-muted font-mono">{t.slug} · {t.domain}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.enabled_modules.map((m) => (
                      <span key={m} className="rounded bg-utu-bg-muted px-1.5 py-0.5 text-xs text-utu-text-secondary capitalize">{m}</span>
                    ))}
                  </div>
                  <div className="text-xs text-utu-text-muted text-right">
                    <div>Rev share: {t.revenue_share_pct}%</div>
                    <div>Commission: H{pct(t.commission_rates.hotel)} F{pct(t.commission_rates.flight)} C{pct(t.commission_rates.car)}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>{t.active ? 'Active' : 'Inactive'}</span>
                  <div className="text-xs text-utu-text-muted">{formatDate(t.created_at)}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(editingId === t.id ? null : t.id); setShowCreate(false); }}
                    className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted"
                  >
                    Edit
                  </button>
                </div>

                {/* Edit form */}
                {editingId === t.id && (
                  <div className="border-t border-utu-border-default bg-utu-bg-subtle px-6 py-5">
                    <TenantForm
                      initial={{
                        slug: t.slug, name: t.name, domain: t.domain,
                        custom_domain: t.custom_domain ?? '',
                        logo_url: t.logo_url ?? '',
                        primary_color: t.primary_color, secondary_color: t.secondary_color,
                        currency: t.currency, locale: t.locale,
                        commission_rates: t.commission_rates,
                        enabled_modules: t.enabled_modules,
                        hide_platform_branding: t.hide_platform_branding,
                        revenue_share_pct: t.revenue_share_pct,
                      }}
                      onSubmit={(v) => updateMutation.mutate({ id: t.id, v })}
                      onCancel={() => setEditingId(null)}
                      isPending={updateMutation.isPending}
                      isCreate={false}
                    />
                  </div>
                )}

                {/* Analytics panel */}
                {expandedId === t.id && editingId !== t.id && (
                  <div className="border-t border-utu-border-default bg-utu-bg-subtle px-6 pb-5">
                    <TenantAnalyticsPanel tenantId={t.id} />
                  </div>
                )}
              </div>
            ))}
            {tenants.length === 0 && (
              <div className="px-5 py-16 text-center text-utu-text-muted">
                <p className="font-medium">No tenants yet.</p>
                <p className="mt-1 text-xs">Create the first white-label partner above.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
