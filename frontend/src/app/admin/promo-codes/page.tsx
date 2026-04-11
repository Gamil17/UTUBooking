'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  type PromoCode,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DISCOUNT_COLORS: Record<string, string> = {
  percent: 'bg-utu-bg-subtle text-utu-blue border-utu-border-default',
  fixed:   'bg-amber-100 text-amber-700 border-amber-200',
};

function formatExpiry(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  code:             '',
  title:            '',
  description:      '',
  discount_type:    'percent' as 'percent' | 'fixed',
  discount_value:   '' as string | number,
  currency:         'SAR',
  min_order_amount: '' as string | number,
  max_uses:         '' as string | number,
  expires_at:       '',
  is_active:        true,
  sort_order:       0,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PromoCodesAdminPage() {
  const qc = useQueryClient();

  const [search,      setSearch]      = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [formOpen,    setFormOpen]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<PromoCode | null>(null);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [confirmId,   setConfirmId]   = useState<string | null>(null);
  const [apiError,    setApiError]    = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo-codes', search, activeFilter],
    queryFn:  () => getAdminPromoCodes({ search: search || undefined, active: activeFilter || undefined }),
  });

  const codes: PromoCode[] = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-promo-codes'] });

  const createMutation = useMutation({
    mutationFn: createPromoCode,
    onSuccess:  () => { invalidate(); closeForm(); },
    onError:    (e: Error) => setApiError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updatePromoCode>[1] }) =>
      updatePromoCode(id, payload),
    onSuccess:  () => { invalidate(); closeForm(); },
    onError:    (e: Error) => setApiError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deletePromoCode,
    onSuccess:  () => { invalidate(); setConfirmId(null); },
  });

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setApiError('');
    setFormOpen(true);
  }

  function openEdit(promo: PromoCode) {
    setEditTarget(promo);
    setForm({
      code:             promo.code,
      title:            promo.title,
      description:      promo.description ?? '',
      discount_type:    promo.discount_type,
      discount_value:   promo.discount_value,
      currency:         promo.currency,
      min_order_amount: promo.min_order_amount,
      max_uses:         promo.max_uses ?? '',
      expires_at:       toDatetimeLocal(promo.expires_at),
      is_active:        promo.is_active,
      sort_order:       promo.sort_order,
    });
    setApiError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditTarget(null);
    setApiError('');
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');

    const payload = {
      code:             form.code.toUpperCase().trim(),
      title:            form.title.trim(),
      description:      form.description.trim() || null,
      discount_type:    form.discount_type,
      discount_value:   Number(form.discount_value),
      currency:         form.currency,
      min_order_amount: Number(form.min_order_amount) || 0,
      max_uses:         form.max_uses !== '' ? Number(form.max_uses) : null,
      expires_at:       form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active:        form.is_active,
      sort_order:       Number(form.sort_order) || 0,
    };

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-utu-text-primary">Promo Codes</h1>
        <button
          onClick={openCreate}
          className="rounded-xl bg-utu-blue px-4 py-2 text-sm font-semibold text-white hover:bg-utu-navy transition-colors"
        >
          + New Code
        </button>
      </div>

      {/* Create / Edit form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-utu-text-primary">
            {editTarget ? `Edit — ${editTarget.code}` : 'Create Promo Code'}
          </h2>

          {apiError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {apiError}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Code */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Code *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder="HAJJ10"
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm font-mono uppercase text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Hajj Season Discount"
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>

            {/* Discount type */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Discount type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setField('discount_type', e.target.value as 'percent' | 'fixed')}
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>

            {/* Discount value + currency */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-utu-text-muted mb-1">
                  Value * {form.discount_type === 'percent' ? '(%)' : ''}
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setField('discount_value', e.target.value)}
                  placeholder={form.discount_type === 'percent' ? '10' : '50'}
                  className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
                />
              </div>
              {form.discount_type === 'fixed' && (
                <div className="w-24">
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  >
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              )}
            </div>

            {/* Min order */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Min order amount (SAR)</label>
              <input
                type="number"
                min={0}
                value={form.min_order_amount}
                onChange={(e) => setField('min_order_amount', e.target.value)}
                placeholder="0 = no minimum"
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>

            {/* Max uses */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Max uses (blank = unlimited)</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setField('max_uses', e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>

            {/* Expires at */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Expires at (leave blank = never)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setField('expires_at', e.target.value)}
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>

            {/* Sort order */}
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">Sort order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setField('sort_order', Number(e.target.value))}
                className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="10% off all Makkah hotels during Hajj season"
              className="w-full rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-utu-border-default accent-utu-blue"
            />
            <span className="text-sm text-utu-text-primary">Active (visible to users)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-utu-blue px-5 py-2 text-sm font-semibold text-white hover:bg-utu-navy disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving…' : editTarget ? 'Save changes' : 'Create code'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-utu-border-default px-5 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by code or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue w-56"
        />
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <span className="ms-auto text-xs text-utu-text-muted">{codes.length} code{codes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded bg-utu-bg-muted animate-pulse" />)}
          </div>
        ) : codes.length === 0 ? (
          <p className="p-8 text-center text-sm text-utu-text-muted">No promo codes found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-utu-border-default bg-utu-bg-muted text-xs font-semibold text-utu-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-start">Code</th>
                <th className="px-4 py-3 text-start">Title</th>
                <th className="px-4 py-3 text-start">Discount</th>
                <th className="px-4 py-3 text-start">Min order</th>
                <th className="px-4 py-3 text-start">Uses</th>
                <th className="px-4 py-3 text-start">Expires</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {codes.map((promo) => (
                <tr key={promo.id} className="hover:bg-utu-bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-utu-text-primary tracking-wider">
                    {promo.code}
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary max-w-[160px] truncate">
                    {promo.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DISCOUNT_COLORS[promo.discount_type]}`}>
                      {promo.discount_type === 'percent'
                        ? `${promo.discount_value}%`
                        : `${promo.currency} ${promo.discount_value}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary tabular-nums">
                    {Number(promo.min_order_amount) > 0 ? `SAR ${promo.min_order_amount}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary tabular-nums">
                    {promo.uses_count}{promo.max_uses != null ? ` / ${promo.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary text-xs">
                    {formatExpiry(promo.expires_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateMutation.mutate({ id: promo.id, payload: { is_active: !promo.is_active } })}
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-75 ${
                        promo.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(promo)}
                        className="text-xs text-utu-blue hover:underline font-medium"
                      >
                        Edit
                      </button>
                      {confirmId === promo.id ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <button
                            onClick={() => deleteMutation.mutate(promo.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:underline font-medium"
                          >
                            Confirm
                          </button>
                          <button onClick={() => setConfirmId(null)} className="text-utu-text-muted hover:underline">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(promo.id)}
                          className="text-xs text-utu-text-muted hover:text-red-500 font-medium"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm deactivate modal hint */}
      {confirmId && (
        <p className="text-xs text-utu-text-muted text-center">
          Click Confirm above to deactivate the code. This can be reversed by toggling the status badge.
        </p>
      )}
    </div>
  );
}
